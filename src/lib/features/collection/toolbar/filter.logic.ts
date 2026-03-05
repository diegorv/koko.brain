import type { CollectionFilter, FilterItem, NoteRecord } from '../collection.types';
import type { ASTNode } from '../expression/expression.types';
import { parse } from '../expression/parser';
import type { PropertyType } from '$lib/features/properties/properties.types';
import type { FilterConjunction, FilterGroup, FilterOperator, FilterRow } from './toolbar.types';

let nextId = 0;

/** Generates a unique ID for filter row keying */
function uid(): string {
	return `fr_${++nextId}`;
}

/**
 * Tries to parse a simple expression into a visual FilterRow.
 * Falls back to a raw expression row if the expression is too complex for the visual UI.
 *
 * Examples that parse visually: "status == 'active'", "priority > 3", "file.name != 'test'"
 * Examples that fall back to raw: "a + b > 5", "if(x, true, false)"
 */
export function parseExpressionToRow(expr: string): FilterRow {
	try {
		const ast = parse(expr);
		const row = astToFilterRow(ast);
		if (row) return row;
	} catch {
		// Parse error — fall back to raw
	}
	return { id: uid(), property: '', operator: 'is', value: '', raw: expr };
}

/**
 * Converts a FilterRow back into an expression string for YAML serialization.
 *
 * Example: { property: 'status', operator: 'is', value: 'active' } -> "status == 'active'"
 */
export function filterRowToExpression(row: FilterRow): string {
	if (row.raw !== undefined) return row.raw;

	const prop = row.property;
	const val = row.value;

	switch (row.operator) {
		case 'is':
			return `${prop} == ${quoteString(val)}`;
		case 'is_not':
			return `${prop} != ${quoteString(val)}`;
		case 'contains':
			return `contains(${prop}, ${quoteString(val)})`;
		case 'does_not_contain':
			return `!contains(${prop}, ${quoteString(val)})`;
		case 'starts_with':
			return `startsWith(${prop}, ${quoteString(val)})`;
		case 'ends_with':
			return `endsWith(${prop}, ${quoteString(val)})`;
		case 'eq':
			return `${prop} == ${val}`;
		case 'neq':
			return `${prop} != ${val}`;
		case 'gt':
			return `${prop} > ${val}`;
		case 'lt':
			return `${prop} < ${val}`;
		case 'gte':
			return `${prop} >= ${val}`;
		case 'lte':
			return `${prop} <= ${val}`;
		case 'before':
			return `${prop} < date('${val}')`;
		case 'after':
			return `${prop} > date('${val}')`;
		case 'on_or_before':
			return `${prop} <= date('${val}')`;
		case 'on_or_after':
			return `${prop} >= date('${val}')`;
		case 'is_true':
			return `${prop} == true`;
		case 'is_false':
			return `${prop} == false`;
		case 'is_empty':
			return `isEmpty(${prop})`;
		case 'is_not_empty':
			return `!isEmpty(${prop})`;
	}
}

/**
 * Converts a CollectionFilter or string (from YAML) into FilterGroup[] for the visual UI.
 * Returns an empty array for undefined/null input.
 */
export function parseFilterToGroups(filter: CollectionFilter | string | undefined): FilterGroup[] {
	if (filter === undefined || filter === null) return [];

	if (typeof filter === 'string') {
		return [{
			conjunction: 'and',
			rows: [parseExpressionToRow(filter)],
		}];
	}

	const groups: FilterGroup[] = [];

	if (filter.and && filter.and.length > 0) {
		groups.push({
			conjunction: 'and',
			rows: filter.and.map(itemToRow),
		});
	}

	if (filter.or && filter.or.length > 0) {
		groups.push({
			conjunction: 'or',
			rows: filter.or.map(itemToRow),
		});
	}

	if (filter.not && filter.not.length > 0) {
		groups.push({
			conjunction: 'not',
			rows: filter.not.map(itemToRow),
		});
	}

	// If the filter had no recognized keys, return empty
	if (groups.length === 0 && Object.keys(filter).length > 0) {
		// Unknown structure — create a raw fallback
		return [{
			conjunction: 'and',
			rows: [{ id: uid(), property: '', operator: 'is', value: '', raw: JSON.stringify(filter) }],
		}];
	}

	return groups;
}

/**
 * Converts FilterGroup[] (from the UI) back into a CollectionFilter or string or undefined.
 * Returns undefined if there are no filter rows.
 */
