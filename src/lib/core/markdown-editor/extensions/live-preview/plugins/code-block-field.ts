import { RangeSet, RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { findAllFencedCodeBlocks } from '../parsers/fenced-code-block';
import { blockDecorator } from '../core/block-decorator';
import { revealPredicate } from '../core/reveal';
import { hideLines } from '../core/hide-lines';
import { codeBlockLineDeco } from '../styles';
import { CodeBlockWidget } from '../widgets/code-block-widget';

/** Languages handled by specialized block decorators, not the generic code block decorator */
const SPECIAL_LANGUAGES = new Set(['collection', 'queryjs', 'meta-bind-button', 'mermaid']);

/** Gives every line from `from` to `to` the code size, so a revealed block keeps the widget's size. */
function markCodeLines(builder: RangeSetBuilder<Decoration>, state: EditorState, from: number, to: number): void {
	const last = state.doc.lineAt(to).number;
	for (let n = state.doc.lineAt(from).number; n <= last; n++) {
		const line = state.doc.line(n);
		builder.add(line.from, line.from, codeBlockLineDeco);
	}
}

/**
 * Computes fenced + indented code block decorations using the Lezer syntax tree.
 * Each kind is built in document order into its own builder and the two sets
 * are joined, so the interleaved blocks need no sort.
 */
export function computeCodeBlocks(state: EditorState): DecorationSet {
	const isRevealed = revealPredicate(state);
	const fenced = new RangeSetBuilder<Decoration>();
	const indented = new RangeSetBuilder<Decoration>();

	// Fenced code blocks
	const blocks = findAllFencedCodeBlocks(state);
	for (const block of blocks) {
		if (SPECIAL_LANGUAGES.has(block.language)) continue;
		if (!block.closed) continue;
		if (isRevealed(block.openFenceFrom, block.closeFenceTo)) {
			markCodeLines(fenced, state, block.openFenceFrom, block.closeFenceTo);
			continue;
		}

		fenced.add(
			block.openFenceFrom,
			block.openFenceTo,
			Decoration.replace({
				widget: new CodeBlockWidget(block.content, block.language, {
					languageFrom: block.languageFrom,
					languageTo: block.languageTo,
					openFenceTo: block.openFenceTo,
				}),
			}),
		);

		hideLines(
			fenced,
			state.doc,
			state.doc.lineAt(block.openFenceFrom).number + 1,
			state.doc.lineAt(block.closeFenceTo).number,
		);
	}

	// Indented code blocks (4-space indent, CommonMark 4.4)
	syntaxTree(state).iterate({
		enter(node) {
			if (node.name !== 'CodeBlock') return;

			if (isRevealed(node.from, node.to)) {
				markCodeLines(indented, state, node.from, node.to);
				return;
			}

			// Strip 4-space indent from each line to get code content
			const lines: string[] = [];
			const firstLine = state.doc.lineAt(node.from);
			const lastLine = state.doc.lineAt(node.to);
			for (let lineNum = firstLine.number; lineNum <= lastLine.number; lineNum++) {
				const line = state.doc.line(lineNum);
				const text = line.text;
				// Remove up to 4 leading spaces or 1 tab
				if (text.startsWith('\t')) {
					lines.push(text.slice(1));
				} else {
					const spaces = text.match(/^ {1,4}/);
					lines.push(spaces ? text.slice(spaces[0].length) : text);
				}
			}
			const code = lines.join('\n');

			// First line: replace with CodeBlockWidget (no language)
			indented.add(firstLine.from, firstLine.to, Decoration.replace({ widget: new CodeBlockWidget(code, '') }));

			// Remaining lines: hide
			hideLines(indented, state.doc, firstLine.number + 1, lastLine.number);
		},
	});

	return RangeSet.join([fenced.finish(), indented.finish()]);
}

/**
 * ViewPlugin that manages fenced code block decorations independently.
 * Uses Lezer syntax tree (`FencedCode` nodes) for robust detection.
 * Replaces a block with a widget when the cursor is outside it; a revealed block keeps the widget's text size.
 * Skips specialized blocks (collection, meta-bind-button, mermaid) handled by other plugins.
 */
export const codeBlockField = blockDecorator({
	settingsKey: 'codeBlock',
	profileLabel: 'code-block',
	compute: computeCodeBlocks,
});
