#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const defaultStatePath = path.join(rootDir, 'backups', 'nodebb-ui-state', 'latest', 'production-nodebb-ui-state-managed.json');
const defaultConfigPath = path.join(rootDir, 'config.local.json');
const managedSettingKeys = [
	'settings:recentcards',
	'settings:custom-skins',
	'settings:variedmc-ui',
	'settings:variedmc-topic-meta',
	'settings:tag-controller',
];
const managedConfigFields = [
	'useCustomCSS',
	'useCustomJS',
	'useCustomHTML',
	'useBSVariables',
	'bootswatchSkin',
	'bsVariables',
	'customCSS',
	'renderedCustomCSS',
	'customJS',
	'customHTML',
];
const variedmcHomeWidgetDefaults = Object.freeze({
	widget: 'variedmcHomeHero',
	data: {
		topicUrl: '/topic/11',
		imageUrl: '/assets/uploads/system/carousel.webp',
		recentTitle: '最新动态',
		recentLinkUrl: '/recent',
		recentLinkLabel: '更多',
		tagsTitle: '热门标签',
		categoriesTitle: '所有板块',
		title: '',
		container: '',
		startDate: '',
		endDate: '',
	},
});

function printUsage() {
	console.log(`Usage: node scripts/sync-nodebb-ui-state.mjs <command> [options]

Commands:
  summary   Print a summary of a UI state snapshot
  capture   Capture current UI state from the configured MongoDB into a snapshot file
  transform-managed  Rewrite a snapshot into the repository-managed UI shape
  apply     Apply a UI state snapshot to the configured MongoDB

Options:
  --state <path>   Snapshot file path (default: backups/nodebb-ui-state/latest/production-nodebb-ui-state.json)
  --config <path>  NodeBB config file to use (default: config.local.json)
  --output <path>  Output path for capture (default: timestamped backup path)
  --no-backup      Skip automatic local backup before apply
`);
}

function parseArgs(argv) {
	const result = {
		command: 'summary',
		statePath: defaultStatePath,
		configPath: defaultConfigPath,
		outputPath: null,
		noBackup: false,
	};
	const positional = [];

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--state') {
			result.statePath = path.resolve(rootDir, argv[i + 1]);
			i += 1;
			continue;
		}
		if (arg === '--config') {
			result.configPath = path.resolve(rootDir, argv[i + 1]);
			i += 1;
			continue;
		}
		if (arg === '--output') {
			result.outputPath = path.resolve(rootDir, argv[i + 1]);
			i += 1;
			continue;
		}
		if (arg === '--no-backup') {
			result.noBackup = true;
			continue;
		}
		if (arg === '-h' || arg === '--help') {
			result.help = true;
			continue;
		}
		positional.push(arg);
	}

	if (positional.length) {
		[result.command] = positional;
	}

	return result;
}

