import { Decoration } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

import { ImageWidget } from '../../widgets/image-widget';
import type { InlineHandler } from '../inline-formatting-plugin';

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

/** Resolves a reference label to its URL by scanning LinkReference definitions. */
function resolveRefUrl(state: EditorState, label: string): string | null {
	const normalizedLabel = label.toLowerCase();
	let result: string | null = null;
	syntaxTree(state).iterate({
		enter(node) {
			if (node.name !== 'LinkReference') return;
			const labelNode = node.node.getChild('LinkLabel');
			const urlNode = node.node.getChild('URL');
			if (!labelNode || !urlNode) return;
			const defLabel = state.doc.sliceString(labelNode.from + 1, labelNode.to - 1);
			if (defLabel.toLowerCase() === normalizedLabel) {
				result = state.doc.sliceString(urlNode.from, urlNode.to);
			}
		},
	});
	return result;
}

/**
 * Replaces `![alt](url)` and `![alt][ref]` with `ImageWidget`. Skips when the
 * cursor overlaps so the raw markdown stays editable.
 */
export const imageHandler: InlineHandler = {
	nodeType: 'Image',
	decorate: ({ state, node, isTouched }) => {
		if (isTouched(node.from, node.to)) return null;

		const marks: { from: number; to: number }[] = [];
		const urlNode = node.node.getChild('URL');
		const linkLabel = node.node.getChild('LinkLabel');
		let child = node.node.firstChild;
		while (child) {
			if (child.name === 'LinkMark') marks.push({ from: child.from, to: child.to });
			child = child.nextSibling;
		}

		if (marks.length >= 4 && urlNode) {
			const rawAlt = state.doc.sliceString(marks[0].to, marks[1].from);
			const { altText, width, height } = parseImageAlt(rawAlt);
			const url = state.doc.sliceString(urlNode.from, urlNode.to);
			return {
				from: node.from,
				to: node.to,
				deco: Decoration.replace({ widget: new ImageWidget(url, altText, width, height) }),
			};
		}

		if (marks.length >= 2 && linkLabel) {
			const rawAlt = state.doc.sliceString(marks[0].to, marks[1].from);
			const { altText, width, height } = parseImageAlt(rawAlt);
			const refLabel = state.doc.sliceString(linkLabel.from + 1, linkLabel.to - 1);
			const url = resolveRefUrl(state, refLabel);
			if (url) {
				return {
					from: node.from,
					to: node.to,
					deco: Decoration.replace({ widget: new ImageWidget(url, altText, width, height) }),
				};
			}
		}

		return null;
	},
};
