import { describe, it, expect } from 'vitest';
import { RangeSetBuilder, Text } from '@codemirror/state';
import type { Decoration, DecorationSet } from '@codemirror/view';
import { hideLines } from '#lib/core/markdown-editor/extensions/live-preview/core/hide-lines.js';
import { hiddenLineDeco } from '#lib/core/markdown-editor/extensions/live-preview/styles.js';

const DOC = Text.of(['zero', 'one', '', 'three']);

interface Collected {
	from: number;
	to: number;
	lineClass: boolean;
}

function collect(set: DecorationSet): Collected[] {
	const out: Collected[] = [];
	const iter = set.iter();
	while (iter.value) {
		out.push({ from: iter.from, to: iter.to, lineClass: iter.value === hiddenLineDeco });
		iter.next();
	}
	return out;
}

function viaBuilder(first: number, last: number): Collected[] {
	const builder = new RangeSetBuilder<Decoration>();
	hideLines(builder, DOC, first, last);
	return collect(builder.finish());
}

describe('hideLines', () => {
	it('adds the hidden line class and a text replace for every line, in order', () => {
		const l2 = DOC.line(2);
		const l3 = DOC.line(3);
		const l4 = DOC.line(4);
		expect(viaBuilder(2, 4)).toEqual([
			{ from: l2.from, to: l2.from, lineClass: true },
			{ from: l2.from, to: l2.to, lineClass: false },
			{ from: l3.from, to: l3.from, lineClass: true },
			{ from: l3.from, to: l3.to, lineClass: false },
			{ from: l4.from, to: l4.from, lineClass: true },
			{ from: l4.from, to: l4.to, lineClass: false },
		]);
	});

	it('hides a single line when first equals last', () => {
		expect(viaBuilder(1, 1)).toEqual([
			{ from: 0, to: 0, lineClass: true },
			{ from: 0, to: 4, lineClass: false },
		]);
	});

	it('hides an empty line with an empty replace', () => {
		const l3 = DOC.line(3);
		expect(viaBuilder(3, 3)).toEqual([
			{ from: l3.from, to: l3.from, lineClass: true },
			{ from: l3.from, to: l3.from, lineClass: false },
		]);
	});

	it('adds nothing when first is after last', () => {
		expect(viaBuilder(3, 2)).toEqual([]);
	});
});
