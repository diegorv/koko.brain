import { describe, it, expect, beforeEach } from 'vitest';
import { fileHistoryStore } from '$lib/features/file-history/file-history.store.svelte';
import type { SnapshotInfo, DiffLine } from '$lib/features/file-history/file-history.types';

const snapshot: SnapshotInfo = { id: 1, timestamp: 1700000000000, size: 256 };
const diffLine: DiffLine = { type: 'insert', content: 'new line', newLineNum: 1 };

describe('fileHistoryStore', () => {
	beforeEach(() => {
		fileHistoryStore.reset();
	});

	it('starts with default state', () => {
		expect(fileHistoryStore.isOpen).toBe(false);
		expect(fileHistoryStore.filePath).toBeNull();
		expect(fileHistoryStore.snapshots).toEqual([]);
		expect(fileHistoryStore.selectedSnapshot).toBeNull();
		expect(fileHistoryStore.diffLines).toEqual([]);
		expect(fileHistoryStore.isLoading).toBe(false);
		expect(fileHistoryStore.isLoadingDiff).toBe(false);
		expect(fileHistoryStore.currentContent).toBe('');
		expect(fileHistoryStore.backedUpTimestamps.size).toBe(0);
	});

	describe('setters update corresponding getters', () => {
		it('setOpen', () => {
			fileHistoryStore.setOpen(true);
			expect(fileHistoryStore.isOpen).toBe(true);
		});

		it('setFilePath', () => {
			fileHistoryStore.setFilePath('/vault/note.md');
			expect(fileHistoryStore.filePath).toBe('/vault/note.md');
		});

		it('setFilePath with null', () => {
			fileHistoryStore.setFilePath('/vault/note.md');
			fileHistoryStore.setFilePath(null);
			expect(fileHistoryStore.filePath).toBeNull();
		});

		it('setSnapshots', () => {
			fileHistoryStore.setSnapshots([snapshot]);
			expect(fileHistoryStore.snapshots).toEqual([snapshot]);
		});

		it('setSelectedSnapshot', () => {
			fileHistoryStore.setSelectedSnapshot(snapshot);
			expect(fileHistoryStore.selectedSnapshot).toBe(snapshot);
		});

		it('setSelectedSnapshot with null', () => {
			fileHistoryStore.setSelectedSnapshot(snapshot);
			fileHistoryStore.setSelectedSnapshot(null);
			expect(fileHistoryStore.selectedSnapshot).toBeNull();
		});

		it('setDiffLines', () => {
			fileHistoryStore.setDiffLines([diffLine]);
			expect(fileHistoryStore.diffLines).toEqual([diffLine]);
		});

		it('setLoading', () => {
			fileHistoryStore.setLoading(true);
			expect(fileHistoryStore.isLoading).toBe(true);
		});

		it('setLoadingDiff', () => {
			fileHistoryStore.setLoadingDiff(true);
			expect(fileHistoryStore.isLoadingDiff).toBe(true);
		});

		it('setCurrentContent', () => {
			fileHistoryStore.setCurrentContent('# Hello');
			expect(fileHistoryStore.currentContent).toBe('# Hello');
		});

		it('setBackedUpTimestamps', () => {
			const ts = new Set([1700000000000, 1700001000000]);
			fileHistoryStore.setBackedUpTimestamps(ts);
			expect(fileHistoryStore.backedUpTimestamps).toBe(ts);
			expect(fileHistoryStore.backedUpTimestamps.size).toBe(2);
		});
	});

	describe('reset', () => {
		it('restores all fields to defaults', () => {
			fileHistoryStore.setOpen(true);
			fileHistoryStore.setFilePath('/vault/note.md');
			fileHistoryStore.setSnapshots([snapshot]);
			fileHistoryStore.setSelectedSnapshot(snapshot);
			fileHistoryStore.setDiffLines([diffLine]);
			fileHistoryStore.setLoading(true);
			fileHistoryStore.setLoadingDiff(true);
			fileHistoryStore.setCurrentContent('content');
			fileHistoryStore.setBackedUpTimestamps(new Set([1]));

			fileHistoryStore.reset();

			expect(fileHistoryStore.isOpen).toBe(false);
			expect(fileHistoryStore.filePath).toBeNull();
			expect(fileHistoryStore.snapshots).toEqual([]);
			expect(fileHistoryStore.selectedSnapshot).toBeNull();
			expect(fileHistoryStore.diffLines).toEqual([]);
			expect(fileHistoryStore.isLoading).toBe(false);
			expect(fileHistoryStore.isLoadingDiff).toBe(false);
			expect(fileHistoryStore.currentContent).toBe('');
			expect(fileHistoryStore.backedUpTimestamps.size).toBe(0);
		});
	});
});
