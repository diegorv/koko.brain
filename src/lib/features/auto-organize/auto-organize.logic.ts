import type { AutoOrganizeRule, RuleProperty } from './auto-organize.types';
import type { Property, PropertyType } from '#lib/core/frontmatter/properties.types.js';
import { isMarkdownFile, isViewFile } from '#lib/core/filesystem/fs.logic.js';
import {
	detectLossyFrontmatter,
	extractRawFrontmatter,
	isEmptyPropertyValue,
	normalizeTypeCasing,
	parseFrontmatterProperties,
} from '#lib/core/frontmatter/properties.logic.js';
import { evaluateFilter } from '#lib/features/collection/collection.logic.js';
import type { FilterItem, PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import {
	evaluateExpression,
	validateExpression as findExpressionError,
	type EvalContext,
} from '#lib/features/collection/expression/evaluator.js';
import { parse } from '#lib/features/collection/expression/parser.js';
import { isFilterObject, isUnaryOperator, parseExpressionToRow } from '#lib/features/collection/toolbar/filter.logic.js';
import type { FilterRow } from '#lib/features/collection/toolbar/toolbar.types.js';
import { canonicalizeKey } from '#lib/utils/frontmatter-aliases.js';

/** The message for a filter row that compares against a blank value, as the view dialog words it. */
export const BLANK_VALUE_ERROR = 'Every filter needs a value';

/**
 * Why an object filter must match nothing, or null when it can run: a value
 * that is not a filter object (`and` / `or` / `not` not lists, a null item),
 * an object with no condition at any depth, a condition that does not parse
 * or names an unknown function, or one the builder shows as a row with a
 * blank value. `evaluateFilter` would treat each of these as false, and
 * inside `not` as true, or treat an empty object as true for every note.
 * A string gets the condition checks only.
 */
export function filterProblem(filter: FilterItem): string | null {
	if (typeof filter === 'string') {
		if (!filter.trim()) return 'Expression cannot be empty';
		const parseError = findExpressionError(filter);
		if (parseError !== undefined) return parseError;
		if (hasBlankValue(parseExpressionToRow(filter))) return BLANK_VALUE_ERROR;
		return null;
	}
	// The JSON config is not validated, and a list passes the shared shape check.
	if (Array.isArray(filter) || !isFilterObject(filter)) return 'Filter is not a list of conditions';
	const items = [...(filter.and ?? []), ...(filter.or ?? []), ...(filter.not ?? [])];
	if (items.length === 0) return 'Filter has no conditions';
	for (const item of items) {
		const problem = filterProblem(item);
		if (problem !== null) return problem;
	}
	return null;
}

/**
 * True for a builder row shown as property, operator and value whose operator
 * needs a value and has none: saved, it would compare against `''`, which
 * most notes match. Expression rows and `is empty`-style operators never are.
 */
export function hasBlankValue(row: FilterRow): boolean {
	return row.raw === undefined && !isUnaryOperator(row.operator) && row.value.trim() === '';
}

/**
 * Whether a rule's filter is true for the note. A string runs as an
 * expression and throws when it does not parse or fails to evaluate; an
 * object runs through the Collection filter (`evaluateFilter`) and throws
 * the `filterProblem` message when it is broken or empty, or the error of
 * the first condition that fails to evaluate on this note (an unknown method,
 * a method on a missing property). `filterProblem` cannot see those ahead of
 * time, and `evaluateFilter` alone would count them as false, so inside `not`
 * the rule would match.
 */
function ruleMatches(expression: FilterItem, ctx: EvalContext): boolean {
	if (typeof expression === 'string') return Boolean(evaluateExpression(expression, ctx));
	const problem = filterProblem(expression);
	if (problem !== null) throw new Error(problem);
	return evaluateFilter(expression, ctx, (err) => {
		throw err;
	});
}

/**
 * Evaluates all rules against a PropertyIndexRecord and returns the first matching rule.
 * Uses first-match-wins semantics (rules are evaluated in order).
 * Only evaluates enabled rules. Invalid expressions are skipped gracefully.
 *
 * @param vaultPath - The vault's absolute path, which a relative
 * `file.inFolder()` resolves against. Required: without it a relative folder
 * rule would silently match nothing.
 * @param onError - Reports a rule whose filter threw or is broken. Optional so this
 * module stays framework-free; the service passes a logger. Without it a
 * broken rule is indistinguishable from a rule that simply did not match,
 * which is how a generated lifecycle rule that threw on every note shipped
 * unnoticed.
 */
export function findMatchingRule(
	rules: AutoOrganizeRule[],
	record: PropertyIndexRecord,
	vaultPath: string,
	onError?: (rule: AutoOrganizeRule, err: unknown) => void,
): AutoOrganizeRule | null {
	for (const rule of rules) {
		if (!rule.enabled) continue;
		try {
			if (ruleMatches(rule.expression, { record, formulas: {}, vaultPath })) return rule;
		} catch (err) {
			// Skip rules with invalid expressions, but do not do it silently.
			onError?.(rule, err);
			continue;
		}
	}
	return null;
}

/**
 * Every enabled rule whose filter is true, in list order. A rule whose
 * filter throws or is broken is skipped and reported through `onError`.
 *
 * @param vaultPath - The vault's absolute path, which a relative
 * `file.inFolder()` resolves against. Required, as in `findMatchingRule`.
 */
export function findMatchingRules(
	rules: AutoOrganizeRule[],
	record: PropertyIndexRecord,
	vaultPath: string,
	onError?: (rule: AutoOrganizeRule, err: unknown) => void,
): AutoOrganizeRule[] {
	const matched: AutoOrganizeRule[] = [];
	for (const rule of rules) {
		if (!rule.enabled) continue;
		try {
			if (ruleMatches(rule.expression, { record, formulas: {}, vaultPath })) matched.push(rule);
		} catch (err) {
			onError?.(rule, err);
		}
	}
	return matched;
}

/**
 * How many notes in `index` a rule with this filter matches now, with the
 * matcher a save uses. 0 for a blank expression, null when a string does not
 * parse or an object filter is broken (`filterProblem`).
 * `.view` records are left out: they are not notes.
 */
export function countMatchingNotes(
	expression: FilterItem,
	index: Map<string, PropertyIndexRecord>,
	vaultPath: string,
): number | null {
	if (typeof expression === 'string') {
		if (!expression.trim()) return 0;
		if (validateExpression(expression) !== null) return null;
	} else if (filterProblem(expression) !== null) {
		return null;
	}
	const probe: AutoOrganizeRule[] = [{ id: '', name: '', expression, destination: '', enabled: true }];
	let count = 0;
	for (const [path, record] of index) {
		if (isViewFile(path)) continue;
		if (findMatchingRules(probe, record, vaultPath).length > 0) count++;
	}
	return count;
}

/**
 * The rule that moves the note: the first one with a non-blank destination.
 * A rule with a blank destination never moves.
 */
export function findMoveRule(matched: AutoOrganizeRule[]): AutoOrganizeRule | null {
	return matched.find((rule) => rule.destination.trim() !== '') ?? null;
}

/**
 * Todoist routes tasks by this key (`todoist-sync/create.logic.ts`,
 * `projects.logic.ts`), so a rule must never set it.
 */
const REFUSED_KEYS = new Set(['todoist_project']);

/** True when `key` (or its alias) is one a rule never sets. */
export function isRefusedKey(key: string): boolean {
	return REFUSED_KEYS.has(canonicalizeKey(key));
}

/**
 * Lifecycle keys that accept only a real boolean: a text `"false"` reads as
 * the default in Rust and TS (`vault/entry.rs`, `properties/lifecycle.logic.ts`),
 * which would send a note out of the Inbox or never archive it.
 */
const BOOLEAN_ONLY_KEYS = new Set(['_organized', '_archived', '_favorite']);

/** True when `key` (or its alias) accepts only a boolean value. */
export function isBooleanOnlyKey(key: string): boolean {
	return BOOLEAN_ONLY_KEYS.has(canonicalizeKey(key));
}

/** The Settings editor for a rule property's value. */
export type RuleValueEditor = 'text' | 'boolean' | 'icon' | 'color' | 'json';

/**
 * Which editor Settings shows for a property value: a yes/no switch for a
 * boolean-only key or a boolean, the icon picker for `_icon`, its color
 * controls for `_color` and `_title_color`, none (`json`) for numbers and
 * lists, which only the config file edits, and text otherwise.
 */
export function ruleValueEditor(key: string, value: RuleProperty['value']): RuleValueEditor {
	const canonical = canonicalizeKey(key);
	if (BOOLEAN_ONLY_KEYS.has(canonical) || typeof value === 'boolean') return 'boolean';
	if (typeof value !== 'string') return 'json';
	if (canonical === '_icon') return 'icon';
	if (canonical === '_color' || canonical === '_title_color') return 'color';
	return 'text';
}

/** True when `value` is a valid `RuleProperty` value: text, number, boolean or a list of text. */
function isRulePropertyValue(value: unknown): value is RuleProperty['value'] {
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * The valid entries of a rule's `properties` as loaded from JSON: a non-array
 * is none, and an entry with a blank key, an unknown mode, a value of another
 * type, the key `todoist_project`, or a non-boolean lifecycle value is dropped.
 */
export function sanitizeRuleProperties(raw: unknown): RuleProperty[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter((entry): entry is RuleProperty => {
		if (entry === null || typeof entry !== 'object') return false;
		const { key, value, mode } = entry as Record<string, unknown>;
		if (typeof key !== 'string' || key.trim() === '') return false;
		if (mode !== 'if-missing' && mode !== 'always') return false;
		if (!isRulePropertyValue(value)) return false;
		const canonical = canonicalizeKey(key);
		if (REFUSED_KEYS.has(canonical)) return false;
		if (BOOLEAN_ONLY_KEYS.has(canonical) && typeof value !== 'boolean') return false;
		return true;
	});
}

/** A property consequence of one run, owned by the rule that named its key first. */
export interface OwnedProperty extends RuleProperty {
	/** Canonical key */
	key: string;
	/** The rule that owns the key for this run */
	rule: AutoOrganizeRule;
}

/**
 * The property consequences of the matching rules, one per canonical key, in
 * rule order then list order. The first rule that names a key owns it, even
 * when its `if-missing` ends up writing nothing; a lower rule's value is ignored.
 * Entries `sanitizeRuleProperties` drops are ignored: Settings keeps an
 * unfinished row (a blank key) in the live rule until the config is reloaded.
 */
export function ownedProperties(matched: AutoOrganizeRule[]): OwnedProperty[] {
	const byKey = new Map<string, OwnedProperty>();
	for (const rule of matched) {
		for (const property of sanitizeRuleProperties(rule.properties)) {
			const key = canonicalizeKey(property.key);
			if (!byKey.has(key)) byKey.set(key, { ...property, key, rule });
		}
	}
	return [...byKey.values()];
}

/** True when two property values are equal; lists compare item by item. */
function sameValue(a: Property['value'] | undefined, b: RuleProperty['value']): boolean {
	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
		return a.every((item, i) => item === b[i]);
	}
	return a === b;
}

/**
 * The owned properties that would change `current` (parsed frontmatter):
 * `if-missing` when the key is absent or empty (`false` and `0` are present),
 * `always` when the value differs.
 */
export function propertiesToWrite(current: Property[], owned: OwnedProperty[]): OwnedProperty[] {
	return owned.filter((property) => {
		const existing = current.find((p) => canonicalizeKey(p.key) === property.key);
		if (property.mode === 'if-missing') return !existing || isEmptyPropertyValue(existing.value);
		return !sameValue(existing?.value, property.value);
	});
}

/** The frontmatter type for a rule value: its JSON type decides the YAML type. */
function propertyType(value: RuleProperty['value']): PropertyType {
	if (Array.isArray(value)) return 'list';
	if (typeof value === 'boolean') return 'boolean';
	if (typeof value === 'number') return 'number';
	return 'text';
}

/**
 * `current` with each write applied: an existing key is replaced in place,
 * a new key is appended. Returns a new array.
 */
export function applyPropertyWrites(current: Property[], writes: OwnedProperty[]): Property[] {
	let next = current;
	for (const { key, value } of writes) {
		const written: Property = { key, value, type: propertyType(value) };
		next = next.some((p) => canonicalizeKey(p.key) === key)
			? next.map((p) => (canonicalizeKey(p.key) === key ? written : p))
			: [...next, written];
	}
	return next;
}

/**
 * Why a rule must not write properties to this note, or null when it may:
 * not Markdown, inside one of `protectedFolders` (vault-relative, matched
 * case-insensitively like `isInExcludedFolder`), a type definition (`_type`
 * is `Type` after the app's first-letter casing; its `_icon` and `_color` are
 * inherited by every note of the type), frontmatter a rewrite would lose data from, or a `---` start with no
 * readable block (writing would stack a second block).
 */
export function propertyWriteSkipReason(
	filePath: string,
	content: string,
	vaultPath: string,
	protectedFolders: string[],
): string | null {
	if (!isMarkdownFile(filePath)) return 'not Markdown';
	const lowerPath = filePath.toLowerCase();
	for (const folder of protectedFolders) {
		const rel = folder.trim().replace(/^\/+|\/+$/g, '');
		if (rel && lowerPath.startsWith(`${vaultPath}/${rel}/`.toLowerCase())) return `inside ${rel}/`;
	}
	const lossy = detectLossyFrontmatter(content);
	if (lossy !== null) return `frontmatter is ${lossy}`;
	if (content.startsWith('---') && extractRawFrontmatter(content) === null) return 'frontmatter block is unreadable';
	const type = parseFrontmatterProperties(content).find((p) => p.key === '_type');
	if (typeof type?.value === 'string' && normalizeTypeCasing(type.value) === 'Type') return 'type definition';
	return null;
}

/**
 * Checks if a file path is inside any excluded folder.
 * Comparison is case-insensitive and matches folder prefix.
 */
export function isInExcludedFolder(
	filePath: string,
	vaultPath: string,
	excludedFolders: string[],
): boolean {
	if (excludedFolders.length === 0) return false;

	// Get vault-relative folder of the file
	const relPath = filePath.startsWith(vaultPath + '/')
		? filePath.slice(vaultPath.length + 1)
		: filePath;
	const lastSlash = relPath.lastIndexOf('/');
	const folder = lastSlash > 0 ? relPath.substring(0, lastSlash) : '';

	return excludedFolders.some((excluded) => {
		const normalizedExcluded = excluded.toLowerCase();
		const normalizedFolder = folder.toLowerCase();
		return (
			normalizedFolder === normalizedExcluded ||
			normalizedFolder.startsWith(normalizedExcluded + '/')
		);
	});
}

/**
 * Checks if a file is already in the rule's destination folder.
 * Prevents unnecessary moves.
 */
export function isAlreadyInDestination(
	filePath: string,
	vaultPath: string,
	destination: string,
): boolean {
	const relPath = filePath.startsWith(vaultPath + '/')
		? filePath.slice(vaultPath.length + 1)
		: filePath;
	const lastSlash = relPath.lastIndexOf('/');
	const folder = lastSlash > 0 ? relPath.substring(0, lastSlash) : '';

	return folder.toLowerCase() === destination.toLowerCase();
}

/**
 * Validates a rule's expression by attempting to parse it.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateExpression(expression: string): string | null {
	if (!expression.trim()) return 'Expression cannot be empty';
	try {
		parse(expression);
		return null;
	} catch (err) {
		return err instanceof Error ? err.message : 'Invalid expression';
	}
}

/**
 * Resolves template variables in a destination string.
 * Variables use {name} syntax (e.g. "{folder}/_archive").
 * Unknown variables are left as-is.
 */
export function resolveDestination(
	template: string,
	record: PropertyIndexRecord,
	vaultPath: string,
): string {
	const absFolder = record.folder;
	const relFolder = absFolder.startsWith(vaultPath + '/')
		? absFolder.slice(vaultPath.length + 1)
		: absFolder === vaultPath
			? ''
			: absFolder;

	const lastSlash = relFolder.lastIndexOf('/');
	const parentFolder = lastSlash > 0 ? relFolder.substring(0, lastSlash) : '';

	const now = new Date();
	const vars: Record<string, string> = {
		folder: relFolder,
		parent: parentFolder,
		basename: record.basename,
		type: String(record.properties.get('_type') ?? ''),
		status: String(record.properties.get('status') ?? ''),
		year: String(now.getFullYear()),
		month: String(now.getMonth() + 1).padStart(2, '0'),
	};

	const resolved = template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
	return resolved.replace(/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '');
}

/**
 * Generates a unique rule ID based on timestamp + random suffix.
 */
export function generateRuleId(): string {
	return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
