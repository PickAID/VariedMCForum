#!/usr/bin/env bash
set -euo pipefail

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  echo "deploy-prod.sh must be executed, not sourced" >&2
  return 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./deploy-lib.sh
source "$SCRIPT_DIR/deploy-lib.sh"

NODEBB_PATH="${NODEBB_PATH:-/home/nodebb/nodebb}"
NODEBB_SERVICE="${NODEBB_SERVICE:-nodebb.service}"
SYSTEMCTL_BIN="${SYSTEMCTL_BIN:-systemctl}"
MANAGED_PLUGINS_FILE=""

cleanup_managed_plugins_file() {
  if [[ -n "$MANAGED_PLUGINS_FILE" ]]; then
    rm -f "$MANAGED_PLUGINS_FILE"
  fi
}

preflight_validate_symlink_target() {
  local root="$1"
  local package_name="$2"
  local link_path="$root/node_modules/$package_name"

  if [[ -e "$link_path" && ! -L "$link_path" ]]; then
    echo "refusing to replace non-symlink path: $link_path" >&2
    return 1
  fi
}

preflight_validate_package_name() {
  local package_name="$1"

  if ! is_valid_package_name "$package_name"; then
    echo "invalid package name: $package_name" >&2
    return 1
  fi
}

preflight_validate_node_modules_path() {
  local root="$1"
  local node_modules_dir="$root/node_modules"

  validate_path_within_root "$root" "$node_modules_dir" "node_modules path" >/dev/null
}

preflight_validate_link_paths() {
  local root="$1"
  local package_name="$2"
  local node_modules_dir="$root/node_modules"
  local link_path="$node_modules_dir/$package_name"
  local link_parent

  link_parent="$(dirname "$link_path")"

  validate_path_within_root "$root" "$link_parent" "link parent path" >/dev/null
  validate_path_within_root "$root" "$link_path" "link path" >/dev/null

  if [[ -e "$link_parent" && ! -d "$link_parent" ]]; then
    echo "link parent path is not a directory: $link_parent" >&2
    return 1
  fi
}

main() {
  local plugin_dir
  local package_name
  local resolved_root

  cd "$NODEBB_PATH"
  resolved_root="$(resolve_directory "$NODEBB_PATH")"

  MANAGED_PLUGINS_FILE="$(mktemp "${TMPDIR:-/tmp}/deploy-prod-plugins.XXXXXX")"
  trap cleanup_managed_plugins_file EXIT

  if ! list_managed_plugins "$NODEBB_PATH" >"$MANAGED_PLUGINS_FILE"; then
    return 1
  fi

  preflight_validate_node_modules_path "$resolved_root"

  deploy_log "Preflight: validating managed plugin package names"
  while IFS= read -r -d '' plugin_dir; do
    [[ -n "$plugin_dir" ]] || continue
    package_name="$(read_package_name "$plugin_dir")"
    preflight_validate_package_name "$package_name"
    preflight_validate_link_paths "$resolved_root" "$package_name"
    preflight_validate_symlink_target "$resolved_root" "$package_name"
  done < "$MANAGED_PLUGINS_FILE"

  deploy_log "Installing root dependencies"
  npm install

  while IFS= read -r -d '' plugin_dir; do
    [[ -n "$plugin_dir" ]] || continue
    package_name="$(read_package_name "$plugin_dir")"
    deploy_log "Installing ${package_name}"
    (
      cd "$plugin_dir"
      npm install
    )
    ensure_plugin_symlink "$NODEBB_PATH" "$plugin_dir" "$package_name"
  done < "$MANAGED_PLUGINS_FILE"

  deploy_log "Building NodeBB"
  ./nodebb build

  deploy_log "Restarting ${NODEBB_SERVICE}"
  sudo "$SYSTEMCTL_BIN" restart "$NODEBB_SERVICE"
  sudo "$SYSTEMCTL_BIN" is-active "$NODEBB_SERVICE"

  deploy_log "Deployment completed"
}

main "$@"
