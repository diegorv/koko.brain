import { describe, it, expect } from 'vitest';
import {
	extractRawFrontmatter,
	extractBody,
	detectPropertyType,
	parseFrontmatterProperties,
	serializePropertyValue,
	serializeProperties,
	rebuildContent,
	addProperty,
	removeProperty,
	updatePropertyValue,
	renamePropertyKey,
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
