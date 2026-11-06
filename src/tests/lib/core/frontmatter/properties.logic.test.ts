import { describe, it, expect, vi } from 'vitest';

import { parse as yamlParse } from 'yaml';
import { canonicalizeKey } from '#lib/utils/frontmatter-aliases.js';
import {
	extractRawFrontmatter,
	extractBody,
	parseFrontmatterProperties,
	detectLossyFrontmatter,
	serializeProperties,
	setPropertyByBindTarget,
	typedOptionValue,
	rebuildContent,
	addProperty,
	removeProperty,
	updatePropertyValue,
	renamePropertyKey,
	extractWikilinks,
	resolveRelationshipLinks,
	computeAddRelationshipValue,
	computeRemoveRelationshipValue,
	ensureFrontmatterLink,
	_resetParseFrontmatterCache,
	_lastAliasPassSteps,
	configurePropertiesDiagnostics,
	normalizeTypeCasing,
	yamlScalar,
} from '#lib/core/frontmatter/properties.logic.js';
import { resolveWikilink } from '#lib/core/filesystem/wikilink-resolution.logic.js';

/** The diagnostics sink the app wires to appendLog. */
const diagnosticsLog = vi.fn();
configurePropertiesDiagnostics({ log: diagnosticsLog });

describe('extractRawFrontmatter', () => {
	it('extracts YAML content between delimiters', () => {
		const content = '---\ntitle: Hello\ntags: [a, b]\n---\nBody here';
		expect(extractRawFrontmatter(content)).toBe('title: Hello\ntags: [a, b]');
	});

	it('returns null when no frontmatter', () => {
		expect(extractRawFrontmatter('Just plain text')).toBeNull();
	});

	it('returns null for empty content', () => {
		expect(extractRawFrontmatter('')).toBeNull();
	});

	it('handles Windows line endings', () => {
		const content = '---\r\ntitle: Hello\r\n---\r\nBody';
		expect(extractRawFrontmatter(content)).toBe('title: Hello');
	});
});

describe('extractBody', () => {
	it('returns body after frontmatter', () => {
		const content = '---\ntitle: Hello\n---\nBody here';
		expect(extractBody(content)).toBe('Body here');
	});

	it('returns full content when no frontmatter', () => {
		const content = 'Just plain text';
		expect(extractBody(content)).toBe('Just plain text');
	});

	it('returns empty string for empty content', () => {
		expect(extractBody('')).toBe('');
	});

	it('handles content with only frontmatter', () => {
		const content = '---\ntitle: Hello\n---\n';
		expect(extractBody(content)).toBe('');
	});

	it('handles body with multiple paragraphs', () => {
		const content = '---\ntitle: Hello\n---\nParagraph 1\n\nParagraph 2';
		expect(extractBody(content)).toBe('Paragraph 1\n\nParagraph 2');
	});
});

