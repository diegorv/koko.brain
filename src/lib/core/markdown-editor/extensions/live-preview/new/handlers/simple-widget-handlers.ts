import { Decoration } from '@codemirror/view';

import { TaskCheckboxWidget, OrderedListMarkerWidget } from '../../widgets';
import { InlineMathWidget } from '../../widgets/inline-math-widget';
import type {
	InlineHandler,
	InlineHandlerResult,
	InlineDecorationEntry,
} from '../inline-formatting-plugin';

/**
 * Handlers for the small inline widgets & replacements that collectively
 * retired 6 legacy plugins (task-list, horizontal-rule, ordered-list,
 * unordered-list, hard-break, inline-math).
 *
 * Every handler short-circuits when the line (or node) is under the cursor so
 * raw markdown stays editable; this is the live-preview contract inherited
 * from the legacy simpleWidgetPlugin.
 */

/** `[ ]` / `[x]` → TaskCheckboxWidget. Skips when cursor is on the line. */
const taskMarkerHandler: InlineHandler = {
	nodeType: 'TaskMarker',
	decorate: ({ state, node, isTouched }) => {
		const line = state.doc.lineAt(node.from);
		if (isTouched(line.from, line.to)) return null;
		const checked = state.doc.sliceString(node.from, node.to) !== '[ ]';
		return {
			from: node.from,
			to: node.to,
			deco: Decoration.replace({ widget: new TaskCheckboxWidget(checked, node.from) }),
		};
	},
};

/** `---`/`***`/`___` → `cm-formatting-hr` mark + `cm-lp-hr-line` line deco. */
const horizontalRuleHandler: InlineHandler = {
	nodeType: 'HorizontalRule',
	decorate: ({ state, node, isTouched }): InlineHandlerResult => {
		if (isTouched(node.from, node.to)) return null;
		const line = state.doc.lineAt(node.from);
		return [
			{ from: node.from, to: node.to, deco: Decoration.mark({ class: 'cm-formatting-hr' }) },
			{ from: line.from, to: line.from, deco: Decoration.line({ class: 'cm-lp-hr-line' }) },
		];
	},
};

/** `- `/`* `/`+ ` (or `1. ` in ordered lists). Parent decides task vs ordered vs unordered. */
const listMarkHandler: InlineHandler = {
	nodeType: 'ListMark',
	decorate: ({ state, node, isTouched }): InlineHandlerResult => {
		const parent = node.node.parent;
		const line = state.doc.lineAt(node.from);
		if (isTouched(line.from, line.to)) return null;

		let markTo = node.to;
		if (markTo < line.to && state.doc.sliceString(markTo, markTo + 1) === ' ') markTo++;

		const isTask = parent?.name === 'ListItem' && (parent.getChild('Task') || parent.getChild('TaskMarker'));
		if (isTask) {
			// Hide `- ` so only the checkbox shows.
			return {
				from: node.from,
				to: markTo,
				deco: Decoration.mark({ class: 'cm-formatting-task-marker' }),
			};
		}

		const gp = parent?.parent?.name;
		if (gp === 'OrderedList') {
			const num = parseInt(state.doc.sliceString(node.from, node.to), 10);
			return {
				from: node.from,
				to: markTo,
				deco: Decoration.replace({ widget: new OrderedListMarkerWidget(num) }),
			};
		}

		if (gp === 'BulletList') {
			// Defensive: Lezer sometimes parses "- [x]" as BulletList + inline text instead of TaskMarker.
			// If the remaining line text IS a task marker, skip — otherwise we'd hide "- " and leave "[x]" orphan.
			const rest = state.doc.sliceString(markTo, line.to).trim();
			if (/^\[.\]$/.test(rest)) return null;
			return {
				from: node.from,
				to: markTo,
				deco: Decoration.mark({ class: 'cm-formatting-ul-marker' }),
			};
		}

		return null;
	},
};

/** Trailing ` \\` / `  ` → `cm-formatting-hard-break` (shows `↵` via ::after). */
const hardBreakHandler: InlineHandler = {
	nodeType: 'HardBreak',
	decorate: ({ state, node, isTouched }): InlineDecorationEntry | null => {
		if (isTouched(node.from, node.to)) return null;
		const replaceEnd = state.doc.lineAt(node.from).to;
		return {
			from: node.from,
			to: replaceEnd,
			deco: Decoration.mark({ class: 'cm-formatting-hard-break' }),
		};
	},
};

/** `$formula$` → InlineMathWidget. */
const inlineMathHandler: InlineHandler = {
	nodeType: 'InlineMath',
	decorate: ({ state, node, isTouched }): InlineDecorationEntry | null => {
		if (isTouched(node.from, node.to)) return null;
		const formula = state.doc.sliceString(node.from + 1, node.to - 1);
		return {
			from: node.from,
			to: node.to,
			deco: Decoration.replace({ widget: new InlineMathWidget(formula) }),
		};
	},
};

export const simpleWidgetHandlers: readonly InlineHandler[] = [
	taskMarkerHandler,
	horizontalRuleHandler,
	listMarkHandler,
	hardBreakHandler,
	inlineMathHandler,
];
