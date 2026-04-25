'use strict';

const SocketPlugins = require.main.require('./src/socket.io/plugins');
const routeHelpers = require.main.require('./src/routes/helpers');
const posts = require.main.require('./src/posts');
const slugify = require.main.require('./src/slugify');
const topics = require.main.require('./src/topics');

const controllers = require('./lib/controllers');
const settings = require('./lib/settings');
const socketMethods = require('./lib/sockets');

const plugin = module.exports;

plugin.init = async function ({ router }) {
	SocketPlugins.variedmcTopicMeta = socketMethods;
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/variedmc-topic-meta', controllers.renderAdminPage);
	await settings.getSettings();
};

plugin.addAdminNavigation = async function (header) {
	header.plugins.push({
		route: '/plugins/variedmc-topic-meta',
		icon: 'fa-code-fork',
		name: 'VariedMC Topic Meta',
	});

	return header;
};

plugin.appendConfig = async function (config) {
	config.variedmcTopicMeta = await settings.getPublicConfig();
	return config;
};

plugin.filterComposerPush = async function (payload) {
	if (!payload || !payload.pid || !payload.isMain) {
		return payload;
	}

	const tid = await posts.getPostField(payload.pid, 'tid');
	if (!tid) {
		return payload;
	}

	const topicData = await topics.getTopicFields(tid, [
		'cid',
		'variedmcMeta',
		'variedmcMetaVersions',
		'variedmcMetaLoaders',
		'variedmcMetaThemes',
		'variedmcMetaBaseTitle',
		'variedmcMetaPrefix',
	]);
	payload.cid = parseInt(topicData.cid, 10) || payload.cid;
	payload.variedmcTopicMeta = settings.parseStoredMeta(topicData);
	return payload;
};

plugin.filterTopicPost = async function (data) {
	if (!data || !data.cid || !data.variedmcTopicMeta) {
		return data;
	}

	const storedSettings = await settings.getSettings();
	const prepared = settings.prepareMetaPayload(
		storedSettings,
		data.cid,
		data.variedmcTopicMeta,
		data.variedmcTopicMeta.baseTitle || data.title || ''
	);

	data.variedmcTopicMetaPrepared = prepared.meta;
	if (prepared.meta.baseTitle) {
		data.title = prepared.title;
	}

	return data;
};

plugin.filterTopicCreate = async function (payload) {
	if (!payload || !payload.data || !payload.topic) {
		return payload;
	}

	const prepared = await ensurePreparedCreateMeta(payload.data);
	if (!prepared) {
		return payload;
	}

	const finalTitle = String(payload.data.variedmcTopicMetaPreparedTitle || '').trim();
	if (finalTitle) {
		payload.data.title = finalTitle;
		payload.topic.title = finalTitle;
		payload.topic.slug = `${payload.topic.tid}/${slugify(finalTitle) || 'topic'}`;
	}

	Object.assign(payload.topic, settings.serializeTopicMetaFields(prepared));
	return payload;
};

plugin.filterPostEdit = async function (payload) {
	if (!payload || !payload.data || !payload.data.pid || !payload.data.variedmcTopicMeta) {
		return payload;
	}

	const [tid, isMain] = await Promise.all([
		posts.getPostField(payload.data.pid, 'tid'),
		posts.isMain(payload.data.pid),
	]);
	if (!isMain || !tid) {
		return payload;
	}

	const topicData = await topics.getTopicFields(tid, [
		'cid',
		'title',
		'variedmcMeta',
		'variedmcMetaVersions',
		'variedmcMetaLoaders',
		'variedmcMetaThemes',
		'variedmcMetaBaseTitle',
		'variedmcMetaPrefix',
	]);
	const storedSettings = await settings.getSettings();
	const existingMeta = settings.parseStoredMeta(topicData);
	const currentRule = settings.resolveCategoryRule(storedSettings, topicData.cid);
	const currentPrefix = settings.buildTitlePrefix(existingMeta, {
		versionCatalog: currentRule.fields.versions.options,
	});
	const fallbackBaseTitle = payload.data.variedmcTopicMeta.baseTitle ||
		existingMeta.baseTitle ||
		settings.stripGeneratedPrefix(payload.data.title || topicData.title || '', currentPrefix);

	const prepared = settings.prepareMetaPayload(
		storedSettings,
		topicData.cid,
		payload.data.variedmcTopicMeta,
		fallbackBaseTitle
	);

	payload.data.title = prepared.title;
	payload.data.variedmcTopicMetaPrepared = prepared.meta;
	return payload;
};

plugin.filterTopicEdit = async function (payload) {
	if (!payload || !payload.data || !payload.topic || !payload.data.variedmcTopicMetaPrepared) {
		return payload;
	}

	const prepared = payload.data.variedmcTopicMetaPrepared;
	Object.assign(payload.topic, settings.serializeTopicMetaFields(prepared));

	if (payload.data.title) {
		payload.topic.title = payload.data.title.trim();
		payload.topic.slug = `${payload.topic.tid}/${slugify(payload.topic.title) || 'topic'}`;
	}

	return payload;
};

async function ensurePreparedCreateMeta(data) {
	if (!data || !data.variedmcTopicMeta) {
		return null;
	}

	if (data.variedmcTopicMetaPrepared) {
		if (!data.variedmcTopicMetaPrepared.baseTitle) {
			data.variedmcTopicMetaPrepared.baseTitle = String(data.title || '').trim();
		}
		if (!data.variedmcTopicMetaPreparedTitle) {
			const storedSettings = await settings.getSettings();
			const preparedPayload = settings.prepareMetaPayload(
				storedSettings,
				data.cid,
				data.variedmcTopicMeta,
				data.variedmcTopicMetaPrepared.baseTitle || data.title || ''
			);
			data.variedmcTopicMetaPreparedTitle = preparedPayload.title;
		}
		return data.variedmcTopicMetaPrepared;
	}

	const storedSettings = await settings.getSettings();
	const prepared = settings.prepareMetaPayload(
		storedSettings,
		data.cid,
		data.variedmcTopicMeta,
		data.title || ''
	);
	data.variedmcTopicMetaPrepared = prepared.meta;
	data.variedmcTopicMetaPreparedTitle = prepared.title;
	return prepared.meta;
}
