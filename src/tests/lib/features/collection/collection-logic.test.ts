import { describe, it, expect, vi } from 'vitest';
import {
	buildNoteRecord,
	executeQuery,
	evaluateFilter,
	filterCitesArchived,
	formatCellValue,
	getPropertyValue,
} from '#lib/features/collection/collection.logic.js';
import type { CollectionDefinition, CollectionViewDef, PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { runtimeTimeZoneSwitchWorks, withTimeZone } from '../../../fixtures/timezone.fixture';

function makeRecord(
	path: string,
	props: Record<string, unknown> = {},
	overrides: Partial<PropertyIndexRecord> = {},
): PropertyIndexRecord {
	const name = path.split('/').pop() ?? path;
	const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
	const basename = ext ? name.slice(0, -ext.length) : name;
	const folder = path.substring(0, path.lastIndexOf('/'));

	return {
		path,
		name,
		basename,
		folder,
		ext,
		mtime: 0,
		ctime: 0,
		size: 0,
		properties: new Map(Object.entries(props)),
		...overrides,
	};
}

function makeIndex(records: PropertyIndexRecord[]): Map<string, PropertyIndexRecord> {
	return new Map(records.map((r) => [r.path, r]));
}

function baseView(overrides: Partial<CollectionViewDef> = {}): CollectionViewDef {
	return { type: 'table', name: 'Test', ...overrides };
}

function baseDef(overrides: Partial<CollectionDefinition> = {}): CollectionDefinition {
	return { views: [baseView()], ...overrides };
}

describe('buildNoteRecord', () => {
	it('builds a record from path and content', () => {
		const content = '---\nstatus: active\npriority: 3\n---\nBody text';
		const record = buildNoteRecord('/vault/notes/test.md', content);

		expect(record.path).toBe('/vault/notes/test.md');
		expect(record.name).toBe('test.md');
		expect(record.basename).toBe('test');
		expect(record.folder).toBe('/vault/notes');
		expect(record.ext).toBe('.md');
		expect(record.properties.get('status')).toBe('active');
		expect(record.properties.get('priority')).toBe(3);
	});

	it('builds a record with list properties', () => {
		const content = '---\ntags: [a, b, c]\n---\n';
		const record = buildNoteRecord('/vault/test.md', content);
		expect(record.properties.get('tags')).toEqual(['a', 'b', 'c']);
	});

	it('builds a record with boolean properties', () => {
		const content = '---\npublished: true\n---\n';
		const record = buildNoteRecord('/vault/test.md', content);
		expect(record.properties.get('published')).toBe(true);
	});

	// Every record carries the four keys the Rust projection always injects
	// (`tags` plus the three lifecycle flags), so a note with no frontmatter is
	// not an empty map. See `project_note_record` in src-tauri/src/commands/vault.rs.
	it('builds a record with no frontmatter', () => {
		const record = buildNoteRecord('/vault/test.md', 'Just text');
		expect([...record.properties.keys()].sort()).toEqual([
			'archived',
			'favorite',
			'organized',
			'tags',
		]);
	});

	it('merges inline #tags from the body into the tags property', () => {
		const content = '---\ntags: [frontmatter-tag]\n---\nBody with #inline-tag here';
		const record = buildNoteRecord('/vault/test.md', content);
		expect(record.properties.get('tags')).toEqual(['frontmatter-tag', 'inline-tag']);
	});

	it('sets tags from inline #tags alone when frontmatter has none', () => {
		const record = buildNoteRecord('/vault/test.md', 'Only body #solo');
		expect(record.properties.get('tags')).toEqual(['solo']);
	});

	it('deduplicates frontmatter and inline tags case-insensitively', () => {
		const content = '---\ntags: [Work]\n---\nBody #work again';
		const record = buildNoteRecord('/vault/test.md', content);
		expect(record.properties.get('tags')).toEqual(['Work']);
	});

	it('builds a record from empty content', () => {
		const record = buildNoteRecord('/vault/test.md', '');
		expect([...record.properties.keys()].sort()).toEqual([
			'archived',
			'favorite',
			'organized',
			'tags',
		]);
		expect(record.name).toBe('test.md');
		expect(record.basename).toBe('test');
	});

	it('keeps file metadata arguments', () => {
		const record = buildNoteRecord('/vault/test.md', '', 111, 222, 333);
		expect(record.mtime).toBe(111);
		expect(record.ctime).toBe(222);
		expect(record.size).toBe(333);
	});
});

describe('executeQuery', () => {
	const records = [
		makeRecord('/vault/a.md', { status: 'active', priority: 5 }),
		makeRecord('/vault/b.md', { status: 'done', priority: 3 }),
		makeRecord('/vault/c.md', { status: 'active', priority: 1 }),
		makeRecord('/vault/d.md', { status: 'archived', priority: 4 }),
	];
	const index = makeIndex(records);

	it('returns all records when no filters', () => {
		const result = executeQuery(baseDef(), baseView(), index);
		expect(result.records).toHaveLength(4);
	});

	it('filters with a simple string expression', () => {
		const def = baseDef({ filters: "status == 'active'" });
		const result = executeQuery(def, baseView(), index);
		expect(result.records).toHaveLength(2);
		expect(result.records.every((r) => r.properties.get('status') === 'active')).toBe(true);
	});

	it('filters with and conjunction', () => {
		const def = baseDef({
			filters: { and: ["status == 'active'", 'priority > 3'] },
		});
		const result = executeQuery(def, baseView(), index);
		expect(result.records).toHaveLength(1);
		expect(result.records[0].name).toBe('a.md');
	});

	it('filters with or conjunction', () => {
		const def = baseDef({
			filters: { or: ["status == 'active'", "status == 'done'"] },
		});
		const result = executeQuery(def, baseView(), index);
		expect(result.records).toHaveLength(3);
	});

	it('filters with not conjunction', () => {
		const def = baseDef({
			filters: { not: ["status == 'archived'"] },
		});
		const result = executeQuery(def, baseView(), index);
		expect(result.records).toHaveLength(3);
		expect(result.records.every((r) => r.properties.get('status') !== 'archived')).toBe(true);
	});

	it('combines global and view filters with AND', () => {
		const def = baseDef({ filters: "status == 'active'" });
		const view = baseView({ filters: 'priority > 3' });
		const result = executeQuery(def, view, index);
		expect(result.records).toHaveLength(1);
		expect(result.records[0].name).toBe('a.md');
	});

	it('filters with nested and/or/not', () => {
		const def = baseDef({
			filters: {
				and: [
					{ or: ["status == 'active'", "status == 'done'"] },
					{ not: ['priority < 3'] },
				],
			},
		});
		const result = executeQuery(def, baseView(), index);
		expect(result.records).toHaveLength(2);
	});

	it('sorts by string ASC', () => {
		const view = baseView({ sort: [{ column: 'file.name', direction: 'ASC' }] });
		const result = executeQuery(baseDef(), view, index);
		expect(result.records.map((r) => r.name)).toEqual(['a.md', 'b.md', 'c.md', 'd.md']);
	});

	it('sorts by string DESC', () => {
		const view = baseView({ sort: [{ column: 'file.name', direction: 'DESC' }] });
		const result = executeQuery(baseDef(), view, index);
		expect(result.records.map((r) => r.name)).toEqual(['d.md', 'c.md', 'b.md', 'a.md']);
	});

	it('sorts by number', () => {
		const view = baseView({ sort: [{ column: 'priority', direction: 'ASC' }] });
		const result = executeQuery(baseDef(), view, index);
		expect(result.records.map((r) => r.properties.get('priority'))).toEqual([1, 3, 4, 5]);
	});

	it('sorts by date', () => {
		const dateRecords = [
			makeRecord('/vault/old.md', {}, { mtime: 1000 }),
			makeRecord('/vault/new.md', {}, { mtime: 3000 }),
			makeRecord('/vault/mid.md', {}, { mtime: 2000 }),
		];
		const view = baseView({ sort: [{ column: 'file.mtime', direction: 'ASC' }] });
		const result = executeQuery(baseDef(), view, makeIndex(dateRecords));
		expect(result.records.map((r) => r.name)).toEqual(['old.md', 'mid.md', 'new.md']);
	});

	it('sorts multi-column', () => {
		const multiRecords = [
			makeRecord('/vault/a.md', { status: 'active', priority: 1 }),
			makeRecord('/vault/b.md', { status: 'active', priority: 3 }),
			makeRecord('/vault/c.md', { status: 'done', priority: 2 }),
		];
		const view = baseView({
			sort: [
				{ column: 'status', direction: 'ASC' },
				{ column: 'priority', direction: 'DESC' },
			],
		});
		const result = executeQuery(baseDef(), view, makeIndex(multiRecords));
		expect(result.records.map((r) => r.name)).toEqual(['b.md', 'a.md', 'c.md']);
	});

	it('applies limit', () => {
		const view = baseView({ limit: 2 });
		const result = executeQuery(baseDef(), view, index);
		expect(result.records).toHaveLength(2);
	});

	it('hands the sorted, unlimited records to a row set, which replaces the limit step', () => {
		const view = baseView({ limit: 1, sort: [{ column: 'priority', direction: 'DESC' }] });
		const seen: string[][] = [];
		const def = baseDef({ filters: "status != 'done'" });
		const result = executeQuery(def, view, index, (matched, v, d) => {
			seen.push(matched.map((r) => r.name));
			expect(v).toBe(view);
			expect(d).toBe(def);
			return matched.slice(1);
		});
		expect(seen).toEqual([['a.md', 'd.md', 'c.md']]);
		expect(result.records.map((r) => r.name)).toEqual(['d.md', 'c.md']);
	});

	it('resolves the columns from the rows the row set keeps', () => {
		const extra = makeIndex([...records, makeRecord('/vault/e.md', { only_e: 1 })]);
		const kept = executeQuery(baseDef(), baseView(), extra, (matched) => matched.filter((r) => r.name !== 'e.md'));
		expect(kept.columns.map((c) => c.key)).not.toContain('only_e');
		expect(executeQuery(baseDef(), baseView(), extra).columns.map((c) => c.key)).toContain('only_e');
	});

	it('runs no row set when a filter does not parse', () => {
		const rowSet = vi.fn((matched: PropertyIndexRecord[]) => matched);
		const result = executeQuery(baseDef({ filters: "status = 'x'" }), baseView(), index, rowSet);
		expect(result.filterError).toBeDefined();
		expect(rowSet).not.toHaveBeenCalled();
	});

	it('computes simple formulas', () => {
		const def = baseDef({ formulas: { doubled: 'priority * 2' } });
		const view = baseView({ order: ['file.name', 'formula.doubled'] });
		const result = executeQuery(def, view, index);
		expect(result.records[0].properties.get('formula.doubled')).toBe(
			(result.records[0].properties.get('priority') as number) * 2,
		);
	});

	it('computes formula referencing another formula', () => {
		const def = baseDef({
			formulas: { doubled: 'priority * 2', quadrupled: 'formula.doubled * 2' },
		});
		const singleIndex = makeIndex([makeRecord('/vault/a.md', { priority: 5 })]);
		const result = executeQuery(def, baseView(), singleIndex);
		expect(result.records[0].properties.get('formula.quadrupled')).toBe(20);
	});

	it('handles circular formula gracefully', () => {
		const def = baseDef({ formulas: { a: 'formula.b', b: 'formula.a' } });
		const singleIndex = makeIndex([makeRecord('/vault/a.md')]);
		const result = executeQuery(def, baseView(), singleIndex);
		// Should not throw, just set null
		expect(result.records[0].properties.get('formula.a')).toBeNull();
	});

	it('uses view.order for column selection', () => {
		const view = baseView({ order: ['file.name', 'status', 'priority'] });
		const result = executeQuery(baseDef(), view, index);
		expect(result.columns.map((c) => c.key)).toEqual(['file.name', 'status', 'priority']);
		expect(result.columns.map((c) => c.displayName)).toEqual(['file.name', 'status', 'priority']);
	});

	it('infers columns when order is absent', () => {
		const result = executeQuery(baseDef(), baseView(), index);
		const keys = result.columns.map((c) => c.key);
		expect(keys[0]).toBe('file.name');
		expect(keys).toContain('status');
		expect(keys).toContain('priority');
	});

	it('applies displayName from properties config', () => {
		const def = baseDef({
			properties: { status: { displayName: 'Status' } },
		});
		const view = baseView({ order: ['status'] });
		const result = executeQuery(def, view, index);
		expect(result.columns).toEqual([{ key: 'status', displayName: 'Status' }]);
	});

	it('does not mutate the shared property index when computing formulas', () => {
		const sharedRecords = [
			makeRecord('/vault/a.md', { priority: 5 }),
		];
		const sharedIndex = makeIndex(sharedRecords);
		const originalProps = new Map(sharedRecords[0].properties);

		const def = baseDef({ formulas: { doubled: 'priority * 2' } });
		executeQuery(def, baseView(), sharedIndex);

		// The original record in the shared index should NOT have formula.doubled
		const originalRecord = sharedIndex.get('/vault/a.md')!;
		expect(originalRecord.properties).toEqual(originalProps);
		expect(originalRecord.properties.has('formula.doubled')).toBe(false);
	});

	it('sorts by file.size', () => {
		const sizeRecords = [
			makeRecord('/vault/big.md', {}, { size: 5000 }),
			makeRecord('/vault/small.md', {}, { size: 100 }),
			makeRecord('/vault/medium.md', {}, { size: 2000 }),
		];
		const view = baseView({ sort: [{ column: 'file.size', direction: 'ASC' }] });
		const result = executeQuery(baseDef(), view, makeIndex(sizeRecords));
		expect(result.records.map((r) => r.name)).toEqual(['small.md', 'medium.md', 'big.md']);
	});

	it('sorts by file.ctime', () => {
		const ctimeRecords = [
			makeRecord('/vault/newest.md', {}, { ctime: 3000 }),
			makeRecord('/vault/oldest.md', {}, { ctime: 1000 }),
			makeRecord('/vault/middle.md', {}, { ctime: 2000 }),
		];
		const view = baseView({ sort: [{ column: 'file.ctime', direction: 'DESC' }] });
		const result = executeQuery(baseDef(), view, makeIndex(ctimeRecords));
		expect(result.records.map((r) => r.name)).toEqual(['newest.md', 'middle.md', 'oldest.md']);
	});

	it('filters by file.mtime comparison', () => {
		const dateRecords = [
			makeRecord('/vault/old.md', {}, { mtime: 1000 }),
			makeRecord('/vault/new.md', {}, { mtime: 3000 }),
			makeRecord('/vault/mid.md', {}, { mtime: 2000 }),
		];
		const def = baseDef({ filters: 'file.mtime > 1500' });
		const result = executeQuery(def, baseView(), makeIndex(dateRecords));
		expect(result.records.map((r) => r.name).sort()).toEqual(['mid.md', 'new.md']);
	});

	it('filters by file.size comparison', () => {
		const sizeRecords = [
			makeRecord('/vault/big.md', {}, { size: 5000 }),
			makeRecord('/vault/small.md', {}, { size: 100 }),
			makeRecord('/vault/medium.md', {}, { size: 2000 }),
		];
		const def = baseDef({ filters: 'file.size >= 2000' });
		const result = executeQuery(def, baseView(), makeIndex(sizeRecords));
		expect(result.records.map((r) => r.name).sort()).toEqual(['big.md', 'medium.md']);
	});

	it('does not leak stale formula keys across query runs', () => {
		const sharedRecords = [makeRecord('/vault/a.md', { priority: 5 })];
		const sharedIndex = makeIndex(sharedRecords);

		// First query with formula "score"
		const def1 = baseDef({ formulas: { score: 'priority * 2' } });
		const result1 = executeQuery(def1, baseView(), sharedIndex);
		expect(result1.records[0].properties.has('formula.score')).toBe(true);

		// Second query with formula "rating" (renamed from "score")
		const def2 = baseDef({ formulas: { rating: 'priority * 3' } });
		const result2 = executeQuery(def2, baseView(), sharedIndex);
		expect(result2.records[0].properties.has('formula.rating')).toBe(true);
		expect(result2.records[0].properties.has('formula.score')).toBe(false);
	});
});

/** The toolbar's before / on or before / after / on or after operators */
const DATE_OPERATORS = ['<', '<=', '>', '>='] as const;

/**
 * Runs `due <op> date('2026-03-01')` (the toolbar's serialized date row) through
 * `executeQuery` for one record per operator.
 * @returns the operators whose query kept the record
 */
function matchingDateOperators(props: Record<string, unknown>): string[] {
	const index = makeIndex([makeRecord('/vault/a.md', props)]);
	return DATE_OPERATORS.filter((op) => {
		const view = baseView({ filters: `due ${op} date('2026-03-01')` });
		return executeQuery(baseDef(), view, index).records.length === 1;
	});
}

describe('executeQuery date filters on frontmatter dates', () => {
	it('keeps only the note dated before the cut-off', () => {
		const index = makeIndex([
			makeRecord('/vault/early.md', { due: '2026-02-20' }),
			makeRecord('/vault/late.md', { due: '2026-03-10' }),
		]);
		const view = baseView({ filters: "due < date('2026-03-01')" });
		const result = executeQuery(baseDef(), view, index);
		expect(result.records.map((r) => r.name)).toEqual(['early.md']);
	});

	it('applies the four operators to a YYYY-MM-DD string', () => {
		expect(matchingDateOperators({ due: '2026-03-01' })).toEqual(['<=', '>=']);
		expect(matchingDateOperators({ due: '2026-02-28' })).toEqual(['<', '<=']);
		expect(matchingDateOperators({ due: '2026-03-02' })).toEqual(['>', '>=']);
	});

	it('compares a datetime string by its local calendar day', () => {
		expect(matchingDateOperators({ due: '2026-03-01T10:00' })).toEqual(['<=', '>=']);
		expect(matchingDateOperators({ due: '2026-02-28T23:00' })).toEqual(['<', '<=']);
		expect(matchingDateOperators({ due: '2026-03-02T00:30' })).toEqual(['>', '>=']);
	});

	it('matches no operator for a value that is not a date', () => {
		const texts = [{ due: 'Week 3' }, { due: 'Phase 2' }, { due: '1/2' }, { due: '5' }];
		for (const props of [{ due: '' }, { due: 'abc' }, ...texts, { due: null }, {}]) {
			expect(() => matchingDateOperators(props)).not.toThrow();
			expect(matchingDateOperators(props), JSON.stringify(props)).toEqual([]);
		}
	});
});

describe.runIf(runtimeTimeZoneSwitchWorks())('executeQuery date filters across time zones', () => {
	it('reads date-only values as local midnight in America/Sao_Paulo', () => {
		withTimeZone('America/Sao_Paulo', () => {
			expect(matchingDateOperators({ due: '2026-03-01' })).toEqual(['<=', '>=']);
		});
	});
});

describe('evaluateFilter', () => {
	it('evaluates a string filter', () => {
		const record = makeRecord('/vault/test.md', { status: 'active' });
		const ctx = { record, formulas: {} };
		expect(evaluateFilter("status == 'active'", ctx)).toBe(true);
		expect(evaluateFilter("status == 'done'", ctx)).toBe(false);
	});

	it('handles invalid expressions gracefully', () => {
		const record = makeRecord('/vault/test.md');
		const ctx = { record, formulas: {} };
		expect(evaluateFilter('invalid @@@', ctx)).toBe(false);
	});

	it('evaluates an and filter object (all must match)', () => {
		const record = makeRecord('/vault/test.md', { status: 'active', priority: 5 });
		const ctx = { record, formulas: {} };
		expect(evaluateFilter({ and: ["status == 'active'", 'priority > 3'] }, ctx)).toBe(true);
		expect(evaluateFilter({ and: ["status == 'active'", 'priority > 9'] }, ctx)).toBe(false);
	});

	it('evaluates an or filter object (any may match)', () => {
		const record = makeRecord('/vault/test.md', { status: 'active' });
		const ctx = { record, formulas: {} };
		expect(evaluateFilter({ or: ["status == 'done'", "status == 'active'"] }, ctx)).toBe(true);
		expect(evaluateFilter({ or: ["status == 'done'", "status == 'archived'"] }, ctx)).toBe(false);
	});

	it('evaluates a not filter object (none may match)', () => {
		const record = makeRecord('/vault/test.md', { status: 'active' });
		const ctx = { record, formulas: {} };
		expect(evaluateFilter({ not: ["status == 'done'"] }, ctx)).toBe(true);
		expect(evaluateFilter({ not: ["status == 'active'"] }, ctx)).toBe(false);
	});

	it('evaluates nested and/or/not combinations', () => {
		const record = makeRecord('/vault/test.md', { status: 'active', priority: 5 });
		const ctx = { record, formulas: {} };
		expect(
			evaluateFilter(
				{
					and: [
						{ or: ["status == 'active'", "status == 'done'"] },
						{ not: ['priority < 3'] },
					],
				},
				ctx,
			),
		).toBe(true);
	});

	it('returns true for an empty filter object', () => {
		const record = makeRecord('/vault/test.md');
		const ctx = { record, formulas: {} };
		expect(evaluateFilter({}, ctx)).toBe(true);
	});
});

describe('formatCellValue', () => {
	it('formats null as em dash', () => {
		expect(formatCellValue(null)).toBe('\u2014');
		expect(formatCellValue(undefined)).toBe('\u2014');
	});

	it('formats dates', () => {
		const d = new Date(2024, 5, 15); // June 15, 2024
		expect(formatCellValue(d)).toBe('2024-06-15');
	});

	it('formats dates with time', () => {
		const d = new Date(2024, 5, 15, 14, 30);
		expect(formatCellValue(d)).toBe('2024-06-15 14:30');
	});

	it('formats booleans', () => {
		expect(formatCellValue(true)).toBe('true');
		expect(formatCellValue(false)).toBe('false');
	});

	it('formats arrays', () => {
		expect(formatCellValue(['a', 'b', 'c'])).toBe('a, b, c');
	});

	it('formats numbers', () => {
		expect(formatCellValue(42)).toBe('42');
	});

	it('formats strings', () => {
		expect(formatCellValue('hello')).toBe('hello');
	});
});

describe('getPropertyValue', () => {
	const record = makeRecord('/vault/notes/test.md', { status: 'active', priority: 5 }, { mtime: 1700000000000, ctime: 1690000000000, size: 2048 });

	it('returns file.name', () => {
		expect(getPropertyValue(record, 'file.name')).toBe('test.md');
	});

	it('returns file.basename', () => {
		expect(getPropertyValue(record, 'file.basename')).toBe('test');
	});

	it('returns file.path', () => {
		expect(getPropertyValue(record, 'file.path')).toBe('/vault/notes/test.md');
	});

	it('returns file.folder', () => {
		expect(getPropertyValue(record, 'file.folder')).toBe('/vault/notes');
	});

	it('returns file.ext', () => {
		expect(getPropertyValue(record, 'file.ext')).toBe('.md');
	});

	it('returns file.size', () => {
		expect(getPropertyValue(record, 'file.size')).toBe(2048);
	});

	it('returns file.ctime as Date', () => {
		const val = getPropertyValue(record, 'file.ctime');
		expect(val).toBeInstanceOf(Date);
		expect((val as Date).getTime()).toBe(1690000000000);
	});

	it('returns file.mtime as Date', () => {
		const val = getPropertyValue(record, 'file.mtime');
		expect(val).toBeInstanceOf(Date);
		expect((val as Date).getTime()).toBe(1700000000000);
	});

	it('returns null for unknown file.* property', () => {
		expect(getPropertyValue(record, 'file.unknown')).toBeNull();
	});

	it('returns frontmatter property', () => {
		expect(getPropertyValue(record, 'status')).toBe('active');
		expect(getPropertyValue(record, 'priority')).toBe(5);
	});

	it('returns null for missing property', () => {
		expect(getPropertyValue(record, 'nonexistent')).toBeNull();
	});

	it('returns formula.* properties from record properties map', () => {
		const r = makeRecord('/vault/a.md', {});
		r.properties.set('formula.doubled', 10);
		expect(getPropertyValue(r, 'formula.doubled')).toBe(10);
	});

	it('returns note.* prefixed properties', () => {
		expect(getPropertyValue(record, 'note.status')).toBe(null);
		const r = makeRecord('/vault/a.md', {});
		r.properties.set('note.status', 'done');
		expect(getPropertyValue(r, 'note.status')).toBe('done');
	});

	it('returns property.* prefixed properties', () => {
		const r = makeRecord('/vault/a.md', {});
		r.properties.set('property.status', 'active');
		expect(getPropertyValue(r, 'property.status')).toBe('active');
	});
});

describe('executeQuery edge cases', () => {
	it('sorts null values last in ASC order', () => {
		const records = [
			makeRecord('/vault/a.md', { priority: null }),
			makeRecord('/vault/b.md', { priority: 1 }),
			makeRecord('/vault/c.md', {}),
			makeRecord('/vault/d.md', { priority: 3 }),
		];
		const view: CollectionViewDef = {
			type: 'table',
			name: 'Test',
			sort: [{ column: 'priority', direction: 'ASC' }],
		};
		const def: CollectionDefinition = { views: [view] };
		const result = executeQuery(def, view, makeIndex(records));
		const names = result.records.map((r) => r.name);
		// Records with values first (sorted), null/undefined last
		expect(names[0]).toBe('b.md'); // priority=1
		expect(names[1]).toBe('d.md'); // priority=3
	});

	it('sorts null values first in DESC order (negation flips null placement)', () => {
		// Known behavior: compareForSort returns 1 for null (last in ASC),
		// but DESC negation (-cmp) makes null sort first.
		const records = [
			makeRecord('/vault/a.md', { priority: null }),
			makeRecord('/vault/b.md', { priority: 1 }),
			makeRecord('/vault/c.md', { priority: 3 }),
		];
		const view: CollectionViewDef = {
			type: 'table',
			name: 'Test',
			sort: [{ column: 'priority', direction: 'DESC' }],
		};
		const def: CollectionDefinition = { views: [view] };
		const result = executeQuery(def, view, makeIndex(records));
		const names = result.records.map((r) => r.name);
		expect(names[0]).toBe('a.md'); // null sorts first in DESC
		expect(names[1]).toBe('c.md'); // priority=3
		expect(names[2]).toBe('b.md'); // priority=1
	});

	it('handles empty index gracefully', () => {
		const view = baseView();
		const def = baseDef();
		const result = executeQuery(def, view, new Map());
		expect(result.records).toEqual([]);
		expect(result.columns).toEqual([{ key: 'file.name', displayName: 'file.name' }]);
	});
});

describe('formatCellValue edge cases', () => {
	it('formats display link values', () => {
		const link = { __display: 'link' as const, href: 'https://example.com', display: 'Example' };
		expect(formatCellValue(link)).toBe('Example');
	});

	it('formats display image values', () => {
		const img = { __display: 'image' as const, src: 'pic.png', alt: 'Photo' };
		expect(formatCellValue(img)).toBe('Photo');
	});

	it('formats display icon values', () => {
		const icon = { __display: 'icon' as const, name: 'star' };
		expect(formatCellValue(icon)).toBe('star');
	});

	it('formats display html values', () => {
		const html = { __display: 'html' as const, html: '<b>bold</b>' };
		expect(formatCellValue(html)).toBe('<b>bold</b>');
	});

	it('formats empty array as empty string', () => {
		expect(formatCellValue([])).toBe('');
	});

	it('falls back to href when a display link has no display text', () => {
		const link = { __display: 'link' as const, href: 'https://example.com', display: '' };
		expect(formatCellValue(link)).toBe('https://example.com');
	});

	it('falls back to src when a display image has no alt text', () => {
		const img = { __display: 'image' as const, src: 'pic.png', alt: '' };
		expect(formatCellValue(img)).toBe('pic.png');
	});
});

describe('executeQuery — formula error handling', () => {
	it('sets null for a formula whose expression fails to parse', () => {
		const index = makeIndex([makeRecord('/vault/a.md', { priority: 5 })]);
		const def = baseDef({ formulas: { broken: '@@@ not parseable' } });

		const result = executeQuery(def, baseView(), index);

		expect(result.records[0].properties.get('formula.broken')).toBeNull();
	});

	it('computes valid formulas even when a sibling formula is broken', () => {
		const index = makeIndex([makeRecord('/vault/a.md', { priority: 5 })]);
		const def = baseDef({ formulas: { broken: '@@@', doubled: 'priority * 2' } });

		const result = executeQuery(def, baseView(), index);

		expect(result.records[0].properties.get('formula.broken')).toBeNull();
		expect(result.records[0].properties.get('formula.doubled')).toBe(10);
	});
});

describe('executeQuery — filter expressions that do not parse', () => {
	const BAD = "status = 'active'";
	const index = makeIndex([
		makeRecord('/vault/a.md', { status: 'active', priority: 1 }),
		makeRecord('/vault/b.md', { status: 'done', priority: 2 }),
	]);

	it('reports a .view filter that does not parse instead of returning no rows silently', () => {
		const result = executeQuery(baseDef({ filters: BAD }), baseView(), index);

		expect(result.records).toEqual([]);
		expect(result.filterError).toContain(BAD);
	});

	it.each([
		['the top-level filters string', baseDef({ filters: BAD }), baseView()],
		['a view filters string', baseDef(), baseView({ filters: BAD })],
		['an and item', baseDef({ filters: { and: ['priority > 0', BAD] } }), baseView()],
		['an or item', baseDef(), baseView({ filters: { or: ['priority > 0', BAD] } })],
		['a not item', baseDef({ filters: { not: [BAD] } }), baseView()],
		['a nested object', baseDef(), baseView({ filters: { and: [{ or: [{ not: [BAD] }] }] } })],
	])('reports the error from %s', (_where, def, view) => {
		const result = executeQuery(def, view, index);

		expect(result.records).toEqual([]);
		expect(result.filterError).toContain(BAD);
	});

	it('reports the error over an empty property index', () => {
		const result = executeQuery(baseDef({ filters: BAD }), baseView(), new Map());

		expect(result.records).toEqual([]);
		expect(result.filterError).toContain(BAD);
	});

	it('reports a bad and item placed after a sibling that is false for every record', () => {
		const result = executeQuery(baseDef({ filters: { and: ['priority > 99', BAD] } }), baseView(), index);

		expect(result.filterError).toContain(BAD);
	});

	it('reports an unclosed quote', () => {
		const result = executeQuery(baseDef({ filters: "status == 'active" }), baseView(), index);

		expect(result.filterError).toContain("status == 'active");
	});

	it('reports a blank item written in the YAML', () => {
		const result = executeQuery(baseDef({ filters: { and: ['  '] } }), baseView(), index);

		expect(result.records).toEqual([]);
		expect(result.filterError).toBeDefined();
	});

	it('names an unknown function', () => {
		const result = executeQuery(baseDef({ filters: 'foo(1) == 2' }), baseView(), index);

		expect(result.records).toEqual([]);
		expect(result.filterError).toContain('foo');
	});

	it('has no filterError when every filter parses', () => {
		const result = executeQuery(
			baseDef({ filters: { and: ["status == 'active'", 'contains(file.name, "a")'] } }),
			baseView({ filters: 'file.hasTag("x") || priority > 0' }),
			index,
		);

		expect(result.filterError).toBeUndefined();
		expect(result.records.map((r) => r.path)).toEqual(['/vault/a.md']);
	});

	it.each([
		['an and value that is a string', { and: 'x == 1' }, 'and'],
		['an and value that is a number', { and: 5 }, 'and'],
		['an and value that is a map', { and: { k: 1 } }, 'and'],
		['a top-level or string', { or: 'x' }, 'or'],
		['a nested or string', { and: ['priority > 0', { or: "status == 'a'" }] }, 'or'],
	])('reports %s as a filter error naming the key, without throwing', (_what, filters, key) => {
		const def = baseDef({ filters: filters as unknown as CollectionDefinition['filters'] });

		const result = executeQuery(def, baseView(), index);

		expect(result.records).toEqual([]);
		expect(result.filterError).toContain(`"${key}"`);
	});
});

describe('filterCitesArchived', () => {
	it.each([
		['!_archived'],
		['archived == true'],
		['note.archived'],
		['_archived.isEmpty()'],
		['note.archived.lower()'],
		['isEmpty(archived)'],
		["file.hasProperty('_archived')"],
		["file.hasProperty('archived')"],
		['(archived || x).toString()'],
		["status == 'done' && [archived].length > 0"],
	])('cites archived in %s', (filter) => {
		expect(filterCitesArchived(filter)).toBe(true);
	});

	it('cites archived inside and, or and not', () => {
		expect(filterCitesArchived({ not: ['archived'] })).toBe(true);
		expect(filterCitesArchived({ and: ["status == 'a'", { or: ['x == 1', '_archived == true'] }] })).toBe(true);
	});

	it.each([
		["status == 'archived'"],
		["file.hasTag('archived')"],
		["file.hasProperty('status')"],
		["_type == 'Project'"],
		['archive == true'],
		['note.archivedAt'],
		['formula.archived == true'],
		["formula.archived.contains('x')"],
	])('does not cite archived in %s', (filter) => {
		expect(filterCitesArchived(filter)).toBe(false);
	});

	it('does not cite archived in an absent, empty or unparsable filter', () => {
		expect(filterCitesArchived(undefined)).toBe(false);
		expect(filterCitesArchived('')).toBe(false);
		expect(filterCitesArchived({})).toBe(false);
		expect(filterCitesArchived("archived = 'x'")).toBe(false);
		expect(filterCitesArchived({ and: ["status == 'a'", { or: ['x == 1'] }] })).toBe(false);
	});
});
