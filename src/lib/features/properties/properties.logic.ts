import { parse as yamlParse, Document, type YAMLSeq } from 'yaml';
import { canonicalizeKey } from '$lib/utils/frontmatter-aliases';
import { appendLog } from '$lib/utils/log.service';
import type { Property, PropertyType } from './properties.types';

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;

/**
 * Extracts the raw YAML string from frontmatter delimiters.
 * Returns null if no frontmatter is found.
 */
export function extractRawFrontmatter(content: string): string | null {
	const match = content.match(FRONTMATTER_REGEX);
	return match ? match[1] : null;
}

/**
 * Returns the body content after the frontmatter block.
 * If no frontmatter exists, returns the full content.
 */
export function extractBody(content: string): string {
	const match = content.match(FRONTMATTER_REGEX);
	if (!match) return content;
	return content.slice(match[0].length).replace(/^\r?\n/, '');
}

/**
 * Detects the property type from a raw YAML value string.
 */
export function detectPropertyType(raw: string): PropertyType {
	const trimmed = raw.trim();

	if (trimmed === 'true' || trimmed === 'false') return 'boolean';
	if (trimmed !== '' && !isNaN(Number(trimmed)) && isFinite(Number(trimmed))) return 'number';
	if (ISO_DATE_REGEX.test(trimmed)) return 'date';

	return 'text';
}

/**
 * Converts a parsed YAML value into a Property object with the appropriate type.
 * Handles arrays, booleans, numbers, dates, null, and text.
 */
function convertToProperty(key: string, value: unknown): Property {
	if (Array.isArray(value)) {
		return {
			key,
			value: value.map((item) => {
				if (item === null || item === undefined) return '';
				if (typeof item === 'object') return JSON.stringify(item);
				return String(item);
			}),
			type: 'list',
		};
	}

	if (typeof value === 'boolean') {
		return { key, value, type: 'boolean' };
	}

	if (typeof value === 'number') {
		return { key, value, type: 'number' };
	}

	if (value === null || value === undefined) {
		return { key, value: '', type: 'text' };
	}

	const str = String(value);
	if (ISO_DATE_REGEX.test(str)) {
		return { key, value: str, type: 'date' };
	}

	return { key, value: str, type: 'text' };
}

/**
 * LRU cache for `parseFrontmatterProperties`. Phase 8.12 — meta-bind's
 * input plugin calls this on every CodeMirror update during typing,
 * which means the full document text is parsed at least once per
 * keystroke. The frontmatter usually doesn't change between calls
 * (you're editing the body), so caching by raw frontmatter text
 * eliminates the repeat YAML parse cost.
 *
 * Capacity is intentionally small (16): the same notebook holds a few
 * "current" frontmatter shapes at once (active tab + nearby tabs +
 * meta-bind input rebuilds). LRU eviction handles tab churn.
 *
 * Cache key: the raw frontmatter substring (between `---` delimiters).
 * Cache value: a frozen `Property[]` clone so callers can't accidentally
 * mutate the cached entry. (`Property[]` is otherwise treated as
 * immutable by every consumer; the freeze is defence-in-depth.)
 */
const PARSE_CACHE_CAPACITY = 16;
const parseCache = new Map<string, ReadonlyArray<Property>>();

function cloneProperty(p: Property): Property {
	return Array.isArray(p.value)
		? { key: p.key, value: [...p.value], type: p.type }
		: { key: p.key, value: p.value, type: p.type };
}

function cachedParse(rawFrontmatter: string): Property[] {
	const cached = parseCache.get(rawFrontmatter);
	if (cached !== undefined) {
		// Touch ordering: re-insert to mark as most recently used.
		parseCache.delete(rawFrontmatter);
		parseCache.set(rawFrontmatter, cached);
		return cached.map(cloneProperty);
	}
	return computeAndCache(rawFrontmatter);
}

function computeAndCache(rawFrontmatter: string): Property[] {
	let parsed: unknown;
	try {
		parsed = yamlParse(rawFrontmatter, { uniqueKeys: false });
	} catch {
		// Cache the failure too — repeated parses of malformed YAML are
		// the most expensive case (full parse + throw + catch).
		parseCache.set(rawFrontmatter, Object.freeze([]));
		evictLru();
		return [];
	}

	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
		parseCache.set(rawFrontmatter, Object.freeze([]));
		evictLru();
		return [];
	}

	const properties: Property[] = [];
	for (const [rawKey, value] of Object.entries(parsed as Record<string, unknown>)) {
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			// Nested mappings are not representable in the Properties panel and
			// would be silently lost on round-trip. Surface the data loss in the
			// session log so a developer investigating "where did my nested key
			// go?" can see what happened.
			appendLog(
				'PROPERTIES',
				`dropped nested mapping value for key=${JSON.stringify(rawKey)} during frontmatter parse (round-trip would lose it)`,
			);
			continue;
		}
		properties.push(convertToProperty(canonicalizeKey(rawKey), value));
	}
	// Collapse alias/canonical twins (e.g. `color` + `_color`) into one entry per
	// canonical key. Two entries with the same canonical key would otherwise reach
	// the store and crash PropertiesView's keyed {#each} (each_key_duplicate).
	const deduped = dedupeCanonicalKeys(properties);
	parseCache.set(rawFrontmatter, Object.freeze(deduped.map(cloneProperty)));
	evictLru();
	return deduped;
}

