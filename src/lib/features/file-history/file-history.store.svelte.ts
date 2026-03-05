import type { SnapshotInfo, DiffLine } from './file-history.types';

// --- Reactive state (Svelte 5 runes) ---

/** Whether the file history dialog is open */
let isOpen = $state(false);
/** Absolute path of the file being inspected */
let filePath = $state<string | null>(null);
/** All snapshots for the current file, sorted newest first */
let snapshots = $state<SnapshotInfo[]>([]);
/** The currently selected snapshot in the list */
let selectedSnapshot = $state<SnapshotInfo | null>(null);
/** Diff lines between the selected snapshot and current file content */
let diffLines = $state<DiffLine[]>([]);
/** Loading state for the snapshot list */
let isLoading = $state(false);
/** Loading state for the diff computation */
let isLoadingDiff = $state(false);
/** The current (live) content of the file, used as the "new" side of the diff */
let currentContent = $state('');
/** Set of timestamps that have a corresponding backup file on disk */
let backedUpTimestamps = $state<Set<number>>(new Set());

/**
 * Reactive store for file history dialog state.
 * Manages snapshots, diffs, and dialog visibility.
 */
export const fileHistoryStore = {
	get isOpen() { return isOpen; },
	get filePath() { return filePath; },
	get snapshots() { return snapshots; },
	get selectedSnapshot() { return selectedSnapshot; },
	get diffLines() { return diffLines; },
	get isLoading() { return isLoading; },
	get isLoadingDiff() { return isLoadingDiff; },
	get currentContent() { return currentContent; },
	get backedUpTimestamps() { return backedUpTimestamps; },

	setOpen(value: boolean) { isOpen = value; },
	setFilePath(value: string | null) { filePath = value; },
	setSnapshots(value: SnapshotInfo[]) { snapshots = value; },
	setSelectedSnapshot(value: SnapshotInfo | null) { selectedSnapshot = value; },
	setDiffLines(value: DiffLine[]) { diffLines = value; },
	setLoading(value: boolean) { isLoading = value; },
	setLoadingDiff(value: boolean) { isLoadingDiff = value; },
	setCurrentContent(value: string) { currentContent = value; },
	setBackedUpTimestamps(value: Set<number>) { backedUpTimestamps = value; },

	/** Resets all state to initial values */
	reset() {
		isOpen = false;
		filePath = null;
		snapshots = [];
		selectedSnapshot = null;
		diffLines = [];
		isLoading = false;
		isLoadingDiff = false;
		currentContent = '';
		backedUpTimestamps = new Set();
	},
};
