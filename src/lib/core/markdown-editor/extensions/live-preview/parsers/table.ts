import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

/** Column alignment extracted from the separator row */
export type ColumnAlignment = 'left' | 'center' | 'right';

/** Parsed data for a GFM table block detected via the Lezer syntax tree */
export interface TableBlock {
	/** Start position of the table in the document */
	from: number;
	/** End position of the table in the document */
	to: number;
	/** Line number of the first table line (header row) */
	startLine: number;
	/** Line number of the last table line */
	endLine: number;
	/** Header cell contents */
	headers: string[];
	/** Column alignments from the separator row */
	alignments: ColumnAlignment[];
	/** Data rows (each row is an array of cell contents) */
	rows: string[][];
}

/** Matches a separator cell: optional colon, one or more dashes, optional colon */
const SEPARATOR_CELL_RE = /^:?-+:?$/;

/**
 * Parses column alignments from a table delimiter row text (e.g. `| :--- | :---: | ---: |`).
 * Still uses regex since the Lezer `TableDelimiter` node only provides raw text, not alignment info.
 */
export function parseAlignments(text: string): ColumnAlignment[] {
	const cells = text.split('|').filter((c) => c.trim().length > 0);
	const alignments: ColumnAlignment[] = [];

	for (const cell of cells) {
		const trimmed = cell.trim();
		if (!SEPARATOR_CELL_RE.test(trimmed)) continue;

		const left = trimmed.startsWith(':');
		const right = trimmed.endsWith(':');
		if (left && right) alignments.push('center');
		else if (right) alignments.push('right');
		else alignments.push('left');
	}

	return alignments;
}

/**
 * Normalizes a data row to match the expected column count.
 * Pads with empty strings if too few cells, truncates if too many.
 */
function normalizeRow(cells: string[], columnCount: number): string[] {
	if (cells.length === columnCount) return cells;
	if (cells.length > columnCount) return cells.slice(0, columnCount);
	return [...cells, ...Array(columnCount - cells.length).fill('')];
}

/** Counts unmatched `[[` brackets — positive means more opens than closes */
function unclosedWikilinkDepth(text: string): number {
	let depth = 0;
	for (let i = 0; i < text.length - 1; i++) {
		if (text[i] === '[' && text[i + 1] === '[') {
			depth++;
			i++;
		} else if (text[i] === ']' && text[i + 1] === ']') {
			depth--;
			i++;
		}
	}
	return depth;
}

/**
 * Extracts cell contents from TableHeader or TableRow children.
 * Uses Lezer `TableCell` nodes for robust parsing — handles pipes in inline code,
 * escaped pipes, and complex inline formatting that regex-based splitting would break on.
 *
 * GFM's Lezer parser splits on every `|`, including those inside `[[wikilink|display]]`.
 * When a cell contains an unclosed `[[`, subsequent cells are merged back with `|` until
 * the wikilink is closed.
 */
function extractCells(
	parent: ReturnType<typeof syntaxTree>['topNode'],
	state: EditorState,
): string[] {
	const raw: string[] = [];
	let child = parent.firstChild;
	while (child) {
		if (child.name === 'TableCell') {
			raw.push(state.doc.sliceString(child.from, child.to).trim());
		}
		child = child.nextSibling;
	}

	// Merge cells that were split on a `|` inside a wikilink `[[target|display]]`
	const cells: string[] = [];
	let pending = '';
	for (const cell of raw) {
		if (pending) {
			pending += '|' + cell;
		} else {
			pending = cell;
		}
		if (unclosedWikilinkDepth(pending) <= 0) {
			cells.push(pending);
			pending = '';
		}
	}
	if (pending) cells.push(pending);

	return cells;
}

/**
 * Finds all GFM tables using the Lezer syntax tree (`Table` nodes from the GFM extension).
 * More robust than regex-based pipe splitting: correctly handles escaped pipes,
 * pipes in inline code, and complex cell formatting.
 */
export function findAllTables(state: EditorState): TableBlock[] {
	const tables: TableBlock[] = [];
	const tree = syntaxTree(state);

	tree.iterate({
		enter(node) {
			if (node.name !== 'Table') return;

			const inner = node.node;
			let headers: string[] = [];
			let alignments: ColumnAlignment[] = [];
			const rows: string[][] = [];

			let child = inner.firstChild;
			while (child) {
				if (child.name === 'TableHeader') {
					headers = extractCells(child, state);
				} else if (child.name === 'TableDelimiter') {
					const delimText = state.doc.sliceString(child.from, child.to);
					alignments = parseAlignments(delimText);
				} else if (child.name === 'TableRow') {
					const row = extractCells(child, state);
					rows.push(normalizeRow(row, headers.length));
				}
				child = child.nextSibling;
			}

			// Ensure alignments match header count (fallback to left)
			while (alignments.length < headers.length) alignments.push('left');
			if (alignments.length > headers.length) alignments.length = headers.length;

			tables.push({
				from: node.from,
				to: node.to,
				startLine: state.doc.lineAt(node.from).number,
				endLine: state.doc.lineAt(node.to).number,
				headers,
				alignments,
				rows,
			});
		},
	});

	return tables;
}
