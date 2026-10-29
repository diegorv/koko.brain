import { describe, it, expect } from 'vitest';
import { EditorSelection, type EditorState } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';

// No mocks for stores or logic files — real implementations per CLAUDE.md.

import { MathExtension } from '#lib/core/markdown-editor/extensions/lezer/math-extension.js';
import { HighlightExtension } from '#lib/core/markdown-editor/extensions/lezer/highlight-extension.js';
import {
	mouseSelectingField,
	setMouseSelecting,
} from '#lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.js';
import { calloutFoldState } from '#lib/core/markdown-editor/extensions/live-preview/core/effects.js';
import { computeTables } from '#lib/core/markdown-editor/extensions/live-preview/plugins/table-field.js';
import { computeCodeBlocks } from '#lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.js';
import { computeCallouts } from '#lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.js';
import { computeBlockMath } from '#lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.js';
import { computeMermaidBlocks } from '#lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.js';
import { computeQueryjsBlocks } from '#lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.js';
import { computeCollectionBlocks } from '#lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.js';
import { computeMetaBindButtons } from '#lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.js';
import { computeBlockComments } from '#lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.js';
import { computeAudioBlocks } from '#lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin.js';
import { computeVideoBlocks } from '#lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.js';
import { createMarkdownState } from '../../../test-helpers';

/** Every block decorator's scan, with a block that spans more than one line. */
const BLOCKS: { name: string; block: string; compute: (state: EditorState) => DecorationSet }[] = [
	{ name: 'table', block: '| A | B |\n| --- | --- |\n| 1 | 2 |', compute: computeTables },
	{ name: 'fenced code', block: '```js\nconst x = 1;\n```', compute: computeCodeBlocks },
	{ name: 'indented code', block: '    const x = 1;\n    const y = 2;', compute: computeCodeBlocks },
	{ name: 'callout', block: '> [!note] Title\n> body', compute: computeCallouts },
	{ name: 'block math', block: '$$\nx^2\n$$', compute: computeBlockMath },
	{ name: 'mermaid', block: '```mermaid\ngraph TD\n```', compute: computeMermaidBlocks },
	{ name: 'queryjs', block: '```queryjs\nkb.view("x")\n```', compute: computeQueryjsBlocks },
	{ name: 'collection', block: '```collection\nsource: notes\n```', compute: computeCollectionBlocks },
	{ name: 'meta-bind button', block: '```meta-bind-button\nlabel: Go\nstyle: default\n```', compute: computeMetaBindButtons },
	{ name: 'block comment', block: '%%\nhidden\n%%', compute: computeBlockComments },
	{ name: 'audio', block: '<audio controls>\n  <source src="a.mp3">\n</audio>', compute: computeAudioBlocks },
	{ name: 'video', block: '<video controls>\n  <source src="a.mp4">\n</video>', compute: computeVideoBlocks },
];

const BEFORE = 'before\n\n';

/** Builds the document around `block` and a state with the given selection. */
function stateFor(block: string, selection: EditorSelection, dragging = false): EditorState {
	const doc = `${BEFORE}${block}\n\nafter`;
	const base = createMarkdownState(doc, {
		extensions: [
			markdown({ extensions: [GFM, MathExtension, HighlightExtension] }),
			mouseSelectingField,
			calloutFoldState,
		],
	});
	return base.update({
		selection,
		effects: dragging ? setMouseSelecting.of(true) : [],
	}).state;
}

/** A comparable fingerprint of a decoration set: range, class and widget type. */
function fingerprint(set: DecorationSet): string[] {
	const out: string[] = [];
	const iter = set.iter();
	while (iter.value) {
		const spec = iter.value.spec as { class?: string; widget?: object };
		out.push(`${iter.from}-${iter.to}:${spec.class ?? ''}:${spec.widget?.constructor.name ?? ''}`);
		iter.next();
	}
	return out;
}

describe('block decorators share the line-based reveal rule', () => {
	for (const { name, block, compute } of BLOCKS) {
		const blockFrom = BEFORE.length;
		const blockTo = blockFrom + block.length;
		const docEnd = blockTo + '\n\nafter'.length;
		const rendered = () => fingerprint(compute(stateFor(block, EditorSelection.single(docEnd))));
		const revealed = () => fingerprint(compute(stateFor(block, EditorSelection.single(blockTo))));

		it(`${name}: renders with the cursor outside and shows source with it on the last line`, () => {
			expect(rendered().length).toBeGreaterThan(0);
			expect(revealed()).not.toEqual(rendered());
		});

		it(`${name}: a selection ending at the block's first line start leaves it rendered`, () => {
			// Triple-click / selectLine on the line above ends the range there.
			const state = stateFor(block, EditorSelection.single(0, blockFrom));
			expect(fingerprint(compute(state))).toEqual(rendered());
		});

		it(`${name}: a selection that reaches into the block's first line reveals it`, () => {
			const state = stateFor(block, EditorSelection.single(0, blockFrom + 1));
			expect(fingerprint(compute(state))).toEqual(revealed());
		});

		it(`${name}: stays rendered while a mouse drag is in progress over it`, () => {
			const state = stateFor(block, EditorSelection.single(0, blockTo), true);
			expect(fingerprint(compute(state))).toEqual(rendered());
		});
	}
});
