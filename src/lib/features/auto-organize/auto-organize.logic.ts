import type { AutoOrganizeRule, RuleProperty, RuleValue } from './auto-organize.types';
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

/**
 * The Settings editor for a rule property's value. `items` is the
 * comma-separated field of an `add`, `none` the missing field of a `remove`.
 */
export type RuleValueEditor = 'text' | 'boolean' | 'icon' | 'color' | 'json' | 'items' | 'none';

/**
 * Which editor Settings shows for a property value: none for `remove`, the
 * items field for `add`, else a yes/no switch for a boolean-only key or a
 * boolean, the icon picker for `_icon`, its color controls for `_color` and
 * `_title_color`, none (`json`) for numbers and lists, which only the config
 * file edits, and text otherwise.
 */
export function ruleValueEditor(key: string, value: RuleValue | undefined, mode: RuleProperty['mode']): RuleValueEditor {
	if (mode === 'remove') return 'none';
	if (mode === 'add') return 'items';
	const canonical = canonicalizeKey(key);
	if (BOOLEAN_ONLY_KEYS.has(canonical) || typeof value === 'boolean') return 'boolean';
	if (typeof value !== 'string') return 'json';
	if (canonical === '_icon') return 'icon';
	if (canonical === '_color' || canonical === '_title_color') return 'color';
	return 'text';
}

/** The items of a comma-separated Settings field: trimmed, blank ones left out. */
export function parseRuleItems(text: string): string[] {
	return text
		.split(',')
		.map((item) => item.trim())
		.filter((item) => item !== '');
}

/** True for text or a list of text. */
function isTextOrTextList(value: unknown): value is string | string[] {
	return typeof value === 'string' || (Array.isArray(value) && value.every((item) => typeof item === 'string'));
}

/** True when `value` is a valid `if-missing` / `always` value: text, number, boolean or a list of text. */
function isRulePropertyValue(value: unknown): value is RuleValue {
	return typeof value === 'number' || typeof value === 'boolean' || isTextOrTextList(value);
}

/**
 * The items an `add` on canonical `key` appends: trimmed, blank ones left out,
 * and on `tags` without a leading `#`, the way the tag readers compare them.
 */
function addItems(key: string, value: RuleValue | undefined): string[] {
	const raw = typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
	return raw.map((item) => withoutTagHash(key, item.trim())).filter((item) => item !== '');
}

/** `item` without one leading `#` when `key` is `tags`, else unchanged. */
function withoutTagHash(key: string, item: string): string {
	return key === 'tags' ? item.replace(/^#/, '') : item;
}

/**
 * The list an `add` of `items` leaves on canonical `key`: a new list when the
 * value is absent or empty, a single string followed by the new items, or the
 * list with the missing items appended in order. Null when every item is
 * already there; `'not-a-list'` for a number or a boolean, which an `add`
 * never overwrites. Items compare as exact strings, `tags` without a leading `#`.
 */
function listAfterAdd(key: string, existing: Property['value'] | undefined, items: string[]): string[] | null | 'not-a-list' {
	let base: string[];
	if (existing === undefined || isEmptyPropertyValue(existing)) base = [];
	else if (Array.isArray(existing)) base = existing;
	else if (typeof existing === 'string') base = [existing];
	else return 'not-a-list';
	const held = new Set(base.map((item) => withoutTagHash(key, item)));
	const next = [...base];
	for (const item of items) {
		if (held.has(item)) continue;
		held.add(item);
		next.push(item);
	}
	return next.length === base.length ? null : next;
}

/**
 * The valid entries of a rule's `properties` as loaded from JSON: a non-array
 * is none, and an entry with a blank key, an unknown mode, a value of another
 * type, the key `todoist_project`, or a non-boolean lifecycle value is dropped.
 * An `add` needs text or a list of text with at least one non-blank item. A
 * `remove` needs no value, and is returned without one: a stray value would
 * read as "remove this item", which `remove` never does.
 */
export function sanitizeRuleProperties(raw: unknown): RuleProperty[] {
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((entry): RuleProperty[] => {
		if (entry === null || typeof entry !== 'object') return [];
		const { key, value, mode } = entry as Record<string, unknown>;
		if (typeof key !== 'string' || key.trim() === '') return [];
		const canonical = canonicalizeKey(key);
		if (REFUSED_KEYS.has(canonical)) return [];
		if (mode === 'remove') return [{ key, mode }];
		const validValue =
			mode === 'add'
				? isTextOrTextList(value) && addItems(canonical, value).length > 0
				: (mode === 'if-missing' || mode === 'always') && isRulePropertyValue(value);
		if (!validValue) return [];
		if (BOOLEAN_ONLY_KEYS.has(canonical) && typeof value !== 'boolean') return [];
		return [entry as RuleProperty];
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
function sameValue(a: Property['value'] | undefined, b: RuleValue | undefined): boolean {
	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
		return a.every((item, i) => item === b[i]);
	}
	return a === b;
}

/**
 * The owned properties that would change `current` (parsed frontmatter):
 * `if-missing` when the key is absent or empty (`false` and `0` are present),
 * `always` when the value differs, `remove` when the key is there whatever its
 * value, `add` when an item is missing from the list.
 *
 * @param onSkip - Called for an `add` the current value refuses (a number or
 * a boolean); it writes nothing.
 */
export function propertiesToWrite(
	current: Property[],
	owned: OwnedProperty[],
	onSkip?: (property: OwnedProperty) => void,
): OwnedProperty[] {
	return owned.filter((property) => {
		const existing = current.find((p) => canonicalizeKey(p.key) === property.key);
		switch (property.mode) {
			case 'if-missing':
				return !existing || isEmptyPropertyValue(existing.value);
			case 'always':
				return !sameValue(existing?.value, property.value);
			case 'remove':
				return existing !== undefined;
			case 'add': {
				const list = listAfterAdd(property.key, existing?.value, addItems(property.key, property.value));
				if (list === 'not-a-list') onSkip?.(property);
				return Array.isArray(list);
			}
		}
	});
}

/** The frontmatter type for a rule value: its JSON type decides the YAML type. */
function propertyType(value: RuleValue): PropertyType {
	if (Array.isArray(value)) return 'list';
	if (typeof value === 'boolean') return 'boolean';
	if (typeof value === 'number') return 'number';
	return 'text';
}

/**
 * `current` with each write applied: a `remove` deletes the key, an `add`
 * writes the merged list, any other write sets its value. An existing key is
 * replaced in place, a new key is appended. Returns a new array.
 */
export function applyPropertyWrites(current: Property[], writes: OwnedProperty[]): Property[] {
	let next = current;
	for (const property of writes) {
		const { key } = property;
		if (property.mode === 'remove') {
			next = next.filter((p) => canonicalizeKey(p.key) !== key);
			continue;
		}
		let written: Property;
		if (property.mode === 'add') {
			const list = listAfterAdd(key, next.find((p) => canonicalizeKey(p.key) === key)?.value, addItems(key, property.value));
			if (!Array.isArray(list)) continue;
			written = { key, value: list, type: 'list' };
		} else {
			// `sanitizeRuleProperties`, which every owned property passed, requires a value for these modes.
			const value = property.value!;
			written = { key, value, type: propertyType(value) };
		}
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
