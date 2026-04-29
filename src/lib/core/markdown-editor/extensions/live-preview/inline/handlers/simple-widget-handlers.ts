import { Decoration } from '@codemirror/view';
import { TaskCheckboxWidget, OrderedListMarkerWidget, UnorderedListMarkerWidget } from '../../widgets';
import { InlineMathWidget } from '../../widgets/inline-math-widget';
import type { NodeHandler } from '../inline-formatting-plugin';

/**
 * Handlers for the 5 simple-widget types the legacy `simpleWidgetPlugin`
 * covered: TaskMarker, HorizontalRule, ListMark (dispatched by parent into
 * task / ordered / unordered), HardBreak, InlineMath.
 *
 * All five reuse the existing widget classes (`TaskCheckboxWidget`,
 * `OrderedListMarkerWidget`, `InlineMathWidget`) so the rendered DOM is
 * identical to the legacy path. The `inlineFormattingPlugin` gives us
 * block-context skip + per-node dedup for free; cursor reveal short-circuits
 * via `isTouched` to render raw markdown when the cursor is on the line.
 */

/** TaskMarker (`[ ]` / `[x]`) → checkbox widget (when cursor not on line). */
export const taskMarkerHandler: NodeHandler = {
	nodeType: 'TaskMarker',
	decorate({ node, state, isTouched, decorations }) {
		const line = state.doc.lineAt(node.from);
		if (isTouched(line.from, line.to)) return;

		const content = state.doc.sliceString(node.from, node.to);
		const checked = content !== '[ ]';
		decorations.push(
			Decoration.replace({ widget: new TaskCheckboxWidget(checked, node.from) })
				.range(node.from, node.to),
		);
	},
};

/** HorizontalRule (`---` / `***` / `___`) → hidden text + line border. */
export const horizontalRuleHandler: NodeHandler = {
	nodeType: 'HorizontalRule',
	decorate({ node, state, isTouched, decorations }) {
		if (isTouched(node.from, node.to)) return;
		decorations.push(
			Decoration.mark({ class: 'cm-formatting-hr' }).range(node.from, node.to),
		);
		decorations.push(
			Decoration.line({ class: 'cm-lp-hr-line' }).range(state.doc.lineAt(node.from).from),
		);
	},
};

/**
 * ListMark — dispatch by parent context.
 *   - Task list item   → hide `- ` so only the checkbox shows
 *   - OrderedList item → replace `1. ` with styled-number widget
 *   - BulletList item  → hide `-`/`*`/`+` so the `::before` bullet shows
 * If the rest-of-line looks like an incomplete task marker (`- [ ]` with no
 * text), skip — Lezer didn't parse this as TaskMarker, so hiding the dash
 * would orphan a literal `[ ]`.
 */
export const listMarkHandler: NodeHandler = {
	nodeType: 'ListMark',
	decorate({ node, state, isTouched, decorations }) {
		const parent = node.node.parent;
		if (!parent) return;

		const line = state.doc.lineAt(node.from);
		if (isTouched(line.from, line.to)) return;

		const isTaskItem = parent.name === 'ListItem' && (parent.getChild('Task') || parent.getChild('TaskMarker'));

		// Compute the trailing-space-included end position once
		let markTo = node.to;
		if (markTo < line.to && state.doc.sliceString(markTo, markTo + 1) === ' ') {
			markTo++;
		}

		if (isTaskItem) {
			decorations.push(
				Decoration.mark({ class: 'cm-formatting-task-marker' }).range(node.from, markTo),
			);
			return;
		}

		const grandparent = parent.parent?.name;
		if (grandparent === 'OrderedList') {
			const markText = state.doc.sliceString(node.from, node.to);
			const num = parseInt(markText, 10);
			decorations.push(
				Decoration.replace({ widget: new OrderedListMarkerWidget(num) })
					.range(node.from, markTo),
			);
		} else if (grandparent === 'BulletList') {
			// Skip incomplete task markers (`- [ ]` without text)
			const rest = state.doc.sliceString(markTo, line.to).trim();
			if (/^\[.\]$/.test(rest)) return;
			decorations.push(
				Decoration.replace({ widget: new UnorderedListMarkerWidget() })
					.range(node.from, markTo),
			);
		}
	},
};

/** HardBreak (trailing spaces / `\`) → hide source, ::after shows `↵`. */
export const hardBreakHandler: NodeHandler = {
	nodeType: 'HardBreak',
	decorate({ node, state, isTouched, decorations }) {
		if (isTouched(node.from, node.to)) return;
		const replaceEnd = state.doc.lineAt(node.from).to;
		decorations.push(
			Decoration.mark({ class: 'cm-formatting-hard-break' }).range(node.from, replaceEnd),
		);
	},
};

/** InlineMath (`$formula$`) → KaTeX widget (when cursor not on math). */
export const inlineMathHandler: NodeHandler = {
	nodeType: 'InlineMath',
	decorate({ node, state, isTouched, decorations }) {
		if (isTouched(node.from, node.to)) return;
		const formula = state.doc.sliceString(node.from + 1, node.to - 1);
		decorations.push(
			Decoration.replace({ widget: new InlineMathWidget(formula) }).range(node.from, node.to),
		);
	},
};

/** All 5 simple-widget handlers, registered as a single bundle. */
export const simpleWidgetHandlers: readonly NodeHandler[] = [
	taskMarkerHandler,
	horizontalRuleHandler,
	listMarkHandler,
	hardBreakHandler,
	inlineMathHandler,
];
