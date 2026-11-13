import { EditorView } from '@codemirror/view';
import { findMarkdownLinkUrlAtPosition } from './parsers/link';
import { isSafeUrl } from '#lib/utils/sanitize-url.js';
import { findInlineTags } from '#lib/utils/tag-extraction.js';
import { IS_MAC, isOpenLinkModifier } from '#lib/utils/platform.js';
import { editorHost } from '../../editor-host';
import { reportError } from './core/profiling';

/**
 * Handles a mousedown on a live-preview link. With the platform open modifier
 * held (Cmd on macOS, Ctrl on Windows/Linux) and the primary button, opens the
 * external URL of the `.cm-lp-link` under the cursor (markdown link, autolink,
 * or bare URL) when it passes the safe-URL check. Returns true when the event
 * was handled (a link was hit), false otherwise. `mac` defaults to the
 * detected platform; CodeMirror calls this with `(event, view)` only.
 */
export function handleLivePreviewLinkMousedown(e: MouseEvent, view: EditorView, mac: boolean = IS_MAC): boolean {
	if (e.button !== 0 || !isOpenLinkModifier(e, mac)) return false;
	const linkEl = (e.target as HTMLElement).closest('.cm-lp-link') as HTMLElement | null;
	if (!linkEl) return false;

	e.preventDefault();
	const pos = view.posAtDOM(linkEl);
	const line = view.state.doc.lineAt(pos);

	// Try markdown link [text](url) first
	let url = findMarkdownLinkUrlAtPosition(view.state, line.from, line.to, pos);

	// For autolinks <url> and bare URLs, the link text IS the URL
	if (!url) {
		url = linkEl.textContent?.trim() || null;
	}

	if (url && isSafeUrl(url)) {
		view.state
			.facet(editorHost)
			.openExternal(url)
			.catch((err) => reportError('LIVE-PREVIEW', 'Failed to open URL:', err));
	}
	return true;
}

/**
 * Handles a mousedown on a live-preview tag pill (`.cm-lp-tag`). With the
 * platform open modifier and the primary button, opens Search with
 * `tag:<tag>` through the editor host and returns true, so CodeMirror does
 * not move the cursor. Anything else returns false and falls through, so a
 * plain click edits the tag. The tag is read from the document line under
 * the pill, not from the DOM text: a pill split by nested marks has several
 * elements, each holding part of the name.
 */
export function handleLivePreviewTagMousedown(e: MouseEvent, view: EditorView, mac: boolean = IS_MAC): boolean {
	if (e.button !== 0 || !isOpenLinkModifier(e, mac)) return false;
	const tagEl = (e.target as HTMLElement).closest('.cm-lp-tag') as HTMLElement | null;
	if (!tagEl) return false;

	const pos = view.posAtDOM(tagEl);
	const line = view.state.doc.lineAt(pos);
	const offset = pos - line.from;
	const match = findInlineTags(line.text).find((t) => t.from <= offset && offset < t.to);
	if (!match) return false;

	e.preventDefault();
	view.state.facet(editorHost).openTagSearch(match.tag);
	return true;
}

export const livePreviewClickHandler = EditorView.domEventHandlers({
	mousedown: (e, view) => handleLivePreviewTagMousedown(e, view) || handleLivePreviewLinkMousedown(e, view),
});
