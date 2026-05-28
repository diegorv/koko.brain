/**
 * Frontmatter key alias resolution.
 * Maps alternative spellings of system metadata keys to their canonical form.
 */

const ALIAS_MAP: ReadonlyMap<string, string> = new Map([
	['is_a', 'type'],
	['is a', 'type'],
	['organized', '_organized'],
	['archived', '_archived'],
	['favorite', '_favorite'],
	['order', '_order'],
	['favorite_index', '_favorite_index'],
	['sort', '_sort'],
	['icon', '_icon'],
	['sidebar_label', '_sidebar_label'],
	['sidebar label', '_sidebar_label'],
	['color', '_color'],
	['title_color', '_title_color'],
	['template', '_template'],
	['view', '_view'],
	['visible', '_visible'],
	['list_properties_display', '_list_properties_display'],
]);

/**
 * Returns the canonical key name if the input matches a known alias,
 * otherwise returns the input unchanged.
 */
export function canonicalizeKey(key: string): string {
	return ALIAS_MAP.get(key) ?? key;
}
