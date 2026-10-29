import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import { CALLOUT_COLORS, matchCalloutHeader } from '../../callout/callout.logic';

/** Parsed result of a callout header line `> [!type] title` */
export interface CalloutHeader {
	type: string;
	title: string;
	foldable: '+' | '-' | null;
	color: string;
	/** Number of `>` quote prefixes before `[!type]` (2 for `> > [!tip]`) */
	depth: number;
	/** Range of the `> [!type]` marker (including optional fold char) */
	markerFrom: number;
	markerTo: number;
	/** Range of the custom title text (empty string if no title) */
	titleFrom: number;
	titleTo: number;
}

/** Full callout block detected via the Lezer syntax tree (`Blockquote` node) */
export interface CalloutBlock {
	header: CalloutHeader;
	/** Start position of the callout blockquote */
	from: number;
	/** End position of the callout blockquote */
	to: number;
	/** Line number of the header line */
	startLine: number;
	/** Line number of the last line */
	endLine: number;
}

/**
 * Parses a callout header line, or returns null if not a callout header.
 * Uses `matchCalloutHeader` since the `[!type]` syntax is Obsidian-specific and not in the Lezer grammar.
 */
export function parseCalloutHeader(text: string, offset: number): CalloutHeader | null {
	const match = matchCalloutHeader(text);
	if (!match) return null;

	const { type, foldable } = match;
	const title = match.rawTitle.trim();
	const color = CALLOUT_COLORS[type] || '#60a5fa';

	// Marker is `> [!type]` + optional fold char + the whitespace before the title
	const markerEnd = match.markerLength;

	return {
		type,
		title,
		foldable,
		color,
		depth: text.slice(0, text.indexOf('[!')).split('>').length - 1,
		markerFrom: offset,
		markerTo: offset + markerEnd,
		titleFrom: offset + markerEnd,
		titleTo: offset + markerEnd + title.length,
	};
}

/**
 * Returns the callout header of a `Blockquote` node, or null if it is a plain
 * blockquote. In `> > [!tip]` both the outer and the inner blockquote start on
 * the header line; only the one whose nesting depth equals the header's `>`
 * count (the inner one) is the callout.
 */
export function calloutHeaderOf(state: EditorState, node: SyntaxNode): CalloutHeader | null {
	const firstLine = state.doc.lineAt(node.from);
	const header = parseCalloutHeader(firstLine.text, firstLine.from);
	if (!header) return null;
	let depth = 0;
	for (let n: SyntaxNode | null = node; n; n = n.parent) {
		if (n.name === 'Blockquote') depth++;
	}
	return depth === header.depth ? header : null;
}

/**
 * Finds all callout blocks using the Lezer syntax tree (`Blockquote` nodes).
 * A callout is a blockquote whose first line matches `> [!type]...`.
 * Uses syntaxTree for robust blockquote boundary detection, with regex only
 * for the Obsidian-specific `[!type]` header parsing. A callout nested in
 * another is listed after it (tree order).
 */
export function findAllCallouts(state: EditorState): CalloutBlock[] {
	const callouts: CalloutBlock[] = [];
	const tree = syntaxTree(state);

	tree.iterate({
		enter(node) {
			if (node.name !== 'Blockquote') return;

			const header = calloutHeaderOf(state, node.node);
			if (!header) return;

			callouts.push({
				header,
				from: node.from,
				to: node.to,
				startLine: state.doc.lineAt(node.from).number,
				endLine: state.doc.lineAt(node.to).number,
			});
		},
	});

	return callouts;
}
