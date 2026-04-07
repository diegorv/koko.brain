import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { findAllTables } from '../parsers/table';
import { TableWidget } from '../widgets';
import { hiddenLineDeco } from '../styles';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { parseFrontmatterProperties } from '$lib/features/properties/properties.logic';
import type { Property } from '$lib/features/properties/properties.types';
import { appendLog } from '$lib/utils/log.service';

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
 * ViewPlugin that manages table decorations independently.
 * Uses Lezer syntax tree (GFM `Table` nodes) for robust detection.
 * Replaces the first line with a TableWidget and hides remaining lines when cursor is outside.
 * Passes frontmatter properties to TableWidget for meta-bind input rendering in cells.
 */
export const tableField = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		lastCursorLine: number;
		constructor(view: EditorView) {
			this.decorations = computeTables(view.state);
			this.lastCursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
		}
		update(update: ViewUpdate) {
			if (update.viewportChanged && !update.docChanged && !update.selectionSet) return;
			if (checkUpdateAction(update, this.lastCursorLine) === 'rebuild') {
				this.lastCursorLine = update.state.doc.lineAt(update.state.selection.main.head).number;
				const _t = performance.now();
				this.decorations = computeTables(update.state);
				const _d = performance.now() - _t; if (_d > 0.5) appendLog('LP-PROFILE', `table: ${_d.toFixed(1)}ms`);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);
