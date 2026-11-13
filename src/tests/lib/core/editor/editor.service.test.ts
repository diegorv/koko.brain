import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
	perfStart: vi.fn(() => 0),
	perfEnd: vi.fn(),
	perfBaseline: vi.fn(),
}));

vi.mock('#lib/utils/debounce.js', () => ({
	debounce: vi.fn((fn: (...args: any[]) => any) => {
		let lastArgs: any[] | undefined;
		const debounced = (...args: any[]) => {
			lastArgs = args;
			fn(...args);
		};
		debounced.cancel = vi.fn(() => { lastArgs = undefined; });
		debounced.flush = vi.fn(() => {
			if (lastArgs) {
				const args = lastArgs;
				lastArgs = undefined;
				fn(...args);
			}
		});
		return debounced;
	}),
}));

import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { ask } from '@tauri-apps/plugin-dialog';
import { toast } from 'svelte-sonner';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { TASKS_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import { addAfterSaveObserver, resetHooks } from '#lib/core/editor/editor.hooks.js';
import { setNoteWriter } from '#lib/core/editor/note-write.port.js';
import { NOTE_CONFLICT_MESSAGE, NoteConflictError } from '#lib/contracts/note-conflict.js';
import {
	openFileInEditor,
	saveCurrentFile,
	saveFileByPath,
	onContentChange,
	switchTab,
	closeTab,
	closeActiveTab,
	switchToNextTab,
	switchToPreviousTab,
	resetEditor,
	togglePinTab,
	togglePinActiveTab,
	pinTabByPath,
	unpinTabByPath,
	closeTabsForDeletedPath,
	saveAllDirtyTabs,
	reloadExternallyChangedTabs,
	toggleSourceMode,
	syncExternalContentToEditor,
	registerTabCloseListener,
	registerPendingEditFlusher,
	flushPendingEdits,
	waitForTabSave,
} from '#lib/core/editor/editor.service.js';
import { error as logError } from '#lib/utils/debug.js';

function addTab(path: string, content = '', overrides: Partial<{ savedContent: string; pinned: boolean }> = {}) {
	const name = path.split('/').pop() ?? path;
	editorStore.addTab({
		path,
		name,
		content,
		savedContent: overrides.savedContent ?? content,
		pinned: overrides.pinned ?? false,
	});
}

describe('openFileInEditor', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		fsStore.reset();
	});

	it('switches to existing tab if file is already open', async () => {
		addTab('/vault/note.md', 'hello');
		addTab('/vault/other.md', 'world');
		expect(editorStore.activeIndex).toBe(1);

		await openFileInEditor('/vault/note.md');

		expect(editorStore.activeIndex).toBe(0);
		expect(readTextFile).not.toHaveBeenCalled();
	});

	it('reads file and creates new tab if not already open', async () => {
		vi.mocked(readTextFile).mockResolvedValue('file content');

		await openFileInEditor('/vault/new.md');

		expect(readTextFile).toHaveBeenCalledWith('/vault/new.md');
		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.activeTab?.path).toBe('/vault/new.md');
		expect(editorStore.activeTab?.content).toBe('file content');
		expect(editorStore.activeTab?.savedContent).toBe('file content');
	});

	it('sets fileType to collection for .view files', async () => {
		vi.mocked(readTextFile).mockResolvedValue('views:\n  - type: table');

		await openFileInEditor('/vault/test.view');

		expect(editorStore.activeTab?.fileType).toBe('collection');
	});

	it('opens a .collection file as a text tab, with no fileType', async () => {
		vi.mocked(readTextFile).mockResolvedValue('views:\n  - type: table');

		await openFileInEditor('/vault/Foo.collection');

		expect(editorStore.activeTab?.path).toBe('/vault/Foo.collection');
		expect(editorStore.activeTab?.content).toBe('views:\n  - type: table');
		expect(editorStore.activeTab?.fileType).toBeUndefined();
	});

	it('handles read errors gracefully', async () => {
		vi.mocked(readTextFile).mockRejectedValue(new Error('read error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await openFileInEditor('/vault/missing.md');

		expect(editorStore.tabs).toHaveLength(0);
		consoleSpy.mockRestore();
	});

	it('does not create duplicate tab when two calls race', async () => {
		vi.mocked(readTextFile).mockImplementation(async () => {
			// Simulate another call having added the tab during the await
			if (editorStore.tabs.length === 0) {
				addTab('/vault/note.md', 'content');
			}
			return 'content';
		});

		await openFileInEditor('/vault/note.md');

		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.activeIndex).toBe(0);
	});

	it('rejects binary file paths without reading them, surfaces a toast', async () => {
		await openFileInEditor('/vault/Resources/img.png');

		expect(readTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs).toHaveLength(0);
		expect(toast.error).toHaveBeenCalledWith(
			expect.stringContaining('Cannot open binary file'),
		);
	});

	it('rejects binary paths regardless of case', async () => {
		await openFileInEditor('/vault/song.MP3');

		expect(readTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs).toHaveLength(0);
		expect(toast.error).toHaveBeenCalledWith(
			expect.stringContaining('Cannot open binary file'),
		);
	});

	it('rejects PDF paths so wikilink-driven opens do not crash', async () => {
		await openFileInEditor('/vault/spec.pdf');

		expect(readTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs).toHaveLength(0);
	});
});

describe('saveCurrentFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('skips if no active tab', async () => {
		await saveCurrentFile();

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.activeTab).toBeNull();
	});

	it('skips if tab is not dirty', async () => {
		addTab('/vault/note.md', 'same');

		await saveCurrentFile();

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.activeTab?.savedContent).toBe('same');
	});

	it('writes file and marks saved when dirty', async () => {
		addTab('/vault/note.md', 'original');
		editorStore.updateContent('modified');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await saveCurrentFile();

		expect(writeTextFile).toHaveBeenCalledWith('/vault/note.md', 'modified');
		expect(editorStore.activeTab?.savedContent).toBe('modified');
	});

	it('handles write errors gracefully and shows toast', async () => {
		addTab('/vault/note.md', 'original');
		editorStore.updateContent('modified');
		vi.mocked(writeTextFile).mockRejectedValue(new Error('write error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await saveCurrentFile();

		expect(consoleSpy).toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith('Failed to save file.');
		// savedContent should not be updated on error
		expect(editorStore.activeTab?.savedContent).toBe('original');
		consoleSpy.mockRestore();
	});

	it('skips save for virtual tab even if dirty', async () => {
		editorStore.addTab({
			path: TASKS_VIRTUAL_PATH,
			name: 'Tasks',
			content: 'modified',
			savedContent: 'original',
			fileType: 'tasks',
		});

		await saveCurrentFile();

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.activeTab?.savedContent).toBe('original');
	});
});

