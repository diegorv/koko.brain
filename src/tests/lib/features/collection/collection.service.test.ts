import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	createFile: vi.fn(),
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
}));

import { invoke } from '@tauri-apps/api/core';
import { createFile } from '#lib/core/filesystem/fs.service.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import {
	applyPropertyDelta,
	buildPropertyIndex,
	createCollectionFile,
	propertyIndexNeedsWholeRead,
	registerCollectionNoteChangeConsumer,
	updateNoteInIndex,
	removeNoteFromIndex,
	resetCollection,
} from '#lib/features/collection/collection.service.js';
import { buildNoteRecord, executeQuery } from '#lib/features/collection/collection.logic.js';
import type { CollectionDefinition, CollectionViewDef } from '#lib/features/collection/collection.types.js';
import { parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import type { NoteRecordV2 } from '#lib/types/vault-v2.types.js';
import { applyNoteChange } from '#lib/core/filesystem/note-change.service.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { KBAPI } from '#lib/plugins/queryjs/kb-api.js';

function record(path: string, props: Record<string, unknown>, mtime = 0, ctime = 0): NoteRecordV2 {
	const name = path.split('/').pop() ?? '';
	const dot = name.lastIndexOf('.');
	const basename = dot > 0 ? name.slice(0, dot) : name;
	const ext = dot > 0 ? name.slice(dot) : '';
	const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
	return { path, name, basename, folder, ext, mtime, ctime, size: 0, properties: props as never };
}

beforeEach(() => {
	vi.clearAllMocks();
	collectionStore.reset();
});

describe('buildPropertyIndex', () => {
	it('populates the store from get_all_property_records', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			record('/vault/a.md', { title: 'A' }),
			record('/vault/b.md', { title: 'B' }),
		]);

		await buildPropertyIndex();

		expect(invoke).toHaveBeenCalledWith('get_all_property_records');
		expect(collectionStore.isIndexReady).toBe(true);
		expect(collectionStore.propertyIndex.size).toBe(2);
		expect(collectionStore.propertyIndex.get('/vault/a.md')!.properties.get('title')).toBe('A');
	});

	it('preserves mtime/ctime as milliseconds (Rust converts s -> ms server-side)', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			record('/vault/a.md', {}, 1700000000000, 1690000000000),
		]);

		await buildPropertyIndex();

		const r = collectionStore.propertyIndex.get('/vault/a.md')!;
		expect(r.mtime).toBe(1700000000000);
		expect(r.ctime).toBe(1690000000000);
	});

	it('handles empty IPC response', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([]);

		await buildPropertyIndex();

		expect(collectionStore.isIndexReady).toBe(true);
		expect(collectionStore.propertyIndex.size).toBe(0);
	});

	it('swallows IPC errors and leaves the store untouched', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('boom'));

		await buildPropertyIndex();

		// On error, store stays in its prior (empty here) state.
		expect(collectionStore.propertyIndex.size).toBe(0);
		// isIndexReady was never flipped — buildPropertyIndex bailed before
		// the setPropertyIndex call.
		expect(collectionStore.isIndexReady).toBe(false);
	});
});

