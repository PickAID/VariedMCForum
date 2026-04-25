#!/usr/bin/env node

import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const defaultConfigPath = path.join(rootDir, 'config.local.json');

function printUsage() {
	console.log(`Usage: node scripts/rename-nodebb-tags.mjs --from <old-tag> --to <new-tag> [options]

Options:
  --config <path>  NodeBB config file to use (default: config.local.json)
  --from <tag>     Existing tag to rename
  --to <tag>       New tag name
`);
}

function parseArgs(argv) {
	const result = {
		configPath: defaultConfigPath,
		from: '',
		to: '',
	};

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--config') {
			result.configPath = path.resolve(rootDir, argv[i + 1]);
			i += 1;
			continue;
		}
		if (arg === '--from') {
			result.from = argv[i + 1] || '';
			i += 1;
			continue;
		}
		if (arg === '--to') {
			result.to = argv[i + 1] || '';
			i += 1;
			continue;
		}
		if (arg === '-h' || arg === '--help') {
			result.help = true;
			continue;
		}
		throw new Error(`unknown argument: ${arg}`);
	}

	return result;
}

function ensureNconfStores() {
	const nconf = require('nconf');

	if (!nconf.stores.argv) {
		nconf.argv();
	}
	if (!nconf.stores.env) {
		nconf.env({
			separator: '__',
		});
	}
}

async function withNodebbDatabase(configPath, callback) {
	const prestart = require('../src/prestart');
	ensureNconfStores();
	prestart.loadConfig(configPath);

	const db = require('../src/database');
	await db.init();

	try {
		return await callback();
	} finally {
		if (typeof db.close === 'function') {
			await db.close();
		}
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		printUsage();
		return;
	}

	if (!args.from || !args.to) {
		printUsage();
		process.exitCode = 1;
		return;
	}

	await withNodebbDatabase(args.configPath, async () => {
		const topics = require('../src/topics');
		await topics.renameTags([{
			value: args.from,
			newName: args.to,
		}]);
	});

	console.log(`Renamed tag "${args.from}" -> "${args.to}" using ${path.relative(rootDir, args.configPath)}.`);
}

main().catch((err) => {
	console.error(err.stack || String(err));
	process.exit(1);
});
