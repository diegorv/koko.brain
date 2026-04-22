import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { findAllTables } from '../parsers/table';
import { TableWidget } from '../widgets/table-widget';
import { hiddenLineDeco } from '../styles';
import { shouldShowSource } from '../core/should-show-source';
import { parseFrontmatterProperties } from '$lib/features/properties/properties.logic';
import type { Property } from '$lib/features/properties/properties.types';
import { buildBlockField } from '../core/build-block-field';

/** Computes table decorations using the Lezer syntax tree */
export function computeTables(state: EditorState): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const fmProperties: Property[] = parseFrontmatterProperties(state.doc.toString());
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
				widget: new TableWidget(table.headers, table.alignments, table.rows, fmProperties),
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
 * ViewPlugin that manages table decorations independently. Uses the shared
 * `buildBlockField` scaffolding for rebuild gating, cursor tracking and
 * profiling. Passes frontmatter properties to TableWidget so meta-bind
 * inputs inside cells can read the current value.
 */
export const tableField = buildBlockField({ name: 'table', compute: computeTables });
