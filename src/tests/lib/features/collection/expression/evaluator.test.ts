import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateExpression, PLAIN_FUNCTIONS, validateExpression, type EvalContext } from '#lib/features/collection/expression/evaluator.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { runtimeTimeZoneSwitchWorks, withTimeZone } from '../../../../fixtures/timezone.fixture';

function makeRecord(overrides: Partial<PropertyIndexRecord> = {}): PropertyIndexRecord {
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
	recordOverrides: Partial<PropertyIndexRecord> = {},
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

		describe('frontmatter aliases (type -> _type)', () => {
			it('resolves bare type identifier to the canonical _type property', () => {
				const ctx = makeCtx({ _type: 'Person' });
				expect(evaluateExpression('type', ctx)).toBe('Person');
			});

			it('resolves the canonical _type identifier directly', () => {
				const ctx = makeCtx({ _type: 'Person' });
				expect(evaluateExpression('_type', ctx)).toBe('Person');
			});

			it('compares type == "Person" against the stored _type value', () => {
				const ctx = makeCtx({ _type: 'Person' });
				expect(evaluateExpression('type == "Person"', ctx)).toBe(true);
				expect(evaluateExpression('type == "Project"', ctx)).toBe(false);
			});

			it('resolves note.type / property.type via the namespace prefix', () => {
				const ctx = makeCtx({ _type: 'Project' });
				expect(evaluateExpression('note.type', ctx)).toBe('Project');
				expect(evaluateExpression('property.type', ctx)).toBe('Project');
			});

			it('returns null when the type is not set', () => {
				const ctx = makeCtx({});
				expect(evaluateExpression('type', ctx)).toBeNull();
				expect(evaluateExpression('note.type', ctx)).toBeNull();
			});

			it('does not resolve the dropped is_a alias', () => {
				const ctx = makeCtx({ _type: 'Person' });
				// `is_a` is no longer an alias; it looks up a (missing) `is_a` property.
				expect(evaluateExpression('is_a', ctx)).toBeNull();
			});

			// `type.lower()` parses to a dotted-callee `call` node (parser.ts
			// isStaticPath), which resolves through resolvePropertyPath rather
			// than resolveIdentifier. That path used to skip the alias, so the
			// receiver was null and dispatchMethod threw "Unknown method: lower".
			it('applies the alias to a method call on the bare type identifier', () => {
				const ctx = makeCtx({ _type: 'Person' });
				expect(evaluateExpression('type.lower()', ctx)).toBe('person');
				expect(evaluateExpression('type.lower() == "person"', ctx)).toBe(true);
				expect(evaluateExpression('type.contains("erso")', ctx)).toBe(true);
			});

			it('applies the alias to a method call behind note. / property.', () => {
				const ctx = makeCtx({ _type: 'Person' });
				expect(evaluateExpression('note.type.lower()', ctx)).toBe('person');
				expect(evaluateExpression('property.type.lower()', ctx)).toBe('person');
			});

			it('leaves non-aliased identifiers untouched in method calls', () => {
				const ctx = makeCtx({ _type: 'Person', status: 'Active' });
				expect(evaluateExpression('status.lower()', ctx)).toBe('active');
				expect(evaluateExpression('_type.lower()', ctx)).toBe('person');
			});
		});

		describe('case-insensitive equality for type / _type', () => {
			it('matches lowercase RHS against capitalised stored type', () => {
				const ctx = makeCtx({ _type: 'Person' });
				expect(evaluateExpression('type == "person"', ctx)).toBe(true);
				expect(evaluateExpression('type == "Person"', ctx)).toBe(true);
				expect(evaluateExpression('type == "PERSON"', ctx)).toBe(true);
				expect(evaluateExpression('type == "PeRsOn"', ctx)).toBe(true);
			});

			it('matches when the identifier sits on the RHS of ==', () => {
				const ctx = makeCtx({ _type: 'Person' });
				expect(evaluateExpression('"person" == type', ctx)).toBe(true);
				expect(evaluateExpression('"PERSON" == type', ctx)).toBe(true);
			});

			it('returns false for !=', () => {
				const ctx = makeCtx({ _type: 'Person' });
				expect(evaluateExpression('type != "person"', ctx)).toBe(false);
				expect(evaluateExpression('type != "project"', ctx)).toBe(true);
			});

			it('applies the relaxed comparison to the canonical _type identifier too', () => {
				const ctx = makeCtx({ _type: 'Person' });
				expect(evaluateExpression('_type == "person"', ctx)).toBe(true);
				expect(evaluateExpression('_type != "project"', ctx)).toBe(true);
			});

			it('works through note.type and property.type member access', () => {
				const ctx = makeCtx({ _type: 'Project' });
				expect(evaluateExpression('note.type == "project"', ctx)).toBe(true);
				expect(evaluateExpression('property.type == "PROJECT"', ctx)).toBe(true);
			});

			it('keeps comparisons of unrelated string fields strictly case-sensitive', () => {
				const ctx = makeCtx({ _type: 'Person', name: 'Alice' });
				expect(evaluateExpression('name == "Alice"', ctx)).toBe(true);
				expect(evaluateExpression('name == "alice"', ctx)).toBe(false);
				expect(evaluateExpression('name == "ALICE"', ctx)).toBe(false);
			});

			it('preserves null semantics when the type property is missing', () => {
				const ctx = makeCtx({});
				expect(evaluateExpression('type == "person"', ctx)).toBe(false);
				expect(evaluateExpression('type != "person"', ctx)).toBe(true);
			});

			it('keeps type == <otherField> case-sensitive (does not lowercase the other field)', () => {
				// Headline repro: comparing the type field against ANOTHER property
				// must not silently lowercase that property's value.
				const ctx = makeCtx({ _type: 'PERSON', status: 'person' });
				expect(evaluateExpression('type == status', ctx)).toBe(false);
				expect(evaluateExpression('type != status', ctx)).toBe(true);
			});

			it('keeps <otherField> == type case-sensitive when reversed', () => {
				const ctx = makeCtx({ _type: 'PERSON', status: 'person' });
				expect(evaluateExpression('status == type', ctx)).toBe(false);
				expect(evaluateExpression('status != type', ctx)).toBe(true);
			});

			it('matches type == <otherField> only when the actual stored cases agree', () => {
				const ctx = makeCtx({ _type: 'Person', role: 'Person' });
				expect(evaluateExpression('type == role', ctx)).toBe(true);
				expect(evaluateExpression('type != role', ctx)).toBe(false);
			});

			it('keeps cross-field comparison case-sensitive through member access', () => {
				const ctx = makeCtx({ _type: 'PERSON', status: 'person' });
				expect(evaluateExpression('note.type == status', ctx)).toBe(false);
				expect(evaluateExpression('property.type == status', ctx)).toBe(false);
			});

			it('does not relax case for ordering operators on type', () => {
				// Only == / != are case-insensitive for type; >= / <= must compare
				// the stored case. If case were folded, 'Person' and 'PERSON' would
				// be equal and BOTH >= and <= would hold — they must not.
				const ctx = makeCtx({ _type: 'Person' });
				const bothHold =
					evaluateExpression('type >= "PERSON"', ctx) === true &&
					evaluateExpression('type <= "PERSON"', ctx) === true;
				expect(bothHold).toBe(false);
			});

			it('handles a numeric type value against a numeric literal', () => {
				const ctx = makeCtx({ _type: 3 });
				expect(evaluateExpression('type == 3', ctx)).toBe(true);
				expect(evaluateExpression('type != 4', ctx)).toBe(true);
			});

			it('handles a boolean type value against a boolean literal', () => {
				const ctx = makeCtx({ _type: true });
				expect(evaluateExpression('type == true', ctx)).toBe(true);
				expect(evaluateExpression('type != false', ctx)).toBe(true);
			});
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

		it('evaluates a method call on a function-call result (call().method())', () => {
			expect(evaluateExpression("date('2024-06-15').format('YYYY')", makeCtx())).toBe('2024');
		});

		it('chains methods on a call result', () => {
			const result = evaluateExpression("date('2024-06-15').date()", makeCtx()) as Date;
			expect(result).toBeInstanceOf(Date);
			expect(result.getHours()).toBe(0);
			expect(evaluateExpression("date('2024-06-15').date().format('YYYY')", makeCtx())).toBe('2024');
		});

		it('evaluates now().relative() returning a string', () => {
			expect(typeof evaluateExpression('now().relative()', makeCtx())).toBe('string');
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

		describe('file.inFolder() with a vault path', () => {
			const noteIn = (folder: string): EvalContext => ({
				...makeCtx({}, {}, { folder, path: `${folder}/n.md` }),
				vaultPath: '/v',
			});

			it('resolves a vault-relative folder against the vault path, subfolders included', () => {
				const ctx = noteIn('/v/work/topics/AWS');
				expect(evaluateExpression('file.inFolder("work/topics/AWS")', ctx)).toBe(true);
				expect(evaluateExpression('file.inFolder("work")', ctx)).toBe(true);
				expect(evaluateExpression('file.inFolder("work/topics/GCP")', ctx)).toBe(false);
			});

			it('does not match a sibling folder that shares the prefix', () => {
				expect(evaluateExpression('file.inFolder("/v/work")', noteIn('/v/workshop'))).toBe(false);
				expect(evaluateExpression('file.inFolder("work")', noteIn('/v/workshop'))).toBe(false);
				expect(evaluateExpression('file.inFolder("/v/work")', noteIn('/v/work'))).toBe(true);
			});

			it('ignores a trailing slash and letter case', () => {
				const ctx = noteIn('/v/Work/Topics');
				expect(evaluateExpression('file.inFolder("work/topics/")', ctx)).toBe(true);
				expect(evaluateExpression('file.inFolder("WORK")', ctx)).toBe(true);
				expect(evaluateExpression('file.inFolder("/V/work/")', ctx)).toBe(true);
			});

			it('matches nothing for a relative folder when there is no vault path', () => {
				const ctx = makeCtx({}, {}, { folder: '/v/work', path: '/v/work/n.md' });
				expect(() => evaluateExpression('file.inFolder("work")', ctx)).not.toThrow();
				expect(evaluateExpression('file.inFolder("work")', ctx)).toBe(false);
				expect(evaluateExpression('file.inFolder("/v/work")', ctx)).toBe(true);
			});
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

/**
 * Asserts the date "is" semantics of `file.mtime` / `file.ctime` against a
 * `YYYY-MM-DD` string in the zone the caller runs it under. Record times are
 * built with the local constructor here, so they land on the local day.
 */
function expectDayEqualityForFileDates(): void {
	const matching = [new Date(2026, 10, 3, 0, 30).getTime(), new Date(2026, 10, 3, 23, 30).getTime()];
	const other = [new Date(2026, 10, 2, 23, 30).getTime(), new Date(2026, 10, 4, 0, 30).getTime()];
	for (const field of ['mtime', 'ctime'] as const) {
		for (const time of matching) {
			const ctx = makeCtx({}, {}, { [field]: time });
			expect(evaluateExpression(`file.${field} == '2026-11-03'`, ctx), `${field} ${new Date(time).toString()}`).toBe(true);
			expect(evaluateExpression(`'2026-11-03' == file.${field}`, ctx)).toBe(true);
			expect(evaluateExpression(`file.${field} != '2026-11-03'`, ctx)).toBe(false);
		}
		for (const time of other) {
			const ctx = makeCtx({}, {}, { [field]: time });
			expect(evaluateExpression(`file.${field} == '2026-11-03'`, ctx), `${field} ${new Date(time).toString()}`).toBe(false);
			expect(evaluateExpression(`file.${field} != '2026-11-03'`, ctx)).toBe(true);
		}
	}
}

describe('date "is" on file.mtime / file.ctime', () => {
	it('matches every time on the local calendar day and no other day', () => {
		expectDayEqualityForFileDates();
	});

	it('never matches and never throws for an empty or non-date string', () => {
		const ctx = makeCtx({}, {}, { mtime: new Date(2026, 10, 3, 12).getTime(), ctime: new Date(2026, 10, 3, 12).getTime() });
		for (const expr of ["file.mtime == ''", "file.mtime == 'abc'", "file.ctime == ''", "file.ctime == 'abc'"]) {
			expect(() => evaluateExpression(expr, ctx)).not.toThrow();
			expect(evaluateExpression(expr, ctx)).toBe(false);
		}
	});

	it('keeps exact-millisecond equality for Date vs Date', () => {
		const time = new Date(2026, 10, 3, 10, 0).getTime();
		const ctx = makeCtx({}, {}, { mtime: time, ctime: time + 1 });
		expect(evaluateExpression('file.mtime == file.ctime', ctx)).toBe(false);
	});

	it('keeps string equality for a frontmatter date property', () => {
		expect(evaluateExpression("due == '2026-11-03'", makeCtx({ due: '2026-11-03' }))).toBe(true);
		expect(evaluateExpression("due == '2026-11-03'", makeCtx({ due: '2026-11-04' }))).toBe(false);
	});
});

describe.runIf(runtimeTimeZoneSwitchWorks())('date "is" on file dates across time zones', () => {
	for (const tz of ['America/Sao_Paulo', 'Asia/Tokyo']) {
		it(`matches the local calendar day in ${tz}`, () => {
			withTimeZone(tz, () => expectDayEqualityForFileDates());
		});
	}
});

/** The toolbar's before / on or before / after / on or after operators */
const DATE_OPERATORS = ['<', '<=', '>', '>='] as const;

/** @returns the operators for which `<left> <op> <right>` is true */
function matchingOperators(left: string, right: string, ctx: EvalContext): string[] {
	return DATE_OPERATORS.filter((op) => evaluateExpression(`${left} ${op} ${right}`, ctx) === true);
}

describe('comparisons against a date-only date() literal', () => {
	it('compares file.mtime by its local calendar day', () => {
		const at = (...parts: [number, number, number, number, number]) => makeCtx({}, {}, { mtime: new Date(...parts).getTime() });
		expect(matchingOperators('file.mtime', "date('2026-03-01')", at(2026, 2, 1, 10, 0))).toEqual(['<=', '>=']);
		expect(matchingOperators('file.mtime', "date('2026-03-01')", at(2026, 1, 28, 23, 0))).toEqual(['<', '<=']);
		expect(matchingOperators('file.mtime', "date('2026-03-01')", at(2026, 2, 2, 0, 30))).toEqual(['>', '>=']);
	});

	it('applies the day rule with the literal on the left', () => {
		const ctx = makeCtx({ due: '2026-03-01T10:00' });
		expect(matchingOperators("date('2026-03-01')", 'due', ctx)).toEqual(['<=', '>=']);
	});

	it('matches the whole day for == and negates it for !=', () => {
		const sameDay = makeCtx({}, {}, { mtime: new Date(2026, 10, 3, 10, 0).getTime() });
		const nextDay = makeCtx({}, {}, { mtime: new Date(2026, 10, 4, 10, 0).getTime() });
		expect(evaluateExpression("file.mtime == date('2026-11-03')", sameDay)).toBe(true);
		expect(evaluateExpression("file.mtime != date('2026-11-03')", sameDay)).toBe(false);
		expect(evaluateExpression("file.mtime == date('2026-11-03')", nextDay)).toBe(false);
		expect(evaluateExpression("file.mtime != date('2026-11-03')", nextDay)).toBe(true);
		expect(evaluateExpression("due == date('2026-11-03')", makeCtx({ due: '2026-11-03T18:00' }))).toBe(true);
	});

	it('matches no operator for a value that is not a date', () => {
		const texts = [{ due: 'Week 3' }, { due: 'Phase 2' }, { due: '1/2' }, { due: '5' }];
		for (const props of [{ due: '' }, { due: 'abc' }, ...texts, { due: null }, {}]) {
			const ctx = makeCtx(props);
			expect(() => matchingOperators('due', "date('2026-03-01')", ctx)).not.toThrow();
			expect(matchingOperators('due', "date('2026-03-01')", ctx), JSON.stringify(props)).toEqual([]);
			expect(evaluateExpression("due == date('2026-03-01')", ctx)).toBe(false);
		}
	});

	it('keeps instant comparison for a date() built from a datetime string', () => {
		const ctx = makeCtx({}, {}, { mtime: new Date(2026, 2, 1, 9, 0).getTime() });
		expect(matchingOperators('file.mtime', "date('2026-03-01T10:00')", ctx)).toEqual(['<', '<=']);
		expect(evaluateExpression("file.mtime == date('2026-03-01T10:00')", ctx)).toBe(false);
		expect(evaluateExpression("file.mtime == date('2026-03-01T09:00')", ctx)).toBe(true);
	});

	it('keeps Date vs Date and Date vs number comparisons as instants', () => {
		const mtime = new Date(2026, 2, 1, 10, 0).getTime();
		const ctx = makeCtx({}, {}, { mtime, ctime: mtime - 1 });
		expect(evaluateExpression('file.mtime > file.ctime', ctx)).toBe(true);
		expect(evaluateExpression(`file.mtime > ${mtime - 1}`, ctx)).toBe(true);
		expect(evaluateExpression(`file.mtime < ${mtime + 1}`, ctx)).toBe(true);
		expect(evaluateExpression(`file.mtime > ${mtime}`, ctx)).toBe(false);
	});

	it('reads a non-ISO string paired with a Date as no date', () => {
		const ctx = makeCtx({}, {}, { mtime: new Date(2026, 2, 1, 10, 0).getTime() });
		expect(matchingOperators('file.mtime', "'0'", ctx)).toEqual([]);
		expect(matchingOperators('file.mtime', "'2026'", ctx)).toEqual([]);
		expect(matchingOperators('file.mtime', "'2026-02-28 23:00'", ctx)).toEqual(['>', '>=']);
	});
});

describe.runIf(runtimeTimeZoneSwitchWorks())('date() date-only literal across time zones', () => {
	it('builds local midnight in America/Sao_Paulo', () => {
		withTimeZone('America/Sao_Paulo', () => {
			const result = evaluateExpression("date('2026-03-01')", makeCtx()) as Date;
			expect(result.getTime()).toBe(new Date(2026, 2, 1).getTime());
		});
	});
});

describe('validateExpression', () => {
	it('accepts an expression that parses and calls only known functions', () => {
		expect(validateExpression("contains(status, 'a') && file.hasTag('x')")).toBeUndefined();
	});

	it('rejects an expression that does not parse', () => {
		expect(validateExpression("status = 'active'")).toBeDefined();
	});

	it('names an unknown function, also nested inside arguments', () => {
		expect(validateExpression('foo(1) == 2')).toContain('foo');
		expect(validateExpression("if(true, [bar(1)], 'x')")).toContain('bar');
	});

	it.each([...PLAIN_FUNCTIONS])('passes every plain function the evaluator handles: %s', (name) => {
		const expr = `${name}('a', 'b', 'c')`;
		expect(validateExpression(expr)).toBeUndefined();
		expect(() => evaluateExpression(expr, makeCtx())).not.toThrow();
	});

	it('lists exactly the cases of the evaluateCall switch', () => {
		const source = readFileSync(join(process.cwd(), 'src/lib/features/collection/expression/evaluator.ts'), 'utf8');
		const body = source.slice(source.indexOf('function evaluateCall('), source.indexOf('function evaluateMethodCall('));
		const cases = [...body.matchAll(/^\t\tcase '([^']+)':/gm)].map((m) => m[1]);
		expect(cases.length).toBeGreaterThan(0);
		expect([...PLAIN_FUNCTIONS].sort()).toEqual(cases.sort());
	});
});
