import type { FileIconEntry, IconPackId, NormalizedIcon, RecentIcon } from './file-icons.types';
import type { FrontmatterValue } from '$lib/types/vault-v2.types';

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

const VALID_ICON_PACKS: IconPackId[] = [
	'lucide', 'feather', 'fa-solid', 'fa-regular', 'fa-brands',
	'octicons', 'boxicons', 'coolicons', 'simple-icons', 'tabler', 'remix', 'emoji',
];

/** Parses an `icon: pack:name` value into a typed icon ref, validating the pack name. */
function parseIconValue(raw: string): { iconPack: IconPackId; iconName: string } | null {
	const colonIdx = raw.indexOf(':');
	if (colonIdx === -1) return null;

	const pack = raw.slice(0, colonIdx) as IconPackId;
	const name = raw.slice(colonIdx + 1);
	if (!pack || !name) return null;
	if (!VALID_ICON_PACKS.includes(pack)) return null;

	return { iconPack: pack, iconName: name };
}

/**
 * Parses an icon value that may be either `pack:name` or a bare name.
 * Bare names (no colon) are treated as lucide icons.
 */
export function parseIconValuePermissive(raw: string): { iconPack: IconPackId; iconName: string } | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	const strict = parseIconValue(trimmed);
	if (strict) return strict;
	if (trimmed.indexOf(':') !== -1) return null;
	return { iconPack: 'lucide', iconName: trimmed };
}

/**
 * Extracts icon assignment from raw markdown content's YAML frontmatter.
 * Looks for `_icon` or `icon` property in format `pack:name` (e.g. `lucide:star`)
 * or bare name (e.g. `star`, treated as lucide).
 *
 * Used by the per-save updater path (`updateFrontmatterIconForFile`)
 * which receives raw content from `notifyAfterSave`. The bulk indexer
 * `buildFrontmatterIconIndex` uses `extractIconFromParsedFrontmatter`
 * instead — it walks Rust-pre-parsed entries and avoids re-running
 * this regex per file.
 */
export function extractIconFromFrontmatter(content: string): { iconPack: IconPackId; iconName: string } | null {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return null;

	const yaml = match[1];
	const iconMatch = yaml.match(/^_?icon:\s*(.+)$/m);
	if (!iconMatch) return null;

	const raw = iconMatch[1].trim().replace(/^['"]|['"]$/g, '');
	return parseIconValuePermissive(raw);
}

/**
 * Extracts `_color` and `_title_color` from raw markdown frontmatter.
 * Returns an object with optional color and titleColor fields.
 */
export function extractIconColorsFromFrontmatter(content: string): { color?: string; titleColor?: string } {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return {};

	const yaml = match[1];
	const result: { color?: string; titleColor?: string } = {};

	const colorMatch = yaml.match(/^_?color:\s*(.+)$/m);
	if (colorMatch) {
		const raw = colorMatch[1].trim().replace(/^['"]|['"]$/g, '');
		if (raw) result.color = raw;
	}

	const titleColorMatch = yaml.match(/^_?title_color:\s*(.+)$/m);
	if (titleColorMatch) {
		const raw = titleColorMatch[1].trim().replace(/^['"]|['"]$/g, '');
		if (raw) result.titleColor = raw;
	}

	return result;
}

/**
 * Extracts the icon assignment from already-parsed frontmatter (from a
 * Rust `NoteEntryV2.frontmatter` snapshot). Reads `_icon` (canonical key
 * after Rust alias resolution). Accepts both `pack:name` and bare name formats.
 */
export function extractIconFromParsedFrontmatter(
	frontmatter: Record<string, FrontmatterValue>,
): { iconPack: IconPackId; iconName: string } | null {
	const value = frontmatter['_icon'];
	if (typeof value !== 'string') return null;
	return parseIconValuePermissive(value.trim());
}

/**
 * Extracts `_color` and `_title_color` from already-parsed frontmatter.
 * Returns an object with optional color and titleColor fields.
 */
export function extractIconColorsFromParsedFrontmatter(
	frontmatter: Record<string, FrontmatterValue>,
): { color?: string; titleColor?: string } {
	const result: { color?: string; titleColor?: string } = {};
	const color = frontmatter['_color'];
	if (typeof color === 'string' && color.trim()) result.color = color.trim();
	const titleColor = frontmatter['_title_color'];
	if (typeof titleColor === 'string' && titleColor.trim()) result.titleColor = titleColor.trim();
	return result;
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
