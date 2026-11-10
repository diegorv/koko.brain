import { Transaction } from '@codemirror/state';
import { readTextFile } from '@tauri-apps/plugin-fs';
import type { TaskLineEdits, TaskLinesStale } from '#lib/contracts/index.js';
import { syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { docDiff } from '#lib/core/markdown-editor/doc-diff.logic.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { error } from '#lib/utils/debug.js';
import { writeTaskLinesToClosedNote } from './closed-note-writer.service.js';
import { applyTaskLineEdits } from './task-line-edits.logic.js';

/** What {@link writeTaskLinesToNote} did. */
export type NoteWriteResult =
	/** The note took the batch; `content` is what it holds now. */
	| { kind: 'written'; content: string }
	/** The batch left the note as it was; `content` is what it holds. */
	| { kind: 'unchanged'; content: string }
	/** A check failed and nothing changed. */
	| { kind: 'stale'; stale: TaskLinesStale };

/**
 * Applies `edits` to a note, guarded by anchor and expected line, all or
 * nothing (todoist-bisync design rule 12). Routes per note:
 * - a note with no tab: the Rust command, through `writeTaskLinesToClosedNote`;
 * - the active tab, when the CodeMirror view holds its text: one transaction
 *   on the live document, kept out of undo history; the editor's update
 *   listener puts it in the tab and arms the autosave;
 * - any other tab: the patched string through `syncExternalContentToEditor`,
 *   content only, so the tab is dirty and the autosave writes it.
 *
 * A tab is never saved or reloaded from here, and the open-tab paths read and
 * write the text in one synchronous step, so a keystroke typed while the
 * caller awaited is in the text the batch is checked against.
 *
 * Throws when `vaultRoot` is not the open vault, on a batch built wrong, and
 * on every command error of the closed-note path.
 * @param vaultRoot - absolute root of the vault the caller believes is open
 * @param relPath - vault-relative path of the note
 * @param edits - the batch for this note
 */
export async function writeTaskLinesToNote(
	vaultRoot: string,
	relPath: string,
	edits: TaskLineEdits,
): Promise<NoteWriteResult> {
	const path = `${vaultRoot}/${relPath}`;
	if (!editorStore.tabs.some((t) => t.path === path)) {
		const out = await writeTaskLinesToClosedNote(vaultRoot, relPath, edits);
		// The tab check above and the closed writer's own run in the same tick.
		if (out.kind === 'open-tab') throw new Error(`${relPath} got a tab while it was routed as closed`);
		return out;
	}
	try {
		return writeToOpenTab(vaultRoot, path, edits);
	} catch (err) {
		error('TODOIST-SYNC', `task-line write failed for open tab ${relPath}:`, err);
		throw err;
	}
}

/** The open-tab half of {@link writeTaskLinesToNote}; synchronous on purpose. */
function writeToOpenTab(vaultRoot: string, path: string, edits: TaskLineEdits): NoteWriteResult {
	if (vaultStore.path !== vaultRoot) throw new Error(`${vaultRoot} is not the open vault`);
	const tab = editorStore.tabs.find((t) => t.path === path)!;
	const current = tab.content;
	// The view is the active tab's only when it holds the tab's text: during a
	// tab switch it still holds the previous note, and a CRLF note's view text
	// differs from the tab's raw text. Both take the string path.
	const view = editorStore.activeTabPath === path ? editorStore.editorView : null;
	const onView = view !== null && view.state.doc.toString() === current;

	const out = applyTaskLineEdits(current, edits);
	if (out.kind === 'stale') return out;
	if (out.content === current) return { kind: 'unchanged', content: current };

	if (onView) {
		view.dispatch({
			changes: docDiff(current, out.content) ?? { from: 0, to: current.length, insert: out.content },
			annotations: Transaction.addToHistory.of(false),
		});
		return { kind: 'written', content: view.state.doc.toString() };
	}
	syncExternalContentToEditor(path, out.content, false, 'body');
	return { kind: 'written', content: out.content };
}

/**
 * The current text of a note for the sync's diff: the open tab's content
 * (unsaved edits included) when the note has a tab, else the file on disk.
 * A failed disk read is logged and rethrown.
 * @param vaultRoot - absolute root of the open vault
 * @param relPath - vault-relative path of the note
 */
export async function readNoteContent(vaultRoot: string, relPath: string): Promise<string> {
	const path = `${vaultRoot}/${relPath}`;
	const tab = editorStore.tabs.find((t) => t.path === path);
	if (tab) return tab.content;
	try {
		return await readTextFile(path);
	} catch (err) {
		error('TODOIST-SYNC', `reading ${relPath} failed:`, err);
		throw err;
	}
}
