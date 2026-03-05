/** Filter operators available in the visual filter UI */
export type FilterOperator =
	// Text
	| 'is'
	| 'is_not'
	| 'contains'
	| 'does_not_contain'
	| 'starts_with'
	| 'ends_with'
	// Number
	| 'eq'
	| 'neq'
	| 'gt'
	| 'lt'
	| 'gte'
	| 'lte'
	// Date
	| 'before'
	| 'after'
	| 'on_or_before'
	| 'on_or_after'
	// Boolean
	| 'is_true'
	| 'is_false'
	// Universal
	| 'is_empty'
	| 'is_not_empty';

/** Human-readable labels for filter operators */
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
	is: 'is',
	is_not: 'is not',
	contains: 'contains',
	does_not_contain: 'does not contain',
	starts_with: 'starts with',
	ends_with: 'ends with',
	eq: '=',
	neq: '≠',
	gt: '>',
	lt: '<',
	gte: '≥',
	lte: '≤',
	before: 'is before',
	after: 'is after',
	on_or_before: 'is on or before',
	on_or_after: 'is on or after',
	is_true: 'is true',
	is_false: 'is false',
	is_empty: 'is empty',
	is_not_empty: 'is not empty',
};

/** Conjunction type for a filter group */
export type FilterConjunction = 'and' | 'or' | 'not';

/** Human-readable labels for conjunctions */
export const CONJUNCTION_LABELS: Record<FilterConjunction, string> = {
	and: 'All the following are true',
	or: 'Any of the following are true',
	not: 'None of the following are true',
};

/** A visual filter row (property + operator + value) */
export interface FilterRow {
	/** Unique ID for Svelte {#each} keying */
	id: string;
	/** Property name (e.g. "status", "file.name") */
	property: string;
	/** Selected operator */
	operator: FilterOperator;
	/** Value as string (interpreted according to property type) */
	value: string;
	/** If set, contains the original raw expression (for complex expressions) */
	raw?: string;
}

/** A group of filters with a conjunction */
export interface FilterGroup {
	/** How to combine the rows within this group */
	conjunction: FilterConjunction;
	/** Individual filter rows */
	rows: FilterRow[];
}

/** A formula entry for the visual formula management UI */
export interface FormulaEntry {
	/** Unique ID for Svelte {#each} keying */
	id: string;
	/** Formula name (becomes formula.<name> column) */
	name: string;
	/** Formula expression string */
	expression: string;
	/** Whether this entry is currently being edited */
	editing: boolean;
	/** Validation error message, if any */
	error?: string;
}