describe('parseFrontmatterProperties', () => {
	it('parses simple key-value pairs', () => {
		const content = '---\ntitle: My Note\nauthor: Alice\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props).toHaveLength(2);
		expect(props[0]).toEqual({ key: 'title', value: 'My Note', type: 'text' });
		expect(props[1]).toEqual({ key: 'author', value: 'Alice', type: 'text' });
	});

	it('parses numeric values', () => {
		const content = '---\ncount: 42\nrating: 3.5\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props[0]).toEqual({ key: 'count', value: 42, type: 'number' });
		expect(props[1]).toEqual({ key: 'rating', value: 3.5, type: 'number' });
	});

	it('parses boolean values', () => {
		const content = '---\npublished: true\ndraft: false\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props[0]).toEqual({ key: 'published', value: true, type: 'boolean' });
		expect(props[1]).toEqual({ key: 'draft', value: false, type: 'boolean' });
	});

	it('parses date values', () => {
		const content = '---\ncreated: 2024-01-15\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props[0]).toEqual({ key: 'created', value: '2024-01-15', type: 'date' });
	});

	it('parses inline array values', () => {
		const content = '---\ntags: [javascript, svelte, rust]\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props[0]).toEqual({
			key: 'tags',
			value: ['javascript', 'svelte', 'rust'],
			type: 'list',
		});
	});

	it('parses block array values', () => {
		const content = '---\ntags:\n  - javascript\n  - svelte\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props[0]).toEqual({
			key: 'tags',
			value: ['javascript', 'svelte'],
			type: 'list',
		});
	});

	it('parses block array without indentation', () => {
		const content = '---\ntags:\n- javascript\n- svelte\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props[0]).toEqual({
			key: 'tags',
			value: ['javascript', 'svelte'],
			type: 'list',
		});
	});

	it('collapses an alias and its canonical twin into a single entry', () => {
		// `color` and `_color` both canonicalize to `_color`. Without de-dup the
		// store would hold two `_color` entries and PropertiesView's keyed {#each}
		// throws each_key_duplicate, breaking the whole panel.
		const content = '---\ncolor: red\n_color: blue\n---\nBody';
		const props = parseFrontmatterProperties(content);
		const colorProps = props.filter((p) => p.key === '_color');
		expect(colorProps).toHaveLength(1);
		// First appearance wins (matches serializeProperties' dedupe semantics).
		expect(colorProps[0]).toEqual({ key: '_color', value: 'red', type: 'text' });
	});

	it('returns empty array when no frontmatter', () => {
		expect(parseFrontmatterProperties('Just text')).toEqual([]);
	});

	it('returns empty array for empty content', () => {
		expect(parseFrontmatterProperties('')).toEqual([]);
	});

	it('handles empty frontmatter block', () => {
		const content = '---\n\n---\nBody';
		expect(parseFrontmatterProperties(content)).toEqual([]);
	});

	it('handles mixed property types', () => {
		const content =
			'---\ntitle: My Note\ncount: 5\npublished: true\ncreated: 2024-01-15\ntags: [a, b]\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props).toHaveLength(5);
		expect(props[0].type).toBe('text');
		expect(props[1].type).toBe('number');
		expect(props[2].type).toBe('boolean');
		expect(props[3].type).toBe('date');
		expect(props[4].type).toBe('list');
	});

	it('handles keys with hyphens', () => {
		const content = '---\ncreated-at: 2024-01-15\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props[0].key).toBe('created-at');
	});

	it('handles keys with dots', () => {
		const content = '---\nplugin.version: 1.5\ncustom.field: hello\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props).toHaveLength(2);
		expect(props[0].key).toBe('plugin.version');
		expect(props[1].key).toBe('custom.field');
		expect(props[1].value).toBe('hello');
	});

	it('handles empty value as text', () => {
		const content = '---\ntitle:\nnext: value\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props[0]).toEqual({ key: 'title', value: '', type: 'text' });
	});

	it('parses YAML literal block scalar (|)', () => {
		const content = '---\ndesc: |\n  Line one\n  Line two\ntags: [a]\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props).toHaveLength(2);
		expect(props[0].key).toBe('desc');
		expect(props[0].value).toBe('Line one\nLine two\n');
		expect(props[0].type).toBe('text');
		expect(props[1].key).toBe('tags');
	});

	it('parses YAML folded block scalar (>)', () => {
		const content = '---\ndesc: >\n  Line one\n  Line two\ntags: [a]\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props).toHaveLength(2);
		expect(props[0].key).toBe('desc');
		expect(props[0].value).toBe('Line one Line two\n');
		expect(props[0].type).toBe('text');
	});

	it('returns empty array for malformed YAML', () => {
		const content = '---\nkey: [unclosed\n---\nBody';
		expect(parseFrontmatterProperties(content)).toEqual([]);
	});

	it('handles null values', () => {
		const content = '---\nkey: null\ntilde: ~\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props[0]).toEqual({ key: 'key', value: '', type: 'text' });
		expect(props[1]).toEqual({ key: 'tilde', value: '', type: 'text' });
	});

	// Same rule as Rust `project_value` (src-tauri/src/vault/parsing.rs): YAML reads
	// `[[A]]` as a list holding a list holding `A`.
	describe('unquoted wikilinks', () => {
		it('reads a value [[A]] as the text "[[A]]"', () => {
			const props = parseFrontmatterProperties('---\nrelated: [[A]]\n---\n');
			expect(props[0]).toEqual({ key: 'related', value: '[[A]]', type: 'text' });
		});

		it('reads block list items [[A]] as "[[A]]" next to quoted ones', () => {
			const props = parseFrontmatterProperties('---\nrelated:\n  - [[A]]\n  - "[[B]]"\n---\n');
			expect(props[0]).toEqual({ key: 'related', value: ['[[A]]', '[[B]]'], type: 'list' });
		});

		it('reads flow list items [[A]] as "[[A]]"', () => {
			const props = parseFrontmatterProperties('---\nrelated: [[[A]], [[B]]]\n---\n');
			expect(props[0]).toEqual({ key: 'related', value: ['[[A]]', '[[B]]'], type: 'list' });
		});

		it('leaves a nested list with more than one item as JSON', () => {
			const props = parseFrontmatterProperties('---\nitems:\n  - [a, b]\n  - c\n---\n');
			expect(props[0]).toEqual({ key: 'items', value: ['["a","b"]', 'c'], type: 'list' });
		});

		it('keeps the source spelling of a target YAML reads as a number or null', () => {
			const props = parseFrontmatterProperties('---\na: [[007]]\nb: [[1.0]]\nc:\n  - [[~]]\n  - [[null]]\n---\n');
			expect(props).toEqual([
				{ key: 'a', value: '[[007]]', type: 'text' },
				{ key: 'b', value: '[[1.0]]', type: 'text' },
				{ key: 'c', value: ['[[~]]', '[[null]]'], type: 'list' },
			]);
		});

		// Rust resolves aliases before projecting, so these read the same on both sides
		// (pinned against Rust in frontmatter-parity.fixture.json).
		it('keeps an alias to an anchored wikilink resolving to "[[X]]"', () => {
			const props = parseFrontmatterProperties('---\na: &x [[X]]\nb: *x\n---\n');
			expect(props).toEqual([
				{ key: 'a', value: '[[X]]', type: 'text' },
				{ key: 'b', value: '[[X]]', type: 'text' },
			]);
		});

		it('keeps an alias to an anchored wikilink target resolving to the target', () => {
			const props = parseFrontmatterProperties('---\na: [[&x X]]\nb: *x\n---\n');
			expect(props).toEqual([
				{ key: 'a', value: '[[X]]', type: 'text' },
				{ key: 'b', value: 'X', type: 'text' },
			]);
		});

		it('keeps an alias to an anchored inner list resolving to the list', () => {
			const props = parseFrontmatterProperties('---\na: [&y [X]]\nb: *y\n---\n');
			expect(props).toEqual([
				{ key: 'a', value: '[[X]]', type: 'text' },
				{ key: 'b', value: ['X'], type: 'list' },
			]);
		});

		it('folds a wikilink whose target is an alias to a scalar', () => {
			const props = parseFrontmatterProperties('---\nz: &x X\na: [[*x]]\n---\n');
			expect(props).toEqual([
				{ key: 'z', value: 'X', type: 'text' },
				{ key: 'a', value: '[[X]]', type: 'text' },
			]);
		});

		it('folds a wikilink whose inner list is an alias', () => {
			const props = parseFrontmatterProperties('---\na: &l [X]\nb: [*l]\n---\n');
			expect(props).toEqual([
				{ key: 'a', value: ['X'], type: 'list' },
				{ key: 'b', value: '[[X]]', type: 'text' },
			]);
		});

		it('leaves an alias to a map resolving as before', () => {
			const props = parseFrontmatterProperties('---\nm: &m\n  k: v\nl: [*m]\nt: hi\n---\n');
			expect(props).toEqual([
				{ key: 'l', value: ['{"k":"v"}'], type: 'list' },
				{ key: 't', value: 'hi', type: 'text' },
			]);
		});

		it('resolves a later alias to the latest anchor, not to one inside a copied chain', () => {
			const props = parseFrontmatterProperties('---\na: &l [&y X]\nd: &y Z\nb: *l\nc: *y\n---\n');
			expect(props).toEqual([
				{ key: 'a', value: ['X'], type: 'list' },
				{ key: 'd', value: 'Z', type: 'text' },
				{ key: 'b', value: ['X'], type: 'list' },
				{ key: 'c', value: 'Z', type: 'text' },
			]);
		});

		// Inputs with no wikilink shape: aliases resolve the way `yaml.parse` resolves them.
		it.each([
			['an alias to a scalar', 'a: &x X\nb: *x', [['a', 'X'], ['b', 'X']]],
			['an alias to a number', 'a: &x 1\nb: *x', [['a', 1], ['b', 1]]],
			['a re-defined anchor', 'a: &x X\na2: &x Y\nb: *x', [['a', 'X'], ['a2', 'Y'], ['b', 'Y']]],
			['an anchor re-defined between aliases', 'a: &x X\nb: *x\nc: &x Y\nd: *x', [['a', 'X'], ['b', 'X'], ['c', 'Y'], ['d', 'Y']]],
			['an alias to a one-item list', 'a: &l [X]\nb: *l', [['a', ['X']], ['b', ['X']]]],
			['an alias to an anchor inside an aliased list', 'a: &l [&y X]\nb: *l\nc: *y', [['a', ['X']], ['b', ['X']], ['c', 'X']]],
			['two aliases in one list', 'a: &x X\nb: [*x, *x]', [['a', 'X'], ['b', ['X', 'X']]]],
			['an alias to a two-item list', 'a: &x [X, Y]\nb: *x', [['a', ['X', 'Y']], ['b', ['X', 'Y']]]],
			['an alias to an anchored key', '&k key: v\nb: *k', [['key', 'v'], ['b', 'key']]],
			['an alias to an anchored null', 'a: &x ~\nb: *x', [['a', ''], ['b', '']]],
			['an alias to an anchored empty value', 'a: &x\nb: *x', [['a', ''], ['b', '']]],
			['an alias to a map', 'm: &m {k: v}\nn: *m\nt: hi', [['t', 'hi']]],
			['an alias before its anchor', 'b: *x\na: &x X', []],
		] as const)('resolves %s like yaml.parse', (_name, yaml, expected) => {
			const values = parseFrontmatterProperties(`---\n${yaml}\n---\n`).map((p) => [p.key, p.value]);
			expect(values).toEqual(expected);
		});
	});

	// Copies of alias targets are capped (yaml's maxAliasCount does not count them), so a
	// crafted note cannot hang the parse; past the cap the note reads as unparseable.
	describe('alias copy budget', () => {
		// Counts the alias pass's work instead of timing it, so a loaded machine cannot
		// fail these. The pass may walk the input a few times and copy at most 10,000
		// nodes (each touched a few times); the pass before the budget walked the whole
		// document per alias and copied without a cap, far past the bound on these inputs.
		// The lower bound proves the pass ran on this input: a parse error before it
		// (yaml overflows its stack on a deep enough flow list) would leave 0 steps.
		const parseLinear = (lines: string[]) => {
			_resetParseFrontmatterCache();
			const yaml = lines.join('\n');
			const props = parseFrontmatterProperties(`---\n${yaml}\n---\n`);
			expect(_lastAliasPassSteps()).toBeGreaterThan(0);
			expect(_lastAliasPassSteps()).toBeLessThan(4 * (yaml.length + 10_000));
			return props;
		};

		it('resolves 5,000 aliases to one scalar in linear steps', () => {
			const props = parseLinear(['x: &x X', ...Array.from({ length: 5000 }, (_, i) => `k${i}: *x`)]);
			expect(props).toHaveLength(5001);
			expect(props[5000]).toEqual({ key: 'k4999', value: 'X', type: 'text' });
		});

		it('reads 50,000 aliases to one scalar as unparseable, in linear steps', () => {
			const props = parseLinear(['x: &x X', ...Array.from({ length: 50000 }, (_, i) => `k${i}: *x`)]);
			expect(props).toEqual([]);
		});

		it('reads 100 aliases to a depth-500 chain as unparseable, in linear steps', () => {
			const chain = `${'['.repeat(500)}X${']'.repeat(500)}`;
			const props = parseLinear([`x: &x ${chain}`, ...Array.from({ length: 100 }, (_, i) => `k${i}: *x`)]);
			expect(props).toEqual([]);
		});

		it('reads an alias chain of 600 lines as unparseable, in linear steps', () => {
			const props = parseLinear([
				'l0: &l0 X',
				...Array.from({ length: 600 }, (_, i) => `l${i + 1}: &l${i + 1} [*l${i}]`),
			]);
			expect(props).toEqual([]);
		});

		// A deep run of one-item lists that does not end in a scalar is not copied, so
		// sizing it must not cost a full walk per alias either.
		it('reads 50,000 aliases to a depth-500 non-chain target as unparseable, in linear steps', () => {
			const target = `${'['.repeat(500)}a, b${']'.repeat(500)}`;
			const props = parseLinear([`x: &x ${target}`, ...Array.from({ length: 50000 }, (_, i) => `k${i}: *x`)]);
			expect(props).toEqual([]);
		});

		it('resolves exactly 10,000 alias copies and reads 10,001 as unparseable', () => {
			const block = (n: number) =>
				`---\n${['x: &x X', ...Array.from({ length: n }, (_, i) => `k${i}: *x`)].join('\n')}\n---\n`;
			_resetParseFrontmatterCache();
			const atBudget = parseFrontmatterProperties(block(10000));
			expect(atBudget).toHaveLength(10001);
			expect(atBudget[10000]).toEqual({ key: 'k9999', value: 'X', type: 'text' });
			expect(parseFrontmatterProperties(block(10001))).toEqual([]);
		});
	});

	it('logs YAML warnings the way yaml.parse does', () => {
		_resetParseFrontmatterCache();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			const props = parseFrontmatterProperties('---\ntag: !foo bar\n---\n');
			expect(props).toEqual([{ key: 'tag', value: 'bar', type: 'text' }]);
			expect(warn).toHaveBeenCalledTimes(1);
			expect(String(warn.mock.calls[0][0])).toContain('!foo');
		} finally {
			warn.mockRestore();
		}
	});

	it('skips nested objects', () => {
		const content = '---\ntitle: Hello\nmeta:\n  author: Alice\n  version: 1\ntags: [a]\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props).toHaveLength(2);
		expect(props[0].key).toBe('title');
		expect(props[1].key).toBe('tags');
	});

	it('logs a warning when a nested mapping is dropped', () => {
		diagnosticsLog.mockClear();
		_resetParseFrontmatterCache();
		const content = '---\ntitle: Hello\nmeta:\n  author: Alice\n---\nBody';
		parseFrontmatterProperties(content);
		expect(diagnosticsLog).toHaveBeenCalledWith(
			'PROPERTIES',
			expect.stringContaining('dropped nested mapping value for key="meta"'),
		);
	});

	it('does not log when no nested mappings are present', () => {
		diagnosticsLog.mockClear();
		_resetParseFrontmatterCache();
		parseFrontmatterProperties('---\ntitle: Hello\ntags: [a, b]\n---\nBody');
		expect(diagnosticsLog).not.toHaveBeenCalled();
	});

	it('logs a dropped nested mapping and a key collision once, and nothing on a cache hit', () => {
		_resetParseFrontmatterCache();
		diagnosticsLog.mockClear();
		const content = '---\nmeta:\n  author: Alice\ncolor: red\n_color: blue\n---\nBody';
		parseFrontmatterProperties(content);
		expect(diagnosticsLog.mock.calls).toEqual([
			['PROPERTIES', expect.stringContaining('dropped nested mapping value for key="meta"')],
			['PROPERTIES', expect.stringContaining('canonical key collision on "_color"')],
		]);
		diagnosticsLog.mockClear();
		expect(parseFrontmatterProperties(content)).toEqual([{ key: '_color', value: 'red', type: 'text' }]);
		expect(diagnosticsLog).not.toHaveBeenCalled();
	});

	it('handles scientific notation as number', () => {
		const content = '---\nval: 1e5\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props[0]).toEqual({ key: 'val', value: 100000, type: 'number' });
	});

	it('handles quoted strings that look like numbers', () => {
		const content = '---\nzip: "90210"\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props[0]).toEqual({ key: 'zip', value: '90210', type: 'text' });
	});

	it('handles keys with special characters via quoting', () => {
		const content = '---\n"key: with colon": value\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props[0].key).toBe('key: with colon');
		expect(props[0].value).toBe('value');
	});

	it('handles duplicate keys (last wins)', () => {
		const content = '---\nkey: first\nkey: second\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props).toHaveLength(1);
		expect(props[0].value).toBe('second');
	});
});