describe('saveFileByPath', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('saves a specific dirty tab by path and returns true', async () => {
		addTab('/vault/a.md', 'original');
		addTab('/vault/b.md', 'clean');
		// Modify tab a
		editorStore.setActiveIndex(0);
		editorStore.updateContent('modified');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		const result = await saveFileByPath('/vault/a.md');

		expect(result).toBe(true);
		expect(writeTextFile).toHaveBeenCalledWith('/vault/a.md', 'modified');
		expect(editorStore.tabs[0].savedContent).toBe('modified');
	});

	it('returns true for unknown path (no-op)', async () => {
		addTab('/vault/a.md', 'content');

		const result = await saveFileByPath('/vault/unknown.md');

		expect(result).toBe(true);
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs[0].savedContent).toBe('content');
	});

	it('returns true for clean tab (no-op)', async () => {
		addTab('/vault/a.md', 'same');

		const result = await saveFileByPath('/vault/a.md');

		expect(result).toBe(true);
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs[0].savedContent).toBe('same');
	});

	it('returns false on write error and shows toast', async () => {
		addTab('/vault/a.md', 'original');
		editorStore.setActiveIndex(0);
		editorStore.updateContent('modified');
		vi.mocked(writeTextFile).mockRejectedValue(new Error('disk full'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await saveFileByPath('/vault/a.md');

		expect(result).toBe(false);
		expect(consoleSpy).toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith('Failed to save file.');
		expect(editorStore.tabs[0].savedContent).toBe('original');
		consoleSpy.mockRestore();
	});

	it('returns true for virtual tab even if dirty (no-op)', async () => {
		editorStore.addTab({
			path: TASKS_VIRTUAL_PATH,
			name: 'Tasks',
			content: 'modified',
			savedContent: 'original',
			fileType: 'tasks',
		});

		const result = await saveFileByPath(TASKS_VIRTUAL_PATH);

		expect(result).toBe(true);
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.activeTab?.savedContent).toBe('original');
	});

	it('starts a second save of the same path only after the first lands, with the newest content', async () => {
		addTab('/vault/a.md', 'original');
		editorStore.updateContent('first');
		let release!: () => void;
		vi.mocked(writeTextFile).mockImplementationOnce(() => new Promise<void>((res) => { release = res; }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		const first = saveFileByPath('/vault/a.md');
		editorStore.updateContent('second');
		const second = saveFileByPath('/vault/a.md');
		await Promise.resolve();

		expect(vi.mocked(writeTextFile).mock.calls).toEqual([['/vault/a.md', 'first']]);
		release();
		expect(await first).toBe(true);
		expect(await second).toBe(true);
		expect(vi.mocked(writeTextFile).mock.calls).toEqual([['/vault/a.md', 'first'], ['/vault/a.md', 'second']]);
		expect(editorStore.tabs[0].savedContent).toBe('second');
	});

	it('does not hold a save of another path behind a pending one', async () => {
		addTab('/vault/a.md', 'a');
		addTab('/vault/b.md', 'b');
		editorStore.updateTabContentOnly('/vault/a.md', 'a2');
		editorStore.updateTabContentOnly('/vault/b.md', 'b2');
		let release!: () => void;
		vi.mocked(writeTextFile).mockImplementationOnce(() => new Promise<void>((res) => { release = res; }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		const pending = saveFileByPath('/vault/a.md');

		expect(await saveFileByPath('/vault/b.md')).toBe(true);
		expect(editorStore.tabs[1].savedContent).toBe('b2');
		expect(editorStore.tabs[0].savedContent).toBe('a');
		release();
		await pending;
	});

	it('runs the next save of a path after a failed one', async () => {
		addTab('/vault/a.md', 'original');
		editorStore.updateContent('modified');
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		const first = saveFileByPath('/vault/a.md');
		const second = saveFileByPath('/vault/a.md');

		expect(await first).toBe(false);
		expect(await second).toBe(true);
		expect(editorStore.tabs[0].savedContent).toBe('modified');
		consoleSpy.mockRestore();
	});
});

describe('waitForTabSave', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('resolves at once when no save of the path is pending', async () => {
		let done = false;
		void waitForTabSave('/vault/a.md').then(() => { done = true; });
		await Promise.resolve();
		await Promise.resolve();

		expect(done).toBe(true);
	});

	it('resolves only after the pending save of the path lands, even when it fails', async () => {
		addTab('/vault/a.md', 'original');
		editorStore.updateContent('modified');
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		let fail!: (err: Error) => void;
		vi.mocked(writeTextFile).mockImplementationOnce(() => new Promise<void>((_res, rej) => { fail = rej; }));

		void saveFileByPath('/vault/a.md');
		let done = false;
		const waited = waitForTabSave('/vault/a.md').then(() => { done = true; });
		for (let i = 0; i < 5; i++) await Promise.resolve();

		expect(done).toBe(false);
		fail(new Error('disk full'));
		await waited;
		expect(done).toBe(true);
		consoleSpy.mockRestore();
	});
});

describe('onContentChange', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('updates store content', () => {
		addTab('/vault/note.md', 'old');

		onContentChange('new content');

		expect(editorStore.activeTabContent).toBe('new content');
	});

	it('saves all dirty tabs on debounce fire (not just the active one)', async () => {
		// Edit tab A
		addTab('/vault/a.md', 'original-a');
		editorStore.setActiveIndex(0);
		editorStore.updateContent('modified-a');

		// Open and edit tab B
		addTab('/vault/b.md', 'original-b');
		editorStore.updateContent('modified-b');

		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		// Trigger debounced save (mock executes immediately)
		onContentChange('modified-b-2');

		// Wait for all async saves to complete
		await vi.waitFor(() => {
			// Both dirty tabs should have been saved
			expect(writeTextFile).toHaveBeenCalledWith('/vault/a.md', 'modified-a');
		});
	});

	it('retries save after failure so data is not silently lost', async () => {
		vi.useFakeTimers();
		addTab('/vault/note.md', 'original');
		editorStore.setActiveIndex(0);
		editorStore.updateContent('modified');

		// First save fails
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
		// Second save succeeds
		vi.mocked(writeTextFile).mockResolvedValueOnce(undefined);

		onContentChange('modified');

		// Wait for the first (failed) save to complete
		await vi.advanceTimersByTimeAsync(100);

		// Tab should still be dirty after failed save
		expect(editorStore.tabs[0].savedContent).toBe('original');

		// A retry should be scheduled. Advance past the retry delay.
		await vi.advanceTimersByTimeAsync(6000);

		// After retry, save should succeed
		expect(editorStore.tabs[0].savedContent).toBe('modified');
		vi.useRealTimers();
	});

	it('skips clean and virtual tabs during auto-save', () => {
		// Clean tab
		addTab('/vault/clean.md', 'same');
		// Virtual tab with different content
		editorStore.addTab({
			path: TASKS_VIRTUAL_PATH,
			name: 'Tasks',
			content: 'modified',
			savedContent: 'original',
			fileType: 'tasks',
		});

		onContentChange('same');

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs[0].savedContent).toBe('same');
		expect(editorStore.tabs[1].savedContent).toBe('original');
	});
});

