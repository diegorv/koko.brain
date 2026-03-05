import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import { CALLOUT_COLORS } from '../../callout/callout.logic';

/** Parsed result of a callout header line `> [!type] title` */
export interface CalloutHeader {
	type: string;
	title: string;
	foldable: '+' | '-' | null;
	color: string;
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

/** Matches `> [!type]+/-` with optional title (supports nested `> > [!type]` with multiple `>` prefixes) */
export const CALLOUT_HEADER_RE = /^(?:>\s*)+\[!([\w-]+)\]([+-])?\s*(.*)?$/;

/** Matches a blockquote continuation line `> ...` (not a new callout) */
export const CALLOUT_CONTENT_RE = /^>\s?/;

/**
 * Parses a callout header line, or returns null if not a callout header.
 * Uses regex since the `[!type]` syntax is Obsidian-specific and not in the Lezer grammar.
 */
export function parseCalloutHeader(text: string, offset: number): CalloutHeader | null {
	const match = text.match(CALLOUT_HEADER_RE);
	if (!match) return null;

	const type = match[1].toLowerCase();
	const foldable = (match[2] as '+' | '-') || null;
	const title = (match[3] || '').trim();
	const color = CALLOUT_COLORS[type] || '#60a5fa';

	// Marker is `> [!type]` + optional fold char
	const markerEnd = match[0].length - (title ? title.length : 0);

	return {
		type,
		title,
		foldable,
		color,
		markerFrom: offset,
		markerTo: offset + markerEnd,
		titleFrom: offset + markerEnd,
		titleTo: offset + text.length,
	};
}

/**
 * Finds all callout blocks using the Lezer syntax tree (`Blockquote` nodes).
 * A callout is a blockquote whose first line matches `> [!type]...`.
 * Uses syntaxTree for robust blockquote boundary detection, with regex only
 * for the Obsidian-specific `[!type]` header parsing.
 */
export function findAllCallouts(state: EditorState): CalloutBlock[] {
	const callouts: CalloutBlock[] = [];
	const tree = syntaxTree(state);

	tree.iterate({
		enter(node) {
			if (node.name !== 'Blockquote') return;

			// Check if first line is a callout header
			const firstLine = state.doc.lineAt(node.from);
			const header = parseCalloutHeader(firstLine.text, firstLine.from);
			if (!header) return;

			callouts.push({
				header,
				from: node.from,
				to: node.to,
				startLine: firstLine.number,
				endLine: state.doc.lineAt(node.to).number,
			});
		},
	});

	return callouts;
}