describe('serializeProperties', () => {
	it('serializes multiple properties to YAML', () => {
		const props = [
			{ key: 'title', value: 'Hello', type: 'text' as const },
			{ key: 'count', value: 42, type: 'number' as const },
		];
		expect(serializeProperties(props)).toBe('title: Hello\ncount: 42');
	});

	it('returns empty string for empty properties', () => {
		expect(serializeProperties([])).toBe('');
	});

	it('canonicalizes alias keys on write (favorite -> _favorite, type -> _type)', () => {
		const props = [
			{ key: 'favorite', value: true, type: 'boolean' as const },
			{ key: 'icon', value: 'star', type: 'text' as const },
			{ key: 'type', value: 'person', type: 'text' as const },
		];
		expect(serializeProperties(props)).toBe('_favorite: true\n_icon: star\n_type: person');
	});

	it('leaves already-canonical keys unchanged', () => {
		const props = [
			{ key: '_favorite', value: true, type: 'boolean' as const },
			{ key: '_type', value: 'person', type: 'text' as const },
		];
		expect(serializeProperties(props)).toBe('_favorite: true\n_type: person');
	});

	it('merges an alias and its canonical twin, preferring the populated value', () => {
		// _color holds the real value; an empty `color` placeholder must not
		// clobber it via yaml last-wins.
		expect(
			serializeProperties([
				{ key: '_color', value: 'red', type: 'text' as const },
				{ key: 'color', value: '', type: 'text' as const },
			]),
		).toBe('_color: red');
	});

	it('prefers the populated twin regardless of operand order', () => {
		expect(
			serializeProperties([
				{ key: 'color', value: '', type: 'text' as const },
				{ key: '_color', value: 'red', type: 'text' as const },
			]),
		).toBe('_color: red');
	});

	it('does not log when an empty placeholder is merged into a populated twin', () => {
		diagnosticsLog.mockClear();
		serializeProperties([
			{ key: '_color', value: 'red', type: 'text' as const },
			{ key: 'color', value: '', type: 'text' as const },
		]);
		expect(diagnosticsLog).not.toHaveBeenCalled();
	});

	it('keeps the first value and logs when both twins are populated (no silent loss)', () => {
		diagnosticsLog.mockClear();
		const result = serializeProperties([
			{ key: '_color', value: 'red', type: 'text' as const },
			{ key: 'color', value: 'blue', type: 'text' as const },
		]);
		expect(result).toBe('_color: red');
		expect(diagnosticsLog).toHaveBeenCalledWith(
			'PROPERTIES',
			expect.stringContaining('canonical key collision'),
		);
	});
});

describe('setPropertyByBindTarget', () => {
	it('updates the canonical twin in place when the bind target is an alias', () => {
		// Existing canonical `_favorite`; a `favorite` bind target must update it,
		// not append a duplicate that collapses on serialize.
		const props = [{ key: '_favorite', value: 'false', type: 'text' as const }];
		const result = setPropertyByBindTarget(props, 'favorite', 'true');
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({ key: '_favorite', value: 'true', type: 'text' });
	});

	it('updates an existing property addressed by its canonical key and preserves its type', () => {
		const props = [{ key: '_favorite', value: 'false', type: 'boolean' as const }];
		const result = setPropertyByBindTarget(props, '_favorite', 'true');
		expect(result).toHaveLength(1);
		expect(result[0].value).toBe('true');
		expect(result[0].type).toBe('boolean');
	});

	it('appends a new text property when no twin exists', () => {
		const props = [{ key: 'title', value: 'Hi', type: 'text' as const }];
		const result = setPropertyByBindTarget(props, 'status', 'done');
		expect(result).toHaveLength(2);
		expect(result[1]).toEqual({ key: 'status', value: 'done', type: 'text' });
	});

	it('does not mutate the input array', () => {
		const props = [{ key: '_favorite', value: 'false', type: 'text' as const }];
		setPropertyByBindTarget(props, 'favorite', 'true');
		expect(props[0].value).toBe('false');
	});

	it('a number value sets the number type, on an existing and on a new property', () => {
		const props = [{ key: 'count', value: '5', type: 'text' as const }];
		expect(setPropertyByBindTarget(props, 'count', 7)).toEqual([{ key: 'count', value: 7, type: 'number' }]);
		expect(setPropertyByBindTarget([], 'count', 7)).toEqual([{ key: 'count', value: 7, type: 'number' }]);
	});

	it('a boolean value sets the boolean type, on an existing and on a new property', () => {
		const props = [{ key: '_archived', value: 'false', type: 'text' as const }];
		expect(setPropertyByBindTarget(props, 'archived', true)).toEqual([{ key: '_archived', value: true, type: 'boolean' }]);
		expect(setPropertyByBindTarget([], 'done', false)).toEqual([{ key: 'done', value: false, type: 'boolean' }]);
	});

	it('writing through an alias updates the canonical key and adds no alias key', () => {
		const props = [{ key: '_archived', value: false, type: 'boolean' as const }];
		const result = setPropertyByBindTarget(props, 'archived', true);
		expect(result.map((p) => p.key)).toEqual(['_archived']);
		expect(serializeProperties(result)).toBe('_archived: true');
	});
});

