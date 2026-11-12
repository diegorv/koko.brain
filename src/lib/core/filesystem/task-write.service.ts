import { syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { markRecentSave } from '#lib/core/editor/editor.hooks.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { applyNoteChange, notifyContentInvalidated } from './note-change.service';

/**
 * Settles a note a Rust task command (`toggle_task_status`,
 * `write_task_lines`, `write_task_text`) already wrote to disk and indexed in
 * `VaultIndex`.
 * Every task write goes through here, so none of these steps is duplicated
 * at a call site. Lives in `core/` so the Tasks feature and the Todoist sync
 * both call it without importing each other.
 *
 * The watcher is no fallback: it skips a batch whose paths were all saved in
 * the last 15 s, which a toggle on a just-saved note is (`toggleTask` saves a
 * dirty tab first). So the FTS5 / semantic tables, the per-file consumers and
 * the content caches are refreshed here, through the note-change owner.
 *
 * The `task` source has no yield, so the consumer fan-out has finished before
 * `notifyContentInvalidated()` clears the QueryJS cache, as in `notifyAfterSave`.
 * @param path - absolute path of the written note
 * @param updatedContent - the note's content after the write
 */
export function settleTaskWrite(path: string, updatedContent: string): void {
	// Sync the open tab (if any) and bump the external signal so
	// MarkdownEditor.svelte replaces the doc when this is the active tab.
	// `'none'`: Rust already wrote the content to disk.
	syncExternalContentToEditor(path, updatedContent, true, 'none');
	markRecentSave(path);
	void applyNoteChange({
		kind: 'upsert',
		source: 'task',
		path,
		content: updatedContent,
		vaultPath: vaultStore.path ?? undefined,
	});
	notifyContentInvalidated();
}
