import { describe, it, expect } from 'vitest';
import { evaluateExpression, type EvalContext } from '$lib/features/collection/expression/evaluator';
import type { NoteRecord } from '$lib/features/collection/collection.types';
import { isDisplayValue } from '$lib/features/collection/expression/expression.types';
import type { DisplayLink, DisplayImage, DisplayIcon, DisplayHTML } from '$lib/features/collection/expression/expression.types';

function makeRecord(overrides: Partial<NoteRecord> = {}): NoteRecord {
	return {
		path: '/vault/test.md',
		name: 'test.md',
		basename: 'test',
		folder: '/vault',
		ext: '.md',
		mtime: 1700000000000,
		ctime: 1690000000000,
		size: 1024,
		properties: new Map(),
		...overrides,
	};
}

function makeCtx(
	props: Record<string, unknown> = {},
	formulas: Record<string, string> = {},
	recordOverrides: Partial<NoteRecord> = {},
): EvalContext {
	const properties = new Map(Object.entries(props));
	return {
		record: makeRecord({ properties, ...recordOverrides }),
		formulas,
	};
}

describe('string methods', () => {
	it('lower() converts to lowercase', () => {
		const ctx = makeCtx({ status: 'HELLO' });
		expect(evaluateExpression('status.lower()', ctx)).toBe('hello');
	});

	it('title() capitalizes first letter of each word', () => {
		const ctx = makeCtx({ status: 'hello world' });
		expect(evaluateExpression('status.title()', ctx)).toBe('Hello World');
	});

	it('trim() removes leading and trailing whitespace', () => {
		const ctx = makeCtx({ status: '  hello  ' });
		expect(evaluateExpression('status.trim()', ctx)).toBe('hello');
	});

	it('replace() replaces first occurrence', () => {
		const ctx = makeCtx({ status: 'banana' });
		expect(evaluateExpression('status.replace("a", "b")', ctx)).toBe('bbnana');
	});

	it('split() splits string by separator', () => {
		const ctx = makeCtx({ title: 'hello world' });
		expect(evaluateExpression('title.split(" ")', ctx)).toEqual(['hello', 'world']);
	});

	it('split() with limit', () => {
		const ctx = makeCtx({ title: 'hello world' });
		expect(evaluateExpression('title.split(" ", 1)', ctx)).toEqual(['hello']);
	});

	it('slice() extracts substring', () => {
		const ctx = makeCtx({ title: 'hello world' });
		expect(evaluateExpression('title.slice(0, 5)', ctx)).toBe('hello');
	});

	it('slice() without end', () => {
		const ctx = makeCtx({ title: 'hello world' });
		expect(evaluateExpression('title.slice(6)', ctx)).toBe('world');
	});
});

describe('string fields', () => {
	it('length returns string length', () => {
		const ctx = makeCtx({ title: 'hello' });
		expect(evaluateExpression('title.length', ctx)).toBe(5);
	});

	it('length returns 0 for empty string', () => {
		const ctx = makeCtx({ title: '' });
		expect(evaluateExpression('title.length', ctx)).toBe(0);
	});
});

describe('backward compatibility — method-style calls', () => {
	it('status.contains() on string', () => {
		const ctx = makeCtx({ title: 'Meeting Notes' });
		expect(evaluateExpression('title.contains("meeting")', ctx)).toBe(true);
		expect(evaluateExpression('title.contains("xyz")', ctx)).toBe(false);
	});

	it('tags.contains() on array', () => {
		const ctx = makeCtx({ tags: ['work', 'important'] });
		expect(evaluateExpression('tags.contains("work")', ctx)).toBe(true);
		expect(evaluateExpression('tags.contains("WORK")', ctx)).toBe(true);
		expect(evaluateExpression('tags.contains("missing")', ctx)).toBe(false);
	});

	it('status.startsWith()', () => {
		const ctx = makeCtx({ status: 'in-progress' });
		expect(evaluateExpression('status.startsWith("in-")', ctx)).toBe(true);
	});

	it('status.endsWith()', () => {
		const ctx = makeCtx({ filename: 'report.pdf' });
		expect(evaluateExpression('filename.endsWith(".pdf")', ctx)).toBe(true);
	});

	it('status.isEmpty()', () => {
		const ctx = makeCtx({ empty: '', filled: 'value' });
		expect(evaluateExpression('empty.isEmpty()', ctx)).toBe(true);
		expect(evaluateExpression('filled.isEmpty()', ctx)).toBe(false);
	});

	it('contains() as global function', () => {
		expect(evaluateExpression('contains("hello world", "world")', makeCtx())).toBe(true);
	});

	it('startsWith() as global function', () => {
		expect(evaluateExpression('startsWith("hello", "hel")', makeCtx())).toBe(true);
	});

	it('endsWith() as global function', () => {
		expect(evaluateExpression('endsWith("hello", "llo")', makeCtx())).toBe(true);
	});

	it('isEmpty() as global function', () => {
		expect(evaluateExpression('isEmpty("")', makeCtx())).toBe(true);
	});
});

