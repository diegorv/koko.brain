import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { CollectionDefinition, CollectionFilter, CollectionViewDef, SortDef } from './collection.types';

/** Result of parsing a .collection YAML string */
export type ParseResult =
	| { success: true; definition: CollectionDefinition }
	| { success: false; error: string };

/**
 * Parses a YAML string into a CollectionDefinition.
 * Validates required fields and preserves unknown fields for Obsidian compatibility.
 */
export function parseCollectionYaml(yamlString: string): ParseResult {
	let raw: unknown;
	try {
		raw = parseYaml(yamlString);
	} catch (e) {
		return { success: false, error: `Invalid YAML: ${e instanceof Error ? e.message : String(e)}` };
	}

	if (!raw || typeof raw !== 'object') {
		return { success: false, error: 'YAML must be an object' };
	}

	const obj = raw as Record<string, unknown>;

	if (!('views' in obj)) {
		return { success: false, error: 'Missing required field: views' };
	}

	if (!Array.isArray(obj.views)) {
		return { success: false, error: 'Field "views" must be an array' };
	}

	if (obj.views.length === 0) {
		return { success: false, error: 'Field "views" must not be empty' };
	}

	const views: CollectionViewDef[] = [];
	for (let i = 0; i < obj.views.length; i++) {
		const view = obj.views[i];
		if (!view || typeof view !== 'object') {
			return { success: false, error: `View at index ${i} must be an object` };
		}

		const v = view as Record<string, unknown>;
		if (!v.type || typeof v.type !== 'string') {
			return { success: false, error: `View at index ${i} is missing "type"` };
		}
		if (!v.name || typeof v.name !== 'string') {
			return { success: false, error: `View at index ${i} is missing "name"` };
		}

		// Validate optional sub-fields
		if (v.sort !== undefined && !Array.isArray(v.sort)) {
			return { success: false, error: `View "${v.name}": "sort" must be an array` };
		}
		if (Array.isArray(v.sort)) {
			for (let j = 0; j < v.sort.length; j++) {
				const item = v.sort[j];
				if (!item || typeof item !== 'object') {
					return { success: false, error: `View "${v.name}": sort item at index ${j} must have a "column" string` };
				}
				// Accept "property" as alias for "column" (Obsidian compatibility)
				if ('property' in item && typeof item.property === 'string' && item.property) {
					item.column = item.property;
					delete item.property;
				}
				if (typeof item.column !== 'string' || !item.column) {
					return { success: false, error: `View "${v.name}": sort item at index ${j} must have a "column" string` };
				}
				if (item.direction !== 'ASC' && item.direction !== 'DESC') {
					return { success: false, error: `View "${v.name}": sort item at index ${j} must have direction "ASC" or "DESC"` };
				}
			}
		}
		if (v.order !== undefined && !Array.isArray(v.order)) {
			return { success: false, error: `View "${v.name}": "order" must be an array` };
		}
		if (v.limit !== undefined && (typeof v.limit !== 'number' || v.limit < 1)) {
			return { success: false, error: `View "${v.name}": "limit" must be a positive number` };
		}
		if (v.columnSize !== undefined && (typeof v.columnSize !== 'object' || Array.isArray(v.columnSize))) {
			return { success: false, error: `View "${v.name}": "columnSize" must be an object` };
		}

		// Preserve the raw data for v1 compatibility
		views.push(v as unknown as CollectionViewDef);
	}

	const definition: CollectionDefinition = {
		views,
	};

	if (obj.filters !== undefined) {
		definition.filters = obj.filters as CollectionDefinition['filters'];
	}
	if (obj.formulas !== undefined) {
		if (typeof obj.formulas !== 'object' || obj.formulas === null || Array.isArray(obj.formulas)) {
			return { success: false, error: '"formulas" must be a plain object' };
		}
		for (const [key, val] of Object.entries(obj.formulas as Record<string, unknown>)) {
			if (typeof val !== 'string') {
				return { success: false, error: `Formula "${key}" must be a string expression` };
			}
		}
		definition.formulas = obj.formulas as Record<string, string>;
	}
	if (obj.properties !== undefined) {
		definition.properties = obj.properties as CollectionDefinition['properties'];
	}

	return { success: true, definition };
}

