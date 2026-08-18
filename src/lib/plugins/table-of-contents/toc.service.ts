import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { clamp } from '$lib/utils/clamp';
import { extractTocHeadings } from './toc.logic';
import { tocStore } from './toc.store.svelte';

/**
 * Parses `content` into headings and updates `tocStore`. A null/empty buffer
 * clears the store (used when no markdown tab is active).
 */
export function rebuildToc(content: string | null): void {
	if (!content) {
		tocStore.reset();
		return;
	}
	tocStore.setHeadings(extractTocHeadings(content));
}

/**
 * Scrolls the active CodeMirror view so the heading at `pos` (character
 * offset) is centered and places the caret on that line. Returns silently
 * when no view is mounted (e.g. before the editor has finished initialising).
 */
export function scrollToHeading(pos: number): void {
	const view = editorStore.editorView;
	if (!view) return;
	const clamped = clamp(pos, 0, view.state.doc.length);
	view.dispatch({
		selection: EditorSelection.cursor(clamped),
		effects: EditorView.scrollIntoView(clamped, { y: 'center' }),
	});
	view.focus();
}
