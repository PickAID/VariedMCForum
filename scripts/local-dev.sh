#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

MONGO_STATUS=$("$SCRIPT_DIR/local-mongo.sh" status || true)
case "$MONGO_STATUS" in
  *"started"*|*"running"*)
    ;;
  *)
    echo "Starting local MongoDB service..."
    "$SCRIPT_DIR/local-mongo.sh" start
    ;;
esac

echo "Building NodeBB assets for local test instance..."
"$SCRIPT_DIR/local-nodebb.sh" build

exec "$SCRIPT_DIR/local-nodebb.sh" dev "$@"
