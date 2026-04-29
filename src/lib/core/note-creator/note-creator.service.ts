import { exists, readTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { markRecentSave } from '$lib/core/editor/editor.hooks';
import { refreshTree } from '$lib/core/filesystem/fs.service';
import { updateNoteInIndex } from '$lib/features/collection/collection.service';
import { processTemplate } from '$lib/utils/template';
import { error } from '$lib/utils/debug';
import { appendLog } from '$lib/utils/log.service';

/** Options for creating or opening a note from a template */
export interface NoteCreationOptions {
	/** Full absolute path for the note file */
	filePath: string;
	/** Absolute path to a template file (reads and processes it) */
	templatePath?: string;
	/** Inline template string (fallback when templatePath is not set or read fails) */
	inlineTemplate?: string;
	/** Title used for `tp.file.title` and date reference in template expressions */
	title: string;
	/** Extra variable mappings for template expansion (e.g. `{ yesterdayPath: "..." }`) */
	customVariables?: Record<string, string>;
}

/**
 * Opens a note if it exists, or creates it from a template and opens it.
 *
 * Pipeline:
 * 1. Check if file exists — open and return
 * 2. Create parent directories (recursive)
 * 3. Load template from file or use inline fallback
 * 4. Process `<% %>` expressions
 * 5. Write file
 * 6. Refresh file tree
 * 7. Open in editor
 */
export async function openOrCreateNote(options: NoteCreationOptions): Promise<void> {
	const { filePath, templatePath, inlineTemplate, title, customVariables } = options;

	// [FE-STARTUP-PROBE]
	const probeStart = performance.now();
	appendLog('FE-STARTUP-PROBE', `openOrCreateNote: ENTRY path=${filePath}`);

	try {
		const fileExists = await exists(filePath);
		appendLog('FE-STARTUP-PROBE', `openOrCreateNote: after exists() @ ${(performance.now() - probeStart).toFixed(1)}ms (exists=${fileExists})`);

		if (!fileExists) {
			// Phase 8.7: parent dir + file creation now go through Rust.
			// `create_folder` is recursive (no-op when present), and
			// `create_note` errors if the path already exists — but we
			// already checked above. After both calls succeed, the Rust
			// side has updated `VaultIndex` AND emitted
			// `vault-index-updated`, so the panels (Backlinks, Tags,
			// Tasks, etc.) auto-refetch.
			const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
			await invoke('create_folder', { path: parentDir });

			let content = '';

			if (templatePath) {
				try {
					content = await readTextFile(templatePath);
				} catch {
					content = inlineTemplate ?? '';
				}
			} else {
				content = inlineTemplate ?? '';
			}

			content = processTemplate(content, title, customVariables);

			await invoke('create_note', { path: filePath, content });
			// Mark the path as a self-save so the watcher's batch-rebuild
			// guard (`areAllRecentSaves`) doesn't trigger a full vault
			// rescan when it sees the write event we just made.
			markRecentSave(filePath);
			// Populate the FE-side `collectionStore.propertyIndex` for the
			// new file synchronously. Without this, `kb.current()` returns
			// null for queryjs blocks that auto-run before the layout
			// content-effect's 1 s debounce flushes `updateIndexesForFile`
			// — the cached error then sticks because `first-open` auto-run
			// only fires once per session. The Rust side has already
			// updated `VaultIndex`; this just keeps the TS mirror in sync
			// for the immediate `openFileInEditor` that follows.
			try { updateNoteInIndex(filePath, content); } catch (err) { error('NOTE_CREATOR', 'updateNoteInIndex after create_note failed:', err); }
			try {
				await refreshTree();
			} catch (refreshErr) {
				error('NOTE_CREATOR', 'refreshTree failed after file creation:', refreshErr);
			}
			appendLog('FE-STARTUP-PROBE', `openOrCreateNote: file created @ ${(performance.now() - probeStart).toFixed(1)}ms`);
		}

		appendLog('FE-STARTUP-PROBE', `openOrCreateNote: before openFileInEditor @ ${(performance.now() - probeStart).toFixed(1)}ms`);
		await openFileInEditor(filePath);
		appendLog('FE-STARTUP-PROBE', `openOrCreateNote: EXIT @ ${(performance.now() - probeStart).toFixed(1)}ms`);
	} catch (err) {
		error('NOTE_CREATOR', 'Failed to open or create note:', err);
		throw err;
	}
}
