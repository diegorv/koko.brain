import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { clipboardToMarkdownTable } from './paste-tsv.logic';

/**
 * Paste handler that detects TSV / Excel-clipboard text and rewrites it
 * as a markdown pipe table on insert. Falls through to CodeMirror's
 * default paste handling for any non-tabular text.
 *
 * Flow:
 *   1. `paste` event fires; pull `text/plain` from `clipboardData`.
 *   2. `clipboardToMarkdownTable(text)` returns either a converted
 *      table string or `null` (not tabular).
 *   3. On `null` → return early; CodeMirror's default takes over.
 *   4. On hit → `event.preventDefault()` + dispatch a single transaction
 *      replacing the current selection with the markdown table.
 */
export const pasteTsvHandler: Extension = EditorView.domEventHandlers({
	paste(event, view) {
		const clipboardText = event.clipboardData?.getData('text/plain');
		if (!clipboardText) return false;

		const markdown = clipboardToMarkdownTable(clipboardText);
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