describe('note writer port and conflicts', () => {
	type Write = { path: string; content: string; base: string };
	let writes: Write[];

	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		resetEditor();
		writes = [];
	});

	afterEach(() => {
		setNoteWriter(null);
		vi.useRealTimers();
	});

	/** A writer that records each write and refuses those for which `refuse` is true. */
	function installWriter(refuse: (w: Write) => boolean = () => false) {
		setNoteWriter(async (path, content, base) => {
			const w = { path, content, base };
			writes.push(w);
			if (refuse(w)) throw new NoteConflictError(path);
		});
	}

	it('passes the content the tab was loaded with as the base', async () => {
		installWriter();
		addTab('/vault/a.md', 'loaded');
		editorStore.updateContent('typed');

		expect(await saveFileByPath('/vault/a.md')).toBe(true);

		expect(writes).toEqual([{ path: '/vault/a.md', content: 'typed', base: 'loaded' }]);
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs[0].savedContent).toBe('typed');
	});

	it('the next save is based on the last saved content', async () => {
		installWriter();
		addTab('/vault/a.md', 'v0');
		editorStore.updateContent('v1');
		await saveFileByPath('/vault/a.md');
		editorStore.updateContent('v2');
		await saveFileByPath('/vault/a.md');

		expect(writes.map((w) => w.base)).toEqual(['v0', 'v1']);
	});

	it('a save started while another is in flight waits for it and is based on what landed', async () => {
		let release!: () => void;
		const gate = new Promise<void>((r) => (release = r));
		setNoteWriter(async (path, content, base) => {
			writes.push({ path, content, base });
			if (writes.length === 1) await gate;
		});
		addTab('/vault/a.md', 'v0');
		editorStore.updateContent('v1');
		const first = saveFileByPath('/vault/a.md');
		editorStore.updateContent('v2');
		const second = saveFileByPath('/vault/a.md');
		await Promise.resolve();
		expect(writes).toHaveLength(1);

		release();
		expect(await first).toBe(true);
		expect(await second).toBe(true);
		expect(writes).toEqual([
			{ path: '/vault/a.md', content: 'v1', base: 'v0' },
			{ path: '/vault/a.md', content: 'v2', base: 'v1' },
		]);
		expect(editorStore.tabs[0].savedContent).toBe('v2');
	});

	it('a conflict keeps the text and the tab dirty and shows the conflict message', async () => {
		installWriter(() => true);
		addTab('/vault/a.md', 'loaded');
		editorStore.updateContent('typed');

		expect(await saveFileByPath('/vault/a.md')).toBe(false);

		expect(editorStore.tabs[0].content).toBe('typed');
		expect(editorStore.tabs[0].savedContent).toBe('loaded');
		expect(toast.error).toHaveBeenCalledWith(NOTE_CONFLICT_MESSAGE);
		expect(toast.error).not.toHaveBeenCalledWith('Failed to save file.');
	});

	it('autosave stops retrying a conflicted tab and keeps saving the others', async () => {
		vi.useFakeTimers();
		installWriter((w) => w.path === '/vault/a.md');
		addTab('/vault/a.md', 'a0');
		editorStore.updateContent('a1');
		addTab('/vault/b.md', 'b0');

		onContentChange('b1');
		await vi.advanceTimersByTimeAsync(100);
		expect(writes.filter((w) => w.path === '/vault/a.md')).toHaveLength(1);

		// No 5 s retry, and later keystrokes do not save the conflicted tab either.
		await vi.advanceTimersByTimeAsync(20_000);
		onContentChange('b2');
		await vi.advanceTimersByTimeAsync(20_000);
		expect(writes.filter((w) => w.path === '/vault/a.md')).toHaveLength(1);
		expect(writes.filter((w) => w.path === '/vault/b.md').map((w) => w.content)).toEqual(['b1', 'b2']);
		expect(editorStore.tabs[0].content).toBe('a1');
		expect(toast.error).toHaveBeenCalledTimes(1);
	});

	it('typing into a conflicted tab shows the conflict message again, once per autosave, without saving', async () => {
		vi.useFakeTimers();
		installWriter(() => true);
		addTab('/vault/a.md', 'a0');
		onContentChange('a1');
		await vi.advanceTimersByTimeAsync(100);
		expect(toast.error).toHaveBeenCalledTimes(1);

		onContentChange('a2');
		await vi.advanceTimersByTimeAsync(3000);
		expect(toast.error).toHaveBeenCalledTimes(2);
		expect(toast.error).toHaveBeenLastCalledWith(NOTE_CONFLICT_MESSAGE);
		// No new typing: the next autosave stays quiet.
		await vi.advanceTimersByTimeAsync(20_000);
		expect(toast.error).toHaveBeenCalledTimes(2);

		// Undone back to the loaded text, then typed into again.
		onContentChange('a0');
		await vi.advanceTimersByTimeAsync(3000);
		onContentChange('a3');
		await vi.advanceTimersByTimeAsync(3000);
		expect(toast.error).toHaveBeenCalledTimes(3);
		expect(writes).toHaveLength(1);
		expect(editorStore.tabs[0].content).toBe('a3');
	});

	it('a reloaded note saves again', async () => {
		installWriter((w) => w.base === 'a0');
		addTab('/vault/a.md', 'a0');
		editorStore.updateContent('a1');
		onContentChange('a1');
		await vi.waitFor(() => expect(writes).toHaveLength(1));

		// The tab is reloaded with the Mac version, then typed into again.
		syncExternalContentToEditor('/vault/a.md', 'mac', true, 'none');
		onContentChange('a2');
		await vi.waitFor(() => expect(writes).toHaveLength(2));
		expect(writes[1]).toEqual({ path: '/vault/a.md', content: 'a2', base: 'mac' });
		expect(editorStore.tabs[0].savedContent).toBe('a2');
	});

	it('a closed and reopened note saves again', async () => {
		installWriter((w) => w.base === 'a0');
		addTab('/vault/a.md', 'a0');
		editorStore.updateContent('a1');
		onContentChange('a1');
		await vi.waitFor(() => expect(writes).toHaveLength(1));
		vi.mocked(ask).mockResolvedValue(true);
		await closeTab(0);

		// Closing tries one more save of the dirty tab, refused like the first.
		expect(writes).toHaveLength(2);

		addTab('/vault/a.md', 'mac');
		onContentChange('a2');
		await vi.waitFor(() => expect(writes).toHaveLength(3));
		expect(writes[2]).toEqual({ path: '/vault/a.md', content: 'a2', base: 'mac' });
		expect(editorStore.tabs[0].savedContent).toBe('a2');
	});

	it('another write error still retries', async () => {
		vi.useFakeTimers();
		let fail = true;
		setNoteWriter(async (path, content, base) => {
			writes.push({ path, content, base });
			if (fail) {
				fail = false;
				throw new Error('Connection to the Kokobrain desktop app was lost');
			}
		});
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		addTab('/vault/a.md', 'a0');
		onContentChange('a1');
		await vi.advanceTimersByTimeAsync(100);
		expect(toast.error).toHaveBeenCalledWith('Failed to save file.');
		await vi.advanceTimersByTimeAsync(6000);
		expect(writes).toHaveLength(2);
		expect(editorStore.tabs[0].savedContent).toBe('a1');
		consoleSpy.mockRestore();
	});
});