describe('number methods', () => {
	it('abs() returns absolute value', () => {
		const ctx = makeCtx({ priority: -5 });
		expect(evaluateExpression('priority.abs()', ctx)).toBe(5);
	});

	it('round() rounds to nearest integer', () => {
		const ctx = makeCtx({ score: 3.7 });
		expect(evaluateExpression('score.round()', ctx)).toBe(4);
	});

	it('round(digits) rounds to specified decimal places', () => {
		const ctx = makeCtx({ score: 3.14159 });
		expect(evaluateExpression('score.round(2)', ctx)).toBe(3.14);
	});

	it('ceil() rounds up', () => {
		const ctx = makeCtx({ score: 3.1 });
		expect(evaluateExpression('score.ceil()', ctx)).toBe(4);
	});

	it('floor() rounds down', () => {
		const ctx = makeCtx({ score: 3.9 });
		expect(evaluateExpression('score.floor()', ctx)).toBe(3);
	});

	it('toFixed() returns string with fixed decimal places', () => {
		const ctx = makeCtx({ score: 3.1 });
		expect(evaluateExpression('score.toFixed(2)', ctx)).toBe('3.10');
	});
});

describe('math global functions', () => {
	it('max() returns the maximum value', () => {
		expect(evaluateExpression('max(1, 2, 3)', makeCtx())).toBe(3);
	});

	it('min() returns the minimum value', () => {
		expect(evaluateExpression('min(1, 2, 3)', makeCtx())).toBe(1);
	});

	it('max() with property reference', () => {
		const ctx = makeCtx({ priority: -5 });
		expect(evaluateExpression('max(priority, 0)', ctx)).toBe(0);
	});

	it('list() wraps a value in an array', () => {
		expect(evaluateExpression('list("item")', makeCtx())).toEqual(['item']);
	});

	it('list() returns existing array as-is', () => {
		const ctx = makeCtx({ tags: ['a', 'b'] });
		expect(evaluateExpression('list(tags)', ctx)).toEqual(['a', 'b']);
	});
});

describe('date fields', () => {
	it('file.ctime.year returns the year', () => {
		const ctx = makeCtx({}, {}, { ctime: new Date(2024, 5, 15).getTime() });
		expect(evaluateExpression('file.ctime.year', ctx)).toBe(2024);
	});

	it('file.mtime.month returns 1-indexed month', () => {
		const ctx = makeCtx({}, {}, { mtime: new Date(2024, 5, 15).getTime() });
		expect(evaluateExpression('file.mtime.month', ctx)).toBe(6);
	});

	it('file.mtime.day returns day of month', () => {
		const ctx = makeCtx({}, {}, { mtime: new Date(2024, 5, 15).getTime() });
		expect(evaluateExpression('file.mtime.day', ctx)).toBe(15);
	});

	it('file.mtime.hour returns hours', () => {
		const ctx = makeCtx({}, {}, { mtime: new Date(2024, 5, 15, 14, 30).getTime() });
		expect(evaluateExpression('file.mtime.hour', ctx)).toBe(14);
	});

	it('file.mtime.minute returns minutes', () => {
		const ctx = makeCtx({}, {}, { mtime: new Date(2024, 5, 15, 14, 30).getTime() });
		expect(evaluateExpression('file.mtime.minute', ctx)).toBe(30);
	});

	it('file.mtime.second returns seconds', () => {
		const ctx = makeCtx({}, {}, { mtime: new Date(2024, 5, 15, 14, 30, 45).getTime() });
		expect(evaluateExpression('file.mtime.second', ctx)).toBe(45);
	});

	it('file.mtime.millisecond returns milliseconds', () => {
		const ctx = makeCtx({}, {}, { mtime: new Date(2024, 5, 15, 14, 30, 45, 123).getTime() });
		expect(evaluateExpression('file.mtime.millisecond', ctx)).toBe(123);
	});

	it('composition: file.ctime.year == 2024', () => {
		const ctx = makeCtx({}, {}, { ctime: new Date(2024, 5, 15).getTime() });
		expect(evaluateExpression('file.ctime.year == 2024', ctx)).toBe(true);
	});
});

