import { describe, it, expect } from 'vitest';

import { evaluateModSource, parseModManifest } from '#lib/plugins/mods/mods.logic.js';

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
