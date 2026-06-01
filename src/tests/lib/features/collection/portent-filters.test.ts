import { describe, it, expect } from 'vitest';
import { executeQuery } from '$lib/features/collection/collection.logic';
import type { CollectionDefinition, CollectionViewDef, NoteRecord } from '$lib/features/collection/collection.types';

function makeRecord(path: string, props: Record<string, unknown>): NoteRecord {
	const name = path.split('/').pop() ?? path;
	const ext = '.md';
	const basename = name.replace('.md', '');
	const folder = path.substring(0, path.lastIndexOf('/'));
	return {
		path, name, basename, folder, ext,
		mtime: 0, ctime: 0, size: 0,
		properties: new Map(Object.entries(props)),
	};
}

function makeIndex(records: NoteRecord[]): Map<string, NoteRecord> {
	return new Map(records.map((r) => [r.path, r]));
}

function baseDef(filters: unknown): CollectionDefinition {
	return { filters } as CollectionDefinition;
}

function baseView(overrides: Partial<CollectionViewDef> = {}): CollectionViewDef {
	return { type: 'table', name: 'Test', ...overrides };
}

describe('Portent collection filters', () => {
	it('filters by type equals', () => {
		const index = makeIndex([
			makeRecord('/a.md', { _type: 'Project' }),
			makeRecord('/b.md', { _type: 'Person' }),
			makeRecord('/c.md', {}),
		]);
		const def = baseDef("type == 'Project'");
		const result = executeQuery(def, baseView(), index);
		expect(result.records.map((r) => r.path)).toEqual(['/a.md']);
	});

	it('filters by organized boolean', () => {
		const index = makeIndex([
			makeRecord('/a.md', { organized: true }),
			makeRecord('/b.md', { organized: false }),
		]);
		const def = baseDef("organized == true");
		const result = executeQuery(def, baseView(), index);
		expect(result.records.map((r) => r.path)).toEqual(['/a.md']);
	});

	it('filters by archived boolean', () => {
		const index = makeIndex([
			makeRecord('/a.md', { archived: false }),
			makeRecord('/b.md', { archived: true }),
		]);
		const def = baseDef("archived == true");
		const result = executeQuery(def, baseView(), index);
		expect(result.records.map((r) => r.path)).toEqual(['/b.md']);
	});

	it('filters by favorite boolean', () => {
		const index = makeIndex([
			makeRecord('/a.md', { favorite: true }),
			makeRecord('/b.md', { favorite: false }),
		]);
		const def = baseDef("favorite == true");
		const result = executeQuery(def, baseView(), index);
		expect(result.records.map((r) => r.path)).toEqual(['/a.md']);
	});

	it('filters by _belongs_to contains', () => {
		const index = makeIndex([
			makeRecord('/a.md', { _belongs_to: ['project', 'area'] }),
			makeRecord('/b.md', { _belongs_to: ['other'] }),
			makeRecord('/c.md', {}),
		]);
		const def = baseDef("_belongs_to.contains('project')");
		const result = executeQuery(def, baseView(), index);
		expect(result.records.map((r) => r.path)).toEqual(['/a.md']);
	});

	it('filters by _related_to contains', () => {
		const index = makeIndex([
			makeRecord('/a.md', { _related_to: ['maps'] }),
			makeRecord('/b.md', {}),
		]);
		const def = baseDef("_related_to.contains('maps')");
		const result = executeQuery(def, baseView(), index);
		expect(result.records.map((r) => r.path)).toEqual(['/a.md']);
	});

	it('filters by _has_many contains', () => {
		const index = makeIndex([
			makeRecord('/a.md', { _has_many: ['task-a', 'task-b'] }),
			makeRecord('/b.md', {}),
		]);
		const def = baseDef("_has_many.contains('task-a')");
		const result = executeQuery(def, baseView(), index);
		expect(result.records.map((r) => r.path)).toEqual(['/a.md']);
	});

	it('combines type and archived filters', () => {
		const index = makeIndex([
			makeRecord('/a.md', { _type: 'Project', archived: false }),
			makeRecord('/b.md', { _type: 'Project', archived: true }),
			makeRecord('/c.md', { _type: 'Person', archived: false }),
		]);
		const def = baseDef({ and: ["type == 'Project'", "archived == false"] });
		const result = executeQuery(def, baseView(), index);
		expect(result.records.map((r) => r.path)).toEqual(['/a.md']);
	});
});
