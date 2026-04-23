#!/usr/bin/env sh
set -eu

FORMULA="mongodb/brew/mongodb-community@8.0"
MODE="${LOCAL_MONGO_MODE:-brew}"
COMPOSE_FILE="${LOCAL_MONGO_COMPOSE_FILE:-docker-compose.local-mongo.yml}"

docker_compose() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_FILE" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "$COMPOSE_FILE" "$@"
  else
    echo "Docker Compose is not available." >&2
    exit 1
  fi
}

case "${1:-status}" in
  start)
    case "$MODE" in
      brew)
        brew services start "$FORMULA"
        ;;
      docker)
        docker_compose up -d
        ;;
      *)
        echo "Unsupported LOCAL_MONGO_MODE: $MODE" >&2
        exit 1
        ;;
    esac
    ;;
  stop)
    case "$MODE" in
      brew)
        brew services stop "$FORMULA"
        ;;
      docker)
        docker_compose down
        ;;
      *)
        echo "Unsupported LOCAL_MONGO_MODE: $MODE" >&2
        exit 1
        ;;
    esac
    ;;
  restart)
    case "$MODE" in
      brew)
        brew services restart "$FORMULA"
        ;;
      docker)
        docker_compose down
        docker_compose up -d
        ;;
      *)
        echo "Unsupported LOCAL_MONGO_MODE: $MODE" >&2
        exit 1
        ;;
    esac
    ;;
  status)
    case "$MODE" in
      brew)
        brew services list | grep 'mongodb-community@8.0' || true
        ;;
      docker)
        docker_compose ps mongo || true
        ;;
      *)
        echo "Unsupported LOCAL_MONGO_MODE: $MODE" >&2
        exit 1
        ;;
    esac
    ;;
  shell)
    exec mongosh "mongodb://127.0.0.1:27017/nodebb"
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|shell}" >&2
    echo "Set LOCAL_MONGO_MODE=brew or LOCAL_MONGO_MODE=docker" >&2
    exit 1
    ;;
esac
