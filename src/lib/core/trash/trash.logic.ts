import type { TrashItem } from './trash.types';

/** Subdirectory inside .kokobrain that stores trashed items */
const TRASH_DIR = '.kokobrain/trash';
/** Filename for the trash metadata manifest */
const TRASH_MANIFEST_FILE = 'trash-manifest.json';
/** Subdirectory inside .kokobrain/trash that holds the actual trashed files/folders */
const TRASH_ITEMS_DIR = 'items';

/** Returns the absolute path to the trash root directory */
export function getTrashDir(vaultPath: string): string {
	return `${vaultPath}/${TRASH_DIR}`;
}

/** Returns the absolute path to the items directory inside trash */
export function getTrashItemsDir(vaultPath: string): string {
	return `${vaultPath}/${TRASH_DIR}/${TRASH_ITEMS_DIR}`;
}

/** Returns the absolute path to the trash manifest JSON file */
export function getTrashManifestPath(vaultPath: string): string {
	return `${vaultPath}/${TRASH_DIR}/${TRASH_MANIFEST_FILE}`;
}

/** Returns the absolute path where a trashed item's content is stored */
export function getTrashItemPath(vaultPath: string, id: string, fileName: string): string {
	return `${vaultPath}/${TRASH_DIR}/${TRASH_ITEMS_DIR}/${id}/${fileName}`;
}

/** Returns the absolute path to a trashed item's container directory */
export function getTrashItemDir(vaultPath: string, id: string): string {
	return `${vaultPath}/${TRASH_DIR}/${TRASH_ITEMS_DIR}/${id}`;
}

/**
 * Creates a new TrashItem from the given vault-relative path.
 * Uses `Date.now()` as the unique ID and timestamp.
 */
export function createTrashItem(originalRelativePath: string, isDirectory: boolean): TrashItem {
	const now = Date.now();
	const fileName = originalRelativePath.includes('/')
		? originalRelativePath.substring(originalRelativePath.lastIndexOf('/') + 1)
		: originalRelativePath;

	return {
		id: crypto.randomUUID(),
		originalPath: originalRelativePath,
		fileName,
		isDirectory,
		trashedAt: now,
	};
}

/**
 * Parses a JSON string into a validated array of TrashItem objects.
 * Returns an empty array for invalid or empty input.
 */
export function parseTrashManifest(json: string): TrashItem[] {
	try {
		const parsed = JSON.parse(json);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isValidTrashItem);
	} catch {
		return [];
	}
}

/** Serializes a TrashItem array to a formatted JSON string */
export function serializeTrashManifest(items: TrashItem[]): string {
	return JSON.stringify(items, null, 2);
}

/**
 * Formats a trash timestamp as a human-readable relative time string.
 * Returns "Just now" for <1 min, "X min ago" for <1 hour,
 * "Xh ago" for <24 hours, or a locale date string for older items.
 */
export function formatTrashedDate(timestamp: number): string {
	const now = Date.now();
	const diffMs = now - timestamp;
	const diffMin = Math.floor(diffMs / 60_000);
	const diffHours = Math.floor(diffMs / 3_600_000);
	const diffDays = Math.floor(diffMs / 86_400_000);

	if (diffMin < 1) return 'Just now';
	if (diffMin < 60) return `${diffMin} min ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 30) return `${diffDays}d ago`;

	const date = new Date(timestamp);
	return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Type guard that validates a value is a well-formed TrashItem */
function isValidTrashItem(value: unknown): value is TrashItem {
	if (typeof value !== 'object' || value === null) return false;
	const obj = value as Record<string, unknown>;
	return (
		typeof obj.id === 'string' &&
		typeof obj.originalPath === 'string' &&
		typeof obj.fileName === 'string' &&
		typeof obj.isDirectory === 'boolean' &&
		typeof obj.trashedAt === 'number'
	);
}
