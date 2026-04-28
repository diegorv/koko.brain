import type { EditorState } from '@codemirror/state';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';

/**
 * Returns true if any selection range (cursor or selection) intersects the
 * document range [from, to]. Uses position-based intersection for per-element
 * granularity — only the specific element under/overlapping the cursor shows source.
 *
 * Raw mode (`editor.rawMode`, toggled via Cmd+K) short-circuits to `true` for
 * every range, so all markdown source is rendered regardless of cursor position.
 * This is the equivalent of a "show everything" toggle without spinning up a
 * second editor.
 */
export function shouldShowSource(state: EditorState, from: number, to: number): boolean {
	if (settingsStore.editor.rawMode) return true;
	for (const range of state.selection.ranges) {
		if (range.from <= to && range.to >= from) return true;
	}

	return false;
}
