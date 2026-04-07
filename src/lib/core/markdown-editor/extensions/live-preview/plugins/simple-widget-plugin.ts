import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from '@codemirror/view';
import type { EditorState, Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNodeRef } from '@lezer/common';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { isInsideBlockContext } from '../core/is-inside-block-context';
import { expandedVisibleRanges } from '../core/expanded-ranges';
import {
	TaskCheckboxWidget,
	HorizontalRuleWidget,
	OrderedListMarkerWidget,
	UnorderedListMarkerWidget,
} from '../widgets';
import { InlineMathWidget } from '../widgets/inline-math-widget';

/** Inline widget that shows a ↵ indicator for hard line breaks */
class HardBreakWidget extends WidgetType {
	toDOM() {
		const span = document.createElement('span');
		span.className = 'cm-lp-hard-break';
		span.textContent = '↵';
		return span;
	}

	eq() {
		return true;
	}
}

/**
 * Consolidated ViewPlugin that handles 6 simple widget replacements in a single
 * syntax tree walk. Each node type is dispatched to a handler that produces
 * `Decoration.replace({ widget })` decorations.
 *
 * Merged from: task-list-plugin, horizontal-rule-plugin, ordered-list-plugin,
 * unordered-list-plugin, hard-break-plugin, inline-math-plugin.
 *
 * Uses `expandedVisibleRanges(view)` for pre-computing decorations beyond viewport.
 */
export const simpleWidgetPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		lastCursorLine: number;

		constructor(view: EditorView) {
			this.decorations = buildSimpleWidgetDecorations(view.state, expandedVisibleRanges(view));
			this.lastCursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update, this.lastCursorLine);
			if (action === 'rebuild') {
				this.lastCursorLine = update.state.doc.lineAt(update.state.selection.main.head).number;
				this.decorations = buildSimpleWidgetDecorations(
					update.view.state,
					expandedVisibleRanges(update.view),
				);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/**
 * Builds decorations for all 6 simple widget types in a single tree walk.
 * Dispatches on node name to the appropriate handler.
 */
export function buildSimpleWidgetDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const decorations: Range<Decoration>[] = [];

	for (const { from, to } of ranges) {
		syntaxTree(state).iterate({
			from,
			to,
			enter: (node) => {
				switch (node.name) {
					case 'TaskMarker':
						handleTaskMarker(node, state, decorations);
						return;
					case 'HorizontalRule':
						handleHorizontalRule(node, state, decorations);
						return false;
					case 'ListMark':
						handleListMark(node, state, decorations);
						return;
					case 'HardBreak':
						handleHardBreak(node, state, decorations);
						return false;
					case 'InlineMath':
						handleInlineMath(node, state, decorations);
						return false;
				}
			},
		});
	}

	return Decoration.set(decorations, true);
}

/** Handles TaskMarker nodes — replaces `[ ]` / `[x]` with checkbox widgets */
function handleTaskMarker(
	node: SyntaxNodeRef,
	state: EditorState,
	decorations: Range<Decoration>[],
): void {
	if (isInsideBlockContext(node)) return;

	const line = state.doc.lineAt(node.from);
	if (shouldShowSource(state, line.from, line.to)) return;

	const content = state.doc.sliceString(node.from, node.to);
	const checked = content !== '[ ]';
	decorations.push(
		Decoration.replace({
			widget: new TaskCheckboxWidget(checked, node.from),
		}).range(node.from, node.to),
	);
}

/** Handles HorizontalRule nodes — replaces `---`/`***`/`___` with `<hr>` widget */
function handleHorizontalRule(
	node: SyntaxNodeRef,
	state: EditorState,
	decorations: Range<Decoration>[],
): void {
	if (isInsideBlockContext(node)) return;
	if (shouldShowSource(state, node.from, node.to)) return;

	decorations.push(
		Decoration.replace({ widget: new HorizontalRuleWidget() }).range(node.from, node.to),
	);
}

/** Handles ListMark nodes — dispatches to ordered or unordered based on parent.
 *  Skips task list items (handled by TaskMarker instead). */
function handleListMark(
	node: SyntaxNodeRef,
	state: EditorState,
	decorations: Range<Decoration>[],
): void {
	const parent = node.node.parent;
	// Skip list marks inside task list items — the TaskMarker handler covers those.
	// Check if the ListItem parent contains a Task node (GFM task list structure).
	if (parent?.name === 'ListItem' && (parent.getChild('Task') || parent.getChild('TaskMarker'))) return;

	const grandparent = parent?.parent?.name;
	if (grandparent === 'OrderedList') {
		handleOrderedListMark(node, state, decorations);
	} else if (grandparent === 'BulletList') {
		handleUnorderedListMark(node, state, decorations);
	}
}

/** Handles ListMark inside OrderedList — replaces `1. ` with styled number widget */
function handleOrderedListMark(
	node: SyntaxNodeRef,
	state: EditorState,
	decorations: Range<Decoration>[],
): void {
	if (isInsideBlockContext(node)) return;

	const line = state.doc.lineAt(node.from);
	if (shouldShowSource(state, line.from, line.to)) return;

	const markText = state.doc.sliceString(node.from, node.to);
	const num = parseInt(markText, 10);

	let markTo = node.to;
	if (markTo < line.to && state.doc.sliceString(markTo, markTo + 1) === ' ') {
		markTo++;
	}

	decorations.push(
		Decoration.replace({ widget: new OrderedListMarkerWidget(num) }).range(node.from, markTo),
	);
}

/** Handles ListMark inside BulletList — replaces `-`/`*`/`+` with bullet widget */
function handleUnorderedListMark(
	node: SyntaxNodeRef,
	state: EditorState,
	decorations: Range<Decoration>[],
): void {
	if (isInsideBlockContext(node)) return;

	const line = state.doc.lineAt(node.from);
	if (shouldShowSource(state, line.from, line.to)) return;

	let markTo = node.to;
	if (markTo < line.to && state.doc.sliceString(markTo, markTo + 1) === ' ') {
		markTo++;
	}

	decorations.push(
		Decoration.replace({ widget: new UnorderedListMarkerWidget() }).range(node.from, markTo),
	);
}

/** Handles HardBreak nodes — replaces trailing spaces/backslash with ↵ widget */
function handleHardBreak(
	node: SyntaxNodeRef,
	state: EditorState,
	decorations: Range<Decoration>[],
): void {
	if (isInsideBlockContext(node)) return;
	if (shouldShowSource(state, node.from, node.to)) return;

	const replaceEnd = state.doc.lineAt(node.from).to;
	decorations.push(
		Decoration.replace({ widget: new HardBreakWidget() }).range(node.from, replaceEnd),
	);
}

/** Handles InlineMath nodes — replaces `$formula$` with rendered KaTeX widget */
function handleInlineMath(
	node: SyntaxNodeRef,
	state: EditorState,
	decorations: Range<Decoration>[],
): void {
	if (isInsideBlockContext(node)) return;
	if (shouldShowSource(state, node.from, node.to)) return;

	const formula = state.doc.sliceString(node.from + 1, node.to - 1);
	decorations.push(
		Decoration.replace({ widget: new InlineMathWidget(formula) }).range(node.from, node.to),
	);
}
