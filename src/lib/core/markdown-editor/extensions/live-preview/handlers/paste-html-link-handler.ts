import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { htmlLinksToMarkdown } from './paste-html-link.logic';

/**
 * Paste handler that converts clipboard HTML anchors (`<a href>`) into
 * markdown links on insert. Apps like Slack put the link label in
 * `text/plain` and the URL only in `text/html`, so CodeMirror's default
 * paste (plain text) silently drops the URL.
 *
 * Flow:
 *   1. `paste` event fires; pull `text/html` + `text/plain` from
 *      `clipboardData`.
 *   2. `htmlLinksToMarkdown(html, plain)` returns either the converted
 *      text or `null` (no anchor with a URL missing from the plain flavor).
 *   3. On `null` → return early; the TSV handler, then CodeMirror's
 *      default, take over.
 *   4. On hit → `event.preventDefault()` + dispatch a single transaction
 *      replacing the current selection with the converted text.
 */
export const pasteHtmlLinkHandler: Extension = EditorView.domEventHandlers({
	paste(event, view) {
		const html = event.clipboardData?.getData('text/html');
		if (!html) return false;
		const plain = event.clipboardData?.getData('text/plain') ?? '';

		const markdown = htmlLinksToMarkdown(html, plain);
		if (markdown === null) return false;

		event.preventDefault();
		const { state } = view;
		const tr = state.update({
			changes: {
				from: state.selection.main.from,
				to: state.selection.main.to,
				insert: markdown,
			},
			selection: { anchor: state.selection.main.from + markdown.length },
			scrollIntoView: true,
			userEvent: 'input.paste',
		});
		view.dispatch(tr);
		return true;
	},
});
