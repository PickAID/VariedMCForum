'use strict';

class TitleBracketGuard {
	static assertNoManualBlocks(title, context = {}) {
		const baseTitle = TitleBracketGuard.stripGeneratedPrefix(title, context.generatedPrefix || '');
		if (/(^|\s)\[[^\]\r\n]{1,40}]/.test(baseTitle)) {
			throw new Error('[[error:variedmc-topic-meta-manual-brackets]]');
		}
	}

	static stripGeneratedPrefix(title, prefix) {
		const normalizedTitle = String(title || '').trim();
		const normalizedPrefix = String(prefix || '').trim();
		if (!normalizedPrefix) {
			return normalizedTitle;
		}
		if (normalizedTitle === normalizedPrefix) {
			return '';
		}
		if (normalizedTitle.startsWith(`${normalizedPrefix} `)) {
			return normalizedTitle.slice(normalizedPrefix.length + 1).trim();
		}
		return normalizedTitle;
	}
}

module.exports = TitleBracketGuard;
