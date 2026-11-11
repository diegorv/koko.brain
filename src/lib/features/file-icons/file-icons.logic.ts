import { parse as parseYaml } from 'yaml';
import type { IconPackId, NormalizedIcon, RecentIcon } from './file-icons.types';
import type { FrontmatterValue } from '#lib/types/vault-v2.types.js';
import { extractRawFrontmatter } from '#lib/core/frontmatter/properties.logic.js';
import { TYPE_PALETTE_NAMES } from '#lib/core/settings/theme-builder.logic.js';

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

/** The icon aliases of `src-tauri/src/vault/aliases.rs`, mapped to their canonical keys. */
const VIEW_ICON_ALIASES = new Map([
	['icon', '_icon'],
	['color', '_color'],
	['title_color', '_title_color'],
]);

/**
 * Folds the icon aliases of a parsed YAML value onto their canonical keys, as
 * Rust's `canonicalize_key` does (ADR-0027), the later key winning when both
 * appear. Null for a value that is not a mapping.
 */
function foldIconAliases(parsed: unknown): Record<string, FrontmatterValue> | null {
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
	const fields: Record<string, FrontmatterValue> = {};
	for (const [key, value] of Object.entries(parsed as Record<string, FrontmatterValue>)) {
		fields[VIEW_ICON_ALIASES.get(key) ?? key] = value;
	}
	return fields;
}

/**
 * Reads the icon keys of a note's frontmatter into the shape the parsed
 * extractors take, so a save and the bulk index read one value the same way.
 * Null without frontmatter or when it is not a mapping. A block the `yaml`
 * package rejects is read line by line, as Rust's fallback does for the bulk index.
 *
 * Runs on every save and debounced edit, and most notes have none of these keys,
 * so text that never mentions them skips the parse. The check looks anywhere in
 * the block, not at line starts: YAML also spells a key `"icon":`, indented, or
 * inside `{icon: x}`. Duplicate keys are allowed since Rust's last one wins, and
 * `logLevel` keeps an unknown tag from warning on each save.
 */
function parseFrontmatterIconFields(content: string): Record<string, FrontmatterValue> | null {
	const raw = extractRawFrontmatter(content);
	if (!raw || !/icon|color/.test(raw)) return null;
	try {
		return foldIconAliases(parseYaml(raw, { uniqueKeys: false, logLevel: 'error' }));
	} catch {
		return readIconFieldsByLine(raw);
	}
}