describe('saveAllDirtyTabs', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('saves all dirty tabs and returns empty array on success', async () => {
		// Dirty tab
		addTab('/vault/dirty.md', 'original');
		editorStore.setActiveIndex(0);
		editorStore.updateContent('modified');
		// Clean tab
		addTab('/vault/clean.md', 'same');
		// Virtual dirty tab
		editorStore.addTab({
			path: TASKS_VIRTUAL_PATH,
			name: 'Tasks',
			content: 'modified',
			savedContent: 'original',
			fileType: 'tasks',
		});
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		const failed = await saveAllDirtyTabs();

		expect(failed).toEqual([]);
		expect(writeTextFile).toHaveBeenCalledTimes(1);
		expect(writeTextFile).toHaveBeenCalledWith('/vault/dirty.md', 'modified');
	});

	it('awaits all saves and returns empty array when all succeed', async () => {
		addTab('/vault/a.md', 'original-a');
		editorStore.setActiveIndex(0);
		editorStore.updateContent('modified-a');
		addTab('/vault/b.md', 'original-b');
		editorStore.updateContent('modified-b');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		const failed = await saveAllDirtyTabs();

		expect(failed).toEqual([]);
		expect(writeTextFile).toHaveBeenCalledWith('/vault/a.md', 'modified-a');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/b.md', 'modified-b');
		// Both tabs should now be marked as saved
		expect(editorStore.tabs[0].savedContent).toBe('modified-a');
		expect(editorStore.tabs[1].savedContent).toBe('modified-b');
	});

	it('returns empty array when all tabs are clean', async () => {
		addTab('/vault/a.md', 'same');
		addTab('/vault/b.md', 'same');

		const failed = await saveAllDirtyTabs();

		expect(failed).toEqual([]);
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('returns paths of tabs that failed to save', async () => {
		addTab('/vault/a.md', 'original-a');
		editorStore.setActiveIndex(0);
		editorStore.updateContent('modified-a');
		addTab('/vault/b.md', 'original-b');
		editorStore.updateContent('modified-b');
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		// a.md fails, b.md succeeds
		vi.mocked(writeTextFile).mockImplementation(async (path: string | URL) => {
			if (path === '/vault/a.md') throw new Error('disk full');
		});

		const failed = await saveAllDirtyTabs();

		expect(failed).toEqual(['/vault/a.md']);
		// b.md should still be saved
		expect(editorStore.tabs[1].savedContent).toBe('modified-b');
		// a.md should remain dirty
		expect(editorStore.tabs[0].savedContent).toBe('original-a');
		consoleSpy.mockRestore();
	});
});

describe('switchTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		fsStore.reset();
	});

	it('sets the active index', () => {
		addTab('/vault/a.md');
		addTab('/vault/b.md');

		switchTab(0);

		expect(editorStore.activeIndex).toBe(0);
	});

	it('switches to a virtual tab', () => {
		addTab('/vault/a.md');
		editorStore.addTab({
			path: TASKS_VIRTUAL_PATH,
			name: 'Tasks',
			content: '',
			savedContent: '',
			fileType: 'tasks',
		});

		switchTab(1);

		expect(editorStore.activeIndex).toBe(1);
	});
});

