#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TMP_VERIFY_DIR=""

cleanup_tmpdir() {
  if [[ -n "${TMP_VERIFY_DIR:-}" && -d "${TMP_VERIFY_DIR}" ]]; then
    rm -rf "${TMP_VERIFY_DIR}"
  fi
}

is_forbidden_tracked_path() {
  case "$1" in
    backups|backups/*|public/uploads|public/uploads/*|node_modules|node_modules/*|build|build/*|logs|logs/*)
      return 0
      ;;
    app.js|nodebb|nodebb.bat|loader.js|require-main.js|Gruntfile.js|webpack.common.js|webpack.dev.js|webpack.installer.js|webpack.prod.js)
      return 0
      ;;
    install|install/*|types|types/*)
      return 0
      ;;
    config.local.json|docker-compose.local-mongo.yml|scripts/local-dev.sh|scripts/local-mongo.sh|scripts/local-nodebb.sh|docs/LOCAL_TESTING.md)
      return 0
      ;;
  esac

  return 1
}

is_forbidden_deploy_path() {
  case "$1" in
    docs|docs/*|backups|backups/*|public/uploads|public/uploads/*|build|build/*|logs|logs/*)
      return 0
      ;;
    app.js|nodebb|nodebb.bat|loader.js|require-main.js|Gruntfile.js|webpack.common.js|webpack.dev.js|webpack.installer.js|webpack.prod.js)
      return 0
      ;;
    install|install/*|types|types/*)
      return 0
      ;;
    config.json|config.local.json|docker-compose.local-mongo.yml|scripts/local-dev.sh|scripts/local-mongo.sh|scripts/local-nodebb.sh)
      return 0
      ;;
    extended-markdown-fixed/node_modules|extended-markdown-fixed/node_modules/*|extended-markdown-fixed/package-lock.json|extended-markdown-fixed/yarn.lock)
      return 0
      ;;
    markdown-toc/node_modules|markdown-toc/node_modules/*|markdown-toc/package-lock.json|markdown-toc/yarn.lock)
      return 0
      ;;
    tag-color/node_modules|tag-color/node_modules/*|tag-color/package-lock.json|tag-color/yarn.lock)
      return 0
      ;;
    tag-color-maker/node_modules|tag-color-maker/node_modules/*|tag-color-maker/package-lock.json|tag-color-maker/yarn.lock)
      return 0
      ;;
  esac

  return 1
}

main() {
  local tracked_path
  local deploy_path
  local tracked_violations=()
  local deploy_violations=()

  cd "${ROOT_DIR}"

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

  while IFS= read -r deploy_path; do
    deploy_path="${deploy_path#./}"
    deploy_path="${deploy_path%/}"

    [[ -n "${deploy_path}" ]] || continue

    if is_forbidden_deploy_path "${deploy_path}"; then
      deploy_violations+=("${deploy_path}")
    fi
  done < <(rsync -an --delete --exclude-from='.deployignore' --out-format='%n' ./ "${TMP_VERIFY_DIR}/")

  if ((${#deploy_violations[@]} > 0)); then
    printf 'Deployment payload still contains forbidden local or sensitive paths:\n' >&2
    printf '  %s\n' "${deploy_violations[@]}" >&2
    return 1
  fi

  printf '[verify-sync-safety] ok\n'
}

main "$@"
