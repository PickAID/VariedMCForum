#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

read_sync_dirs() {
  local value="${PLUGIN_SYNC_DIRS:-}"

  if [[ -n "$value" ]]; then
    # shellcheck disable=SC2206
    local dirs=( $value )
    printf '%s\n' "${dirs[@]}"
    return 0
  fi

  find "$ROOT_DIR" -mindepth 1 -maxdepth 1 -type d -print \
    | while IFS= read -r dir; do
        [[ -f "$dir/plugin.json" && -f "$dir/package.json" ]] || continue
        printf '%s\n' "${dir#"$ROOT_DIR"/}"
      done \
    | sort -u
}

is_allowed_path() {
  local path="$1"
  local dir

  while IFS= read -r dir; do
    [[ -n "$dir" ]] || continue
    if [[ "$path" == "$dir" || "$path" == "$dir/"* ]]; then
      return 0
    fi
  done < <(read_sync_dirs)

  return 1
}

is_forbidden_path() {
  case "$1" in
    */node_modules|*/node_modules/*)
      return 0
      ;;
    */.env|*/.env.*)
      return 0
      ;;
    */config.json|*/config.local.json)
      return 0
      ;;
    */backups|*/backups/*|*/logs|*/logs/*)
      return 0
      ;;
    */public/uploads|*/public/uploads/*)
      return 0
      ;;
    *.pem|*.key|*.crt|*.p12|*.pfx)
      return 0
      ;;
    *.archive|*.archive.gz|*.tar|*.tar.gz|*.tgz|*.zip|*.7z)
      return 0
      ;;
    *.db|*.sqlite|*.sqlite3)
      return 0
      ;;
  esac

  return 1
}

collect_changed_paths() {
  git diff --name-only --diff-filter=ACDMRTUXB
  git ls-files --others --exclude-standard
}

main() {
  local path
  local violations=()

  cd "${ROOT_DIR}"

  while IFS= read -r path; do
    [[ -n "$path" ]] || continue

    if ! is_allowed_path "$path"; then
      violations+=("changed path outside plugin sync set: $path")
      continue
    fi

    if is_forbidden_path "$path"; then
      violations+=("forbidden synced path: $path")
    fi
  done < <(collect_changed_paths | sort -u)

  while IFS= read -r path; do
    [[ -n "$path" ]] || continue

    if is_forbidden_path "$path"; then
      violations+=("forbidden file present after sync: $path")
    fi
  done < <(
    while IFS= read -r dir; do
      [[ -d "$dir" ]] || continue
      find "$dir" \( -type f -o -type d \) | sed 's#^\./##'
    done < <(read_sync_dirs)
  )

  if ((${#violations[@]} > 0)); then
    printf 'Plugin resync safety check failed:\n' >&2
    printf '  %s\n' "${violations[@]}" >&2
    return 1
  fi

  printf '[verify-plugin-resync-safety] ok\n'
}

main "$@"
