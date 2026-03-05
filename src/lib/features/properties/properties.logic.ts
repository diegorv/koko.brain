import { parse as yamlParse, Document, type YAMLSeq } from 'yaml';
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
 * Parses frontmatter YAML into an array of Property objects.
 * Uses the `yaml` library for spec-compliant parsing. Handles all YAML features
 * including block scalars, quoted strings, inline/block arrays, and special characters.
 * Nested objects are skipped (not supported in the Properties panel).
 */
export function parseFrontmatterProperties(content: string): Property[] {
	const raw = extractRawFrontmatter(content);
	if (!raw) return [];

	let parsed: unknown;
	try {
		parsed = yamlParse(raw, { uniqueKeys: false });
	} catch {
		return [];
	}

	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return [];

	const properties: Property[] = [];
	for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) continue;
		properties.push(convertToProperty(key, value));
	}
	return properties;
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
