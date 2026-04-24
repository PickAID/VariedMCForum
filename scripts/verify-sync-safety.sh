#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TMP_VERIFY_DIR=""
MANAGED_PLUGIN_DIRS=()
REQUIRED_CORE_DEPLOY_PATHS=(
  app.js
  loader.js
  nodebb
  nodebb.bat
  package.json
  package-lock.json
  install/package.json
  webpack.common.js
  webpack.prod.js
)

cleanup_tmpdir() {
  if [[ -n "${TMP_VERIFY_DIR:-}" && -d "${TMP_VERIFY_DIR}" ]]; then
    rm -rf "${TMP_VERIFY_DIR}"
  fi
}

load_managed_plugin_dirs() {
  local dir

  MANAGED_PLUGIN_DIRS=()
  while IFS= read -r dir; do
    [[ -n "$dir" ]] || continue
    MANAGED_PLUGIN_DIRS+=("$dir")
  done < <(
    find "${ROOT_DIR}" -mindepth 1 -maxdepth 1 -type d -print \
      | while IFS= read -r dir; do
          [[ -f "${dir}/plugin.json" && -f "${dir}/package.json" ]] || continue
          printf '%s\n' "${dir#"${ROOT_DIR}/"}"
        done \
      | sort -u
  )
}

is_forbidden_managed_plugin_tracked_path() {
  local path="$1"
  local dir

  for dir in "${MANAGED_PLUGIN_DIRS[@]}"; do
    [[ -n "$dir" ]] || continue
    case "$path" in
      "$dir"/node_modules|"$dir"/node_modules/*)
        return 0
        ;;
    esac
  done

  return 1
}

is_forbidden_managed_plugin_deploy_path() {
  local path="$1"
  local dir

  for dir in "${MANAGED_PLUGIN_DIRS[@]}"; do
    [[ -n "$dir" ]] || continue
    case "$path" in
      "$dir"/node_modules|"$dir"/node_modules/*|"$dir"/package-lock.json|"$dir"/yarn.lock|"$dir"/pnpm-lock.yaml)
        return 0
        ;;
    esac
  done

  return 1
}

is_forbidden_tracked_path() {
  case "$1" in
    backups|backups/*|public/uploads|public/uploads/*|node_modules|node_modules/*|build|build/*|logs|logs/*)
      return 0
      ;;
  esac

  if is_forbidden_managed_plugin_tracked_path "$1"; then
    return 0
  fi

  return 1
}

is_forbidden_deploy_path() {
  case "$1" in
    docs|docs/*|backups|backups/*|public/uploads|public/uploads/*|build|build/*|logs|logs/*)
      return 0
      ;;
    .deployignore|.gitignore|config.json|config.local.json|docker-compose.local-mongo.yml)
      return 0
      ;;
    scripts/local-mongo.mjs|scripts/local-nodebb.mjs|scripts/verify-local-runtime.mjs|scripts/update-nodebb-docs.sh|scripts/sync-nodebb-extension-state.mjs|scripts/verify-production-extension-state-sync.sh)
      return 0
      ;;
    state/production-nodebb-extensions.json|state/local-testing-state.json)
      return 0
      ;;
  esac

  if is_forbidden_managed_plugin_deploy_path "$1"; then
    return 0
  fi

  return 1
}

main() {
  local tracked_path
  local deploy_path
  local required_path
  local deploy_manifest_file
  local tracked_violations=()
  local deploy_violations=()
  local missing_required_deploy_paths=()

  cd "${ROOT_DIR}"
  load_managed_plugin_dirs

  while IFS= read -r -d '' tracked_path; do
    if is_forbidden_tracked_path "${tracked_path}"; then
      tracked_violations+=("${tracked_path}")
    fi
  done < <(git ls-files -z)

  if ((${#tracked_violations[@]} > 0)); then
    printf 'Tracked files must not contain local runtime or data paths:\n' >&2
    printf '  %s\n' "${tracked_violations[@]}" >&2
    return 1
  fi

  TMP_VERIFY_DIR="$(mktemp -d "${TMPDIR:-/tmp}/verify-sync-safety.XXXXXX")"
  trap cleanup_tmpdir EXIT
  deploy_manifest_file="${TMP_VERIFY_DIR}/deploy-manifest.txt"

  rsync -an --delete --exclude-from='.deployignore' --out-format='%n' ./ "${TMP_VERIFY_DIR}/" > "${deploy_manifest_file}"

  while IFS= read -r deploy_path; do
    deploy_path="${deploy_path#./}"
    deploy_path="${deploy_path%/}"

    [[ -n "${deploy_path}" ]] || continue

    if is_forbidden_deploy_path "${deploy_path}"; then
      deploy_violations+=("${deploy_path}")
    fi
  done < "${deploy_manifest_file}"

  if ((${#deploy_violations[@]} > 0)); then
    printf 'Deployment payload still contains forbidden local or sensitive paths:\n' >&2
    printf '  %s\n' "${deploy_violations[@]}" >&2
    return 1
  fi

  for required_path in "${REQUIRED_CORE_DEPLOY_PATHS[@]}"; do
    [[ -e "${ROOT_DIR}/${required_path}" ]] || continue

    if ! grep -Fxq "${required_path}" "${deploy_manifest_file}"; then
      missing_required_deploy_paths+=("${required_path}")
    fi
  done

  if ((${#missing_required_deploy_paths[@]} > 0)); then
    printf 'Deployment payload is unexpectedly missing required NodeBB core files:\n' >&2
    printf '  %s\n' "${missing_required_deploy_paths[@]}" >&2
    return 1
  fi

  printf '[verify-sync-safety] ok\n'
}

main "$@"
