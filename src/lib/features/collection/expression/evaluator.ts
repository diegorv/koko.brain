import type { ASTNode, DisplayLink, DisplayImage, DisplayIcon, DisplayHTML } from './expression.types';
import { parse } from './parser';
import type { PropertyIndexRecord } from '../collection.types';
import { dispatchMethod, dispatchField } from './methods.logic';
import { parseDuration } from './duration.logic';
import { parseLocalDateOnly } from './date-value.logic';
import { COLOR_PRESET_BG, COLOR_PRESET_TEXT } from '#lib/utils/color-presets.js';
import { clamp } from '#lib/utils/clamp.js';

/** Context provided to the evaluator for resolving properties and formulas */
export interface EvalContext {
	/** The note record being evaluated */
	record: PropertyIndexRecord;
	/** Formula definitions: name to expression string */
	formulas: Record<string, string>;
	/** Absolute vault path, which a relative `file.inFolder()` argument resolves against */
	vaultPath?: string;
}

const MAX_FORMULA_DEPTH = 10;

/** Escapes HTML special characters to prevent injection */
function escapeForHtml(str: string): string {
	return str.replace(/[&<>"']/g, (ch) => {
		switch (ch) {
			case '&': return '&amp;';
			case '<': return '&lt;';
			case '>': return '&gt;';
			case '"': return '&quot;';
			case "'": return '&#39;';
			default: return ch;
		}
	});
}

/**
 * Evaluates a parsed AST node against a context.
 * Returns the computed value (number, string, boolean, Date, or null).
 */
export function evaluate(node: ASTNode, ctx: EvalContext, formulaDepth = 0): unknown {
	switch (node.type) {
		case 'number':
			return node.value;
		case 'string':
			return node.value;
		case 'boolean':
			return node.value;

		case 'identifier':
			return resolveIdentifier(node.name, ctx, formulaDepth);

		case 'member':
			return resolveMember(node, ctx, formulaDepth);

		case 'binary':
			return evaluateBinary(node.op, node.left, node.right, ctx, formulaDepth);

		case 'unary':
			if (node.op === '-') return -toNumber(evaluate(node.operand, ctx, formulaDepth));
			return !toTruthy(evaluate(node.operand, ctx, formulaDepth));

		case 'call':
			return evaluateCall(node.callee, node.args, ctx, formulaDepth);

		case 'methodCall':
			return evaluateMethodCallNode(node.receiver, node.method, node.args, ctx, formulaDepth);

		case 'array':
			return node.elements.map((el) => evaluate(el, ctx, formulaDepth));
	}
}

/**
 * Parses and evaluates an expression string in one call.
 * Convenience wrapper around parse() + evaluate().
 */
export function evaluateExpression(expression: string, ctx: EvalContext): unknown {
	const ast = parse(expression);
	return evaluate(ast, ctx);
}

/**
 * Frontmatter aliases recognised inside filter expressions.
 *
 * Mirrors the parser-side aliases documented in
 * `help/documentation/25-types-and-relationships.md::Frontmatter Key Aliases`
 * (the source-of-truth list). The canonical document-type key is `_type`
 * (system metadata, like `_organized`); the bare `type` identifier resolves
 * to it so `type == "Person"` matches the stored `_type` value. The legacy
 * `is_a` / `is a` aliases were dropped.
 *
 * Keys are the alias as written in the expression; values are the canonical
 * property name to look up in `record.properties`.
 */
const IDENTIFIER_ALIASES: Record<string, string> = {
	type: '_type',
};

/** Returns the canonical property name for an identifier, applying aliases. */
function canonicalPropertyName(name: string): string {
	return IDENTIFIER_ALIASES[name] ?? name;
}

/**
 * Returns true when the AST node resolves the note's `_type` property
 * (as the bare `type` identifier — which aliases to `_type` — the canonical
 * `_type` identifier, or a `note.` / `property.` member access to either).
 *
 * Used by `evaluateBinary` to make `==` / `!=` against the type field
 * case-insensitive. The Rust side normalises the stored value to
 * first-letter-uppercase in `src-tauri/src/vault/entry.rs::normalize_type_casing`,
 * so a user who writes `type == "person"` would otherwise get zero
 * matches against notes containing `type: person`. Limiting the relaxed
 * comparison to this single canonical key keeps unrelated fields
 * (e.g. `name == "alice"`) strictly case-sensitive.
 */