describe('typedOptionValue', () => {
	it.each([
		['true', true],
		['false', false],
		['1', 1],
		['-2', -2],
		['1.5', 1.5],
		['0', 0],
	])('types %j', (option, expected) => {
		expect(typedOptionValue(option)).toBe(expected);
	});

	it.each(['yes', 'no', 'on', 'True', '007', '1.50', '1e3', '-0', '+1', ' 1', 'NaN', 'Infinity', '12345678901234567890', 'abc', ''])(
		'keeps %j a string',
		(option) => {
			expect(typedOptionValue(option)).toBe(option);
		},
	);
});

/**
 * Snapshot tests for the canonical serialization form documented in
 * ADR 0029. Each test asserts the exact byte sequence emitted by
 * serializeProperties for a property shape the Python generator at
 * koko.brain-os/vault/work/people/_generate.py must match. If any of
 * these break, either the canonical form has shifted (intentional —
 * update both this file and the generator) or yaml@2.9.1 has changed
 * (unintentional — re-pin or fix the predicate). Either way the test
 * file is the source of truth.
 */
describe('canonical form snapshot (serializeProperties)', () => {
	it('emits emails bare (mid-string @ does not quote)', () => {
		expect(
			serializeProperties([{ key: 'email', value: 'foo@bar.com', type: 'text' }]),
		).toBe('email: foo@bar.com');
	});

	it('emits URN-style values bare (mid-string : does not quote)', () => {
		expect(
			serializeProperties([
				{ key: 'ident_id', value: 'urn:example:identity:uuid:abc', type: 'text' },
			]),
		).toBe('ident_id: urn:example:identity:uuid:abc');
	});

	it('emits wikilinks with double quotes (leading [ forces quote)', () => {
		expect(
			serializeProperties([{ key: '_belongs_to', value: '[[Foo-Bar]]', type: 'text' }]),
		).toBe('_belongs_to: "[[Foo-Bar]]"');
	});

	it('emits wikilinks inside lists with double quotes', () => {
		expect(
			serializeProperties([
				{ key: 'related', value: ['[[A]]', '[[B-C]]'], type: 'list' },
			]),
		).toBe('related: ["[[A]]", "[[B-C]]"]');
	});

	it('emits empty text values as the empty double-quoted string', () => {
		expect(
			serializeProperties([
				{ key: 'end_at', value: '', type: 'text' },
				{ key: 'expire_at', value: '', type: 'text' },
			]),
		).toBe('end_at: ""\nexpire_at: ""');
	});

	it('emits lists in flow style with comma+space separator', () => {
		expect(
			serializeProperties([{ key: 'tags', value: ['a', 'b', 'c'], type: 'list' }]),
		).toBe('tags: [a, b, c]');
	});

	it('emits an empty list as []', () => {
		expect(
			serializeProperties([{ key: 'tags', value: [], type: 'list' }]),
		).toBe('tags: []');
	});

	it('quotes string values that look like reserved literals', () => {
		expect(
			serializeProperties([
				{ key: 'a', value: 'true', type: 'text' },
				{ key: 'b', value: 'false', type: 'text' },
				{ key: 'c', value: 'null', type: 'text' },
				{ key: 'd', value: 'TRUE', type: 'text' },
				{ key: 'e', value: '~', type: 'text' },
			]),
		).toBe('a: "true"\nb: "false"\nc: "null"\nd: "TRUE"\ne: "~"');
	});

	it('emits yes/no/on/off as bare strings (not reserved in YAML 1.2 core)', () => {
		expect(
			serializeProperties([
				{ key: 'a', value: 'yes', type: 'text' },
				{ key: 'b', value: 'no', type: 'text' },
				{ key: 'c', value: 'on', type: 'text' },
				{ key: 'd', value: 'off', type: 'text' },
			]),
		).toBe('a: yes\nb: no\nc: on\nd: off');
	});

	it('emits native booleans bare and number-looking strings quoted', () => {
		expect(
			serializeProperties([
				{ key: 'flag', value: true, type: 'boolean' },
				{ key: 'count_str', value: '42', type: 'text' },
				{ key: 'count_num', value: 42, type: 'number' },
			]),
		).toBe('flag: true\ncount_str: "42"\ncount_num: 42');
	});

	it('preserves the input key order', () => {
		const props = [
			{ key: 'type', value: 'person', type: 'text' as const },
			{ key: '_organized', value: 'true', type: 'text' as const },
			{ key: '_archived', value: 'false', type: 'text' as const },
			{ key: '_favorite', value: true, type: 'boolean' as const },
			{ key: 'created', value: '2026-05-31', type: 'date' as const },
			{ key: 'name', value: 'Diego', type: 'text' as const },
		];
		expect(serializeProperties(props)).toBe(
			'_type: person\n_organized: "true"\n_archived: "false"\n_favorite: true\ncreated: 2026-05-31\nname: Diego',
		);
	});

	it('emits a realistic person-note frontmatter matching the canonical form', () => {
		const props = [
			{ key: 'type', value: 'person', type: 'text' as const },
			{ key: '_organized', value: 'true', type: 'text' as const },
			{ key: '_archived', value: 'false', type: 'text' as const },
			{ key: 'created', value: '2026-05-31', type: 'date' as const },
			{ key: 'name', value: 'Jane Doe', type: 'text' as const },
			{ key: 'email', value: 'jane.doe@example.com', type: 'text' as const },
			{
				key: 'ident_id',
				value: 'urn:example:identity:uuid:00000000-0000-0000-0000-000000000000',
				type: 'text' as const,
			},
			{ key: 'end_at', value: '', type: 'text' as const },
			{ key: 'expire_at', value: '', type: 'text' as const },
			{ key: '_belongs_to', value: '[[Some-Team]]', type: 'text' as const },
			{ key: '_reports_to', value: '[[John-Smith]]', type: 'text' as const },
		];
		const expected = [
			'_type: person',
			'_organized: "true"',
			'_archived: "false"',
			'created: 2026-05-31',
			'name: Jane Doe',
			'email: jane.doe@example.com',
			'ident_id: urn:example:identity:uuid:00000000-0000-0000-0000-000000000000',
			'end_at: ""',
			'expire_at: ""',
			'_belongs_to: "[[Some-Team]]"',
			'_reports_to: "[[John-Smith]]"',
		].join('\n');
		expect(serializeProperties(props)).toBe(expected);
	});
});

describe('serialize — backslash and quote sequences (yaml-quoting integration)', () => {
	// Mid-string backslashes and double quotes do NOT trigger quoting in
	// yaml@2.9.1 mapping-value context — they are emitted bare and re-parse
	// to the same scalar. Leading quote characters DO force quoting.
	it('emits a mid-string double quote bare', () => {
		expect(
			serializeProperties([{ key: 'desc', value: 'say "hello"', type: 'text' }]),
		).toBe('desc: say "hello"');
	});

	it('emits a mid-string backslash bare', () => {
		expect(
			serializeProperties([{ key: 'path', value: 'back\\slash', type: 'text' }]),
		).toBe('path: back\\slash');
	});

	it('emits a backslash+quote sequence bare', () => {
		expect(
			serializeProperties([{ key: 'desc', value: 'a\\"b', type: 'text' }]),
		).toBe('desc: a\\"b');
	});

	it('emits Windows-style double-backslash paths bare', () => {
		expect(
			serializeProperties([{ key: 'path', value: 'C:\\\\path\\\\to', type: 'text' }]),
		).toBe('path: C:\\\\path\\\\to');
	});

	it('quotes a value starting with a double quote (single-quote emission)', () => {
		expect(
			serializeProperties([{ key: 'desc', value: '"quoted at start', type: 'text' }]),
		).toBe("desc: '\"quoted at start'");
	});

	it('quotes a value starting with a single quote (double-quote emission)', () => {
		expect(
			serializeProperties([{ key: 'desc', value: "'single at start", type: 'text' }]),
		).toBe('desc: "\'single at start"');
	});

	it('round-trips backslash+quote sequences through serialize → parse', () => {
		const values = [
			'say "hello"',
			'back\\slash',
			'a\\"b',
			'\\"',
			'C:\\\\path\\\\to',
			'\\\\server\\\\share',
			"it's quoted",
			'both \' and "',
			'"leading quote',
			"'leading single",
		];
		for (const value of values) {
			const props = [{ key: 'v', value, type: 'text' as const }];
			const content = rebuildContent(props, 'Body');
			const reparsed = parseFrontmatterProperties(content);
			expect(reparsed).toHaveLength(1);
			expect(reparsed[0].value).toBe(value);
		}
	});

	it('round-trips list items containing backslashes and quotes', () => {
		const value = ['say "hello"', 'back\\slash', 'a,\\"b'];
		const props = [{ key: 'items', value, type: 'list' as const }];
		const content = rebuildContent(props, 'Body');
		const reparsed = parseFrontmatterProperties(content);
		expect(reparsed[0]).toEqual({ key: 'items', value, type: 'list' });
	});
});

