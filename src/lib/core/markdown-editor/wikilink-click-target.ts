/**
 * CSS selector matching every DOM node that represents a clickable wikilink in
 * the editor — both the source-mode tokens (`.cm-wikilink-*`) and the
 * live-preview rendered link (`.cm-lp-wikilink`).
 *
 * Kept in a dedicated module so the selector and the matching helper are
 * unit-testable without mounting the Svelte component.
 */
export const WIKILINK_SELECTOR =
	'.cm-wikilink-target, .cm-wikilink-heading, .cm-wikilink-block-id, .cm-wikilink-display, .cm-wikilink-bracket, .cm-lp-wikilink';

/**
 * Returns the closest wikilink ancestor element of `target`, or `null` when
 * the click did not happen on a wikilink. Used by the editor's capture-phase
 * mousedown handler to decide whether to intercept the event (and thereby
 * prevent CodeMirror's drag-select state machine from arming — see
 * `MarkdownEditor.svelte` `handleEditorClick`).
 */
export function findWikilinkElement(target: EventTarget | null): HTMLElement | null {
	if (!(target instanceof HTMLElement)) return null;
	return target.closest(WIKILINK_SELECTOR);
}
