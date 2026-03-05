import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { ensureSyntaxTree } from '@codemirror/language';
import { GFM } from '@lezer/markdown';
import { MathExtension } from '$lib/core/markdown-editor/extensions/lezer/math-extension';
import { HighlightExtension } from '$lib/core/markdown-editor/extensions/lezer/highlight-extension';

/** Splits a multi-line string into line objects with text and absolute positions */
export function makeLines(text: string) {
	const result: { text: string; from: number; to: number }[] = [];
	let pos = 0;
	for (const lineText of text.split('\n')) {
		result.push({ text: lineText, from: pos, to: pos + lineText.length });
		pos += lineText.length + 1;
	}
	return result;
}

/**
 * Creates an EditorState with markdown language support (including GFM + custom extensions)
 * and a fully parsed syntax tree. Used by parser and decorator tests that need Lezer tree access.
 */
export function createMarkdownState(doc: string): EditorState {
	const state = EditorState.create({
		doc,
		extensions: [markdown({ extensions: [GFM, MathExtension, HighlightExtension] })],
	});
	// Force synchronous tree parse for test reliability
	ensureSyntaxTree(state, state.doc.length, 5000);
	return state;
}
