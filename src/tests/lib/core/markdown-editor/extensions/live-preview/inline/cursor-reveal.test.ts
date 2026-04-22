import { describe, it, expect } from 'vitest';

import {
	revealClass,
	hideClass,
} from '$lib/core/markdown-editor/extensions/live-preview/inline/cursor-reveal';

describe('revealClass', () => {
	it('returns just the base class when not touched', () => {
		expect(revealClass('cm-formatting-block', false)).toBe('cm-formatting-block');
	});

	it('appends `${base}-visible` when touched', () => {
		expect(revealClass('cm-formatting-block', true)).toBe(
			'cm-formatting-block cm-formatting-block-visible',
		);
	});

	it('works for the inline formatting class too', () => {
		expect(revealClass('cm-formatting-inline', true)).toBe(
			'cm-formatting-inline cm-formatting-inline-visible',
		);
	});
});

describe('hideClass', () => {
	it('returns just the base class when touched', () => {
		expect(hideClass('cm-lp-inline-comment', true)).toBe('cm-lp-inline-comment');
	});

	it('appends `${base}-hidden` when not touched', () => {
		expect(hideClass('cm-lp-inline-comment', false)).toBe(
			'cm-lp-inline-comment cm-lp-inline-comment-hidden',
		);
	});

	it('works for block references', () => {
		expect(hideClass('cm-lp-block-ref', false)).toBe('cm-lp-block-ref cm-lp-block-ref-hidden');
	});
});
