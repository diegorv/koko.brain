import { describe, it, expect } from 'vitest';

import { parseEnabledVaults, setVaultEnabled } from '#lib/plugins/mods/mods-enabled.logic.js';

describe('parseEnabledVaults', () => {
	it('returns an empty list for empty storage', () => {
		expect(parseEnabledVaults(null)).toEqual([]);
		expect(parseEnabledVaults('')).toEqual([]);
	});

	it('returns an empty list for garbage JSON', () => {
		expect(parseEnabledVaults('{not json')).toEqual([]);
	});

	it('returns an empty list when the JSON is not an array', () => {
		expect(parseEnabledVaults('{"a":1}')).toEqual([]);
		expect(parseEnabledVaults('"/vault"')).toEqual([]);
		expect(parseEnabledVaults('null')).toEqual([]);
	});

	it('keeps only the string entries of an array, once each', () => {
		expect(parseEnabledVaults('["/a", 1, null, "/b", "/a", {}]')).toEqual(['/a', '/b']);
	});

	it('reads a stored list of paths', () => {
		expect(parseEnabledVaults('["/Users/me/Vault A","/Users/me/Vault B"]')).toEqual([
			'/Users/me/Vault A',
			'/Users/me/Vault B',
		]);
	});
});

describe('setVaultEnabled', () => {
	it('adds a path', () => {
		expect(setVaultEnabled([], '/a', true)).toEqual(['/a']);
	});

	it('removes a path', () => {
		expect(setVaultEnabled(['/a', '/b'], '/a', false)).toEqual(['/b']);
	});

	it('keeps two vaults apart', () => {
		const both = setVaultEnabled(setVaultEnabled([], '/a', true), '/b', true);
		expect(both).toEqual(['/a', '/b']);
		expect(setVaultEnabled(both, '/b', false)).toEqual(['/a']);
	});

	it('keeps a path added twice once', () => {
		expect(setVaultEnabled(setVaultEnabled([], '/a', true), '/a', true)).toEqual(['/a']);
	});

	it('leaves the list unchanged when removing an absent path', () => {
		expect(setVaultEnabled(['/a'], '/b', false)).toEqual(['/a']);
	});

	it('does not mutate its input', () => {
		const input = ['/a'];
		setVaultEnabled(input, '/b', true);
		setVaultEnabled(input, '/a', false);
		expect(input).toEqual(['/a']);
	});

	it('treats paths as exact strings', () => {
		expect(setVaultEnabled(['/a'], '/a/', true)).toEqual(['/a', '/a/']);
	});
});
