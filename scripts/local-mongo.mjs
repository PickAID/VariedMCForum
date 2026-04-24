#!/usr/bin/env node

import fs from 'fs/promises';
import net from 'net';
import path from 'path';
import process from 'process';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const defaultConfigPath = path.join(rootDir, 'config.local.json');
const defaultComposeFile = path.join(rootDir, 'docker-compose.local-mongo.yml');

function printUsage() {
	console.log(`Usage: node scripts/local-mongo.mjs <command> [options]

Commands:
  status          Print whether the local MongoDB endpoint is reachable
  start           Start the local MongoDB service
  stop            Stop the local MongoDB service
  ensure-running  Start the local MongoDB service only when it is not already reachable

Options:
  --config <path>   Local NodeBB config file to inspect (default: config.local.json)
  --mode <mode>     Explicit runtime: docker or brew
`);
}

function parseArgs(argv) {
	const result = {
		command: 'status',
		configPath: defaultConfigPath,
		mode: process.env.LOCAL_MONGO_MODE || '',
	};
	const positional = [];

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--config') {
			result.configPath = path.resolve(rootDir, argv[i + 1]);
			i += 1;
			continue;
		}
		if (arg === '--mode') {
			result.mode = argv[i + 1] || '';
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

async function readJson(filePath) {
	return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function getMongoEndpoint(config) {
	const mongo = config.mongo || {};
	if (typeof mongo.uri === 'string' && mongo.uri) {
		const url = new URL(mongo.uri);
		return {
			host: url.hostname || '127.0.0.1',
			port: url.port ? Number(url.port) : 27017,
		};
	}

	return {
		host: mongo.host || '127.0.0.1',
		port: Number(mongo.port || 27017),
	};
}

async function isReachable(host, port) {
	return await new Promise((resolve) => {
		const socket = net.createConnection({ host, port });
		const finish = (value) => {
			socket.removeAllListeners();
			socket.destroy();
			resolve(value);
		};

		socket.setTimeout(1500);
		socket.on('connect', () => finish(true));
		socket.on('timeout', () => finish(false));
		socket.on('error', () => finish(false));
	});
}

async function canRun(command, args) {
	return await new Promise((resolve) => {
		const child = spawn(command, args, {
			cwd: rootDir,
			stdio: 'ignore',
			shell: false,
		});

		child.on('error', () => resolve(false));
		child.on('close', code => resolve(code === 0));
	});
}

async function resolveComposeCommand() {
	if (await canRun('docker', ['compose', 'version'])) {
		return { command: 'docker', argsPrefix: ['compose'] };
	}
	if (await canRun(process.platform === 'win32' ? 'docker-compose.exe' : 'docker-compose', ['version'])) {
		return {
			command: process.platform === 'win32' ? 'docker-compose.exe' : 'docker-compose',
			argsPrefix: [],
		};
	}

	throw new Error('docker compose is not available. Install Docker Desktop or set --mode brew on macOS.');
}

async function canUseDockerRuntime() {
	if (!await canRun('docker', ['info'])) {
		return false;
	}

	return await canRun('docker', ['compose', 'version']) ||
		await canRun(process.platform === 'win32' ? 'docker-compose.exe' : 'docker-compose', ['version']);
}

async function canUseBrewMongo() {
	if (process.platform !== 'darwin') {
		return false;
	}
	if (!await canRun('brew', ['--version'])) {
		return false;
	}

	return await canRun('brew', ['list', '--formula', 'mongodb-community@8.0']);
}

async function resolveMode(explicitMode) {
	const normalized = String(explicitMode || '').trim().toLowerCase();
	if (normalized) {
		if (!['docker', 'brew'].includes(normalized)) {
			throw new Error(`unsupported mongo mode: ${explicitMode}`);
		}
		return normalized;
	}

	if (await canUseBrewMongo()) {
		return 'brew';
	}
	if (await canUseDockerRuntime()) {
		return 'docker';
	}
	if (process.platform === 'darwin' && await canRun('brew', ['--version'])) {
		return 'brew';
	}

	throw new Error('could not auto-detect a local MongoDB runtime. Install Docker Desktop or Homebrew MongoDB.');
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

async function startMongo(mode) {
	if (mode === 'docker') {
		const compose = await resolveComposeCommand();
		await runCommand(compose.command, [
			...compose.argsPrefix,
			'-f',
			defaultComposeFile,
			'up',
			'-d',
		]);
		return;
	}

	if (mode === 'brew') {
		if (process.platform !== 'darwin') {
			throw new Error('brew mode is only supported on macOS');
		}
		await runCommand('brew', ['services', 'start', 'mongodb-community@8.0']);
		return;
	}

	throw new Error(`unsupported mongo mode: ${mode}`);
}

async function stopMongo(mode) {
	if (mode === 'docker') {
		const compose = await resolveComposeCommand();
		await runCommand(compose.command, [
			...compose.argsPrefix,
			'-f',
			defaultComposeFile,
			'down',
		]);
		return;
	}

	if (mode === 'brew') {
		if (process.platform !== 'darwin') {
			throw new Error('brew mode is only supported on macOS');
		}
		await runCommand('brew', ['services', 'stop', 'mongodb-community@8.0']);
		return;
	}

	throw new Error(`unsupported mongo mode: ${mode}`);
}

async function waitForReachable(host, port) {
	for (let attempt = 0; attempt < 20; attempt += 1) {
		if (await isReachable(host, port)) {
			return true;
		}
		await new Promise(resolve => setTimeout(resolve, 500));
	}
	return false;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		printUsage();
		return;
	}

	if (!['status', 'start', 'stop', 'ensure-running'].includes(args.command)) {
		printUsage();
		process.exitCode = 1;
		return;
	}

	const config = await readJson(args.configPath);
	const endpoint = getMongoEndpoint(config);
	const reachable = await isReachable(endpoint.host, endpoint.port);

	if (args.command === 'status') {
		console.log(reachable ?
			`local mongo reachable at ${endpoint.host}:${endpoint.port}` :
			`local mongo not reachable at ${endpoint.host}:${endpoint.port}`);
		process.exitCode = reachable ? 0 : 1;
		return;
	}

	const mode = await resolveMode(args.mode);

	if (args.command === 'ensure-running') {
		if (reachable) {
			console.log(`local mongo already reachable at ${endpoint.host}:${endpoint.port}`);
			return;
		}

		console.log(`starting local mongo with ${mode}...`);
		await startMongo(mode);
		if (!await waitForReachable(endpoint.host, endpoint.port)) {
			throw new Error(`local mongo did not become reachable at ${endpoint.host}:${endpoint.port}`);
		}
		console.log(`local mongo reachable at ${endpoint.host}:${endpoint.port}`);
		return;
	}

	if (args.command === 'start') {
		if (reachable) {
			console.log(`local mongo already reachable at ${endpoint.host}:${endpoint.port}`);
			return;
		}

		await startMongo(mode);
		if (!await waitForReachable(endpoint.host, endpoint.port)) {
			throw new Error(`local mongo did not become reachable at ${endpoint.host}:${endpoint.port}`);
		}
		console.log(`local mongo reachable at ${endpoint.host}:${endpoint.port}`);
		return;
	}

	await stopMongo(mode);
	console.log(`requested local mongo stop via ${mode}`);
}

main().catch((err) => {
	console.error(err.stack || String(err));
	process.exit(1);
});
