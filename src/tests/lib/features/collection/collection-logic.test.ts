import { describe, it, expect } from 'vitest';
import {
	buildNoteRecord,
	executeQuery,
	evaluateFilter,
	formatCellValue,
	getPropertyValue,
} from '$lib/features/collection/collection.logic';
import type { CollectionDefinition, CollectionViewDef, NoteRecord } from '$lib/features/collection/collection.types';

function makeRecord(
	path: string,
	props: Record<string, unknown> = {},
	overrides: Partial<NoteRecord> = {},
): NoteRecord {
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

function makeIndex(records: NoteRecord[]): Map<string, NoteRecord> {
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

	it('builds a record with no frontmatter', () => {
		const record = buildNoteRecord('/vault/test.md', 'Just text');
		expect(record.properties.size).toBe(0);
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
});
