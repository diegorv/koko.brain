import { describe, it, expect } from 'vitest';

import {
	assertVaultPath,
	closesWhenDone,
	errorText,
	evaluateModSource,
	isModCodePath,
	mapModChanges,
	parseModManifest,
} from '#lib/plugins/mods/mods.logic.js';

const VAULT = '/vaults/main';
const MODS = `${VAULT}/_system/mods`;

describe('closesWhenDone', () => {
	const quiet = { status: 'done', lines: [], progress: null } as const;

	it('closes a run that ended done with no log line and no progress', () => {
		expect(closesWhenDone(quiet)).toBe(true);
	});

	it('keeps a run that logged or showed progress', () => {
		expect(closesWhenDone({ ...quiet, lines: ['Wrote 3 notes'] })).toBe(false);
		expect(closesWhenDone({ ...quiet, progress: { done: 1, total: 1 } })).toBe(false);
	});

	it('keeps a run that is still going, failed or was cancelled', () => {
		expect(closesWhenDone({ ...quiet, status: 'running' })).toBe(false);
		expect(closesWhenDone({ ...quiet, status: 'failed' })).toBe(false);
		expect(closesWhenDone({ ...quiet, status: 'cancelled' })).toBe(false);
	});
});

describe('errorText', () => {
	it('puts the message first, then the stack', () => {
		const err = new Error('boom');
		err.stack = 'onload@\nloadMod@http://localhost/x.ts:1:2';
		expect(errorText(err)).toBe('boom\nonload@\nloadMod@http://localhost/x.ts:1:2');
	});

	it('is the message alone for an Error without a stack', () => {
		const err = new Error('boom');
		err.stack = undefined;
		expect(errorText(err)).toBe('boom');
	});

	it('stringifies a thrown value that is not an Error', () => {
		expect(errorText('plain')).toBe('plain');
		expect(errorText(42)).toBe('42');
		expect(errorText(null)).toBe('null');
	});
});

describe('mapModChanges', () => {
	it('reloads the mod whose main.js or manifest.json changed', () => {
		expect(mapModChanges([`${MODS}/hello/main.js`], VAULT)).toEqual({ rediscover: false, folders: ['hello'] });
		expect(mapModChanges([`${MODS}/hello/manifest.json`], VAULT)).toEqual({ rediscover: false, folders: ['hello'] });
	});

	it('reloads a mod folder reported on its own, as a deletion often is', () => {
		expect(mapModChanges([`${MODS}/hello`], VAULT)).toEqual({ rediscover: false, folders: ['hello'] });
	});

	it('rediscovers everything for the mods folder itself or _system', () => {
		expect(mapModChanges([MODS], VAULT)).toEqual({ rediscover: true, folders: [] });
		expect(mapModChanges([`${VAULT}/_system`], VAULT)).toEqual({ rediscover: true, folders: [] });
	});

	it.each([
		['a README in a mod folder', `${MODS}/hello/README.md`],
		['a README directly in the mods folder', `${MODS}/README.md`],
		['an editor backup', `${MODS}/hello/main.js~`],
		['a file in a subfolder of a mod', `${MODS}/hello/lib/main.js`],
		['another file under _system', `${VAULT}/_system/templates/daily.md`],
		['a note outside the mods folder', `${VAULT}/Notes/main.js`],
		['a sibling whose name starts like the mods folder', `${VAULT}/_system/mods-old/hello/main.js`],
		['the vault root', VAULT],
		['a path outside the vault', '/vaults/other/_system/mods/hello/main.js'],
	])('ignores %s', (_label, path) => {
		expect(mapModChanges([path], VAULT)).toEqual({ rediscover: false, folders: [] });
	});

	it('maps a mixed batch to each mod once, in folder order', () => {
		const result = mapModChanges(
			[
				`${VAULT}/Notes/a.md`,
				`${MODS}/zeta/main.js`,
				`${MODS}/alpha/manifest.json`,
				`${MODS}/zeta/manifest.json`,
				`${MODS}/alpha/README.md`,
				`${MODS}/gone`,
			],
			VAULT,
		);

		expect(result).toEqual({ rediscover: false, folders: ['alpha', 'gone', 'zeta'] });
	});

	it('maps an empty batch to nothing', () => {
		expect(mapModChanges([], VAULT)).toEqual({ rediscover: false, folders: [] });
	});
});

