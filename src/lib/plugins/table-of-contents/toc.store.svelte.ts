import type { TocHeading } from './toc.types';

/** Headings of the currently active markdown buffer, in document order. */
let headings = $state<TocHeading[]>([]);

/** Reactive store for the table-of-contents panel. */
export const tocStore = {
	get headings() { return headings; },

	/** Replaces the heading list (called by the service after parsing). */
	setHeadings(value: TocHeading[]) { headings = value; },

	/** Clears the heading list (no active file / non-markdown tab). */
	reset() { headings = []; },
};
