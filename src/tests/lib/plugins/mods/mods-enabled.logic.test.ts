import { describe, it, expect } from 'vitest';

import {
	parseDisabledMods,
	parseEnabledVaults,
	setModDisabled,
	setVaultEnabled,
} from '#lib/plugins/mods/mods-enabled.logic.js';

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

describe('parseDisabledMods', () => {
	it('returns an empty map for empty storage', () => {
		expect(parseDisabledMods(null)).toEqual({});
		expect(parseDisabledMods('')).toEqual({});
	});

	it('returns an empty map for garbage JSON', () => {
		expect(parseDisabledMods('{not json')).toEqual({});
	});

	it('returns an empty map when the JSON is not an object', () => {
		expect(parseDisabledMods('["hello"]')).toEqual({});
		expect(parseDisabledMods('"hello"')).toEqual({});
		expect(parseDisabledMods('null')).toEqual({});
	});

	it('reads a stored map of vault paths to disabled folders', () => {
		expect(parseDisabledMods('{"/Users/me/Vault A":["boom","hello"],"/b":["x"]}')).toEqual({
			'/Users/me/Vault A': ['boom', 'hello'],
			'/b': ['x'],
		});
	});

	it('keeps only string folders, once each, and drops vaults whose value is not an array', () => {
		expect(parseDisabledMods('{"/a":["x",1,"x",null,"y"],"/b":"x","/c":{}}')).toEqual({ '/a': ['x', 'y'] });
	});

	it('drops vaults left with no folders', () => {
		expect(parseDisabledMods('{"/a":[],"/b":[1]}')).toEqual({});
	});
});

describe('setModDisabled', () => {
	it('disables a folder in a vault', () => {
		expect(setModDisabled({}, '/a', 'boom', true)).toEqual({ '/a': ['boom'] });
	});

	it('enables a folder again and drops the vault once it has none', () => {
		expect(setModDisabled({ '/a': ['boom'] }, '/a', 'boom', false)).toEqual({});
		expect(setModDisabled({ '/a': ['boom', 'x'] }, '/a', 'boom', false)).toEqual({ '/a': ['x'] });
	});

	it('keeps vaults apart', () => {
		const map = setModDisabled({ '/a': ['boom'] }, '/b', 'boom', true);
		expect(map).toEqual({ '/a': ['boom'], '/b': ['boom'] });
		expect(setModDisabled(map, '/b', 'boom', false)).toEqual({ '/a': ['boom'] });
	});

	it('keeps a folder disabled twice once', () => {
		expect(setModDisabled({ '/a': ['boom'] }, '/a', 'boom', true)).toEqual({ '/a': ['boom'] });
	});

	it('leaves the map unchanged when enabling a folder that is not disabled', () => {
		expect(setModDisabled({ '/a': ['x'] }, '/a', 'boom', false)).toEqual({ '/a': ['x'] });
		expect(setModDisabled({}, '/a', 'boom', false)).toEqual({});
	});

	it('does not mutate its input', () => {
		const input = { '/a': ['x'] };
		setModDisabled(input, '/a', 'y', true);
		setModDisabled(input, '/a', 'x', false);
		expect(input).toEqual({ '/a': ['x'] });
	});
});
