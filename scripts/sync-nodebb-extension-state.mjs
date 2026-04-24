#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const nconf = require('nconf');
const prestart = require('../src/prestart');
const { pluginNamePattern } = require('../src/constants');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const defaultStatePath = path.join(rootDir, 'state', 'production-nodebb-extensions.json');
const defaultConfigPath = path.join(rootDir, 'config.local.json');

function printUsage() {
	console.log(`Usage: node scripts/sync-nodebb-extension-state.mjs <command> [options]

Commands:
  plan            Show dependency and activation differences against the shared production snapshot
  install         Update local package.json extension dependencies from the shared production snapshot and run npm install
  apply-state     Rewrite local plugins:active state from the shared production snapshot
  sync            Run install, apply-state, and optional build
  validate-state  Validate the shared production snapshot file

Options:
  --state <path>   Path to the shared production snapshot file
  --config <path>  Local NodeBB config file to use for state sync (default: config.local.json)
  --prune          Remove local extension dependencies that do not exist in the shared production snapshot
  --build          Run ./nodebb build after sync
`);
}

function parseArgs(argv) {
	const result = {
		command: 'plan',
		statePath: defaultStatePath,
		configPath: defaultConfigPath,
		prune: false,
		build: false,
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
		if (arg === '--prune') {
			result.prune = true;
			continue;
		}
		if (arg === '--build') {
			result.build = true;
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

function isExtensionName(name) {
	return pluginNamePattern.test(name);
}

function classifyExtension(name) {
	const match = name.match(/nodebb-(plugin|theme|widget|rewards)-/);
	return match ? match[1] : 'unknown';
}

function normalizeExtensionOrder(items) {
	return [...items].sort((a, b) => a.localeCompare(b));
}

async function readJson(filePath) {
	return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
	await fs.writeFile(filePath, `${JSON.stringify(value, null, 4)}\n`, 'utf8');
}

async function loadState(statePath) {
	const state = await readJson(statePath);
	validateState(state);
	return state;
}

function validateState(state) {
	if (!state || typeof state !== 'object') {
		throw new Error('state file must contain a JSON object');
	}
	if (state.schemaVersion !== 1) {
		throw new Error(`unsupported schemaVersion: ${state.schemaVersion}`);
	}
	if (!Array.isArray(state.activeExtensions)) {
		throw new Error('state file missing activeExtensions array');
	}
	if (!Array.isArray(state.extensions)) {
		throw new Error('state file missing extensions array');
	}
	if (!Array.isArray(state.localSourceDirs)) {
		throw new Error('state file missing localSourceDirs array');
	}
	if (!Array.isArray(state.warnings)) {
		throw new Error('state file missing warnings array');
	}

	state.activeExtensions.forEach((name) => {
		if (typeof name !== 'string' || !isExtensionName(name)) {
			throw new Error(`invalid active extension name: ${name}`);
		}
	});

	const seen = new Set();
	state.extensions.forEach((item) => {
		if (!item || typeof item !== 'object') {
			throw new Error('state extensions array contains a non-object item');
		}
		if (typeof item.name !== 'string' || !isExtensionName(item.name)) {
			throw new Error(`invalid extension entry name: ${item.name}`);
		}
		if (seen.has(item.name)) {
			throw new Error(`duplicate extension entry: ${item.name}`);
		}
		seen.add(item.name);
	});

	state.activeExtensions.forEach((name) => {
		if (!seen.has(name)) {
			throw new Error(`active extension missing from extensions array: ${name}`);
		}
	});
}

function ensureSnapshotReady(state) {
	if (!state.capturedAt || typeof state.capturedAt !== 'string') {
		throw new Error('shared production snapshot has not been captured yet');
	}
	if (!state.runtime || typeof state.runtime !== 'object') {
		throw new Error('shared production snapshot is missing runtime metadata');
	}
}

function summarizeWarnings(state) {
	if (!state.warnings.length) {
		return;
	}

	console.log('Snapshot warnings:');
	state.warnings.forEach((warning) => {
		const issues = Array.isArray(warning.issues) && warning.issues.length ? ` (${warning.issues.join(', ')})` : '';
		const activeNote = state.activeExtensions.includes(warning.name) ? '' : ' [inactive; skipped during dependency sync]';
		console.log(`- ${warning.name}: ${warning.type}${issues}${activeNote}`);
	});
	console.log('');
}

function getSkippedDeclaredExtensions(state) {
	const active = new Set(state.activeExtensions);

	return new Set(
		state.warnings
			.filter((warning) => (
				warning &&
				warning.type === 'file-dependency-integrity' &&
				typeof warning.name === 'string' &&
				!active.has(warning.name)
			))
			.map(warning => warning.name)
	);
}

function getInstallDefaultExtensionDependencies(defaultPkg) {
	return getCurrentExtensionDependencies(defaultPkg);
}

function getDesiredDeclaredExtensions(state, defaultPkg) {
	const skipped = getSkippedDeclaredExtensions(state);
	const defaultDependencies = getInstallDefaultExtensionDependencies(defaultPkg);

	return normalizeExtensionOrder(
		state.extensions
			.filter(item => (
				item.declared &&
				typeof item.declaredSpec === 'string' &&
				item.declaredSpec &&
				!skipped.has(item.name)
			))
			.map(item => item.name)
	).map((name) => {
		const item = state.extensions.find(extension => extension.name === name);
		const installDefaultSpec = defaultDependencies[item.name] || null;
		return {
			name,
			kind: item.kind || classifyExtension(name),
			declaredSpec: installDefaultSpec || item.declaredSpec,
			snapshotDeclaredSpec: item.declaredSpec,
			installDefaultSpec,
			localSourceDir: item.localSourceDir || null,
		};
	});
}

function getDesiredActiveExtensions(state) {
	return state.activeExtensions.filter(isExtensionName);
}

function getCurrentExtensionDependencies(pkg) {
	return Object.fromEntries(
		Object.entries(pkg.dependencies || {}).filter(([name]) => isExtensionName(name))
	);
}

function sortObjectKeys(input) {
	return Object.fromEntries(
		Object.entries(input).sort(([left], [right]) => left.localeCompare(right))
	);
}

function createDependencyPlan(state, pkg, defaultPkg, { prune }) {
	const desiredDeclared = getDesiredDeclaredExtensions(state, defaultPkg);
	const currentDependencies = getCurrentExtensionDependencies(pkg);
	const desiredMap = new Map(desiredDeclared.map(item => [item.name, item]));

	const toAddOrUpdate = desiredDeclared
		.filter(item => currentDependencies[item.name] !== item.declaredSpec)
		.map(item => ({
			name: item.name,
			kind: item.kind,
			currentSpec: currentDependencies[item.name] || null,
			desiredSpec: item.declaredSpec,
			snapshotSpec: item.snapshotDeclaredSpec,
			installDefaultSpec: item.installDefaultSpec,
			localSourceDir: item.localSourceDir,
		}));

	const extraDependencies = Object.keys(currentDependencies)
		.filter(name => !desiredMap.has(name))
		.sort((a, b) => a.localeCompare(b))
		.map(name => ({
			name,
			currentSpec: currentDependencies[name],
			kind: classifyExtension(name),
		}));

	return {
		toAddOrUpdate,
		extraDependencies,
		prune,
	};
}

async function ensureLocalFileDependencies(plan) {
	const missing = [];

	for (const item of plan.toAddOrUpdate) {
		if (!String(item.desiredSpec).startsWith('file:')) {
			continue;
		}

		const target = path.resolve(rootDir, item.desiredSpec.slice(5));
		try {
			const stats = await fs.stat(target);
			if (!stats.isDirectory()) {
				missing.push(`${item.name}: target is not a directory (${item.desiredSpec})`);
				continue;
			}
		} catch (err) {
			missing.push(`${item.name}: missing ${item.desiredSpec}`);
			continue;
		}

		try {
			await fs.access(path.join(target, 'package.json'));
		} catch (err) {
			missing.push(`${item.name}: missing package.json in ${item.desiredSpec}`);
		}

		try {
			await fs.access(path.join(target, 'plugin.json'));
		} catch (err) {
			missing.push(`${item.name}: missing plugin.json in ${item.desiredSpec}`);
		}
	}

	if (missing.length) {
		throw new Error(`local file dependencies are incomplete:\n- ${missing.join('\n- ')}`);
	}
}

function printDependencyPlan(plan) {
	if (!plan.toAddOrUpdate.length && !plan.extraDependencies.length) {
		console.log('Dependency plan: local extension dependencies already match the shared production snapshot.');
		return;
	}

	console.log('Dependency plan:');
	plan.toAddOrUpdate.forEach((item) => {
		const desiredDetail = item.installDefaultSpec && item.installDefaultSpec !== item.snapshotSpec ?
			`${item.desiredSpec} (keeping install default instead of snapshot ${item.snapshotSpec})` :
			item.desiredSpec;
		console.log(`- set ${item.name} -> ${desiredDetail}${item.currentSpec ? ` (was ${item.currentSpec})` : ''}`);
	});
	plan.extraDependencies.forEach((item) => {
		const action = plan.prune ? 'remove' : 'keep-extra';
		console.log(`- ${action} ${item.name} (${item.currentSpec})`);
	});
}

async function applyDependencyPlan(state, statePath, { prune }) {
	const packageJsonPath = path.join(rootDir, 'package.json');
	const pkg = await readJson(packageJsonPath);
	const defaultPkg = await readJson(path.join(rootDir, 'install', 'package.json'));
	const plan = createDependencyPlan(state, pkg, defaultPkg, { prune });
	printDependencyPlan(plan);

	if (!plan.toAddOrUpdate.length && !(prune && plan.extraDependencies.length)) {
		return false;
	}

	await ensureLocalFileDependencies(plan);

	const dependencies = { ...(pkg.dependencies || {}) };
	plan.toAddOrUpdate.forEach((item) => {
		dependencies[item.name] = item.desiredSpec;
	});

	if (prune) {
		plan.extraDependencies.forEach((item) => {
			delete dependencies[item.name];
		});
	}

	pkg.dependencies = sortObjectKeys(dependencies);
	await writeJson(packageJsonPath, pkg);

	console.log(`Updated ${path.relative(rootDir, packageJsonPath)} from ${path.relative(rootDir, statePath)}.`);
	await runCommand(resolveNpmCommand(), ['install'], { cwd: rootDir });
	return true;
}

async function runCommand(command, args, options = {}) {
	await new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: options.cwd || rootDir,
			stdio: 'inherit',
			shell: false,
		});

		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
		});
	});
}

