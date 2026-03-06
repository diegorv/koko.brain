/** Clickable link to a file */
export interface KBLink {
	/** Absolute path to the target file */
	path: string;
	/** Display name (basename without extension) */
	display: string;
}

/** Options for kb.el() */
export interface KBElOptions {
	/** HTML attributes to set on the element */
	attr?: Record<string, string>;
	/** CSS class(es) to add */
	cls?: string;
}

/** Page object representing a single note, returned by kb.pages() and kb.current() */
export interface KBPage {
	/** File metadata object */
	file: {
		/** Absolute file path */
		path: string;
		/** Filename with extension */
		name: string;
		/** Filename without extension */
		basename: string;
		/** Parent folder path */
		folder: string;
		/** KBLink to this page */
		link: KBLink;
		/** All tags (frontmatter + inline) */
		tags: string[];
		/** Files that link TO this file */
		inlinks: KBLink[];
		/** Files this file links TO */
		outlinks: KBLink[];
		/** File size in bytes */
		size: number;
		/** Creation timestamp (ms) */
		ctime: number;
		/** Modification timestamp (ms) */
		mtime: number;
		/** Tasks extracted from file content */
		tasks: KBTask[];
	};
	/** Frontmatter properties accessible as direct keys (e.g., page.created) */
	[key: string]: unknown;
}

/** A task extracted from a page's content */
export interface KBTask {
	/** The raw text of the task (without the checkbox prefix) */
	text: string;
	/** Whether the task is completed */
	completed: boolean;
	/** 1-based line number within the file */
	line: number;
	/** Absolute path of the file containing this task */
	path: string;
}

/** Bundle of aggregate statistics from DataArray.stats() */
export interface AggregateStats {
	/** Sum of all values */
	sum: number;
	/** Arithmetic mean */
	avg: number;
	/** Minimum value */
	min: number;
	/** Maximum value */
	max: number;
	/** Number of values */
	count: number;
}