function isTypeIdentifier(node: ASTNode): boolean {
	if (node.type === 'identifier') {
		return canonicalPropertyName(node.name) === '_type';
	}
	if (node.type === 'member' && node.object.type === 'identifier') {
		const ns = node.object.name;
		if (ns === 'note' || ns === 'property') {
			return canonicalPropertyName(node.property) === '_type';
		}
	}
	return false;
}

/**
 * Returns true when the AST node is a literal value (string / number /
 * boolean) rather than a property reference.
 *
 * Used by `evaluateBinary` to gate the case-insensitive `type` comparison:
 * it must only relax case when the type field is compared against a literal
 * the user typed (`type == "person"`), never against another property
 * (`type == status`) — relaxing the latter would silently lowercase the
 * unrelated field's value, making it case-insensitive too.
 */
function isLiteralNode(node: ASTNode): boolean {
	return node.type === 'string' || node.type === 'number' || node.type === 'boolean';
}

/** Resolves a bare identifier to a value from the record's properties */
function resolveIdentifier(name: string, ctx: EvalContext, depth: number): unknown {
	// Check for formula
	if (ctx.formulas[name] !== undefined) {
		return evaluateFormula(name, ctx, depth);
	}
	// Look up in note properties (applying frontmatter aliases)
	return ctx.record.properties.get(canonicalPropertyName(name)) ?? null;
}

/**
 * Resolves a member expression hierarchically.
 * For known namespaces (file, formula, note, property), resolves directly.
 * Otherwise, evaluates the parent value and dispatches field access.
 */
function resolveMember(node: ASTNode & { type: 'member' }, ctx: EvalContext, depth: number): unknown {
	const object = node.object;
	const property = node.property;

	// Handle known namespace prefixes (direct identifier access)
	if (object.type === 'identifier') {
		switch (object.name) {
			case 'file':
				return resolveFileProperty(property, ctx.record);
			case 'formula':
				return evaluateFormula(property, ctx, depth);
			case 'note':
			case 'property':
				return ctx.record.properties.get(canonicalPropertyName(property)) ?? null;
		}
	}

	// Hierarchical: resolve parent value, then dispatch field
	const parentValue = evaluate(object, ctx, depth);
	const fieldResult = dispatchField(parentValue, property);
	if (fieldResult !== undefined) return fieldResult;

	// Fallback: try as dotted property name in record properties
	const path = flattenMember(node);
	return ctx.record.properties.get(path) ?? null;
}

/** Flattens a member expression AST into a dotted string */
function flattenMember(node: ASTNode): string {
	if (node.type === 'identifier') return node.name;
	if (node.type === 'member') {
		return flattenMember(node.object) + '.' + node.property;
	}
	return '';
}

/** Resolves a file.* property from a PropertyIndexRecord */
function resolveFileProperty(prop: string, record: PropertyIndexRecord): unknown {
	switch (prop) {
		case 'name': return record.name;
		case 'basename': return record.basename;
		case 'path': return record.path;
		case 'folder': return record.folder;
		case 'ext': return record.ext;
		case 'size': return record.size;
		case 'ctime': return new Date(record.ctime);
		case 'mtime': return new Date(record.mtime);
		case 'tags': return record.properties.get('tags') ?? [];
		case 'properties': {
			const obj: Record<string, unknown> = {};
			for (const [k, v] of record.properties) {
				obj[k] = v;
			}
			return obj;
		}
		default: return null;
	}
}

/** Evaluates a formula by name, with circular reference detection */
function evaluateFormula(name: string, ctx: EvalContext, depth: number): unknown {
	if (depth >= MAX_FORMULA_DEPTH) {
		throw new Error(`Circular formula reference detected: ${name}`);
	}
	const expr = ctx.formulas[name];
	if (expr === undefined) return null;

	const ast = parse(expr);
	return evaluate(ast, ctx, depth + 1);
}