describe('closeTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		fsStore.reset();
	});

	it('does nothing if tab index is invalid', async () => {
		await closeTab(0);

		expect(editorStore.tabs).toHaveLength(0);
	});

	it('closes a clean tab directly, with no write and no prompt', async () => {
		addTab('/vault/note.md', 'hello');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(ask).mockResolvedValue(true);

		await closeTab(0);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(ask).not.toHaveBeenCalled();
		expect(editorStore.tabs).toHaveLength(0);
		expect(editorStore.activeIndex).toBe(-1);
	});

	it('saves a dirty tab and closes it without a prompt', async () => {
		addTab('/vault/note.md', 'original');
		editorStore.updateContent('modified');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(ask).mockResolvedValue(false);

		await closeTab(0);

		expect(ask).not.toHaveBeenCalled();
		expect(vi.mocked(writeTextFile).mock.calls).toEqual([['/vault/note.md', 'modified']]);
		expect(editorStore.tabs).toHaveLength(0);
	});

	it('asks with the failed-save wording when the save fails, and closes on confirm', async () => {
		addTab('/vault/note.md', 'original');
		editorStore.updateContent('modified');
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(writeTextFile).mockRejectedValue(new Error('disk full'));
		vi.mocked(ask).mockResolvedValue(true);

		await closeTab(0);

		expect(ask).toHaveBeenCalledWith('Failed to save note.md. Close anyway and lose unsaved changes?', {
			title: 'Unsaved Changes',
			kind: 'warning',
			okLabel: 'Close Anyway',
			cancelLabel: 'Cancel',
		});
		expect(editorStore.tabs).toHaveLength(0);
		consoleSpy.mockRestore();
	});

	it('keeps the tab open and dirty when the save fails and the user cancels', async () => {
		addTab('/vault/note.md', 'original');
		editorStore.updateContent('modified');
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(writeTextFile).mockRejectedValue(new Error('disk full'));
		vi.mocked(ask).mockResolvedValue(false);

		await closeTab(0);

		expect(ask).toHaveBeenCalledTimes(1);
		expect(editorStore.tabs.map((t) => t.path)).toEqual(['/vault/note.md']);
		expect(editorStore.tabs[0].content).toBe('modified');
		expect(editorStore.tabs[0].savedContent).toBe('original');
		consoleSpy.mockRestore();
	});

	it('re-saves text typed during the close-time save, then closes without a prompt', async () => {
		addTab('/vault/note.md', 'original');
		editorStore.updateContent('first');
		let release!: () => void;
		vi.mocked(writeTextFile).mockImplementationOnce(() => new Promise<void>((res) => { release = res; }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(ask).mockResolvedValue(false);

		const closing = closeTab(0);
		editorStore.updateContent('second');
		release();
		await closing;

		expect(vi.mocked(writeTextFile).mock.calls).toEqual([['/vault/note.md', 'first'], ['/vault/note.md', 'second']]);
		expect(ask).not.toHaveBeenCalled();
		expect(editorStore.tabs).toHaveLength(0);
	});

	it('asks when text is typed again during the re-save, and Cancel keeps the tab dirty', async () => {
		addTab('/vault/note.md', 'original');
		editorStore.updateContent('first');
		let releaseFirst!: () => void;
		let releaseSecond!: () => void;
		vi.mocked(writeTextFile)
			.mockImplementationOnce(() => new Promise<void>((res) => { releaseFirst = res; }))
			.mockImplementationOnce(() => new Promise<void>((res) => { releaseSecond = res; }));
		vi.mocked(ask).mockResolvedValue(false);

		const closing = closeTab(0);
		editorStore.updateContent('second');
		releaseFirst();
		await vi.waitFor(() => expect(writeTextFile).toHaveBeenCalledTimes(2));
		editorStore.updateContent('third');
		releaseSecond();
		await closing;

		expect(vi.mocked(writeTextFile).mock.calls).toEqual([['/vault/note.md', 'first'], ['/vault/note.md', 'second']]);
		expect(ask).toHaveBeenCalledWith('Failed to save note.md. Close anyway and lose unsaved changes?', {
			title: 'Unsaved Changes',
			kind: 'warning',
			okLabel: 'Close Anyway',
			cancelLabel: 'Cancel',
		});
		expect(editorStore.tabs.map((t) => t.path)).toEqual(['/vault/note.md']);
		expect(editorStore.tabs[0].content).toBe('third');
		expect(editorStore.tabs[0].savedContent).toBe('second');
	});

	it('does not close a pinned tab', async () => {
		addTab('/vault/note.md', 'hello', { pinned: true });

		await closeTab(0);

		expect(editorStore.tabs).toHaveLength(1);
	});

	it('skips a dirty pinned tab with no write and no prompt', async () => {
		addTab('/vault/note.md', 'original', { pinned: true });
		editorStore.updateContent('modified');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(ask).mockResolvedValue(true);

		await closeTab(0);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(ask).not.toHaveBeenCalled();
		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.tabs[0].content).toBe('modified');
	});

	it('closes an unpinned tab normally', async () => {
		addTab('/vault/note.md', 'hello', { pinned: false });

		await closeTab(0);

		expect(editorStore.tabs).toHaveLength(0);
	});

	it('tells every registered tab-close listener the closed path', async () => {
		const closed: string[] = [];
		const unregister = registerTabCloseListener('test', (path) => closed.push(path));
		addTab('/vault/note.md', 'hello');
		addTab('/vault/other.md', 'hello');

		await closeTab(0);
		unregister();
		await closeTab(0);

		expect(closed).toEqual(['/vault/note.md']);
	});

	it('closes the tab and runs later listeners when one tab-close listener throws', async () => {
		const closed: string[] = [];
		const unregisterBad = registerTabCloseListener('bad', () => {
			throw new Error('boom');
		});
		const unregisterGood = registerTabCloseListener('good', (path) => closed.push(path));
		addTab('/vault/note.md', 'hello');

		await closeTab(0);
		unregisterBad();
		unregisterGood();

		expect(editorStore.tabs).toHaveLength(0);
		expect(closed).toEqual(['/vault/note.md']);
	});

	it('runs the closing path\'s flusher before the dirty check, saves what it wrote and closes with no prompt', async () => {
		addTab('/vault/board.canvas', 'old');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(ask).mockResolvedValue(false);
		const unregister = registerPendingEditFlusher('/vault/board.canvas', () => {
			editorStore.updateTabContentOnly('/vault/board.canvas', 'flushed');
		});

		await closeTab(0);
		unregister();

		expect(vi.mocked(writeTextFile).mock.calls).toEqual([['/vault/board.canvas', 'flushed']]);
		expect(ask).not.toHaveBeenCalled();
		expect(editorStore.tabs).toHaveLength(0);
	});

	it('does not run a flusher registered for another path', async () => {
		addTab('/vault/a.canvas', 'a');
		addTab('/vault/b.canvas', 'b');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(ask).mockResolvedValue(false);
		const flush = vi.fn();
		const unregister = registerPendingEditFlusher('/vault/b.canvas', flush);

		await closeTab(0);
		unregister();

		expect(flush).not.toHaveBeenCalled();
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs.map((t) => t.path)).toEqual(['/vault/b.canvas']);
	});

	it('does not run a flusher after it is unregistered', async () => {
		addTab('/vault/board.canvas', 'old');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(ask).mockResolvedValue(false);
		const flush = vi.fn();
		const unregister = registerPendingEditFlusher('/vault/board.canvas', flush);
		unregister();

		await closeTab(0);

		expect(flush).not.toHaveBeenCalled();
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs).toHaveLength(0);
	});

	it('does not run a pinned tab\'s flusher', async () => {
		addTab('/vault/board.canvas', 'old', { pinned: true });
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(ask).mockResolvedValue(false);
		const flush = vi.fn();
		const unregister = registerPendingEditFlusher('/vault/board.canvas', flush);

		await closeTab(0);
		unregister();

		expect(flush).not.toHaveBeenCalled();
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs).toHaveLength(1);
	});

	it('unregistering one of two flushers for a path leaves the other registered', async () => {
		addTab('/vault/board.canvas', 'old');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(ask).mockResolvedValue(false);
		const first = vi.fn();
		const second = vi.fn(() => {
			editorStore.updateTabContentOnly('/vault/board.canvas', 'from second');
		});
		const unregisterFirst = registerPendingEditFlusher('/vault/board.canvas', first);
		const unregisterSecond = registerPendingEditFlusher('/vault/board.canvas', second);
		unregisterFirst();

		await closeTab(0);
		unregisterSecond();

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(1);
		expect(vi.mocked(writeTextFile).mock.calls).toEqual([['/vault/board.canvas', 'from second']]);
		expect(editorStore.tabs).toHaveLength(0);
	});

	it('flushPendingEdits returns true when no flusher is registered for the path', () => {
		expect(flushPendingEdits('/vault/none.canvas')).toBe(true);
	});

	it('logs a throwing flusher, asks with the failed-save prompt, and Cancel keeps the clean tab open', async () => {
		addTab('/vault/board.canvas', 'old');
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(ask).mockResolvedValue(false);
		const unregister = registerPendingEditFlusher('/vault/board.canvas', () => {
			throw new Error('boom');
		});

		await closeTab(0);
		unregister();

		expect(logError).toHaveBeenCalledWith('EDITOR', expect.any(String), expect.any(Error));
		expect(ask).toHaveBeenCalledWith('Failed to save board.canvas. Close anyway and lose unsaved changes?', {
			title: 'Unsaved Changes',
			kind: 'warning',
			okLabel: 'Close Anyway',
			cancelLabel: 'Cancel',
		});
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs.map((t) => t.path)).toEqual(['/vault/board.canvas']);
		consoleSpy.mockRestore();
	});

	it('closes the tab on the confirm answer after a throwing flusher', async () => {
		addTab('/vault/board.canvas', 'old');
		editorStore.updateContent('modified');
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(ask).mockResolvedValue(true);
		const unregister = registerPendingEditFlusher('/vault/board.canvas', () => {
			throw new Error('boom');
		});

		await closeTab(0);
		unregister();

		expect(logError).toHaveBeenCalledWith('EDITOR', expect.any(String), expect.any(Error));
		expect(ask).toHaveBeenCalledTimes(1);
		expect(vi.mocked(writeTextFile).mock.calls).toEqual([['/vault/board.canvas', 'modified']]);
		expect(editorStore.tabs).toHaveLength(0);
		consoleSpy.mockRestore();
	});

	it('does not cancel pending saves for other tabs when closing', async () => {
		addTab('/vault/a.md', 'original-a');
		editorStore.setActiveIndex(0);
		editorStore.updateContent('modified-a');
		addTab('/vault/b.md', 'clean');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		// Trigger a debounced save for tab a
		onContentChange('modified-a');

		// Close clean tab b — should NOT cancel tab a's pending save
		await closeTab(1);

		// Tab a's save should still complete
		await vi.waitFor(() => {
			expect(writeTextFile).toHaveBeenCalledWith('/vault/a.md', 'modified-a');
		});
	});

	it('leaves the virtual tab active when the last file tab closes', async () => {
		editorStore.addTab({
			path: TASKS_VIRTUAL_PATH,
			name: 'Tasks',
			content: '',
			savedContent: '',
			fileType: 'tasks',
		});
		addTab('/vault/note.md', 'hello');

		await closeTab(1);

		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.activeTab?.path).toBe(TASKS_VIRTUAL_PATH);
	});

	it('closes virtual tab without dirty check even if content differs', async () => {
		editorStore.addTab({
			path: TASKS_VIRTUAL_PATH,
			name: 'Tasks',
			content: 'modified',
			savedContent: 'original',
			fileType: 'tasks',
		});
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(ask).mockResolvedValue(true);

		await closeTab(0);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(ask).not.toHaveBeenCalled();
		expect(editorStore.tabs).toHaveLength(0);
	});
});