describe('updateNoteInIndex', () => {
	it('adds a new record to the index', () => {
		updateNoteInIndex('/vault/a.md', '---\ntitle: A\n---\ncontent');

		const r = collectionStore.propertyIndex.get('/vault/a.md')!;
		expect(r.path).toBe('/vault/a.md');
		expect(r.name).toBe('a.md');
		expect(r.properties.get('title')).toBe('A');
	});

	it('preserves mtime/ctime/size when updating an existing record', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			record('/vault/a.md', { title: 'Old' }, 1700000000000, 1690000000000),
		]);
		await buildPropertyIndex();

		updateNoteInIndex('/vault/a.md', '---\ntitle: New\n---');

		const r = collectionStore.propertyIndex.get('/vault/a.md')!;
		expect(r.properties.get('title')).toBe('New');
		expect(r.mtime).toBe(1700000000000);
		expect(r.ctime).toBe(1690000000000);
	});

	it('defaults metadata to 0 for unknown paths', () => {
		updateNoteInIndex('/vault/new.md', 'content');

		const r = collectionStore.propertyIndex.get('/vault/new.md')!;
		expect(r.mtime).toBe(0);
		expect(r.ctime).toBe(0);
		expect(r.size).toBe(0);
	});

	it('merges inline body #tags into the tags property', () => {
		updateNoteInIndex(
			'/vault/inline.md',
			'---\ntitle: T\n---\n\n#brain idea in body',
		);
		const r = collectionStore.propertyIndex.get('/vault/inline.md')!;
		expect(r.properties.get('tags')).toEqual(['brain']);
	});

	it('unions frontmatter tags with inline body #tags', () => {
		updateNoteInIndex(
			'/vault/both.md',
			'---\ntags: [project]\n---\n\n#brain note',
		);
		const r = collectionStore.propertyIndex.get('/vault/both.md')!;
		expect(r.properties.get('tags')).toEqual(['project', 'brain']);
	});
});

// The Rust projection (src-tauri/src/commands/vault.rs::project_note_record)
// injects `organized` / `archived` / `favorite` / `tags` on every record, on top
// of the canonicalised frontmatter. Filters, the toolbar property picker and the
// QueryJS page proxy are all built against that key set. `updateNoteInIndex`
// replaces the record wholesale, so the in-editor path has to produce the same
// keys or an edit silently changes what a note matches.
describe('property index producer parity', () => {
	const content = '---\ntype: Project\narchived: true\n---\n\n#work body\n';

	/** The record shape `project_note_record` returns for `content`. */
	function rustRecordForContent() {
		return record('/vault/a.md', {
			_type: 'Project',
			_archived: true,
			organized: true,
			archived: true,
			favorite: false,
			tags: ['work'],
		});
	}

	it('an in-editor edit keeps the key set the Rust projection produced', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([rustRecordForContent()]);
		await buildPropertyIndex();
		const fromRust = [...collectionStore.propertyIndex.get('/vault/a.md')!.properties.keys()].sort();

		updateNoteInIndex('/vault/a.md', content);
		const fromEditor = [...collectionStore.propertyIndex.get('/vault/a.md')!.properties.keys()].sort();

		expect(fromEditor).toEqual(fromRust);
	});

	it('an in-editor edit keeps the lifecycle values the Rust projection produced', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([rustRecordForContent()]);
		await buildPropertyIndex();

		updateNoteInIndex('/vault/a.md', content);
		const p = collectionStore.propertyIndex.get('/vault/a.md')!.properties;

		expect(p.get('archived')).toBe(true);
		expect(p.get('favorite')).toBe(false);
		expect(p.get('organized')).toBe(true);
		expect(p.get('_archived')).toBe(true);
	});

	// `_organized` is the one flag that defaults to TRUE (existing notes count as
	// organized) -- see src-tauri/src/vault/entry.rs `unwrap_or(true)`. Getting
	// this backwards would invert `organized == false` across the whole vault.
	it('mirrors the asymmetric defaults: organized true, archived/favorite false', () => {
		updateNoteInIndex('/vault/bare.md', '---\ntitle: T\n---\n');
		const p = collectionStore.propertyIndex.get('/vault/bare.md')!.properties;

		expect(p.get('organized')).toBe(true);
		expect(p.get('archived')).toBe(false);
		expect(p.get('favorite')).toBe(false);
	});

	it('honours an explicit _organized: false', () => {
		updateNoteInIndex('/vault/inbox.md', '---\norganized: false\n---\n');
		const p = collectionStore.propertyIndex.get('/vault/inbox.md')!.properties;

		expect(p.get('organized')).toBe(false);
		expect(p.get('_organized')).toBe(false);
	});

	// Rust reads the flags with `as_bool()`, so a non-boolean value falls back to
	// the default rather than being coerced.
	it('falls back to the default when a flag is not a boolean', () => {
		updateNoteInIndex('/vault/odd.md', '---\narchived: yes please\norganized: 3\n---\n');
		const p = collectionStore.propertyIndex.get('/vault/odd.md')!.properties;

		expect(p.get('archived')).toBe(false);
		expect(p.get('organized')).toBe(true);
	});

	it('always emits tags, even when the note has none', () => {
		updateNoteInIndex('/vault/untagged.md', '---\ntitle: T\n---\n');
		const p = collectionStore.propertyIndex.get('/vault/untagged.md')!.properties;

		expect(p.get('tags')).toEqual([]);
	});
});

