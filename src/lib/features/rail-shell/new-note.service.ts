import { invoke } from '@tauri-apps/api/core';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { createFile } from '#lib/core/filesystem/fs.service.js';
import { error } from '#lib/utils/debug.js';
import { newNoteContent } from './lens.logic';
import type { NewNoteRule } from './rail-shell.types';

/**
 * "+ New here": creates `Untitled.md` (deduped) in the rule's folder with the
 * rule's frontmatter, then opens it. The write goes through
 * `fs.service::createFile`, which indexes the note through `applyNoteChange`.
 * Returns the created path; any failure is logged and rethrown, and nothing
 * is opened. `createFile` can also reject AFTER the write (its tree refresh
 * rethrows), so a rejection can leave the note on disk, unopened.
 * `openFileInEditor` does not reject: it toasts its own failure.
 */
export async function createNoteHere(rule: NewNoteRule): Promise<string> {
	try {
		// The Cmd+N folder is dated, so it may not exist yet; `create_folder` is recursive.
		await invoke('create_folder', { path: rule.folder });
		const path = await createFile(rule.folder, 'Untitled.md', newNoteContent(rule));
		await openFileInEditor(path);
		return path;
	} catch (err) {
		error('RAIL-SHELL', 'createNoteHere failed:', err);
		throw err;
	}
}
