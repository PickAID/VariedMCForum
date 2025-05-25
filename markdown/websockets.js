'use strict';

const privileges = require.main.require('./src/privileges');
const postsAPI = require.main.require('./src/api/posts');
const posts = require.main.require('./src/posts');

module.exports.checkbox = {
	edit: async function (socket, data) {
		const canEdit = await privileges.posts.canEdit(data.pid, socket.uid);
		if (!canEdit) {
			throw new Error('[[error:no-privileges]]');
		}

		let content = await posts.getPostField(data.pid, 'content');
		// Generate array of checkbox indices in the raw content
		const checkboxRegex = /\[[\sx]?\]/g;
		let match;
		const indices = [];

		while ((match = checkboxRegex.exec(content)) !== null) {
			indices.push(match.index);
		}

		content = content.replace(checkboxRegex, (match, idx) => {
			if (idx !== indices[data.index]) {
				return match;
			}

			return data.state ? '[x]' : '[ ]';
		});

		await postsAPI.edit(socket, {
			pid: data.pid,
			content: content,
		});
	},
};
