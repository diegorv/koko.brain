import { exists, writeTextFile, mkdir, readTextFile } from '@tauri-apps/plugin-fs';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { markRecentSave } from '$lib/core/editor/editor.hooks';
import { refreshTree } from '$lib/core/filesystem/fs.service';
import { processTemplate } from '$lib/utils/template';
import { error } from '$lib/utils/debug';

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

	try {
		const fileExists = await exists(filePath);

		if (!fileExists) {
			const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
			await mkdir(parentDir, { recursive: true });

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

			await writeTextFile(filePath, content);
			markRecentSave(filePath);
			try {
				await refreshTree();
			} catch (refreshErr) {
				error('NOTE_CREATOR', 'refreshTree failed after file creation:', refreshErr);
			}
		}

		await openFileInEditor(filePath);
	} catch (err) {
		error('NOTE_CREATOR', 'Failed to open or create note:', err);
		throw err;
	}
}
