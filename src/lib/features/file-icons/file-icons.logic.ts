import type { FileIconEntry, IconPackId, NormalizedIcon, RecentIcon } from './file-icons.types';

/** Adds or updates a file icon entry. Returns a new array. */
export function setFileIcon(
	entries: FileIconEntry[],
	path: string,
	iconPack: FileIconEntry['iconPack'],
	iconName: string,
	color?: string,
	textColor?: string,
): FileIconEntry[] {
	const filtered = entries.filter((e) => e.path !== path);
	return [...filtered, { path, iconPack, iconName, color, textColor }];
}

/** Removes a file icon entry by path. Returns unchanged array if not found. */
export function removeFileIcon(entries: FileIconEntry[], path: string): FileIconEntry[] {
	return entries.filter((e) => e.path !== path);
}

/** Looks up a file icon entry by path */
export function getFileIcon(entries: FileIconEntry[], path: string): FileIconEntry | undefined {
	return entries.find((e) => e.path === path);
}

/**
 * Updates icon entry paths after a rename or move.
 * Handles both exact matches and child paths under a renamed directory.
 */
export function updateFileIconPaths(
	entries: FileIconEntry[],
	oldPath: string,
	newPath: string,
): FileIconEntry[] {
	return entries.map((e) => {
		if (e.path === oldPath) {
			return { ...e, path: newPath };
		}
		if (e.path.startsWith(oldPath + '/')) {
			const suffix = e.path.substring(oldPath.length);
			return { ...e, path: newPath + suffix };
		}
		return e;
	});
}

/** Maximum number of recently used icons to keep */
const MAX_RECENT_ICONS = 20;

/**
 * Adds an icon to the recently used list.
 * Moves it to the front if already present. Caps at MAX_RECENT_ICONS.
 */
export function addRecentIcon(recent: RecentIcon[], iconPack: IconPackId, iconName: string): RecentIcon[] {
	const filtered = recent.filter((r) => !(r.iconPack === iconPack && r.iconName === iconName));
	return [{ iconPack, iconName }, ...filtered].slice(0, MAX_RECENT_ICONS);
}

/**
 * Extracts icon assignment from frontmatter properties.
 * Looks for `icon` property in format `pack:name` (e.g. `lucide:star`).
 */
export function extractIconFromFrontmatter(content: string): { iconPack: IconPackId; iconName: string } | null {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return null;

	const yaml = match[1];
	const iconMatch = yaml.match(/^icon:\s*(.+)$/m);
	if (!iconMatch) return null;

	const raw = iconMatch[1].trim().replace(/^['"]|['"]$/g, '');
	const colonIdx = raw.indexOf(':');
	if (colonIdx === -1) return null;

	const pack = raw.slice(0, colonIdx) as IconPackId;
	const name = raw.slice(colonIdx + 1);
	if (!pack || !name) return null;

	const validPacks: IconPackId[] = [
		'lucide', 'feather', 'fa-solid', 'fa-regular', 'fa-brands',
		'octicons', 'boxicons', 'coolicons', 'simple-icons', 'tabler', 'remix', 'emoji',
	];
	if (!validPacks.includes(pack)) return null;

	return { iconPack: pack, iconName: name };
}

/** Filters icons by a search query matching name or keywords */
export function filterIcons(icons: NormalizedIcon[], query: string): NormalizedIcon[] {
	if (!query.trim()) return icons;
	const lower = query.toLowerCase();
	return icons.filter(
		(icon) =>
			icon.name.toLowerCase().includes(lower) ||
			icon.keywords.some((kw) => kw.toLowerCase().includes(lower)),
	);
}
