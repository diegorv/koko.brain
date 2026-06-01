import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/utils/log.service', () => ({
	appendLog: vi.fn(),
}));

import { appendLog } from '$lib/utils/log.service';
import {
	extractRawFrontmatter,
	extractBody,
	detectPropertyType,
	parseFrontmatterProperties,
	serializePropertyValue,
	serializeProperties,
	setPropertyByBindTarget,
	rebuildContent,
	addProperty,
	removeProperty,
	updatePropertyValue,
	renamePropertyKey,
	extractWikilinks,
	resolveRelationshipLinks,
	computeAddRelationshipValue,
	computeRemoveRelationshipValue,
	formatRelationshipLabel,
	_resetParseFrontmatterCache,
} from '$lib/features/properties/properties.logic';

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

describe('detectPropertyType', () => {
	it('detects boolean true', () => {
		expect(detectPropertyType('true')).toBe('boolean');
	});

	it('detects boolean false', () => {
		expect(detectPropertyType('false')).toBe('boolean');
	});

	it('detects integers', () => {
		expect(detectPropertyType('42')).toBe('number');
	});

	it('detects negative numbers', () => {
		expect(detectPropertyType('-7')).toBe('number');
	});

	it('detects floating point numbers', () => {
		expect(detectPropertyType('3.14')).toBe('number');
	});

	it('detects ISO dates', () => {
		expect(detectPropertyType('2024-01-15')).toBe('date');
	});

	it('detects ISO datetime', () => {
		expect(detectPropertyType('2024-01-15T10:30')).toBe('date');
	});

	it('detects ISO datetime with seconds', () => {
		expect(detectPropertyType('2024-01-15T10:30:00')).toBe('date');
	});

	it('returns text for plain strings', () => {
		expect(detectPropertyType('hello world')).toBe('text');
	});

	it('returns text for empty string', () => {
		expect(detectPropertyType('')).toBe('text');
	});

	it('handles whitespace around values', () => {
		expect(detectPropertyType('  42  ')).toBe('number');
		expect(detectPropertyType('  true  ')).toBe('boolean');
	});

	it('rejects Infinity and NaN as numbers (invalid YAML)', () => {
		expect(detectPropertyType('Infinity')).toBe('text');
		expect(detectPropertyType('-Infinity')).toBe('text');
		expect(detectPropertyType('NaN')).toBe('text');
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

	it('skips nested objects', () => {
		const content = '---\ntitle: Hello\nmeta:\n  author: Alice\n  version: 1\ntags: [a]\n---\nBody';
		const props = parseFrontmatterProperties(content);
		expect(props).toHaveLength(2);
		expect(props[0].key).toBe('title');
		expect(props[1].key).toBe('tags');
	});

	it('logs a warning when a nested mapping is dropped', () => {
		const appendLogMock = vi.mocked(appendLog);
		appendLogMock.mockClear();
		_resetParseFrontmatterCache();
		const content = '---\ntitle: Hello\nmeta:\n  author: Alice\n---\nBody';
		parseFrontmatterProperties(content);
		expect(appendLogMock).toHaveBeenCalledWith(
			'PROPERTIES',
			expect.stringContaining('dropped nested mapping value for key="meta"'),
		);
	});

	it('does not log when no nested mappings are present', () => {
		const appendLogMock = vi.mocked(appendLog);
		appendLogMock.mockClear();
		_resetParseFrontmatterCache();
		parseFrontmatterProperties('---\ntitle: Hello\ntags: [a, b]\n---\nBody');
		expect(appendLogMock).not.toHaveBeenCalled();
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

describe('serializePropertyValue', () => {
	it('serializes text values', () => {
		expect(serializePropertyValue({ key: 'title', value: 'Hello', type: 'text' })).toBe('Hello');
	});

	it('serializes number values', () => {
		expect(serializePropertyValue({ key: 'count', value: 42, type: 'number' })).toBe('42');
	});

	it('serializes boolean values', () => {
		expect(serializePropertyValue({ key: 'ok', value: true, type: 'boolean' })).toBe('true');
		expect(serializePropertyValue({ key: 'ok', value: false, type: 'boolean' })).toBe('false');
	});

	it('serializes list values', () => {
		expect(serializePropertyValue({ key: 'tags', value: ['a', 'b'], type: 'list' })).toBe(
			'[a, b]'
		);
	});

	it('serializes empty list', () => {
		expect(serializePropertyValue({ key: 'tags', value: [], type: 'list' })).toBe('[]');
	});

	it('serializes date values as strings', () => {
		expect(
			serializePropertyValue({ key: 'created', value: '2024-01-15', type: 'date' })
		).toBe('2024-01-15');
	});

	it('quotes list items containing commas', () => {
		const result = serializePropertyValue({ key: 'items', value: ['hello, world', 'foo'], type: 'list' });
		expect(result).toBe('["hello, world", foo]');
	});

	it('quotes list items containing brackets', () => {
		const result = serializePropertyValue({ key: 'items', value: ['[tag]', 'plain'], type: 'list' });
		expect(result).toBe('["[tag]", plain]');
	});

	it('quotes list items containing colons', () => {
		const result = serializePropertyValue({ key: 'items', value: ['key: value', 'simple'], type: 'list' });
		expect(result).toBe('["key: value", simple]');
	});

	it('quotes empty string list items', () => {
		expect(
			serializePropertyValue({ key: 'items', value: ['', 'a'], type: 'list' })
		).toBe('["", a]');
	});

	it('quotes text values containing curly braces (YAML flow mapping)', () => {
		expect(
			serializePropertyValue({ key: 'desc', value: '{special}', type: 'text' })
		).toBe('"{special}"');
	});

	it('quotes text values containing square brackets', () => {
		expect(
			serializePropertyValue({ key: 'desc', value: '[link text]', type: 'text' })
		).toBe('"[link text]"');
	});

	it('quotes text values containing hash symbol', () => {
		expect(
			serializePropertyValue({ key: 'desc', value: 'before #comment', type: 'text' })
		).toBe('"before #comment"');
	});

	it('quotes text values containing colons', () => {
		expect(
			serializePropertyValue({ key: 'desc', value: 'key: value', type: 'text' })
		).toBe('"key: value"');
	});

	it('quotes text values with leading/trailing whitespace', () => {
		expect(
			serializePropertyValue({ key: 'desc', value: '  padded  ', type: 'text' })
		).toBe('"  padded  "');
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

	it('canonicalizes alias keys on write (favorite -> _favorite)', () => {
		const props = [
			{ key: 'favorite', value: true, type: 'boolean' as const },
			{ key: 'icon', value: 'star', type: 'text' as const },
			{ key: 'is_a', value: 'person', type: 'text' as const },
		];
		expect(serializeProperties(props)).toBe('_favorite: true\n_icon: star\ntype: person');
	});

	it('leaves already-canonical keys unchanged', () => {
		const props = [
			{ key: '_favorite', value: true, type: 'boolean' as const },
			{ key: 'type', value: 'person', type: 'text' as const },
		];
		expect(serializeProperties(props)).toBe('_favorite: true\ntype: person');
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
		const appendLogMock = vi.mocked(appendLog);
		appendLogMock.mockClear();
		serializeProperties([
			{ key: '_color', value: 'red', type: 'text' as const },
			{ key: 'color', value: '', type: 'text' as const },
		]);
		expect(appendLogMock).not.toHaveBeenCalled();
	});

	it('keeps the first value and logs when both twins are populated (no silent loss)', () => {
		const appendLogMock = vi.mocked(appendLog);
		appendLogMock.mockClear();
		const result = serializeProperties([
			{ key: '_color', value: 'red', type: 'text' as const },
			{ key: 'color', value: 'blue', type: 'text' as const },
		]);
		expect(result).toBe('_color: red');
		expect(appendLogMock).toHaveBeenCalledWith(
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
});

/**
 * Snapshot tests for the canonical serialization form documented in
 * ADR 0029. Each test asserts the exact byte sequence emitted by
 * serializeProperties for a property shape the Python generator at
 * koko.brain-os/vault/work/people/_generate.py must match. If any of
 * these break, either the canonical form has shifted (intentional —
 * update both this file and the generator) or yaml@2.9.0 has changed
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
			'type: person\n_organized: "true"\n_archived: "false"\n_favorite: true\ncreated: 2026-05-31\nname: Diego',
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
			'type: person',
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

describe('frontmatter alias normalization', () => {
	it('normalizes is_a to type', () => {
		const content = '---\nis_a: person\n---\n';
		const props = parseFrontmatterProperties(content);
		expect(props[0]).toEqual({ key: 'type', value: 'person', type: 'text' });
	});

	it('normalizes space-separated aliases', () => {
		const content = '---\nis a: place\nsidebar label: Places\n---\n';
		const props = parseFrontmatterProperties(content);
		expect(props.find((p) => p.key === 'type')?.value).toBe('place');
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
		const content = '---\n_icon: star\ntype: note\n---\n';
		const props = parseFrontmatterProperties(content);
		expect(props.find((p) => p.key === '_icon')?.value).toBe('star');
		expect(props.find((p) => p.key === 'type')?.value).toBe('note');
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

describe('formatRelationshipLabel', () => {
	it('converts snake_case to Title Case', () => {
		expect(formatRelationshipLabel('belongs_to')).toBe('Belongs To');
		expect(formatRelationshipLabel('has_many')).toBe('Has Many');
	});

	it('handles single word', () => {
		expect(formatRelationshipLabel('mentor')).toBe('Mentor');
	});

	it('handles triple underscore segments', () => {
		expect(formatRelationshipLabel('related_to_also')).toBe('Related To Also');
	});
});
