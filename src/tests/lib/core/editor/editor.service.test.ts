import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
	perfStart: vi.fn(() => 0),
	perfEnd: vi.fn(),
}));

vi.mock('$lib/utils/debounce', () => ({
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
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { TASKS_VIRTUAL_PATH } from '$lib/core/editor/editor.logic';
import { setFileReadTransform, setFileWriteTransform, addAfterSaveObserver, resetHooks } from '$lib/core/editor/editor.hooks';
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
	closeTabsForDeletedPath,
	flushPendingSaves,
	saveAllDirtyTabs,
} from '$lib/core/editor/editor.service';

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
		expect(fsStore.selectedFilePath).toBe('/vault/note.md');
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
		expect(fsStore.selectedFilePath).toBe('/vault/new.md');
	});

	it('sets fileType to collection for .collection files', async () => {
		vi.mocked(readTextFile).mockResolvedValue('views:\n  - type: table');

		await openFileInEditor('/vault/test.collection');

		expect(editorStore.activeTab?.fileType).toBe('collection');
	});

	it('handles read errors gracefully', async () => {
		vi.mocked(readTextFile).mockRejectedValue(new Error('read error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await openFileInEditor('/vault/missing.md');

		expect(editorStore.tabs).toHaveLength(0);
		consoleSpy.mockRestore();
	});

	it('silently handles canceled Touch ID (no toast)', async () => {
		vi.mocked(readTextFile).mockResolvedValue('content');
		setFileReadTransform(async () => { throw new Error('canceled'); });

		await openFileInEditor('/vault/secret.md');

		expect(editorStore.tabs).toHaveLength(0);
		expect(toast.error).not.toHaveBeenCalled();
		setFileReadTransform(null);
	});

	it('shows recovery guidance for no-encryption-key error', async () => {
		vi.mocked(readTextFile).mockResolvedValue('content');
		setFileReadTransform(async () => { throw new Error('no-encryption-key'); });

		await openFileInEditor('/vault/secret.md');

		expect(editorStore.tabs).toHaveLength(0);
		expect(toast.error).toHaveBeenCalledWith(
			expect.stringContaining('No encryption key found'),
		);
		setFileReadTransform(null);
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

describe('flushPendingSaves', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('triggers immediate save of all dirty tabs', async () => {
		addTab('/vault/a.md', 'original-a');
		editorStore.setActiveIndex(0);
		editorStore.updateContent('modified-a');
		addTab('/vault/b.md', 'original-b');
		editorStore.updateContent('modified-b');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		flushPendingSaves();

		await vi.waitFor(() => {
			expect(writeTextFile).toHaveBeenCalledWith('/vault/a.md', 'modified-a');
			expect(writeTextFile).toHaveBeenCalledWith('/vault/b.md', 'modified-b');
		});
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

	it('sets active index and syncs file explorer', () => {
		addTab('/vault/a.md');
		addTab('/vault/b.md');

		switchTab(0);

		expect(editorStore.activeIndex).toBe(0);
		expect(fsStore.selectedFilePath).toBe('/vault/a.md');
	});

	it('does not sync file explorer for virtual tab', () => {
		addTab('/vault/a.md');
		editorStore.addTab({
			path: TASKS_VIRTUAL_PATH,
			name: 'Tasks',
			content: '',
			savedContent: '',
			fileType: 'tasks',
		});
		fsStore.setSelectedFilePath('/vault/a.md');

		switchTab(1);

		expect(editorStore.activeIndex).toBe(1);
		expect(fsStore.selectedFilePath).toBe('/vault/a.md');
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

	it('closes a clean tab directly', async () => {
		addTab('/vault/note.md', 'hello');

		await closeTab(0);

		expect(ask).not.toHaveBeenCalled();
		expect(editorStore.tabs).toHaveLength(0);
		expect(editorStore.activeIndex).toBe(-1);
	});

	it('prompts for dirty tab and closes on confirm', async () => {
		addTab('/vault/note.md', 'original');
		editorStore.updateContent('modified');
		vi.mocked(ask).mockResolvedValue(true);

		await closeTab(0);

		expect(ask).toHaveBeenCalled();
		expect(editorStore.tabs).toHaveLength(0);
	});

	it('does not close dirty tab when user cancels', async () => {
		addTab('/vault/note.md', 'original');
		editorStore.updateContent('modified');
		vi.mocked(ask).mockResolvedValue(false);

		await closeTab(0);

		expect(ask).toHaveBeenCalled();
		expect(editorStore.tabs).toHaveLength(1);
	});

	it('does not close a pinned tab', async () => {
		addTab('/vault/note.md', 'hello', { pinned: true });

		await closeTab(0);

		expect(editorStore.tabs).toHaveLength(1);
	});

	it('closes an unpinned tab normally', async () => {
		addTab('/vault/note.md', 'hello', { pinned: false });

		await closeTab(0);

		expect(editorStore.tabs).toHaveLength(0);
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

	it('sets selectedFilePath to null when remaining active tab is virtual', async () => {
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
		expect(fsStore.selectedFilePath).toBeNull();
	});

	it('closes virtual tab without dirty check even if content differs', async () => {
		editorStore.addTab({
			path: TASKS_VIRTUAL_PATH,
			name: 'Tasks',
			content: 'modified',
			savedContent: 'original',
			fileType: 'tasks',
		});

		await closeTab(0);

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

	it('does nothing if no tabs match', () => {
		addTab('/vault/a.md');

		closeTabsForDeletedPath('/vault/missing.md');

		expect(editorStore.tabs).toHaveLength(1);
	});

	it('syncs file explorer selection after closing', () => {
		addTab('/vault/a.md');
		addTab('/vault/b.md');
		editorStore.setActiveIndex(0);

		closeTabsForDeletedPath('/vault/a.md');

		// After closing a.md, b.md becomes active and file explorer syncs
		expect(fsStore.selectedFilePath).toBe('/vault/b.md');
	});

	it('sets selectedFilePath to null when remaining active tab is virtual', () => {
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
		expect(fsStore.selectedFilePath).toBeNull();
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

	it('openFileInEditor uses transformed content when read hook applies', async () => {
		vi.mocked(readTextFile).mockResolvedValue('encrypted-blob');
		setFileReadTransform(async (_path, raw) => {
			if (raw === 'encrypted-blob') {
				return { content: 'decrypted content', tabProps: { encrypted: true } };
			}
			return null;
		});

		await openFileInEditor('/vault/secret.md');

		expect(editorStore.activeTab?.content).toBe('decrypted content');
		expect(editorStore.activeTab?.savedContent).toBe('decrypted content');
		expect(editorStore.activeTab?.encrypted).toBe(true);
	});

	it('openFileInEditor uses raw content when read hook returns null', async () => {
		vi.mocked(readTextFile).mockResolvedValue('plain content');
		setFileReadTransform(async () => null);

		await openFileInEditor('/vault/note.md');

		expect(editorStore.activeTab?.content).toBe('plain content');
		expect(editorStore.activeTab?.encrypted).toBeUndefined();
	});

	it('saveCurrentFile uses write hook when it returns true', async () => {
		addTab('/vault/note.md', 'original');
		editorStore.updateContent('modified');
		setFileWriteTransform(async () => true);

		await saveCurrentFile();

		// writeTextFile should NOT be called — hook handled it
		expect(writeTextFile).not.toHaveBeenCalled();
		// But savedContent should still be updated
		expect(editorStore.activeTab?.savedContent).toBe('modified');
	});

	it('saveCurrentFile falls back to writeTextFile when hook returns false', async () => {
		addTab('/vault/note.md', 'original');
		editorStore.updateContent('modified');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		setFileWriteTransform(async () => false);

		await saveCurrentFile();

		expect(writeTextFile).toHaveBeenCalledWith('/vault/note.md', 'modified');
		expect(editorStore.activeTab?.savedContent).toBe('modified');
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

	it('saveFileByPath uses write hook when it returns true', async () => {
		addTab('/vault/note.md', 'original');
		editorStore.updateContent('modified');
		setFileWriteTransform(async () => true);

		await saveFileByPath('/vault/note.md');

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs[0].savedContent).toBe('modified');
	});

	it('saveFileByPath falls back to writeTextFile when hook returns false', async () => {
		addTab('/vault/note.md', 'original');
		editorStore.updateContent('modified');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		setFileWriteTransform(async () => false);

		await saveFileByPath('/vault/note.md');

		expect(writeTextFile).toHaveBeenCalledWith('/vault/note.md', 'modified');
		expect(editorStore.tabs[0].savedContent).toBe('modified');
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
		expect(fsStore.selectedFilePath).toBeNull();
	});
});