describe('closeActiveTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('does nothing if no active tab', async () => {
		await closeActiveTab();

		expect(editorStore.tabs).toHaveLength(0);
	});

	it('closes the active tab', async () => {
		addTab('/vault/note.md', 'content');

		await closeActiveTab();

		expect(editorStore.tabs).toHaveLength(0);
		expect(editorStore.activeIndex).toBe(-1);
	});
});

describe('switchToNextTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		fsStore.reset();
	});

	it('does nothing with single tab', () => {
		addTab('/vault/a.md');

		switchToNextTab();

		expect(editorStore.activeIndex).toBe(0);
	});

	it('cycles to next tab', () => {
		addTab('/vault/a.md');
		addTab('/vault/b.md');
		editorStore.setActiveIndex(0);

		switchToNextTab();

		expect(editorStore.activeIndex).toBe(1);
	});

	it('wraps around from last to first', () => {
		addTab('/vault/a.md');
		addTab('/vault/b.md');
		// activeIndex is already 1 (last added)

		switchToNextTab();

		expect(editorStore.activeIndex).toBe(0);
	});
});

describe('switchToPreviousTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		fsStore.reset();
	});

	it('does nothing with single tab', () => {
		addTab('/vault/a.md');

		switchToPreviousTab();

		expect(editorStore.activeIndex).toBe(0);
	});

	it('wraps around from first to last', () => {
		addTab('/vault/a.md');
		addTab('/vault/b.md');
		editorStore.setActiveIndex(0);

		switchToPreviousTab();

		expect(editorStore.activeIndex).toBe(1);
	});
});

describe('togglePinTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('pins and unpins a tab', () => {
		addTab('/vault/note.md');
		expect(editorStore.tabs[0].pinned).toBe(false);

		togglePinTab(0);

		expect(editorStore.tabs[0].pinned).toBe(true);

		togglePinTab(0);

		expect(editorStore.tabs[0].pinned).toBe(false);
	});
});

describe('toggleSourceMode', () => {
	beforeEach(() => {
		editorStore.reset();
	});

	it('flips editorStore.isLivePreview from true to false and back', () => {
		// Default: live preview ON
		expect(editorStore.isLivePreview).toBe(true);
		toggleSourceMode();
		expect(editorStore.isLivePreview).toBe(false);
		toggleSourceMode();
		expect(editorStore.isLivePreview).toBe(true);
	});
});

describe('togglePinActiveTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('toggles pin on active tab', () => {
		addTab('/vault/a.md');
		addTab('/vault/b.md');
		editorStore.setActiveIndex(1);

		togglePinActiveTab();

		// After pinning, the tab moves to the pinned area (index 0)
		expect(editorStore.tabs[0].path).toBe('/vault/b.md');
		expect(editorStore.tabs[0].pinned).toBe(true);
	});

	it('does nothing if no active tab', () => {
		togglePinActiveTab();

		// No crash, no state change
		expect(editorStore.activeIndex).toBe(-1);
	});
});

describe('pinTabByPath', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('pins a tab found by path', () => {
		addTab('/vault/a.md');
		addTab('/vault/b.md');

		pinTabByPath('/vault/b.md');

		// b.md should now be pinned and moved to index 0
		expect(editorStore.tabs[0].path).toBe('/vault/b.md');
		expect(editorStore.tabs[0].pinned).toBe(true);
	});

	it('does nothing if tab not found', () => {
		addTab('/vault/a.md');

		pinTabByPath('/vault/missing.md');

		expect(editorStore.tabs[0].pinned).toBe(false);
	});

	it('does nothing if tab already pinned', () => {
		addTab('/vault/a.md', '', { pinned: true });
		const tabsBefore = [...editorStore.tabs];

		pinTabByPath('/vault/a.md');

		// No reorder should happen
		expect(editorStore.tabs[0].path).toBe(tabsBefore[0].path);
	});
});

describe('unpinTabByPath', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('unpins a pinned tab found by path', () => {
		addTab('/vault/a.md', '', { pinned: true });

		unpinTabByPath('/vault/a.md');

		expect(editorStore.tabs[0].path).toBe('/vault/a.md');
		expect(editorStore.tabs[0].pinned).toBe(false);
	});

	it('does nothing if tab not found', () => {
		addTab('/vault/a.md', '', { pinned: true });

		unpinTabByPath('/vault/missing.md');

		expect(editorStore.tabs[0].pinned).toBe(true);
	});

	it('does nothing if tab is already unpinned', () => {
		addTab('/vault/a.md');

		unpinTabByPath('/vault/a.md');

		expect(editorStore.tabs[0].pinned).toBeFalsy();
	});
});

