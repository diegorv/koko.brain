import { describe, it, expect } from 'vitest';
import {
	getAllAvailableColumns,
	toggleColumn,
} from '$lib/features/collection/toolbar/properties.logic';
import type { CollectionDefinition, NoteRecord } from '$lib/features/collection/collection.types';

function makeRecord(
	path: string,
	props: Record<string, unknown> = {},
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
	};
}

function makeIndex(records: NoteRecord[]): Map<string, NoteRecord> {
	return new Map(records.map((r) => [r.path, r]));
}

describe('getAllAvailableColumns', () => {
	it('returns file.* properties first', () => {
		const index = makeIndex([makeRecord('/vault/a.md')]);
		const def: CollectionDefinition = { views: [{ type: 'table', name: 'Table' }] };
		const columns = getAllAvailableColumns(index, def);

		expect(columns[0]).toBe('file.name');
		expect(columns).toContain('file.path');
		expect(columns).toContain('file.folder');
		expect(columns).toContain('file.mtime');
	});

	it('includes frontmatter properties sorted alphabetically', () => {
		const index = makeIndex([
			makeRecord('/vault/a.md', { zebra: 'z', alpha: 'a', beta: 'b' }),
		]);
		const def: CollectionDefinition = { views: [{ type: 'table', name: 'Table' }] };
		const columns = getAllAvailableColumns(index, def);

		const noteStart = columns.indexOf('alpha');
		expect(noteStart).toBeGreaterThan(0);
		expect(columns[noteStart]).toBe('alpha');
		expect(columns[noteStart + 1]).toBe('beta');
		expect(columns[noteStart + 2]).toBe('zebra');
	});

	it('includes formula.* columns from definition', () => {
		const index = makeIndex([makeRecord('/vault/a.md')]);
		const def: CollectionDefinition = {
			views: [{ type: 'table', name: 'Table' }],
			formulas: { days_old: 'now() - file.ctime', doubled: 'priority * 2' },
		};
		const columns = getAllAvailableColumns(index, def);

		expect(columns).toContain('formula.days_old');
		expect(columns).toContain('formula.doubled');
	});

	it('excludes formula.* from the index (only includes from definition)', () => {
		const record = makeRecord('/vault/a.md', { status: 'active' });
		record.properties.set('formula.computed', 42);
		const index = makeIndex([record]);
		const def: CollectionDefinition = { views: [{ type: 'table', name: 'Table' }] };
		const columns = getAllAvailableColumns(index, def);

		expect(columns).not.toContain('formula.computed');
		expect(columns).toContain('status');
	});

	it('deduplicates properties across records', () => {
		const index = makeIndex([
			makeRecord('/vault/a.md', { status: 'active' }),
			makeRecord('/vault/b.md', { status: 'done' }),
		]);
		const def: CollectionDefinition = { views: [{ type: 'table', name: 'Table' }] };
		const columns = getAllAvailableColumns(index, def);

		const statusCount = columns.filter((c) => c === 'status').length;
		expect(statusCount).toBe(1);
	});

	it('returns only file.* columns for empty index with no formulas', () => {
		const def: CollectionDefinition = { views: [{ type: 'table', name: 'Table' }] };
		const columns = getAllAvailableColumns(new Map(), def);

		expect(columns).toHaveLength(7); // 7 file.* properties
		expect(columns.every((c) => c.startsWith('file.'))).toBe(true);
	});
});

describe('toggleColumn', () => {
	const allColumns = ['file.name', 'file.path', 'status', 'priority', 'tags'];

	it('removes a column when visible=false', () => {
		const order = ['file.name', 'status', 'priority'];
		const result = toggleColumn(order, 'status', false, allColumns);
		expect(result).toEqual(['file.name', 'priority']);
	});

	it('adds a column at the correct position when visible=true', () => {
		const order = ['file.name', 'priority'];
		const result = toggleColumn(order, 'status', true, allColumns);
		// status comes before priority in allColumns, so should be inserted before priority
		expect(result).toEqual(['file.name', 'status', 'priority']);
	});

	it('adds a column at end if it comes after all existing', () => {
		const order = ['file.name', 'status'];
		const result = toggleColumn(order, 'tags', true, allColumns);
		expect(result).toEqual(['file.name', 'status', 'tags']);
	});

	it('adds a column at start if it comes before all existing', () => {
		const order = ['status', 'priority'];
		const result = toggleColumn(order, 'file.name', true, allColumns);
		expect(result).toEqual(['file.name', 'status', 'priority']);
	});

	it('does not add duplicate column', () => {
		const order = ['file.name', 'status'];
		const result = toggleColumn(order, 'status', true, allColumns);
		expect(result).toEqual(['file.name', 'status']);
	});

	it('handles removing a column not in the order', () => {
		const order = ['file.name', 'status'];
		const result = toggleColumn(order, 'nonexistent', false, allColumns);
		expect(result).toEqual(['file.name', 'status']);
	});

	it('appends column not in allColumns at the end', () => {
		const order = ['file.name'];
		const result = toggleColumn(order, 'unknown_prop', true, allColumns);
		expect(result).toEqual(['file.name', 'unknown_prop']);
	});
});
