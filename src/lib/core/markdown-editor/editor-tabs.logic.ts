/** A horizontal extent in viewport pixels, as `getBoundingClientRect` gives it. */
export interface Span {
	/** Left edge. */
	left: number;
	/** Right edge. */
	right: number;
}

/** Which edges of the tab strip show a fade because tabs continue past them. */
export interface EdgeFades {
	/** Tabs are scrolled out past the left edge. */
	left: boolean;
	/** Tabs continue past the right edge. */
	right: boolean;
}

/** Scroll positions within this many pixels of an end count as at that end (subpixel snapping). */
const FADE_SLACK = 2;

/** A tab this many pixels or less past an edge still counts as visible. */
const HIDDEN_SLACK = 4;

/**
 * The edge fades of a horizontally scrolling strip: none when it does not overflow,
 * otherwise one at each end that has content scrolled past it.
 */
export function edgeFades(scrollLeft: number, clientWidth: number, scrollWidth: number): EdgeFades {
	if (scrollWidth <= clientWidth) return { left: false, right: false };
	return {
		left: scrollLeft > FADE_SLACK,
		right: scrollLeft + clientWidth < scrollWidth - FADE_SLACK,
	};
}

/** How many tabs extend more than 4 px past either edge of the scroller. */
export function countHiddenTabs(scroller: Span, tabs: readonly Span[]): number {
	return tabs.filter((tab) => tab.left < scroller.left - HIDDEN_SLACK || tab.right > scroller.right + HIDDEN_SLACK).length;
}
