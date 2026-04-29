'use strict';

class ContentPolicy {
	static toMeaningfulText(input) {
		return String(input || '')
			.replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
			.replace(/\[[^\]]+]\([^)]+\)/g, match => match.replace(/^\[|\]\([^)]+\)$/g, ''))
			.replace(/```[\s\S]*?```/g, block => block.replace(/```/g, ' '))
			.replace(/`([^`]+)`/g, '$1')
			.replace(/<[^>]+>/g, ' ')
			.replace(/[*_~]/g, '')
			.replace(/[#>\-|]/g, ' ')
			.replace(/\s+/g, ' ')
			.replace(/\s+([，。！？、：；,.!?:;])/g, '$1')
			.trim();
	}

	static assertTopicContent(content, rule) {
		const min = Math.max(0, Number(rule && rule.minimumTopicContentLength) || 0);
		if (!min) {
			return;
		}
		const length = ContentPolicy.toMeaningfulText(content).length;
		if (length < min) {
			throw new Error(`[[error:variedmc-rules-content-too-short, ${min}]]`);
		}
	}
}

module.exports = ContentPolicy;
