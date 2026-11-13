// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Real collection store, engine and row rule; only the toast is mocked (the host imports it).
vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import { updateNoteInIndex } from '#lib/features/collection/collection.service.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { registerViewRowSetPort } from '#lib/features/collection/view-row-set.port.js';
import { blockRowSet } from '#lib/features/rail-shell/lens.logic.js';
import type { ModQueryV1 } from '#lib/plugins/mods/contract/mod-api.v1.js';
import { createModQuery } from '#lib/plugins/mods/mod-query.service.js';
import { createModContext, type ModRuntime } from '#lib/plugins/mods/mods-host.service.js';

const VAULT = '/vaults/main';

const NOTES: Record<string, string> = {
	'Ideas/a.md': '---\nstatus: done\n---\n# A',
	'Ideas/b.md': '---\nstatus: todo\ntags: [project]\n---\n# B',
	'People/ann.md': '---\ntype: person\n---\n# Ann',
	'Plain.md': '# No frontmatter',
	'Old.md': '---\nstatus: done\n_archived: true\n---\n# Old',
	'_system/templates/t.md': '---\nstatus: done\n---\n# Template',
	'Types/Meeting.md': '---\n_type: Type\nstatus: done\n---\n# Meeting type',
	'Board.view': '---\nstatus: done\n---\n',
};

/** Fills the real store with records built by the real `buildNoteRecord`, as a rebuild would */
function fillIndex(notes: Record<string, string> = NOTES) {
	const index = new Map<string, PropertyIndexRecord>();
	for (const [rel, content] of Object.entries(notes)) {
		index.set(`${VAULT}/${rel}`, buildNoteRecord(`${VAULT}/${rel}`, content));
	}
	collectionStore.setPropertyIndex(index);
}

