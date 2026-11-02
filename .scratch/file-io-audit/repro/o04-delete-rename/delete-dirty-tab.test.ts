/**
 * Repro (o04: cross-cutting-2, recovery-4, rename-move-delete-1, save-pipeline-5).
 *
 * Moving a note (or its folder) to the Trash while its tab holds unsaved
 * edits: `applyPathChange` calls `closeTabsForDeletedPath` (no dirty check,
 * no save) before `diskOp`, so the Trash receives the last saved bytes, and
 * a failed Trash move leaves the note on disk with the edits gone.
 *
 * Only `@tauri-apps/*` is mocked; the editor, path-change, fs and trash
 * services and every store are real. These tests assert the CORRECT
 * behavior and fail while the bug exists.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

const fake = vi.hoisted(() => ({ fs: null as unknown as import('./fake-fs').FakeFs }));

vi.mock('@tauri-apps/plugin-fs', async () => {
	const mod = await import('./fake-fs');
	fake.fs = mod.createFakeFs();
	return mod.pluginFsMock(fake.fs);
});
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async () => []) }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => {}) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(async () => true) }));
vi.mock('@tauri-apps/plugin-opener', () => ({ revealItemInDir: vi.fn() }));

import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { onContentChange } from '#lib/core/editor/editor.service.js';
import { deleteItem } from '#lib/core/filesystem/fs.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { trashStore } from '#lib/core/trash/trash.store.svelte.js';


const NOTE = '/vault/note.md';
const SAVED = '# Note\n\nsaved text\n';
const EDITED = '# Note\n\nsaved text\nunsaved sentence typed just before the delete\n';

function openTab(path: string, content: string) {
	editorStore.addTab({ path, name: path.split('/').pop()!, content, savedContent: content });
}

/** Lets the async delete chain settle, then fires any pending autosave timers. */
async function settle() {
	for (let i = 0; i < 20; i++) await Promise.resolve();
	await vi.advanceTimersByTimeAsync(6000);
	for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe('o04 repro: Move to Trash with a dirty tab', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		clearLocalStorage();
		fake.fs.reset();
		editorStore.reset();
		fsStore.reset();
		trashStore.reset?.();
		vaultStore._reset();
		vaultStore.open('/vault');
		fake.fs.put(NOTE, SAVED);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('the Trash copy holds the edits typed inside the 2 s autosave debounce', async () => {
		openTab(NOTE, SAVED);
		onContentChange(EDITED); // arms the 2 s body autosave

		await deleteItem(NOTE, false); // the user confirmed the dialog within 2 s
		await settle();

		const trashed = fake.fs.listPaths().filter((p) => p.includes('/.kokobrain/trash/items/') && p.endsWith('/note.md'));
		expect(trashed).toHaveLength(1);
		// CORRECT: restoring from the Trash gives back what the user had typed.
		expect(fake.fs.read(trashed[0])).toBe(EDITED);
	});

	it('a folder delete keeps a dirty child tab’s edits in the Trash', async () => {
		fake.fs.dirs.set('/vault/proj', '/vault/proj');
		fake.fs.put('/vault/proj/child.md', SAVED);
		openTab('/vault/proj/child.md', SAVED);
		onContentChange(EDITED);

		await deleteItem('/vault/proj', true);
		await settle();

		const trashed = fake.fs.listPaths().filter((p) => p.endsWith('/proj/child.md') && p.includes('/trash/'));
		expect(trashed).toHaveLength(1);
		expect(fake.fs.read(trashed[0])).toBe(EDITED);
	});

	it('a failed Trash move keeps the unsaved edits (tab still open or bytes on disk)', async () => {
		openTab(NOTE, SAVED);
		onContentChange(EDITED);
		fake.fs.renameError = new Error('EXDEV: cross-device link not permitted');

		await expect(deleteItem(NOTE, false)).rejects.toThrow('EXDEV');
		await settle();

		// The note is still in the vault: the delete did not happen.
		expect(fake.fs.read(NOTE)).toBeDefined();
		const tab = editorStore.tabs.find((t) => t.path === NOTE);
		const editsSurvive = tab?.content === EDITED || fake.fs.read(NOTE) === EDITED;
		// CORRECT: a delete that did not happen must not discard the edits.
		expect({ tabOpen: !!tab, diskContent: fake.fs.read(NOTE), editsSurvive }).toEqual(
			expect.objectContaining({ editsSurvive: true }),
		);
	});
});
