import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

export interface ImageRange {
	fullFrom: number;
	fullTo: number;
	altText: string;
	url: string;
}

/**
 * Finds all markdown image `![alt](url)` ranges using the Lezer syntax tree.
 * Uses Image nodes with LinkMark children and URL child.
 */
export function findImageRanges(state: EditorState, from: number, to: number): ImageRange[] {
	const ranges: ImageRange[] = [];

	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			if (node.name === 'Image') {
				const marks: { from: number; to: number }[] = [];
				const urlNode = node.node.getChild('URL');
				let child = node.node.firstChild;
				while (child) {
					if (child.name === 'LinkMark') {
						marks.push({ from: child.from, to: child.to });
					}
					child = child.nextSibling;
				}

				// LinkMarks: [0]="![", [1]="]", [2]="(", [3]=")"
				if (marks.length >= 4 && urlNode) {
					const altText = state.doc.sliceString(marks[0].to, marks[1].from);
					const url = state.doc.sliceString(urlNode.from, urlNode.to);
					ranges.push({
						fullFrom: node.from,
						fullTo: node.to,
						altText,
						url,
					});
				}
				return false;
			}
		},
	});

	return ranges;
}
