import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';

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

/**
 * The file name `createFileFromTemplate` writes for a typed name: `.md` is
 * appended unless the name already ends with it (case-sensitive, like the service).
 */
export function withMdExtension(name: string): string {
	return name.endsWith('.md') ? name : `${name}.md`;
}

/**
 * Whether a typed name climbs above the vault root, the names
 * `createFileFromTemplate` refuses. Walks the segments of the name the service
 * sees (`withMdExtension`, so a trailing `..` becomes the file `...md`); `.` and
 * empty segments are skipped, so a leading `/` is vault-relative as in
 * `resolveFilePath`.
 */
export function nameLeavesVault(name: string): boolean {
	let depth = 0;
	for (const segment of withMdExtension(name).split('/')) {
		if (segment === '' || segment === '.') continue;
		depth += segment === '..' ? -1 : 1;
		if (depth < 0) return true;
	}
	return false;
}

/**
 * Whether the note a typed name resolves to (`<vaultPath>/<name>.md`) is a
 * file in the tree. The compare folds case and Unicode normalization because
 * `exists()` is on APFS, which ignores both, so `standup` must match
 * `Standup.md` and an NFC `café` an NFD `café.md` (`findFileNode` is exact). Walks
 * the path's segments from the root; an empty or unloaded tree reports false.
 */
export function noteExistsInTree(tree: FileTreeNode[], vaultPath: string, name: string): boolean {
	const segments = withMdExtension(name).split('/');
	let level: FileTreeNode[] | undefined = tree;
	let current = vaultPath;
	for (let i = 0; i < segments.length; i++) {
		current = `${current}/${segments[i]}`;
		const target = foldPath(current);
		const node: FileTreeNode | undefined = level?.find((n) => foldPath(n.path) === target);
		if (!node) return false;
		if (i === segments.length - 1) return !node.isDirectory;
		if (!node.isDirectory) return false;
		level = node.children;
	}
	return false;
}

/** A path folded the way APFS compares names: NFC, then lowercase. */
function foldPath(path: string): string {
	return path.normalize('NFC').toLowerCase();
}