/** Evaluates a binary operation */
function evaluateBinary(op: string, left: ASTNode, right: ASTNode, ctx: EvalContext, depth: number): unknown {
	// Short-circuit for logical operators
	if (op === '&&') {
		const l = evaluate(left, ctx, depth);
		if (!toTruthy(l)) return l;
		return evaluate(right, ctx, depth);
	}
	if (op === '||') {
		const l = evaluate(left, ctx, depth);
		if (toTruthy(l)) return l;
		return evaluate(right, ctx, depth);
	}

	const l = evaluate(left, ctx, depth);
	const r = evaluate(right, ctx, depth);

	// Date arithmetic: Date +/- duration string, Date - Date
	if (op === '+' || op === '-') {
		if (l instanceof Date && typeof r === 'string') {
			const dur = parseDuration(r);
			if (dur) return new Date(l.getTime() + (op === '+' ? dur.milliseconds : -dur.milliseconds));
		}
		if (op === '-' && l instanceof Date && r instanceof Date) {
			return l.getTime() - r.getTime();
		}
	}

	// Case-insensitive equality for the `type` / `_type` identifier.
	// See `isTypeIdentifier` for the rationale (Rust capitalises the stored
	// value). Scope is narrow: only `==` / `!=`, and only when the type
	// identifier is compared against a *literal* (`type == "person"`). When
	// the other side is another property reference (`type == status`) the
	// comparison stays strictly case-sensitive — otherwise the unrelated
	// field's value would be silently lowercased too.
	if (op === '==' || op === '!=') {
		const typeVsLiteral =
			(isTypeIdentifier(left) && isLiteralNode(right)) ||
			(isTypeIdentifier(right) && isLiteralNode(left));
		if (typeVsLiteral) {
			const ll = typeof l === 'string' ? l.toLowerCase() : l;
			const rr = typeof r === 'string' ? r.toLowerCase() : r;
			return op === '==' ? looseEqual(ll, rr) : !looseEqual(ll, rr);
		}
	}

	switch (op) {
		case '+': return toNumber(l) + toNumber(r);
		case '-': return toNumber(l) - toNumber(r);
		case '*': return toNumber(l) * toNumber(r);
		case '/': { const divisor = toNumber(r); return divisor === 0 ? null : toNumber(l) / divisor; }
		case '%': { const divisor = toNumber(r); return divisor === 0 ? null : toNumber(l) % divisor; }
		case '==': return looseEqual(l, r);
		case '!=': return !looseEqual(l, r);
		case '>': return compareValues(l, r) > 0;
		case '<': return compareValues(l, r) < 0;
		case '>=': return compareValues(l, r) >= 0;
		case '<=': return compareValues(l, r) <= 0;
		default: throw new Error(`Unknown operator: ${op}`);
	}
}

/**
 * The plain (dot-free) function names `evaluateCall` handles. Keep in step with
 * its `switch`: `validateExpression` reports any other plain callee as unknown.
 */
export const PLAIN_FUNCTIONS: ReadonlySet<string> = new Set([
	'if', 'now', 'today', 'date', 'number', 'contains', 'startsWith', 'endsWith',
	'isEmpty', 'max', 'min', 'list', 'duration', 'link', 'image', 'icon', 'html',
	'badge', 'progress', 'color', 'escapeHTML',
]);

/**
 * Checks an expression without running it: it must parse and every plain
 * function it calls must be one the evaluator handles. Method calls
 * (`file.hasTag(...)`, `x.lower()`) are not checked. Returns the reason it
 * fails, or undefined when it passes.
 */
export function validateExpression(expression: string): string | undefined {
	let ast: ASTNode;
	try {
		ast = parse(expression);
	} catch (e) {
		return e instanceof Error ? e.message : String(e);
	}
	const unknown = findUnknownFunction(ast);
	return unknown === undefined ? undefined : `Unknown function: ${unknown}`;
}

