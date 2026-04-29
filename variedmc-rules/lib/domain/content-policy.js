'use strict';

class ContentPolicy {
	static toMeaningfulText(input) {
		return String(input || '')
			.replace(/&(?:nbsp|ensp|emsp|thinsp|zwnj|zwj|NoBreak|ZeroWidthSpace);/gi, ' ')
			.replace(/&#(?:0*160|0*8203|0*8204|0*8205|0*65279);/g, ' ')
			.replace(/&#x(?:0*a0|0*200b|0*200c|0*200d|0*feff);/gi, ' ')
			.replace(/[\u00a0\u1680\u180e\u2000-\u200d\u202f\u205f\u2060\ufeff]/g, ' ')
			.replace(/^[ \t]{0,3}\[[^\]]+]:[^\n]*(?:\n[ \t]+[^\n]*)*/gm, ' ')
			.replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
			.replace(/!\[[^\]]*]\[[^\]]*]/g, ' ')
			.replace(/\[\s*]\([^)]+\)/g, ' ')
			.replace(/\[\s*]\[[^\]]*]/g, ' ')
			.replace(/\[[^\]]+]\([^)]+\)/g, match => match.replace(/^\[|\]\([^)]+\)$/g, ''))
			.replace(/\[([^\]]+)]\[[^\]]*]/g, '$1')
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
