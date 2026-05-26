import { parse as yamlParse, Document, type YAMLSeq } from 'yaml';
import { canonicalizeKey } from '$lib/utils/frontmatter-aliases';
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
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) continue;
		properties.push(convertToProperty(canonicalizeKey(rawKey), value));
	}
	parseCache.set(rawFrontmatter, Object.freeze(properties.map(cloneProperty)));
	evictLru();
	return properties;
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

/**
 * Serializes an array of properties into a YAML frontmatter string (without delimiters).
 * Uses the `yaml` Document API for spec-compliant output with inline arrays.
 */
export function serializeProperties(properties: Property[]): string {
	if (properties.length === 0) return '';

	const doc = new Document({});

	for (const p of properties) {
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
