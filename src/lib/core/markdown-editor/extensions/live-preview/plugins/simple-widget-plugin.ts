import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
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
	OrderedListMarkerWidget,
} from '../widgets';
import { InlineMathWidget } from '../widgets/inline-math-widget';
import { profileStart, profileEnd } from '../core/profiling';


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
				const _t = profileStart();
				this.decorations = buildSimpleWidgetDecorations(
					update.view.state,
					expandedVisibleRanges(update.view),
				);
				profileEnd('simple-widget', _t);
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
	// expandedVisibleRanges can overlap, causing the same node to be visited
	// multiple times. Decoration.mark() with ::before/::after (ListMark, HardBreak)
	// produces extra visual elements per duplicate. Track seen positions to skip.
	// Key uses "name:from" because different node types can share the same from.
	const seen = new Set<string>();

	for (const { from, to } of ranges) {
		syntaxTree(state).iterate({
			from,
			to,
			enter: (node) => {
				switch (node.name) {
					case 'TaskMarker': {
						const key = `T${node.from}`;
						if (seen.has(key)) return;
						seen.add(key);
						handleTaskMarker(node, state, decorations);
						return;
					}
					case 'HorizontalRule': {
						const key = `H${node.from}`;
						if (seen.has(key)) return false;
						seen.add(key);
						handleHorizontalRule(node, state, decorations);
						return false;
					}
					case 'ListMark': {
						const key = `L${node.from}`;
						if (seen.has(key)) return;
						seen.add(key);
						handleListMark(node, state, decorations);
						return;
					}
					case 'HardBreak': {
						const key = `B${node.from}`;
						if (seen.has(key)) return false;
						seen.add(key);
						handleHardBreak(node, state, decorations);
						return false;
					}
					case 'InlineMath': {
						const key = `M${node.from}`;
						if (seen.has(key)) return false;
						seen.add(key);
						handleInlineMath(node, state, decorations);
						return false;
					}
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

/** Handles HorizontalRule nodes — hides `---`/`***`/`___` text via CSS mark
 *  and shows a styled border via line decoration. No widget = no DOM reflow. */
function handleHorizontalRule(
	node: SyntaxNodeRef,
	state: EditorState,
	decorations: Range<Decoration>[],
): void {
	if (isInsideBlockContext(node)) return;
	if (shouldShowSource(state, node.from, node.to)) return;

	// Hide the rule text (---, ***, ___) via CSS font-size: 0
	decorations.push(
		Decoration.mark({ class: 'cm-formatting-hr' }).range(node.from, node.to),
	);
	// Apply the visual horizontal line via a line decoration (border-bottom)
	decorations.push(
		Decoration.line({ class: 'cm-lp-hr-line' }).range(state.doc.lineAt(node.from).from),
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
	const isTaskItem = parent?.name === 'ListItem' && (parent.getChild('Task') || parent.getChild('TaskMarker'));

	// Task list items: hide the "- " marker (no bullet) so only the checkbox shows
	if (isTaskItem) {
		handleTaskListMark(node, state, decorations);
		return;
	}

	const grandparent = parent?.parent?.name;
	if (grandparent === 'OrderedList') {
		handleOrderedListMark(node, state, decorations);
	} else if (grandparent === 'BulletList') {
		handleUnorderedListMark(node, state, decorations);
	}
}

/** Handles ListMark inside task list items — hides `- ` so only the checkbox shows */
function handleTaskListMark(
	node: SyntaxNodeRef,
	state: EditorState,
	decorations: Range<Decoration>[],
): void {
	const line = state.doc.lineAt(node.from);
	if (shouldShowSource(state, line.from, line.to)) return;

	let markTo = node.to;
	if (markTo < line.to && state.doc.sliceString(markTo, markTo + 1) === ' ') {
		markTo++;
	}

	decorations.push(
		Decoration.mark({ class: 'cm-formatting-task-marker' }).range(node.from, markTo),
	);
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

/** Handles ListMark inside BulletList — hides `-`/`*`/`+` via CSS and shows `•`
 *  via ::before pseudo-element. No widget = no DOM reflow. */
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

	// Skip if the remaining text looks like an incomplete task marker (e.g. "- [ ]" without text).
	// Lezer doesn't parse this as TaskMarker, so hiding the "- " would leave orphan "[ ]" text.
	const rest = state.doc.sliceString(markTo, line.to).trim();
	if (/^\[.\]$/.test(rest)) return;

	// Hide the marker text (-, *, +) and trailing space via CSS font-size: 0
	// The bullet • is shown via ::before pseudo-element
	decorations.push(
		Decoration.mark({ class: 'cm-formatting-ul-marker' }).range(node.from, markTo),
	);
}

/** Handles HardBreak nodes — hides trailing spaces/backslash via CSS and shows `↵`
 *  via ::after pseudo-element. No widget = no DOM reflow. */
function handleHardBreak(
	node: SyntaxNodeRef,
	state: EditorState,
	decorations: Range<Decoration>[],
): void {
	if (isInsideBlockContext(node)) return;
	if (shouldShowSource(state, node.from, node.to)) return;

	const replaceEnd = state.doc.lineAt(node.from).to;
	// Hide the break source (\\ or trailing spaces) via CSS font-size: 0
	// The ↵ indicator is shown via ::after pseudo-element
	decorations.push(
		Decoration.mark({ class: 'cm-formatting-hard-break' }).range(node.from, replaceEnd),
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