/** The first plain callee in the tree that `evaluateCall` does not handle. */
function findUnknownFunction(node: ASTNode): string | undefined {
	switch (node.type) {
		case 'call':
			if (!node.callee.includes('.') && !PLAIN_FUNCTIONS.has(node.callee)) return node.callee;
			return firstUnknown(node.args);
		case 'methodCall':
			return findUnknownFunction(node.receiver) ?? firstUnknown(node.args);
		case 'binary':
			return findUnknownFunction(node.left) ?? findUnknownFunction(node.right);
		case 'unary':
			return findUnknownFunction(node.operand);
		case 'member':
			return findUnknownFunction(node.object);
		case 'array':
			return firstUnknown(node.elements);
		default:
			return undefined;
	}
}

function firstUnknown(nodes: ASTNode[]): string | undefined {
	for (const n of nodes) {
		const found = findUnknownFunction(n);
		if (found !== undefined) return found;
	}
	return undefined;
}

/** Evaluates a function call */
function evaluateCall(callee: string, args: ASTNode[], ctx: EvalContext, depth: number): unknown {
	// Method-style calls: property.method(args) or file.method(args)
	if (callee.includes('.')) {
		return evaluateMethodCall(callee, args, ctx, depth);
	}

	switch (callee) {
		case 'if': {
			const cond = evaluate(args[0], ctx, depth);
			if (toTruthy(cond)) {
				return args[1] ? evaluate(args[1], ctx, depth) : null;
			}
			return args[2] ? evaluate(args[2], ctx, depth) : null;
		}
		case 'now':
			return new Date();
		case 'today': {
			const d = new Date();
			d.setHours(0, 0, 0, 0);
			return d;
		}
		case 'date': {
			const val = args[0] ? evaluate(args[0], ctx, depth) : null;
			if (typeof val === 'string') {
				const day = parseLocalDateOnly(val);
				if (day) {
					dayPrecisionDates.add(day);
					return day;
				}
			}
			return val ? new Date(String(val)) : null;
		}
		case 'number': {
			const val = args[0] ? evaluate(args[0], ctx, depth) : null;
			if (val instanceof Date) return val.getTime();
			if (typeof val === 'boolean') return val ? 1 : 0;
			return Number(val);
		}
		case 'contains': {
			const haystack = String(evaluate(args[0], ctx, depth) ?? '');
			const needle = String(evaluate(args[1], ctx, depth) ?? '');
			return haystack.toLowerCase().includes(needle.toLowerCase());
		}
		case 'startsWith': {
			const str = String(evaluate(args[0], ctx, depth) ?? '');
			const prefix = String(evaluate(args[1], ctx, depth) ?? '');
			return str.toLowerCase().startsWith(prefix.toLowerCase());
		}
		case 'endsWith': {
			const str = String(evaluate(args[0], ctx, depth) ?? '');
			const suffix = String(evaluate(args[1], ctx, depth) ?? '');
			return str.toLowerCase().endsWith(suffix.toLowerCase());
		}
		case 'isEmpty': {
			const val = evaluate(args[0], ctx, depth);
			if (val === null || val === undefined || val === '') return true;
			if (Array.isArray(val) && val.length === 0) return true;
			return false;
		}
		case 'max': {
			const values = args.map((a) => Number(evaluate(a, ctx, depth) ?? 0));
			return Math.max(...values);
		}
		case 'min': {
			const values = args.map((a) => Number(evaluate(a, ctx, depth) ?? 0));
			return Math.min(...values);
		}
		case 'list': {
			const val = args[0] ? evaluate(args[0], ctx, depth) : null;
			if (Array.isArray(val)) return val;
			return val !== null && val !== undefined ? [val] : [];
		}
		case 'duration': {
			const val = args[0] ? evaluate(args[0], ctx, depth) : null;
			const dur = parseDuration(String(val ?? ''));
			return dur ? dur.milliseconds : 0;
		}
		case 'link': {
			const href = String(evaluate(args[0], ctx, depth) ?? '');
			const display = args[1] ? String(evaluate(args[1], ctx, depth)) : href;
			return { __display: 'link', href, display } satisfies DisplayLink;
		}
		case 'image': {
			const src = String(evaluate(args[0], ctx, depth) ?? '');
			const alt = args[1] ? String(evaluate(args[1], ctx, depth)) : '';
			return { __display: 'image', src, alt } satisfies DisplayImage;
		}
		case 'icon': {
			const name = String(evaluate(args[0], ctx, depth) ?? '');
			return { __display: 'icon', name } satisfies DisplayIcon;
		}
		case 'html': {
			const content = String(evaluate(args[0], ctx, depth) ?? '');
			return { __display: 'html', html: content } satisfies DisplayHTML;
		}
		case 'badge': {
			const text = escapeForHtml(String(evaluate(args[0], ctx, depth) ?? ''));
			const colorName = args[1] ? String(evaluate(args[1], ctx, depth)) : 'gray';
			const bg = COLOR_PRESET_BG[colorName] ?? COLOR_PRESET_BG.gray;
			const fg = COLOR_PRESET_TEXT[colorName] ?? COLOR_PRESET_TEXT.gray;
			return { __display: 'html', html: `<span style="display:inline-flex;align-items:center;border-radius:9999px;padding:1px 8px;font-size:0.85em;font-weight:500;background:${bg};color:${fg}">${text}</span>` } satisfies DisplayHTML;
		}
		case 'progress': {
			const value = Number(evaluate(args[0], ctx, depth) ?? 0);
			const max = args[1] ? Number(evaluate(args[1], ctx, depth)) : 100;
			const colorName = args[2] ? String(evaluate(args[2], ctx, depth)) : 'green';
			const bar = COLOR_PRESET_TEXT[colorName] ?? COLOR_PRESET_TEXT.green;
			const pct = clamp((value / (max || 1)) * 100, 0, 100);
			return { __display: 'html', html: `<div style="display:inline-flex;align-items:center;gap:6px"><div style="width:80px;height:6px;border-radius:9999px;background:rgba(160,160,160,0.2);overflow:hidden"><div style="height:100%;width:${pct}%;border-radius:9999px;background:${bar}"></div></div><span style="font-size:0.85em;color:rgb(160,160,160)">${Math.round(pct)}%</span></div>` } satisfies DisplayHTML;
		}
		case 'color': {
			const text = escapeForHtml(String(evaluate(args[0], ctx, depth) ?? ''));
			const colorName = args[1] ? String(evaluate(args[1], ctx, depth)) : 'gray';
			const fg = COLOR_PRESET_TEXT[colorName] ?? COLOR_PRESET_TEXT.gray;
			return { __display: 'html', html: `<span style="color:${fg}">${text}</span>` } satisfies DisplayHTML;
		}
		case 'escapeHTML': {
			const str = String(evaluate(args[0], ctx, depth) ?? '');
			return escapeForHtml(str);
		}
		default:
			throw new Error(`Unknown function: ${callee}`);
	}
}

