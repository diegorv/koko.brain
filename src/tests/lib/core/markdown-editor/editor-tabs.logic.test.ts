import { describe, it, expect } from 'vitest';
import { countHiddenTabs, edgeFades } from '#lib/core/markdown-editor/editor-tabs.logic.js';

describe('edgeFades', () => {
	it('shows no fade when the strip does not overflow', () => {
		expect(edgeFades(0, 500, 500)).toEqual({ left: false, right: false });
		expect(edgeFades(0, 500, 300)).toEqual({ left: false, right: false });
		// A stale scrollLeft after the strip stopped overflowing still shows nothing.
		expect(edgeFades(40, 500, 500)).toEqual({ left: false, right: false });
	});

	it('shows only the right fade at the start of an overflowing strip', () => {
		expect(edgeFades(0, 500, 900)).toEqual({ left: false, right: true });
		expect(edgeFades(2, 500, 900)).toEqual({ left: false, right: true });
	});

	it('shows the left fade once scrolled more than 2 px', () => {
		expect(edgeFades(3, 500, 900)).toEqual({ left: true, right: true });
	});

	it('shows only the left fade at the end, with 2 px of slack', () => {
		expect(edgeFades(400, 500, 900)).toEqual({ left: true, right: false });
		expect(edgeFades(398, 500, 900)).toEqual({ left: true, right: false });
		expect(edgeFades(397, 500, 900)).toEqual({ left: true, right: true });
	});
});

describe('countHiddenTabs', () => {
	const scroller = { left: 100, right: 400 };

	it('is 0 for an empty list', () => {
		expect(countHiddenTabs(scroller, [])).toBe(0);
	});

	it('is 0 when every tab is inside the scroller', () => {
		expect(countHiddenTabs(scroller, [{ left: 100, right: 250 }, { left: 250, right: 400 }])).toBe(0);
	});

	it('counts a tab more than 4 px past either edge', () => {
		const tabs = [
			{ left: 95, right: 200 },
			{ left: 200, right: 300 },
			{ left: 300, right: 405 },
		];
		expect(countHiddenTabs(scroller, tabs)).toBe(2);
	});

	it('does not count a tab within 4 px of an edge', () => {
		expect(countHiddenTabs(scroller, [{ left: 96, right: 200 }, { left: 300, right: 404 }])).toBe(0);
	});

	it('counts tabs scrolled fully out on both sides', () => {
		const tabs = [
			{ left: -100, right: 0 },
			{ left: 150, right: 250 },
			{ left: 500, right: 600 },
		];
		expect(countHiddenTabs(scroller, tabs)).toBe(2);
	});
});
