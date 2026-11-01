import { invoke } from '@tauri-apps/api/core';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { createFile } from '#lib/core/filesystem/fs.service.js';
import { error } from '#lib/utils/debug.js';
import { createTypedNote } from '#lib/features/type-definitions/type-definitions.service.js';
import { newNoteContent } from './lens.logic';
import type { NewNoteRule } from './rail-shell.types';

/**
 * "+ New here": a plain rule creates `Untitled.md` (deduped) in its folder
 * with its frontmatter; a typed rule creates `Untitled <Type>` through
 * `createTypedNote` (the type's folder, dedupe and template, as "New <Type>"
 * does). Then the note is opened. Both writes go through
 * `fs.service::createFile`, which indexes the note through `applyNoteChange`.
 * Returns the created path; any failure is logged and rethrown, and nothing
 * is opened. `createFile` can also reject AFTER the write (its tree refresh
 * rethrows), so a rejection can leave the note on disk, unopened.
 * `openFileInEditor` does not reject: it toasts its own failure.
 */
export async function createNoteHere(rule: NewNoteRule): Promise<string> {
	try {
		let path: string;
		if ('typeName' in rule) {
			path = await createTypedNote({ typeName: rule.typeName, title: `Untitled ${rule.typeName}` });
		} else {
			// The Cmd+N folder is dated, so it may not exist yet; `create_folder` is recursive.
			await invoke('create_folder', { path: rule.folder });
			path = await createFile(rule.folder, 'Untitled.md', newNoteContent(rule));
		}
		await openFileInEditor(path);
		return path;
	} catch (err) {
		error('RAIL-SHELL', 'createNoteHere failed:', err);
		throw err;
	}
}
