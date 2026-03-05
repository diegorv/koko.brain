import type {
	CollectionDefinition,
	CollectionFilter,
	CollectionViewDef,
	FilterItem,
	NoteRecord,
	QueryColumn,
	QueryResult,
} from './collection.types';
import { evaluate, type EvalContext } from './expression/evaluator';
import { parse } from './expression/parser';
import { isDisplayValue } from './expression/expression.types';
import { parseFrontmatterProperties } from '$lib/features/properties/properties.logic';
import { getFileExtension, getFileName } from '$lib/core/filesystem/fs.logic';

/**
 * Builds a NoteRecord from a file path and its content.
 * Extracts frontmatter properties and file metadata from the path.
 */
export function buildNoteRecord(
	filePath: string,
	content: string,
	mtime = 0,
	ctime = 0,
	size = 0,
): NoteRecord {
	const name = getFileName(filePath);
	const ext = getFileExtension(name);
	const basename = ext ? name.slice(0, -ext.length) : name;
	const lastSlash = filePath.lastIndexOf('/');
	const folder = lastSlash > 0 ? filePath.substring(0, lastSlash) : '';

	const properties = new Map<string, unknown>();
	const parsed = parseFrontmatterProperties(content);
	for (const prop of parsed) {
		properties.set(prop.key, prop.value);
	}

	return { path: filePath, name, basename, folder, ext, mtime, ctime, size, properties };
}

/**
 * Executes a query against the property index using a collection definition and view.
 * Pipeline: collect -> filter -> compute formulas -> sort -> limit -> select columns
 */
export function executeQuery(
	definition: CollectionDefinition,
	view: CollectionViewDef,
	index: Map<string, NoteRecord>,
): QueryResult {
	const formulas = definition.formulas ?? {};

	// 1. Collect all records
	let records = Array.from(index.values());

	// 2. Filter — combine global + view filters with AND
	records = records.filter((record) => {
		const ctx: EvalContext = { record, formulas };
		if (definition.filters && !evaluateFilter(definition.filters, ctx)) {
			return false;
		}
		if (view.filters && !evaluateFilter(view.filters, ctx)) {
			return false;
		}
		return true;
	});

	// 3. Compute formulas — clone records first to avoid mutating the shared property index
	if (Object.keys(formulas).length > 0) {
		records = records.map((r) => ({ ...r, properties: new Map(r.properties) }));
	}
	for (const record of records) {
		for (const [formulaName, formulaExpr] of Object.entries(formulas)) {
			try {
				const ctx: EvalContext = { record, formulas };
				const ast = parse(formulaExpr);
				const value = evaluate(ast, ctx);
				record.properties.set(`formula.${formulaName}`, value);
			} catch {
				record.properties.set(`formula.${formulaName}`, null);
			}
		}
	}

	// 4. Sort
	if (view.sort && view.sort.length > 0) {
		records.sort((a, b) => {
			for (const sortDef of view.sort!) {
				const aVal = getPropertyValue(a, sortDef.column);
				const bVal = getPropertyValue(b, sortDef.column);
				const cmp = compareForSort(aVal, bVal);
				if (cmp !== 0) {
					return sortDef.direction === 'DESC' ? -cmp : cmp;
				}
			}
			return 0;
		});
	}

	// 5. Limit
	if (view.limit !== undefined && view.limit > 0) {
		records = records.slice(0, view.limit);
	}

	// 6. Select columns
	const columns = resolveColumns(view, records, definition);

	return { records, columns };
}

/**
 * Evaluates a filter item (string expression or recursive filter object) against a note record.
 */
export function evaluateFilter(filter: FilterItem, ctx: EvalContext): boolean {
	if (typeof filter === 'string') {
		try {
			const ast = parse(filter);
			return toTruthy(evaluate(ast, ctx));
		} catch {
			return false;
		}
	}

	const filterObj = filter as CollectionFilter;
	let result = true;

	if (filterObj.and) {
		result = filterObj.and.every((item) => evaluateFilter(item, ctx));
	}
	if (result && filterObj.or) {
		result = filterObj.or.some((item) => evaluateFilter(item, ctx));
	}
	if (result && filterObj.not) {
		result = filterObj.not.every((item) => !evaluateFilter(item, ctx));
	}

	return result;
}

/**
 * Formats a cell value for display in the table.
 * Display types are returned as-is for special rendering by the component.
 */
export function formatCellValue(value: unknown): string {
	if (value === null || value === undefined) return '\u2014';
	if (isDisplayValue(value)) {
		switch (value.__display) {
			case 'link': return value.display || value.href;
			case 'image': return value.alt || value.src;
			case 'icon': return value.name;
			case 'html': return value.html;
		}
	}
	if (value instanceof Date) {
		const y = value.getFullYear();
		const m = String(value.getMonth() + 1).padStart(2, '0');
		const d = String(value.getDate()).padStart(2, '0');
		const h = value.getHours();
		const min = value.getMinutes();
		if (h === 0 && min === 0) return `${y}-${m}-${d}`;
		return `${y}-${m}-${d} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
	}
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	if (Array.isArray(value)) return value.join(', ');
	return String(value);
}

/** Retrieves a property value from a NoteRecord by column name */
export function getPropertyValue(record: NoteRecord, column: string): unknown {
	if (column.startsWith('file.')) {
		switch (column) {
			case 'file.name': return record.name;
			case 'file.basename': return record.basename;
			case 'file.path': return record.path;
			case 'file.folder': return record.folder;
			case 'file.ext': return record.ext;
			case 'file.size': return record.size;
			case 'file.ctime': return new Date(record.ctime);
			case 'file.mtime': return new Date(record.mtime);
			default: return null;
		}
	}
	if (column.startsWith('formula.') || column.startsWith('note.') || column.startsWith('property.')) {
		return record.properties.get(column) ?? null;
	}
	return record.properties.get(column) ?? null;
}

/** Compares two values for sorting — null/undefined always sort last */
function compareForSort(a: unknown, b: unknown): number {
	const aNull = a === null || a === undefined;
	const bNull = b === null || b === undefined;
	if (aNull && bNull) return 0;
	if (aNull) return 1;
	if (bNull) return -1;

	if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
	if (a instanceof Date) return -1;
	if (b instanceof Date) return 1;

	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return (a ? 1 : 0) - (b ? 1 : 0);
	}

	if (typeof a === 'number' && typeof b === 'number') return a - b;
	if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);

	return String(a).localeCompare(String(b));
}

/** Resolves columns from view.order or by inferring from records */
function resolveColumns(
	view: CollectionViewDef,
	records: NoteRecord[],
	definition: CollectionDefinition,
): QueryColumn[] {
	const toColumn = (key: string): QueryColumn => ({
		key,
		displayName: definition.properties?.[key]?.displayName ?? key,
	});

	if (view.order && view.order.length > 0) {
		return view.order.map(toColumn);
	}

	// Infer columns from all properties found in records
	const seen = new Set<string>();
	const keys: string[] = ['file.name'];
	seen.add('file.name');

	for (const record of records) {
		for (const key of record.properties.keys()) {
			if (!seen.has(key)) {
				seen.add(key);
				keys.push(key);
			}
		}
	}

	return keys.map(toColumn);
}

/** Checks truthiness of a value */
function toTruthy(val: unknown): boolean {
	if (val === null || val === undefined) return false;
	if (val === 0 || val === '' || val === false) return false;
	return true;
}
