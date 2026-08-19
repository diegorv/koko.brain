import { clamp } from '$lib/utils/clamp';
import { openFileInEditor } from './editor.service';
import { lineStartToOffset } from './editor.logic';
import { editorStore } from './editor.store.svelte';

/**
 * Where inside a note to place the caret. The discriminant is the unit: a
 * `line` is 1-indexed (matching search results and CodeMirror's `doc.line(n)`),
 * an `offset` is a character offset into the note's content. Mixing the two up
 * is the search-jump bug of issue 02 - as a discriminated union it is a type
 * error instead of a silent misplacement.
 */
export type NoteTarget =
	| { kind: 'offset'; offset: number }
	| { kind: 'line'; line: number };

/**
 * Single owner of "open this note and put the caret at this position".
 *
 * Owns the await ordering (the note must be open before a position can be
 * derived from its content), the active-vs-switch branch (an already-active
 * note is not reopened, so the file-explorer selection is left alone), the
 * failed-open guard (`openFileInEditor` swallows read errors, so the active
 * tab is re-checked afterwards), the line → offset conversion and the clamp.
 *
 * The caret move itself is handed to `editorStore.pendingScrollPosition`,
 * whose consumer in `MarkdownEditor.svelte` owns the animation-frame layering
 * and `view.focus()`. A direct dispatch here would land on the previous
 * document: `openFileInEditor` resolves as soon as the tab is added, while
 * CodeMirror's doc replace only happens in the next tab-switch effect.
 *
 * A null `path` (no active tab) is a no-op, so callers can pass
 * `editorStore.activeTabPath` directly.
 */
export async function openNoteAt(path: string | null, target: NoteTarget): Promise<void> {
	if (!path) return;

	if (editorStore.activeTabPath !== path) {
		await openFileInEditor(path);
	}

	const tab = editorStore.activeTab;
	if (!tab || tab.path !== path) return;

	const offset = target.kind === 'line'
		? lineStartToOffset(tab.content, target.line)
		: target.offset;
	editorStore.setPendingScrollPosition(clamp(offset, 0, tab.content.length));
}
