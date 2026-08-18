import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
} from '@codemirror/view';
import type { EditorState, Range, Text } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { isInsideBlockContext } from '../core/is-inside-block-context';
import { expandedVisibleRanges } from '../core/expanded-ranges';
import { findMetaBindInputRanges } from '../parsers/meta-bind-input';
import { MetaBindSelectWidget, MetaBindTextInputWidget, MetaBindToggleWidget } from '../widgets';
import type { WidgetType } from '@codemirror/view';
import { parseFrontmatterProperties } from '$lib/features/properties/properties.logic';
import { profileStart, profileEnd } from '../core/profiling';

/**
 * ViewPlugin that handles meta-bind INPUT field decoration.
 *
 * - Replaces `` `INPUT[inlineSelect(...):bindTarget]` `` with interactive `MetaBindSelectWidget`
 * - Reads current value from frontmatter properties for initial selection
 * - Per-element cursor: shows source when cursor is on the input field
 * - Block context skip via `isInsideBlockContext`
 * - Uses `expandedVisibleRanges(view)` for performance
 */
export const metaBindInputPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		lastCursorLine: number;

		constructor(view: EditorView) {
			this.decorations = buildMetaBindInputDecorations(view.state, expandedVisibleRanges(view));
			this.lastCursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update, this.lastCursorLine);
			if (action === 'rebuild') {
				this.lastCursorLine = update.state.doc.lineAt(update.state.selection.main.head).number;
				const _t = profileStart('meta-bind-input');
				this.decorations = buildMetaBindInputDecorations(
					update.view.state,
					expandedVisibleRanges(update.view),
				);
				profileEnd('meta-bind-input', _t);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds meta-bind input decorations for the given ranges */
export function buildMetaBindInputDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const decorations: Range<Decoration>[] = [];
	const fmProperties = parseFrontmatterProperties(frontmatterSlice(state.doc));

	for (const { from, to } of ranges) {
		const startLine = state.doc.lineAt(from).number;
		const endLine = state.doc.lineAt(to).number;

		for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
			const line = state.doc.line(lineNum);

			// Skip lines inside block contexts (fenced code, HTML blocks)
			const nodeAt = syntaxTree(state).resolveInner(line.from);
			if (isInsideBlockContext(nodeAt)) continue;

			for (const range of findMetaBindInputRanges(line.text, line.from)) {
				if (shouldShowSource(state, range.from, range.to)) continue;

				const prop = fmProperties.find((p) => p.key === range.bindTarget);
				const currentValue = prop ? String(prop.value) : null;

				const widget = pickWidget(range.inputType, range.options, range.bindTarget, currentValue);
				if (!widget) continue;

				decorations.push(
					Decoration.replace({ widget }).range(range.from, range.to),
				);
			}
		}
	}

	return Decoration.set(decorations, true);
}

/**
 * Materializes only the frontmatter prefix of the document for property
 * parsing, instead of `doc.toString()` (a full-document string copy per
 * rebuild — typing lag in large notes). Parity contract: the parser's
 * `FRONTMATTER_REGEX` (`/^---\r?\n[\s\S]*?\r?\n---/`) can only match when
 * line 1 is exactly `---`, and its non-greedy body ends at the first line
 * >= 3 whose text starts with `---`. Returning '' when no fence can match
 * yields [] from the parser, exactly as the full text would.
 */
function frontmatterSlice(doc: Text): string {
	if (doc.lines < 3 || doc.line(1).text !== '---') return '';
	for (let i = 3; i <= doc.lines; i++) {
		const line = doc.line(i);
		if (line.text.startsWith('---')) return doc.sliceString(0, line.to);
	}
	return '';
}

/**
 * Dispatches a meta-bind INPUT type to its widget class. Returns null for
 * unsupported types so the plugin falls through (the legacy behaviour was
 * to treat every type as inlineSelect; now unrecognised types just skip
 * decoration and the user sees the raw `INPUT[...]` source).
 */
function pickWidget(
	inputType: string,
	options: import('../parsers/meta-bind-input').MetaBindOption[],
	bindTarget: string,
	currentValue: string | null,
): WidgetType | null {
	switch (inputType) {
		case 'number':
		case 'date':
			return new MetaBindTextInputWidget(inputType, bindTarget, currentValue);
		case 'toggle':
		case 'boolean':
			return new MetaBindToggleWidget(bindTarget, currentValue);
		case 'inlineSelect':
		default:
			// Default keeps backward compatibility: any input with options renders
			// as an inline select. Inputs without options + unknown type fall
			// through to null below.
			if (options.length > 0) {
				return new MetaBindSelectWidget(options, bindTarget, currentValue);
			}
			return null;
	}
}
