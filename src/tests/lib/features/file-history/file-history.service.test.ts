import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(),
	readDir: vi.fn(),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	saveCurrentFile: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/core/editor/editor.hooks', () => ({
	addAfterSaveObserver: vi.fn(() => vi.fn()),
}));

import { invoke } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile, mkdir, exists, readDir } from '@tauri-apps/plugin-fs';
import { saveCurrentFile } from '$lib/core/editor/editor.service';
import { addAfterSaveObserver } from '$lib/core/editor/editor.hooks';
import { fileHistoryStore } from '$lib/features/file-history/file-history.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import {
	openFileHistory,
	selectSnapshot,
	restoreSnapshot,
	saveSnapshotForFile,
	closeFileHistory,
	registerFileHistoryHook,
	loadBackupTimestamps,
} from '$lib/features/file-history/file-history.service';
import type { SnapshotInfo, DiffLine } from '$lib/features/file-history/file-history.types';

describe('openFileHistory', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		fileHistoryStore.reset();
		editorStore.reset();
		vaultStore._reset();
		vaultStore.open('/test-vault');
	});

	it('loads snapshots and auto-selects the first one', async () => {
		const snapshots: SnapshotInfo[] = [
			{ id: 2, timestamp: 2000, size: 200 },
			{ id: 1, timestamp: 1000, size: 100 },
		];
		const diffLines: DiffLine[] = [
			{ type: 'equal', content: 'hello', oldLineNum: 1, newLineNum: 1 },
		];
		vi.mocked(readTextFile).mockResolvedValue('current content');
		vi.mocked(invoke)
			.mockResolvedValueOnce(snapshots)        // get_file_history
			.mockResolvedValueOnce('snapshot text')   // get_snapshot_content
			.mockResolvedValueOnce(diffLines);        // compute_diff

		await openFileHistory('/test-vault/notes/file.md');

		expect(fileHistoryStore.isOpen).toBe(true);
		expect(fileHistoryStore.filePath).toBe('/test-vault/notes/file.md');
		expect(fileHistoryStore.snapshots).toEqual(snapshots);
		expect(fileHistoryStore.currentContent).toBe('current content');
		expect(fileHistoryStore.selectedSnapshot).toEqual(snapshots[0]);
		expect(fileHistoryStore.isLoading).toBe(false);
		expect(fileHistoryStore.isLoadingDiff).toBe(false);
	});

	it('passes relative path to Rust command', async () => {
		vi.mocked(readTextFile).mockResolvedValue('content');
		vi.mocked(invoke).mockResolvedValue([]);

		await openFileHistory('/test-vault/deep/path/note.md');

		expect(invoke).toHaveBeenCalledWith('get_file_history', { filePath: 'deep/path/note.md' });
	});

	it('does nothing when no vault is open', async () => {
		vaultStore.close();

		await openFileHistory('/some/file.md');

		expect(fileHistoryStore.isOpen).toBe(false);
		expect(invoke).not.toHaveBeenCalled();
	});

	it('handles empty snapshot list without selecting', async () => {
		vi.mocked(readTextFile).mockResolvedValue('content');
		vi.mocked(invoke).mockResolvedValue([]);

		await openFileHistory('/test-vault/file.md');

		expect(fileHistoryStore.snapshots).toEqual([]);
		expect(fileHistoryStore.selectedSnapshot).toBeNull();
		expect(fileHistoryStore.isLoading).toBe(false);
	});

	it('sets loading false on error', async () => {
		vi.mocked(readTextFile).mockRejectedValue(new Error('File not found'));

		await openFileHistory('/test-vault/file.md');

		expect(fileHistoryStore.isLoading).toBe(false);
	});
});

