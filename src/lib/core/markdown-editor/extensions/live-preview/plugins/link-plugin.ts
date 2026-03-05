import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
} from '@codemirror/view';
import type { EditorState, Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { isInsideBlockContext } from '../core/is-inside-block-context';
import { linkTextDeco, wikilinkTextDeco } from '../styles';
import { findWikilinkRanges } from '../../wikilink/decoration.logic';
import { findExtendedAutolinkRanges } from '../parsers/link';

/**
 * ViewPlugin that handles all link decoration — markdown links and wikilinks.
 *
 * - **Markdown links** `[text](url)`: Lezer `Link` node traversal. Hides `[` and `](url)`,
 *   styles link text with `cm-lp-link`.
 * - **Wikilinks** `[[target]]`: Regex-based. Hides `[[` and `]]`, styles content with
 *   `cm-lp-wikilink`. Handles display text (`[[target|display]]`), headings, block-ids.
 * - Per-element cursor: each link checked individually via `shouldShowSource`
 * - Block context skip via `isInsideBlockContext`
 * - Uses `view.visibleRanges` for performance
 *
 * Note: Click handling (Cmd+click to open) stays in `click-handler.ts` as a separate extension.
 * Wikilink completion stays in `extensions/wikilink/completion.ts`.
 */
export const linkPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildLinkDecorations(view.state, view.visibleRanges);
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update);
			if (action === 'rebuild') {
				this.decorations = buildLinkDecorations(
					update.view.state,
					update.view.visibleRanges,
				);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds link decorations (markdown + wikilink) for the given ranges */
export function buildLinkDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const decorations: Range<Decoration>[] = [];

	for (const { from, to } of ranges) {
		addMarkdownLinkDecorations(state, from, to, decorations);
		addAutolinkDecorations(state, from, to, decorations);
		addExtendedAutolinkDecorations(state, from, to, decorations);
		addWikilinkDecorations(state, from, to, decorations);
	}

	return Decoration.set(decorations, true);
}

/** Adds decorations for markdown links `[text](url)` and reference links `[text][ref]` using Lezer tree */
function addMarkdownLinkDecorations(
	state: EditorState,
	from: number,
	to: number,
	decorations: Range<Decoration>[],
): void {
	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			if (node.name === 'Link') {
				if (isInsideBlockContext(node)) return false;

				const isTouched = shouldShowSource(state, node.from, node.to);
				if (isTouched) return false;

				const marks: { from: number; to: number }[] = [];
				let linkLabel: { from: number; to: number } | null = null;
				let child = node.node.firstChild;
				while (child) {
					if (child.name === 'LinkMark') {
						marks.push({ from: child.from, to: child.to });
					} else if (child.name === 'LinkLabel') {
						linkLabel = { from: child.from, to: child.to };
					}
					child = child.nextSibling;
				}

				const cls = 'cm-formatting-inline';

				if (marks.length >= 4) {
					// Inline link [text](url): hide [ and ](url)
					decorations.push(
						Decoration.mark({ class: cls }).range(marks[0].from, marks[0].to),
					);
					decorations.push(
						linkTextDeco.range(marks[0].to, marks[1].from),
					);
					decorations.push(
						Decoration.mark({ class: cls }).range(marks[1].from, marks[marks.length - 1].to),
					);
				} else if (marks.length >= 2 && linkLabel) {
					// Reference link [text][ref]: hide [ and ][ref]
					decorations.push(
						Decoration.mark({ class: cls }).range(marks[0].from, marks[0].to),
					);
					decorations.push(
						linkTextDeco.range(marks[0].to, marks[1].from),
					);
					decorations.push(
						Decoration.mark({ class: cls }).range(marks[1].from, linkLabel.to),
					);
				}

				return false;
			}

			// Link reference definitions [ref]: url — dim the whole line
			if (node.name === 'LinkReference') {
				if (shouldShowSource(state, node.from, node.to)) return false;

				decorations.push(
					Decoration.mark({ class: 'cm-lp-link-ref-def' }).range(node.from, node.to),
				);

				return false;
			}
		},
	});
}

