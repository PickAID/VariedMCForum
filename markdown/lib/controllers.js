'use strict';

const path = require('path');

const parent = module.parent.exports;
const posts = require.main.require('./src/posts');
const file = require.main.require('./src/file');
const Controllers = {};

Controllers.renderAdmin = async function renderAdmin(req, res) {
	const data = await plugins.hooks.fire('filter:admin.header.build', {});
	const { themes } = require('../index');
	
	res.render('admin/plugins/markdown', {
		title: 'Markdown',
		themes,
		shikiThemes: [
			'github-light',
			'github-dark',
			'vs-code-light',
			'vs-code-dark',
			'material-theme',
			'material-theme-darker',
			'dracula',
			'nord',
			'one-dark-pro',
			'solarized-light',
			'solarized-dark'
		]
	});
};

Controllers.retrieveRaw = function retrieveRaw(req, res, next) {
	const pid = parseInt(req.params.pid, 10);

	if (!pid) {
		return next();
	}

	posts.getPostField(pid, 'content', (err, content) => {
		if (err) {
			return next(err);
		}

		res.json({
			pid: pid,
			content: content,
		});
	});
};

module.exports = Controllers;
