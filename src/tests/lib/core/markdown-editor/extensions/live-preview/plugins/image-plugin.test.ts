import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import {
	buildImageDecorations,
	parseImageAlt,
} from '$lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin';
import { createMarkdownState } from '../../../test-helpers';

function collectDecos(decoSet: ReturnType<typeof buildImageDecorations>) {
	const result: { from: number; to: number; hasWidget: boolean }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({
			from: iter.from,
			to: iter.to,
			hasWidget: !!(iter.value.spec as { widget?: unknown }).widget,
		});
		iter.next();
	}
	return result;
}

function buildImages(doc: string, cursor?: number) {
	const baseState = createMarkdownState(doc);
	const safeCursor =
		cursor !== undefined ? Math.min(cursor, baseState.doc.length) : undefined;
	const state = baseState.update({
		selection: safeCursor !== undefined ? EditorSelection.single(safeCursor) : undefined,
	}).state;
	return collectDecos(buildImageDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('imagePlugin — buildImageDecorations', () => {
	it('replaces image syntax with widget when cursor is outside', () => {
		const doc = '![alt](image.png)\ntext';
		const decos = buildImages(doc, 20);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
		expect(decos[0].from).toBe(0);
		expect(decos[0].to).toBe(17);
	});

	it('shows source when cursor is on the image', () => {
		const doc = '![alt](image.png)';
		const decos = buildImages(doc, 5);
		expect(decos).toHaveLength(0);
	});

	it('handles multiple images', () => {
		const doc = '![a](1.png)\n![b](2.png)\ntext';
		const decos = buildImages(doc, 26);
		expect(decos).toHaveLength(2);
	});

	it('produces no decorations for non-image lines', () => {
		const doc = 'plain text';
		const decos = buildImages(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations inside fenced code blocks', () => {
		const doc = '```\n![alt](image.png)\n```';
		const decos = buildImages(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('per-element: only shows source for image under cursor', () => {
		const doc = '![a](1.png)\n![b](2.png)';
		const decos = buildImages(doc, 5); // cursor on first image
		// Only second image should have widget
		expect(decos).toHaveLength(1);
		expect(decos[0].from).toBe(12); // second image start
	});
});

describe('parseImageAlt', () => {
	it('returns plain alt text when no pipe', () => {
		const result = parseImageAlt('alt text');
		expect(result).toEqual({ altText: 'alt text' });
	});

	it('parses width-only size suffix', () => {
		const result = parseImageAlt('alt|100');
		expect(result).toEqual({ altText: 'alt', width: 100 });
	});

	it('parses widthxheight size suffix', () => {
		const result = parseImageAlt('alt|100x200');
		expect(result).toEqual({ altText: 'alt', width: 100, height: 200 });
	});

	it('handles alt text with pipes before size', () => {
		const result = parseImageAlt('alt with | pipes|300');
		expect(result).toEqual({ altText: 'alt with | pipes', width: 300 });
	});

	it('treats non-numeric pipe suffix as part of alt text', () => {
		const result = parseImageAlt('alt|not-a-number');
		expect(result).toEqual({ altText: 'alt|not-a-number' });
	});

	it('handles empty alt with size', () => {
		const result = parseImageAlt('|100');
		expect(result).toEqual({ altText: '', width: 100 });
	});

	it('handles empty alt text', () => {
		const result = parseImageAlt('');
		expect(result).toEqual({ altText: '' });
	});
});
