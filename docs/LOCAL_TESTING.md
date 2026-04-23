# Local NodeBB Testing

This repository can run as a self-contained local NodeBB test instance.

## Local Files

- `config.local.json`: local runtime config used by the CLI wrappers
- `scripts/local-mongo.sh`: manage the local MongoDB service with `LOCAL_MONGO_MODE=brew` or `LOCAL_MONGO_MODE=docker`
- `scripts/local-nodebb.sh`: run NodeBB with `config.local.json`
- `scripts/local-dev.sh`: one-command local bootstrap, build, and dev start
- `state/production-nodebb-extensions.json`: shared production extension list and enabled-state snapshot
- `scripts/sync-nodebb-extension-state.mjs`: cross-platform helper to sync local extension dependencies and `plugins:active` state from that snapshot
- `docker-compose.local-mongo.yml`: local Docker Compose MongoDB service definition

## Start The Local Test Environment

1. Install project dependencies.

```bash
npm install
```

2. Make sure local MongoDB is available.

Homebrew installation and service:

```bash
brew tap mongodb/brew
brew install mongodb-community@8.0
./scripts/local-mongo.sh start
./scripts/local-mongo.sh status
```

Docker Compose option with the repository-local YAML:

```bash
LOCAL_MONGO_MODE=docker ./scripts/local-mongo.sh start
LOCAL_MONGO_MODE=docker ./scripts/local-mongo.sh status
```

Or directly:

```bash
docker compose -f docker-compose.local-mongo.yml up -d
docker compose -f docker-compose.local-mongo.yml ps
```

3. Start the local test server.

```bash
./scripts/local-dev.sh
```

If you want the local forum to mirror the shared production extension list and enabled state first:

```bash
npm run plugin-state:sync
```

4. Open:

```text
http://localhost:4567
```

## Common Commands

Rebuild assets only:

```bash
./scripts/local-nodebb.sh build
```

Start dev mode directly:

```bash
./scripts/local-nodebb.sh dev
```

Stop the local NodeBB process:

```bash
./scripts/local-nodebb.sh stop
```

Show extension drift from the shared production snapshot:

```bash
npm run plugin-state:plan
```

Sync local extension dependencies and enabled state from the shared production snapshot:

```bash
npm run plugin-state:sync
```

Check local MongoDB:

```bash
./scripts/local-mongo.sh status
```

Check local MongoDB with Docker Compose:

```bash
LOCAL_MONGO_MODE=docker ./scripts/local-mongo.sh status
```

## Restore A Local Test Backup

If you already have a local MongoDB archive backup file, restore it into the local NodeBB database with:

```bash
mongorestore \
  --uri mongodb://127.0.0.1:27017 \
  --gzip \
  --archive=/absolute/path/to/your-backup.archive.gz \
  --drop
```

After restore, run:

```bash
./scripts/local-dev.sh
```

If you need the local forum to match the original site's visual state more closely, also restore the `public/uploads/` directory from your internal backup source. NodeBB stores uploaded assets such as logos, favicons, carousel images, and other file-backed resources there. Database restore alone does not bring those files back.

## Notes

- Local backup files under `backups/` are intentionally ignored by Git.
- `public/uploads/` is also ignored by Git and excluded from production sync.
- Shared local runtime files such as `config.local.json`, `docker-compose.local-mongo.yml`, and `scripts/local-*.sh` are intended to stay in GitHub for developer use, but are blocked from production sync by `.deployignore`.
- Admin custom CSS/JS/HTML is stored in the database, but files referenced by that code may still live under `public/uploads/`.
- The local startup flow always uses `config.local.json`, not the production config.
- The Docker Compose MongoDB service intentionally runs without auth so it matches `config.local.json`.
