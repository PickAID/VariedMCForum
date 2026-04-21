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
NPM_INSTALL_MAX_ATTEMPTS="${NPM_INSTALL_MAX_ATTEMPTS:-3}"
NPM_INSTALL_RETRY_DELAY_SECONDS="${NPM_INSTALL_RETRY_DELAY_SECONDS:-5}"
NPM_INSTALL_REGISTRY="${NPM_INSTALL_REGISTRY:-https://registry.npmmirror.com/}"
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

run_npm_install() {
  local attempt=1
  local status=0
  local -a npm_cmd=(
    env
    -u HTTP_PROXY
    -u HTTPS_PROXY
    -u http_proxy
    -u https_proxy
    -u NO_PROXY
    -u no_proxy
    npm
    install
    "--registry=${NPM_INSTALL_REGISTRY}"
  )

  while (( attempt <= NPM_INSTALL_MAX_ATTEMPTS )); do
    if "${npm_cmd[@]}"; then
      return 0
    else
      status=$?
    fi

    if (( attempt == NPM_INSTALL_MAX_ATTEMPTS )); then
      return "$status"
    fi

    deploy_log "npm install failed with exit ${status}; retrying (${attempt}/${NPM_INSTALL_MAX_ATTEMPTS}) in ${NPM_INSTALL_RETRY_DELAY_SECONDS}s"
    sleep "$NPM_INSTALL_RETRY_DELAY_SECONDS"
    attempt=$((attempt + 1))
  done

  return "$status"
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
  run_npm_install

  while IFS= read -r -d '' plugin_dir; do
    [[ -n "$plugin_dir" ]] || continue
    package_name="$(read_package_name "$plugin_dir")"
    deploy_log "Installing ${package_name}"
    (
      cd "$plugin_dir"
      run_npm_install
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