function evictLru(): void {
	while (parseCache.size > PARSE_CACHE_CAPACITY) {
		// Map iteration order is insertion order; the FIRST entry is the
		// least-recently used (oldest cache miss / oldest access).
		const oldest = parseCache.keys().next().value;
		if (oldest === undefined) return;
		parseCache.delete(oldest);
	}
}

/** Test-only: clears the cache so module-level state doesn't leak between tests. */
export function _resetParseFrontmatterCache(): void {
	parseCache.clear();
}

/**
 * Parses frontmatter YAML into an array of Property objects.
 * Uses the `yaml` library for spec-compliant parsing. Handles all YAML features
 * including block scalars, quoted strings, inline/block arrays, and special characters.
 * Nested objects are skipped (not supported in the Properties panel).
 *
 * Phase 8.12: results are cached by raw frontmatter substring so
 * meta-bind's per-keystroke rebuild path doesn't re-parse identical
 * YAML. See `cachedParse` for the cache contract.
 */
export function parseFrontmatterProperties(content: string): Property[] {
	const raw = extractRawFrontmatter(content);
	if (!raw) return [];
	return cachedParse(raw);
}

/**
 * Serializes a Property value to a YAML-compatible string.
 * Uses the `yaml` library for proper quoting, escaping, and formatting.
 */
export function serializePropertyValue(property: Property): string {
	const doc = new Document({});

	if (property.type === 'list') {
		const seq = doc.createNode(property.value as string[]);
		(seq as YAMLSeq).flow = true;
		doc.set('_', seq);
	} else {
		doc.set('_', property.value);
	}

	const str = doc.toString({ lineWidth: 0, flowCollectionPadding: false }).trimEnd();
	return str.startsWith('_: ') ? str.slice(3) : str.slice(str.indexOf(': ') + 2);
}

/** True when a property value carries no data (empty string, null, or empty list). */
function isEmptyPropertyValue(value: Property['value']): boolean {
	if (value === '' || value === null || value === undefined) return true;
	if (Array.isArray(value) && value.length === 0) return true;
	return false;
}

/**
 * Collapses properties whose keys canonicalize to the same name into a single
 * entry per canonical key, returning a new array with canonical keys.
 *
 * `yaml`'s `doc.set` is last-wins: if an alias and its canonical twin (e.g.
 * `color` + `_color`) both reach serialization, the earlier value is silently
 * destroyed. This resolves collisions deterministically instead: a populated
 * value always beats an empty placeholder, and when two populated values
 * collide the first is kept and the discarded one is logged (never silent).
 * Order follows the first appearance of each canonical key.
 */
function dedupeCanonicalKeys(properties: Property[]): Property[] {
	const byKey = new Map<string, Property>();
	for (const p of properties) {
		const key = canonicalizeKey(p.key);
		const prev = byKey.get(key);
		if (!prev) {
			byKey.set(key, { ...p, key });
			continue;
		}
		if (isEmptyPropertyValue(prev.value) && !isEmptyPropertyValue(p.value)) {
			// Existing entry was a placeholder; the populated twin wins (Map.set
			// keeps the original insertion position, so order is preserved).
			byKey.set(key, { ...p, key });
		} else if (!isEmptyPropertyValue(prev.value) && !isEmptyPropertyValue(p.value)) {
			appendLog(
				'PROPERTIES',
				`canonical key collision on ${JSON.stringify(key)}: kept ${JSON.stringify(prev.value)}, discarded ${JSON.stringify(p.value)}`,
			);
		}
		// else: prev already populated, or both empty -> keep prev.
	}
	return [...byKey.values()];
}

/**
 * Serializes an array of properties into a YAML frontmatter string (without delimiters).
 * Uses the `yaml` Document API for spec-compliant output with inline arrays.
 *
 * Keys are canonicalized (via `dedupeCanonicalKeys`) before emission so that
 * Property[] values constructed outside `parseFrontmatterProperties` (e.g. by
 * lifecycle.service, frontmatter-icon.service, deep-link.logic, type-definitions
 * service, or external producers) cannot accidentally write a non-canonical
 * alias. When an alias and its canonical twin coexist they are merged rather
 * than silently last-won (see `dedupeCanonicalKeys`). Idempotent for
 * already-canonical, collision-free input.
 */
export function serializeProperties(properties: Property[]): string {
	if (properties.length === 0) return '';

	const doc = new Document({});

	for (const p of dedupeCanonicalKeys(properties)) {
		if (p.type === 'list') {
			const seq = doc.createNode(p.value as string[]);
			(seq as YAMLSeq).flow = true;
			doc.set(p.key, seq);
		} else {
			doc.set(p.key, p.value);
		}
	}

	return doc.toString({ lineWidth: 0, flowCollectionPadding: false }).trimEnd();
}