describe('isModCodePath', () => {
	it('is true for any file under the mods folder that is not a note or a view', () => {
		expect(isModCodePath(`${MODS}/hello/main.js`, VAULT)).toBe(true);
		expect(isModCodePath(`${MODS}/hello/manifest.json`, VAULT)).toBe(true);
		expect(isModCodePath(`${MODS}/hello/main.js~`, VAULT)).toBe(true);
	});

	it('is false for a note or a view under the mods folder', () => {
		expect(isModCodePath(`${MODS}/hello/README.md`, VAULT)).toBe(false);
		expect(isModCodePath(`${MODS}/hello/notes.markdown`, VAULT)).toBe(false);
		expect(isModCodePath(`${MODS}/hello/list.view`, VAULT)).toBe(false);
	});

	it('is false outside the mods folder, for the folder itself, and with no vault', () => {
		expect(isModCodePath(`${VAULT}/Notes/main.js`, VAULT)).toBe(false);
		expect(isModCodePath(`${VAULT}/_system/mods-old/main.js`, VAULT)).toBe(false);
		expect(isModCodePath(MODS, VAULT)).toBe(false);
		expect(isModCodePath(`${MODS}/hello/main.js`, null)).toBe(false);
	});
});

describe('assertVaultPath', () => {
	it('accepts a relative path, nested or not', () => {
		expect(() => assertVaultPath('Idea.md')).not.toThrow();
		expect(() => assertVaultPath('Ideas/2026/Idea.md')).not.toThrow();
		expect(() => assertVaultPath('Ideas')).not.toThrow();
		expect(() => assertVaultPath('.hidden/notes.md')).not.toThrow();
		expect(() => assertVaultPath('a..b/c.md')).not.toThrow();
	});

	it.each([
		['an empty path', ''],
		['a leading slash', '/Ideas/Idea.md'],
		['a trailing slash', 'Ideas/'],
		['a double slash', 'Ideas//Idea.md'],
		['a . segment', 'Ideas/./Idea.md'],
		['a lone .', '.'],
		['a .. segment', 'Ideas/../Idea.md'],
		['a leading ..', '../outside.md'],
	])('rejects %s', (_label, path) => {
		expect(() => assertVaultPath(path)).toThrow(`Invalid vault path "${path}"`);
	});

	it('rejects a value that is not a string', () => {
		expect(() => assertVaultPath(undefined)).toThrow('Invalid vault path "undefined"');
		expect(() => assertVaultPath(42)).toThrow('Invalid vault path "42"');
	});
});

const VALID = { id: 'hello', name: 'Hello', version: '1.0.0' };

function manifest(fields: Record<string, unknown>): string {
	return JSON.stringify(fields);
}

function errorOf(text: string, folder = 'hello'): string {
	const result = parseModManifest(text, folder);
	if (result.ok) throw new Error('expected an invalid manifest');
	return result.error;
}

describe('parseModManifest', () => {
	it('accepts a valid manifest with the optional fields', () => {
		const result = parseModManifest(
			manifest({ ...VALID, description: 'Says hello', author: 'Me', minAppVersion: '0.9.0' }),
			'hello',
		);

		expect(result).toEqual({
			ok: true,
			manifest: { ...VALID, description: 'Says hello', author: 'Me', minAppVersion: '0.9.0' },
		});
	});

	it('accepts a manifest with only the required fields', () => {
		expect(parseModManifest(manifest(VALID), 'hello')).toEqual({ ok: true, manifest: VALID });
	});

	it('ignores unknown keys', () => {
		const result = parseModManifest(manifest({ ...VALID, permissions: ['all'], main: 'x.js' }), 'hello');

		expect(result).toEqual({ ok: true, manifest: VALID });
	});

	it('names the folder when the JSON is invalid or not an object', () => {
		expect(errorOf('{oops')).toBe('_system/mods/hello: manifest.json is not valid JSON');
		expect(errorOf('[]')).toBe('_system/mods/hello: manifest.json must be a JSON object');
		expect(errorOf('null')).toBe('_system/mods/hello: manifest.json must be a JSON object');
	});

	it('rejects a missing or malformed id', () => {
		expect(errorOf(manifest({ name: 'Hello', version: '1' }))).toBe(
			'_system/mods/hello: manifest.json id must be a string',
		);
		expect(errorOf(manifest({ ...VALID, id: 'Hello' }), 'Hello')).toBe(
			'_system/mods/Hello: manifest.json id "Hello" must be lowercase letters and digits, joined by single hyphens',
		);
		expect(errorOf(manifest({ ...VALID, id: 'a--b' }), 'a--b')).toContain('joined by single hyphens');
		expect(errorOf(manifest({ ...VALID, id: '-a' }), '-a')).toContain('joined by single hyphens');
		const long = 'a'.repeat(65);
		expect(errorOf(manifest({ ...VALID, id: long }), long)).toBe(
			`_system/mods/${long}: manifest.json id must be at most 64 characters`,
		);
	});

	it('accepts an id of exactly 64 characters', () => {
		const id = 'a'.repeat(64);
		expect(parseModManifest(manifest({ ...VALID, id }), id).ok).toBe(true);
	});

	it('rejects an id that does not match the folder name', () => {
		expect(errorOf(manifest({ ...VALID, id: 'bar' }), 'foo')).toBe(
			'_system/mods/foo: manifest.json id "bar" does not match the folder name',
		);
	});

	it('rejects an empty or missing name and version', () => {
		expect(errorOf(manifest({ ...VALID, name: '' }))).toBe(
			'_system/mods/hello: manifest.json name must be a non-empty string',
		);
		expect(errorOf(manifest({ id: 'hello', version: '1' }))).toBe(
			'_system/mods/hello: manifest.json name must be a non-empty string',
		);
		expect(errorOf(manifest({ ...VALID, version: 1 }))).toBe(
			'_system/mods/hello: manifest.json version must be a non-empty string',
		);
		expect(errorOf(manifest({ ...VALID, version: '' }))).toBe(
			'_system/mods/hello: manifest.json version must be a non-empty string',
		);
	});

	it('shape-checks the optional fields', () => {
		expect(errorOf(manifest({ ...VALID, description: 3 }))).toBe(
			'_system/mods/hello: manifest.json description must be a string',
		);
		expect(errorOf(manifest({ ...VALID, author: false }))).toBe(
			'_system/mods/hello: manifest.json author must be a string',
		);
		expect(errorOf(manifest({ ...VALID, minAppVersion: 'soon' }))).toBe(
			'_system/mods/hello: manifest.json minAppVersion must look like 1.2.3',
		);
	});
});