describe('date methods', () => {
	it('format() formats date with YYYY-MM-DD', () => {
		const ctx = makeCtx({}, {}, { mtime: new Date(2024, 5, 15).getTime() });
		expect(evaluateExpression('file.mtime.format("YYYY-MM-DD")', ctx)).toBe('2024-06-15');
	});

	it('format() with time components', () => {
		const ctx = makeCtx({}, {}, { mtime: new Date(2024, 5, 15, 14, 30, 45).getTime() });
		expect(evaluateExpression('file.mtime.format("YYYY-MM-DD HH:mm:ss")', ctx)).toBe('2024-06-15 14:30:45');
	});

	it('relative() returns a relative string', () => {
		const ctx = makeCtx({}, {}, { mtime: Date.now() - 86400000 * 2 });
		const result = evaluateExpression('file.mtime.relative()', ctx) as string;
		expect(result).toMatch(/2 days ago/);
	});

	it('date() returns date with zeroed time', () => {
		const ctx = makeCtx({}, {}, { mtime: new Date(2024, 5, 15, 14, 30).getTime() });
		const result = evaluateExpression('file.mtime.date()', ctx) as Date;
		expect(result).toBeInstanceOf(Date);
		expect(result.getHours()).toBe(0);
		expect(result.getMinutes()).toBe(0);
		expect(result.getFullYear()).toBe(2024);
	});

	it('time() returns HH:mm:ss string', () => {
		const ctx = makeCtx({}, {}, { mtime: new Date(2024, 5, 15, 14, 30, 45).getTime() });
		expect(evaluateExpression('file.mtime.time()', ctx)).toBe('14:30:45');
	});
});

describe('array literals', () => {
	it('evaluates empty array []', () => {
		expect(evaluateExpression('[]', makeCtx())).toEqual([]);
	});

	it('evaluates [1, 2, 3]', () => {
		expect(evaluateExpression('[1, 2, 3]', makeCtx())).toEqual([1, 2, 3]);
	});

	it('evaluates array with mixed types', () => {
		expect(evaluateExpression('[1, "two", true]', makeCtx())).toEqual([1, 'two', true]);
	});

	it('evaluates array with expressions', () => {
		expect(evaluateExpression('[1 + 1, 2 * 3]', makeCtx())).toEqual([2, 6]);
	});
});

describe('list methods', () => {
	it('sort() sorts array', () => {
		const ctx = makeCtx({ tags: ['c', 'a', 'b'] });
		expect(evaluateExpression('tags.sort()', ctx)).toEqual(['a', 'b', 'c']);
	});

	it('unique() removes duplicates', () => {
		const ctx = makeCtx({ tags: ['a', 'b', 'a'] });
		expect(evaluateExpression('tags.unique()', ctx)).toEqual(['a', 'b']);
	});

	it('join() joins array with separator', () => {
		const ctx = makeCtx({ tags: ['a', 'b'] });
		expect(evaluateExpression('tags.join(", ")', ctx)).toBe('a, b');
	});

	it('flat() flattens nested arrays', () => {
		const ctx = makeCtx({ items: [[1, 2], [3]] });
		expect(evaluateExpression('items.flat()', ctx)).toEqual([1, 2, 3]);
	});

	it('slice() extracts subarray', () => {
		const ctx = makeCtx({ items: [1, 2, 3, 4] });
		expect(evaluateExpression('items.slice(1, 3)', ctx)).toEqual([2, 3]);
	});

	it('length field returns array length', () => {
		const ctx = makeCtx({ tags: ['a', 'b', 'c'] });
		expect(evaluateExpression('tags.length', ctx)).toBe(3);
	});
});