describe('selectSnapshot', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileHistoryStore.reset();
		fileHistoryStore.setCurrentContent('new content');
	});

	it('loads snapshot content and computes diff', async () => {
		const snapshot: SnapshotInfo = { id: 5, timestamp: 5000, size: 50 };
		const diffLines: DiffLine[] = [
			{ type: 'delete', content: 'old line', oldLineNum: 1 },
			{ type: 'insert', content: 'new line', newLineNum: 1 },
		];
		vi.mocked(invoke)
			.mockResolvedValueOnce('old content')     // get_snapshot_content
			.mockResolvedValueOnce(diffLines);         // compute_diff

		await selectSnapshot(snapshot);

		expect(fileHistoryStore.selectedSnapshot).toEqual(snapshot);
		expect(fileHistoryStore.diffLines).toEqual(diffLines);
		expect(fileHistoryStore.isLoadingDiff).toBe(false);
		expect(invoke).toHaveBeenCalledWith('get_snapshot_content', { snapshotId: 5 });
		expect(invoke).toHaveBeenCalledWith('compute_diff', {
			oldContent: 'old content',
			newContent: 'new content',
		});
	});

	it('sets loadingDiff false on error', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('DB error'));

		await selectSnapshot({ id: 1, timestamp: 1000, size: 10 });

		expect(fileHistoryStore.isLoadingDiff).toBe(false);
	});
});

describe('restoreSnapshot', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fileHistoryStore.reset();
		editorStore.reset();
	});

	it('dispatches to CodeMirror and saves through editor', async () => {
		fileHistoryStore.setFilePath('/vault/file.md');
		fileHistoryStore.setOpen(true);
		const mockDispatch = vi.fn();
		editorStore.setEditorView({
			dispatch: mockDispatch,
			state: { doc: { length: 20 } },
		} as any);
		vi.mocked(invoke).mockResolvedValue('restored content');

		await restoreSnapshot(42);

		expect(invoke).toHaveBeenCalledWith('get_snapshot_content', { snapshotId: 42 });
		expect(mockDispatch).toHaveBeenCalledWith({
			changes: { from: 0, to: 20, insert: 'restored content' },
		});
		expect(saveCurrentFile).toHaveBeenCalled();
		expect(fileHistoryStore.isOpen).toBe(false);
		expect(fileHistoryStore.filePath).toBeNull();
	});

	it('skips dispatch when no editor view is available', async () => {
		fileHistoryStore.setFilePath('/vault/file.md');
		vi.mocked(invoke).mockResolvedValue('restored content');

		await restoreSnapshot(1);

		expect(saveCurrentFile).toHaveBeenCalled();
		expect(fileHistoryStore.isOpen).toBe(false);
		expect(fileHistoryStore.filePath).toBeNull();
	});

	it('does nothing when filePath is null', async () => {
		vi.mocked(invoke).mockResolvedValue('content');

		await restoreSnapshot(1);

		expect(saveCurrentFile).not.toHaveBeenCalled();
	});
});

describe('saveSnapshotForFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/my-vault');
		settingsStore.reset();
	});

	it('invokes Rust with relative path', async () => {
		vi.mocked(invoke).mockResolvedValue(true);

		await saveSnapshotForFile('/my-vault/notes/test.md', 'file content');

		expect(invoke).toHaveBeenCalledWith('save_snapshot', {
			filePath: 'notes/test.md',
			content: 'file content',
		});
	});

	it('does nothing when no vault is open', async () => {
		vaultStore.close();

		await saveSnapshotForFile('/some/file.md', 'content');

		expect(invoke).not.toHaveBeenCalled();
	});
});

describe('closeFileHistory', () => {
	it('resets store to initial state', () => {
		fileHistoryStore.setOpen(true);
		fileHistoryStore.setFilePath('/vault/file.md');
		fileHistoryStore.setSnapshots([{ id: 1, timestamp: 1000, size: 100 }]);

		closeFileHistory();

		expect(fileHistoryStore.isOpen).toBe(false);
		expect(fileHistoryStore.filePath).toBeNull();
		expect(fileHistoryStore.snapshots).toEqual([]);
	});
});

describe('registerFileHistoryHook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
	});

	it('registers an after-save observer and returns unsubscribe', () => {
		const unsub = registerFileHistoryHook();

		expect(addAfterSaveObserver).toHaveBeenCalledWith(expect.any(Function));
		expect(typeof unsub).toBe('function');
	});

	it('observer calls saveSnapshotForFile on save', async () => {
		vi.mocked(invoke).mockResolvedValue(true);
		let capturedObserver: ((filePath: string, content: string) => void) | null = null;
		vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
			capturedObserver = observer;
			return vi.fn();
		});

		registerFileHistoryHook();
		expect(capturedObserver).not.toBeNull();

		capturedObserver!('/vault/note.md', 'saved content');

		// Flush the fire-and-forget promise chain
		await new Promise((r) => setTimeout(r, 0));

		expect(invoke).toHaveBeenCalledWith('save_snapshot', {
			filePath: 'note.md',
			content: 'saved content',
		});
	});

	it('returns an unsubscribe function', () => {
		const unsubscribe = vi.fn();
		vi.mocked(addAfterSaveObserver).mockReturnValue(unsubscribe);

		const result = registerFileHistoryHook();

		expect(result).toBe(unsubscribe);
	});
});

