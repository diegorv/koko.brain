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
 * Normalizes a header or data row to match the expected column count.
 * Pads with empty strings if too few cells, truncates if too many.
 */
function normalizeRow(cells: string[], columnCount: number): string[] {
	if (cells.length === columnCount) return cells;
	if (cells.length > columnCount) return cells.slice(0, columnCount);
	return [...cells, ...Array(columnCount - cells.length).fill('')];
}

/**
 * Splits one table row's source into raw cell strings, trimmed.
 *
 * Lezer's `TableCell` nodes cannot be used directly: Lezer emits no node for an
 * empty cell (so later cells would shift left), and it splits on every `|`,
 * including those inside `[[target|alias]]` and inline code. A `|` is a cell
 * boundary here unless it is escaped (`\|`), inside a closed code span, or
 * inside a closed `[[...]]`. The closing backtick run is searched across the
 * whole row, so a code span that crosses a `|` joins the cells it spans (GFM
 * would split there). The blank segment before a leading pipe and after
 * a trailing pipe is not a cell.
 */
function splitRow(text: string): string[] {
	const cells: string[] = [];
	let start = 0;
	let i = 0;
	while (i < text.length) {
		const ch = text[i];
		if (ch === '\\') {
			i += 2;
			continue;
		}
		if (ch === '`') {
			let n = 1;
			while (text[i + n] === '`') n++;
			const close = findBacktickRun(text, i + n, n);
			i = close === -1 ? i + n : close + n;
			continue;
		}
		if (ch === '[' && text[i + 1] === '[') {
			const close = text.indexOf(']]', i + 2);
			if (close !== -1) {
				i = close + 2;
				continue;
			}
		}
		if (ch === '|') {
			cells.push(text.slice(start, i).trim());
			start = i + 1;
		}
		i++;
	}
	cells.push(text.slice(start).trim());

	if (cells.length > 1 && cells[0] === '') cells.shift();
	if (cells.length > 1 && cells[cells.length - 1] === '') cells.pop();
	return cells;
}

/** Index of the next backtick run of exactly `n` backticks at or after `from`, or -1. */
function findBacktickRun(text: string, from: number, n: number): number {
	let i = from;
	while (i < text.length) {
		if (text[i] !== '`') {
			i++;
			continue;
		}
		let len = 1;
		while (text[i + len] === '`') len++;
		if (len === n) return i;
		i += len;
	}
	return -1;
}

/**
 * Finds all GFM tables using the Lezer syntax tree (`Table` nodes from the GFM extension)
 * for the table and row ranges; each row's cells come from `splitRow`.
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
				const text = state.doc.sliceString(child.from, child.to);
				if (child.name === 'TableHeader') {
					headers = splitRow(text);
				} else if (child.name === 'TableDelimiter') {
					alignments = parseAlignments(text);
				} else if (child.name === 'TableRow') {
					rows.push(splitRow(text));
				}
				child = child.nextSibling;
			}

			// The delimiter row fixes the column count: a short row is padded and
			// cells beyond it stay in the source but are not rendered.
			const columnCount = alignments.length;

			tables.push({
				from: node.from,
				to: node.to,
				startLine: state.doc.lineAt(node.from).number,
				endLine: state.doc.lineAt(node.to).number,
				headers: normalizeRow(headers, columnCount),
				alignments,
				rows: rows.map((row) => normalizeRow(row, columnCount)),
			});
		},
	});

	return tables;
}
