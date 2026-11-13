/** What a note list can order by: a built-in field or a frontmatter key (`property:<key>`). */
export type ListSortOption = 'modified' | 'created' | 'title' | 'status' | `property:${string}`;

/** The direction of a note list's order. */
export type ListSortDirection = 'asc' | 'desc';

/** One note list order, as the Sort dropdown shows and saves it. */
export interface ListSortConfig {
	/** What the list orders by */
	option: ListSortOption;
	/** Which way it orders */
	direction: ListSortDirection;
}

/** A list's saved toolbar choices. An absent field keeps the lens's own default. */
export interface ListPrefs {
	/** The picked order */
	sort?: ListSortConfig;
	/** Frontmatter keys shown as pills on the rows, in display order */
	properties?: string[];
}
