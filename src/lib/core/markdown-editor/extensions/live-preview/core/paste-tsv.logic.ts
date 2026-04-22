/**
 * Pure TSV → markdown table converter.
 *
 * When a user pastes from Excel / Google Sheets / Numbers / a text file with
 * tab-separated columns, the clipboard arrives as tab-separated rows. We
 * detect the shape here and return the equivalent GFM markdown table so the
 * paste handler can insert it.
 *
 * A plausible TSV clipboard has at least two lines (a header-ish row + at
 * least one data-ish row) OR at least one line with >= 2 tab-separated
 * columns. Anything looser would false-positive on plain text with a single
 * leading tab (common in code snippets). See `looksLikeTsv` for the exact
 * predicate.
 */

export interface TsvShape {
	headers: string[];
	rows: string[][];
}

/**
 * Splits `text` into rows of cells. Accepts `\n` and `\r\n` line breaks;
 * trims trailing empty rows from a final newline but preserves empty cells
 * inside a row (a user may have empty cells).
 */
export function splitTsv(text: string): string[][] {
	const lines = text.split(/\r?\n/);
	while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
	return lines.map((line) => line.split('\t'));
}

/**
 * Returns true if `text` looks like clipboard-pasted TSV: every non-empty
 * row has at least two columns, and the column counts are consistent.
 * Rejects inputs with zero tabs (plain text), irregular column counts
 * (suggests pasted code), or a single row (ambiguous — could be any single
 * line with tabs).
 */
export function looksLikeTsv(text: string): boolean {
	if (!text.includes('\t')) return false;
	const rows = splitTsv(text);
	if (rows.length < 2) return false;
	const expected = rows[0].length;
	if (expected < 2) return false;
	return rows.every((row) => row.length === expected);
}

/**
 * Converts TSV text into markdown table syntax. Caller should first check
 * `looksLikeTsv` — this function assumes the input is well-formed TSV.
 * Returned string has no trailing newline.
 */
export function tsvToMarkdownTable(text: string): string {
	const rows = splitTsv(text);
	const [headerRow, ...dataRows] = rows;
	const shape: TsvShape = { headers: headerRow, rows: dataRows };
	return renderMarkdownTable(shape);
}

/**
 * Renders a markdown table from a parsed TSV shape. Column widths are
 * equalised with the header as the minimum — keeps pasted data readable in
 * raw markdown without relying on the table widget for formatting.
 */
export function renderMarkdownTable(shape: TsvShape): string {
	const widths = shape.headers.map((h, col) => {
		let max = h.length;
		for (const row of shape.rows) {
			const cell = row[col] ?? '';
			if (cell.length > max) max = cell.length;
		}
		return Math.max(max, 3); // 3 minimum so `---` stays visible
	});

	const pad = (text: string, width: number) => text + ' '.repeat(Math.max(0, width - text.length));

	const headerLine = `| ${shape.headers.map((h, i) => pad(h, widths[i])).join(' | ')} |`;
	const sepLine = `| ${widths.map((w) => '-'.repeat(w)).join(' | ')} |`;
	const rowLines = shape.rows.map(
		(row) => `| ${shape.headers.map((_, i) => pad(row[i] ?? '', widths[i])).join(' | ')} |`,
	);
	return [headerLine, sepLine, ...rowLines].join('\n');
}