// `project_note_record` also rewrites `_type` (casing-normalized, entry.rs
// `extract_is_a`) and the three relationship keys (wikilink target arrays,
// entry.rs `extract_wikilink_targets`). The in-editor record has to carry the
// same values or `_type` filters and `page._type` change after an edit.
describe('property index producer parity: type and relationships', () => {
	const content =
		'---\ntype: person\n_belongs_to: "[[Team|the team]]"\n_related_to:\n  - "[[Bob#Intro]]"\n  - "[[Carol]]"\n_has_many: "[[Task one]]"\n---\n';

	/** The record `project_note_record` returns for `content`. */
	function rustRecordForContent() {
		return record('/vault/ada.md', {
			_type: 'Person',
			_belongs_to: ['Team'],
			_related_to: ['Bob', 'Carol'],
			_has_many: ['Task one'],
			organized: true,
			archived: false,
			favorite: false,
			tags: [],
		});
	}

	it('an in-editor edit keeps the _type and relationship values the Rust projection produced', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([rustRecordForContent()]);
		await buildPropertyIndex();
		const fromRust = collectionStore.propertyIndex.get('/vault/ada.md')!.properties;
		const before = Object.fromEntries(
			['_type', '_belongs_to', '_related_to', '_has_many'].map((k) => [k, fromRust.get(k)]),
		);

		updateNoteInIndex('/vault/ada.md', content);
		const fromEditor = collectionStore.propertyIndex.get('/vault/ada.md')!.properties;
		const after = Object.fromEntries(
			['_type', '_belongs_to', '_related_to', '_has_many'].map((k) => [k, fromEditor.get(k)]),
		);

		expect(after).toEqual(before);
	});

	it('a collection filtered on _type keeps the note after an edit', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([rustRecordForContent()]);
		await buildPropertyIndex();
		const def = { filters: "_type == 'Person'" } as CollectionDefinition;
		const view: CollectionViewDef = { type: 'table', name: 'People' };
		const paths = () =>
			executeQuery(def, view, collectionStore.propertyIndex).records.map((r) => r.path);
		expect(paths()).toEqual(['/vault/ada.md']);

		updateNoteInIndex('/vault/ada.md', content);

		expect(paths()).toEqual(['/vault/ada.md']);
	});

	// `_type` against a literal compares case-insensitively, so it cannot tell a
	// casing-normalized `_type` from a raw one. Two property references compare
	// strictly.
	it('a case-sensitive _type filter keeps the note after an edit', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			record('/vault/ada.md', { _type: 'Person', kind: 'Person' }),
		]);
		await buildPropertyIndex();
		const def = { filters: '_type == kind' } as CollectionDefinition;
		const view: CollectionViewDef = { type: 'table', name: 'People' };
		const paths = () =>
			executeQuery(def, view, collectionStore.propertyIndex).records.map((r) => r.path);
		expect(paths()).toEqual(['/vault/ada.md']);

		updateNoteInIndex('/vault/ada.md', '---\ntype: person\nkind: Person\n---\n');

		expect(paths()).toEqual(['/vault/ada.md']);
	});

	it('a collection filtered on a relationship keeps the note after an edit', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([rustRecordForContent()]);
		await buildPropertyIndex();
		const def = { filters: "_related_to.contains('Carol')" } as CollectionDefinition;
		const view: CollectionViewDef = { type: 'table', name: 'Linked' };
		const paths = () =>
			executeQuery(def, view, collectionStore.propertyIndex).records.map((r) => r.path);
		expect(paths()).toEqual(['/vault/ada.md']);

		updateNoteInIndex('/vault/ada.md', content);

		expect(paths()).toEqual(['/vault/ada.md']);
	});

	// Rust leaves the raw frontmatter value when it derives nothing: `is_a` is
	// None for an empty or non-string `_type`, and a relationship key is only
	// inserted when it yields at least one target.
	it('keeps the raw value when nothing is derived', () => {
		updateNoteInIndex(
			'/vault/raw.md',
			'---\ntype: ""\n_belongs_to: plain text\n_has_many: 3\n---\n',
		);
		const p = collectionStore.propertyIndex.get('/vault/raw.md')!.properties;

		expect(p.get('_type')).toBe('');
		expect(p.get('_belongs_to')).toBe('plain text');
		expect(p.get('_has_many')).toBe(3);
		expect(p.has('_related_to')).toBe(false);
	});
});

