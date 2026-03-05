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
import { ImageWidget } from '../widgets';

/** Parsed image size from `|width` or `|widthxheight` suffix */
interface ImageSize {
	altText: string;
	width?: number;
	height?: number;
}

/**
 * Parses alt text for optional `|width` or `|widthxheight` suffix.
 * Examples: `alt|100` → width 100, `alt|100x200` → width 100 height 200
 */
export function parseImageAlt(rawAlt: string): ImageSize {
	const pipeIdx = rawAlt.lastIndexOf('|');
	if (pipeIdx !== -1) {
		const sizePart = rawAlt.slice(pipeIdx + 1);
		const sizeMatch = sizePart.match(/^(\d+)(?:x(\d+))?$/);
		if (sizeMatch) {
			return {
				altText: rawAlt.slice(0, pipeIdx),
				width: parseInt(sizeMatch[1]),
				height: sizeMatch[2] ? parseInt(sizeMatch[2]) : undefined,
			};
		}
	}
	return { altText: rawAlt };
}

/**
 * ViewPlugin that replaces `![alt](url)` image syntax with rendered `<img>` widgets.
 *
 * - Tree traversal for `Image` nodes
 * - Per-element cursor: shows source when cursor is on the image syntax
 * - `isInsideBlockContext` to skip
 * - Uses `view.visibleRanges` for performance
 */
export const imagePlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildImageDecorations(view.state, view.visibleRanges);
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update);
			if (action === 'rebuild') {
				this.decorations = buildImageDecorations(
					update.view.state,
					update.view.visibleRanges,
				);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Resolves a reference label to its URL by scanning LinkReference definitions in the document */
function resolveRefUrl(state: EditorState, label: string): string | null {
	const normalizedLabel = label.toLowerCase();
	let result: string | null = null;

	syntaxTree(state).iterate({
		enter(node) {
			if (node.name !== 'LinkReference') return;

			const labelNode = node.node.getChild('LinkLabel');
			const urlNode = node.node.getChild('URL');
			if (!labelNode || !urlNode) return;

			const defLabel = state.doc.sliceString(labelNode.from + 1, labelNode.to - 1); // strip [ ]
			if (defLabel.toLowerCase() === normalizedLabel) {
				result = state.doc.sliceString(urlNode.from, urlNode.to);
			}
		},
	});

	return result;
}

/** Builds image decorations for the given ranges */
export function buildImageDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const decorations: Range<Decoration>[] = [];

	for (const { from, to } of ranges) {
		syntaxTree(state).iterate({
			from,
			to,
			enter: (node) => {
				if (node.name !== 'Image') return;

				if (isInsideBlockContext(node)) return false;

				// Per-element: if cursor is on this image, show source
				if (shouldShowSource(state, node.from, node.to)) return false;

				const marks: { from: number; to: number }[] = [];
				const urlNode = node.node.getChild('URL');
				const linkLabel = node.node.getChild('LinkLabel');
				let child = node.node.firstChild;
				while (child) {
					if (child.name === 'LinkMark') {
						marks.push({ from: child.from, to: child.to });
					}
					child = child.nextSibling;
				}

				if (marks.length >= 4 && urlNode) {
					// Inline image ![alt](url) or ![alt|WxH](url)
					const rawAlt = state.doc.sliceString(marks[0].to, marks[1].from);
					const { altText, width, height } = parseImageAlt(rawAlt);
					const url = state.doc.sliceString(urlNode.from, urlNode.to);
					decorations.push(
						Decoration.replace({ widget: new ImageWidget(url, altText, width, height) }).range(
							node.from,
							node.to,
						),
					);
				} else if (marks.length >= 2 && linkLabel) {
					// Reference image ![alt][ref]
					const rawAlt = state.doc.sliceString(marks[0].to, marks[1].from);
					const { altText, width, height } = parseImageAlt(rawAlt);
					const refLabel = state.doc.sliceString(linkLabel.from + 1, linkLabel.to - 1);
					const url = resolveRefUrl(state, refLabel);
					if (url) {
						decorations.push(
							Decoration.replace({ widget: new ImageWidget(url, altText, width, height) }).range(
								node.from,
								node.to,
							),
						);
					}
				}

				return false;
			},
		});
	}

	return Decoration.set(decorations, true);
}
