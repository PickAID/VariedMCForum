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
BACKUP_ROOT="${BACKUP_ROOT:-}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
MANAGED_PLUGINS_FILE=""

cleanup_managed_plugins_file() {
  if [[ -n "$MANAGED_PLUGINS_FILE" ]]; then
    rm -f "$MANAGED_PLUGINS_FILE"
  fi
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "required command not found: $command_name" >&2
    return 1
  fi
}

resolve_home_dir() {
  local home_dir="${HOME:-}"

  if [[ -n "$home_dir" ]]; then
    printf '%s\n' "$home_dir"
    return 0
  fi

  home_dir="$(node -p 'require("os").homedir()' 2>/dev/null || true)"
  if [[ -n "$home_dir" ]]; then
    printf '%s\n' "$home_dir"
    return 0
  fi

  echo "unable to determine deployment user home directory" >&2
  return 1
}

resolve_backup_root() {
  local home_dir

  if [[ -n "$BACKUP_ROOT" ]]; then
    printf '%s\n' "$BACKUP_ROOT"
    return 0
  fi

  home_dir="$(resolve_home_dir)" || return 1
  printf '%s\n' "$home_dir/backups/$(basename "$NODEBB_PATH")/deploy"
}

read_nodebb_database() {
  node -e '
    const fs = require("fs");
    const path = require("path");
    const config = JSON.parse(fs.readFileSync(path.join(process.argv[1], "config.json"), "utf8"));

    if (typeof config.database !== "string" || !config.database) {
      process.stderr.write("config.json missing database type\n");
      process.exit(1);
    }

    process.stdout.write(config.database);
  ' "$NODEBB_PATH"
}

read_mongo_uri() {
  node -e '
    const fs = require("fs");
    const path = require("path");
    const config = JSON.parse(fs.readFileSync(path.join(process.argv[1], "config.json"), "utf8"));

    if (config.database !== "mongo") {
      process.stderr.write(`unsupported database for mongo backup: ${config.database || "unknown"}\n`);
      process.exit(1);
    }

    if (config.mongo && typeof config.mongo.uri === "string" && config.mongo.uri) {
      process.stdout.write(config.mongo.uri);
      process.exit(0);
    }

    const mongo = config.mongo || {};
    const host = mongo.host || "127.0.0.1";
    const port = mongo.port || 27017;
    const database = mongo.database;

    if (!database) {
      process.stderr.write("config.json missing mongo.database\n");
      process.exit(1);
    }

    let auth = "";
    if (mongo.username) {
      auth = encodeURIComponent(mongo.username);
      if (mongo.password) {
        auth += `:${encodeURIComponent(mongo.password)}`;
      }
      auth += "@";
    }

    const params = new URLSearchParams();
    if (mongo.authSource) {
      params.set("authSource", mongo.authSource);
    }

    const query = params.toString();
    const uri = `mongodb://${auth}${host}:${port}/${database}${query ? `?${query}` : ""}`;
    process.stdout.write(uri);
  ' "$NODEBB_PATH"
}

backup_production_data() {
  local timestamp
  local backup_root
  local backup_dir
  local database_type
  local mongo_uri

  backup_root="$(resolve_backup_root)" || return 1
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  backup_dir="${backup_root}/${timestamp}"

  mkdir -p "$backup_dir"

  deploy_log "Backing up production data to ${backup_dir}"
  cp config.json "${backup_dir}/config.json"

  if [[ -d public/uploads ]]; then
    tar -C "$NODEBB_PATH" -czf "${backup_dir}/uploads.tar.gz" public/uploads
  else
    deploy_log "Skipping uploads backup: public/uploads not found"
  fi

  database_type="$(read_nodebb_database)"
  case "$database_type" in
    mongo)
      require_command mongodump
      mongo_uri="$(read_mongo_uri)"
      mongodump --uri "$mongo_uri" --archive="${backup_dir}/mongo.archive.gz" --gzip
      ;;
    *)
      echo "unsupported database type for backup: ${database_type}" >&2
      return 1
      ;;
  esac

  if [[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
    find "$backup_root" -mindepth 1 -maxdepth 1 -type d -mtime +"$BACKUP_RETENTION_DAYS" -exec rm -rf {} +
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

  backup_production_data

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

  deploy_log "Stopping ${NODEBB_SERVICE}"
  sudo "$SYSTEMCTL_BIN" stop "$NODEBB_SERVICE"

  deploy_log "Running NodeBB upgrade"
  ./nodebb upgrade -mis

  deploy_log "Building NodeBB"
  ./nodebb build

  deploy_log "Restarting ${NODEBB_SERVICE}"
  sudo "$SYSTEMCTL_BIN" restart "$NODEBB_SERVICE"
  sudo "$SYSTEMCTL_BIN" is-active "$NODEBB_SERVICE"

  deploy_log "Deployment completed"
}

main "$@"
