import { Decoration } from '@codemirror/view';

import { headingLineDeco } from '../../styles';
import type { InlineHandler, InlineDecorationEntry } from '../inline-formatting-plugin';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const LEVELS: readonly HeadingLevel[] = [1, 2, 3, 4, 5, 6];

/**
 * Handler for ATX headings (`# Heading`, `## Heading`, …). For each level N,
 * emits two decorations:
 *   1. `Decoration.line({ class: 'cm-lp-hN' })` on the heading's .cm-line so
 *      font-size / line-height / color live on the whole line element (the
 *      tag-based HighlightStyle would attach the class to a child span,
 *      breaking vertical rhythm because line-height isn't honored inline).
 *   2. `Decoration.mark({ class: 'cm-formatting-block [-visible]' })` on the
 *      `HeaderMark` (`#`, `##`, …) + the trailing space. Cursor-reveal: when
 *      the cursor is anywhere on the heading line the `-visible` suffix is
 *      added so the CSS animates the marks back in.
 *
 * Factory is called once per level at module load so the registry can dispatch
 * by exact Lezer node name (ATXHeading1..6).
 */
function makeAtxHandler(level: HeadingLevel): InlineHandler {
	return {
		nodeType: `ATXHeading${level}`,
		decorate: ({ state, node, isTouched }) => {
			const line = state.doc.lineAt(node.from);
			const entries: InlineDecorationEntry[] = [
				{
					from: line.from,
					to: line.from,
					deco: headingLineDeco[level],
				},
			];

			const headerMark = node.node.getChild('HeaderMark');
			if (headerMark) {
				const markTo = Math.min(headerMark.to + 1, line.to);
				const touched = isTouched(line.from, line.to);
				const cls = touched
					? 'cm-formatting-block cm-formatting-block-visible'
					: 'cm-formatting-block';
				entries.push({
					from: headerMark.from,
					to: markTo,
					deco: Decoration.mark({ class: cls }),
				});
			}

			return entries;
		},
	};
}

/**
 * Handler for Setext headings (`Heading\n======` or `Heading\n------`). For
 * each level N (Lezer emits SetextHeading1 or SetextHeading2) emits:
 *   1. `Decoration.line({ class: 'cm-lp-hN' })` on the text line.
 *   2. `Decoration.mark({ class: 'cm-formatting-block [-visible]' })` covering
 *      the underline row (`===` / `---`). Cursor-reveal matches any cursor
 *      inside the full setext span.
 */
function makeSetextHandler(level: 1 | 2): InlineHandler {
	return {
		nodeType: `SetextHeading${level}`,
		decorate: ({ state, node, isTouched }) => {
			const textLine = state.doc.lineAt(node.from);
			const underlineLine = state.doc.lineAt(node.to);
			const touched = isTouched(node.from, node.to);
			const cls = touched
				? 'cm-formatting-block cm-formatting-block-visible'
				: 'cm-formatting-block';
			return [
				{
					from: textLine.from,
					to: textLine.from,
					deco: headingLineDeco[level],
				},
				{
					from: underlineLine.from,
					to: underlineLine.to,
					deco: Decoration.mark({ class: cls }),
				},
			];
		},
	};
}

/** Every heading handler — six ATX levels plus two setext levels. */
export const headingHandlers: readonly InlineHandler[] = [
	...LEVELS.map(makeAtxHandler),
	makeSetextHandler(1),
	makeSetextHandler(2),
];
