#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
STATE_FILE="state/production-nodebb-extensions.json"

collect_changed_paths() {
  git diff --name-only --diff-filter=ACDMRTUXB
  git ls-files --others --exclude-standard
}

main() {
  local path
  local violations=()

  cd "${ROOT_DIR}"

  while IFS= read -r path; do
    [[ -n "${path}" ]] || continue

    if [[ "${path}" != "${STATE_FILE}" ]]; then
      violations+=("changed path outside production extension state snapshot: ${path}")
    fi
  done < <(collect_changed_paths | sort -u)

  if [[ ! -f "${STATE_FILE}" ]]; then
    violations+=("missing state file: ${STATE_FILE}")
  fi

  if ((${#violations[@]} > 0)); then
    printf 'Production extension state sync safety check failed:\n' >&2
    printf '  %s\n' "${violations[@]}" >&2
    return 1
  fi

  printf '[verify-production-extension-state-sync] ok\n'
}

main "$@"
