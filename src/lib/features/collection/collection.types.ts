/** Recursive filter type: an object with conjunctions or a string expression */
export type FilterItem = CollectionFilter | string;

/** Boolean-logic filter with and/or/not conjunctions */
export interface CollectionFilter {
	/** All items must evaluate to true */
	and?: FilterItem[];
	/** At least one item must evaluate to true */
	or?: FilterItem[];
	/** No items must evaluate to true */
	not?: FilterItem[];
}

/** Sort definition for a single column */
export interface SortDef {
	/** Property name to sort by (e.g. file.name, status, formula.x) */
	column: string;
	/** Sort direction — uppercase as in Obsidian */
	direction: 'ASC' | 'DESC';
}

/** Display configuration for a property */
export interface PropertyConfig {
	/** Custom display name shown in the column header */
	displayName?: string;
}

/** Definition of a single view within a .collection file */
export interface CollectionViewDef {
	/** View type */
	type: 'table' | 'calendar' | 'linear-calendar';
	/** Display name shown on the view tab */
	name: string;
	/** Filters specific to this view (AND-combined with global filters) */
	filters?: CollectionFilter | string;
	/** Column order — list of property names defining which columns appear and in what order */
	order?: string[];
	/** Sort definitions — separate from order! */
	sort?: SortDef[];
	/** Column widths in pixels */
	columnSize?: Record<string, number>;
	/** Maximum number of results to show */
	limit?: number;
	/** Ignored in v1 but preserved for Obsidian compatibility */
	groupBy?: unknown;
	/** Ignored in v1 but preserved for Obsidian compatibility */
	summaries?: unknown;
	/** Calendar view: which frontmatter property holds the start date */
	dateProperty?: string;
	/** Calendar view: optional end date property for multi-day events */
	endDateProperty?: string;
	/** Calendar view: first day of the week (0=Sunday, 1=Monday, ..., 6=Saturday). Default: 1 */
	weekStartDay?: number;
	/** Calendar/linear-calendar view: which property determines event bar color */
	colorProperty?: string;
}

/** Root definition of a .collection file */
export interface CollectionDefinition {
	/** Global filters applied to ALL views */
	filters?: CollectionFilter | string;
	/** Formula properties — map of name to expression string */
	formulas?: Record<string, string>;
	/** Display configuration per property */
	properties?: Record<string, PropertyConfig>;
	/** Array of view definitions (at least one required) */
	views: CollectionViewDef[];
}

/** A note record in the property index */
export interface NoteRecord {
	/** Absolute file path */
	path: string;
	/** File name with extension */
	name: string;
	/** File name without extension */
	basename: string;
	/** Parent folder path */
	folder: string;
	/** File extension (e.g. ".md") */
	ext: string;
	/** Modification timestamp in milliseconds */
	mtime: number;
	/** Creation timestamp in milliseconds */
	ctime: number;
	/** File size in bytes */
	size: number;
	/** Frontmatter properties keyed by name */
	properties: Map<string, unknown>;
}

/** A column entry in a query result, pairing the original key with its display name */
export interface QueryColumn {
	/** Original property key (e.g. "file.name", "status", "formula.x") */
	key: string;
	/** Display name for the column header (from PropertyConfig or same as key) */
	displayName: string;
}

/** Result of executing a query against the property index */
export interface QueryResult {
	/** Filtered, sorted, and limited note records */
	records: NoteRecord[];
	/** Columns in display order with both key and display name */
	columns: QueryColumn[];
}
