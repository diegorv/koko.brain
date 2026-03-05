import { invoke } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile, mkdir, exists, readDir } from '@tauri-apps/plugin-fs';
import { fileHistoryStore } from './file-history.store.svelte';
import { getRelativePath, getSnapshotBackupDir, getSnapshotBackupPath } from './file-history.logic';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { addAfterSaveObserver } from '$lib/core/editor/editor.hooks';
import { saveCurrentFile } from '$lib/core/editor/editor.service';
import { debug, error } from '$lib/utils/debug';
import type { SnapshotInfo, DiffLine } from './file-history.types';

/**
 * Opens the file history dialog for a given file.
 * Loads snapshots from the database and auto-selects the first one.
 */
export async function openFileHistory(absoluteFilePath: string): Promise<void> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;

	debug('HISTORY', 'Opening file history for:', absoluteFilePath);
	fileHistoryStore.setFilePath(absoluteFilePath);
	fileHistoryStore.setOpen(true);
	fileHistoryStore.setLoading(true);

	try {
		const relativePath = getRelativePath(vaultPath, absoluteFilePath);
		const currentContent = await readTextFile(absoluteFilePath);
		fileHistoryStore.setCurrentContent(currentContent);

		const snapshots = await invoke<SnapshotInfo[]>('get_file_history', { filePath: relativePath });
		debug('HISTORY', `Loaded ${snapshots.length} snapshot(s) for:`, relativePath);
		fileHistoryStore.setSnapshots(snapshots);

		if (settingsStore.history.snapshotBackupEnabled) {
			const backedUp = await loadBackupTimestamps(absoluteFilePath);
			fileHistoryStore.setBackedUpTimestamps(backedUp);
		} else {
			fileHistoryStore.setBackedUpTimestamps(new Set());
		}

		fileHistoryStore.setLoading(false);

		if (snapshots.length > 0) {
			await selectSnapshot(snapshots[0]);
		}
	} catch (err) {
		error('HISTORY', 'Failed to load history:', err);
		fileHistoryStore.setLoading(false);
	}
}

/**
 * Selects a snapshot and computes the diff against current file content.
 */
export async function selectSnapshot(snapshot: SnapshotInfo): Promise<void> {
	debug('HISTORY', `Selecting snapshot id=${snapshot.id} timestamp=${snapshot.timestamp}`);
	fileHistoryStore.setSelectedSnapshot(snapshot);
	fileHistoryStore.setLoadingDiff(true);

	try {
		const snapshotContent = await invoke<string>('get_snapshot_content', { snapshotId: snapshot.id });
		const currentContent = fileHistoryStore.currentContent;

		const diffLines = await invoke<DiffLine[]>('compute_diff', {
			oldContent: snapshotContent,
			newContent: currentContent,
		});

		debug('HISTORY', `Diff computed: ${diffLines.length} line(s)`);
		fileHistoryStore.setDiffLines(diffLines);
	} catch (err) {
		error('HISTORY', 'Failed to compute diff:', err);
	} finally {
		fileHistoryStore.setLoadingDiff(false);
	}
}

/**
 * Restores a snapshot by replacing the editor content and saving through the normal save flow.
 * Goes through editor hooks for encryption safety — encrypted files are re-encrypted on save.
 */
export async function restoreSnapshot(snapshotId: number): Promise<void> {
	debug('HISTORY', `Restoring snapshot id=${snapshotId}`);
	const restoredContent = await invoke<string>('get_snapshot_content', { snapshotId });
	const filePath = fileHistoryStore.filePath;
	if (!filePath) return;

	// Dispatch to CodeMirror to replace content
	const view = editorStore.editorView;
	if (view) {
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: restoredContent },
		});
	}

	// Trigger a normal save — goes through write hooks for encryption safety
	debug('HISTORY', 'Saving restored content via normal save flow for:', filePath);
	await saveCurrentFile();
	fileHistoryStore.reset();
}

/**
 * Saves a snapshot for a file. Converts absolute path to vault-relative.
 * Fire-and-forget — errors should be caught by the caller.
 */
export async function saveSnapshotForFile(absoluteFilePath: string, content: string): Promise<void> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;

	const relativePath = getRelativePath(vaultPath, absoluteFilePath);
	debug('HISTORY', 'Saving snapshot for:', relativePath, `(${content.length} chars)`);
	const saved = await invoke<boolean>('save_snapshot', { filePath: relativePath, content });
	debug('HISTORY', saved ? 'Snapshot saved (new content)' : 'Snapshot skipped (content unchanged)');

	if (saved && settingsStore.history.snapshotBackupEnabled) {
		const timestamp = Date.now();
		await saveSnapshotBackup(vaultPath, absoluteFilePath, content, timestamp);
	}
}

/**
 * Writes a snapshot's content as a plain .md file to the backup directory.
 * Creates intermediate directories as needed. Fire-and-forget — errors are logged, not thrown.
 */
async function saveSnapshotBackup(
	vaultPath: string,
	absoluteFilePath: string,
	content: string,
	timestamp: number,
): Promise<void> {
	try {
		const backupDir = getSnapshotBackupDir(vaultPath, absoluteFilePath);
		const dirExists = await exists(backupDir);
		if (!dirExists) {
			await mkdir(backupDir, { recursive: true });
		}
		const backupPath = getSnapshotBackupPath(vaultPath, absoluteFilePath, timestamp);
		await writeTextFile(backupPath, content);
		debug('HISTORY', 'Snapshot backup saved:', backupPath);
	} catch (err) {
		error('HISTORY', 'Failed to save snapshot backup:', err);
	}
}

/**
 * Reads the backup directory for a file and returns the set of timestamps
 * that have backup files. Returns an empty set if the directory doesn't exist.
 */
export async function loadBackupTimestamps(absoluteFilePath: string): Promise<Set<number>> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return new Set();

	const backupDir = getSnapshotBackupDir(vaultPath, absoluteFilePath);
	try {
		const dirExists = await exists(backupDir);
		if (!dirExists) return new Set();

		const entries = await readDir(backupDir);
		const timestamps = new Set<number>();
		for (const entry of entries) {
			if (entry.name?.endsWith('.md')) {
				const ts = parseInt(entry.name.replace('.md', ''), 10);
				if (!isNaN(ts)) {
					timestamps.add(ts);
				}
			}
		}
		return timestamps;
	} catch (err) {
		error('HISTORY', 'Failed to load backup timestamps:', err);
		return new Set();
	}
}

/** Closes the file history dialog and resets all state. */
export function closeFileHistory(): void {
	fileHistoryStore.reset();
}

/**
 * Registers the file history after-save hook.
 * Automatically saves a snapshot every time a file is saved.
 * Returns an unsubscribe function.
 */
export function registerFileHistoryHook(): () => void {
	debug('HISTORY', 'Registering after-save hook for automatic snapshots');
	return addAfterSaveObserver((filePath, content) => {
		saveSnapshotForFile(filePath, content).catch((err) => {
			error('HISTORY', 'Failed to save snapshot:', err);
		});
	});
}
