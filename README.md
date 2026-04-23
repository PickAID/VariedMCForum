# VariedMCForum

This repository is the shared development overlay for the forum. It keeps three things in one place:

- the custom plugin source trees that should be versioned in GitHub
- the shared local NodeBB test environment files that other developers need
- the markdown-only local copy of NodeBB docs under `docs/nodebb/`

Local test files are intentionally committed to GitHub so other developers can reproduce the environment. They are still blocked from production sync by `.deployignore`.

## Quick Start

1. Install root dependencies.

```bash
npm install
```

2. Start MongoDB locally.

Homebrew option:

```bash
brew tap mongodb/brew
brew install mongodb-community@8.0
./scripts/local-mongo.sh start
```

Docker Compose option with this repository's local YAML:

```bash
LOCAL_MONGO_MODE=docker ./scripts/local-mongo.sh start
```

This uses [docker-compose.local-mongo.yml](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/docker-compose.local-mongo.yml). The compose file intentionally runs MongoDB without auth so it matches [config.local.json](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/config.local.json).

3. Start the local NodeBB service.

```bash
./scripts/local-dev.sh
```

If you want the local environment to mirror the shared production extension list and enabled state first:

```bash
npm run plugin-state:sync
```

4. Open:

```text
http://localhost:4567
```

## Local MongoDB

The repository ships two supported local Mongo paths.

Homebrew service:

```bash
./scripts/local-mongo.sh status
./scripts/local-mongo.sh start
./scripts/local-mongo.sh stop
./scripts/local-mongo.sh shell
```

Docker Compose service:

```bash
LOCAL_MONGO_MODE=docker ./scripts/local-mongo.sh status
LOCAL_MONGO_MODE=docker ./scripts/local-mongo.sh start
LOCAL_MONGO_MODE=docker ./scripts/local-mongo.sh stop
```

You can also call Docker Compose directly:

```bash
docker compose -f docker-compose.local-mongo.yml up -d
docker compose -f docker-compose.local-mongo.yml down
```

## Local NodeBB Config

- [config.local.json](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/config.local.json) is the shared local runtime config.
- [scripts/local-nodebb.sh](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/scripts/local-nodebb.sh) always runs `./nodebb --config config.local.json`.
- [scripts/local-dev.sh](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/scripts/local-dev.sh) ensures MongoDB is up, builds assets, then starts NodeBB in dev mode.
- [state/production-nodebb-extensions.json](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/state/production-nodebb-extensions.json) is the shared production extension snapshot committed by GitHub Actions.
- [scripts/sync-nodebb-extension-state.mjs](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/scripts/sync-nodebb-extension-state.mjs) is the cross-platform helper that syncs local extension dependencies and `plugins:active` state from that snapshot.

Useful commands:

```bash
./scripts/local-nodebb.sh build
./scripts/local-nodebb.sh dev
./scripts/local-nodebb.sh stop
npm run plugin-state:plan
npm run plugin-state:sync
```

## Local Data Restore

If you already have a local MongoDB archive backup:

```bash
mongorestore \
  --uri mongodb://127.0.0.1:27017 \
  --gzip \
  --archive=/absolute/path/to/your-backup.archive.gz \
  --drop
```

After restoring the database, start the service again:

```bash
./scripts/local-dev.sh
```

If the local forum also needs site assets such as logos, favicons, carousel images, and uploaded files, restore `public/uploads/` from your internal backup source too. Database restore alone does not restore those files.

## Documentation

- [docs/LOCAL_TESTING.md](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/docs/LOCAL_TESTING.md): local test environment guide
- [docs/nodebb/README.md](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/docs/nodebb/README.md): local markdown mirror of NodeBB docs

## Sync Boundaries

- Files that should stay local only: `backups/`, `public/uploads/`, `node_modules/`, `build/`, `logs/`
- Files that should be shared in GitHub but never synced to production: local runtime helpers, local config, local test docs, and other paths listed in [.deployignore](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/.deployignore)
