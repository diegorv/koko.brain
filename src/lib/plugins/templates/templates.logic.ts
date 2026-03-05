/** A template file entry loaded from the _templates/ folder */
export interface TemplateEntry {
	/** Template display name (filename without extension) */
	name: string;
	/** Absolute path to the template file */
	path: string;
}

/**
 * Extracts the title (filename without extension) from an absolute file path.
 */
export function extractTitleFromPath(filePath: string): string {
	const fileName = filePath.split('/').pop() ?? '';
	const dotIndex = fileName.lastIndexOf('.');
	return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
}

/**
 * Builds the absolute path to the templates folder inside a vault.
 */
export function buildTemplatesFolderPath(vaultPath: string, templatesFolder: string): string {
	return `${vaultPath}/${templatesFolder}`;
}

/**
 * Filters template entries by a search query using case-insensitive substring matching.
 */
export function filterTemplates(query: string, templates: TemplateEntry[]): TemplateEntry[] {
	if (!query.trim()) return templates;
	const lower = query.toLowerCase();
	return templates.filter((t) => t.name.toLowerCase().includes(lower));
}
