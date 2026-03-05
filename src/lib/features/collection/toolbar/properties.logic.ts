import type { CollectionDefinition, NoteRecord } from '../collection.types';

/**
 * Returns all possible columns: file.*, frontmatter properties, formula.*
 * Sorted: file.name first, then frontmatter (alphabetical), then formulas (alphabetical).
 */
export function getAllAvailableColumns(
	index: Map<string, NoteRecord>,
	definition: CollectionDefinition,
): string[] {
	const fileColumns = [
		'file.name',
		'file.path',
		'file.folder',
		'file.ext',
		'file.size',
		'file.ctime',
		'file.mtime',
	];

	const noteColumns = new Set<string>();
	for (const record of index.values()) {
		for (const key of record.properties.keys()) {
			if (!key.startsWith('formula.')) {
				noteColumns.add(key);
			}
		}
	}

	const formulaColumns = Object.keys(definition.formulas ?? {}).map(
		(name) => `formula.${name}`,
	);

	return [
		...fileColumns,
		...Array.from(noteColumns).sort(),
		...formulaColumns.sort(),
	];
}

/**
 * Toggles a column's visibility by adding or removing it from the order array.
 * When adding, inserts the column at its natural position relative to allColumns.
 */
export function toggleColumn(
	currentOrder: string[],
	column: string,
	visible: boolean,
	allColumns: string[],
): string[] {
	if (!visible) {
		return currentOrder.filter((c) => c !== column);
	}

	if (currentOrder.includes(column)) return currentOrder;

	// Find the best insertion index by looking at allColumns order
	const targetIdx = allColumns.indexOf(column);
	if (targetIdx === -1) return [...currentOrder, column];

	// Find the position in currentOrder where column should be inserted
	// by finding the last column in currentOrder that comes before column in allColumns
	let insertAt = currentOrder.length;
	for (let i = currentOrder.length - 1; i >= 0; i--) {
		const existingIdx = allColumns.indexOf(currentOrder[i]);
		if (existingIdx !== -1 && existingIdx < targetIdx) {
			insertAt = i + 1;
			break;
		}
		if (i === 0) {
			insertAt = 0;
		}
	}

	const result = [...currentOrder];
	result.splice(insertAt, 0, column);
	return result;
}