describe('evaluateModSource', () => {
	it('returns the default export of a mod with one export default', () => {
		const mod = evaluateModSource('const greeting = "hi";\nexport default { onload() { return greeting; } };', 'hello');

		expect(typeof mod.onload).toBe('function');
		expect((mod.onload as () => string)()).toBe('hi');
	});

	it('accepts a class instance as the default export', () => {
		const source = [
			'class MyMod {',
			'\tonload() { this.loaded = true; }',
			'\tonunload() { this.loaded = false; }',
			'}',
			'export default new MyMod();',
		].join('\n');

		const mod = evaluateModSource(source, 'hello');

		expect(typeof mod.onload).toBe('function');
		expect(typeof mod.onunload).toBe('function');
	});

	it('runs the code in strict mode', () => {
		expect(() => evaluateModSource('undeclared = 1;\nexport default { onload() {} };', 'hello')).toThrow(
			ReferenceError,
		);
	});

	it('rejects a source with no export default', () => {
		expect(() => evaluateModSource('const x = { onload() {} };', 'hello')).toThrow(
			'main.js: found no "export default"; a mod default-exports an object with onload',
		);
	});

	it('rejects a source with two export default lines', () => {
		const source = 'export default { onload() {} };\nexport default { onload() {} };';

		expect(() => evaluateModSource(source, 'hello')).toThrow(
			'main.js: found 2 "export default" lines; use exactly one',
		);
	});

	it('rewords a stray import as the one-file rule', () => {
		const source = 'import { x } from "./other.js";\nexport default { onload() {} };';

		expect(() => evaluateModSource(source, 'hello')).toThrow(
			'main.js: use exactly one "export default" and no "import"; a mod is one file',
		);
	});

	it('rewords a second export that is not a default', () => {
		const source = 'export const helper = 1;\nexport default { onload() {} };';

		expect(() => evaluateModSource(source, 'hello')).toThrow(
			'main.js: use exactly one "export default" and no "import"; a mod is one file',
		);
	});

	it('keeps the engine message for other syntax errors', () => {
		let caught: unknown;
		try {
			evaluateModSource('export default { onload() { return ( } };', 'hello');
		} catch (err) {
			caught = err;
		}

		expect(caught).toBeInstanceOf(SyntaxError);
		expect((caught as Error).message).not.toContain('a mod is one file');
		expect((caught as Error).message.length).toBeGreaterThan(0);
	});

	it('rejects a default export without onload', () => {
		expect(() => evaluateModSource('export default { onunload() {} };', 'hello')).toThrow(
			'main.js: the default export must be an object with an onload function',
		);
		expect(() => evaluateModSource('export default 42;', 'hello')).toThrow(
			'main.js: the default export must be an object with an onload function',
		);
		expect(() => evaluateModSource('export default null;', 'hello')).toThrow(
			'main.js: the default export must be an object with an onload function',
		);
	});

	it('lets an error thrown by the top-level code through', () => {
		expect(() => evaluateModSource('throw new Error("boom");\nexport default { onload() {} };', 'hello')).toThrow(
			'boom',
		);
	});

	it('does not treat the word await in a comment specially', () => {
		const mod = evaluateModSource('// we await nothing here\nexport default { onload() { return 1; } };', 'hello');

		expect((mod.onload as () => number)()).toBe(1);
	});
});
