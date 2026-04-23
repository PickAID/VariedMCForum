#!/usr/bin/env sh
set -eu

CONFIG_FILE="${CONFIG_FILE:-config.local.json}"

if [ ! -f "$CONFIG_FILE" ]; then
	echo "Config file not found: $CONFIG_FILE" >&2
	exit 1
fi

exec ./nodebb --config "$CONFIG_FILE" "$@"
