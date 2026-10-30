import { syntaxTree } from '@codemirror/language';
import type { EditorView } from '@codemirror/view';
import { isMacContextClick, isOpenLinkModifier } from '#lib/utils/platform.js';
import { isInsideBlockContext } from './extensions/live-preview/core/is-inside-block-context';
import { findWikilinkInfoAtPosition } from './extensions/wikilink/decoration.logic';

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

/** The parts of an `EditorView` the click resolver reads. */
export type WikilinkClickView = Pick<EditorView, 'state' | 'posAtDOM' | 'posAtCoords' | 'coordsAtPos'>;

/**
 * Returns the document position of the wikilink a mousedown should open, or
 * `null` to leave the event to CodeMirror.
 *
 * A click on a wikilink element (the rendered `.cm-lp-wikilink`, or a
 * source-mode `.cm-wikilink-*` token) opens it. When the cursor is on the
 * wikilink's line in live preview the raw `[[...]]` is revealed with no
 * wikilink class, so a plain click there places the cursor; the platform open
 * modifier (Cmd on macOS, Ctrl elsewhere) still opens the wikilink under the
 * pointer.
 *
 * Only the primary button navigates: a right-button mousedown must fall
 * through to CodeMirror and the context menu instead of opening or creating
 * the note. A macOS Ctrl+click arrives as a primary-button mousedown but means
 * the context menu, so it is filtered too.
 *
 * The modifier path skips `[[...]]` inside code and other block contexts (the
 * decorations never render it as a link), and a click in the empty space past
 * the end of a line, which `posAtCoords` maps to the line end.
 */
export function resolveWikilinkClickPosition(e: MouseEvent, view: WikilinkClickView, mac: boolean): number | null {
	if (e.button !== 0 || isMacContextClick(e, mac)) return null;
	const el = findWikilinkElement(e.target);
	if (el) return view.posAtDOM(el);
	if (!isOpenLinkModifier(e, mac)) return null;

	const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
	if (pos === null) return null;
	if (isInsideBlockContext(syntaxTree(view.state).resolveInner(pos))) return null;
	const line = view.state.doc.lineAt(pos);
	if (pos === line.to) {
		const end = view.coordsAtPos(pos, -1);
		if (end && e.clientX > end.right) return null;
	}
	return findWikilinkInfoAtPosition(line.text, line.from, pos) ? pos : null;
}
