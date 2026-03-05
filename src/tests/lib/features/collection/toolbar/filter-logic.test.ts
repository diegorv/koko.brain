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
} from '$lib/features/collection/toolbar/filter.logic';
import type { NoteRecord } from '$lib/features/collection/collection.types';
import type { FilterRow } from '$lib/features/collection/toolbar/toolbar.types';

function makeRecord(
	path: string,
	props: Record<string, unknown> = {},
	overrides: Partial<NoteRecord> = {},
): NoteRecord {
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

function makeIndex(records: NoteRecord[]): Map<string, NoteRecord> {
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