/** Fields that can be updated in a .collection YAML file */
export interface CollectionYamlUpdates {
	/** Global filters (root-level) */
	filters?: CollectionFilter | string | undefined;
	/** Formula definitions (root-level) */
	formulas?: Record<string, string> | undefined;
	/** Index of the view to update (defaults to 0) */
	viewIndex?: number;
	/** Sort definitions for the target view */
	viewSort?: SortDef[];
	/** Filters for the target view */
	viewFilters?: CollectionFilter | string | undefined;
	/** Column order for the target view */
	viewOrder?: string[];
	/** Calendar view: date property name */
	viewDateProperty?: string;
	/** Calendar view: end date property name */
	viewEndDateProperty?: string | undefined;
	/** Calendar view: first day of the week (0-6) */
	viewWeekStartDay?: number;
	/** Calendar/linear-calendar view: color property name */
	viewColorProperty?: string | undefined;
}

/**
 * Updates fields in a .collection YAML string, preserving all other content.
 * Can update global filters, formulas, and view-level sort/filters in one pass.
 * Returns the original string unchanged if parsing fails.
 */
export function updateCollectionYaml(yamlString: string, updates: CollectionYamlUpdates): string {
	let raw: Record<string, unknown>;
	try {
		raw = (parseYaml(yamlString) as Record<string, unknown>) ?? {};
	} catch {
		return yamlString;
	}

	// Global filters
	if ('filters' in updates) {
		if (updates.filters !== undefined) {
			raw.filters = updates.filters;
		} else {
			delete raw.filters;
		}
	}

	// Formulas
	if ('formulas' in updates) {
		if (updates.formulas && Object.keys(updates.formulas).length > 0) {
			raw.formulas = updates.formulas;
		} else {
			delete raw.formulas;
		}
	}

	// View-level updates
	const hasViewUpdates = 'viewSort' in updates || 'viewFilters' in updates || 'viewOrder' in updates
		|| 'viewDateProperty' in updates || 'viewEndDateProperty' in updates || 'viewWeekStartDay' in updates
		|| 'viewColorProperty' in updates;
	if (hasViewUpdates && Array.isArray(raw.views)) {
		const idx = updates.viewIndex ?? 0;
		const view = raw.views[idx] as Record<string, unknown> | undefined;
		if (view) {
			if ('viewSort' in updates) {
				if (updates.viewSort && updates.viewSort.length > 0) {
					view.sort = updates.viewSort;
				} else {
					delete view.sort;
				}
			}
			if ('viewFilters' in updates) {
				if (updates.viewFilters !== undefined) {
					view.filters = updates.viewFilters;
				} else {
					delete view.filters;
				}
			}
			if ('viewOrder' in updates) {
				if (updates.viewOrder && updates.viewOrder.length > 0) {
					view.order = updates.viewOrder;
				} else {
					delete view.order;
				}
			}
			if ('viewDateProperty' in updates) {
				if (updates.viewDateProperty) {
					view.dateProperty = updates.viewDateProperty;
				} else {
					delete view.dateProperty;
				}
			}
			if ('viewEndDateProperty' in updates) {
				if (updates.viewEndDateProperty !== undefined) {
					view.endDateProperty = updates.viewEndDateProperty;
				} else {
					delete view.endDateProperty;
				}
			}
			if ('viewWeekStartDay' in updates) {
				if (updates.viewWeekStartDay !== undefined) {
					view.weekStartDay = updates.viewWeekStartDay;
				} else {
					delete view.weekStartDay;
				}
			}
			if ('viewColorProperty' in updates) {
				if (updates.viewColorProperty !== undefined) {
					view.colorProperty = updates.viewColorProperty;
				} else {
					delete view.colorProperty;
				}
			}
		}
	}

	return stringifyYaml(raw);
}
