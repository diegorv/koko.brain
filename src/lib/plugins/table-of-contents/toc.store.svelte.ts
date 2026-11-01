import type { TocHeading } from './toc.types';

/** Headings of the currently active markdown buffer, in document order. */
let headings = $state<TocHeading[]>([]);

/**
 * The note the panel was expanded on, or null when collapsed. Kept here, not
 * in the panel, so the action bar can open the section while the right
 * sidebar (and so the panel) is not mounted.
 */
let expandedPath = $state<string | null>(null);

/** Reactive store for the table-of-contents panel. */
export const tocStore = {
	get headings() { return headings; },
	/** The note the panel is expanded on, or null when collapsed. */
	get expandedPath() { return expandedPath; },

	/** Replaces the heading list (called by the service after parsing). */
	setHeadings(value: TocHeading[]) { headings = value; },

	/** Expands the panel on `path`, or collapses it with null. */
	setExpandedPath(path: string | null) { expandedPath = path; },

	/** Clears the heading list (no active file / non-markdown tab). */
	reset() { headings = []; },
};
