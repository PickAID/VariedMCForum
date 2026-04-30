'use strict';

class ContentPolicy {
	static toMeaningfulText(input) {
		const original = String(input || '');
		const referenceLabels = ContentPolicy.collectReferenceLabels(original);
		const text = original
			.replace(/&(?:nbsp|ensp|emsp|thinsp|zwnj|zwj|NoBreak|ZeroWidthSpace);/gi, ' ')
			.replace(/&#(?:0*160|0*8203|0*8204|0*8205|0*65279);/g, ' ')
			.replace(/&#x(?:0*a0|0*200b|0*200c|0*200d|0*feff);/gi, ' ')
			.replace(/[\u00a0\u1680\u180e\u2000-\u200d\u202f\u205f\u2060\ufeff]/g, ' ')
			.replace(/^[ \t]{0,3}\[[^\]]+]:[^\n]*(?:\n[ \t]+[^\n]*)*/gm, ' ');

		return ContentPolicy.stripMarkdownImages(text, referenceLabels)
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

	static collectReferenceLabels(input) {
		const labels = new Set();
		const pattern = /^[ \t]{0,3}\[((?:\\.|[^\]\\])+)]:[^\n]*(?:\n[ \t]+[^\n]*)*/gm;
		let match;
		while ((match = pattern.exec(input)) !== null) {
			labels.add(ContentPolicy.normalizeReferenceLabel(match[1]));
		}
		return labels;
	}

	static normalizeReferenceLabel(label) {
		return label
			.replace(/\\([\[\]\\])/g, '$1')
			.replace(/\s+/g, ' ')
			.trim()
			.toLowerCase();
	}

	static stripMarkdownImages(input, referenceLabels = new Set()) {
		let output = '';
		let index = 0;

		while (index < input.length) {
			if (input[index] !== '!' || input[index + 1] !== '[') {
				output += input[index];
				index += 1;
				continue;
			}

			const labelEnd = ContentPolicy.findClosingSquareBracket(input, index + 1);
			if (labelEnd === -1) {
				output += input[index];
				index += 1;
				continue;
			}

			const destinationStart = labelEnd + 1;
			let imageEnd = -1;
			if (input[destinationStart] === '(') {
				imageEnd = ContentPolicy.findClosingParenthesis(input, destinationStart);
			} else if (input[destinationStart] === '[') {
				imageEnd = ContentPolicy.findClosingSquareBracket(input, destinationStart);
			} else {
				const label = input.slice(index + 2, labelEnd);
				if (referenceLabels.has(ContentPolicy.normalizeReferenceLabel(label))) {
					imageEnd = labelEnd;
				}
			}

			if (imageEnd === -1) {
				output += input[index];
				index += 1;
				continue;
			}

			output += ' ';
			index = imageEnd + 1;
		}

		return output;
	}

	static findClosingSquareBracket(input, start) {
		let depth = 0;
		for (let index = start + 1; index < input.length; index += 1) {
			if (input[index] === '\\') {
				index += 1;
			} else if (input[index] === '[') {
				depth += 1;
			} else if (input[index] === ']') {
				if (depth === 0) {
					return index;
				}
				depth -= 1;
			}
		}
		return -1;
	}

	static findClosingParenthesis(input, start) {
		let depth = 0;
		for (let index = start; index < input.length; index += 1) {
			if (input[index] === '\\') {
				index += 1;
			} else if (input[index] === '(') {
				depth += 1;
			} else if (input[index] === ')') {
				depth -= 1;
				if (depth === 0) {
					return index;
				}
			}
		}
		return -1;
	}

	static assertTopicContent(content, rule) {
		const min = Math.max(0, Number(rule && rule.minimumTopicContentLength) || 0);
		if (!min) {
			return;
		}
		const length = ContentPolicy.toMeaningfulText(content).length;
		if (length < min) {
			throw new Error(`[[error:content-too-short, ${min}]]`);
		}
	}
}

module.exports = ContentPolicy;