describe('saveSnapshotForFile - backup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/my-vault');
		settingsStore.reset();
	});

	it('writes backup file when snapshotBackupEnabled is true and snapshot is new', async () => {
		settingsStore.updateHistory({ snapshotBackupEnabled: true });
		vi.mocked(invoke).mockResolvedValue(true);
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(mkdir).mockResolvedValue(undefined as never);
		vi.mocked(writeTextFile).mockResolvedValue(undefined as never);

		await saveSnapshotForFile('/my-vault/notes/test.md', 'file content');

		expect(mkdir).toHaveBeenCalledWith(
			'/my-vault/.kokobrain/snapshots-backup/notes/test.md',
			{ recursive: true },
		);
		expect(writeTextFile).toHaveBeenCalledWith(
			expect.stringContaining('.kokobrain/snapshots-backup/notes/test.md/'),
			'file content',
		);
	});

	it('skips mkdir when backup directory already exists', async () => {
		settingsStore.updateHistory({ snapshotBackupEnabled: true });
		vi.mocked(invoke).mockResolvedValue(true);
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined as never);

		await saveSnapshotForFile('/my-vault/notes/test.md', 'content');

		expect(mkdir).not.toHaveBeenCalled();
		expect(writeTextFile).toHaveBeenCalled();
	});

	it('skips backup when snapshotBackupEnabled is false', async () => {
		vi.mocked(invoke).mockResolvedValue(true);

		await saveSnapshotForFile('/my-vault/notes/test.md', 'content');

		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('skips backup when content is unchanged (saved=false)', async () => {
		settingsStore.updateHistory({ snapshotBackupEnabled: true });
		vi.mocked(invoke).mockResolvedValue(false);

		await saveSnapshotForFile('/my-vault/notes/test.md', 'content');

		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('does not throw when backup fails', async () => {
		settingsStore.updateHistory({ snapshotBackupEnabled: true });
		vi.mocked(invoke).mockResolvedValue(true);
		vi.mocked(exists).mockRejectedValue(new Error('Permission denied'));

		await expect(
			saveSnapshotForFile('/my-vault/notes/test.md', 'content'),
		).resolves.toBeUndefined();
	});
});

describe('loadBackupTimestamps', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
	});

	it('returns timestamps from backup directory', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readDir).mockResolvedValue([
			{ name: '1708185600000.md', isDirectory: false, isFile: true, isSymlink: false },
			{ name: '1708272000000.md', isDirectory: false, isFile: true, isSymlink: false },
		] as never);

		const result = await loadBackupTimestamps('/vault/notes/file.md');

		expect(result).toEqual(new Set([1708185600000, 1708272000000]));
	});

	it('returns empty set when directory does not exist', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		const result = await loadBackupTimestamps('/vault/notes/file.md');

		expect(result).toEqual(new Set());
	});

	it('returns empty set when no vault is open', async () => {
		vaultStore.close();

		const result = await loadBackupTimestamps('/vault/file.md');

		expect(result).toEqual(new Set());
	});

	it('ignores non-.md files in backup directory', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readDir).mockResolvedValue([
			{ name: '1708185600000.md', isDirectory: false, isFile: true, isSymlink: false },
			{ name: '.DS_Store', isDirectory: false, isFile: true, isSymlink: false },
		] as never);

		const result = await loadBackupTimestamps('/vault/file.md');

		expect(result).toEqual(new Set([1708185600000]));
	});

	it('returns empty set on error', async () => {
		vi.mocked(exists).mockRejectedValue(new Error('FS error'));

		const result = await loadBackupTimestamps('/vault/file.md');

		expect(result).toEqual(new Set());
	});
});
