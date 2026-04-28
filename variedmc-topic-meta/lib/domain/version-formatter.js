'use strict';

const KeyNormalizer = require('./key-normalizer');

class VersionFormatter {
	static format(input, catalogInput) {
		const versions = KeyNormalizer.list(input);
		if (!versions.length) {
			return '';
		}

		const catalog = KeyNormalizer.list(catalogInput);
		const orderMap = new Map(catalog.map((value, index) => [value.toLowerCase(), index]));
		const sorted = versions.slice().sort((left, right) => VersionFormatter.compare(left, right, orderMap));
		if (sorted.length === 1 || catalog.length === 0) {
			return sorted.join(',');
		}

		const groups = [];
		let start = sorted[0];
		let previous = sorted[0];
		for (let index = 1; index < sorted.length; index += 1) {
			const current = sorted[index];
			if (VersionFormatter.isAdjacent(previous, current, orderMap)) {
				previous = current;
				continue;
			}
			groups.push(VersionFormatter.range(start, previous));
			start = current;
			previous = current;
		}
		groups.push(VersionFormatter.range(start, previous));
		return groups.join(',');
	}

	static compare(left, right, orderMap) {
		const leftIndex = orderMap.get(String(left || '').toLowerCase());
		const rightIndex = orderMap.get(String(right || '').toLowerCase());
		if (leftIndex !== undefined && rightIndex !== undefined) {
			return leftIndex - rightIndex;
		}

		const leftTokens = VersionFormatter.tokenize(left);
		const rightTokens = VersionFormatter.tokenize(right);
		const max = Math.max(leftTokens.length, rightTokens.length);
		for (let index = 0; index < max; index += 1) {
			const leftToken = leftTokens[index];
			const rightToken = rightTokens[index];
			if (leftToken === undefined) {
				return -1;
			}
			if (rightToken === undefined) {
				return 1;
			}
			if (leftToken.type === rightToken.type && leftToken.value !== rightToken.value) {
				return leftToken.value < rightToken.value ? -1 : 1;
			}
			if (leftToken.type !== rightToken.type) {
				return leftToken.type === 'number' ? -1 : 1;
			}
		}
		return String(left || '').localeCompare(String(right || ''), undefined, { numeric: true, sensitivity: 'base' });
	}

	static isAdjacent(left, right, orderMap) {
		const leftIndex = orderMap.get(String(left || '').toLowerCase());
		const rightIndex = orderMap.get(String(right || '').toLowerCase());
		return leftIndex !== undefined && rightIndex !== undefined && rightIndex - leftIndex === 1;
	}

	static range(start, end) {
		return start === end ? start : `${start}-${end}`;
	}

	static tokenize(value) {
		return (String(value || '').match(/\d+|[a-z]+/gi) || []).map(entry => (
			/^\d+$/.test(entry) ?
				{ type: 'number', value: parseInt(entry, 10) } :
				{ type: 'text', value: entry.toLowerCase() }
		));
	}
}

module.exports = VersionFormatter;