describe('yamlScalar', () => {
	it('keeps a value that reads back as itself plain', () => {
		expect(yamlScalar('Handbook')).toBe('Handbook');
		expect(yamlScalar('com.google.Chrome')).toBe('com.google.Chrome');
		expect(yamlScalar('https://example.com/a?b=c#d')).toBe('https://example.com/a?b=c#d');
	});

	it('quotes the spelling serializeProperties writes for the same string', () => {
		expect(yamlScalar('Clean Code: A Handbook')).toBe('"Clean Code: A Handbook"');
		expect(serializeProperties([{ key: 'title', value: 'Clean Code: A Handbook', type: 'text' }])).toBe(
			`title: ${yamlScalar('Clean Code: A Handbook')}`,
		);
	});

	it('writes every value on one line that reads back unchanged as a string', () => {
		const values = [
			'How to X: a guide',
			'Release notes #12',
			'[draft] notes',
			'say "hi" twice',
			'"quoted"',
			'*bold',
			'& co',
			'! bang',
			'> quote',
			'@user',
			"it's",
			'- dash',
			'1984',
			'true',
			'null',
			' padded ',
			'line one\nline two',
			'back\\slash',
		];
		for (const value of values) {
			const scalar = yamlScalar(value);
			expect(scalar).not.toContain('\n');
			expect(yamlParse(`k: ${scalar}`)).toEqual({ k: value });
		}
	});

	it('writes an empty string as an empty quoted scalar', () => {
		expect(yamlScalar('')).toBe('""');
	});
});

describe('rebuildContent', () => {
	it('builds content with frontmatter and body', () => {
		const props = [{ key: 'title', value: 'Hello', type: 'text' as const }];
		const result = rebuildContent(props, 'Body text');
		expect(result).toBe('---\ntitle: Hello\n---\nBody text');
	});

	it('returns just body when no properties', () => {
		expect(rebuildContent([], 'Body text')).toBe('Body text');
	});

	it('returns empty string when no properties and no body', () => {
		expect(rebuildContent([], '')).toBe('');
	});

	it('builds content with only frontmatter when body is empty', () => {
		const props = [{ key: 'title', value: 'Hello', type: 'text' as const }];
		expect(rebuildContent(props, '')).toBe('---\ntitle: Hello\n---\n');
	});

	it('preserves complex body content', () => {
		const props = [{ key: 'title', value: 'Note', type: 'text' as const }];
		const body = '# Heading\n\nParagraph with **bold** and `code`.\n\n- item 1\n- item 2';
		const result = rebuildContent(props, body);
		expect(result).toContain('---\ntitle: Note\n---\n');
		expect(result).toContain(body);
	});

	describe('with the original content', () => {
		const SPELLINGS = [
			'id: 0042',
			'version: 1.0',
			'price: 9.90',
			'mask: 0x1F',
			'perm: 0o17',
			'exp: 1e3',
			'neg: -0',
			'done: True',
			'up: TRUE',
			'off: False',
			'no: FALSE',
		];
		const original = `---\ntitle: Note\n${SPELLINGS.join('\n')}\n---\nBody\n`;

		it('keeps every unchanged number and boolean spelled as in the source', () => {
			const props = parseFrontmatterProperties(original);
			const next = [...props, { key: '_favorite', value: true, type: 'boolean' as const }];
			expect(rebuildContent(next, extractBody(original), original)).toBe(
				`---\ntitle: Note\n${SPELLINGS.join('\n')}\n_favorite: true\n---\nBody\n`,
			);
		});

		it('round-trips the original byte for byte when nothing changed', () => {
			const props = parseFrontmatterProperties(original);
			expect(rebuildContent(props, extractBody(original), original)).toBe(original);
		});

		it('writes a changed value in canonical form', () => {
			const props = updatePropertyValue(parseFrontmatterProperties(original), 'version', 2);
			const flipped = updatePropertyValue(props, 'done', false);
			const result = rebuildContent(flipped, extractBody(original), original);
			expect(result).toContain('\nversion: 2\n');
			expect(result).toContain('\ndone: false\n');
			expect(result).toContain('\nprice: 9.90\n');
		});

		it('writes a value whose type changed to a string in canonical form', () => {
			const content = '---\nzip: 01234\n---\n';
			const props = updatePropertyValue(parseFrontmatterProperties(content), 'zip', '1234');
			expect(rebuildContent(props, '', content)).toBe('---\nzip: "1234"\n---\n');
		});

		it('keeps the source token under the canonical key of an alias', () => {
			const content = '---\nfavorite: True\n---\n';
			const props = parseFrontmatterProperties(content);
			expect(rebuildContent(props, '', content)).toBe('---\n_favorite: True\n---\n');
		});

		it('keeps an unchanged NaN spelled as in the source', () => {
			const content = '---\nx: .NaN\n---\n';
			const props = parseFrontmatterProperties(content);
			expect(rebuildContent(props, '', content)).toBe(content);
		});

		it('leaves quoted scalars and strings in their canonical form', () => {
			const content = "---\nzip: '01234'\nname: 'Ana'\n---\n";
			const props = parseFrontmatterProperties(content);
			expect(rebuildContent(props, '', content)).toBe('---\nzip: "01234"\nname: Ana\n---\n');
		});

		it('serializes as before when the original has no frontmatter or does not parse', () => {
			const props = [{ key: 'id', value: 42, type: 'number' as const }];
			expect(rebuildContent(props, 'Body', 'Body')).toBe(rebuildContent(props, 'Body'));
			expect(rebuildContent(props, '', '---\nid: [0042\n---\n')).toBe('---\nid: 42\n---\n');
		});
	});
});

describe('addProperty', () => {
	it('adds a new text property', () => {
		const props = [{ key: 'title', value: 'Hello', type: 'text' as const }];
		const result = addProperty(props, 'author');
		expect(result).toHaveLength(2);
		expect(result[1]).toEqual({ key: 'author', value: '', type: 'text' });
	});

	it('does not mutate original array', () => {
		const props = [{ key: 'title', value: 'Hello', type: 'text' as const }];
		const result = addProperty(props, 'author');
		expect(props).toHaveLength(1);
		expect(result).toHaveLength(2);
	});

	it('adds to empty array', () => {
		const result = addProperty([], 'title');
		expect(result).toHaveLength(1);
		expect(result[0].key).toBe('title');
	});
});

describe('removeProperty', () => {
	it('removes a property by key', () => {
		const props = [
			{ key: 'title', value: 'Hello', type: 'text' as const },
			{ key: 'author', value: 'Alice', type: 'text' as const },
		];
		const result = removeProperty(props, 'title');
		expect(result).toHaveLength(1);
		expect(result[0].key).toBe('author');
	});

	it('does not mutate original array', () => {
		const props = [{ key: 'title', value: 'Hello', type: 'text' as const }];
		const result = removeProperty(props, 'title');
		expect(props).toHaveLength(1);
		expect(result).toHaveLength(0);
	});

	it('returns same array when key not found', () => {
		const props = [{ key: 'title', value: 'Hello', type: 'text' as const }];
		const result = removeProperty(props, 'nonexistent');
		expect(result).toHaveLength(1);
	});
});

describe('updatePropertyValue', () => {
	it('updates a property value', () => {
		const props = [{ key: 'title', value: 'Hello', type: 'text' as const }];
		const result = updatePropertyValue(props, 'title', 'World');
		expect(result[0].value).toBe('World');
	});

	it('updates value and type', () => {
		const props = [{ key: 'tags', value: 'single', type: 'text' as const }];
		const result = updatePropertyValue(props, 'tags', ['a', 'b'], 'list');
		expect(result[0].value).toEqual(['a', 'b']);
		expect(result[0].type).toBe('list');
	});

	it('does not mutate original array', () => {
		const props = [{ key: 'title', value: 'Hello', type: 'text' as const }];
		updatePropertyValue(props, 'title', 'World');
		expect(props[0].value).toBe('Hello');
	});

	it('leaves other properties unchanged', () => {
		const props = [
			{ key: 'title', value: 'Hello', type: 'text' as const },
			{ key: 'author', value: 'Alice', type: 'text' as const },
		];
		const result = updatePropertyValue(props, 'title', 'World');
		expect(result[1].value).toBe('Alice');
	});
});