// Golden: shared with src-tauri/tests/vault_file_ops_test.rs
// (`project_record_injected_keys_match_golden_fixture`). `injected` is every key
// the projection adds to or rewrites in the parsed frontmatter; a key injected on
// one side and not the other fails one of the two suites. `record` pins final
// values where the two parsers start from different values.
describe('property index projection golden fixture', () => {
	const fixture = JSON.parse(
		readFileSync(
			resolve(process.cwd(), 'src-tauri/tests/fixtures/note-record-projection.json'),
			'utf8',
		),
	) as {
		cases: Array<{
			name: string;
			path: string;
			content: string;
			injected?: Record<string, unknown>;
			record?: Record<string, unknown>;
		}>;
	};

	it.each(fixture.cases.map((c) => [c.name, c] as const))(
		'buildNoteRecord matches project_note_record: %s',
		(_name, c) => {
			const rec = buildNoteRecord(c.path, c.content);
			if (c.injected) {
				const parsed = new Map(
					parseFrontmatterProperties(c.content).map((p) => [p.key, p.value]),
				);
				const injected: Record<string, unknown> = {};
				for (const [key, value] of rec.properties) {
					if (!parsed.has(key) || !isDeepStrictEqual(parsed.get(key), value)) {
						injected[key] = value;
					}
				}
				expect(injected).toEqual(c.injected);
			}
			for (const [key, value] of Object.entries(c.record ?? {})) {
				expect(rec.properties.get(key)).toEqual(value);
			}
		},
	);
});

describe('removeNoteFromIndex', () => {
	it('removes record from store', () => {
		updateNoteInIndex('/vault/a.md', 'content');
		expect(collectionStore.propertyIndex.has('/vault/a.md')).toBe(true);

		removeNoteFromIndex('/vault/a.md');

		expect(collectionStore.propertyIndex.has('/vault/a.md')).toBe(false);
	});

	it('is safe to call on non-existent path', () => {
		removeNoteFromIndex('/vault/nonexistent.md');
		expect(collectionStore.propertyIndex.size).toBe(0);
	});
});

