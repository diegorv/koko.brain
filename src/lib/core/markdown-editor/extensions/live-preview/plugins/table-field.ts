import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { findAllTables } from '../parsers/table';
import { TableWidget } from '../widgets';
import { hiddenLineDeco } from '../styles';
import { blockDecorator } from '../core/block-decorator';
import { shouldShowSource } from '../core/should-show-source';
import { frontmatterSlice } from '../core/frontmatter-slice';
import { parseFrontmatterProperties } from '$lib/features/properties/properties.logic';
import type { Property } from '$lib/features/properties/properties.types';

/** Computes table decorations using the Lezer syntax tree */
export function computeTables(state: EditorState): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const fmProperties: Property[] = parseFrontmatterProperties(frontmatterSlice(state.doc));
	const tables = findAllTables(state);

	for (const table of tables) {
		// When cursor is inside the table, show raw markdown
		if (shouldShowSource(state, table.from, table.to)) continue;

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
		for (let lineNum = table.startLine + 1; lineNum <= table.endLine; lineNum++) {
			const line = state.doc.line(lineNum);
			builder.add(line.from, line.from, hiddenLineDeco);
			builder.add(line.from, line.to, Decoration.replace({}));
		}
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