describe('list higher-order methods', () => {
	it('filter() filters elements by expression', () => {
		const ctx = makeCtx({ tags: ['draft', 'post', 'draft'] });
		expect(evaluateExpression('tags.filter(value != "draft")', ctx)).toEqual(['post']);
	});

	it('map() transforms elements by expression', () => {
		const ctx = makeCtx({ nums: [1, 2, 3] });
		expect(evaluateExpression('nums.map(value * 2)', ctx)).toEqual([2, 4, 6]);
	});

	it('filter() has access to index', () => {
		const ctx = makeCtx({ items: ['a', 'b', 'c', 'd'] });
		expect(evaluateExpression('items.filter(index < 2)', ctx)).toEqual(['a', 'b']);
	});
});

describe('file fields — Task 6', () => {
	it('file.basename returns name without extension', () => {
		expect(evaluateExpression('file.basename', makeCtx())).toBe('test');
	});

	it('file.tags returns tags array', () => {
		const ctx = makeCtx({ tags: ['work', 'project'] });
		expect(evaluateExpression('file.tags', ctx)).toEqual(['work', 'project']);
	});

	it('file.tags returns empty array when no tags', () => {
		expect(evaluateExpression('file.tags', makeCtx())).toEqual([]);
	});

	it('file.properties returns all properties as object', () => {
		const ctx = makeCtx({ status: 'active', priority: 5 });
		const result = evaluateExpression('file.properties', ctx) as Record<string, unknown>;
		expect(result).toEqual({ status: 'active', priority: 5 });
	});
});

describe('any methods — Task 6', () => {
	it('isTruthy() returns true for truthy values', () => {
		const ctx = makeCtx({ status: 'active' });
		expect(evaluateExpression('status.isTruthy()', ctx)).toBe(true);
	});

	it('isTruthy() returns false for falsy values', () => {
		const ctx = makeCtx({ count: 0 });
		expect(evaluateExpression('count.isTruthy()', ctx)).toBe(false);
	});

	it('isType() checks runtime type', () => {
		const ctx = makeCtx({ status: 'active', count: 5, tags: ['a'] });
		expect(evaluateExpression('status.isType("string")', ctx)).toBe(true);
		expect(evaluateExpression('count.isType("number")', ctx)).toBe(true);
		expect(evaluateExpression('tags.isType("list")', ctx)).toBe(true);
	});

	it('toString() converts to string', () => {
		const ctx = makeCtx({ count: 42 });
		expect(evaluateExpression('count.toString()', ctx)).toBe('42');
	});

	it('toString() on null returns empty string', () => {
		expect(evaluateExpression('missing.toString()', makeCtx())).toBe('');
	});
});

describe('object methods — Task 6', () => {
	it('keys() returns object keys', () => {
		const ctx = makeCtx({ meta: { a: 1, b: 2 } });
		const result = evaluateExpression('meta.keys()', ctx) as string[];
		expect(result).toEqual(['a', 'b']);
	});

	it('values() returns object values', () => {
		const ctx = makeCtx({ meta: { a: 1, b: 2 } });
		const result = evaluateExpression('meta.values()', ctx) as number[];
		expect(result).toEqual([1, 2]);
	});

	it('isEmpty() on empty object', () => {
		const ctx = makeCtx({ meta: {} });
		expect(evaluateExpression('meta.isEmpty()', ctx)).toBe(true);
	});

	it('isEmpty() on non-empty object', () => {
		const ctx = makeCtx({ meta: { a: 1 } });
		expect(evaluateExpression('meta.isEmpty()', ctx)).toBe(false);
	});
});

describe('file methods — Task 6', () => {
	it('file.asLink() returns wiki link', () => {
		expect(evaluateExpression('file.asLink()', makeCtx())).toBe('[[/vault/test.md]]');
	});

	it('file.asLink(display) returns wiki link with display text', () => {
		expect(evaluateExpression('file.asLink("My Note")', makeCtx())).toBe('[[/vault/test.md|My Note]]');
	});

	it('file.hasTag() variadic — matches any', () => {
		const ctx = makeCtx({ tags: ['work', 'project'] });
		expect(evaluateExpression('file.hasTag("work")', ctx)).toBe(true);
		expect(evaluateExpression('file.hasTag("missing", "work")', ctx)).toBe(true);
		expect(evaluateExpression('file.hasTag("missing", "nope")', ctx)).toBe(false);
	});
});

