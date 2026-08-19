import { describe, it, expect } from 'vitest';
import { Text } from '@codemirror/state';
import { parseFrontmatterProperties } from '$lib/features/properties/properties.logic';
import { frontmatterSlice } from '$lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice';

function doc(text: string): Text {
	return Text.of(text.split('\n'));
}

describe('frontmatterSlice', () => {
	it('returns the text through the closing fence when the document opens with frontmatter', () => {
		expect(frontmatterSlice(doc('---\nrating: 2\n---\nbody\nmore'))).toBe('---\nrating: 2\n---');
	});

	it('stops at the FIRST closing fence, not the last', () => {
		expect(frontmatterSlice(doc('---\na: 1\n---\ntext\n---\nb: 2\n---'))).toBe('---\na: 1\n---');
	});

	it('returns an empty string when the document has fewer than three lines', () => {
		expect(frontmatterSlice(doc('---\nrating: 2'))).toBe('');
		expect(frontmatterSlice(doc(''))).toBe('');
	});

	it('returns an empty string when line 1 is not exactly the fence', () => {
		expect(frontmatterSlice(doc('text\n---\nrating: 2\n---'))).toBe('');
		expect(frontmatterSlice(doc('--- \nrating: 2\n---'))).toBe('');
	});

	it('returns an empty string when the fence never closes', () => {
		expect(frontmatterSlice(doc('---\nrating: 2\nbody\nmore'))).toBe('');
	});

	// Parity contract from the JSDoc: what the slice feeds the parser must match
	// what the full document would have fed it.
	it('feeds parseFrontmatterProperties the same properties as the full document', () => {
		const cases = [
			'---\nrating: 2\ntitle: hi\n---\nbody\nbody',
			'---\nrating: 2\n---\ntext\n---\nother: 9\n---',
			'---\nrating: 2\nbody\nmore',
			'text\n---\nrating: 2\n---',
			'plain body\nwith no frontmatter\nat all',
		];
		for (const text of cases) {
			expect(parseFrontmatterProperties(frontmatterSlice(doc(text)))).toEqual(
				parseFrontmatterProperties(text),
			);
		}
	});
});