describe('registerCollectionNoteChangeConsumer', () => {
	let unregister: (() => void) | null = null;

	beforeEach(() => {
		clearAllIndexed();
		vi.mocked(invoke).mockResolvedValue(undefined as never);
		unregister = registerCollectionNoteChangeConsumer();
	});

	afterEach(() => {
		unregister?.();
		unregister = null;
	});

	it('keeps the Rust-projected record of a .view on upsert', async () => {
		// A `.view` body is bare YAML: `buildNoteRecord` would read no
		// properties from it and empty the record.
		collectionStore.updateRecord('/vault/Projects.view', {
			...buildNoteRecord('/vault/Projects.view', '', 0, 0, 0),
			properties: new Map<string, unknown>([['archived', true], ['tags', ['work']]]),
		});

		await applyNoteChange({ kind: 'upsert', source: 'save', path: '/vault/Projects.view', content: '_sidebar_label: Projects\n' });

		const props = collectionStore.propertyIndex.get('/vault/Projects.view')?.properties;
		expect(props?.get('archived')).toBe(true);
		expect(props?.get('tags')).toEqual(['work']);
	});

	it('adds no record for a new .view', async () => {
		await applyNoteChange({ kind: 'upsert', source: 'fs', path: '/vault/Untitled.view', content: '_sort: title\n' });

		expect(collectionStore.propertyIndex.has('/vault/Untitled.view')).toBe(false);
	});

	it.each(['/vault/Board.kanban', '/vault/Map.canvas', '/vault/Untitled.collection'])('adds no record for %s, and kb.pages() does not list it', async (path) => {
		await applyNoteChange({ kind: 'upsert', source: 'save', path, content: 'views: []\n' });
		await applyNoteChange({ kind: 'upsert', source: 'save', path: '/vault/a.md', content: '# A\n' });

		expect(collectionStore.propertyIndex.has(path)).toBe(false);
		const api = new KBAPI({
			container: {} as HTMLElement,
			propertyIndex: collectionStore.propertyIndex,
			entries: [],
			currentFilePath: '/vault/a.md',
			propertyIndexVersion: 0,
			vaultPath: '/vault',
			systemFolder: '_system',
			loadScript: vi.fn(),
		});
		expect(api.pages().map((page) => page.file.path).array()).toEqual(['/vault/a.md']);
	});

	it.each(['/vault/new.md', '/vault/UPPER.MD', '/vault/long.markdown'])('adds a record for %s', async (path) => {
		await applyNoteChange({ kind: 'upsert', source: 'save', path, content: '---\nstatus: new\n---\n' });

		expect(collectionStore.propertyIndex.get(path)?.properties.get('status')).toBe('new');
	});

	it('replaces the record of a .md on upsert', async () => {
		updateNoteInIndex('/vault/a.md', '---\nstatus: old\npriority: high\n---\n');

		await applyNoteChange({ kind: 'upsert', source: 'save', path: '/vault/a.md', content: '---\nstatus: new\n---\n' });

		const props = collectionStore.propertyIndex.get('/vault/a.md')?.properties;
		expect(props?.get('status')).toBe('new');
		expect(props?.has('priority')).toBe(false);
	});

	it('removes a .view record on delete', async () => {
		collectionStore.updateRecord('/vault/Projects.view', buildNoteRecord('/vault/Projects.view', '', 0, 0, 0));

		await applyNoteChange({ kind: 'delete', source: 'fs', path: '/vault/Projects.view' });

		expect(collectionStore.propertyIndex.has('/vault/Projects.view')).toBe(false);
	});
});

