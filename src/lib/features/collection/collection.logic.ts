import type {
	CollectionDefinition,
	CollectionFilter,
	CollectionViewDef,
	FilterItem,
	PropertyIndexRecord,
	QueryColumn,
	QueryResult,
} from './collection.types';
import { evaluate, validateExpression, type EvalContext } from './expression/evaluator';
import { parse } from './expression/parser';
import { isDisplayValue, type ASTNode } from './expression/expression.types';
import { normalizeTypeCasing, parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import { extractAllTags } from '#lib/utils/tag-extraction.js';
import { getFileExtension, getFileName } from '#lib/core/filesystem/fs.logic.js';
import { parseWikilinks } from '#lib/core/filesystem/wikilink-resolution.logic.js';

/**
 * Builds a PropertyIndexRecord from a file path and its content.
 * Extracts frontmatter properties and file metadata from the path.
 */
export function buildNoteRecord(
	filePath: string,
	content: string,
	mtime = 0,
	ctime = 0,
	size = 0,
): PropertyIndexRecord {
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
	projectDerivedProperties(properties, content);

	return { path: filePath, name, basename, folder, ext, mtime, ctime, size, properties };
}

/**
 * The TS mirror of the keys Rust `project_note_record`
 * (src-tauri/src/commands/vault.rs) adds to, or rewrites in, the parsed
 * frontmatter. A full rebuild serves records from that projection and an
 * in-editor edit serves them from here, so any drift changes what a note
 * matches until the next `buildPropertyIndex`. Both sides are pinned by the
 * golden fixture `src-tauri/tests/fixtures/note-record-projection.json`.
 */
function projectDerivedProperties(properties: Map<string, unknown>, content: string): void {
	// `_type` is rewritten with the casing rule of entry.rs `extract_is_a`; an
	// empty or non-string value derives nothing and stays as parsed.
	const type = properties.get('_type');
	if (typeof type === 'string' && type !== '') {
		properties.set('_type', normalizeTypeCasing(type));
	}

	// Lifecycle flags, always present. Filters (`archived == true`), the toolbar
	// property picker and the QueryJS page proxy are built against these bare keys.
	properties.set('organized', boolFlag(properties, '_organized', true));
	properties.set('archived', boolFlag(properties, '_archived', false));
	properties.set('favorite', boolFlag(properties, '_favorite', false));

	// Merged frontmatter+inline tags, inserted unconditionally, so Collection
	// filters see inline `#tags` from the body.
	properties.set('tags', extractAllTags(content));

	// Relationship keys become wikilink target arrays, set only when at least one
	// target is found (entry.rs `extract_wikilink_targets`).
	for (const key of ['_belongs_to', '_related_to', '_has_many']) {
		const targets = wikilinkTargets(properties.get(key));
		if (targets.length > 0) properties.set(key, targets);
	}
}

/**
 * Wikilink targets in a frontmatter value: a string, or the string items of an
 * array (other items are skipped, like Rust's `filter_map(as_str)`). Alias and
 * heading are dropped and empty targets are skipped.
 */
function wikilinkTargets(value: unknown): string[] {
	const items = typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
	return items
		.filter((item): item is string => typeof item === 'string')
		.flatMap((item) => parseWikilinks(item).map((link) => link.target))
		.filter((target) => target !== '');
}

/**
 * Reads a canonical lifecycle flag, falling back to `fallback` when it is
 * absent or not a boolean.
 *
 * `_organized` defaults to `true` (a note without the flag counts as organized)
 * while `_archived` and `_favorite` default to `false`. The non-boolean
 * fallback matches Rust's `as_bool()`, which yields `None` rather than
 * coercing. See `src-tauri/src/vault/entry.rs::NoteEntry::from_content`.
 */
function boolFlag(
	properties: Map<string, unknown>,
	key: string,
	fallback: boolean,
): boolean {
	const value = properties.get(key);
	return typeof value === 'boolean' ? value : fallback;
}

/**
 * Picks the rows a query shows from the records it matched (filtered, formulas
 * computed, the view's own sort applied, `limit` not yet applied), in display
 * order. A `.view` passes one so its list follows the rail's rule. `view` and
 * `definition` are the ones the query ran, so their filters are the toolbar's.
 */
export type QueryRowSet = (
	records: PropertyIndexRecord[],
	view: CollectionViewDef,
	definition: CollectionDefinition,
) => PropertyIndexRecord[];

/**
 * Executes a query against the property index using a collection definition and view.
 * Pipeline: collect -> filter -> compute formulas -> sort -> limit -> select columns.
 * With `rowSet`, it replaces the limit step (it applies `limit` itself) and the
 * columns are resolved from the rows it returns.
 *
 * @param vaultPath - The open vault's absolute path, which a relative
 * `file.inFolder()` resolves against. Required so no caller can forget it: a
 * relative folder with no vault path matches nothing.
 */
export function executeQuery(
	definition: CollectionDefinition,
	view: CollectionViewDef,
	index: Map<string, PropertyIndexRecord>,
	vaultPath: string | null,
	rowSet?: QueryRowSet,
): QueryResult {
	const formulas = definition.formulas ?? {};
	const vault = vaultPath ?? undefined;

	// A filter that cannot run fails the whole query, before any record is read,
	// so a typo is reported instead of looking like "no notes match".
	const filterError = findFilterError(definition.filters) ?? findFilterError(view.filters);
	if (filterError !== undefined) {
		return { records: [], columns: resolveColumns(view, [], definition), filterError };
	}

	// 1. Collect all records
	let records = Array.from(index.values());

	// Pre-parse all formula ASTs once (avoids re-parsing per record)
	const parsedFormulas: Array<[string, ASTNode | null]> = Object.entries(formulas).map(
		([name, expr]) => {
			try {
				return [name, parse(expr)];
			} catch {
				return [name, null];
			}
		},
	);

	// Shared parse cache for filter expressions (avoids re-parsing per record)
	const parseCache = new Map<string, ASTNode>();

	// 2. Filter — combine global + view filters with AND
	records = records.filter((record) => {
		const ctx: EvalContext = { record, formulas, vaultPath: vault };
		if (definition.filters && !evaluateFilterCached(definition.filters, ctx, parseCache)) {
			return false;
		}
		if (view.filters && !evaluateFilterCached(view.filters, ctx, parseCache)) {
			return false;
		}
		return true;
	});

	// 3. Compute formulas — clone records first to avoid mutating the shared property index
	if (parsedFormulas.length > 0) {
		records = records.map((r) => ({ ...r, properties: new Map(r.properties) }));
	}
	for (const record of records) {
		for (const [formulaName, ast] of parsedFormulas) {
			if (!ast) {
				record.properties.set(`formula.${formulaName}`, null);
				continue;
			}
			try {
				const ctx: EvalContext = { record, formulas, vaultPath: vault };
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
	if (rowSet) {
		records = rowSet(records, view, definition);
	} else if (view.limit !== undefined && view.limit > 0) {
		records = records.slice(0, view.limit);
	}

	// 6. Select columns
	const columns = resolveColumns(view, records, definition);

	return { records, columns };
}

/**
 * The first reason a top-level `filters` value cannot run: a string that fails
 * `validateExpression`, an `and` / `or` / `not` value that is not a list, or a
 * list item that is neither a string nor an object. Undefined when it can run;
 * an absent or empty top-level value is no filter. Filters come from YAML
 * unvalidated (`parseCollectionYaml`), so the shapes are checked here.
 */
function findFilterError(filter: unknown): string | undefined {
	if (!filter) return undefined;
	return findItemError(filter);
}

function findItemError(item: unknown): string | undefined {
	if (typeof item === 'string') {
		const reason = validateExpression(item);
		return reason === undefined ? undefined : `Invalid filter "${item}": ${reason}`;
	}
	if (typeof item !== 'object' || item === null) {
		return `Invalid filter item: ${JSON.stringify(item)} is not an expression`;
	}
	for (const key of ['and', 'or', 'not'] as const) {
		const list = (item as Record<string, unknown>)[key];
		if (list === undefined) continue;
		if (!Array.isArray(list)) return `Invalid filter: "${key}" must be a list`;
		for (const child of list) {
			const error = findItemError(child);
			if (error !== undefined) return error;
		}
	}
	return undefined;
}

/** The names that read a note's archived flag in a filter (the normalised flag and the raw key). */
const ARCHIVED_NAMES = new Set(['archived', '_archived']);

/**
 * Whether a filter cites the archived flag, which hands the archived rows of
 * a `.view` to the filter instead of the default exclusion. A citation is the
 * name `archived` or `_archived` anywhere in an expression (an identifier, a
 * member, a segment of a dotted call such as `_archived.isEmpty()`, or inside
 * call arguments) and `file.hasProperty('archived')` or `'_archived'`. Other
 * string literals are not citations (`status == 'archived'`,
 * `file.hasTag('archived')`), and a referenced formula is not followed. An
 * expression that does not parse cites nothing; `executeQuery` reports it
 * before any row set runs.
 */
export function filterCitesArchived(filter: FilterItem | undefined): boolean {
	if (!filter) return false;
	if (typeof filter === 'string') {
		try {
			return astCitesArchived(parse(filter));
		} catch {
			return false;
		}
	}
	if (typeof filter !== 'object') return false;
	return (['and', 'or', 'not'] as const).some((key) => {
		const list = filter[key];
		return Array.isArray(list) && list.some((item) => filterCitesArchived(item));
	});
}

function astCitesArchived(node: ASTNode): boolean {
	switch (node.type) {
		case 'identifier':
			return ARCHIVED_NAMES.has(node.name);
		case 'member':
			// `formula.<name>` names a formula, not a property, even when the name is `archived`.
			if (node.object.type === 'identifier' && node.object.name === 'formula') return false;
			return ARCHIVED_NAMES.has(node.property) || astCitesArchived(node.object);
		case 'call': {
			const segments = node.callee.split('.');
			// A leading `formula.<name>` names a formula; only the path after it can cite.
			const cited = segments[0] === 'formula' ? segments.slice(2) : segments;
			if (cited.some((segment) => ARCHIVED_NAMES.has(segment))) return true;
			const first = node.args[0];
			if (node.callee === 'file.hasProperty' && first?.type === 'string' && ARCHIVED_NAMES.has(first.value)) return true;
			return node.args.some(astCitesArchived);
		}
		case 'methodCall':
			return ARCHIVED_NAMES.has(node.method) || astCitesArchived(node.receiver) || node.args.some(astCitesArchived);
		case 'binary':
			return astCitesArchived(node.left) || astCitesArchived(node.right);
		case 'unary':
			return astCitesArchived(node.operand);
		case 'array':
			return node.elements.some(astCitesArchived);
		case 'number':
		case 'string':
		case 'boolean':
			return false;
	}
}

/**
 * Evaluates a filter item (string expression or recursive filter object) against a note record.
 * A leaf that fails to parse or throws when evaluated counts as false.
 *
 * @param onLeafError - Receives each such leaf's error before it counts as false.
 * A callback that throws stops the whole evaluation, so a failing leaf inside `not`
 * cannot turn into a match.
 */
export function evaluateFilter(filter: FilterItem, ctx: EvalContext, onLeafError?: (err: unknown) => void): boolean {
	if (typeof filter === 'string') {
		try {
			const ast = parse(filter);
			return toTruthy(evaluate(ast, ctx));
		} catch (err) {
			onLeafError?.(err);
			return false;
		}
	}

	const filterObj = filter as CollectionFilter;
	let result = true;

	if (filterObj.and) {
		result = filterObj.and.every((item) => evaluateFilter(item, ctx, onLeafError));
	}
	if (result && filterObj.or) {
		result = filterObj.or.some((item) => evaluateFilter(item, ctx, onLeafError));
	}
	if (result && filterObj.not) {
		result = filterObj.not.every((item) => !evaluateFilter(item, ctx, onLeafError));
	}

	return result;
}

/**
 * Evaluates a filter item using a shared parse cache to avoid re-parsing
 * the same expression strings on every record.
 */
function evaluateFilterCached(filter: FilterItem, ctx: EvalContext, parseCache: Map<string, ASTNode>): boolean {
	if (typeof filter === 'string') {
		try {
			let ast = parseCache.get(filter);
			if (!ast) {
				ast = parse(filter);
				parseCache.set(filter, ast);
			}
			return toTruthy(evaluate(ast, ctx));
		} catch {
			return false;
		}
	}

	const filterObj = filter as CollectionFilter;
	let result = true;

	if (filterObj.and) {
		result = filterObj.and.every((item) => evaluateFilterCached(item, ctx, parseCache));
	}
	if (result && filterObj.or) {
		result = filterObj.or.some((item) => evaluateFilterCached(item, ctx, parseCache));
	}
	if (result && filterObj.not) {
		result = filterObj.not.every((item) => !evaluateFilterCached(item, ctx, parseCache));
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

/** Retrieves a property value from a PropertyIndexRecord by column name */
export function getPropertyValue(record: PropertyIndexRecord, column: string): unknown {
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
	records: PropertyIndexRecord[],
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
