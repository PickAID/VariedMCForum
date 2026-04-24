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

2. If you have private local-only plugins or local-only settings overrides, create:

[state/local-testing-state.json](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/state/local-testing-state.example.json)

```bash
nano state/local-testing-state.json
```

Use [state/local-testing-state.example.json](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/state/local-testing-state.example.json) as the template. The real `state/local-testing-state.json` file is ignored by Git, excluded from production sync, and is where private local plugin paths plus local-only settings/object overlays should live.

3. Start the local NodeBB service.

```bash
npm run local:dev
```

This command now handles the whole local testing bootstrap:

- ensures local MongoDB is running
- syncs the shared production extension state
- installs private local-only plugins from `state/local-testing-state.json` when that file exists
- applies local settings/object overlays from the same file
- builds assets
- launches NodeBB in dev mode

Stop dev mode with `Ctrl+C` in the same terminal.

4. Open:

```text
http://localhost:4567
```

## Local MongoDB

The primary local Mongo entrypoints are Node-based:

```bash
npm run local:mongo:status
npm run local:mongo:start
npm run local:mongo:stop
npm run local:mongo:ensure
```

`npm run local:dev`, `npm run local:build`, `npm run local:start`, and `npm run local:upgrade` already call `local:mongo:ensure` automatically.

The Node helper auto-detects the runtime. On macOS it uses Homebrew MongoDB when installed, otherwise it uses Docker when available. Set `LOCAL_MONGO_MODE=docker` or `LOCAL_MONGO_MODE=brew` to force a mode.

The repository supports two Mongo runtimes behind those Node commands:

Docker Compose, preferred for cross-platform local testing:

```bash
docker compose -f docker-compose.local-mongo.yml up -d
docker compose -f docker-compose.local-mongo.yml down
```

macOS Homebrew service:

```bash
brew tap mongodb/brew
brew install mongodb-community@8.0
LOCAL_MONGO_MODE=brew npm run local:mongo:start
```

This uses [docker-compose.local-mongo.yml](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/docker-compose.local-mongo.yml). The compose file intentionally runs MongoDB without auth so it matches [config.local.json](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/config.local.json).

## Local NodeBB Commands

- [config.local.json](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/config.local.json) is the shared local runtime config.
- `npm run local:*` is the primary cross-platform entrypoint for local testing.
- On macOS/Linux, the equivalent direct CLI form is `./nodebb --config config.local.json <command>`.
- On Windows, use `npm run local:*`, `node .\\nodebb --config config.local.json <command>`, or `nodebb.bat --config config.local.json <command>`.
- [state/production-nodebb-extensions.json](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/state/production-nodebb-extensions.json) is the shared production extension snapshot committed by GitHub Actions.
- [scripts/sync-nodebb-extension-state.mjs](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/scripts/sync-nodebb-extension-state.mjs) syncs shared production dependencies and `plugins:active`.
- [scripts/local-testing-state.mjs](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/scripts/local-testing-state.mjs) installs private local-only plugins and applies local-only settings/object overlays from `state/local-testing-state.json`.
- [scripts/local-nodebb.mjs](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/scripts/local-nodebb.mjs) is the local bootstrap wrapper used by all `npm run local:*` NodeBB commands.

Useful commands:

```bash
npm run local:prepare
npm run local:build
npm run local:dev
npm run local:start
npm run local:stop
npm run local:upgrade
npm run local:state:plan
npm run local:state:sync
npm run plugin-state:plan
npm run plugin-state:sync
```

`npm run local:prepare` is the no-launch version of the local bootstrap. It ensures MongoDB is running, syncs the shared production extension state, installs any local private plugins, and applies local settings overlays.

If `nodebb-plugin-web-push` is enabled, local startup on plain `http://localhost:4567` may log a VAPID subject warning because web push expects an `https:` or `mailto:` subject URL. The local forum still starts; this does not block normal plugin/theme testing.

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
npm run local:dev
```

If the local forum also needs site assets such as logos, favicons, carousel images, and uploaded files, restore `public/uploads/` from your internal backup source too. Database restore alone does not restore those files.

## Documentation

- [docs/LOCAL_TESTING.md](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/docs/LOCAL_TESTING.md): local test environment guide
- [docs/nodebb/README.md](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/docs/nodebb/README.md): local markdown mirror of NodeBB docs

## Sync Boundaries

- Files that should stay local only: `backups/`, `public/uploads/`, `node_modules/`, `build/`, `logs/`
- Files that should be shared in GitHub but never synced to production: local runtime helpers, local config, local test docs, and other paths listed in [.deployignore](/Users/gedwen/Documents/programing/GitHub/VariedMCForum/.deployignore)