async function readJson(filePath) {
	return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function resolveMongoUri(config) {
	if (config.database !== 'mongo') {
		throw new Error(`unsupported database for UI state sync: ${config.database || 'unknown'}`);
	}

	if (config.mongo && typeof config.mongo.uri === 'string' && config.mongo.uri) {
		return config.mongo.uri;
	}

	const mongo = config.mongo || {};
	const host = mongo.host || '127.0.0.1';
	const port = mongo.port || 27017;
	const database = mongo.database;

	if (!database) {
		throw new Error('config file missing mongo.database');
	}

	let auth = '';
	if (mongo.username) {
		auth = encodeURIComponent(mongo.username);
		if (mongo.password) {
			auth += `:${encodeURIComponent(mongo.password)}`;
		}
		auth += '@';
	}

	const params = new URLSearchParams();
	if (mongo.authSource) {
		params.set('authSource', mongo.authSource);
	}

	const query = params.toString();
	return `mongodb://${auth}${host}:${port}/${database}${query ? `?${query}` : ''}`;
}

function resolveMongoDatabaseName(config, mongoUri) {
	const parsed = new URL(mongoUri);
	const pathName = parsed.pathname.replace(/^\/+/, '');
	return pathName || (config.mongo && config.mongo.database) || 'nodebb';
}

async function connectFromConfig(configPath) {
	const config = await readJson(configPath);
	const mongoUri = resolveMongoUri(config);
	const dbName = resolveMongoDatabaseName(config, mongoUri);
	const client = new MongoClient(mongoUri);
	await client.connect();
	return {
		client,
		config,
		db: client.db(dbName),
	};
}

function normalizeConfigSnapshot(configDoc) {
	return {
		useCustomCSS: configDoc?.useCustomCSS ?? null,
		useCustomJS: configDoc?.useCustomJS ?? null,
		useCustomHTML: configDoc?.useCustomHTML ?? null,
		useBSVariables: configDoc?.useBSVariables ?? null,
		bootswatchSkin: configDoc?.bootswatchSkin ?? null,
		bsVariables: configDoc?.bsVariables ?? '',
		customCSS: configDoc?.customCSS ?? '',
		renderedCustomCSS: configDoc?.renderedCustomCSS ?? '',
		customJS: configDoc?.customJS ?? '',
		customHTML: configDoc?.customHTML ?? '',
	};
}

async function captureUiState(db, config) {
	const objects = db.collection('objects');
	const [configDoc, settingsDocs, widgetDocs] = await Promise.all([
		objects.findOne({ _key: 'config' }, { projection: { _id: 0 } }),
		objects.find({ _key: { $in: managedSettingKeys } }, { projection: { _id: 0 } }).toArray(),
		objects.find({ _key: /^widgets:/ }, { projection: { _id: 0 } }).toArray(),
	]);

	return {
		schemaVersion: 1,
		capturedAt: new Date().toISOString(),
		source: {
			url: config.url || null,
			database: config.database || 'mongo',
			nodeVersion: process.version,
		},
		config: normalizeConfigSnapshot(configDoc),
		settings: Object.fromEntries(settingsDocs.map(doc => [doc._key, doc])),
		widgets: Object.fromEntries(widgetDocs.map(doc => [doc._key, doc])),
	};
}

function validateSnapshot(snapshot) {
	if (!snapshot || typeof snapshot !== 'object') {
		throw new Error('snapshot must contain a JSON object');
	}
	if (snapshot.schemaVersion !== 1) {
		throw new Error(`unsupported UI state snapshot schemaVersion: ${snapshot.schemaVersion}`);
	}
	if (!snapshot.config || typeof snapshot.config !== 'object' || Array.isArray(snapshot.config)) {
		throw new Error('snapshot missing config object');
	}
	if (!snapshot.settings || typeof snapshot.settings !== 'object' || Array.isArray(snapshot.settings)) {
		throw new Error('snapshot missing settings object');
	}
	if (!snapshot.widgets || typeof snapshot.widgets !== 'object' || Array.isArray(snapshot.widgets)) {
		throw new Error('snapshot missing widgets object');
	}

	for (const key of managedConfigFields) {
		if (!Object.prototype.hasOwnProperty.call(snapshot.config, key)) {
			throw new Error(`snapshot missing config field: ${key}`);
		}
	}

	for (const [key, doc] of Object.entries(snapshot.settings)) {
		if (!managedSettingKeys.includes(key)) {
			throw new Error(`snapshot contains unmanaged settings key: ${key}`);
		}
		if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
			throw new Error(`snapshot settings entry must be an object: ${key}`);
		}
		if (doc._key !== key) {
			throw new Error(`snapshot settings entry has mismatched _key: ${key}`);
		}
	}

	for (const [key, doc] of Object.entries(snapshot.widgets)) {
		if (!key.startsWith('widgets:')) {
			throw new Error(`snapshot contains invalid widget key: ${key}`);
		}
		if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
			throw new Error(`snapshot widget entry must be an object: ${key}`);
		}
		if (doc._key !== key) {
			throw new Error(`snapshot widget entry has mismatched _key: ${key}`);
		}
	}
}

function defaultCaptureOutputPath() {
	const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
	return path.join(rootDir, 'backups', 'nodebb-ui-state', 'local', timestamp, 'local-nodebb-ui-state.json');
}

function defaultApplyBackupPath() {
	const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
	return path.join(rootDir, 'backups', 'nodebb-ui-state', 'local-before-apply', timestamp, 'local-nodebb-ui-state.json');
}

