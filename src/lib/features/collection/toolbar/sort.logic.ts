import type { SortDef } from '../collection.types';
import type { PropertyType } from '$lib/features/properties/properties.types';

/**
 * Adds a sort with ASC direction. Ignores if the column already has a sort.
 */
export function addSort(sorts: SortDef[], column: string): SortDef[] {
	if (sorts.some((s) => s.column === column)) return sorts;
	return [...sorts, { column, direction: 'ASC' }];
}

/**
 * Removes the sort for a given column.
 */
export function removeSort(sorts: SortDef[], column: string): SortDef[] {
	return sorts.filter((s) => s.column !== column);
}

/**
 * Toggles the direction of a sort (ASC <-> DESC).
 * Returns unchanged array if column is not found.
 */
export function toggleSortDirection(sorts: SortDef[], column: string): SortDef[] {
	return sorts.map((s) =>
		s.column === column
			? { ...s, direction: s.direction === 'ASC' ? 'DESC' : 'ASC' }
			: s,
	);
}

/**
 * Moves a sort from one index to another (for drag-reorder).
 * Returns unchanged array if indices are out of bounds.
 */
export function reorderSorts(sorts: SortDef[], fromIndex: number, toIndex: number): SortDef[] {
	if (fromIndex < 0 || fromIndex >= sorts.length) return sorts;
	if (toIndex < 0 || toIndex >= sorts.length) return sorts;
	if (fromIndex === toIndex) return sorts;

	const result = [...sorts];
	const [moved] = result.splice(fromIndex, 1);
	result.splice(toIndex, 0, moved);
	return result;
}

/**
 * Returns a human-readable label for a sort direction based on property type.
 * E.g. text: "A → Z" / "Z → A", number: "Smallest → Largest" / "Largest → Smallest"
 */
export function getSortDirectionLabel(direction: 'ASC' | 'DESC', propertyType: PropertyType): string {
	switch (propertyType) {
		case 'text':
		case 'list':
			return direction === 'ASC' ? 'A → Z' : 'Z → A';
		case 'number':
			return direction === 'ASC' ? 'Smallest → Largest' : 'Largest → Smallest';
		case 'date':
			return direction === 'ASC' ? 'Old → New' : 'New → Old';
		case 'boolean':
			return direction === 'ASC' ? 'False → True' : 'True → False';
	}
}
