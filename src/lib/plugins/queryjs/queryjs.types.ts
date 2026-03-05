/** Clickable link to a file */
export interface DVLink {
	/** Absolute path to the target file */
	path: string;
	/** Display name (basename without extension) */
	display: string;
}

/** Options for dv.el() */
export interface DVElOptions {
	/** HTML attributes to set on the element */
	attr?: Record<string, string>;
	/** CSS class(es) to add */
	cls?: string;
}

/** Page object representing a single note, returned by dv.pages() and dv.current() */
export interface DVPage {
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
		/** DVLink to this page */
		link: DVLink;
		/** All tags (frontmatter + inline) */
		tags: string[];
		/** Files that link TO this file */
		inlinks: DVLink[];
		/** Files this file links TO */
		outlinks: DVLink[];
		/** File size in bytes */
		size: number;
		/** Creation timestamp (ms) */
		ctime: number;
		/** Modification timestamp (ms) */
		mtime: number;
		/** Tasks extracted from file content */
		tasks: DVTask[];
	};
	/** Frontmatter properties accessible as direct keys (e.g., page.created) */
	[key: string]: unknown;
}

/** A task extracted from a page's content */
export interface DVTask {
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
