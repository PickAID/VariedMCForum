'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jquery = require('jquery');
const { JSDOM } = require('jsdom');

function createAdminHarness(state, hooks = {}, template = readPluginFile('templates/admin/plugins/variedmc-topic-meta.tpl')) {
	const dom = new JSDOM(`<!doctype html><html><body>${template}</body></html>`);
	const $ = jquery(dom.window);
	const ACP = loadAdminModule(dom.window, $, state, hooks);
	ACP.init();
	return { dom, $, ACP };
}

function loadAdminModule(window, $, state, hooks = {}) {
	const moduleFiles = [
		'public/js/admin/utils.js',
		'public/js/admin/list-editor.js',
		'public/js/admin/category-fields.js',
		'public/js/admin/category-rules.js',
		'public/js/admin.js',
	];
	const registry = {};
	const context = {
		console,
		window,
		document: window.document,
		$,
		socket: {
			emit(eventName, payload, callback) {
				if (eventName === 'plugins.variedmcTopicMeta.load') {
					callback(null, state);
					return;
				}
				if (eventName === 'plugins.variedmcTopicMeta.save') {
					if (hooks.onSave) {
						hooks.onSave(payload);
					}
					callback(null, { settings: payload, categories: state.categories });
				}
			},
		},
		define(moduleName, deps, moduleFactory) {
			registry[moduleName] = { deps, factory: moduleFactory, instance: null };
		},
	};

	vm.createContext(context);
	moduleFiles.forEach((relativePath) => {
		const filename = path.join(__dirname, '../..', relativePath);
		vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
	});

	return resolveAdminModule(registry, 'admin/plugins/variedmc-topic-meta', {
		error(err) {
			throw new Error(String((err && err.message) || err));
		},
		alert() {},
	});
}

function resolveAdminModule(registry, moduleName, alerts) {
	if (moduleName === 'alerts') {
		return alerts;
	}
	const entry = registry[moduleName];
	assert(entry, `missing admin dependency ${moduleName}`);
	if (!entry.instance) {
		entry.instance = entry.factory.apply(null, entry.deps.map(dep => resolveAdminModule(registry, dep, alerts)));
	}
	return entry.instance;
}

function baseState(overrides = {}) {
	return {
		settings: {
			defaultTitleTemplate: '{blocks} {title}',
			versionsCatalog: ['1.20.1'],
			loadersCatalog: ['NeoForge'],
			builtInFields: {
				version: { enabled: true },
				loader: { enabled: true },
			},
			lists: [],
			modules: [],
			categoryRules: {},
			categoryAliases: {},
			...(overrides.settings || {}),
		},
		categories: overrides.categories || [],
	};
}

function fillLastCategoryMetaList(card, values) {
	const list = card.find('[data-category-meta-lists] [data-meta-list]').last();
	fillList(list, values);
}

function fillLastGlobalMetaList($, values) {
	fillList($('#variedmc-topic-meta-lists [data-meta-list]').last(), values);
}

function fillList(list, values) {
	list.find('[data-list-field="id"]').val(values.id || values.selectionKey || values.moduleKey);
	list.find('[data-list-field="displayName"]').val(values.label || values.moduleLabel);
	list.find('[data-list-field="moduleLabel"]').val(values.moduleLabel || values.label);
	list.find('[data-list-field="moduleKey"]').val(values.moduleKey);
	list.find('[data-list-field="selectionKey"]').val(values.selectionKey);
	list.find('[data-list-field="label"]').val(values.label);
	list.find('[data-list-field="options"]').val(values.options);
}

function triggerSave($) {
	$('.variedmc-topic-meta-page [id="save"], .variedmc-topic-meta-page [data-action="save-topic-meta"]').last().trigger('click');
}

function readPluginFile(relativePath) {
	return fs.readFileSync(path.join(__dirname, '../..', relativePath), 'utf8');
}

function templateWithHeaderSave() {
	return readPluginFile('templates/admin/plugins/variedmc-topic-meta.tpl')
		.replace('<!-- IMPORT admin/partials/settings/header.tpl -->', '<div><button id="save" type="button">Header Save</button></div>');
}

module.exports = {
	baseState,
	createAdminHarness,
	fillLastCategoryMetaList,
	fillLastGlobalMetaList,
	readPluginFile,
	templateWithHeaderSave,
	triggerSave,
};
