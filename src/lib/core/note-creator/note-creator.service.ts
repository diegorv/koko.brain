import { exists, writeTextFile, mkdir, readTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { markRecentSave } from '$lib/core/editor/editor.hooks';
import { refreshTree } from '$lib/core/filesystem/fs.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
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
			const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));

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

			// Write via Rust create_note when rustProperties is on — the command
			// creates parent dirs + writes the file + updates VaultIndex +
			// emits vault-index-updated in one atomic operation, so the new
			// note appears in the backlinks / outgoing / tags / properties
			// indexes immediately. Falls back to the legacy writeTextFile
			// path when the flag is off to preserve existing behaviour.
			if (settingsStore.experimental.rustProperties) {
				await invoke('create_note', { path: filePath, content });
			} else {
				await mkdir(parentDir, { recursive: true });
				await writeTextFile(filePath, content);
			}
			markRecentSave(filePath);
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
