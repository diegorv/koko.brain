import type { EditorState } from '@codemirror/state';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';

/**
 * Returns true if the element should render its raw markdown source instead of
 * its decorated form. Two triggers:
 *
 * 1. `editor.rawMode` is on → every element shows source (user toggled Cmd+K).
 *    Called by all 22 live-preview plugins and block fields, so flipping the
 *    flag disables cursor-reveal hiding everywhere in one place.
 * 2. Any selection range (cursor or selection) intersects the document range
 *    [from, to] — per-element cursor-reveal granularity.
 */
export function shouldShowSource(state: EditorState, from: number, to: number): boolean {
	if (settingsStore.editor.rawMode) return true;

	for (const range of state.selection.ranges) {
		if (range.from <= to && range.to >= from) return true;
	}

	return false;
}
