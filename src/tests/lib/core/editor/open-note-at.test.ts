import { describe, it, expect, vi, beforeEach } from 'vitest';

// openFileInEditor hits Tauri fs IPC — legitimately mocked. The store and
// editor.logic stay real (CLAUDE.md rule 1).
vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

import { openNoteAt } from '$lib/core/editor/open-note-at.service';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { editorStore } from '$lib/core/editor/editor.store.svelte';

/**
 * 1-indexed line starts: line 1 "# Title" → 0, line 2 "" → 8,
 * line 3 "alpha beta" → 9, line 4 "target line here" → 20, line 5 "tail" → 37.
 * Total length 42.
 */
const CONTENT = '# Title\n\nalpha beta\ntarget line here\ntail\n';
const PATH = '/vault/notes/target.md';
const OTHER_PATH = '/vault/notes/other.md';

function addTargetTab(): void {
	editorStore.addTab({ path: PATH, name: 'target.md', content: CONTENT, savedContent: CONTENT });
}

describe('openNoteAt', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		vi.mocked(openFileInEditor).mockImplementation(async (path: string) => {
			editorStore.addTab({ path, name: 'target.md', content: CONTENT, savedContent: CONTENT });
		});
	});

	it('does not reopen the note when it is already the active tab', async () => {
		addTargetTab();

		await openNoteAt(PATH, { kind: 'offset', offset: 20 });

		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(editorStore.pendingScrollPosition).toBe(20);
	});

	it('clamps an offset past the end of the note to its length', async () => {
		addTargetTab();

		await openNoteAt(PATH, { kind: 'offset', offset: 999 });

		expect(editorStore.pendingScrollPosition).toBe(CONTENT.length);
	});

	it('clamps a negative offset to zero', async () => {
		addTargetTab();

		await openNoteAt(PATH, { kind: 'offset', offset: -5 });

		expect(editorStore.pendingScrollPosition).toBe(0);
	});

	it('converts a 1-indexed line target to the offset where that line starts', async () => {
		addTargetTab();

		await openNoteAt(PATH, { kind: 'line', line: 4 });
		expect(editorStore.pendingScrollPosition).toBe(20);

		await openNoteAt(PATH, { kind: 'line', line: 1 });
		expect(editorStore.pendingScrollPosition).toBe(0);
	});

	it('opens the note first when a different tab is active, then sets the target', async () => {
		editorStore.addTab({ path: OTHER_PATH, name: 'other.md', content: 'decoy', savedContent: 'decoy' });

		await openNoteAt(PATH, { kind: 'line', line: 3 });

		expect(openFileInEditor).toHaveBeenCalledWith(PATH);
		expect(editorStore.activeTabPath).toBe(PATH);
		expect(editorStore.pendingScrollPosition).toBe(9);
	});

	it('sets no target when the open fails', async () => {
		// openFileInEditor swallows read errors internally (toast + no tab added).
		vi.mocked(openFileInEditor).mockResolvedValue(undefined);
		editorStore.addTab({ path: OTHER_PATH, name: 'other.md', content: 'decoy', savedContent: 'decoy' });

		await openNoteAt(PATH, { kind: 'offset', offset: 12 });

		expect(editorStore.activeTabPath).toBe(OTHER_PATH);
		expect(editorStore.pendingScrollPosition).toBeNull();
	});

	it('is a no-op with no tabs open and a null path', async () => {
		await expect(openNoteAt(null, { kind: 'offset', offset: 7 })).resolves.toBeUndefined();

		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(editorStore.pendingScrollPosition).toBeNull();
	});
});