describe('renamePropertyKey', () => {
	it('renames a property key', () => {
		const props = [{ key: 'title', value: 'Hello', type: 'text' as const }];
		const result = renamePropertyKey(props, 'title', 'heading');
		expect(result[0].key).toBe('heading');
		expect(result[0].value).toBe('Hello');
	});

	it('returns same properties when old and new key are equal', () => {
		const props = [{ key: 'title', value: 'Hello', type: 'text' as const }];
		const result = renamePropertyKey(props, 'title', 'title');
		expect(result).toBe(props);
	});

	it('does not mutate original array', () => {
		const props = [{ key: 'title', value: 'Hello', type: 'text' as const }];
		renamePropertyKey(props, 'title', 'heading');
		expect(props[0].key).toBe('title');
	});
});

describe('round-trip: parse → serialize → rebuild', () => {
	it('preserves simple frontmatter through round-trip', () => {
		const original = '---\ntitle: My Note\ncount: 42\npublished: true\n---\nBody text';
		const props = parseFrontmatterProperties(original);
		const body = extractBody(original);
		const rebuilt = rebuildContent(props, body);
		expect(rebuilt).toBe(original);
	});

	it('preserves inline list through round-trip', () => {
		const original = '---\ntags: [a, b, c]\n---\nBody';
		const props = parseFrontmatterProperties(original);
		const body = extractBody(original);
		const rebuilt = rebuildContent(props, body);
		expect(rebuilt).toBe(original);
	});

	it('handles content with no frontmatter', () => {
		const original = 'Just body text';
		const props = parseFrontmatterProperties(original);
		const body = extractBody(original);
		const rebuilt = rebuildContent(props, body);
		expect(rebuilt).toBe(original);
	});

	it('preserves dotted keys through round-trip', () => {
		const original = '---\nplugin.version: 1.5\ntitle: Hello\n---\nBody';
		const props = parseFrontmatterProperties(original);
		const body = extractBody(original);
		const rebuilt = rebuildContent(props, body);
		expect(rebuilt).toBe(original);
	});

	it('preserves block scalar (|) through round-trip', () => {
		const original = '---\ndesc: |\n  Line one\n  Line two\n---\nBody';
		const props = parseFrontmatterProperties(original);
		const body = extractBody(original);
		const rebuilt = rebuildContent(props, body);
		expect(rebuilt).toBe(original);
	});

	it('preserves semantic content after edit cycle', () => {
		const original = '---\ntitle: Hello\ncount: 42\ntags: [a, b]\n---\nBody';
		const props = parseFrontmatterProperties(original);
		const body = extractBody(original);

		const updated = updatePropertyValue(props, 'title', 'World');
		const rebuilt = rebuildContent(updated, body);

		const reparsed = parseFrontmatterProperties(rebuilt);
		expect(reparsed[0]).toEqual({ key: 'title', value: 'World', type: 'text' });
		expect(reparsed[1]).toEqual({ key: 'count', value: 42, type: 'number' });
		expect(reparsed[2]).toEqual({ key: 'tags', value: ['a', 'b'], type: 'list' });
	});
});

describe('parseFrontmatterProperties on a self-referencing alias', () => {
	it('returns [] instead of throwing, and detectLossyFrontmatter refuses it', () => {
		_resetParseFrontmatterCache();
		const content = '---\na: &x [*x]\nb: ok\n---\nBody';
		expect(parseFrontmatterProperties(content)).toEqual([]);
		expect(detectLossyFrontmatter(content)).not.toBeNull();
	});
});

describe('detectLossyFrontmatter', () => {
	const note = (yaml: string) => `---\n${yaml}\n---\nBody`;

	describe('refuses', () => {
		it('a list of maps as nested', () => {
			expect(detectLossyFrontmatter(note('items:\n  - name: a\n  - name: b'))).toBe('nested');
		});

		it('a nested list as nested', () => {
			expect(detectLossyFrontmatter(note('grid: [[1, 2], [3, 4]]'))).toBe('nested');
		});

		it('a map under a top-level key as nested', () => {
			expect(detectLossyFrontmatter(note('meta:\n  author: Alice'))).toBe('nested');
		});

		it('a collection key as nested', () => {
			expect(detectLossyFrontmatter(note('? [a, b]\n: value'))).toBe('nested');
		});

		it('the same key twice as duplicate-keys', () => {
			expect(detectLossyFrontmatter(note('a: 1\na: 1'))).toBe('duplicate-keys');
		});

		it('an alias and its canonical twin both set as alias-collision', () => {
			expect(detectLossyFrontmatter(note('color: blue\n_color: red'))).toBe('alias-collision');
		});

		it('two aliases of one canonical key both set as alias-collision', () => {
			expect(detectLossyFrontmatter(note('sidebar_label: A\nsidebar label: B'))).toBe(
				'alias-collision',
			);
		});

		it('an anchor and its alias as anchors', () => {
			expect(detectLossyFrontmatter(note('base: &x value\nref: *x'))).toBe('anchors');
		});

		it('an anchor alone as anchors', () => {
			expect(detectLossyFrontmatter(note('base: &x value'))).toBe('anchors');
		});

		it('a comment line as comments', () => {
			expect(detectLossyFrontmatter(note('# managed by script\ntitle: Hello'))).toBe('comments');
		});

		it('a trailing comment as comments', () => {
			expect(detectLossyFrontmatter(note('title: Hello # keep me'))).toBe('comments');
		});

		it('a comment between keys and at the end as comments', () => {
			expect(detectLossyFrontmatter(note('a: 1\n# mid\nb: 2'))).toBe('comments');
			expect(detectLossyFrontmatter(note('a: 1\n# end'))).toBe('comments');
		});

		it('a comment inside a flow list as comments', () => {
			expect(detectLossyFrontmatter(note('tags: [a, # x\n  b]'))).toBe('comments');
		});

		it('a comment-only block as comments', () => {
			expect(detectLossyFrontmatter(note('# just a note'))).toBe('comments');
		});

		it('invalid YAML as unparseable', () => {
			expect(detectLossyFrontmatter(note('a: [1, 2'))).toBe('unparseable');
		});

		it('a scalar root as unparseable', () => {
			expect(detectLossyFrontmatter(note('just text'))).toBe('unparseable');
		});

		it('a sequence root as unparseable', () => {
			expect(detectLossyFrontmatter(note('- a\n- b'))).toBe('unparseable');
		});

		it('a null key next to an empty-string key as duplicate-keys', () => {
			expect(detectLossyFrontmatter(note('~: 1\n"": 2'))).toBe('duplicate-keys');
		});

		it('an integer beyond the safe range as unparseable', () => {
			expect(detectLossyFrontmatter(note('id: 12345678901234567890'))).toBe('unparseable');
		});

		it('an unresolved custom tag as unparseable', () => {
			expect(detectLossyFrontmatter(note('a: !custom value'))).toBe('unparseable');
		});

		it('the first reason in precedence order when a block has several', () => {
			expect(detectLossyFrontmatter(note('# c\na: 1\na: 2'))).toBe('comments');
			expect(detectLossyFrontmatter(note('meta:\n  x: &y 1 # c'))).toBe('nested');
			expect(detectLossyFrontmatter(note('a: &x 1\nb: *x\nb: 2'))).toBe('duplicate-keys');
		});
	});

	describe('accepts (returns null)', () => {
		it('a # inside a quoted string', () => {
			expect(detectLossyFrontmatter(note('location: "Room #4"\nnote: \'a # b\''))).toBeNull();
		});

		it('an empty alias next to a populated canonical twin', () => {
			expect(detectLossyFrontmatter(note("color: ''\n_color: red"))).toBeNull();
		});

		it('an empty list or null alias next to a populated twin', () => {
			expect(detectLossyFrontmatter(note('color: []\n_color: red'))).toBeNull();
			expect(detectLossyFrontmatter(note('_color: red\ncolor:'))).toBeNull();
		});

		it('a flow list of mixed scalars', () => {
			expect(detectLossyFrontmatter(note('vals: [1, true]'))).toBeNull();
		});

		it('key: null and an empty key', () => {
			expect(detectLossyFrontmatter(note('a: null\nb:'))).toBeNull();
		});

		it('the largest safe integer', () => {
			expect(detectLossyFrontmatter(note('id: 9007199254740991'))).toBeNull();
		});

		it('a block scalar', () => {
			expect(detectLossyFrontmatter(note('desc: |\n  Line one\n  Line two'))).toBeNull();
		});

		it('a lone alias key and a quoted value', () => {
			expect(detectLossyFrontmatter(note("favorite: true\ntitle: 'Hello'"))).toBeNull();
		});

		it('an empty block', () => {
			expect(detectLossyFrontmatter('---\n\n---\nBody')).toBeNull();
			expect(detectLossyFrontmatter('---\n  \n---\nBody')).toBeNull();
		});

		it('absent frontmatter', () => {
			expect(detectLossyFrontmatter('Just body text')).toBeNull();
			expect(detectLossyFrontmatter('')).toBeNull();
		});
	});
});

