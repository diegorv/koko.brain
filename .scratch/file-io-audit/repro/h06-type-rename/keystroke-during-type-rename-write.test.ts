/**
 * Repro (h06 feature-writers-15): a keystroke typed in the active member tab
 * while renameType's per-tab writeTextFile is in flight is lost.
 *
 * renameType reads tab.content, awaits writeTextFile(rewritten), then calls
 * syncExternalContentToEditor(..., markSaved=true), which replaces
 * tab.content (and the CodeMirror doc) with the rewritten pre-await text.
 * A keystroke in that window only reaches editorStore via updateContent
 * (the same store write onContentChange performs), so the sync overwrites it.
 *
 * Only @tauri-apps/* and the renameItem IPC wrapper are mocked. The stores
 * and the real editor.service / type-definitions.service run. The test
 * asserts the CORRECT behavior (the typed text survives) and fails while the
 * bug exists.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readDir: vi.fn(),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async () => undefined) }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => {}) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(async () => true) }));
vi.mock('@tauri-apps/plugin-opener', () => ({ revealItemInDir: vi.fn() }));
vi.mock('#lib/core/filesystem/fs.service.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('#lib/core/filesystem/fs.service.js')>();
	return { ...actual, renameItem: vi.fn(async () => '/vault/Initiative.md') };
});

import { writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { renameType } from '#lib/features/type-definitions/type-definitions.service.js';

const MEMBER = '/vault/m1.md';
const BEFORE = '---\n_type: Project\n---\n\nhello';

describe('h06 repro: keystroke typed during the type-rename write', () => {
	beforeEach(() => {
		clearLocalStorage();
		editorStore.reset();
		vi.mocked(writeTextFile).mockReset();
	});

	it('keeps a keystroke typed while the member write is in flight', async () => {
		editorStore.addTab({ path: MEMBER, name: 'm1.md', content: BEFORE, savedContent: BEFORE });

		let release!: () => void;
		const gate = new Promise<void>((r) => { release = r; });
		vi.mocked(writeTextFile).mockImplementation(async () => { await gate; });

		const renaming = renameType('Project', 'Initiative', '/vault/Project.md');
		await vi.waitFor(() => expect(writeTextFile).toHaveBeenCalled());

		// Same store write that onContentChange performs on a keystroke.
		editorStore.updateContent(BEFORE + '!');
		release();
		await renaming;

		// CORRECT: the typed "!" is still in the editor after the rename.
		expect(editorStore.activeTab?.content).toContain('!');
		expect(editorStore.activeTab?.content).toContain('_type: Initiative');
	});
});