/**
 * Evaluates a method-style call like file.hasTag("x"), status.lower().
 * Splits the callee on the last dot to resolve the object and method name.
 */
function evaluateMethodCall(callee: string, args: ASTNode[], ctx: EvalContext, depth: number): unknown {
	const lastDot = callee.lastIndexOf('.');
	const objectPath = callee.substring(0, lastDot);
	const method = callee.substring(lastDot + 1);

	// file.* methods operate on the record, not a resolved value
	if (objectPath === 'file') {
		return evaluateFileMethod(method, args, ctx, depth);
	}

	// Resolve property value
	const value = resolvePropertyPath(objectPath, ctx, depth);

	// Higher-order list methods: filter/map take unevaluated AST expressions
	if (Array.isArray(value) && (method === 'filter' || method === 'map')) {
		return evaluateListHigherOrder(value, method, args[0], ctx, depth);
	}

	// Dispatch through registry with evaluated args
	const evaluatedArgs = args.map((a) => evaluate(a, ctx, depth));
	return dispatchMethod(value, method, evaluatedArgs);
}

/**
 * Evaluates a structural method call whose receiver is a computed AST node
 * (e.g. `now().format("YYYY")`). The receiver is evaluated first, then the
 * method is dispatched on the resulting value. Higher-order list methods
 * (filter/map) still receive the unevaluated expression argument.
 */