describe('display functions — Task 7', () => {
	it('link() returns a DisplayLink', () => {
		const result = evaluateExpression('link("https://example.com", "Example")', makeCtx());
		expect(isDisplayValue(result)).toBe(true);
		const link = result as DisplayLink;
		expect(link.__display).toBe('link');
		expect(link.href).toBe('https://example.com');
		expect(link.display).toBe('Example');
	});

	it('link() uses href as display when no display arg', () => {
		const result = evaluateExpression('link("https://example.com")', makeCtx()) as DisplayLink;
		expect(result.__display).toBe('link');
		expect(result.display).toBe('https://example.com');
	});

	it('link() with property reference', () => {
		const ctx = makeCtx({ url: 'https://test.com', label: 'Test Site' });
		const result = evaluateExpression('link(url, label)', ctx) as DisplayLink;
		expect(result.href).toBe('https://test.com');
		expect(result.display).toBe('Test Site');
	});

	it('image() returns a DisplayImage', () => {
		const result = evaluateExpression('image("photo.png", "A photo")', makeCtx()) as DisplayImage;
		expect(result.__display).toBe('image');
		expect(result.src).toBe('photo.png');
		expect(result.alt).toBe('A photo');
	});

	it('image() without alt', () => {
		const result = evaluateExpression('image("photo.png")', makeCtx()) as DisplayImage;
		expect(result.__display).toBe('image');
		expect(result.src).toBe('photo.png');
		expect(result.alt).toBe('');
	});

	it('icon() returns a DisplayIcon', () => {
		const result = evaluateExpression('icon("star")', makeCtx()) as DisplayIcon;
		expect(result.__display).toBe('icon');
		expect(result.name).toBe('star');
	});

	it('html() returns a DisplayHTML', () => {
		const result = evaluateExpression('html("<b>bold</b>")', makeCtx()) as DisplayHTML;
		expect(result.__display).toBe('html');
		expect(result.html).toBe('<b>bold</b>');
	});

	it('escapeHTML() escapes HTML entities', () => {
		expect(evaluateExpression('escapeHTML("<script>alert(1)</script>")', makeCtx()))
			.toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
	});

	it('escapeHTML() escapes ampersands and quotes', () => {
		expect(evaluateExpression('escapeHTML("a & b")', makeCtx())).toBe('a &amp; b');
		expect(evaluateExpression('escapeHTML("say \\"hello\\"")', makeCtx())).toBe('say &quot;hello&quot;');
	});

	it('html() with escapeHTML() composition', () => {
		const result = evaluateExpression('html("<b>safe</b>")', makeCtx()) as DisplayHTML;
		expect(result.__display).toBe('html');
		expect(result.html).toBe('<b>safe</b>');
	});

	it('isDisplayValue() correctly identifies display types', () => {
		expect(isDisplayValue({ __display: 'link', href: '', display: '' })).toBe(true);
		expect(isDisplayValue({ __display: 'image', src: '', alt: '' })).toBe(true);
		expect(isDisplayValue({ __display: 'icon', name: '' })).toBe(true);
		expect(isDisplayValue({ __display: 'html', html: '' })).toBe(true);
		expect(isDisplayValue(null)).toBe(false);
		expect(isDisplayValue('string')).toBe(false);
		expect(isDisplayValue(42)).toBe(false);
		expect(isDisplayValue({ other: true })).toBe(false);
	});

	it('badge() returns DisplayHTML with colored pill', () => {
		const result = evaluateExpression('badge("active", "green")', makeCtx()) as DisplayHTML;
		expect(result.__display).toBe('html');
		expect(result.html).toContain('active');
		expect(result.html).toContain('border-radius:9999px');
		expect(result.html).toContain('rgb(72,187,120)');
	});

	it('badge() defaults to gray when no color', () => {
		const result = evaluateExpression('badge("pending")', makeCtx()) as DisplayHTML;
		expect(result.__display).toBe('html');
		expect(result.html).toContain('pending');
		expect(result.html).toContain('rgb(160,160,160)');
	});

	it('badge() escapes HTML in text', () => {
		const result = evaluateExpression('badge("<script>xss</script>")', makeCtx()) as DisplayHTML;
		expect(result.html).not.toContain('<script>');
		expect(result.html).toContain('&lt;script&gt;');
	});

	it('badge() with property reference', () => {
		const ctx = makeCtx({ status: 'active' });
		const result = evaluateExpression('badge(status, "blue")', ctx) as DisplayHTML;
		expect(result.html).toContain('active');
		expect(result.html).toContain('rgb(66,153,225)');
	});

	it('progress() returns DisplayHTML with bar', () => {
		const result = evaluateExpression('progress(75, 100)', makeCtx()) as DisplayHTML;
		expect(result.__display).toBe('html');
		expect(result.html).toContain('width:75%');
		expect(result.html).toContain('75%');
	});

	it('progress() defaults max to 100', () => {
		const result = evaluateExpression('progress(50)', makeCtx()) as DisplayHTML;
		expect(result.html).toContain('width:50%');
	});

	it('progress() clamps to 0-100%', () => {
		const over = evaluateExpression('progress(200, 100)', makeCtx()) as DisplayHTML;
		expect(over.html).toContain('width:100%');
		const under = evaluateExpression('progress(-10, 100)', makeCtx()) as DisplayHTML;
		expect(under.html).toContain('width:0%');
	});

	it('progress() accepts custom color', () => {
		const result = evaluateExpression('progress(50, 100, "red")', makeCtx()) as DisplayHTML;
		expect(result.html).toContain('rgb(239,68,68)');
	});

	it('progress() with property reference', () => {
		const ctx = makeCtx({ progress: 60 });
		const result = evaluateExpression('progress(progress, 100)', ctx) as DisplayHTML;
		expect(result.html).toContain('width:60%');
	});

	it('color() returns DisplayHTML with colored text', () => {
		const result = evaluateExpression('color("urgent", "red")', makeCtx()) as DisplayHTML;
		expect(result.__display).toBe('html');
		expect(result.html).toContain('urgent');
		expect(result.html).toContain('rgb(239,68,68)');
	});

	it('color() defaults to gray', () => {
		const result = evaluateExpression('color("text")', makeCtx()) as DisplayHTML;
		expect(result.html).toContain('rgb(160,160,160)');
	});

	it('color() escapes HTML in text', () => {
		const result = evaluateExpression('color("<b>bold</b>", "blue")', makeCtx()) as DisplayHTML;
		expect(result.html).not.toContain('<b>');
		expect(result.html).toContain('&lt;b&gt;');
	});

	it('color() falls back to gray for unknown color name', () => {
		const result = evaluateExpression('color("text", "neon")', makeCtx()) as DisplayHTML;
		expect(result.html).toContain('rgb(160,160,160)');
	});
});