describe('applyPropertyDelta', () => {
	it('upserts the given records and drops the removed paths, keeping the rest', async () => {
		vi.mocked(invoke).mockResolvedValue([
			record('/vault/a.md', { status: 'todo' }),
			record('/vault/b.md', { status: 'todo' }),
			record('/vault/c.md', {}),
		]);
		await buildPropertyIndex();
		const versionBefore = collectionStore.version;

		applyPropertyDelta([record('/vault/a.md', { status: 'done' }), record('/vault/d.md', {})], ['/vault/b.md']);

		expect([...collectionStore.propertyIndex.keys()].sort()).toEqual(['/vault/a.md', '/vault/c.md', '/vault/d.md']);
		expect(collectionStore.propertyIndex.get('/vault/a.md')?.properties.get('status')).toBe('done');
		expect(collectionStore.version).toBe(versionBefore + 1);
	});

	it('is a no-op on the records for an empty delta', async () => {
		vi.mocked(invoke).mockResolvedValue([record('/vault/a.md', {})]);
		await buildPropertyIndex();

		applyPropertyDelta([], []);

		expect([...collectionStore.propertyIndex.keys()]).toEqual(['/vault/a.md']);
	});

	it('survives a whole read that started before it and lands after it', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([record('/vault/a.md', { favorite: false }), record('/vault/b.md', {})]);
		await buildPropertyIndex();
		let land!: (records: NoteRecordV2[]) => void;
		vi.mocked(invoke).mockReturnValueOnce(new Promise((r) => { land = r; }));
		const wholeRead = buildPropertyIndex();

		applyPropertyDelta([record('/vault/a.md', { favorite: true })], ['/vault/b.md']);
		land([record('/vault/a.md', { favorite: false }), record('/vault/b.md', {}), record('/vault/c.md', {})]);
		await wholeRead;

		expect(collectionStore.propertyIndex.get('/vault/a.md')?.properties.get('favorite')).toBe(true);
		expect([...collectionStore.propertyIndex.keys()].sort()).toEqual(['/vault/a.md', '/vault/c.md']);
	});

	it('does not re-apply a delta that landed before the whole read started', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([record('/vault/a.md', {})]);
		await buildPropertyIndex();
		applyPropertyDelta([record('/vault/a.md', { status: 'old' })], []);

		vi.mocked(invoke).mockResolvedValueOnce([record('/vault/a.md', { status: 'new' })]);
		await buildPropertyIndex();

		expect(collectionStore.propertyIndex.get('/vault/a.md')?.properties.get('status')).toBe('new');
	});
});

describe('propertyIndexNeedsWholeRead', () => {
	beforeEach(() => resetCollection());

	it('is true before the first whole read and false after it', async () => {
		expect(propertyIndexNeedsWholeRead()).toBe(true);
		vi.mocked(invoke).mockResolvedValueOnce([record('/vault/a.md', {})]);
		await buildPropertyIndex();
		expect(propertyIndexNeedsWholeRead()).toBe(false);
	});

	it('stays true after a failed whole read on a ready index, until a whole read succeeds', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([record('/vault/a.md', {})]);
		await buildPropertyIndex();
		vi.mocked(invoke).mockRejectedValueOnce(new Error('boom'));
		await buildPropertyIndex();

		expect(collectionStore.isIndexReady).toBe(true);
		expect(propertyIndexNeedsWholeRead()).toBe(true);

		vi.mocked(invoke).mockResolvedValueOnce([record('/vault/a.md', {})]);
		await buildPropertyIndex();
		expect(propertyIndexNeedsWholeRead()).toBe(false);
	});
});

describe('resetCollection', () => {
	it('clears the index and resets ready flag', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([record('/vault/a.md', {})]);
		await buildPropertyIndex();
		expect(collectionStore.isIndexReady).toBe(true);

		resetCollection();

		expect(collectionStore.propertyIndex.size).toBe(0);
		expect(collectionStore.isIndexReady).toBe(false);
	});

	it('forgets the view index remembered per collection file', () => {
		collectionStore.setViewIndex('/vault/a.collection', 2);

		resetCollection();

		expect(collectionStore.getViewIndex('/vault/a.collection')).toBeUndefined();
	});
});

describe('createCollectionFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates the file with the minimal valid template as initial content', async () => {
		vi.mocked(createFile).mockResolvedValue('/vault/Untitled.collection');

		const result = await createCollectionFile('/vault');

		// Content goes through createFile (one step) so the Rust create_note
		// indexes the real template body, not an empty file.
		expect(createFile).toHaveBeenCalledWith(
			'/vault',
			'Untitled.collection',
			expect.stringContaining('views:'),
		);
		const written = vi.mocked(createFile).mock.calls[0][2] as string;
		expect(written).toContain('  - type: table');
		expect(written).toContain('    name: All');
		expect(result).toBe('/vault/Untitled.collection');
	});

	it('propagates a createFile failure to the caller', async () => {
		vi.mocked(createFile).mockRejectedValue(new Error('disk full'));

		await expect(createCollectionFile('/vault')).rejects.toThrow('disk full');
	});
});