function evaluateMethodCallNode(receiver: ASTNode, method: string, args: ASTNode[], ctx: EvalContext, depth: number): unknown {
	const value = evaluate(receiver, ctx, depth);

	if (Array.isArray(value) && (method === 'filter' || method === 'map')) {
		return evaluateListHigherOrder(value, method, args[0], ctx, depth);
	}

	const evaluatedArgs = args.map((a) => evaluate(a, ctx, depth));
	return dispatchMethod(value, method, evaluatedArgs);
}

/**
 * Evaluates higher-order list methods (filter, map).
 * The expression argument is evaluated once per element with `value` and `index` injected into context.
 */
function evaluateListHigherOrder(
	list: unknown[],
	method: string,
	exprNode: ASTNode,
	ctx: EvalContext,
	depth: number,
): unknown {
	const originalProps = ctx.record.properties;

	if (method === 'filter') {
		return list.filter((item, index) => {
			const props = new Map(originalProps);
			props.set('value', item);
			props.set('index', index);
			ctx.record.properties = props;
			try {
				const result = evaluate(exprNode, ctx, depth);
				return toTruthy(result);
			} finally {
				ctx.record.properties = originalProps;
			}
		});
	}

	if (method === 'map') {
		return list.map((item, index) => {
			const props = new Map(originalProps);
			props.set('value', item);
			props.set('index', index);
			ctx.record.properties = props;
			try {
				const result = evaluate(exprNode, ctx, depth);
				return result;
			} finally {
				ctx.record.properties = originalProps;
			}
		});
	}

	return list;
}

/** Handles file.* method calls that operate on the record */
function evaluateFileMethod(method: string, args: ASTNode[], ctx: EvalContext, depth: number): unknown {
	switch (method) {
		case 'hasTag': {
			const tags = ctx.record.properties.get('tags');
			if (!Array.isArray(tags)) return false;
			// Variadic: file.hasTag("a", "b") checks if any match
			const needles = args.map((a) => String(evaluate(a, ctx, depth) ?? '').toLowerCase());
			return needles.some((needle) => tags.some((t) => String(t).toLowerCase() === needle));
		}
		case 'inFolder': {
			const arg = String(evaluate(args[0], ctx, depth) ?? '');
			const trimmed = arg.replace(/\/+$/, '');
			// A relative folder is vault-relative; without a vault path it cannot be resolved.
			let target: string;
			if (arg.startsWith('/')) target = trimmed;
			else if (ctx.vaultPath === undefined) return false;
			else target = trimmed ? `${ctx.vaultPath}/${trimmed}` : ctx.vaultPath;
			const folder = ctx.record.folder.toLowerCase();
			const wanted = target.toLowerCase();
			return folder === wanted || folder.startsWith(wanted + '/');
		}
		case 'hasProperty': {
			const propName = String(evaluate(args[0], ctx, depth) ?? '');
			return ctx.record.properties.has(propName);
		}
		case 'asLink': {
			const display = args[0] ? String(evaluate(args[0], ctx, depth) ?? '') : '';
			const path = ctx.record.path;
			return display ? `[[${path}|${display}]]` : `[[${path}]]`;
		}
		default:
			throw new Error(`Unknown file method: ${method}`);
	}
}

/**
 * Resolves a dotted property path to a value from the context.
 *
 * Known limitation: nested frontmatter objects are not traversed.
 * For `meta: { title: "hello" }`, `meta.title` looks up the literal
 * key "meta.title" in record.properties — it does NOT resolve `meta`
 * then access `.title` on the object. This matches Obsidian's behavior.
 *
 * Property lookups go through {@link canonicalPropertyName} so the `type`
 * alias resolves to the stored `_type`, matching {@link resolveIdentifier}
 * and {@link resolveMember}. Without it `type.lower()` (a dotted-callee
 * `call` node — see `parser.ts` `isStaticPath`) resolved to null while the
 * bare `type` identifier resolved correctly.
 */
