import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

/** Range positions for a `***bold italic***` or `___bold italic___` match */
export interface BoldItalicRange {
	openMarkFrom: number;
	openMarkTo: number;
	textFrom: number;
	textTo: number;
	closeMarkFrom: number;
	closeMarkTo: number;
}

/**
 * Finds all `***bold italic***` and `___bold italic___` ranges using the Lezer syntax tree.
 * Detects when Emphasis wraps StrongEmphasis (or vice versa) as a single nesting pair.
 */
export function findBoldItalicRanges(state: EditorState, from: number, to: number): BoldItalicRange[] {
	const ranges: BoldItalicRange[] = [];

	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			// Emphasis wrapping StrongEmphasis: *(**text**)*
			if (node.name === 'Emphasis') {
				const strong = node.node.getChild('StrongEmphasis');
				if (strong) {
					// Check that StrongEmphasis is the only non-mark child
					let onlyStrong = true;
					let child = node.node.firstChild;
					while (child) {
						if (child.name !== 'EmphasisMark' && child.name !== 'StrongEmphasis') {
							onlyStrong = false;
							break;
						}
						child = child.nextSibling;
					}

					if (onlyStrong) {
						// Get the inner marks from StrongEmphasis
						const innerMarks: { from: number; to: number }[] = [];
						let innerChild = strong.firstChild;
						while (innerChild) {
							if (innerChild.name === 'EmphasisMark') {
								innerMarks.push({ from: innerChild.from, to: innerChild.to });
							}
							innerChild = innerChild.nextSibling;
						}

						if (innerMarks.length >= 2) {
							const innerOpen = innerMarks[0];
							const innerClose = innerMarks[innerMarks.length - 1];
							ranges.push({
								openMarkFrom: node.from,
								openMarkTo: innerOpen.to,
								textFrom: innerOpen.to,
								textTo: innerClose.from,
								closeMarkFrom: innerClose.from,
								closeMarkTo: node.to,
							});
						}
						return false;
					}
				}
			}

			// StrongEmphasis wrapping Emphasis: **(*text*)**
			if (node.name === 'StrongEmphasis') {
				const em = node.node.getChild('Emphasis');
				if (em) {
					let onlyEm = true;
					let child = node.node.firstChild;
					while (child) {
						if (child.name !== 'EmphasisMark' && child.name !== 'Emphasis') {
							onlyEm = false;
							break;
						}
						child = child.nextSibling;
					}

					if (onlyEm) {
						const innerMarks: { from: number; to: number }[] = [];
						let innerChild = em.firstChild;
						while (innerChild) {
							if (innerChild.name === 'EmphasisMark') {
								innerMarks.push({ from: innerChild.from, to: innerChild.to });
							}
							innerChild = innerChild.nextSibling;
						}

						if (innerMarks.length >= 2) {
							const innerOpen = innerMarks[0];
							const innerClose = innerMarks[innerMarks.length - 1];
							ranges.push({
								openMarkFrom: node.from,
								openMarkTo: innerOpen.to,
								textFrom: innerOpen.to,
								textTo: innerClose.from,
								closeMarkFrom: innerClose.from,
								closeMarkTo: node.to,
							});
						}
						return false;
					}
				}
			}
		},
	});

	return ranges;
}
