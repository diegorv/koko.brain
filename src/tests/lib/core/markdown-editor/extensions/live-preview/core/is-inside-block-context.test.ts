import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { isInsideBlockContext } from '$lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context';

function createState(doc: string): EditorState {
	return EditorState.create({
		doc,
		extensions: [markdown({ extensions: [GFM] })],
	});
}

/** Finds a node with the given name in the syntax tree */
function findNode(state: EditorState, name: string): { from: number; to: number } | null {
	let result: { from: number; to: number } | null = null;
	syntaxTree(state).iterate({
		enter: (node) => {
			if (node.name === name && !result) {
				result = { from: node.from, to: node.to };
			}
		},
	});
	return result;
}

/** Checks if a node with the given name is inside a block context */
function isNodeInsideBlock(state: EditorState, nodeName: string): boolean {
	let result = false;
	syntaxTree(state).iterate({
		enter: (node) => {
			if (node.name === nodeName) {
				result = isInsideBlockContext(node);
				return false; // stop at first match
			}
		},
	});
	return result;
}

describe('isInsideBlockContext', () => {
	it('returns false for emphasis in normal paragraph', () => {
		const state = createState('hello *world*');
		expect(isNodeInsideBlock(state, 'EmphasisMark')).toBe(false);
	});

	it('returns true for text inside fenced code block', () => {
		const state = createState('```\n*bold*\n```');
		// Inside FencedCode, there won't be EmphasisMark nodes (Lezer doesn't parse inline inside code)
		// But the CodeText node itself should be inside FencedCode
		let foundInsideBlock = false;
		syntaxTree(state).iterate({
			enter: (node) => {
				if (node.name === 'CodeText') {
					foundInsideBlock = isInsideBlockContext(node);
				}
			},
		});
		expect(foundInsideBlock).toBe(true);
	});

	it('returns false for emphasis in blockquote', () => {
		// Blockquotes are NOT block contexts — inline decorations should apply inside them
		const state = createState('> hello *world*');
		expect(isNodeInsideBlock(state, 'EmphasisMark')).toBe(false);
	});

	it('returns true for any node inside FencedCode', () => {
		const state = createState('```js\nconst x = 1;\n```');
		let foundFencedCode = false;
		syntaxTree(state).iterate({
			enter: (node) => {
				if (node.name === 'CodeInfo') {
					foundFencedCode = isInsideBlockContext(node);
				}
			},
		});
		expect(foundFencedCode).toBe(true);
	});

	it('returns false for heading marks', () => {
		const state = createState('# Hello');
		expect(isNodeInsideBlock(state, 'HeaderMark')).toBe(false);
	});

	it('returns false for link in normal text', () => {
		const state = createState('click [here](url)');
		expect(isNodeInsideBlock(state, 'Link')).toBe(false);
	});

	it('returns false for strikethrough in normal text', () => {
		const state = createState('hello ~~world~~');
		expect(isNodeInsideBlock(state, 'Strikethrough')).toBe(false);
	});
});