function resolvePropertyPath(path: string, ctx: EvalContext, depth: number): unknown {
	if (path.startsWith('file.')) {
		return resolveFileProperty(path.slice(5), ctx.record);
	}
	if (path.startsWith('formula.')) {
		return evaluateFormula(path.slice(8), ctx, depth);
	}
	if (path.startsWith('note.')) {
		return ctx.record.properties.get(canonicalPropertyName(path.slice(5))) ?? null;
	}
	if (path.startsWith('property.')) {
		return ctx.record.properties.get(canonicalPropertyName(path.slice(9))) ?? null;
	}
	if (ctx.formulas[path] !== undefined) {
		return evaluateFormula(path, ctx, depth);
	}
	return ctx.record.properties.get(canonicalPropertyName(path)) ?? null;
}

/** Converts a value to a number for arithmetic */
function toNumber(val: unknown): number {
	if (val instanceof Date) return val.getTime();
	if (typeof val === 'boolean') return val ? 1 : 0;
	if (val === null || val === undefined) return 0;
	return Number(val);
}

/** Checks truthiness of a value */
function toTruthy(val: unknown): boolean {
	if (val === null || val === undefined) return false;
	if (val === 0 || val === '' || val === false) return false;
	return true;
}

/** True when both dates fall on the same local calendar day */
function isSameLocalDay(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Dates the `date` builtin built from a `YYYY-MM-DD` string. Comparing or
 * equating against one truncates the other side to its local day start, so the
 * toolbar's `due <= date('2026-03-01')` includes a note dated
 * `2026-03-01T10:00`. A WeakSet keeps the mark off the `Date` type.
 */
const dayPrecisionDates = new WeakSet<Date>();

/** True when `val` is a `date('YYYY-MM-DD')` result */
function isDayPrecision(val: unknown): boolean {
	return val instanceof Date && dayPrecisionDates.has(val);
}

/** Local midnight of the day `date` falls on */
function localDayStart(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * An ISO date, optionally followed by a time. `new Date` alone would also read
 * plain text such as `Week 3` or `5` as a date in 2001.
 */
const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}([T ]|$)/;

/**
 * Reads the operand paired with a Date as milliseconds: a Date as is, a
 * `YYYY-MM-DD` string as local midnight, an ISO datetime string through
 * `new Date`.
 * @param byDay - truncate a date operand to its local day start
 * @returns `NaN` (every comparison false) for null, undefined, or a string that
 *   is not an ISO date or does not parse; any other value goes through `toNumber`
 */
function dateOperandTime(val: unknown, byDay: boolean): number {
	let date: Date | null = null;
	if (val instanceof Date) date = val;
	else if (typeof val === 'string') {
		if (!ISO_DATE_PREFIX.test(val)) return NaN;
		date = parseLocalDateOnly(val) ?? new Date(val);
	}
	if (date) return (byDay ? localDayStart(date) : date).getTime();
	if (val === null || val === undefined) return NaN;
	return toNumber(val);
}

/** Loose equality comparison — handles dates and type coercion */
function looseEqual(a: unknown, b: unknown): boolean {
	if (isDayPrecision(a) || isDayPrecision(b)) return dateOperandTime(a, true) === dateOperandTime(b, true);
	if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
	// A Date against a `YYYY-MM-DD` string (the toolbar's date "is" row,
	// `file.mtime == '2026-11-03'`) matches the whole local calendar day.
	if (a instanceof Date && typeof b === 'string') {
		const day = parseLocalDateOnly(b);
		if (day) return isSameLocalDay(a, day);
	}
	if (b instanceof Date && typeof a === 'string') {
		const day = parseLocalDateOnly(a);
		if (day) return isSameLocalDay(b, day);
	}
	if (a instanceof Date) return a.getTime() === toNumber(b);
	if (b instanceof Date) return toNumber(a) === b.getTime();
	// eslint-disable-next-line eqeqeq
	return a == b;
}

/** Compares two values, handling dates and strings */
function compareValues(a: unknown, b: unknown): number {
	if (a instanceof Date || b instanceof Date) {
		const byDay = isDayPrecision(a) || isDayPrecision(b);
		return dateOperandTime(a, byDay) - dateOperandTime(b, byDay);
	}
	if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
	return toNumber(a) - toNumber(b);
}
