import { describe, it, expect } from 'vitest';
import { evaluate, evaluateExpression, type EvalContext } from '$lib/features/collection/expression/evaluator';
import { parse } from '$lib/features/collection/expression/parser';
import type { NoteRecord } from '$lib/features/collection/collection.types';

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

describe('evaluate', () => {
	describe('literals', () => {
		it('evaluates numbers', () => {
			expect(evaluateExpression('42', makeCtx())).toBe(42);
		});

		it('evaluates strings', () => {
			expect(evaluateExpression("'hello'", makeCtx())).toBe('hello');
		});

		it('evaluates booleans', () => {
			expect(evaluateExpression('true', makeCtx())).toBe(true);
			expect(evaluateExpression('false', makeCtx())).toBe(false);
		});
	});

	describe('arithmetic operators', () => {
		it('adds numbers', () => {
			expect(evaluateExpression('2 + 3', makeCtx())).toBe(5);
		});

		it('subtracts numbers', () => {
			expect(evaluateExpression('10 - 4', makeCtx())).toBe(6);
		});

		it('multiplies numbers', () => {
			expect(evaluateExpression('3 * 7', makeCtx())).toBe(21);
		});

		it('divides numbers', () => {
			expect(evaluateExpression('10 / 2', makeCtx())).toBe(5);
		});

		it('returns null for division by zero', () => {
			expect(evaluateExpression('10 / 0', makeCtx())).toBeNull();
		});

		it('computes modulo', () => {
			expect(evaluateExpression('10 % 3', makeCtx())).toBe(1);
		});

		it('returns null for modulo by zero', () => {
			expect(evaluateExpression('10 % 0', makeCtx())).toBeNull();
		});
	});

	describe('comparison operators', () => {
		it('evaluates == (loose equality)', () => {
			expect(evaluateExpression("'active' == 'active'", makeCtx())).toBe(true);
			expect(evaluateExpression("'active' == 'done'", makeCtx())).toBe(false);
		});

		it('evaluates !=', () => {
			expect(evaluateExpression("'a' != 'b'", makeCtx())).toBe(true);
		});

		it('evaluates >', () => {
			expect(evaluateExpression('5 > 3', makeCtx())).toBe(true);
			expect(evaluateExpression('3 > 5', makeCtx())).toBe(false);
		});

		it('evaluates <', () => {
			expect(evaluateExpression('3 < 5', makeCtx())).toBe(true);
		});

		it('evaluates >=', () => {
			expect(evaluateExpression('5 >= 5', makeCtx())).toBe(true);
		});

		it('evaluates <=', () => {
			expect(evaluateExpression('5 <= 5', makeCtx())).toBe(true);
		});
	});

	describe('boolean operators', () => {
		it('evaluates && (short-circuit)', () => {
			expect(evaluateExpression('true && true', makeCtx())).toBe(true);
			expect(evaluateExpression('true && false', makeCtx())).toBe(false);
			expect(evaluateExpression('false && true', makeCtx())).toBe(false);
		});

		it('evaluates || (short-circuit)', () => {
			expect(evaluateExpression('false || true', makeCtx())).toBe(true);
			expect(evaluateExpression('false || false', makeCtx())).toBe(false);
		});

		it('evaluates !', () => {
			expect(evaluateExpression('!true', makeCtx())).toBe(false);
			expect(evaluateExpression('!false', makeCtx())).toBe(true);
		});

		it('evaluates unary minus on number', () => {
			expect(evaluateExpression('-5', makeCtx())).toBe(-5);
		});

		it('evaluates unary minus on grouped expression', () => {
			expect(evaluateExpression('-(2 + 3)', makeCtx())).toBe(-5);
		});

		it('evaluates unary minus on property', () => {
			const ctx = makeCtx({ priority: 7 });
			expect(evaluateExpression('-priority', ctx)).toBe(-7);
		});

		it('evaluates double unary minus', () => {
			expect(evaluateExpression('--5', makeCtx())).toBe(5);
		});

		it('evaluates unary minus with null (coerces to -0)', () => {
			expect(evaluateExpression('-missing', makeCtx())).toBe(-0);
		});
	});

	describe('property resolution', () => {
		it('resolves bare identifiers from note properties', () => {
			const ctx = makeCtx({ status: 'active' });
			expect(evaluateExpression('status', ctx)).toBe('active');
		});

		it('returns null for missing properties', () => {
			expect(evaluateExpression('missing', makeCtx())).toBeNull();
		});

		it('resolves file.name', () => {
			expect(evaluateExpression('file.name', makeCtx())).toBe('test.md');
		});

		it('resolves file.path', () => {
			expect(evaluateExpression('file.path', makeCtx())).toBe('/vault/test.md');
		});

		it('resolves file.folder', () => {
			expect(evaluateExpression('file.folder', makeCtx())).toBe('/vault');
		});

		it('resolves file.ext', () => {
			expect(evaluateExpression('file.ext', makeCtx())).toBe('.md');
		});

		it('resolves file.size', () => {
			expect(evaluateExpression('file.size', makeCtx())).toBe(1024);
		});

		it('resolves file.ctime as Date', () => {
			const result = evaluateExpression('file.ctime', makeCtx());
			expect(result).toBeInstanceOf(Date);
			expect((result as Date).getTime()).toBe(1690000000000);
		});

		it('resolves file.mtime as Date', () => {
			const result = evaluateExpression('file.mtime', makeCtx());
			expect(result).toBeInstanceOf(Date);
			expect((result as Date).getTime()).toBe(1700000000000);
		});

		it('resolves note.property as alias', () => {
			const ctx = makeCtx({ priority: 5 });
			expect(evaluateExpression('note.priority', ctx)).toBe(5);
		});

		it('resolves property.xxx as alias', () => {
			const ctx = makeCtx({ status: 'done' });
			expect(evaluateExpression('property.status', ctx)).toBe('done');
		});
	});

	describe('formula resolution', () => {
		it('resolves formula properties', () => {
			const ctx = makeCtx({ price: 100 }, { doubled: 'price * 2' });
			expect(evaluateExpression('formula.doubled', ctx)).toBe(200);
		});

		it('resolves formulas referencing other formulas', () => {
			const ctx = makeCtx(
				{ x: 10 },
				{ doubled: 'x * 2', quadrupled: 'formula.doubled * 2' },
			);
			expect(evaluateExpression('formula.quadrupled', ctx)).toBe(40);
		});

		it('throws on circular formula references', () => {
			const ctx = makeCtx({}, { a: 'formula.b', b: 'formula.a' });
			expect(() => evaluateExpression('formula.a', ctx)).toThrow('Circular formula reference');
		});
	});

	describe('functions', () => {
		it('evaluates if() with true condition', () => {
			expect(evaluateExpression("if(true, 'yes', 'no')", makeCtx())).toBe('yes');
		});

		it('evaluates if() with false condition', () => {
			expect(evaluateExpression("if(false, 'yes', 'no')", makeCtx())).toBe('no');
		});

		it('evaluates if() without else branch', () => {
			expect(evaluateExpression("if(false, 'yes')", makeCtx())).toBeNull();
		});

		it('evaluates now() returning a Date', () => {
			const result = evaluateExpression('now()', makeCtx());
			expect(result).toBeInstanceOf(Date);
		});

		it('evaluates today() returning a Date with zeroed time', () => {
			const result = evaluateExpression('today()', makeCtx()) as Date;
			expect(result).toBeInstanceOf(Date);
			expect(result.getHours()).toBe(0);
			expect(result.getMinutes()).toBe(0);
			expect(result.getSeconds()).toBe(0);
		});

		it('evaluates date() parsing a string', () => {
			const result = evaluateExpression("date('2024-06-15')", makeCtx()) as Date;
			expect(result).toBeInstanceOf(Date);
			expect(result.getFullYear()).toBe(2024);
		});

		it('evaluates number() converting values', () => {
			expect(evaluateExpression("number('42')", makeCtx())).toBe(42);
			expect(evaluateExpression('number(true)', makeCtx())).toBe(1);
			expect(evaluateExpression('number(false)', makeCtx())).toBe(0);
		});

		it('evaluates number() on Date returning milliseconds', () => {
			const result = evaluateExpression("number(date('2024-01-01'))", makeCtx());
			expect(typeof result).toBe('number');
			expect(result).toBeGreaterThan(0);
		});

		it('throws on unknown function', () => {
			expect(() => evaluateExpression('unknown()', makeCtx())).toThrow('Unknown function');
		});
	});

	describe('string/list functions', () => {
		it('evaluates contains() case-insensitive', () => {
			expect(evaluateExpression("contains('hello world', 'world')", makeCtx())).toBe(true);
			expect(evaluateExpression("contains('HELLO', 'hello')", makeCtx())).toBe(true);
			expect(evaluateExpression("contains('hello', 'xyz')", makeCtx())).toBe(false);
		});

		it('evaluates contains() with property values', () => {
			const ctx = makeCtx({ title: 'Meeting Notes' });
			expect(evaluateExpression("contains(title, 'meeting')", ctx)).toBe(true);
		});

		it('evaluates startsWith()', () => {
			expect(evaluateExpression("startsWith('hello', 'hel')", makeCtx())).toBe(true);
			expect(evaluateExpression("startsWith('hello', 'HEL')", makeCtx())).toBe(true);
			expect(evaluateExpression("startsWith('hello', 'world')", makeCtx())).toBe(false);
		});

		it('evaluates endsWith()', () => {
			expect(evaluateExpression("endsWith('hello', 'llo')", makeCtx())).toBe(true);
			expect(evaluateExpression("endsWith('hello', 'LLO')", makeCtx())).toBe(true);
			expect(evaluateExpression("endsWith('hello', 'hel')", makeCtx())).toBe(false);
		});

		it('evaluates isEmpty() for strings', () => {
			expect(evaluateExpression("isEmpty('')", makeCtx())).toBe(true);
			expect(evaluateExpression("isEmpty('x')", makeCtx())).toBe(false);
		});

		it('evaluates isEmpty() for null/undefined', () => {
			const ctx = makeCtx({});
			expect(evaluateExpression('isEmpty(missing)', ctx)).toBe(true);
		});

		it('evaluates isEmpty() for arrays', () => {
			const ctx = makeCtx({ tags: [], items: ['a'] });
			expect(evaluateExpression('isEmpty(tags)', ctx)).toBe(true);
			expect(evaluateExpression('isEmpty(items)', ctx)).toBe(false);
		});
	});

	describe('method-style calls', () => {
		it('evaluates file.hasTag()', () => {
			const ctx = makeCtx({ tags: ['people', 'work'] });
			expect(evaluateExpression("file.hasTag('people')", ctx)).toBe(true);
			expect(evaluateExpression("file.hasTag('People')", ctx)).toBe(true);
			expect(evaluateExpression("file.hasTag('missing')", ctx)).toBe(false);
		});

		it('evaluates file.hasTag() returns false when no tags', () => {
			expect(evaluateExpression("file.hasTag('test')", makeCtx())).toBe(false);
		});

		it('evaluates file.inFolder()', () => {
			const ctx = makeCtx({}, {}, { folder: '/vault/notes' });
			expect(evaluateExpression("file.inFolder('/vault')", ctx)).toBe(true);
			expect(evaluateExpression("file.inFolder('/vault/notes')", ctx)).toBe(true);
			expect(evaluateExpression("file.inFolder('/other')", ctx)).toBe(false);
		});

		it('evaluates file.hasProperty()', () => {
			const ctx = makeCtx({ status: 'active' });
			expect(evaluateExpression("file.hasProperty('status')", ctx)).toBe(true);
			expect(evaluateExpression("file.hasProperty('missing')", ctx)).toBe(false);
		});

		it('evaluates property.contains() on strings', () => {
			const ctx = makeCtx({ title: 'Meeting Notes' });
			expect(evaluateExpression("title.contains('meeting')", ctx)).toBe(true);
			expect(evaluateExpression("title.contains('xyz')", ctx)).toBe(false);
		});

		it('evaluates property.contains() on arrays', () => {
			const ctx = makeCtx({ tags: ['work', 'important'] });
			expect(evaluateExpression("tags.contains('work')", ctx)).toBe(true);
			expect(evaluateExpression("tags.contains('WORK')", ctx)).toBe(true);
			expect(evaluateExpression("tags.contains('missing')", ctx)).toBe(false);
		});

		it('evaluates property.startsWith()', () => {
			const ctx = makeCtx({ status: 'in-progress' });
			expect(evaluateExpression("status.startsWith('in-')", ctx)).toBe(true);
		});

		it('evaluates property.endsWith()', () => {
			const ctx = makeCtx({ filename: 'report.pdf' });
			expect(evaluateExpression("filename.endsWith('.pdf')", ctx)).toBe(true);
		});

		it('evaluates property.isEmpty()', () => {
			const ctx = makeCtx({ empty: '', filled: 'value' });
			expect(evaluateExpression('empty.isEmpty()', ctx)).toBe(true);
			expect(evaluateExpression('filled.isEmpty()', ctx)).toBe(false);
		});

		it('throws on unknown file method', () => {
			expect(() => evaluateExpression("file.unknownMethod('x')", makeCtx())).toThrow('Unknown file method');
		});

		it('throws on unknown property method', () => {
			const ctx = makeCtx({ status: 'active' });
			expect(() => evaluateExpression("status.unknownMethod('x')", ctx)).toThrow('Unknown method');
		});
	});

	describe('complex expressions', () => {
		it('evaluates filter-style expression', () => {
			const ctx = makeCtx({ status: 'active', priority: 5 });
			expect(evaluateExpression("status == 'active' && priority > 3", ctx)).toBe(true);
			expect(evaluateExpression("status == 'done' && priority > 3", ctx)).toBe(false);
		});

		it('evaluates formula expression with file properties', () => {
			const ctx = makeCtx({}, {}, { size: 2048 });
			expect(evaluateExpression('file.size > 1000', ctx)).toBe(true);
		});

		it('handles null property in comparison', () => {
			const ctx = makeCtx({});
			// null == null should be true (loose equality)
			expect(evaluateExpression("missing == 'something'", ctx)).toBe(false);
		});
	});

	describe('higher-order list methods', () => {
		it('preserves record properties when filter expression throws', () => {
			const ctx = makeCtx({ items: [1, 2, 3], status: 'active' });
			const originalProperties = ctx.record.properties;

			// items.filter(unknown()) should throw inside the filter callback
			// because unknown() is not a recognized function
			expect(() => evaluateExpression('items.filter(unknown())', ctx)).toThrow();

			// BUG: ctx.record.properties should be restored even after the throw
			expect(ctx.record.properties).toBe(originalProperties);
			expect(ctx.record.properties.has('value')).toBe(false);
			expect(ctx.record.properties.has('index')).toBe(false);
		});

		it('preserves record properties when map expression throws', () => {
			const ctx = makeCtx({ items: ['a', 'b'], score: 10 });
			const originalProperties = ctx.record.properties;

			expect(() => evaluateExpression('items.map(unknown())', ctx)).toThrow();

			expect(ctx.record.properties).toBe(originalProperties);
			expect(ctx.record.properties.get('score')).toBe(10);
			expect(ctx.record.properties.has('value')).toBe(false);
		});
	});

	describe('type coercion', () => {
		it('coerces null to 0 in arithmetic', () => {
			const ctx = makeCtx({});
			expect(evaluateExpression('missing + 5', ctx)).toBe(5);
		});

		it('coerces boolean to number in arithmetic', () => {
			expect(evaluateExpression('true + 1', makeCtx())).toBe(2);
		});

		it('compares dates correctly', () => {
			const ctx = makeCtx({}, {}, { mtime: 1700000000000, ctime: 1690000000000 });
			expect(evaluateExpression('file.mtime > file.ctime', ctx)).toBe(true);
		});
	});

	describe('mixed-type comparisons', () => {
		it('compares number vs numeric string with loose equality', () => {
			// JavaScript loose equality: 5 == '5' → true
			expect(evaluateExpression("5 == '5'", makeCtx())).toBe(true);
		});

		it('compares number vs non-numeric string with loose equality', () => {
			expect(evaluateExpression("5 == 'five'", makeCtx())).toBe(false);
		});

		it('compares null vs empty string with loose equality', () => {
			const ctx = makeCtx({});
			// null == '' → false (JS semantics: null only == null/undefined)
			expect(evaluateExpression("missing == ''", ctx)).toBe(false);
		});

		it('compares null vs 0 with loose equality', () => {
			const ctx = makeCtx({});
			// null == 0 → false (JS semantics)
			expect(evaluateExpression('missing == 0', ctx)).toBe(false);
		});

		it('compares number > string using toNumber coercion', () => {
			// '3' → 3 via toNumber, so 5 > 3 → true
			expect(evaluateExpression("5 > '3'", makeCtx())).toBe(true);
		});

		it('compares string > string using localeCompare', () => {
			expect(evaluateExpression("'banana' > 'apple'", makeCtx())).toBe(true);
			expect(evaluateExpression("'apple' > 'banana'", makeCtx())).toBe(false);
		});

		it('compares boolean in arithmetic context', () => {
			// true → 1, false → 0
			expect(evaluateExpression('true > false', makeCtx())).toBe(true);
			expect(evaluateExpression('false > true', makeCtx())).toBe(false);
		});
	});

	describe('known limitations', () => {
		it('does not traverse nested frontmatter objects (looks up literal key)', () => {
			// Frontmatter: meta: { title: "hello" }
			// The key in properties Map is "meta" → { title: "hello" }, NOT "meta.title" → "hello"
			const ctx = makeCtx({ meta: { title: 'hello' } });
			// meta.title resolves to null because "meta.title" is not a literal key in the Map
			expect(evaluateExpression('meta.title', ctx)).toBeNull();
			// The top-level "meta" key resolves to the object
			expect(evaluateExpression('meta', ctx)).toEqual({ title: 'hello' });
		});
	});
});
