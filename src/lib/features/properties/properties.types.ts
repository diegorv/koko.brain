/** Supported property value types for auto-detection */
export type PropertyType = 'text' | 'list' | 'number' | 'date' | 'boolean';

/** A single frontmatter property with its detected type */
export interface Property {
	/** The YAML key name */
	key: string;
	/** The parsed value */
	value: string | number | boolean | string[];
	/** Auto-detected type based on the raw YAML value */
	type: PropertyType;
}
