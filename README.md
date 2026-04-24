# VariedMCForum

VariedMCForum is the source-of-truth repository for forum development.

It contains four things:

- NodeBB core source and deployable runtime files
- managed plugin source trees that belong in GitHub
- shared local testing helpers for developers
- a Markdown-only mirror of upstream NodeBB docs under [`docs/nodebb/`](docs/nodebb/)

## Development Model

The model is intentionally simple:

- local testing uses this repository plus a production-like MongoDB restore
- production receives code from this repository, not local runtime data
- plugin enabled state is restored by script, not by manual ACP clicking

Keep one clean split in mind:

- data comes from a restored production backup
- code comes from this repository

## What Syncs Where

Local development uses:

- this repository
- local MongoDB from `config.local.json`
- restored production data when realistic testing is needed
- optional restored `public/uploads/` for logos, favicons, and other file-backed assets

GitHub keeps:

- NodeBB core and managed plugin source
- local testing helpers such as `config.local.json`, `docker-compose.local-mongo.yml`, and `scripts/local-*.mjs`
- local testing documentation
- the Markdown mirror in `docs/nodebb/`

Production receives:

- NodeBB runtime and core source
- managed plugin source trees
- deploy scripts and workflow-driven code updates

Production does not receive:

- local MongoDB config
- local helper scripts
- `docs/`
- `backups/`
- `public/uploads/`
- local state snapshots used only for development workflows

Those boundaries are enforced by [`.deployignore`](.deployignore) and [`scripts/verify-sync-safety.sh`](scripts/verify-sync-safety.sh).

## Prerequisites

- Node.js 20 or newer
- `npm`
- local MongoDB, either through Homebrew or Docker
- a MongoDB backup if you want local behavior to mirror production

## Quick Start

1. Install dependencies.

```bash
npm install
```

2. Restore the production MongoDB backup into local MongoDB when you want realistic local testing.

3. Restore `public/uploads/` if you need the same logos, images, or other uploaded assets.

4. Start the local forum.

```bash
npm run local:dev
```

5. Open `http://localhost:4567`.

`npm run local:dev` will:

- ensure local MongoDB is running
- sync plugin dependencies and `plugins:active` from the shared production extension snapshot
- build assets
- start NodeBB in dev mode

## Daily Workflow

1. Restore or refresh your local MongoDB data when needed.
2. Run `npm run local:prepare` if plugin dependencies or plugin enabled state may have drifted.
3. Run `npm run local:dev`.
4. Modify NodeBB core or managed plugin source in this repository.
5. Push to `main` when production should receive the code.

If local plugin state drifted but the database contents are already correct, you do not need to restore the full database again. Run `npm run plugin-state:apply`.

## Local Commands

Main local commands:

```bash
npm run local:prepare
npm run local:build
npm run local:dev
npm run local:start
npm run local:stop
npm run local:upgrade
```

Command meaning:

- `local:prepare`: ensure MongoDB is up and sync the shared production plugin state
- `local:build`: prepare the local runtime, then build assets
- `local:dev`: prepare, build, and run NodeBB in dev mode
- `local:start`: prepare, build, and run NodeBB in background mode
- `local:stop`: stop the background NodeBB process using `config.local.json`
- `local:upgrade`: prepare the local runtime, then run NodeBB upgrade

Direct CLI equivalents:

- macOS/Linux: `./nodebb --config config.local.json <command>`
- Windows: `node .\\nodebb --config config.local.json <command>` or `nodebb.bat --config config.local.json <command>`

## Plugin State Sync

The shared extension snapshot lives in [`state/production-nodebb-extensions.json`](state/production-nodebb-extensions.json).

The sync logic lives in [`scripts/sync-nodebb-extension-state.mjs`](scripts/sync-nodebb-extension-state.mjs).

Available commands:

```bash
npm run plugin-state:plan
npm run plugin-state:install
npm run plugin-state:apply
npm run plugin-state:sync
```

Meaning:

- `plugin-state:plan`: show local drift against the shared production snapshot
- `plugin-state:install`: update declared plugin and theme dependencies to match the snapshot
- `plugin-state:apply`: rewrite `plugins:active` to match the snapshot
- `plugin-state:sync`: run install and apply, then build assets

Use `plugin-state:apply` when the database is already correct and you only need to restore enabled and disabled plugin state quickly.

## Local MongoDB

Node-based MongoDB helpers:

```bash
npm run local:mongo:status
npm run local:mongo:start
npm run local:mongo:stop
npm run local:mongo:ensure
```

Runtime selection:

- on macOS, the helper prefers Homebrew MongoDB when installed
- otherwise it uses Docker when available

You can force a mode:

```bash
LOCAL_MONGO_MODE=brew npm run local:mongo:start
LOCAL_MONGO_MODE=docker npm run local:mongo:start
```

Related files:

- [`config.local.json`](config.local.json)
- [`docker-compose.local-mongo.yml`](docker-compose.local-mongo.yml)
- [`scripts/local-mongo.mjs`](scripts/local-mongo.mjs)
- [`scripts/local-nodebb.mjs`](scripts/local-nodebb.mjs)

The Docker setup intentionally runs MongoDB without auth so it matches `config.local.json`.

## Restore Local Data

If you already have a MongoDB archive, restore it into local MongoDB with:

```bash
mongorestore \
  --uri mongodb://127.0.0.1:27017 \
  --gzip \
  --archive=/absolute/path/to/your-backup.archive.gz \
  --drop
```

Then start the forum again:

```bash
npm run local:dev
```

Database restore alone does not restore file-backed assets. If visual state matters, restore `public/uploads/` as well.

## NodeBB Docs Mirror

Only Markdown files from the upstream NodeBB docs repository are kept under [`docs/nodebb/`](docs/nodebb/).

To inspect the current local mirror metadata, see [`docs/nodebb/LOCAL_COPY.md`](docs/nodebb/LOCAL_COPY.md).

To refresh that mirror:

```bash
./scripts/update-nodebb-docs.sh
```

## Important Files

- [`docs/LOCAL_TESTING.md`](docs/LOCAL_TESTING.md): detailed local testing guide
- [`scripts/local-nodebb.mjs`](scripts/local-nodebb.mjs): local bootstrap wrapper
- [`scripts/local-mongo.mjs`](scripts/local-mongo.mjs): local MongoDB manager
- [`scripts/sync-nodebb-extension-state.mjs`](scripts/sync-nodebb-extension-state.mjs): plugin dependency and enabled-state sync
- [`scripts/deploy-prod.sh`](scripts/deploy-prod.sh): production deploy entrypoint

## Notes

- `public/uploads/` is ignored by Git and excluded from production sync.
- `backups/` is ignored by Git and excluded from production sync.
- Shared local runtime files stay in GitHub for developers, but `.deployignore` keeps them out of production.
- If `nodebb-plugin-web-push` is enabled, startup on `http://localhost:4567` may log a VAPID subject warning. That does not block normal local testing.

Last reviewed: `2026-04-24`