describe('closeTabsForDeletedPath', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		fsStore.reset();
	});

	it('closes a tab matching the deleted path', () => {
		addTab('/vault/a.md');
		addTab('/vault/b.md');

		closeTabsForDeletedPath('/vault/a.md');

		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.tabs[0].path).toBe('/vault/b.md');
	});

	it('tells tab-close listeners each path it closes', () => {
		const closed: string[] = [];
		const unregister = registerTabCloseListener('test', (path) => closed.push(path));
		addTab('/vault/folder/a.md');
		addTab('/vault/other.md');
		addTab('/vault/folder/b.md');

		closeTabsForDeletedPath('/vault/folder');
		unregister();

		expect(closed.sort()).toEqual(['/vault/folder/a.md', '/vault/folder/b.md']);
	});

	it('closes pinned tabs when file is deleted', () => {
		addTab('/vault/a.md', '', { pinned: true });

		closeTabsForDeletedPath('/vault/a.md');

		expect(editorStore.tabs).toHaveLength(0);
	});

	it('closes all child tabs when a folder is deleted', () => {
		addTab('/vault/folder/a.md');
		addTab('/vault/other.md');
		addTab('/vault/folder/sub/b.md');

		closeTabsForDeletedPath('/vault/folder');

		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.tabs[0].path).toBe('/vault/other.md');
	});

	it('returns the removed tabs in tab order, with their buffers and pinned flag', () => {
		addTab('/vault/folder/a.md', 'a body', { pinned: true });
		addTab('/vault/other.md');
		addTab('/vault/folder/sub/b.md', 'b body');
		editorStore.updateContent('b body edited');

		const removed = closeTabsForDeletedPath('/vault/folder');

		expect(removed.map((t) => t.path)).toEqual(['/vault/folder/a.md', '/vault/folder/sub/b.md']);
		expect(removed[0].pinned).toBe(true);
		expect(removed[1].content).toBe('b body edited');
		expect(removed[1].savedContent).toBe('b body');
	});

	it('does nothing if no tabs match', () => {
		addTab('/vault/a.md');

		const removed = closeTabsForDeletedPath('/vault/missing.md');

		expect(editorStore.tabs).toHaveLength(1);
		expect(removed).toEqual([]);
	});

	it('activates the remaining tab after closing', () => {
		addTab('/vault/a.md');
		addTab('/vault/b.md');
		editorStore.setActiveIndex(0);

		closeTabsForDeletedPath('/vault/a.md');

		expect(editorStore.activeTab?.path).toBe('/vault/b.md');
	});

	it('leaves the virtual tab active when the last file tab is deleted', () => {
		editorStore.addTab({
			path: TASKS_VIRTUAL_PATH,
			name: 'Tasks',
			content: '',
			savedContent: '',
			fileType: 'tasks',
		});
		addTab('/vault/note.md');

		closeTabsForDeletedPath('/vault/note.md');

		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.activeTab?.path).toBe(TASKS_VIRTUAL_PATH);
	});
});

describe('resetEditor', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('resets all editor state', () => {
		addTab('/vault/note.md', 'content');
		editorStore.setLivePreview(false);

		resetEditor();

		expect(editorStore.tabs).toHaveLength(0);
		expect(editorStore.activeIndex).toBe(-1);
		expect(editorStore.isLivePreview).toBe(true);
	});

	it('cancels pending auto-saves instead of flushing (callers must save first)', () => {
		addTab('/vault/a.md', 'original');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		// Simulate user typing (sets up the debounce, which fires immediately in mock)
		onContentChange('modified');
		vi.clearAllMocks();

		// Make tab dirty again (simulating more typing after the auto-save)
		editorStore.setActiveIndex(0);
		editorStore.updateContent('modified-v2');

		// resetEditor should cancel (not flush) — callers like teardownVault
		// already await saveAllDirtyTabs() before calling resetEditor
		resetEditor();

		// Verify no save was triggered during reset (cancel, not flush)
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs).toHaveLength(0);
	});
});

describe('editor hooks integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		fsStore.reset();
		resetHooks();
	});

	it('saveCurrentFile calls notifyAfterSave after successful save', async () => {
		addTab('/vault/note.md', 'original');
		editorStore.updateContent('modified');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		const observer = vi.fn();
		addAfterSaveObserver(observer);

		await saveCurrentFile();

		expect(observer).toHaveBeenCalledWith('/vault/note.md', 'modified');
		expect(editorStore.activeTab?.savedContent).toBe('modified');
	});

	it('saveFileByPath calls notifyAfterSave after successful save', async () => {
		addTab('/vault/note.md', 'original');
		editorStore.updateContent('modified');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		const observer = vi.fn();
		addAfterSaveObserver(observer);

		await saveFileByPath('/vault/note.md');

		expect(observer).toHaveBeenCalledWith('/vault/note.md', 'modified');
	});

	it('saveCurrentFile does NOT call notifyAfterSave when write fails', async () => {
		addTab('/vault/note.md', 'original');
		editorStore.updateContent('modified');
		vi.mocked(writeTextFile).mockRejectedValue(new Error('disk full'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const observer = vi.fn();
		addAfterSaveObserver(observer);

		await saveCurrentFile();

		expect(observer).not.toHaveBeenCalled();
		expect(editorStore.activeTab?.savedContent).toBe('original');
		consoleSpy.mockRestore();
	});
});

describe('state transitions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		fsStore.reset();
	});

	it('open file A → open file B → two tabs, B active', async () => {
		vi.mocked(readTextFile).mockResolvedValueOnce('content A');
		await openFileInEditor('/vault/a.md');

		vi.mocked(readTextFile).mockResolvedValueOnce('content B');
		await openFileInEditor('/vault/b.md');

		expect(editorStore.tabs).toHaveLength(2);
		expect(editorStore.activeTab?.path).toBe('/vault/b.md');
		expect(editorStore.activeTabContent).toBe('content B');
	});

	it('open → edit → save → savedContent matches', async () => {
		vi.mocked(readTextFile).mockResolvedValue('original');
		await openFileInEditor('/vault/note.md');
		expect(editorStore.activeTab?.savedContent).toBe('original');

		editorStore.updateContent('modified');
		expect(editorStore.activeTab?.content).toBe('modified');
		expect(editorStore.activeTab?.savedContent).toBe('original');

		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		await saveCurrentFile();

		expect(editorStore.activeTab?.savedContent).toBe('modified');
	});

	it('open → close → no tabs', async () => {
		vi.mocked(readTextFile).mockResolvedValue('content');
		await openFileInEditor('/vault/note.md');
		expect(editorStore.tabs).toHaveLength(1);

		await closeTab(0);

		expect(editorStore.tabs).toHaveLength(0);
		expect(editorStore.activeIndex).toBe(-1);
	});
});

