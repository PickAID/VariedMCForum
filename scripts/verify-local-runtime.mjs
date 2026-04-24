#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const localShellScripts = [
	path.join(rootDir, 'scripts', 'local-dev.sh'),
	path.join(rootDir, 'scripts', 'local-mongo.sh'),
	path.join(rootDir, 'scripts', 'local-nodebb.sh'),
];

const docFiles = [
	path.join(rootDir, 'README.md'),
	path.join(rootDir, 'docs', 'LOCAL_TESTING.md'),
];

const disallowedDocPatterns = [
	/local-dev\.sh/g,
	/local-mongo\.sh/g,
	/local-nodebb\.sh/g,
];

async function fileExists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch (err) {
		return false;
	}
}

async function main() {
	const violations = [];
	const packageJson = JSON.parse(await fs.readFile(path.join(rootDir, 'package.json'), 'utf8'));

	for (const scriptPath of localShellScripts) {
		if (await fileExists(scriptPath)) {
			violations.push(`local shell helper still exists: ${path.relative(rootDir, scriptPath)}`);
		}
	}

	for (const [name, value] of Object.entries(packageJson.scripts || {})) {
		if (!name.startsWith('local:')) {
			continue;
		}
		if (String(value).includes('.sh')) {
			violations.push(`local npm script must not invoke shell helpers: ${name} -> ${value}`);
		}
	}

	for (const filePath of docFiles) {
		const content = await fs.readFile(filePath, 'utf8');
		disallowedDocPatterns.forEach((pattern) => {
			if (pattern.test(content)) {
				violations.push(`local documentation still references shell helpers: ${path.relative(rootDir, filePath)}`);
			}
			pattern.lastIndex = 0;
		});
	}

	if (violations.length) {
		console.error('Local runtime safety check failed:');
		violations.forEach((violation) => {
			console.error(`  - ${violation}`);
		});
		process.exit(1);
		return;
	}

	console.log('[verify-local-runtime] ok');
}

main().catch((err) => {
	console.error(err.stack || String(err));
	process.exit(1);
});
