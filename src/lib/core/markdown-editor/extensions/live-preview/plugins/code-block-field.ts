import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { findAllFencedCodeBlocks } from '../parsers/fenced-code-block';
import { hiddenLineDeco } from '../styles';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { CodeBlockWidget } from '../widgets/code-block-widget';

/** Languages handled by specialized block decorators, not the generic code block decorator */
const SPECIAL_LANGUAGES = new Set(['collection', 'queryjs', 'meta-bind-button', 'mermaid']);

/** Computes fenced + indented code block decorations using the Lezer syntax tree */
export function computeCodeBlocks(state: EditorState): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();

	// Collect all decorations (fenced + indented), then sort by position
	const decos: { from: number; to: number; deco: Decoration }[] = [];

	// Fenced code blocks
	const blocks = findAllFencedCodeBlocks(state);
	for (const block of blocks) {
		if (SPECIAL_LANGUAGES.has(block.language)) continue;
		if (!block.closed) continue;
		if (shouldShowSource(state, block.openFenceFrom, block.closeFenceTo)) continue;

		const code =
			block.contentFrom <= block.contentTo
				? state.doc.sliceString(block.contentFrom, block.contentTo)
				: '';

		decos.push({
			from: block.openFenceFrom,
			to: block.openFenceTo,
			deco: Decoration.replace({ widget: new CodeBlockWidget(code, block.language) }),
		});

		const startLine = state.doc.lineAt(block.openFenceFrom).number + 1;
		const endLine = state.doc.lineAt(block.closeFenceTo).number;
		for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
			const line = state.doc.line(lineNum);
			decos.push({ from: line.from, to: line.from, deco: hiddenLineDeco });
			decos.push({ from: line.from, to: line.to, deco: Decoration.replace({}) });
		}
	}

	// Indented code blocks (4-space indent, CommonMark 4.4)
	syntaxTree(state).iterate({
		enter(node) {
			if (node.name !== 'CodeBlock') return;

			if (shouldShowSource(state, node.from, node.to)) return;

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
			decos.push({
				from: firstLine.from,
				to: firstLine.to,
				deco: Decoration.replace({ widget: new CodeBlockWidget(code, '') }),
			});

			// Remaining lines: hide
			for (let lineNum = firstLine.number + 1; lineNum <= lastLine.number; lineNum++) {
				const line = state.doc.line(lineNum);
				decos.push({ from: line.from, to: line.from, deco: hiddenLineDeco });
				decos.push({ from: line.from, to: line.to, deco: Decoration.replace({}) });
			}
		},
	});

	// Sort by position and add to builder
	decos.sort((a, b) => a.from - b.from || a.to - b.to);
	for (const d of decos) {
		builder.add(d.from, d.to, d.deco);
	}

	return builder.finish();
}

/**
 * ViewPlugin that manages fenced code block decorations independently.
 * Uses Lezer syntax tree (`FencedCode` nodes) for robust detection.
 * Hides fence lines and styles content lines when cursor is outside the block.
 * Skips specialized blocks (collection, meta-bind-button, mermaid) handled by other plugins.
 */
export const codeBlockField = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = computeCodeBlocks(view.state);
		}
		update(update: ViewUpdate) {
			if (checkUpdateAction(update) === 'rebuild') {
				this.decorations = computeCodeBlocks(update.state);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);
