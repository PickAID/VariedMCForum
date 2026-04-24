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
const defaultStatePath = path.join(rootDir, 'state', 'local-testing-state.json');
const defaultConfigPath = path.join(rootDir, 'config.local.json');

function printUsage() {
	console.log(`Usage: node scripts/local-testing-state.mjs <command> [options]

Commands:
  plan    Print the local-only private plugin/testing overlay plan
  sync    Install local-only plugins, merge active state, and apply settings/objects

Options:
  --state <path>   Local-only testing overlay file (default: state/local-testing-state.json)
  --config <path>  Local NodeBB config file to use (default: config.local.json)
`);
}

function parseArgs(argv) {
	const result = {
		command: 'plan',
		statePath: defaultStatePath,
		configPath: defaultConfigPath,
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

async function readJson(filePath) {
	return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function fileExists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch (err) {
		return false;
	}
}

function cloneJson(value) {
	return JSON.parse(JSON.stringify(value));
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

function validateState(state) {
	if (!state || typeof state !== 'object') {
		throw new Error('local testing overlay must contain a JSON object');
	}
	if (state.schemaVersion !== 1) {
		throw new Error(`unsupported local testing overlay schemaVersion: ${state.schemaVersion}`);
	}
	if (!Array.isArray(state.extensions)) {
		throw new Error('local testing overlay missing extensions array');
	}
	if (!Array.isArray(state.activeExtensions)) {
		throw new Error('local testing overlay missing activeExtensions array');
	}
	if (!state.settings || typeof state.settings !== 'object' || Array.isArray(state.settings)) {
		throw new Error('local testing overlay missing settings object');
	}
	if (!state.objects || typeof state.objects !== 'object' || Array.isArray(state.objects)) {
		throw new Error('local testing overlay missing objects object');
	}

	const seen = new Set();
	state.extensions.forEach((item) => {
		if (!item || typeof item !== 'object') {
			throw new Error('extensions array contains a non-object item');
		}
		if (typeof item.name !== 'string' || !isExtensionName(item.name)) {
			throw new Error(`invalid local testing extension name: ${item.name}`);
		}
		if (seen.has(item.name)) {
			throw new Error(`duplicate local testing extension entry: ${item.name}`);
		}
		seen.add(item.name);
		if (typeof item.path !== 'string' || !item.path.trim()) {
			throw new Error(`local testing extension ${item.name} is missing path`);
		}
	});

	state.activeExtensions.forEach((name) => {
		if (typeof name !== 'string' || !isExtensionName(name)) {
			throw new Error(`invalid active local testing extension: ${name}`);
		}
	});
}

async function loadState(statePath) {
	if (!await fileExists(statePath)) {
		return null;
	}

	const state = await readJson(statePath);
	validateState(state);
	return state;
}

function resolveOverlayPath(overlayPath) {
	return path.isAbsolute(overlayPath) ? overlayPath : path.resolve(rootDir, overlayPath);
}

function getPackageDir(packageName) {
	if (packageName.startsWith('@')) {
		const [scope, scopedName] = packageName.split('/');
		return path.join(rootDir, 'node_modules', scope, scopedName);
	}
	return path.join(rootDir, 'node_modules', packageName);
}

async function validateExtensionSource(item) {
	const resolvedPath = resolveOverlayPath(item.path);
	const packageJsonPath = path.join(resolvedPath, 'package.json');
	const pluginJsonPath = path.join(resolvedPath, 'plugin.json');

	const stats = await fs.stat(resolvedPath).catch(() => null);
	if (!stats || !stats.isDirectory()) {
		throw new Error(`${item.name}: local source path not found: ${item.path}`);
	}
	if (!await fileExists(packageJsonPath)) {
		throw new Error(`${item.name}: missing package.json in ${item.path}`);
	}
	if (!await fileExists(pluginJsonPath)) {
		throw new Error(`${item.name}: missing plugin.json in ${item.path}`);
	}

	const packageJson = await readJson(packageJsonPath);
	if (packageJson.name && packageJson.name !== item.name) {
		throw new Error(`${item.name}: package.json name is ${packageJson.name}, expected ${item.name}`);
	}

	return {
		...item,
		resolvedPath,
	};
}

async function resolveInstallPlan(state) {
	const resolvedExtensions = [];

	for (const item of state.extensions) {
		resolvedExtensions.push(await validateExtensionSource(item));
	}

	const installTargets = [];
	for (const item of resolvedExtensions) {
		const nodeModulesPath = getPackageDir(item.name);
		const currentRealPath = await fs.realpath(nodeModulesPath).catch(() => null);
		const desiredRealPath = await fs.realpath(item.resolvedPath);
		if (currentRealPath !== desiredRealPath) {
			installTargets.push(item);
		}
	}

	return {
		resolvedExtensions,
		installTargets,
	};
}

async function runCommand(command, args) {
	await new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: rootDir,
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

async function installExtensions(plan) {
	if (!plan.installTargets.length) {
		console.log('Local testing overlay install plan: already linked.');
		return false;
	}

	console.log('Local testing overlay install plan:');
	plan.installTargets.forEach((item) => {
		console.log(`- install ${item.name} from ${path.relative(rootDir, item.resolvedPath)}`);
	});

	await runCommand(resolveNpmCommand(), [
		'install',
		'--no-save',
		...plan.installTargets.map(item => item.resolvedPath),
	]);
	return true;
}

async function applyState(state, configPath) {
	const settings = require('../src/meta/settings');

	await withNodebbDatabase(configPath, async (db) => {
		const currentActive = await db.getSortedSetRange('plugins:active', 0, -1);
		const nextActive = [...currentActive];
		state.activeExtensions.forEach((name) => {
			if (!nextActive.includes(name)) {
				nextActive.push(name);
			}
		});

		if (nextActive.length !== currentActive.length) {
			await db.delete('plugins:active');
			await db.sortedSetAdd('plugins:active', nextActive.map((_, index) => index), nextActive);
			console.log('Applied local testing active extension overlay.');
		} else {
			console.log('Local testing active extension overlay already applied.');
		}

		for (const [hash, values] of Object.entries(state.settings)) {
			await settings.set(hash, cloneJson(values), true);
			console.log(`Applied local settings overlay for ${hash}.`);
		}

		for (const [key, value] of Object.entries(state.objects)) {
			await db.setObject(key, cloneJson(value));
			console.log(`Applied local object overlay for ${key}.`);
		}
	});
}

function printPlan(state, statePath, plan) {
	console.log(`Local testing overlay file: ${path.relative(rootDir, statePath)}`);
	if (!state.extensions.length && !state.activeExtensions.length && !Object.keys(state.settings).length && !Object.keys(state.objects).length) {
		console.log('Local testing overlay is empty.');
		return;
	}

	if (state.extensions.length) {
		console.log('Private local extensions:');
		state.extensions.forEach((item) => {
			const installAction = plan.installTargets.some(target => target.name === item.name) ? 'install' : 'keep';
			console.log(`- ${installAction} ${item.name} from ${item.path}`);
		});
	}
	if (state.activeExtensions.length) {
		console.log('Additional active extensions:');
		state.activeExtensions.forEach((name) => {
			console.log(`- ${name}`);
		});
	}
	const settingKeys = Object.keys(state.settings);
	if (settingKeys.length) {
		console.log('Settings overlays:');
		settingKeys.forEach((key) => {
			console.log(`- settings:${key}`);
		});
	}
	const objectKeys = Object.keys(state.objects);
	if (objectKeys.length) {
		console.log('Object overlays:');
		objectKeys.forEach((key) => {
			console.log(`- ${key}`);
		});
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		printUsage();
		return;
	}

	if (!['plan', 'sync'].includes(args.command)) {
		printUsage();
		process.exitCode = 1;
		return;
	}

	const state = await loadState(args.statePath);
	if (!state) {
		console.log(`Local testing overlay not found at ${path.relative(rootDir, args.statePath)}. Skipping.`);
		return;
	}

	const plan = await resolveInstallPlan(state);

	if (args.command === 'plan') {
		printPlan(state, args.statePath, plan);
		return;
	}

	await installExtensions(plan);
	await applyState(state, args.configPath);
}

main().catch((err) => {
	console.error(err.stack || String(err));
	process.exit(1);
});