describe('round-trip fixtures: detectLossyFrontmatter reason list is complete', () => {
	/** True for the values `dedupeCanonicalKeys` treats as placeholders. */
	const isEmpty = (v: unknown) => v === '' || (Array.isArray(v) && v.length === 0);

	/**
	 * Applies only the ADR-0029 canonical coercions: null becomes `""`, list
	 * items become strings, alias keys become canonical (a placeholder loses to
	 * a populated twin). Quote style is invisible after a parse.
	 */
	function normalizeAccepted(parsed: unknown): Record<string, unknown> {
		const out = new Map<string, unknown>();
		for (const [rawKey, raw] of Object.entries((parsed ?? {}) as Record<string, unknown>)) {
			const key = canonicalizeKey(rawKey);
			const value =
				raw === null
					? ''
					: Array.isArray(raw)
						? raw.map((item) => (item === null ? '' : String(item)))
						: raw;
			if (!out.has(key) || (isEmpty(out.get(key)) && !isEmpty(value))) out.set(key, value);
		}
		return Object.fromEntries(out);
	}

	const fixtures: { name: string; content: string; reason: string | null }[] = [
		{ name: 'absent frontmatter', content: 'Body only', reason: null },
		{ name: 'empty block', content: '---\n\n---\nBody', reason: null },
		{
			name: 'event note',
			content:
				'---\n_type: event\nevent_title: Standup\ndate: 2026-11-10\nstart: 09:30\nend: 10:00\nall_day: false\nlocation: "Room #4"\nevent_color: blue\n---\nNotes',
			reason: null,
		},
		{ name: 'empty template keys', content: '---\nlocation:\nend: null\ntags: []\n---\n', reason: null },
		{ name: 'mixed scalar list', content: '---\nvals: [1, true, 2026-01-01, ~]\n---\n', reason: null },
		{ name: 'block list', content: '---\ntags:\n  - a\n  - b\n---\n', reason: null },
		{ name: 'alias keys', content: '---\ntype: person\nfavorite: true\nicon: star\n---\n', reason: null },
		{ name: 'placeholder alias twin', content: "---\ncolor: ''\n_color: red\n---\n", reason: null },
		{ name: 'quote styles', content: "---\na: 'single'\nb: \"double\"\nc: '42'\n---\n", reason: null },
		{ name: 'numbers', content: '---\nn: 42\nf: 3.5\nh: 0x1F\nneg: -7\n---\n', reason: null },
		{ name: 'block scalars', content: '---\nkeep: |\n  a\n  b\nfold: >-\n  c\n  d\n---\n', reason: null },
		{ name: 'url and wikilink', content: '---\nurl: https://x.io/a#b\nlink: "[[Note]]"\n---\n', reason: null },
		{ name: 'list of maps', content: '---\nitems:\n  - name: a\n---\n', reason: 'nested' },
		{ name: 'nested list', content: '---\ngrid: [[1, 2]]\n---\n', reason: 'nested' },
		{ name: 'nested map', content: '---\nmeta:\n  author: A\n---\n', reason: 'nested' },
		{ name: 'comment line', content: '---\n# hi\na: 1\n---\n', reason: 'comments' },
		{ name: 'trailing comment', content: '---\na: 1 # hi\n---\n', reason: 'comments' },
		{ name: 'duplicate key', content: '---\na: 1\na: 2\n---\n', reason: 'duplicate-keys' },
		{ name: 'alias collision', content: '---\ncolor: blue\n_color: red\n---\n', reason: 'alias-collision' },
		{ name: 'anchors', content: '---\na: &x 1\nb: *x\n---\n', reason: 'anchors' },
		{ name: 'unparseable', content: '---\na: [1\n---\n', reason: 'unparseable' },
	];

	for (const f of fixtures) {
		it(`${f.name}: reason is ${f.reason ?? 'null'}`, () => {
			expect(detectLossyFrontmatter(f.content)).toBe(f.reason);
		});

		if (f.reason !== null) continue;

		it(`${f.name}: round trip loses nothing beyond the accepted coercions`, () => {
			_resetParseFrontmatterCache();
			const original = yamlParse(extractRawFrontmatter(f.content) ?? '');
			const rewritten = yamlParse(serializeProperties(parseFrontmatterProperties(f.content)));
			expect(rewritten ?? {}).toEqual(normalizeAccepted(original));
		});
	}
});

describe('frontmatter alias normalization', () => {
	it('normalizes type to _type', () => {
		const content = '---\ntype: person\n---\n';
		const props = parseFrontmatterProperties(content);
		expect(props[0]).toEqual({ key: '_type', value: 'person', type: 'text' });
	});

	it('does not alias the dropped is_a / is a spellings', () => {
		const content = '---\nis_a: person\nis a: place\n---\n';
		const props = parseFrontmatterProperties(content);
		expect(props.find((p) => p.key === '_type')).toBeUndefined();
		expect(props.find((p) => p.key === 'is_a')?.value).toBe('person');
		expect(props.find((p) => p.key === 'is a')?.value).toBe('place');
	});

	it('normalizes space-separated aliases', () => {
		const content = '---\nsidebar label: Places\n---\n';
		const props = parseFrontmatterProperties(content);
		expect(props.find((p) => p.key === '_sidebar_label')?.value).toBe('Places');
	});

	it('does not alias relationship keys', () => {
		// Relationship fields are underscore-canonical and take no alias:
		// the bare/space spellings stay verbatim.
		const content = '---\nbelongs to: geography\nrelated_to: maps\n---\n';
		const props = parseFrontmatterProperties(content);
		expect(props.find((p) => p.key === 'belongs_to')).toBeUndefined();
		expect(props.find((p) => p.key === '_belongs_to')).toBeUndefined();
		expect(props.find((p) => p.key === 'belongs to')?.value).toBe('geography');
		expect(props.find((p) => p.key === 'related_to')?.value).toBe('maps');
	});

	it('normalizes underscore-prefixed system keys', () => {
		const content = '---\nicon: rocket\nfavorite: true\norder: 5\n---\n';
		const props = parseFrontmatterProperties(content);
		expect(props.find((p) => p.key === '_icon')?.value).toBe('rocket');
		expect(props.find((p) => p.key === '_favorite')?.value).toBe(true);
		expect(props.find((p) => p.key === '_order')?.value).toBe(5);
	});

	it('leaves non-aliased keys unchanged', () => {
		const content = '---\ntitle: Hello\ntags: [a, b]\n---\n';
		const props = parseFrontmatterProperties(content);
		expect(props[0].key).toBe('title');
		expect(props[1].key).toBe('tags');
	});

	it('leaves already-canonical keys unchanged', () => {
		const content = '---\n_icon: star\n_type: note\n---\n';
		const props = parseFrontmatterProperties(content);
		expect(props.find((p) => p.key === '_icon')?.value).toBe('star');
		expect(props.find((p) => p.key === '_type')?.value).toBe('note');
	});
});

describe('extractWikilinks', () => {
	it('extracts single wikilink from string', () => {
		expect(extractWikilinks('[[My Note]]')).toEqual(['My Note']);
	});

	it('extracts multiple wikilinks', () => {
		expect(extractWikilinks('[[A]] and [[B]]')).toEqual(['A', 'B']);
	});

	it('extracts from array values', () => {
		expect(extractWikilinks(['[[A]]', '[[B]]'])).toEqual(['A', 'B']);
	});

	it('preserves alias syntax', () => {
		expect(extractWikilinks('[[target|display]]')).toEqual(['target|display']);
	});

	it('returns empty for no wikilinks', () => {
		expect(extractWikilinks('plain text')).toEqual([]);
	});

	it('returns empty for null/undefined', () => {
		expect(extractWikilinks(null)).toEqual([]);
		expect(extractWikilinks(undefined)).toEqual([]);
	});

	it('handles number and boolean values', () => {
		expect(extractWikilinks(42)).toEqual([]);
		expect(extractWikilinks(true)).toEqual([]);
	});
});