/**
 * Sets a property value addressed by a (possibly aliased) meta-bind bind target,
 * matching on the canonical key. Updates the existing canonical property in
 * place when present, otherwise appends a new text property. Returns a new array.
 *
 * Meta-bind bind targets are authored as raw keys (`INPUT[toggle():favorite]`),
 * but `parseFrontmatterProperties` already canonicalizes parsed keys. Matching
 * the raw target literally would miss the canonical twin, append a duplicate,
 * and collide on serialize. Canonicalizing the match here keeps a single entry.
 */
export function setPropertyByBindTarget(
	properties: Property[],
	bindTarget: string,
	value: string,
): Property[] {
	const key = canonicalizeKey(bindTarget);
	if (properties.some((p) => canonicalizeKey(p.key) === key)) {
		return properties.map((p) =>
			canonicalizeKey(p.key) === key ? { ...p, key, value } : p,
		);
	}
	return [...properties, { key, value, type: 'text' as const }];
}

/**
 * Rebuilds the full file content with updated frontmatter properties.
 * Preserves the body content after the frontmatter block.
 */
export function rebuildContent(properties: Property[], body: string): string {
	if (properties.length === 0 && body === '') return '';

	if (properties.length === 0) return body;

	const yaml = serializeProperties(properties);
	return `---\n${yaml}\n---\n${body}`;
}

/**
 * Adds a new empty text property with the given key.
 * Returns a new array without mutating the original.
 */
export function addProperty(properties: Property[], key: string): Property[] {
	return [...properties, { key, value: '', type: 'text' }];
}

/**
 * Removes a property by key.
 * Returns a new array without mutating the original.
 */
export function removeProperty(properties: Property[], key: string): Property[] {
	return properties.filter((p) => p.key !== key);
}

/**
 * Updates a property's value and optionally its type.
 * Returns a new array without mutating the original.
 */
export function updatePropertyValue(
	properties: Property[],
	key: string,
	value: string | number | boolean | string[],
	type?: PropertyType
): Property[] {
	return properties.map((p) => {
		if (p.key !== key) return p;
		return { ...p, value, type: type ?? p.type };
	});
}

/**
 * Renames a property key.
 * Returns a new array without mutating the original.
 */
export function renamePropertyKey(
	properties: Property[],
	oldKey: string,
	newKey: string
): Property[] {
	if (oldKey === newKey) return properties;
	return properties.map((p) => {
		if (p.key !== oldKey) return p;
		return { ...p, key: newKey };
	});
}

// --- Relationship helpers ---

/** Extracts wikilink targets from a property value (string, array, or unknown) */
export function extractWikilinks(value: unknown): string[] {
	const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
	const targets: string[] = [];
	const re = /\[\[([^\]]+)\]\]/g;
	for (const m of text.matchAll(re)) targets.push(m[1]);
	return targets;
}

export interface ResolvedLink {
	raw: string;
	display: string;
	resolvedPath: string | null;
}

/** Resolves wikilink targets from a property value against a list of file paths */
export function resolveRelationshipLinks(
	value: unknown,
	allPaths: string[],
	resolveWikilink: (target: string, paths: string[]) => string | null,
): ResolvedLink[] {
	return extractWikilinks(value).map((t) => {
		const display = t.includes('|') ? t.split('|')[1] : t;
		const target = t.includes('|') ? t.split('|')[0] : t;
		return { raw: t, display, resolvedPath: resolveWikilink(target, allPaths) };
	});
}

/** Computes the new property value after adding a wikilink to a relationship */
export function computeAddRelationshipValue(
	currentValue: string | number | boolean | string[] | undefined,
	fileName: string,
): { value: string | string[]; isNew: boolean } {
	const wikilink = `[[${fileName}]]`;
	if (currentValue === undefined) {
		return { value: wikilink, isNew: true };
	}
	if (Array.isArray(currentValue)) {
		return { value: [...currentValue, wikilink], isNew: false };
	}
	const existing = String(currentValue);
	if (existing.includes('[[')) {
		return { value: [existing, wikilink], isNew: false };
	}
	return { value: wikilink, isNew: false };
}

/** Computes the new property value after removing a wikilink, or null if the property should be deleted */
export function computeRemoveRelationshipValue(
	currentValue: string | number | boolean | string[] | undefined,
	raw: string,
): { value: string[]; shouldDelete: boolean } {
	if (currentValue === undefined) return { value: [], shouldDelete: true };
	const wikilink = `[[${raw}]]`;
	if (Array.isArray(currentValue)) {
		const filtered = currentValue.filter((v) => String(v) !== wikilink);
		return { value: filtered, shouldDelete: filtered.length === 0 };
	}
	return { value: [], shouldDelete: true };
}

/** Converts a snake_case key to Title Case label */
export function formatRelationshipLabel(key: string): string {
	return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
