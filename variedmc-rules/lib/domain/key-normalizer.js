'use strict';

class KeyNormalizer {
	static text(value) {
		return String(value == null ? '' : value).trim();
	}

	static cid(value) {
		const parsed = parseInt(value, 10);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
	}

	static number(value, fallback = 0) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	}

	static bool(value) {
		if (typeof value === 'string') {
			const normalized = value.trim().toLowerCase();
			return normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes';
		}
		return value === true || value === 1;
	}
}

module.exports = KeyNormalizer;
