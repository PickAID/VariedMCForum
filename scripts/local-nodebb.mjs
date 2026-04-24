#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const defaultConfigPath = path.join(rootDir, 'config.local.json');

function printUsage() {
	console.log(`Usage: node scripts/local-nodebb.mjs <command> [options] [-- extra args]

Commands:
  prepare  Ensure local Mongo is running and sync shared production plugin state
  build    Prepare the local environment and run NodeBB build
  dev      Prepare the local environment, build assets, then run NodeBB dev
  start    Prepare the local environment, build assets, then run NodeBB start
  stop     Run NodeBB stop against config.local.json
  upgrade  Prepare the local environment and run NodeBB upgrade

Options:
  --config <path>    Local NodeBB config file to use (default: config.local.json)
  --skip-prepare     Skip Mongo/plugin/settings preparation before the NodeBB command
`);
}

function parseArgs(argv) {
	const result = {
		command: 'prepare',
		configPath: defaultConfigPath,
		skipPrepare: false,
		extraArgs: [],
	};
	const positional = [];

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--') {
			result.extraArgs = argv.slice(i + 1);
			break;
		}
		if (arg === '--config') {
			result.configPath = path.resolve(rootDir, argv[i + 1]);
			i += 1;
			continue;
		}
		if (arg === '--skip-prepare') {
			result.skipPrepare = true;
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

async function ensureConfigExists(configPath) {
	try {
		await fs.access(configPath);
	} catch (err) {
		throw new Error(`config file not found: ${path.relative(rootDir, configPath)}`);
	}
}

async function runNode(command, args) {
	return await new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [command, ...args], {
			cwd: rootDir,
			stdio: 'inherit',
			shell: false,
		});

		child.on('error', reject);
		child.on('close', (code, signal) => {
			if (signal) {
				process.kill(process.pid, signal);
				return;
			}
			resolve(code || 0);
		});
	});
}

async function runChecked(command, args) {
	const code = await runNode(command, args);
	if (code !== 0) {
		throw new Error(`${path.relative(rootDir, command)} ${args.join(' ')} exited with code ${code}`);
	}
}

async function prepareEnvironment(configPath) {
	await runChecked(path.join(rootDir, 'scripts', 'local-mongo.mjs'), ['ensure-running', '--config', configPath]);
	await runChecked(path.join(rootDir, 'scripts', 'sync-nodebb-extension-state.mjs'), ['sync', '--config', configPath]);
}

async function runNodebb(configPath, nodebbCommand, extraArgs) {
	const code = await runNode(path.join(rootDir, 'nodebb'), ['--config', configPath, nodebbCommand, ...extraArgs]);
	process.exitCode = code;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		printUsage();
		return;
	}

	if (!['prepare', 'build', 'dev', 'start', 'stop', 'upgrade'].includes(args.command)) {
		printUsage();
		process.exitCode = 1;
		return;
	}

	await ensureConfigExists(args.configPath);

	const shouldPrepare = !args.skipPrepare && ['prepare', 'build', 'dev', 'start', 'upgrade'].includes(args.command);
	if (shouldPrepare) {
		await prepareEnvironment(args.configPath);
	}

	if (args.command === 'prepare') {
		return;
	}

	if (['dev', 'start'].includes(args.command)) {
		await runChecked(path.join(rootDir, 'nodebb'), ['--config', args.configPath, 'build']);
	}

	await runNodebb(args.configPath, args.command, args.extraArgs);
}

main().catch((err) => {
	console.error(err.stack || String(err));
	process.exit(1);
});