export function filterGroupsToFilter(groups: FilterGroup[]): CollectionFilter | string | undefined {
	// Remove empty groups
	const nonEmpty = groups.filter((g) => g.rows.length > 0);
	if (nonEmpty.length === 0) return undefined;

	// Single group with single row → return as plain string
	if (nonEmpty.length === 1 && nonEmpty[0].rows.length === 1) {
		return filterRowToExpression(nonEmpty[0].rows[0]);
	}

	const result: CollectionFilter = {};

	for (const group of nonEmpty) {
		const expressions = group.rows.map(filterRowToExpression);
		if (group.conjunction === 'and') {
			result.and = [...(result.and ?? []), ...expressions];
		} else if (group.conjunction === 'or') {
			result.or = [...(result.or ?? []), ...expressions];
		} else if (group.conjunction === 'not') {
			result.not = [...(result.not ?? []), ...expressions];
		}
	}

	return result;
}

/**
 * Returns the valid filter operators for a given property type.
 */
export function getOperatorsForType(type: PropertyType): FilterOperator[] {
	switch (type) {
		case 'text':
			return ['is', 'is_not', 'contains', 'does_not_contain', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'];
		case 'number':
			return ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'is_empty', 'is_not_empty'];
		case 'date':
			return ['is', 'before', 'after', 'on_or_before', 'on_or_after', 'is_empty', 'is_not_empty'];
		case 'boolean':
			return ['is_true', 'is_false'];
		case 'list':
			return ['is', 'is_not', 'contains', 'does_not_contain', 'is_empty', 'is_not_empty'];
	}
}

/** Standard file.* properties always available */
const FILE_PROPERTIES = [
	'file.name',
	'file.path',
	'file.folder',
	'file.ext',
	'file.size',
	'file.ctime',
	'file.mtime',
];

/**
 * Collects all known property names from the index plus standard file.* properties.
 * Returns sorted: file.* first, then frontmatter properties alphabetically.
 */
export function getAllKnownProperties(index: Map<string, NoteRecord>): string[] {
	const seen = new Set<string>();

	for (const record of index.values()) {
		for (const key of record.properties.keys()) {
			// Skip formula.* — those come from the definition, not the index
			if (!key.startsWith('formula.')) {
				seen.add(key);
			}
		}
	}

	const noteProps = Array.from(seen).sort();
	return [...FILE_PROPERTIES, ...noteProps];
}

/**
 * Infers the PropertyType of a property by sampling values from the index.
 * Defaults to 'text' if the type cannot be determined.
 */
export function inferPropertyType(property: string, index: Map<string, NoteRecord>): PropertyType {
	// File property types are known statically
	switch (property) {
		case 'file.name':
		case 'file.path':
		case 'file.folder':
		case 'file.ext':
			return 'text';
		case 'file.size':
			return 'number';
		case 'file.ctime':
		case 'file.mtime':
			return 'date';
	}

	// Sample values from the index to infer type
	for (const record of index.values()) {
		const value = record.properties.get(property);
		if (value === null || value === undefined) continue;

		if (Array.isArray(value)) return 'list';
		if (typeof value === 'boolean') return 'boolean';
		if (typeof value === 'number') return 'number';
		if (value instanceof Date) return 'date';
		if (typeof value === 'string') {
			// Check if it looks like an ISO date
			if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
			return 'text';
		}
	}

	return 'text';
}

/**
 * Creates an empty FilterRow with sensible defaults for a given property type.
 */
export function createEmptyFilterRow(property: string, type: PropertyType): FilterRow {
	const operators = getOperatorsForType(type);
	return {
		id: uid(),
		property,
		operator: operators[0],
		value: '',
	};
}

// --- Internal helpers ---

/** Converts a FilterItem (string or nested CollectionFilter) to a FilterRow */
function itemToRow(item: FilterItem): FilterRow {
	if (typeof item === 'string') {
		return parseExpressionToRow(item);
	}
	// Nested filter object — can't represent visually, use raw fallback
	return { id: uid(), property: '', operator: 'is', value: '', raw: JSON.stringify(item) };
}

/**
 * Attempts to convert an AST node into a visual FilterRow.
 * Returns null if the AST structure is too complex for the visual filter UI.
 */
function astToFilterRow(ast: ASTNode): FilterRow | null {
	// Binary expression: property op value
	if (ast.type === 'binary') {
		return parseBinaryToRow(ast);
	}

	// Unary negation: !expression
	if (ast.type === 'unary' && ast.op === '!') {
		return parseNegatedToRow(ast.operand);
	}

	// Call expression: contains(prop, value), isEmpty(prop), etc.
	if (ast.type === 'call') {
		return parseCallToRow(ast);
	}

	return null;
}

