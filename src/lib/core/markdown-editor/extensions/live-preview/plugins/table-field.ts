import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { findAllTables } from '../parsers/table';
import { TableWidget } from '../widgets';
import { hideLines } from '../core/hide-lines';
import { blockDecorator } from '../core/block-decorator';
import { revealPredicate } from '../core/reveal';
import { tableLineDeco } from '../styles';
import { frontmatterSlice } from '../core/frontmatter-slice';
import { parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import type { Property } from '#lib/core/frontmatter/properties.types.js';

/** Computes table decorations using the Lezer syntax tree */
export function computeTables(state: EditorState): DecorationSet {
	const isRevealed = revealPredicate(state);
	const builder = new RangeSetBuilder<Decoration>();
	const fmProperties: Property[] = parseFrontmatterProperties(frontmatterSlice(state.doc));
	const tables = findAllTables(state);

	for (const table of tables) {
		// When cursor is inside the table, show raw markdown at the widget's size
		if (isRevealed(table.from, table.to)) {
			for (let n = table.startLine; n <= table.endLine; n++) {
				const line = state.doc.line(n);
				builder.add(line.from, line.from, tableLineDeco);
			}
			continue;
		}

		// First line: replace with the TableWidget
		const firstLine = state.doc.line(table.startLine);
		builder.add(
			firstLine.from,
			firstLine.to,
			Decoration.replace({
				widget: new TableWidget(
					table.headers,
					table.alignments,
					table.rows,
					fmProperties,
					{
						from: table.from,
						to: table.to,
						startLine: table.startLine,
						endLine: table.endLine,
					},
				),
			}),
		);

		// Remaining lines: hide text and collapse line element
		hideLines(builder, state.doc, table.startLine + 1, table.endLine);
	}

	return builder.finish();
}

/**
 * ViewPlugin that manages table decorations independently.
 * Uses Lezer syntax tree (GFM `Table` nodes) for robust detection.
 * Replaces the first line with a TableWidget and hides remaining lines when cursor is outside.
 * Passes frontmatter properties to TableWidget for meta-bind input rendering in cells.
 */
export const tableField = blockDecorator({
	settingsKey: 'table',
	profileLabel: 'table',
	compute: computeTables,
});
