'use strict';

const path = require('path');

const posts = require.main.require('./src/posts');
const Controllers = {};

Controllers.renderAdmin = function renderAdmin(req, res) {
	try {
		res.render('admin/plugins/markdown', {
			title: 'Markdown',
			themes: [],
			shikiThemes: [
				'github-light',
				'github-dark',
				'vs-code-light',
				'vs-code-dark',
				'material-theme',
				'dracula',
				'nord'
			]
		});
	} catch (error) {
		console.error('Admin render error:', error);
		res.status(500).send('Error loading admin page');
	}
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