/** Parses a binary expression AST (e.g. status == 'active') into a FilterRow */
function parseBinaryToRow(ast: ASTNode & { type: 'binary' }): FilterRow | null {
	const property = extractPropertyName(ast.left);
	if (!property) return null;

	// Check if comparing against a date() call (must be before literal extraction)
	if (ast.right.type === 'call' && ast.right.callee === 'date' && ast.right.args.length === 1) {
		const dateVal = extractLiteralValue(ast.right.args[0]);
		if (dateVal !== null) {
			const dateOp = mapDateBinaryOp(ast.op);
			if (dateOp) {
				return { id: uid(), property, operator: dateOp, value: String(dateVal) };
			}
		}
	}

	// Check if comparing against boolean literal
	if (ast.right.type === 'boolean' && ast.op === '==') {
		return { id: uid(), property, operator: ast.right.value ? 'is_true' : 'is_false', value: '' };
	}
	if (ast.right.type === 'boolean' && ast.op === '!=') {
		return { id: uid(), property, operator: ast.right.value ? 'is_false' : 'is_true', value: '' };
	}

	const value = extractLiteralValue(ast.right);
	if (value === null) return null;

	const operator = mapBinaryOp(ast.op, ast.right.type === 'number');
	if (!operator) return null;

	return { id: uid(), property, operator, value: String(value) };
}

/** Parses a negated expression (e.g. !contains(...), !isEmpty(...)) into a FilterRow */
function parseNegatedToRow(operand: ASTNode): FilterRow | null {
	if (operand.type === 'call') {
		if (operand.callee === 'contains' && operand.args.length === 2) {
			const property = extractPropertyName(operand.args[0]);
			const value = extractLiteralValue(operand.args[1]);
			if (property && value !== null) {
				return { id: uid(), property, operator: 'does_not_contain', value: String(value) };
			}
		}
		if (operand.callee === 'isEmpty' && operand.args.length === 1) {
			const property = extractPropertyName(operand.args[0]);
			if (property) {
				return { id: uid(), property, operator: 'is_not_empty', value: '' };
			}
		}
	}
	return null;
}

/** Parses a call expression (e.g. contains(prop, val)) into a FilterRow */
function parseCallToRow(ast: ASTNode & { type: 'call' }): FilterRow | null {
	switch (ast.callee) {
		case 'contains': {
			if (ast.args.length !== 2) return null;
			const property = extractPropertyName(ast.args[0]);
			const value = extractLiteralValue(ast.args[1]);
			if (property && value !== null) {
				return { id: uid(), property, operator: 'contains', value: String(value) };
			}
			return null;
		}
		case 'startsWith': {
			if (ast.args.length !== 2) return null;
			const property = extractPropertyName(ast.args[0]);
			const value = extractLiteralValue(ast.args[1]);
			if (property && value !== null) {
				return { id: uid(), property, operator: 'starts_with', value: String(value) };
			}
			return null;
		}
		case 'endsWith': {
			if (ast.args.length !== 2) return null;
			const property = extractPropertyName(ast.args[0]);
			const value = extractLiteralValue(ast.args[1]);
			if (property && value !== null) {
				return { id: uid(), property, operator: 'ends_with', value: String(value) };
			}
			return null;
		}
		case 'isEmpty': {
			if (ast.args.length !== 1) return null;
			const property = extractPropertyName(ast.args[0]);
			if (property) {
				return { id: uid(), property, operator: 'is_empty', value: '' };
			}
			return null;
		}
		default:
			return null;
	}
}

/** Extracts a property name from an AST node (identifier or member expression) */
function extractPropertyName(node: ASTNode): string | null {
	if (node.type === 'identifier') return node.name;
	if (node.type === 'member') return flattenMember(node);
	return null;
}

/** Flattens a member expression into a dotted string */
function flattenMember(node: ASTNode): string {
	if (node.type === 'identifier') return node.name;
	if (node.type === 'member') {
		return flattenMember(node.object) + '.' + node.property;
	}
	return '';
}

/** Extracts a literal value from an AST node */
function extractLiteralValue(node: ASTNode): string | number | boolean | null {
	if (node.type === 'string') return node.value;
	if (node.type === 'number') return node.value;
	if (node.type === 'boolean') return node.value;
	return null;
}

/** Maps a binary operator to a FilterOperator, optionally for numeric context */
function mapBinaryOp(op: string, isNumeric: boolean): FilterOperator | null {
	if (isNumeric) {
		switch (op) {
			case '==': return 'eq';
			case '!=': return 'neq';
			case '>': return 'gt';
			case '<': return 'lt';
			case '>=': return 'gte';
			case '<=': return 'lte';
			default: return null;
		}
	}
	switch (op) {
		case '==': return 'is';
		case '!=': return 'is_not';
		case '>': return 'gt';
		case '<': return 'lt';
		case '>=': return 'gte';
		case '<=': return 'lte';
		default: return null;
	}
}

/** Maps a binary operator to a date-specific FilterOperator */
function mapDateBinaryOp(op: string): FilterOperator | null {
	switch (op) {
		case '==': return 'is';
		case '<': return 'before';
		case '>': return 'after';
		case '<=': return 'on_or_before';
		case '>=': return 'on_or_after';
		default: return null;
	}
}

/** Always wraps a value in single quotes with proper escaping */
function quoteString(val: string): string {
	const escaped = val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
	return `'${escaped}'`;
}
