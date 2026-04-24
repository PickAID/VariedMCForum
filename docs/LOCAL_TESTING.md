# Local NodeBB Testing

This repository can run as a self-contained local NodeBB test instance.

For the repo boundary and deploy model, see [README.md](../README.md).

## Local Files

- `config.local.json`: shared local runtime config used by the NodeBB CLI
- `scripts/local-mongo.mjs`: Node-based local MongoDB runtime manager
- `scripts/local-nodebb.mjs`: Node-based local NodeBB bootstrap and runner
- `state/production-nodebb-extensions.json`: shared production extension list and enabled-state snapshot
- `scripts/sync-nodebb-extension-state.mjs`: cross-platform helper to sync local extension dependencies and `plugins:active` state from that snapshot
- `docker-compose.local-mongo.yml`: local Docker Compose MongoDB service definition

## Start The Local Test Environment

1. Install project dependencies.

```bash
npm install
```

2. Restore the production MongoDB backup when you want the local forum to mirror production ACP state, plugin state, and plugin data.

3. Start the local test server.

```bash
npm run local:dev
```

This command automatically:

- ensures local MongoDB is reachable
- syncs the shared production extension state
- builds assets
- launches NodeBB in dev mode

Stop dev mode with `Ctrl+C` in the same terminal.

4. Open:

```text
http://localhost:4567
```

## Common Commands

Prepare the local environment without launching NodeBB:

```bash
npm run local:prepare
```

Rebuild assets only:

```bash
npm run local:build
```

Start dev mode directly:

```bash
npm run local:dev
```

Start NodeBB in background mode:

```bash
npm run local:start
```

Stop the background NodeBB process:

```bash
npm run local:stop
```

Run the NodeBB upgrade flow against the shared local config:

```bash
npm run local:upgrade
```

Show extension drift from the shared production snapshot:

```bash
npm run plugin-state:plan
```

Install the declared plugin/theme dependencies from the shared production snapshot:

```bash
npm run plugin-state:install
```

Apply only the enabled/disabled plugin state from the shared production snapshot:

```bash
npm run plugin-state:apply
```

Sync local extension dependencies and enabled state from the shared production snapshot only:

```bash
npm run plugin-state:sync
```

Check local MongoDB:

```bash
npm run local:mongo:status
```

Start local MongoDB:

```bash
npm run local:mongo:start
```

Stop local MongoDB:

```bash
npm run local:mongo:stop
```

Prefer Docker Compose explicitly:

```bash
docker compose -f docker-compose.local-mongo.yml up -d
docker compose -f docker-compose.local-mongo.yml down
```

Prefer the macOS Homebrew service explicitly:

```bash
LOCAL_MONGO_MODE=brew npm run local:mongo:start
LOCAL_MONGO_MODE=brew npm run local:mongo:stop
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
npm run local:dev
```

If you need the local forum to match the original site's visual state more closely, also restore the `public/uploads/` directory from your internal backup source. NodeBB stores uploaded assets such as logos, favicons, carousel images, and other file-backed resources there. Database restore alone does not bring those files back.

Recommended development flow:

1. Restore the latest production MongoDB backup to local MongoDB.
2. Restore `public/uploads/` if you need real assets.
3. Run `npm run local:prepare` to ensure local MongoDB is up and the repo's plugin dependencies plus `plugins:active` state match the shared production snapshot.
4. Run `npm run local:dev` and test your source/plugin changes locally.
5. Push source changes to `main` when ready so production deploy receives only code and managed plugin source trees.

## Notes

- Local backup files under `backups/` are intentionally ignored by Git.
- `public/uploads/` is also ignored by Git and excluded from production sync.
- Shared local runtime files such as `config.local.json`, `docker-compose.local-mongo.yml`, and `scripts/local-*.mjs` are intended to stay in GitHub for developer use, but are blocked from production sync by `.deployignore`.
- Cross-platform daily usage should prefer `npm run local:*`. On macOS/Linux, `./nodebb --config config.local.json <command>` is the direct equivalent. On Windows, use `npm run local:*`, `node .\\nodebb --config config.local.json <command>`, or `nodebb.bat --config config.local.json <command>`.
- Admin custom CSS/JS/HTML is stored in the database, but files referenced by that code may still live under `public/uploads/`.
- The local startup flow always uses `config.local.json`, not the production config.
- The Node-based Mongo helper auto-detects the runtime. On macOS it uses Homebrew MongoDB when installed, otherwise it uses Docker when available. Set `LOCAL_MONGO_MODE=docker` or `LOCAL_MONGO_MODE=brew` to force a mode.
- The Docker Compose MongoDB service intentionally runs without auth so it matches `config.local.json`.
- If `nodebb-plugin-web-push` is enabled, startup on plain `http://localhost:4567` may log a VAPID subject warning because web push expects an `https:` or `mailto:` subject URL. The local forum can still finish startup and be used normally.

Last reviewed: `2026-04-24`
