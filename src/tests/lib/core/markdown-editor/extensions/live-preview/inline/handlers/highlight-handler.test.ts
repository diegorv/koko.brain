import { describe, it, expect } from 'vitest';
import { highlightHandler } from '$lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler';
import { buildInlineDecorations } from '$lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin';
import { createMarkdownState } from '../../../../test-helpers';

function build(doc: string) {
	const state = createMarkdownState(doc);
	const set = buildInlineDecorations(
		state,
		[{ from: 0, to: state.doc.length }],
		{ nodeHandlers: [highlightHandler], lineHandlers: [] },
	);
	const result: { from: number; to: number; class: string }[] = [];
	const iter = set.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to, class: (iter.value.spec as { class: string }).class });
		iter.next();
	}
	return result;
}

describe('highlightHandler', () => {
	it('emits cm-lp-highlight covering the full ==text== range (including marks)', () => {
		const decos = build('a ==hi== b');
		expect(decos).toEqual([{ from: 2, to: 8, class: 'cm-lp-highlight' }]);
	});

	it('emits one mark per highlight occurrence', () => {
		const decos = build('==one== plain ==two==');
		expect(decos).toHaveLength(2);
		expect(decos[0].class).toBe('cm-lp-highlight');
		expect(decos[1].class).toBe('cm-lp-highlight');
	});

	it('emits no decoration when there is no ==text== syntax', () => {
		const decos = build('plain text without highlight');
		expect(decos).toEqual([]);
	});

	it('emits no decoration for unmatched single =', () => {
		const decos = build('plain = single equals');
		expect(decos).toEqual([]);
	});

	it('skips highlights inside a fenced code block (block-context skip)', () => {
		const doc = '```\n==fake==\n```\nreal ==hi== here';
		const decos = build(doc);
		// Only the highlight outside the code block is decorated.
		expect(decos).toHaveLength(1);
		expect(decos[0].class).toBe('cm-lp-highlight');
		// Position should be in the line after the closing fence
		expect(decos[0].from).toBeGreaterThan(doc.indexOf('```\nreal'));
	});
});
