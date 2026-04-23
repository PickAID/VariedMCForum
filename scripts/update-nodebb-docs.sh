#!/usr/bin/env sh
set -eu

REPO_URL="https://github.com/NodeBB/docs.git"
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TARGET_DIR="$ROOT_DIR/docs/nodebb"
TMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/nodebb-docs.XXXXXX")

cleanup() {
	rm -rf "$TMP_DIR"
}

trap cleanup EXIT INT TERM

git clone --depth 1 "$REPO_URL" "$TMP_DIR/src"
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"

find "$TMP_DIR/src" -type f -name '*.md' | while IFS= read -r src_file; do
	rel_path=${src_file#"$TMP_DIR/src"/}
	dst_file="$TARGET_DIR/$rel_path"
	mkdir -p "$(dirname "$dst_file")"
	cp "$src_file" "$dst_file"
done

COMMIT_SHA=$(git -C "$TMP_DIR/src" rev-parse HEAD)
SYNCED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "$TARGET_DIR/LOCAL_COPY.md" <<EOF
# Local NodeBB Markdown Docs

- Upstream repository: $REPO_URL
- Synced commit: \`$COMMIT_SHA\`
- Synced at (UTC): \`$SYNCED_AT\`
- Stored path: \`docs/nodebb\`
- Content rule: only \`.md\` files from the upstream repository are kept here

## Refresh

\`\`\`sh
./scripts/update-nodebb-docs.sh
\`\`\`

## Browse

- Main docs: \`docs/nodebb/src/docs\`
- Additional templates: \`docs/nodebb/src/templates\`
- Upstream README: \`docs/nodebb/README.md\`

This directory is a local markdown-only mirror of the official NodeBB
documentation repository for offline reference and future development work.
EOF

printf 'Synced NodeBB docs to %s at commit %s\n' "$TARGET_DIR" "$COMMIT_SHA"