function printSummary(snapshot, label) {
	validateSnapshot(snapshot);
	const widgetKeys = Object.keys(snapshot.widgets).sort();
	const settingKeys = Object.keys(snapshot.settings).sort();

	console.log(`${label}:`);
	console.log(`- capturedAt: ${snapshot.capturedAt || 'unknown'}`);
	console.log(`- source url: ${snapshot.source?.url || 'unknown'}`);
	console.log(`- bootswatchSkin: ${snapshot.config.bootswatchSkin || '(none)'}`);
	console.log(`- customCSS length: ${String(snapshot.config.customCSS || '').length}`);
	console.log(`- customJS length: ${String(snapshot.config.customJS || '').length}`);
	console.log(`- customHTML length: ${String(snapshot.config.customHTML || '').length}`);
	console.log(`- settings keys: ${settingKeys.length ? settingKeys.join(', ') : '(none)'}`);
	console.log(`- widget documents: ${widgetKeys.length}`);
}

function defaultTransformOutputPath(statePath) {
	const baseName = path.basename(statePath, path.extname(statePath));
	return path.join(rootDir, 'backups', 'nodebb-ui-state', 'managed', `${baseName}-managed.json`);
}

function parseWidgetArea(raw, label) {
	try {
		const parsed = JSON.parse(raw || '[]');
		if (!Array.isArray(parsed)) {
			throw new Error('widget area is not an array');
		}
		return parsed;
	} catch (err) {
		throw new Error(`unable to parse widget area ${label}: ${err.message}`);
	}
}

function stringifyWidgetArea(value) {
	return JSON.stringify(value);
}

function createVariedmcHomeWidget(existing = {}) {
	const sourceData = existing.data && typeof existing.data === 'object' ? existing.data : {};
	const data = {
		...variedmcHomeWidgetDefaults.data,
		...Object.fromEntries(
			Object.keys(variedmcHomeWidgetDefaults.data)
				.filter(key => Object.prototype.hasOwnProperty.call(sourceData, key))
				.map(key => [key, sourceData[key]])
		),
	};

	return {
		widget: variedmcHomeWidgetDefaults.widget,
		data,
	};
}

function isLegacyHomeHtmlWidget(widget) {
	const html = String(widget?.data?.html || '');
	return widget?.widget === 'html' && (
		html.includes('id="home_area"') ||
		html.includes('id=\\"home_area\\"') ||
		html.includes('window.onHomeLoad') ||
		html.includes('热门标签')
	);
}

function isLegacyGlobalScriptWidget(widget) {
	const html = String(widget?.data?.html || '');
	return widget?.widget === 'html' && html.includes('window.onPageLoad');
}

function transformManagedSnapshot(snapshot) {
	validateSnapshot(snapshot);
	const nextSnapshot = JSON.parse(JSON.stringify(snapshot));

	nextSnapshot.config.useCustomCSS = 0;
	nextSnapshot.config.useCustomJS = 0;
	nextSnapshot.config.useCustomHTML = 0;
	nextSnapshot.config.customCSS = '';
	nextSnapshot.config.renderedCustomCSS = '';
	nextSnapshot.config.customJS = '';
	nextSnapshot.config.customHTML = '';

	const categoriesDoc = nextSnapshot.widgets['widgets:categories.tpl'];
	if (categoriesDoc && typeof categoriesDoc.header === 'string') {
		const headerWidgets = parseWidgetArea(categoriesDoc.header, 'widgets:categories.tpl.header');
		let inserted = false;
		const transformedHeader = [];

		for (const widget of headerWidgets) {
			if (widget?.widget === variedmcHomeWidgetDefaults.widget) {
				if (!inserted) {
					transformedHeader.push(createVariedmcHomeWidget(widget));
					inserted = true;
				}
				continue;
			}

			if (isLegacyHomeHtmlWidget(widget)) {
				if (!inserted) {
					transformedHeader.push(createVariedmcHomeWidget(widget));
					inserted = true;
				}
				continue;
			}

			transformedHeader.push(widget);
		}

		if (!inserted) {
			const recentTopicsIndex = transformedHeader.findIndex(widget => widget?.widget === 'recenttopics');
			const insertAt = recentTopicsIndex >= 0 ? recentTopicsIndex + 1 : 0;
			transformedHeader.splice(insertAt, 0, createVariedmcHomeWidget());
		}

		categoriesDoc.header = stringifyWidgetArea(transformedHeader);
	}

	const globalDoc = nextSnapshot.widgets['widgets:global'];
	if (globalDoc && typeof globalDoc.header === 'string') {
		const globalHeader = parseWidgetArea(globalDoc.header, 'widgets:global.header')
			.filter(widget => !isLegacyGlobalScriptWidget(widget));
		globalDoc.header = stringifyWidgetArea(globalHeader);
	}

	return nextSnapshot;
}

