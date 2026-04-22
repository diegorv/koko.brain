import { EditorView } from '@codemirror/view';

import { looksLikeTsv, tsvToMarkdownTable } from './paste-tsv.logic';

/**
 * CodeMirror paste handler that detects tab-separated clipboard content and
 * replaces the default paste with a GFM markdown table. Only intercepts when
 * `looksLikeTsv` is confident (≥ 2 rows, ≥ 2 columns, consistent width); any
 * other paste falls through to CodeMirror's default behavior.
 */
export const pasteTsvHandler = EditorView.domEventHandlers({
	paste(event, view) {
		const data = event.clipboardData;
		if (!data) return false;

		const text = data.getData('text/plain');
		if (!text || !looksLikeTsv(text)) return false;

		event.preventDefault();
		const markdown = tsvToMarkdownTable(text);
		const { from, to } = view.state.selection.main;
		view.dispatch({
			changes: { from, to, insert: markdown },
			selection: { anchor: from + markdown.length },
			scrollIntoView: true,
		});
		return true;
	},
});