describe('resolveRelationshipLinks', () => {
	const paths = ['/vault/Alpha.md', '/vault/sub/Beta.md'];
	const resolve = (target: string, allPaths: string[]) =>
		allPaths.find((p) => p.endsWith(`/${target}.md`)) ?? null;

	it('resolves simple wikilink', () => {
		const result = resolveRelationshipLinks('[[Alpha]]', paths, resolve);
		expect(result).toEqual([{ raw: 'Alpha', display: 'Alpha', resolvedPath: '/vault/Alpha.md' }]);
	});

	it('splits alias into display and target', () => {
		const result = resolveRelationshipLinks('[[Alpha|My Alpha]]', paths, resolve);
		expect(result).toEqual([{ raw: 'Alpha|My Alpha', display: 'My Alpha', resolvedPath: '/vault/Alpha.md' }]);
	});

	it('returns null resolvedPath for unresolvable link', () => {
		const result = resolveRelationshipLinks('[[Missing]]', paths, resolve);
		expect(result[0].resolvedPath).toBeNull();
	});

	it('resolves multiple links from array', () => {
		const result = resolveRelationshipLinks(['[[Alpha]]', '[[Beta]]'], paths, resolve);
		expect(result).toHaveLength(2);
		expect(result[0].resolvedPath).toBe('/vault/Alpha.md');
		expect(result[1].resolvedPath).toBe('/vault/sub/Beta.md');
	});

	it('passes the vault root, so a path-style link resolves to its vault-relative file first', () => {
		const result = resolveRelationshipLinks('[[b/foo.png]]', ['/vault/x/b/foo.png', '/vault/b/foo.png'], resolveWikilink, '/vault');
		expect(result[0].resolvedPath).toBe('/vault/b/foo.png');
	});
});

describe('computeAddRelationshipValue', () => {
	it('creates new wikilink for undefined (new property)', () => {
		const result = computeAddRelationshipValue(undefined, 'Note');
		expect(result).toEqual({ value: '[[Note]]', isNew: true });
	});

	it('appends to array value', () => {
		const result = computeAddRelationshipValue(['[[A]]'], 'B');
		expect(result).toEqual({ value: ['[[A]]', '[[B]]'], isNew: false });
	});

	it('converts string with existing wikilink to array', () => {
		const result = computeAddRelationshipValue('[[A]]', 'B');
		expect(result).toEqual({ value: ['[[A]]', '[[B]]'], isNew: false });
	});

	it('replaces plain string value', () => {
		const result = computeAddRelationshipValue('plain text', 'Note');
		expect(result).toEqual({ value: '[[Note]]', isNew: false });
	});
});

describe('computeRemoveRelationshipValue', () => {
	it('removes from array and keeps remaining', () => {
		const result = computeRemoveRelationshipValue(['[[A]]', '[[B]]'], 'A');
		expect(result).toEqual({ value: ['[[B]]'], shouldDelete: false });
	});

	it('marks for deletion when array becomes empty', () => {
		const result = computeRemoveRelationshipValue(['[[A]]'], 'A');
		expect(result).toEqual({ value: [], shouldDelete: true });
	});

	it('marks for deletion on string value', () => {
		const result = computeRemoveRelationshipValue('[[A]]', 'A');
		expect(result).toEqual({ value: [], shouldDelete: true });
	});

	it('marks for deletion on undefined', () => {
		const result = computeRemoveRelationshipValue(undefined, 'A');
		expect(result).toEqual({ value: [], shouldDelete: true });
	});
});

describe('ensureFrontmatterLink', () => {
	it('adds a frontmatter block to content that has none', () => {
		expect(ensureFrontmatterLink('', '_related_to', 'Alice')).toBe('---\n_related_to: "[[Alice]]"\n---\n');
		expect(ensureFrontmatterLink('# Notes\n', '_related_to', 'Alice')).toBe('---\n_related_to: "[[Alice]]"\n---\n# Notes\n');
	});

	it('inserts the key after the opening delimiter and keeps the rest byte for byte', () => {
		const content = '---\n# a comment the rewrite would lose\ndate: 2026-10-31\n---\n# 1:1\n';
		expect(ensureFrontmatterLink(content, '_related_to', 'Alice')).toBe(
			'---\n_related_to: "[[Alice]]"\n# a comment the rewrite would lose\ndate: 2026-10-31\n---\n# 1:1\n',
		);
	});

	it('leaves content that already links the target unchanged', () => {
		for (const value of ['"[[Alice]]"', '"[[alice]]"', '"[[Alice|Al]]"', '["[[Bob]]", "[[Alice]]"]']) {
			const content = `---\n_related_to: ${value}\n---\nbody\n`;
			expect(ensureFrontmatterLink(content, '_related_to', 'Alice')).toBe(content);
		}
	});

	it('treats a folder-qualified or .md link to the target as already linked', () => {
		for (const value of ['"[[Work/_people/Alice]]"', '"[[Alice.md]]"', '"[[Work/Alice.md|Al]]"']) {
			const content = `---\n_related_to: ${value}\n---\nbody\n`;
			expect(ensureFrontmatterLink(content, '_related_to', 'Alice')).toBe(content);
		}
	});

	it('inserts the key into an empty frontmatter block instead of prepending a second one', () => {
		expect(ensureFrontmatterLink('---\n---\n# x\n', '_related_to', 'Alice')).toBe('---\n_related_to: "[[Alice]]"\n---\n# x\n');
		expect(ensureFrontmatterLink('---\r\n---\r\n# x\r\n', '_related_to', 'Alice')).toBe(
			'---\r\n_related_to: "[[Alice]]"\r\n---\r\n# x\r\n',
		);
	});

	it('keeps CRLF line endings when inserting the key', () => {
		expect(ensureFrontmatterLink('---\r\ndate: x\r\n---\r\nbody\r\n', '_related_to', 'Alice')).toBe(
			'---\r\n_related_to: "[[Alice]]"\r\ndate: x\r\n---\r\nbody\r\n',
		);
	});

	it('keeps a plain value the key already holds next to the link', () => {
		const next = ensureFrontmatterLink('---\n_related_to: Team\n---\nbody\n', '_related_to', 'Alice');
		expect(parseFrontmatterProperties(next).find((p) => p.key === '_related_to')?.value).toEqual(['Team', '[[Alice]]']);
	});

	it('appends the link to a key that links something else', () => {
		const next = ensureFrontmatterLink('---\n_related_to: "[[Bob]]"\n---\nbody\n', '_related_to', 'Alice');
		expect(parseFrontmatterProperties(next).find((p) => p.key === '_related_to')?.value).toEqual(['[[Bob]]', '[[Alice]]']);
		expect(extractBody(next)).toBe('body\n');
	});

	it('fills an empty key', () => {
		const next = ensureFrontmatterLink('---\n_related_to:\ndate: 2026-10-31\n---\n', '_related_to', 'Alice');
		const props = parseFrontmatterProperties(next);
		expect(props.find((p) => p.key === '_related_to')?.value).toBe('[[Alice]]');
		expect(props.filter((p) => p.key === '_related_to')).toHaveLength(1);
	});

	it('throws instead of rewriting frontmatter it would damage', () => {
		expect(() => ensureFrontmatterLink('---\n# keep me\n_related_to: "[[Bob]]"\n---\n', '_related_to', 'Alice')).toThrow(/comments/);
		expect(() => ensureFrontmatterLink('---\na: [unclosed\n---\n', '_related_to', 'Alice')).toThrow(/unparseable/);
	});

	it('treats an unquoted link to the target as already linked', () => {
		const content = '---\n_belongs_to: [[Team]]\n---\nbody\n';
		expect(ensureFrontmatterLink(content, '_belongs_to', 'Team')).toBe(content);
	});

	it('throws instead of rewriting an unquoted link to another target', () => {
		expect(() => ensureFrontmatterLink('---\n_belongs_to: [[Team]]\n---\nbody\n', '_belongs_to', 'Other')).toThrow(/nested/);
	});
});

describe('normalizeTypeCasing', () => {
	it('uppercases the first letter and keeps the rest', () => {
		expect(normalizeTypeCasing('project')).toBe('Project');
		expect(normalizeTypeCasing('oneOnOne')).toBe('OneOnOne');
		expect(normalizeTypeCasing('Book')).toBe('Book');
	});

	it('returns an empty string unchanged', () => {
		expect(normalizeTypeCasing('')).toBe('');
	});

	it('leaves a non-letter first character as is', () => {
		expect(normalizeTypeCasing('1st draft')).toBe('1st draft');
	});
});