describe('ctx.query', () => {
	let query: ModQueryV1;
	let unregisterPort: (() => void) | null = null;

	beforeEach(() => {
		vaultStore._reset();
		collectionStore.reset();
		vaultStore.open(VAULT);
		fillIndex();
		// The app's port, as boot.ts registers it.
		unregisterPort = registerViewRowSetPort({
			blockRows: (records, view, definition) =>
				blockRowSet(records, view, definition, {
					vaultPath: vaultStore.path,
					systemFolder: settingsStore.templates.systemFolder,
				}),
			rows: () => [],
			entriesLoaded: () => true,
			sortLabel: () => '',
		});
		query = createModQuery({ modId: 'ideas', vaultPath: VAULT, assertLive: () => {} });
	});

	afterEach(() => {
		unregisterPort?.();
		unregisterPort = null;
	});

	describe('matches', () => {
		it('resolves true for a note whose property matches and false for one that does not', async () => {
			await expect(query.matches('status == "done"', 'Ideas/a.md')).resolves.toBe(true);
			await expect(query.matches('status == "done"', 'Ideas/b.md')).resolves.toBe(false);
		});

		it('matches by tag, relative folder and type', async () => {
			await expect(query.matches('file.hasTag("project")', 'Ideas/b.md')).resolves.toBe(true);
			await expect(query.matches('file.hasTag("project")', 'Ideas/a.md')).resolves.toBe(false);
			await expect(query.matches('file.inFolder("Ideas")', 'Ideas/a.md')).resolves.toBe(true);
			await expect(query.matches('file.inFolder("Ideas")', 'People/ann.md')).resolves.toBe(false);
			await expect(query.matches('type == "person"', 'People/ann.md')).resolves.toBe(true);
			await expect(query.matches('type == "person"', 'Ideas/a.md')).resolves.toBe(false);
		});

		it('resolves false when evaluating the expression on the note fails', async () => {
			await expect(query.matches('status.lower() == "done"', 'Plain.md')).resolves.toBe(false);
			await expect(query.matches('status.lower() == "done"', 'Ideas/a.md')).resolves.toBe(true);
		});

		it('rejects an empty or whitespace expression', async () => {
			await expect(query.matches('', 'Ideas/a.md')).rejects.toThrow('Mod "ideas": query.matches needs a non-empty expression');
			await expect(query.matches('  \n', 'Ideas/a.md')).rejects.toThrow('Mod "ideas": query.matches needs a non-empty expression');
			const loose = query as unknown as { matches: (e: unknown, p: string) => Promise<boolean> };
			await expect(loose.matches(42, 'Ideas/a.md')).rejects.toThrow('Mod "ideas": query.matches needs a non-empty expression');
		});

		it('rejects a parse error and an unknown function', async () => {
			await expect(query.matches('status ==', 'Ideas/a.md')).rejects.toThrow('Mod "ideas": query.matches: Invalid filter "status =="');
			await expect(query.matches('nope(status)', 'Ideas/a.md')).rejects.toThrow(
				'Mod "ideas": query.matches: Invalid filter "nope(status)": Unknown function: nope',
			);
		});

		it('rejects a path with no record and a non-Markdown path', async () => {
			await expect(query.matches('status == "done"', 'Ideas/missing.md')).rejects.toThrow(
				'Mod "ideas": query.matches: "Ideas/missing.md" is not an indexed note',
			);
			await expect(query.matches('status == "done"', 'Map.canvas')).rejects.toThrow(
				'Mod "ideas": query.matches: "Map.canvas" is not an indexed note',
			);
		});

		it('rejects an invalid vault path', async () => {
			await expect(query.matches('status == "done"', '/abs.md')).rejects.toThrow('Invalid vault path "/abs.md"');
			await expect(query.matches('status == "done"', '../x.md')).rejects.toThrow('Invalid vault path "../x.md"');
		});

		it('evaluates a .view path like any record', async () => {
			await expect(query.matches('status == "done"', 'Board.view')).resolves.toBe(true);
		});
	});

	describe('notes', () => {
		it('lists vault-relative sorted paths, leaving out .view, system-folder, type and archived notes', async () => {
			await expect(query.notes('status == "done"')).resolves.toEqual(['Ideas/a.md']);
			await expect(query.notes('file.inFolder("Ideas")')).resolves.toEqual(['Ideas/a.md', 'Ideas/b.md']);
		});

		it('sorts regardless of index order', async () => {
			fillIndex({ 'z.md': '---\ns: 1\n---\n', 'a.md': '---\ns: 1\n---\n', 'm/b.md': '---\ns: 1\n---\n' });
			await expect(query.notes('s == 1')).resolves.toEqual(['a.md', 'm/b.md', 'z.md']);
		});

		it('keeps the archived note when the expression cites archived', async () => {
			await expect(query.notes('status == "done" && (archived || !archived)')).resolves.toEqual(['Ideas/a.md', 'Old.md']);
			await expect(query.notes('archived == true')).resolves.toEqual(['Old.md']);
		});

		it('leaves out a note whose evaluation fails', async () => {
			await expect(query.notes('status.lower() == "done"')).resolves.toEqual(['Ideas/a.md']);
		});

		it('rejects a parse error, an unknown function and an empty expression instead of resolving []', async () => {
			await expect(query.notes('status ==')).rejects.toThrow('Mod "ideas": query.notes: Invalid filter "status =="');
			await expect(query.notes('nope(1)')).rejects.toThrow('Mod "ideas": query.notes: Invalid filter "nope(1)": Unknown function: nope');
			await expect(query.notes(' ')).rejects.toThrow('Mod "ideas": query.notes needs a non-empty expression');
		});

		it('rejects when no row set port is registered', async () => {
			unregisterPort?.();
			unregisterPort = null;
			await expect(query.notes('status == "done"')).rejects.toThrow('Mod "ideas": query.notes is not available yet');
		});
	});

	describe('readiness and freshness', () => {
		it('rejects both before the vault notes are indexed', async () => {
			collectionStore.reset();
			await expect(query.matches('status == "done"', 'Ideas/a.md')).rejects.toThrow(
				'Mod "ideas": query.matches: the vault\'s notes are not indexed yet',
			);
			await expect(query.notes('status == "done"')).rejects.toThrow(
				'Mod "ideas": query.notes: the vault\'s notes are not indexed yet',
			);
		});

		it('sees a record written by updateNoteInIndex at once, with size 0 for a new path', async () => {
			updateNoteInIndex(`${VAULT}/Ideas/b.md`, '---\nstatus: done\n---\n# B');
			updateNoteInIndex(`${VAULT}/Ideas/new.md`, '---\nstatus: done\n---\n# New');

			await expect(query.matches('status == "done"', 'Ideas/b.md')).resolves.toBe(true);
			await expect(query.matches('file.size == 0', 'Ideas/new.md')).resolves.toBe(true);
			await expect(query.notes('status == "done"')).resolves.toEqual(['Ideas/a.md', 'Ideas/b.md', 'Ideas/new.md']);
		});
	});

	describe('guards', () => {
		let runtime: ModRuntime;
		let ctxQuery: ModQueryV1;

		beforeEach(() => {
			runtime = { controller: new AbortController(), disposers: [], runs: new Set(), unloaded: false };
			ctxQuery = createModContext({ id: 'ideas', name: 'Ideas', version: '1.0.0' }, VAULT, runtime).query;
		});

		it('the host ctx answers through the same engine', async () => {
			await expect(ctxQuery.matches('status == "done"', 'Ideas/a.md')).resolves.toBe(true);
			await expect(ctxQuery.notes('status == "done"')).resolves.toEqual(['Ideas/a.md']);
		});

		it('rejects both once the mod is unloaded', async () => {
			runtime.unloaded = true;
			await expect(ctxQuery.matches('status == "done"', 'Ideas/a.md')).rejects.toThrow('Mod "ideas" is unloaded');
			await expect(ctxQuery.notes('status == "done"')).rejects.toThrow('Mod "ideas" is unloaded');
		});

		it('rejects both once another vault is open', async () => {
			vaultStore.open('/other');
			await expect(ctxQuery.matches('status == "done"', 'Ideas/a.md')).rejects.toThrow('Mod "ideas" is unloaded');
			await expect(ctxQuery.notes('status == "done"')).rejects.toThrow('Mod "ideas" is unloaded');
		});
	});
});
