import { describe, it, expect } from 'vitest';
import {
	parseExpressionToRow,
	filterRowToExpression,
	parseFilterToGroups,
	filterGroupsToFilter,
	getOperatorsForType,
	getAllKnownProperties,
	inferPropertyType,
	createEmptyFilterRow,
	isUnaryOperator,
} from '#lib/features/collection/toolbar/filter.logic.js';
import { executeQuery } from '#lib/features/collection/collection.logic.js';
import type { CollectionDefinition, CollectionFilter, PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import type { FilterOperator, FilterRow } from '#lib/features/collection/toolbar/toolbar.types.js';

function makeRecord(
	path: string,
	props: Record<string, unknown> = {},
	overrides: Partial<PropertyIndexRecord> = {},
): PropertyIndexRecord {
	return {
		path,
		name: path.split('/').pop()!,
		basename: path.split('/').pop()!.replace(/\.\w+$/, ''),
		folder: path.substring(0, path.lastIndexOf('/')),
		ext: '.md',
		mtime: 1700000000000,
		ctime: 1690000000000,
		size: 1024,
		properties: new Map(Object.entries(props)),
		...overrides,
	};
}

function makeIndex(records: PropertyIndexRecord[]): Map<string, PropertyIndexRecord> {
	return new Map(records.map((r) => [r.path, r]));
}

describe('parseExpressionToRow', () => {
	it('parses text equality: status == \'active\'', () => {
		const row = parseExpressionToRow("status == 'active'");
		expect(row.property).toBe('status');
		expect(row.operator).toBe('is');
		expect(row.value).toBe('active');
		expect(row.raw).toBeUndefined();
	});

	it('parses text inequality: status != \'done\'', () => {
		const row = parseExpressionToRow("status != 'done'");
		expect(row.property).toBe('status');
		expect(row.operator).toBe('is_not');
		expect(row.value).toBe('done');
	});

	it('parses numeric comparison: priority > 3', () => {
		const row = parseExpressionToRow('priority > 3');
		expect(row.property).toBe('priority');
		expect(row.operator).toBe('gt');
		expect(row.value).toBe('3');
	});

	it('parses numeric equality: count == 5', () => {
		const row = parseExpressionToRow('count == 5');
		expect(row.property).toBe('count');
		expect(row.operator).toBe('eq');
		expect(row.value).toBe('5');
	});

	it('parses member expression: file.name != \'test.md\'', () => {
		const row = parseExpressionToRow("file.name != 'test.md'");
		expect(row.property).toBe('file.name');
		expect(row.operator).toBe('is_not');
		expect(row.value).toBe('test.md');
	});

	it('parses contains() call', () => {
		const row = parseExpressionToRow("contains(title, 'meeting')");
		expect(row.property).toBe('title');
		expect(row.operator).toBe('contains');
		expect(row.value).toBe('meeting');
	});

	it('parses !contains() call', () => {
		const row = parseExpressionToRow("!contains(status, 'draft')");
		expect(row.property).toBe('status');
		expect(row.operator).toBe('does_not_contain');
		expect(row.value).toBe('draft');
	});

	it('parses startsWith() call', () => {
		const row = parseExpressionToRow("startsWith(title, 'intro')");
		expect(row.property).toBe('title');
		expect(row.operator).toBe('starts_with');
		expect(row.value).toBe('intro');
	});

	it('parses endsWith() call', () => {
		const row = parseExpressionToRow("endsWith(file.name, '.md')");
		expect(row.property).toBe('file.name');
		expect(row.operator).toBe('ends_with');
		expect(row.value).toBe('.md');
	});

	it('parses isEmpty() call', () => {
		const row = parseExpressionToRow('isEmpty(tags)');
		expect(row.property).toBe('tags');
		expect(row.operator).toBe('is_empty');
		expect(row.value).toBe('');
	});

	it('parses !isEmpty() call', () => {
		const row = parseExpressionToRow('!isEmpty(status)');
		expect(row.property).toBe('status');
		expect(row.operator).toBe('is_not_empty');
		expect(row.value).toBe('');
	});

	it('parses boolean equality: archived == true', () => {
		const row = parseExpressionToRow('archived == true');
		expect(row.property).toBe('archived');
		expect(row.operator).toBe('is_true');
	});

	it('parses boolean equality: archived == false', () => {
		const row = parseExpressionToRow('archived == false');
		expect(row.property).toBe('archived');
		expect(row.operator).toBe('is_false');
	});

	it('parses date comparison: date < date(\'2024-01-01\')', () => {
		const row = parseExpressionToRow("due < date('2024-01-01')");
		expect(row.property).toBe('due');
		expect(row.operator).toBe('before');
		expect(row.value).toBe('2024-01-01');
	});

	it('parses date comparison: date > date(\'2024-01-01\')', () => {
		const row = parseExpressionToRow("due > date('2024-01-01')");
		expect(row.property).toBe('due');
		expect(row.operator).toBe('after');
		expect(row.value).toBe('2024-01-01');
	});

	it('parses date comparison: date <= date(\'2024-01-01\')', () => {
		const row = parseExpressionToRow("due <= date('2024-01-01')");
		expect(row.property).toBe('due');
		expect(row.operator).toBe('on_or_before');
		expect(row.value).toBe('2024-01-01');
	});

	it('parses date comparison: date >= date(\'2024-01-01\')', () => {
		const row = parseExpressionToRow("due >= date('2024-01-01')");
		expect(row.property).toBe('due');
		expect(row.operator).toBe('on_or_after');
		expect(row.value).toBe('2024-01-01');
	});

	it('round-trips a date "is" row on file.mtime', () => {
		const expr = "file.mtime == '2026-11-03'";
		const row = parseExpressionToRow(expr);
		expect(row.raw).toBeUndefined();
		expect(row.property).toBe('file.mtime');
		expect(row.operator).toBe('is');
		expect(row.value).toBe('2026-11-03');
		expect(filterRowToExpression(row)).toBe(expr);
	});

	it('falls back to raw for complex expression: a + b > 5', () => {
		const row = parseExpressionToRow('a + b > 5');
		expect(row.raw).toBe('a + b > 5');
	});

	it('falls back to raw for negated identifier: !archived', () => {
		const row = parseExpressionToRow('!archived');
		expect(row.raw).toBe('!archived');
	});

	it('falls back to raw for compound expression', () => {
		const row = parseExpressionToRow("status == 'active' && priority > 3");
		expect(row.raw).toBe("status == 'active' && priority > 3");
	});

	it('falls back to raw for if() call', () => {
		const row = parseExpressionToRow("if(x, true, false)");
		expect(row.raw).toBe("if(x, true, false)");
	});
});

describe('filterRowToExpression', () => {
	it('serializes text is operator', () => {
		const row: FilterRow = { id: '1', property: 'status', operator: 'is', value: 'active' };
		expect(filterRowToExpression(row)).toBe("status == 'active'");
	});

	it('serializes text is_not operator', () => {
		const row: FilterRow = { id: '1', property: 'status', operator: 'is_not', value: 'done' };
		expect(filterRowToExpression(row)).toBe("status != 'done'");
	});

	it('serializes contains operator', () => {
		const row: FilterRow = { id: '1', property: 'title', operator: 'contains', value: 'meeting' };
		expect(filterRowToExpression(row)).toBe("contains(title, 'meeting')");
	});

	it('serializes does_not_contain operator', () => {
		const row: FilterRow = { id: '1', property: 'title', operator: 'does_not_contain', value: 'draft' };
		expect(filterRowToExpression(row)).toBe("!contains(title, 'draft')");
	});

	it('serializes starts_with operator', () => {
		const row: FilterRow = { id: '1', property: 'title', operator: 'starts_with', value: 'intro' };
		expect(filterRowToExpression(row)).toBe("startsWith(title, 'intro')");
	});

	it('serializes ends_with operator', () => {
		const row: FilterRow = { id: '1', property: 'file.name', operator: 'ends_with', value: '.md' };
		expect(filterRowToExpression(row)).toBe("endsWith(file.name, '.md')");
	});

	it('serializes numeric operators without quotes', () => {
		expect(filterRowToExpression({ id: '1', property: 'priority', operator: 'eq', value: '5' }))
			.toBe('priority == 5');
		expect(filterRowToExpression({ id: '1', property: 'priority', operator: 'neq', value: '3' }))
			.toBe('priority != 3');
		expect(filterRowToExpression({ id: '1', property: 'priority', operator: 'gt', value: '3' }))
			.toBe('priority > 3');
		expect(filterRowToExpression({ id: '1', property: 'priority', operator: 'lt', value: '10' }))
			.toBe('priority < 10');
		expect(filterRowToExpression({ id: '1', property: 'priority', operator: 'gte', value: '5' }))
			.toBe('priority >= 5');
		expect(filterRowToExpression({ id: '1', property: 'priority', operator: 'lte', value: '8' }))
			.toBe('priority <= 8');
	});

	it('serializes date operators with date() wrapper', () => {
		expect(filterRowToExpression({ id: '1', property: 'due', operator: 'before', value: '2024-01-01' }))
			.toBe("due < date('2024-01-01')");
		expect(filterRowToExpression({ id: '1', property: 'due', operator: 'after', value: '2024-06-15' }))
			.toBe("due > date('2024-06-15')");
		expect(filterRowToExpression({ id: '1', property: 'due', operator: 'on_or_before', value: '2024-12-31' }))
			.toBe("due <= date('2024-12-31')");
		expect(filterRowToExpression({ id: '1', property: 'due', operator: 'on_or_after', value: '2024-01-01' }))
			.toBe("due >= date('2024-01-01')");
	});

	it('serializes boolean operators', () => {
		expect(filterRowToExpression({ id: '1', property: 'archived', operator: 'is_true', value: '' }))
			.toBe('archived == true');
		expect(filterRowToExpression({ id: '1', property: 'archived', operator: 'is_false', value: '' }))
			.toBe('archived == false');
	});

	it('serializes is_empty and is_not_empty', () => {
		expect(filterRowToExpression({ id: '1', property: 'tags', operator: 'is_empty', value: '' }))
			.toBe('isEmpty(tags)');
		expect(filterRowToExpression({ id: '1', property: 'tags', operator: 'is_not_empty', value: '' }))
			.toBe('!isEmpty(tags)');
	});

	it('returns raw expression directly when present', () => {
		const row: FilterRow = { id: '1', property: '', operator: 'is', value: '', raw: 'a + b > 5' };
		expect(filterRowToExpression(row)).toBe('a + b > 5');
	});

	it('round-trips text equality: parse → serialize → parse', () => {
		const original = "status == 'active'";
		const row1 = parseExpressionToRow(original);
		const serialized = filterRowToExpression(row1);
		const row2 = parseExpressionToRow(serialized);
		expect(row2.property).toBe(row1.property);
		expect(row2.operator).toBe(row1.operator);
		expect(row2.value).toBe(row1.value);
	});

	it('round-trips numeric comparison: parse → serialize → parse', () => {
		const original = 'priority > 3';
		const row1 = parseExpressionToRow(original);
		const serialized = filterRowToExpression(row1);
		const row2 = parseExpressionToRow(serialized);
		expect(row2.property).toBe(row1.property);
		expect(row2.operator).toBe(row1.operator);
		expect(row2.value).toBe(row1.value);
	});

	it('round-trips contains: parse → serialize → parse', () => {
		const original = "contains(title, 'meeting')";
		const row1 = parseExpressionToRow(original);
		const serialized = filterRowToExpression(row1);
		const row2 = parseExpressionToRow(serialized);
		expect(row2.property).toBe(row1.property);
		expect(row2.operator).toBe(row1.operator);
		expect(row2.value).toBe(row1.value);
	});

	it('escapes single quotes in values', () => {
		const row: FilterRow = { id: '1', property: 'status', operator: 'is', value: "it's done" };
		const expr = filterRowToExpression(row);
		expect(expr).toBe("status == 'it\\'s done'");
		// Round-trip: parse it back and check the value is preserved
		const parsed = parseExpressionToRow(expr);
		expect(parsed.property).toBe('status');
		expect(parsed.operator).toBe('is');
		expect(parsed.value).toBe("it's done");
	});

	it('escapes backslashes in values', () => {
		const row: FilterRow = { id: '1', property: 'path', operator: 'is', value: 'C:\\Users\\test' };
		const expr = filterRowToExpression(row);
		expect(expr).toBe("path == 'C:\\\\Users\\\\test'");
		const parsed = parseExpressionToRow(expr);
		expect(parsed.value).toBe('C:\\Users\\test');
	});

	it('escapes both backslashes and quotes together', () => {
		const row: FilterRow = { id: '1', property: 'title', operator: 'contains', value: "it\\'s" };
		const expr = filterRowToExpression(row);
		const parsed = parseExpressionToRow(expr);
		expect(parsed.value).toBe("it\\'s");
	});

	it('round-trips contains with single quotes in value', () => {
		const row: FilterRow = { id: '1', property: 'title', operator: 'contains', value: "João's notes" };
		const expr = filterRowToExpression(row);
		const parsed = parseExpressionToRow(expr);
		expect(parsed.property).toBe('title');
		expect(parsed.operator).toBe('contains');
		expect(parsed.value).toBe("João's notes");
	});

	it('always quotes text operator values even when numeric-looking', () => {
		const row: FilterRow = { id: '1', property: 'status', operator: 'is', value: '0' };
		expect(filterRowToExpression(row)).toBe("status == '0'");
	});

	it('always quotes contains values even when numeric-looking', () => {
		const row: FilterRow = { id: '1', property: 'title', operator: 'contains', value: '42' };
		expect(filterRowToExpression(row)).toBe("contains(title, '42')");
	});

	it('round-trips text is with numeric-looking value preserving operator', () => {
		const row: FilterRow = { id: '1', property: 'status', operator: 'is', value: '100' };
		const expr = filterRowToExpression(row);
		const parsed = parseExpressionToRow(expr);
		expect(parsed.property).toBe('status');
		expect(parsed.operator).toBe('is');
		expect(parsed.value).toBe('100');
	});

	it('quotes non-numeric relational values so they stay literals', () => {
		expect(filterRowToExpression({ id: '1', property: 'status', operator: 'gte', value: 'b' }))
			.toBe("status >= 'b'");
		expect(filterRowToExpression({ id: '1', property: 'status', operator: 'lt', value: 'in progress' }))
			.toBe("status < 'in progress'");
	});

	it('round-trips non-numeric relational filter: parse → serialize → parse', () => {
		const original = "status >= 'b'";
		const row1 = parseExpressionToRow(original);
		expect(row1.raw).toBeUndefined();
		expect(row1.operator).toBe('gte');
		const serialized = filterRowToExpression(row1);
		const row2 = parseExpressionToRow(serialized);
		expect(row2.raw).toBeUndefined();
		expect(row2.property).toBe('status');
		expect(row2.operator).toBe('gte');
		expect(row2.value).toBe('b');
	});

	it('quotes non-numeric eq/neq values so they stay literals', () => {
		expect(filterRowToExpression({ id: '1', property: 'status', operator: 'eq', value: 'b' }))
			.toBe("status == 'b'");
		expect(filterRowToExpression({ id: '1', property: 'status', operator: 'neq', value: 'in progress' }))
			.toBe("status != 'in progress'");
	});

	it('round-trips non-numeric eq: stays a visual row and keeps the value', () => {
		const serialized = filterRowToExpression({ id: '1', property: 'status', operator: 'eq', value: 'b' });
		const parsed = parseExpressionToRow(serialized);
		expect(parsed.raw).toBeUndefined();
		expect(parsed.property).toBe('status');
		expect(parsed.value).toBe('b');
		// A quoted `==` is indistinguishable from an `is` row: same expression, so the
		// operator re-parses as 'is'. Semantics are identical and the file is a fixed point.
		expect(parsed.operator).toBe('is');
		expect(filterRowToExpression(parsed)).toBe(serialized);
	});

	it('round-trips every operator: serialize → parse preserves the row', () => {
		// Record<FilterOperator, ...> so adding an operator without a case here fails to compile
		const values: Record<FilterOperator, string> = {
			is: 'active',
			is_not: 'done',
			contains: 'meeting',
			does_not_contain: 'draft',
			starts_with: 'intro',
			ends_with: '.md',
			eq: '5',
			neq: '3',
			gt: 'b',
			lt: 'in progress',
			gte: '2.5',
			lte: 'z',
			before: '2024-01-01',
			after: '2024-06-15',
			on_or_before: '2024-12-31',
			on_or_after: '2024-01-01',
			is_true: '',
			is_false: '',
			is_empty: '',
			is_not_empty: '',
		};
		for (const [operator, value] of Object.entries(values) as [FilterOperator, string][]) {
			const row: FilterRow = { id: '1', property: 'prop', operator, value };
			const parsed = parseExpressionToRow(filterRowToExpression(row));
			expect(parsed.raw, `operator ${operator} fell back to raw`).toBeUndefined();
			expect(parsed.property).toBe('prop');
			expect(parsed.operator, `operator ${operator} did not survive round-trip`).toBe(operator);
			expect(parsed.value, `value for ${operator} did not survive round-trip`).toBe(value);
		}
	});
});

describe('parseFilterToGroups / filterGroupsToFilter', () => {
	it('returns empty array for undefined', () => {
		expect(parseFilterToGroups(undefined)).toEqual([]);
	});

	it('parses a simple string filter into one group', () => {
		const groups = parseFilterToGroups("status == 'active'");
		expect(groups).toHaveLength(1);
		expect(groups[0].conjunction).toBe('and');
		expect(groups[0].rows).toHaveLength(1);
		expect(groups[0].rows[0].property).toBe('status');
		expect(groups[0].rows[0].operator).toBe('is');
	});

	it('parses { and: [...] } filter into one group', () => {
		const groups = parseFilterToGroups({
			and: ["status == 'active'", 'priority > 3'],
		});
		expect(groups).toHaveLength(1);
		expect(groups[0].conjunction).toBe('and');
		expect(groups[0].rows).toHaveLength(2);
		expect(groups[0].rows[0].property).toBe('status');
		expect(groups[0].rows[1].property).toBe('priority');
	});

	it('parses { or: [...] } filter into one group', () => {
		const groups = parseFilterToGroups({
			or: ["a == 'x'", "b == 'y'"],
		});
		expect(groups).toHaveLength(1);
		expect(groups[0].conjunction).toBe('or');
		expect(groups[0].rows).toHaveLength(2);
	});

	it('parses { not: [...] } filter into one group', () => {
		const groups = parseFilterToGroups({
			not: ["archived == true"],
		});
		expect(groups).toHaveLength(1);
		expect(groups[0].conjunction).toBe('not');
		expect(groups[0].rows).toHaveLength(1);
	});

	it('parses filter with both and + not into multiple groups', () => {
		const groups = parseFilterToGroups({
			and: ["status == 'active'"],
			not: ["archived == true"],
		});
		expect(groups).toHaveLength(2);
		expect(groups[0].conjunction).toBe('and');
		expect(groups[1].conjunction).toBe('not');
	});

	it('round-trips: groups → filter → groups produces equivalent', () => {
		const original = parseFilterToGroups({
			and: ["status == 'active'", 'priority > 3'],
		});
		const filter = filterGroupsToFilter(original);
		const roundTripped = parseFilterToGroups(filter);

		expect(roundTripped).toHaveLength(original.length);
		expect(roundTripped[0].conjunction).toBe(original[0].conjunction);
		expect(roundTripped[0].rows.length).toBe(original[0].rows.length);
		for (let i = 0; i < roundTripped[0].rows.length; i++) {
			expect(roundTripped[0].rows[i].property).toBe(original[0].rows[i].property);
			expect(roundTripped[0].rows[i].operator).toBe(original[0].rows[i].operator);
			expect(roundTripped[0].rows[i].value).toBe(original[0].rows[i].value);
		}
	});

	it('converts empty groups back to undefined', () => {
		expect(filterGroupsToFilter([])).toBeUndefined();
	});

	it('converts single group with single row to plain string', () => {
		const filter = filterGroupsToFilter([{
			conjunction: 'and',
			rows: [{ id: '1', property: 'status', operator: 'is', value: 'active' }],
		}]);
		expect(typeof filter).toBe('string');
		expect(filter).toBe("status == 'active'");
	});

	it('converts multiple rows to object filter', () => {
		const filter = filterGroupsToFilter([{
			conjunction: 'and',
			rows: [
				{ id: '1', property: 'status', operator: 'is', value: 'active' },
				{ id: '2', property: 'priority', operator: 'gt', value: '3' },
			],
		}]);
		expect(typeof filter).toBe('object');
		expect((filter as { and: string[] }).and).toHaveLength(2);
	});

	it('filters out empty groups', () => {
		const filter = filterGroupsToFilter([
			{ conjunction: 'and', rows: [] },
			{ conjunction: 'or', rows: [{ id: '1', property: 'x', operator: 'is', value: 'y' }] },
		]);
		expect(typeof filter).toBe('string');
	});

	it('drops a raw row whose text is blank, so clearing it writes no item and the query does not error', () => {
		const blank = { id: 'b', property: '', operator: 'is' as const, value: '', raw: '   ' };
		const kept = { id: 'k', property: 'status', operator: 'is' as const, value: 'active' };

		expect(filterGroupsToFilter([{ conjunction: 'and', rows: [blank] }])).toBeUndefined();
		expect(filterGroupsToFilter([{ conjunction: 'not', rows: [{ ...blank, raw: '' }] }])).toBeUndefined();
		expect(filterGroupsToFilter([
			{ conjunction: 'and', rows: [kept, blank] },
			{ conjunction: 'or', rows: [blank] },
		])).toBe("status == 'active'");

		const def: CollectionDefinition = {
			filters: filterGroupsToFilter([{ conjunction: 'and', rows: [blank] }]),
			views: [{ type: 'table', name: 'T' }],
		};
		const result = executeQuery(def, def.views[0], makeIndex([makeRecord('/vault/a.md')]), null);
		expect(result.filterError).toBeUndefined();
		expect(result.records).toHaveLength(1);
	});

	it('keeps a single-row NOT group as a negated object, not a bare positive string', () => {
		// Collapsing a single-row "not" group to the plain expression would invert
		// the filter (the query would show exactly the rows the user excluded).
		const filter = filterGroupsToFilter([{
			conjunction: 'not',
			rows: [{ id: '1', property: 'status', operator: 'is', value: 'active' }],
		}]);
		expect(typeof filter).toBe('object');
		expect((filter as { not: string[] }).not).toEqual(["status == 'active'"]);

		// The negation must survive a UI round-trip (parse back to a 'not' group).
		const groups = parseFilterToGroups(filter as CollectionFilter);
		expect(groups).toHaveLength(1);
		expect(groups[0].conjunction).toBe('not');
		expect(groups[0].rows).toHaveLength(1);
	});
});

describe('nested filter objects in a filter list', () => {
	const roundTrip = (f: CollectionFilter) => filterGroupsToFilter(parseFilterToGroups(f));

	it('round-trips a nested object inside and:, or: and not:', () => {
		const inAnd: CollectionFilter = { and: ["status == 'active'", { or: ['priority > 3', "file.name == 'x.md'"] }] };
		const inOr: CollectionFilter = { or: [{ and: ["status == 'done'", 'priority < 2'] }, "status == 'active'"] };
		const inNot: CollectionFilter = { not: [{ or: ["status == 'archived'", 'priority > 4'] }] };
		expect(roundTrip(inAnd)).toEqual(inAnd);
		expect(roundTrip(inOr)).toEqual(inOr);
		expect(roundTrip(inNot)).toEqual(inNot);
	});

	it('round-trips a nested object two levels deep', () => {
		const deep: CollectionFilter = {
			and: [
				"status == 'active'",
				{ or: ['priority > 3', { and: ["file.name == 'a.md'", { not: ['priority == 1'] }] }] },
			],
		};
		expect(roundTrip(deep)).toEqual(deep);
	});

	it('keeps a nested object that is the only item of its group, without the single-row string shortcut', () => {
		const only: CollectionFilter = { and: [{ or: ["status == 'active'", "status == 'done'"] }] };
		expect(roundTrip(only)).toEqual(only);
	});

	it('round-trips sibling groups that each nest an object', () => {
		const siblings: CollectionFilter = {
			and: [{ or: ["status == 'active'", "status == 'done'"] }],
			not: [{ and: ['priority < 3', "file.name == 'c.md'"] }],
		};
		expect(roundTrip(siblings)).toEqual(siblings);
	});

	it('loads a nested object as a raw expression row, not JSON text', () => {
		const [group] = parseFilterToGroups({
			and: [{ or: ["status == 'active'", "status == 'done'"] }, { not: ['priority < 3'] }],
		});
		expect(group.rows.map((r) => r.raw)).toEqual([
			"(status == 'active') || (status == 'done')",
			'!(priority < 3)',
		]);
		expect(group.rows.some((r) => r.raw?.startsWith('{'))).toBe(false);
	});

	it('loads a null list item (an empty YAML `-` entry) without throwing', () => {
		// `parseCollectionYaml` casts `filters` without validating it, so a null
		// item reaches the toolbar as is.
		const top = { and: ["x == 1", null] } as unknown as CollectionFilter;
		const deep = { and: [{ or: [null] }] } as unknown as CollectionFilter;
		expect(parseFilterToGroups(top)[0].rows.map((r) => r.raw)).toEqual([undefined, 'null']);
		expect(parseFilterToGroups(deep)[0].rows.map((r) => r.raw)).toEqual(['(null)']);
		expect(filterGroupsToFilter(parseFilterToGroups(top))).toEqual({ and: ['x == 1', 'null'] });
	});

	it('writes a nested object holding a null back as its text, so executeQuery does not throw', () => {
		// `evaluateFilter` reads `.and` on a null item it reaches through an object.
		const deep = { and: ['x == 1', { or: [null] }] } as unknown as CollectionFilter;
		const roundTrip = filterGroupsToFilter(parseFilterToGroups(deep));
		expect(roundTrip).toEqual({ and: ['x == 1', '(null)'] });
		const def: CollectionDefinition = { filters: roundTrip!, views: [{ type: 'table', name: 'T' }] };
		const index = makeIndex([makeRecord('/vault/a.md', { x: 1 })]);
		expect(executeQuery(def, def.views[0], index, null).records).toEqual([]);
	});

	describe('an and / or / not value that is not a list', () => {
		const malformed = (f: unknown) => f as CollectionFilter;
		const index = makeIndex([makeRecord('/vault/a.md', { x: 1, status: 'a' })]);
		const viaToolbar = (f: CollectionFilter) => {
			const def: CollectionDefinition = { filters: roundTrip(f), views: [{ type: 'table', name: 'T' }] };
			return executeQuery(def, def.views[0], index, null);
		};

		it.each([
			['a string', { or: "status == 'a'" }, 'or'],
			['a number', { and: 5 }, 'and'],
			['a map', { and: { k: 1 } }, 'and'],
			['a string two levels down', { and: [{ not: "status == 'a'" }] }, 'not'],
		])('loads a nested object holding %s as a JSON-text row with no object, and the query reports it', (_what, nested, key) => {
			const filter = malformed({ and: ['x == 1', nested] });

			const [group] = parseFilterToGroups(filter);

			expect(group.rows[1].raw).toBeDefined();
			expect(group.rows[1].raw).toContain(`"${key}"`);
			expect(group.rows[1].item).toBeUndefined();
			const result = viaToolbar(filter);
			expect(result.records).toEqual([]);
			expect(result.filterError).toContain(`"${key}"`);
		});

		it.each([
			['a top-level or string', { or: 'x' }, 'or'],
			['a top-level and number', { and: 5 }, 'and'],
			['a top-level and map', { and: { k: 1 } }, 'and'],
		])('loads %s without throwing, as one JSON-text row the query reports', (_what, filter, key) => {
			const groups = parseFilterToGroups(malformed(filter));

			expect(groups).toHaveLength(1);
			expect(groups[0].rows).toHaveLength(1);
			expect(groups[0].rows[0].raw).toContain(`"${key}"`);
			expect(viaToolbar(malformed(filter)).filterError).toContain(`"${key}"`);
		});
	});

	it('builds the expression of several keys, deeper nesting and empty lists', () => {
		const [group] = parseFilterToGroups({
			and: [
				{ or: ['a == 1', { and: ['b == 2', 'c == 3'] }], not: ['d == 4', 'e == 5'] },
				{ and: [], or: [] },
				{ not: [] },
				{},
			],
		});
		expect(group.rows.map((r) => r.raw)).toEqual([
			'((a == 1) || ((b == 2) && (c == 3))) && (!(d == 4) && !(e == 5))',
			'(true) && (false)',
			'true',
			'true',
		]);
	});

	describe('the row expression matches the nested object through executeQuery', () => {
		// The records of collection-logic.test.ts 'executeQuery', plus the record of
		// its 'evaluates nested and/or/not combinations' case.
		const index = makeIndex([
			makeRecord('/vault/a.md', { status: 'active', priority: 5 }),
			makeRecord('/vault/b.md', { status: 'done', priority: 3 }),
			makeRecord('/vault/c.md', { status: 'active', priority: 1 }),
			makeRecord('/vault/d.md', { status: 'archived', priority: 4 }),
			makeRecord('/vault/test.md', { status: 'active', priority: 5 }),
		]);
		const paths = (filters: CollectionFilter | string) => {
			const def: CollectionDefinition = { filters, views: [{ type: 'table', name: 'T' }] };
			return executeQuery(def, def.views[0], index, null).records.map((r) => r.path);
		};
		const oracle: CollectionFilter = {
			and: [{ or: ["status == 'active'", "status == 'done'"] }, { not: ['priority < 3'] }],
		};
		const cases: [string, CollectionFilter][] = [
			['or inside and', { or: ["status == 'active'", "status == 'done'"] }],
			['not inside and', { not: ['priority < 3'] }],
			['the whole oracle filter', oracle],
			['several keys and two levels', { or: ["status == 'archived'", { and: ["status == 'active'", { not: ['priority < 3'] }] }], not: ["file.name == 'test.md'"] }],
			['empty or (matches nothing)', { or: [] }],
			['empty and / not (match everything)', { and: [], not: [] }],
		];

		it.each(cases)('%s', (_label, nested) => {
			const [row] = parseFilterToGroups({ and: [nested] })[0].rows;
			expect(row.raw).toBeDefined();
			expect(paths(row.raw!)).toEqual(paths(nested));
		});

		it('the oracle filter matches the records collection-logic.test.ts expects', () => {
			const [row] = parseFilterToGroups({ and: [oracle] })[0].rows;
			expect(paths(row.raw!)).toEqual(['/vault/a.md', '/vault/b.md', '/vault/test.md']);
		});
	});

	it('writes the edited text of a nested row as a plain string item and drops the object', () => {
		const groups = parseFilterToGroups({ and: ["status == 'active'", { or: ['priority > 3', 'priority < 2'] }] });
		const nested = groups[0].rows[1];
		const edited = { ...groups[0], rows: [groups[0].rows[0], { ...nested, raw: 'priority > 4' }] };
		expect(filterGroupsToFilter([edited])).toEqual({ and: ["status == 'active'", 'priority > 4'] });
	});

	it('writes the edited text of a nested row that is alone in its group as a plain string filter', () => {
		const groups = parseFilterToGroups({ and: [{ or: ['priority > 3', 'priority < 2'] }] });
		const edited = { ...groups[0], rows: [{ ...groups[0].rows[0], raw: 'priority > 4' }] };
		expect(filterGroupsToFilter([edited])).toBe('priority > 4');
	});
});

describe('getOperatorsForType', () => {
	it('returns text operators for text type', () => {
		const ops = getOperatorsForType('text');
		expect(ops).toContain('is');
		expect(ops).toContain('is_not');
		expect(ops).toContain('contains');
		expect(ops).toContain('does_not_contain');
		expect(ops).toContain('starts_with');
		expect(ops).toContain('ends_with');
		expect(ops).toContain('is_empty');
		expect(ops).toContain('is_not_empty');
	});

	it('returns number operators for number type', () => {
		const ops = getOperatorsForType('number');
		expect(ops).toContain('eq');
		expect(ops).toContain('neq');
		expect(ops).toContain('gt');
		expect(ops).toContain('lt');
		expect(ops).toContain('gte');
		expect(ops).toContain('lte');
		expect(ops).toContain('is_empty');
		expect(ops).toContain('is_not_empty');
	});

	it('returns date operators for date type', () => {
		const ops = getOperatorsForType('date');
		expect(ops).toContain('is');
		expect(ops).toContain('before');
		expect(ops).toContain('after');
		expect(ops).toContain('on_or_before');
		expect(ops).toContain('on_or_after');
		expect(ops).toContain('is_empty');
		expect(ops).toContain('is_not_empty');
	});

	it('returns boolean operators for boolean type', () => {
		const ops = getOperatorsForType('boolean');
		expect(ops).toContain('is_true');
		expect(ops).toContain('is_false');
		expect(ops).toHaveLength(2);
	});

	it('returns list operators for list type', () => {
		const ops = getOperatorsForType('list');
		expect(ops).toContain('is');
		expect(ops).toContain('is_not');
		expect(ops).toContain('contains');
		expect(ops).toContain('does_not_contain');
		expect(ops).toContain('is_empty');
		expect(ops).toContain('is_not_empty');
	});
});

describe('isUnaryOperator', () => {
	it.each<FilterOperator>(['is_empty', 'is_not_empty', 'is_true', 'is_false'])('%s takes no value', (op) => {
		expect(isUnaryOperator(op)).toBe(true);
	});

	it.each<FilterOperator>(['is', 'is_not', 'contains', 'eq', 'gt', 'before', 'on_or_after'])('%s takes a value', (op) => {
		expect(isUnaryOperator(op)).toBe(false);
	});

	it('agrees with filterRowToExpression on which operators ignore the value', () => {
		const all: FilterOperator[] = [
			...new Set((['text', 'number', 'date', 'boolean', 'list'] as const).flatMap((t) => getOperatorsForType(t))),
		];
		for (const operator of all) {
			const blank = filterRowToExpression({ id: 'x', property: 'p', operator, value: '' });
			const filled = filterRowToExpression({ id: 'x', property: 'p', operator, value: 'v' });
			expect(isUnaryOperator(operator), operator).toBe(blank === filled);
		}
	});
});

describe('getAllKnownProperties', () => {
	it('returns file.* properties plus frontmatter properties', () => {
		const index = makeIndex([
			makeRecord('/vault/a.md', { status: 'active', priority: 5 }),
			makeRecord('/vault/b.md', { status: 'done', tags: ['work'] }),
		]);
		const props = getAllKnownProperties(index);

		// File properties should come first
		expect(props[0]).toBe('file.name');
		expect(props).toContain('file.path');
		expect(props).toContain('file.mtime');

		// Frontmatter properties should be included
		expect(props).toContain('status');
		expect(props).toContain('priority');
		expect(props).toContain('tags');
	});

	it('excludes formula.* properties from the index', () => {
		const record = makeRecord('/vault/a.md', { status: 'active' });
		record.properties.set('formula.doubled', 10);
		const index = makeIndex([record]);
		const props = getAllKnownProperties(index);
		expect(props).not.toContain('formula.doubled');
	});

	it('returns deduplicated properties', () => {
		const index = makeIndex([
			makeRecord('/vault/a.md', { status: 'active' }),
			makeRecord('/vault/b.md', { status: 'done' }),
		]);
		const props = getAllKnownProperties(index);
		const statusCount = props.filter((p) => p === 'status').length;
		expect(statusCount).toBe(1);
	});
});

describe('inferPropertyType', () => {
	it('infers text for file.name', () => {
		expect(inferPropertyType('file.name', new Map())).toBe('text');
	});

	it('infers number for file.size', () => {
		expect(inferPropertyType('file.size', new Map())).toBe('number');
	});

	it('infers date for file.mtime', () => {
		expect(inferPropertyType('file.mtime', new Map())).toBe('date');
	});

	it('infers number for numeric properties', () => {
		const index = makeIndex([makeRecord('/vault/a.md', { priority: 5 })]);
		expect(inferPropertyType('priority', index)).toBe('number');
	});

	it('infers boolean for boolean properties', () => {
		const index = makeIndex([makeRecord('/vault/a.md', { archived: false })]);
		expect(inferPropertyType('archived', index)).toBe('boolean');
	});

	it('infers list for array properties', () => {
		const index = makeIndex([makeRecord('/vault/a.md', { tags: ['work', 'important'] })]);
		expect(inferPropertyType('tags', index)).toBe('list');
	});

	it('infers date for ISO date string properties', () => {
		const index = makeIndex([makeRecord('/vault/a.md', { due: '2024-06-15' })]);
		expect(inferPropertyType('due', index)).toBe('date');
	});

	it('infers text for plain string properties', () => {
		const index = makeIndex([makeRecord('/vault/a.md', { status: 'active' })]);
		expect(inferPropertyType('status', index)).toBe('text');
	});

	it('defaults to text for unknown properties', () => {
		expect(inferPropertyType('unknown', new Map())).toBe('text');
	});

	it('skips null values when sampling', () => {
		const index = makeIndex([
			makeRecord('/vault/a.md', { count: null }),
			makeRecord('/vault/b.md', { count: 42 }),
		]);
		expect(inferPropertyType('count', index)).toBe('number');
	});
});

describe('createEmptyFilterRow', () => {
	it('creates a row with the first operator for the given type', () => {
		const row = createEmptyFilterRow('status', 'text');
		expect(row.property).toBe('status');
		expect(row.operator).toBe('is');
		expect(row.value).toBe('');
		expect(row.id).toBeTruthy();
	});

	it('creates a row with eq for number type', () => {
		const row = createEmptyFilterRow('priority', 'number');
		expect(row.operator).toBe('eq');
	});

	it('creates a row with is_true for boolean type', () => {
		const row = createEmptyFilterRow('archived', 'boolean');
		expect(row.operator).toBe('is_true');
	});
});
