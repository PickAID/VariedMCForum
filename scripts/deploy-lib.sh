#!/usr/bin/env bash

deploy_log() {
  printf '[deploy] %s\n' "$*"
}

is_valid_package_name() {
  local package_name="$1"

  [[ "$package_name" =~ ^[a-z0-9][a-z0-9._-]*$ ]] || [[ "$package_name" =~ ^@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*$ ]]
}

resolve_directory() {
  local dir="$1"

  (
    cd "$dir" >/dev/null 2>&1 && pwd -P
  )
}

is_managed_plugin_dir() {
  local plugin_dir="$1"

  [[ -f "$plugin_dir/plugin.json" && -f "$plugin_dir/package.json" ]]
}

is_path_within_root() {
  local root="$1"
  local path="$2"

  [[ "$path" == "$root" || "$path" == "$root"/* ]]
}

resolve_path_for_validation() {
  local path="$1"
  local current="$path"
  local parent
  local resolved_current
  local resolved_path
  local suffix=""

  while [[ ! -e "$current" && ! -L "$current" ]]; do
    suffix="/$(basename "$current")$suffix"
    parent="$(dirname "$current")"

    if [[ "$parent" == "$current" ]]; then
      return 1
    fi

    current="$parent"
  done

  if [[ -d "$current" ]]; then
    resolved_current="$(resolve_directory "$current")" || return 1
  elif [[ -L "$current" ]]; then
    resolved_current="$(resolve_directory "$current")" || {
      parent="$(dirname "$current")"
      resolved_current="$(resolve_directory "$parent")" || return 1
      suffix="/$(basename "$current")$suffix"
    }
  else
    parent="$(dirname "$current")"
    resolved_current="$(resolve_directory "$parent")" || return 1
    suffix="/$(basename "$current")$suffix"
  fi

  resolved_path="$resolved_current$suffix"

  printf '%s\n' "$resolved_path"
}

validate_path_within_root() {
  local root="$1"
  local path="$2"
  local label="$3"
  local resolved_path

  resolved_path="$(resolve_path_for_validation "$path")" || {
    echo "$label not accessible: $path" >&2
    return 1
  }

  if ! is_path_within_root "$root" "$resolved_path"; then
    echo "$label escapes root: $path" >&2
    return 1
  fi

  printf '%s\n' "$resolved_path"
}

relative_directory_path() {
  local from_dir="$1"
  local to_dir="$2"

  node -e '
    const path = require("path");
    const relative = path.relative(process.argv[1], process.argv[2]);
    process.stdout.write(relative || ".");
  ' "$from_dir" "$to_dir"
}

list_managed_plugins() {
  local root="$1"
  local resolved_root
  local find_output_file
  local find_status
  local dir

  resolved_root="$(resolve_directory "$root")" || {
    echo "root directory not accessible: $root" >&2
    return 1
  }

  find_output_file="$(mktemp "${TMPDIR:-/tmp}/deploy-lib-find.XXXXXX")" || {
    echo "failed to create temp file for managed plugin discovery" >&2
    return 1
  }

  find "$resolved_root" -mindepth 1 -maxdepth 1 -type d -print0 >"$find_output_file"
  find_status=$?

  if [[ "$find_status" -ne 0 ]]; then
    rm -f "$find_output_file"
    return "$find_status"
  fi

  while IFS= read -r -d '' dir; do
    is_managed_plugin_dir "$dir" || continue
    printf '%s\0' "$dir"
  done < "$find_output_file"

  rm -f "$find_output_file"
}

read_package_name() {
  local plugin_dir="$1"

  node -e '
    const fs = require("fs");
    const path = require("path");
    const pkgPath = path.join(process.argv[1], "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

    if (typeof pkg.name !== "string" || pkg.name.trim() === "") {
      process.stderr.write(`package name must be a non-empty string in ${pkgPath}\n`);
      process.exit(1);
    }

    process.stdout.write(pkg.name);
  ' "$plugin_dir"
}

ensure_plugin_symlink() {
  local root="$1"
  local plugin_dir="$2"
  local package_name="$3"
  local resolved_root
  local resolved_plugin_dir
  local actual_package_name
  local plugin_basename
  local expected_plugin_dir
  local node_modules_dir
  local resolved_link_parent

  if ! is_valid_package_name "$package_name"; then
    echo "invalid package name: $package_name" >&2
    return 1
  fi

  resolved_root="$(resolve_directory "$root")" || {
    echo "root directory not accessible: $root" >&2
    return 1
  }
  resolved_plugin_dir="$(resolve_directory "$plugin_dir")" || {
    echo "plugin directory not accessible: $plugin_dir" >&2
    return 1
  }
  plugin_basename="$(basename "$resolved_plugin_dir")"
  expected_plugin_dir="$resolved_root/$plugin_basename"

  if [[ "$resolved_plugin_dir" != "$expected_plugin_dir" ]]; then
    echo "plugin dir must be a direct child of root: $plugin_dir" >&2
    return 1
  fi

  if ! is_managed_plugin_dir "$resolved_plugin_dir"; then
    echo "plugin dir is not a managed plugin: $plugin_dir" >&2
    return 1
  fi

  actual_package_name="$(read_package_name "$resolved_plugin_dir")" || return 1
  if [[ "$package_name" != "$actual_package_name" ]]; then
    echo "package name does not match plugin package.json: $package_name" >&2
    return 1
  fi

  node_modules_dir="$resolved_root/node_modules"
  validate_path_within_root "$resolved_root" "$node_modules_dir" "node_modules path" >/dev/null || return 1

  local link_path="$node_modules_dir/$package_name"
  local link_parent
  local link_target

  link_parent="$(dirname "$link_path")"
  resolved_link_parent="$(validate_path_within_root "$resolved_root" "$link_parent" "link parent path")" || return 1
  validate_path_within_root "$resolved_root" "$link_path" "link path" >/dev/null || return 1
  link_target="$(relative_directory_path "$resolved_link_parent" "$resolved_plugin_dir")"

  mkdir -p "$link_parent"

  if [[ -e "$link_path" && ! -L "$link_path" ]]; then
    echo "refusing to replace non-symlink path: $link_path" >&2
    return 1
  fi

  rm -f "$link_path"
  ln -s "$link_target" "$link_path"
}
