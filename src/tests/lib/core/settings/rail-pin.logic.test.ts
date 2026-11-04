import { describe, it, expect } from 'vitest';
import { TYPE_PIN_PREFIX, VIEW_PIN_PREFIX, typePinKey, viewPinKey } from '#lib/core/settings/rail-pin.logic.js';

describe('rail pin keys', () => {
	it('builds a view key from its absolute path and a type key from its name', () => {
		expect(viewPinKey('/vault/P.view')).toBe('view:/vault/P.view');
		expect(typePinKey('Project')).toBe('type:Project');
	});

	it('starts every key with its prefix', () => {
		expect(viewPinKey('/vault/P.view').startsWith(VIEW_PIN_PREFIX)).toBe(true);
		expect(typePinKey('Project').startsWith(TYPE_PIN_PREFIX)).toBe(true);
	});

	it('builds a bare prefix for an empty target', () => {
		expect(viewPinKey('')).toBe(VIEW_PIN_PREFIX);
		expect(typePinKey('')).toBe(TYPE_PIN_PREFIX);
	});
});