describe('reloadExternallyChangedTabs', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		fsStore.reset();
		resetHooks();
	});

	it('silently reloads a clean tab when file changed externally', async () => {
		addTab('/vault/note.md', 'original');
		vi.mocked(readTextFile).mockResolvedValueOnce('external edit');

		await reloadExternallyChangedTabs(['/vault/note.md']);

		expect(editorStore.tabs[0].content).toBe('external edit');
		expect(editorStore.tabs[0].savedContent).toBe('external edit');
	});

	it('skips tabs not in the changed paths', async () => {
		addTab('/vault/note.md', 'original');

		await reloadExternallyChangedTabs(['/vault/other.md']);

		expect(editorStore.tabs[0].content).toBe('original');
		expect(readTextFile).not.toHaveBeenCalled();
	});

	it('skips when disk content matches savedContent (no external change)', async () => {
		addTab('/vault/note.md', 'same');
		vi.mocked(readTextFile).mockResolvedValueOnce('same');

		await reloadExternallyChangedTabs(['/vault/note.md']);

		// Content should remain unchanged
		expect(editorStore.tabs[0].content).toBe('same');
	});

	it('skips self-saves (disk matches savedContent)', async () => {
		addTab('/vault/note.md', 'original');
		// Simulate editor just saved — disk has the same content as savedContent
		vi.mocked(readTextFile).mockResolvedValueOnce('original');

		await reloadExternallyChangedTabs(['/vault/note.md']);

		// Content should remain unchanged — no reload needed
		expect(editorStore.tabs[0].content).toBe('original');
	});

	it('skips virtual tabs', async () => {
		editorStore.addTab({
			path: '__virtual__/tasks',
			name: 'Tasks',
			content: '',
			savedContent: '',
			fileType: 'tasks',
		});

		await reloadExternallyChangedTabs(['__virtual__/tasks']);

		expect(readTextFile).not.toHaveBeenCalled();
	});

	it('skips dirty tabs — editor always wins over external changes', async () => {
		addTab('/vault/note.md', 'user edits', { savedContent: 'original' });

		await reloadExternallyChangedTabs(['/vault/note.md']);

		// Should not even read from disk — editor content is preserved
		expect(readTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs[0].content).toBe('user edits');
		expect(editorStore.tabs[0].savedContent).toBe('original');
	});

	it('handles read errors gracefully (file may be deleted)', async () => {
		addTab('/vault/note.md', 'original');
		vi.mocked(readTextFile).mockRejectedValueOnce(new Error('file not found'));

		await reloadExternallyChangedTabs(['/vault/note.md']);

		// Tab should remain unchanged
		expect(editorStore.tabs[0].content).toBe('original');
	});

	it('keeps keystrokes typed while the read was in flight', async () => {
		addTab('/vault/note.md', 'original');
		let resolveRead!: (content: string) => void;
		vi.mocked(readTextFile).mockReturnValueOnce(new Promise<string>((r) => (resolveRead = r)));

		const reload = reloadExternallyChangedTabs(['/vault/note.md']);
		editorStore.updateContent('typed during the read');
		resolveRead('external edit');
		await reload;

		expect(editorStore.tabs[0].content).toBe('typed during the read');
		expect(editorStore.tabs[0].savedContent).toBe('original');
	});

	it('reloads multiple tabs in a single call', async () => {
		addTab('/vault/a.md', 'old A');
		addTab('/vault/b.md', 'old B');
		vi.mocked(readTextFile)
			.mockResolvedValueOnce('new A')
			.mockResolvedValueOnce('new B');

		await reloadExternallyChangedTabs(['/vault/a.md', '/vault/b.md']);

		expect(editorStore.tabs[0].content).toBe('new A');
		expect(editorStore.tabs[1].content).toBe('new B');
	});
});

describe('syncExternalContentToEditor (Phase 5)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetEditor();
	});

	it('updates content + savedContent and bumps signal when path is the active tab', () => {
		addTab('/vault/a.md', 'old');
		const before = editorStore.externalContentSignal;

		syncExternalContentToEditor('/vault/a.md', 'new', true, 'none');

		expect(editorStore.tabs[0].content).toBe('new');
		expect(editorStore.tabs[0].savedContent).toBe('new');
		expect(editorStore.externalContentSignal).toBe(before + 1);
	});

	it('updates content but NOT savedContent when markSaved=false (dirty-aware)', () => {
		addTab('/vault/a.md', 'old');
		const tab = editorStore.tabs[0];
		expect(tab.savedContent).toBe('old');
		const before = editorStore.externalContentSignal;

		syncExternalContentToEditor('/vault/a.md', 'edited', false, 'none');

		expect(editorStore.tabs[0].content).toBe('edited');
		expect(editorStore.tabs[0].savedContent).toBe('old');
		expect(editorStore.externalContentSignal).toBe(before + 1);
	});

	it('does NOT bump signal when path is NOT the active tab (CM does not need a refresh)', () => {
		addTab('/vault/a.md', 'a content');
		addTab('/vault/b.md', 'b content');
		// b.md is now active (last added)
		const before = editorStore.externalContentSignal;

		syncExternalContentToEditor('/vault/a.md', 'a updated', true, 'none');

		// Signal NOT bumped — a.md is in the background
		expect(editorStore.externalContentSignal).toBe(before);
		// But the non-active tab's content + savedContent ARE updated
		expect(editorStore.tabs[0].content).toBe('a updated');
		expect(editorStore.tabs[0].savedContent).toBe('a updated');
	});

	it('returns silently when the path does not match any open tab', () => {
		addTab('/vault/a.md', 'a content');
		const before = editorStore.externalContentSignal;

		syncExternalContentToEditor('/vault/missing.md', 'whatever', true, 'none');

		expect(editorStore.externalContentSignal).toBe(before);
		expect(editorStore.tabs[0].content).toBe('a content');
	});

	it('multiple sequential bumps on the active tab produce monotonically increasing signal', () => {
		addTab('/vault/a.md', 'v0');
		const start = editorStore.externalContentSignal;

		syncExternalContentToEditor('/vault/a.md', 'v1', true, 'none');
		syncExternalContentToEditor('/vault/a.md', 'v2', true, 'none');
		syncExternalContentToEditor('/vault/a.md', 'v3', false, 'none');

		expect(editorStore.externalContentSignal).toBe(start + 3);
		expect(editorStore.tabs[0].content).toBe('v3');
		expect(editorStore.tabs[0].savedContent).toBe('v2'); // last markSaved=true write
	});
});