async function captureCommand(configPath, outputPath) {
	const { client, config, db } = await connectFromConfig(configPath);
	try {
		const snapshot = await captureUiState(db, config);
		await writeJson(outputPath, snapshot);
		printSummary(snapshot, `Captured UI state to ${path.relative(rootDir, outputPath)}`);
	} finally {
		await client.close();
	}
}

async function transformManagedCommand(statePath, outputPath) {
	const snapshot = await readJson(statePath);
	const transformed = transformManagedSnapshot(snapshot);
	await writeJson(outputPath, transformed);
	printSummary(transformed, `Transformed managed UI state to ${path.relative(rootDir, outputPath)}`);
}

async function applyCommand(statePath, configPath, { noBackup }) {
	const snapshot = await readJson(statePath);
	validateSnapshot(snapshot);

	const { client, config, db } = await connectFromConfig(configPath);
	try {
		if (!noBackup) {
			const backupSnapshot = await captureUiState(db, config);
			const backupPath = defaultApplyBackupPath();
			await writeJson(backupPath, backupSnapshot);
			console.log(`Backed up current local UI state to ${path.relative(rootDir, backupPath)}.`);
		}

		const objects = db.collection('objects');
		const configUpdate = Object.fromEntries(managedConfigFields.map(field => [field, snapshot.config[field]]));
		await objects.updateOne(
			{ _key: 'config' },
			{ $set: configUpdate, $setOnInsert: { _key: 'config' } },
			{ upsert: true }
		);

		for (const key of managedSettingKeys) {
			if (snapshot.settings[key]) {
				await objects.replaceOne({ _key: key }, snapshot.settings[key], { upsert: true });
			} else {
				await objects.deleteOne({ _key: key });
			}
		}

		const snapshotWidgetKeys = Object.keys(snapshot.widgets);
		for (const key of snapshotWidgetKeys) {
			await objects.replaceOne({ _key: key }, snapshot.widgets[key], { upsert: true });
		}

		const existingWidgetKeys = (await objects.find({ _key: /^widgets:/ }, { projection: { _id: 0, _key: 1 } }).toArray())
			.map(doc => doc._key);
		const extraWidgetKeys = existingWidgetKeys.filter(key => !snapshotWidgetKeys.includes(key));
		if (extraWidgetKeys.length) {
			await objects.deleteMany({ _key: { $in: extraWidgetKeys } });
		}

		console.log(`Applied UI state from ${path.relative(rootDir, statePath)}.`);
		console.log(`- config fields updated: ${managedConfigFields.length}`);
		console.log(`- settings documents managed: ${managedSettingKeys.length}`);
		console.log(`- widget documents applied: ${snapshotWidgetKeys.length}`);
		console.log(`- extra widget documents removed: ${extraWidgetKeys.length}`);
		console.log('Restart local NodeBB to ensure the new UI state is picked up cleanly.');
	} finally {
		await client.close();
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		printUsage();
		return;
	}

	if (!['summary', 'capture', 'transform-managed', 'apply'].includes(args.command)) {
		printUsage();
		process.exitCode = 1;
		return;
	}

	if (args.command === 'summary') {
		const snapshot = await readJson(args.statePath);
		printSummary(snapshot, path.relative(rootDir, args.statePath));
		return;
	}

	if (args.command === 'capture') {
		await captureCommand(args.configPath, args.outputPath || defaultCaptureOutputPath());
		return;
	}

	if (args.command === 'transform-managed') {
		await transformManagedCommand(args.statePath, args.outputPath || defaultTransformOutputPath(args.statePath));
		return;
	}

	await applyCommand(args.statePath, args.configPath, args);
}

main().catch((err) => {
	console.error(err.stack || String(err));
	process.exit(1);
});
