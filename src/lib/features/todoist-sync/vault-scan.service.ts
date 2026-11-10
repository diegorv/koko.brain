import { call } from '#lib/contracts/ipc.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { buildAnchorOccurrences, isInSyncScope } from './anchor.logic.js';
import { readNoteContent } from './note-writer.service.js';
import { extractTaskLines, type ScannedLine, type ScannedNote } from './pull.logic.js';

/** What a sync cycle sees in the vault. */
export interface VaultScan {
	/** Every task line in sync scope. */
	lines: ScannedLine[];
	/** Anchor -> the lines carrying it; 2+ means the link freezes (design rule 10). */
	occurrences: Map<string, ScannedLine[]>;
	/** Every indexed note, with the `todoist_project` id of those in sync scope. */
	notes: ScannedNote[];
}

/**
 * The vault scan every sync cycle starts from. Task lines come from the Rust
 * task index (`get_all_tasks_v2`, read directly rather than through the
 * throttled entries snapshot), except for notes open in a tab, whose current
 * text (unsaved edits included) is read through `readNoteContent` instead.
 * Paths outside sync scope (design rule 11) are dropped. Project notes are
 * found by their `todoist_project` frontmatter in `get_all_property_records`.
 * @param vaultRoot - absolute root of the open vault
 * @param templatesFolder - the vault's templates folder setting
 */
export async function scanVault(vaultRoot: string, templatesFolder: string): Promise<VaultScan> {
	const prefix = `${vaultRoot}/`;
	const relative = (path: string) => (path.startsWith(prefix) ? path.slice(prefix.length) : null);
	const inScope = (relPath: string) => isInSyncScope(relPath, templatesFolder);

	const [groups, records] = await Promise.all([call('get_all_tasks_v2'), call('get_all_property_records')]);
	const tabPaths = editorStore.tabs
		.map((t) => relative(t.path))
		.filter((p): p is string => p !== null && /\.(md|markdown)$/u.test(p));
	const openNotes = new Set(tabPaths);

	const lines: ScannedLine[] = [];
	for (const group of groups) {
		const relPath = relative(group.filePath);
		if (relPath === null || openNotes.has(relPath) || !inScope(relPath)) continue;
		for (const task of group.tasks) lines.push({ relPath, lineNumber: task.lineNumber, line: task.text });
	}
	for (const relPath of openNotes) {
		if (!inScope(relPath)) continue;
		const content = await readNoteContent(vaultRoot, relPath);
		for (const task of extractTaskLines(content)) lines.push({ relPath, lineNumber: task.lineNumber, line: task.text });
	}

	const notes: ScannedNote[] = [];
	for (const record of records) {
		const relPath = relative(record.path);
		if (relPath === null) continue;
		const value = record.properties.todoist_project;
		const id = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
		notes.push({ relPath, projectId: id !== '' && inScope(relPath) ? id : null });
	}

	return { lines, occurrences: buildAnchorOccurrences(lines), notes };
}