function resolveNpmCommand() {
	return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

async function packageExistsInNodeModules(packageName) {
	const packageJsonPath = packageName.startsWith('@') ?
		path.join(rootDir, 'node_modules', packageName.split('/')[0], packageName.split('/')[1], 'package.json') :
		path.join(rootDir, 'node_modules', packageName, 'package.json');

	try {
		await fs.access(packageJsonPath);
		return true;
	} catch (err) {
		return false;
	}
}

function ensureNconfStores() {
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
	ensureNconfStores();
	prestart.loadConfig(configPath);
	const db = require('../src/database');

	await db.init();
	try {
		return await callback(db);
	} finally {
		if (typeof db.close === 'function') {
			await db.close();
		}
	}
}

async function getLocalActiveExtensions(configPath) {
	return await withNodebbDatabase(configPath, async db => await db.getSortedSetRange('plugins:active', 0, -1));
}

function printStatePlan(desiredActive, currentActive) {
	const desiredSet = new Set(desiredActive);
	const currentSet = new Set(currentActive);
	const toEnable = desiredActive.filter(name => !currentSet.has(name));
	const toDisable = currentActive.filter(name => !desiredSet.has(name));
	const orderMismatch = desiredActive.length === currentActive.length &&
		desiredActive.some((name, index) => currentActive[index] !== name);

	if (!toEnable.length && !toDisable.length && !orderMismatch) {
		console.log('State plan: local active extension state already matches the shared production snapshot.');
		return;
	}

	console.log('State plan:');
	toEnable.forEach((name) => {
		console.log(`- enable ${name}`);
	});
	toDisable.forEach((name) => {
		console.log(`- disable ${name}`);
	});
	if (orderMismatch) {
		console.log('- reorder active extensions to match shared production snapshot');
	}
}

async function applyActiveState(state, configPath) {
	const desiredActive = getDesiredActiveExtensions(state);
	const currentActive = await getLocalActiveExtensions(configPath);
	printStatePlan(desiredActive, currentActive);

	const localDependencyState = await readJson(path.join(rootDir, 'package.json'));
	const currentDependencies = getCurrentExtensionDependencies(localDependencyState);
	const missingExtensions = [];
	for (const name of desiredActive) {
		if (currentDependencies[name]) {
			continue;
		}
		if (await packageExistsInNodeModules(name)) {
			continue;
		}
		missingExtensions.push(name);
	}
	if (missingExtensions.length) {
		throw new Error(`cannot apply active state because these active extensions are not available locally: ${missingExtensions.join(', ')}`);
	}

	await withNodebbDatabase(configPath, async (db) => {
		await db.delete('plugins:active');
		if (desiredActive.length) {
			await db.sortedSetAdd('plugins:active', desiredActive.map((_, index) => index), desiredActive);
		}
	});
}

async function runPlan(state, configPath, { prune }) {
	summarizeWarnings(state);
	const packageJson = await readJson(path.join(rootDir, 'package.json'));
	const defaultPkg = await readJson(path.join(rootDir, 'install', 'package.json'));
	const dependencyPlan = createDependencyPlan(state, packageJson, defaultPkg, { prune });
	printDependencyPlan(dependencyPlan);

	try {
		const currentActive = await getLocalActiveExtensions(configPath);
		printStatePlan(getDesiredActiveExtensions(state), currentActive);
	} catch (err) {
		console.log(`State plan: skipped local DB comparison (${err.message})`);
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		printUsage();
		return;
	}

	if (!['plan', 'install', 'apply-state', 'sync', 'validate-state'].includes(args.command)) {
		printUsage();
		process.exitCode = 1;
		return;
	}

	const state = await loadState(args.statePath);

	if (args.command === 'validate-state') {
		console.log(`Validated ${path.relative(rootDir, args.statePath)}.`);
		return;
	}

	ensureSnapshotReady(state);

	if (args.command === 'plan') {
		await runPlan(state, args.configPath, args);
		return;
	}

	if (args.command === 'install') {
		await applyDependencyPlan(state, args.statePath, args);
		return;
	}

	if (args.command === 'apply-state') {
		await applyActiveState(state, args.configPath);
		return;
	}

	if (args.command === 'sync') {
		summarizeWarnings(state);
		await applyDependencyPlan(state, args.statePath, args);
		await applyActiveState(state, args.configPath);
		if (args.build) {
			await runCommand(process.platform === 'win32' ? 'nodebb.bat' : './nodebb', ['build'], { cwd: rootDir });
		}
	}
}

main().catch((err) => {
	console.error(err.stack || String(err));
	process.exit(1);
});