describe('string matches() — Task 8', () => {
	it('matches() with simple pattern', () => {
		const ctx = makeCtx({ title: 'Meeting Notes 2024' });
		expect(evaluateExpression('title.matches("^Meeting")', ctx)).toBe(true);
		expect(evaluateExpression('title.matches("^Notes")', ctx)).toBe(false);
	});

	it('matches() is case-insensitive by default', () => {
		const ctx = makeCtx({ title: 'Hello World' });
		expect(evaluateExpression('title.matches("hello")', ctx)).toBe(true);
		expect(evaluateExpression('title.matches("WORLD")', ctx)).toBe(true);
	});

	it('matches() with alternation pattern', () => {
		const ctx = makeCtx({ status: 'active' });
		expect(evaluateExpression('status.matches("^(active|pending)$")', ctx)).toBe(true);
		const ctx2 = makeCtx({ status: 'done' });
		expect(evaluateExpression('status.matches("^(active|pending)$")', ctx2)).toBe(false);
	});

	it('matches() with file extension pattern', () => {
		const ctx = makeCtx({ filename: 'report.pdf' });
		expect(evaluateExpression('filename.matches("\\\\.pdf$")', ctx)).toBe(true);
		expect(evaluateExpression('filename.matches("\\\\.doc$")', ctx)).toBe(false);
	});

	it('matches() returns false for invalid regex', () => {
		const ctx = makeCtx({ title: 'test' });
		expect(evaluateExpression('title.matches("[invalid")', ctx)).toBe(false);
	});

	it('matches() on empty string returns false for non-matching pattern', () => {
		const ctx = makeCtx({ title: '' });
		expect(evaluateExpression('title.matches("something")', ctx)).toBe(false);
	});

	it('matches() on empty string returns true for empty pattern', () => {
		const ctx = makeCtx({ title: '' });
		expect(evaluateExpression('title.matches("")', ctx)).toBe(true);
	});
});