/** A same-line value `readIconFieldsByLine` does not take as text, besides an empty one or a number. */
const NOT_TEXT_VALUE = /^(?:[[{*].*|~|null|Null|NULL|true|True|TRUE|false|False|FALSE)$/;

/**
 * Reads the icon keys of a block YAML rejects, for these keys what
 * `parse_yaml_lines` in `src-tauri/src/vault/parsing.rs` does: top-level
 * `key: value` lines only, split at the first colon, the later key winning.
 * A value Rust projects to a non-string (a list, null, a boolean, a number) is
 * null here, so the parsed extractors reject it the same way. Unlike Rust, a
 * value starting with `{` or `*` is null too rather than a color or icon name.
 */
function readIconFieldsByLine(raw: string): Record<string, FrontmatterValue> {
	const iconKeys = [...VIEW_ICON_ALIASES.values()];
	const fields: Record<string, FrontmatterValue> = {};
	for (const line of raw.split('\n')) {
		const colonIdx = line.indexOf(':');
		if (colonIdx === -1 || line[0] === ' ' || line[0] === '\t') continue;
		const name = line.slice(0, colonIdx).trim();
		const key = VIEW_ICON_ALIASES.get(name) ?? name;
		if (!iconKeys.includes(key)) continue;
		const value = line.slice(colonIdx + 1).trim();
		if (/^(["']).*\1$/.test(value)) fields[key] = value.slice(1, -1);
		else fields[key] = value && !NOT_TEXT_VALUE.test(value) && Number.isNaN(Number(value)) ? value : null;
	}
	return fields;
}

/**
 * Extracts icon assignment from raw markdown content's YAML frontmatter.
 * Reads `_icon` or `icon` in format `pack:name` (e.g. `lucide:star`) or bare
 * name (e.g. `star`, treated as lucide).
 *
 * Used by the per-save updater path (`updateFrontmatterIconForFile`), which
 * receives raw content from `notifyAfterSave`. The bulk indexer
 * `buildFrontmatterIconIndex` calls `extractIconFromParsedFrontmatter` on
 * Rust-pre-parsed entries instead.
 */
export function extractIconFromFrontmatter(content: string): { iconPack: IconPackId; iconName: string } | null {
	const fields = parseFrontmatterIconFields(content);
	return fields && extractIconFromParsedFrontmatter(fields);
}

/**
 * Extracts `_color` and `_title_color`, or their aliases, from raw markdown frontmatter.
 * Returns an object with optional color and titleColor fields.
 */
export function extractIconColorsFromFrontmatter(content: string): { color?: string; titleColor?: string } {
	const fields = parseFrontmatterIconFields(content);
	return fields ? extractIconColorsFromParsedFrontmatter(fields) : {};
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
 * Whether a color from a vault file may reach an inline style. Svelte first applies
 * a style through `cssText`, so a `;` would add a declaration of the file's choosing,
 * and `url(` could fetch from outside the app. No color needs either.
 */
function isSafeCssValue(value: string): boolean {
	return !/;|url\(/i.test(value);
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
	if (typeof color === 'string' && color.trim() && isSafeCssValue(color)) result.color = color.trim();
	const titleColor = frontmatter['_title_color'];
	if (typeof titleColor === 'string' && titleColor.trim() && isSafeCssValue(titleColor)) result.titleColor = titleColor.trim();
	return result;
}

/** Joins an icon and its colors into one reference; null when the file sets neither. */
export function mergeIconRef(
	icon: { iconPack: IconPackId; iconName: string } | null,
	colors: { color?: string; titleColor?: string },
): { iconPack?: IconPackId; iconName?: string; color?: string; titleColor?: string } | null {
	if (!icon && !colors.color && !colors.titleColor) return null;
	return { ...icon, ...colors };
}

/**
 * Extracts the icon and its colors from a `.view` file. A `.view` body is
 * bare YAML with no `---` fences, so the frontmatter extractors find nothing
 * in it; the whole body is parsed instead and read with the same keys
 * `buildFrontmatterIconIndex` reads from the Rust entries. The unprefixed
 * aliases `icon` / `color` / `title_color` are folded onto those keys first,
 * as Rust's `canonicalize_key` does (ADR-0027), the later key winning when
 * both appear. A body that does not parse, or is not a mapping, yields null.
 */
export function extractViewIcon(
	content: string,
): { iconPack?: IconPackId; iconName?: string; color?: string; titleColor?: string } | null {
	let parsed: unknown;
	try {
		parsed = parseYaml(content);
	} catch {
		return null;
	}
	const fields = foldIconAliases(parsed);
	if (!fields) return null;
	return mergeIconRef(extractIconFromParsedFrontmatter(fields), extractIconColorsFromParsedFrontmatter(fields));
}

/**
 * CSS color for an icon's `_color`: a type palette name (`green`, any case)
 * becomes the active theme's token, `var(--type-green)`; any other value (a
 * hex from the picker, an rgb() or named CSS color) is used as it is. An empty,
 * absent or unsafe color yields undefined, leaving the icon uncolored.
 */
export function iconColorCss(color: string | undefined): string | undefined {
	if (!color || !isSafeCssValue(color)) return undefined;
	const name = color.toLowerCase();
	return (TYPE_PALETTE_NAMES as readonly string[]).includes(name) ? `var(--type-${name})` : color;
}

/**
 * The inline `style` that colors an item's default icon, a Lucide component drawn in
 * `currentColor`, with the item's `_color` when it has no icon of its own: the same color
 * `IconRenderer` gives a custom icon. Undefined without a usable color, so the default icon
 * keeps its muted class color.
 */
export function iconColorStyle(color: string | undefined): string | undefined {
	const css = iconColorCss(color);
	return css ? `color: ${css}` : undefined;
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
