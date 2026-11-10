import { call } from '#lib/contracts/ipc.js';
import type { TaskLineEdits, TaskLinesStale } from '#lib/contracts/index.js';
import { markRecentSave } from '#lib/core/editor/editor.hooks.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { addToTree } from '#lib/core/filesystem/fs.service.js';
import { applyNoteChange } from '#lib/core/filesystem/note-change.service.js';
import { settleTaskWrite } from '#lib/core/filesystem/task-write.service.js';
import { error } from '#lib/utils/debug.js';

/** What {@link writeTaskLinesToClosedNote} did. */
export type ClosedNoteWriteResult =
	/** The note was written; `content` is what it holds now. */
	| { kind: 'written'; content: string }
	/** The batch left the note as it was; `content` is what it holds. */
	| { kind: 'unchanged'; content: string }
	/** A check failed and nothing was written. */
	| { kind: 'stale'; stale: TaskLinesStale }
	/** The note has an open tab; it goes through the tab instead (`writeTaskLinesToNote`). */
	| { kind: 'open-tab' };

/**
 * Applies `edits` to a note that has no open tab, through the Rust guarded
 * writer `write_task_lines` (located by anchor and expected line, all or
 * nothing; todoist-bisync design rule 12), then settles it like any task
 * write (`settleTaskWrite`). A missing note is created first through
 * `create_note` with the `create` note-change source, so the explorer and the
 * per-file indexes see it, and the batch is sent again.
 *
 * Rust refuses a `vaultRoot` that is not the open vault; that and every other
 * command error is logged and rethrown.
 * @param vaultRoot - absolute root of the vault the caller believes is open
 * @param relPath - vault-relative path of the note
 * @param edits - the batch for this note
 */
export async function writeTaskLinesToClosedNote(
	vaultRoot: string,
	relPath: string,
	edits: TaskLineEdits,
): Promise<ClosedNoteWriteResult> {
	const path = `${vaultRoot}/${relPath}`;
	if (editorStore.tabs.some((t) => t.path === path)) return { kind: 'open-tab' };
	try {
		let result = await call('write_task_lines', { vaultRoot, relPath, edits });
		if (result.outcome === 'missing') {
			await createNoteFile(vaultRoot, path, '');
			result = await call('write_task_lines', { vaultRoot, relPath, edits });
		}
		switch (result.outcome) {
			case 'written':
				settleTaskWrite(path, result.content ?? '');
				return { kind: 'written', content: result.content ?? '' };
			case 'unchanged':
				return { kind: 'unchanged', content: result.content ?? '' };
			case 'stale':
				// Rust always sets `stale` with this outcome.
				return { kind: 'stale', stale: result.stale! };
			case 'missing':
				throw new Error(`${relPath} is still missing after it was created`);
		}
	} catch (err) {
		error('TODOIST-SYNC', `write_task_lines failed for ${relPath}:`, err);
		throw err;
	}
}

/**
 * Creates a note holding `content` the way the note creator does, minus
 * opening it: parent folders, `create_note` (which fails when the file
 * exists), then the `create` note-change source and the explorer tree.
 * @param vaultRoot - absolute root of the open vault
 * @param path - absolute path of the new Markdown note
 * @param content - the note's text
 */
export async function createNoteFile(vaultRoot: string, path: string, content: string): Promise<void> {
	await call('create_folder', { path: path.slice(0, path.lastIndexOf('/')) });
	await call('create_note', { path, content });
	markRecentSave(path);
	// `create_note` already indexed the note; Rust accepts only Markdown paths here.
	void applyNoteChange({ kind: 'upsert', source: 'create', path, content, vaultPath: vaultRoot });
	addToTree(path);
}
