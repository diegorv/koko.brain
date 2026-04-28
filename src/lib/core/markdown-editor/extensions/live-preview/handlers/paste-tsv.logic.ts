/**
 * Pure parser: TSV / Excel-clipboard text → markdown table.
 *
 * Triggered by `paste-tsv-handler.ts` when the user pastes clipboard text
 * that looks tabular. The detection threshold + the actual paste flow live
 * in the handler; this file is just the conversion + sniffing logic so it
 * can be unit-tested without DOM events.
 *
 * Recognised input shapes:
 *   - TSV (tab-separated, possibly with embedded `\n` inside `"…"` quoted cells)
 *   - Excel/Numbers HTML clipboard often serialises as TSV when the user
 *     copies a range and the receiver asks for `text/plain`
 *
 * Anything that doesn't have at least one tab AND at least 2 columns on the
 * first non-empty row is not considered tabular.
 */

/** Conservative test: pasted text looks like TSV (≥1 tab + ≥2 cells in first row). */
export function looksLikeTSV(text: string): boolean {
	if (!text || !text.includes('\t')) return false;
	// First non-empty logical row, respecting `"…"` quoting (so we don't
	// accept `"a\nb"` as 2 rows).
	const rows = parseTSVRows(text);
	if (rows.length === 0) return false;
	return rows[0].length >= 2;
}

/**
 * Parses raw TSV/Excel clipboard text into a 2D array of cells. Honours
 * Excel's quoting convention: a cell containing `\t`, `\n`, or `"` is
 * wrapped in `"…"`, and inner `"` are escaped as `""`.
 */
export function parseTSVRows(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let inQuotes = false;
	let i = 0;

	const pushCell = () => {
		row.push(cell);
		cell = '';
	};
	const pushRow = () => {
		pushCell();
		rows.push(row);
		row = [];
	};

	while (i < text.length) {
		const ch = text[i];

		if (inQuotes) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					cell += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i++;
				continue;
			}
			cell += ch;
			i++;
			continue;
		}

		if (ch === '"' && cell.length === 0) {
			inQuotes = true;
			i++;
			continue;
		}
		if (ch === '\t') {
			pushCell();
			i++;
			continue;
		}
		if (ch === '\r') {
			// Normalise CRLF → LF
			i++;
			continue;
		}
		if (ch === '\n') {
			pushRow();
			i++;
			continue;
		}
		cell += ch;
		i++;
	}

	// Final cell / row if buffer non-empty
	if (cell.length > 0 || row.length > 0) {
		pushRow();
	}

	// Drop trailing empty rows (Excel often appends one)
	while (rows.length > 0) {
		const last = rows[rows.length - 1];
		if (last.length === 0 || (last.length === 1 && last[0] === '')) {
			rows.pop();
		} else {
			break;
		}
	}

	return rows;
}

/**
 * Converts a 2D array of cells into a markdown pipe table. Uses the first
 * row as headers (Excel/Numbers clipboards usually start with header row).
 *
 * Cell content: pipes (`|`) escaped as `\|`, embedded newlines collapsed
 * to `<br>` (markdown-renderer compatible).
 */
export function tsvRowsToMarkdownTable(rows: string[][]): string {
	if (rows.length === 0) return '';

	const cols = Math.max(...rows.map((r) => r.length));
	const padded = rows.map((r) => {
		if (r.length === cols) return r;
		const out = r.slice();
		while (out.length < cols) out.push('');
		return out;
	});

	const escape = (cell: string) =>
		cell.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');

	const lines: string[] = [];
	const header = padded[0].map(escape);
	lines.push(`| ${header.join(' | ')} |`);
	lines.push(`| ${header.map(() => '---').join(' | ')} |`);
	for (let r = 1; r < padded.length; r++) {
		lines.push(`| ${padded[r].map(escape).join(' | ')} |`);
	}
	return lines.join('\n');
}

/**
 * One-shot convenience: clipboard text → markdown table string, or `null`
 * if the input doesn't look tabular. Returned string has no trailing
 * newline; caller decides surrounding spacing.
 */
export function clipboardToMarkdownTable(text: string): string | null {
	if (!looksLikeTSV(text)) return null;
	const rows = parseTSVRows(text);
	if (rows.length === 0) return null;
	return tsvRowsToMarkdownTable(rows);
}
