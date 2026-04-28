'use strict';

class KeyNormalizer {
	static text(value) {
		return String(value || '').trim();
	}

	static key(value) {
		return KeyNormalizer.text(value)
			.toLowerCase()
			.replace(/[^a-z0-9_.-]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	static list(input) {
		const items = Array.isArray(input) ? input : String(input || '').split(/[\n,]/);
		const seen = new Set();
		const values = [];
		items.forEach((item) => {
			const value = KeyNormalizer.text(item && typeof item === 'object' ? item.value || item.label : item);
			const lowered = value.toLowerCase();
			if (value && !seen.has(lowered)) {
				seen.add(lowered);
				values.push(value);
			}
		});
		return values;
	}

	static bool(value) {
		return value === true || value === 'true' || value === 'on' || value === 1 || value === '1';
	}

	static mode(value) {
		return String(value || '').trim() === 'single' ? 'single' : 'multi';
	}

	static cid(value) {
		const parsed = parseInt(value, 10);
		return Number.isFinite(parsed) ? parsed : 0;
	}
}

module.exports = KeyNormalizer;