/** Adds decorations for autolinks `<url>` / `<email>` using Lezer tree */
function addAutolinkDecorations(
	state: EditorState,
	from: number,
	to: number,
	decorations: Range<Decoration>[],
): void {
	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			if (node.name !== 'Autolink') return;

			if (isInsideBlockContext(node)) return false;

			if (shouldShowSource(state, node.from, node.to)) return false;

			const cls = 'cm-formatting-inline';

			// Hide opening < mark
			decorations.push(
				Decoration.mark({ class: cls }).range(node.from, node.from + 1),
			);
			// Style URL/email text
			decorations.push(
				linkTextDeco.range(node.from + 1, node.to - 1),
			);
			// Hide closing > mark
			decorations.push(
				Decoration.mark({ class: cls }).range(node.to - 1, node.to),
			);

			return false;
		},
	});
}

/** Adds decorations for bare URLs (extended autolinks) like `https://example.com` */
function addExtendedAutolinkDecorations(
	state: EditorState,
	from: number,
	to: number,
	decorations: Range<Decoration>[],
): void {
	const startLine = state.doc.lineAt(from).number;
	const endLine = state.doc.lineAt(to).number;

	// Collect ranges already handled by Lezer Link/Autolink nodes to avoid double-decorating
	const handledRanges: { from: number; to: number }[] = [];
	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			if (node.name === 'Link' || node.name === 'Autolink' || node.name === 'Image') {
				handledRanges.push({ from: node.from, to: node.to });
			}
		},
	});

	for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
		const line = state.doc.line(lineNum);

		const nodeAt = syntaxTree(state).resolveInner(line.from);
		if (isInsideBlockContext(nodeAt)) continue;

		const ranges = findExtendedAutolinkRanges(line.text, line.from);

		for (const range of ranges) {
			// Skip if this URL is already inside a Link/Autolink/Image node
			const isHandled = handledRanges.some(
				(h) => range.from >= h.from && range.to <= h.to,
			);
			if (isHandled) continue;

			if (shouldShowSource(state, range.from, range.to)) continue;

			decorations.push(linkTextDeco.range(range.from, range.to));
		}
	}
}

/** Adds decorations for wikilinks `[[target]]` using regex */
function addWikilinkDecorations(
	state: EditorState,
	from: number,
	to: number,
	decorations: Range<Decoration>[],
): void {
	const startLine = state.doc.lineAt(from).number;
	const endLine = state.doc.lineAt(to).number;

	for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
		const line = state.doc.line(lineNum);

		// Check if line is inside a block context
		const nodeAt = syntaxTree(state).resolveInner(line.from);
		if (isInsideBlockContext(nodeAt)) continue;

		const ranges = findWikilinkRanges(line.text, line.from);

		for (const range of ranges) {
			const wikilinkFrom = range.openBracketFrom;
			const wikilinkTo = range.closeBracketTo;

			// Per-element: if cursor is on this wikilink, show source
			if (shouldShowSource(state, wikilinkFrom, wikilinkTo)) continue;

			const cls = 'cm-formatting-inline';

			if (range.displayFrom !== null && range.displayTo !== null) {
				// [[Target|Display]] — hide from [[ through pipe, style display, hide ]]
				decorations.push(
					Decoration.mark({ class: cls }).range(range.openBracketFrom, range.displayFrom + 1),
				);
				decorations.push(
					wikilinkTextDeco.range(range.displayFrom + 1, range.displayTo),
				);
				decorations.push(
					Decoration.mark({ class: cls }).range(range.closeBracketFrom, range.closeBracketTo),
				);
			} else {
				// [[Target]], [[Target#Heading]], [[Target#^block-id]]
				decorations.push(
					Decoration.mark({ class: cls }).range(range.openBracketFrom, range.openBracketTo),
				);
				const contentEnd = range.headingTo ?? range.blockIdTo ?? range.targetTo;
				decorations.push(
					wikilinkTextDeco.range(range.targetFrom, contentEnd),
				);
				decorations.push(
					Decoration.mark({ class: cls }).range(range.closeBracketFrom, range.closeBracketTo),
				);
			}
		}
	}
}
