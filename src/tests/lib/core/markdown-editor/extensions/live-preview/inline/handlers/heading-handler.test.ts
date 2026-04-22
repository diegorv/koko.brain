import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

import {
	buildInlineDecorations,
	registerInlineHandler,
	_clearInlineHandlers,
} from '$lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin';
import { headingHandlers } from '$lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler';
import { createMarkdownState } from '../../../../test-helpers';

interface Spec {
	class?: string;
	[k: string]: unknown;
}

function collect(decoSet: DecorationSet) {
	const result: { from: number; to: number; spec: Spec }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to, spec: iter.value.spec as Spec });
		iter.next();
	}
	return result;
}

function build(doc: string, cursor?: number) {
	const state = createMarkdownState(doc).update({
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	}).state;
	return collect(buildInlineDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('headingHandlers (ATX)', () => {
	beforeEach(() => {
		_clearInlineHandlers();
		for (const h of headingHandlers) registerInlineHandler(h);
	});

	it('emits cm-lp-h1 line deco for "# Heading"', () => {
		const decos = build('# Heading');
		const line = decos.find((d) => d.spec.class === 'cm-lp-h1');
		expect(line).toBeDefined();
		expect(line!.from).toBe(0);
		expect(line!.to).toBe(0);
	});

	it('emits cm-lp-h1..h6 for each ATX level', () => {
		for (let lvl = 1; lvl <= 6; lvl++) {
			const decos = build('#'.repeat(lvl) + ' Heading');
			const line = decos.find((d) => d.spec.class === `cm-lp-h${lvl}`);
			expect(line, `expected cm-lp-h${lvl}`).toBeDefined();
		}
	});

	it('hides HeaderMark via cm-formatting-block when cursor is on a different line', () => {
		// "# One\n# Two" — cursor on line 2 (pos 7), check line 1 mark is hidden
		const decos = build('# One\n# Two', 7);
		// The first HeaderMark covers "# " on line 1
		const line1Marks = decos.filter(
			(d) => d.spec.class === 'cm-formatting-block' && d.from === 0,
		);
		expect(line1Marks.length).toBeGreaterThan(0);
	});

	it('reveals HeaderMark with -visible when cursor is on the heading line', () => {
		// Cursor at position 3 (inside "# One")
		const decos = build('# One\n# Two', 3);
		const revealed = decos.find(
			(d) => d.spec.class === 'cm-formatting-block cm-formatting-block-visible' && d.from === 0,
		);
		expect(revealed).toBeDefined();
	});

	it('does not produce heading decos inside fenced code blocks', () => {
		const decos = build('```\n# Not a heading\n```');
		// Look for any cm-lp-hN
		for (const d of decos) {
			expect(String(d.spec.class ?? '')).not.toMatch(/cm-lp-h\d/);
		}
	});
});

describe('headingHandlers (Setext)', () => {
	beforeEach(() => {
		_clearInlineHandlers();
		for (const h of headingHandlers) registerInlineHandler(h);
	});

	it('emits cm-lp-h1 line deco for "Heading\\n======"', () => {
		const decos = build('Heading\n=======');
		const line = decos.find((d) => d.spec.class === 'cm-lp-h1');
		expect(line).toBeDefined();
	});

	it('emits cm-lp-h2 line deco for "Heading\\n------"', () => {
		const decos = build('Heading\n-------');
		const line = decos.find((d) => d.spec.class === 'cm-lp-h2');
		expect(line).toBeDefined();
	});

	it('hides the underline row via cm-formatting-block when cursor is outside', () => {
		// Long enough doc that cursor at 0 is far from the heading span
		const decos = build('intro line\n\nHeading\n=======', 0);
		const hidden = decos.find(
			(d) => d.spec.class === 'cm-formatting-block' && String(d.from).startsWith('') && d.from > 10,
		);
		expect(hidden).toBeDefined();
	});

	it('reveals the underline with -visible when cursor is inside the setext span', () => {
		const doc = 'Heading\n=======';
		const decos = build(doc, 3); // cursor inside "Heading"
		const revealed = decos.find(
			(d) => d.spec.class === 'cm-formatting-block cm-formatting-block-visible',
		);
		expect(revealed).toBeDefined();
	});
});

describe('headingHandlers list shape', () => {
	it('exports one handler per ATX level plus two setext levels', () => {
		expect(headingHandlers).toHaveLength(8);
		const nodeTypes = headingHandlers.map((h) => h.nodeType).sort();
		expect(nodeTypes).toEqual([
			'ATXHeading1',
			'ATXHeading2',
			'ATXHeading3',
			'ATXHeading4',
			'ATXHeading5',
			'ATXHeading6',
			'SetextHeading1',
			'SetextHeading2',
		]);
	});
});
