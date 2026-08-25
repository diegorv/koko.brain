import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/core/filesystem/fs.service', () => ({
	createFile: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
}));

import { invoke } from '@tauri-apps/api/core';
import { createFile } from '$lib/core/filesystem/fs.service';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import {
	buildPropertyIndex,
	createCollectionFile,
	updateNoteInIndex,
	removeNoteFromIndex,
	resetCollection,
} from '$lib/features/collection/collection.service';
import type { NoteRecordV2 } from '$lib/types/vault-v2.types';

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

describe('resetCollection', () => {
	it('clears the index and resets ready flag', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([record('/vault/a.md', {})]);
		await buildPropertyIndex();
		expect(collectionStore.isIndexReady).toBe(true);

		resetCollection();

		expect(collectionStore.propertyIndex.size).toBe(0);
		expect(collectionStore.isIndexReady).toBe(false);
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

	it('returns null when createFile returns null', async () => {
		vi.mocked(createFile).mockResolvedValue(null);

		const result = await createCollectionFile('/vault');

		expect(result).toBeNull();
	});

	it('returns null and logs on failure', async () => {
		vi.mocked(createFile).mockRejectedValue(new Error('disk full'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await createCollectionFile('/vault');

		expect(result).toBeNull();
		expect(consoleSpy).toHaveBeenCalledWith('Failed to create collection file:', expect.any(Error));
		consoleSpy.mockRestore();
	});
});
