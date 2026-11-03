import type { AppearanceSettings, Theme } from './theme.types';
import { buildTheme, type CorePalette, type ThemeOverrides } from './theme-builder.logic';
import { findInvalidThemeToken, isThemeColorValue } from './theme-validation.logic';
import { DEFAULT_THEME_NAME, isBuiltinTheme, normalizeAppearance } from './theme.logic';

/** Highest package `schemaVersion` this app can read. */
export const THEME_PACKAGE_SCHEMA_VERSION = 1;

/** Longest accepted catalog index, in characters. */
export const MAX_CATALOG_LENGTH = 512 * 1024;

/**
 * A theme as published in the `diegorv/koko.brain-themes` catalog: the source
 * `buildTheme` expands, not the expanded tokens, so a token the app adds later
 * is derived for it. See ADR-0035.
 */
export interface ThemePackage {
	/** Package format version; above `THEME_PACKAGE_SCHEMA_VERSION` the app cannot read it */
	schemaVersion: number;
	/** Stable lowercase slug; never changes between versions */
	id: string;
	/** Display name; also the name the theme gets in the theme list */
	name: string;
	/** Plain `MAJOR.MINOR.PATCH` */
	version: string;
	/** Who published the theme */
	author: string;
	/** Core palette handed to `buildTheme` */
	palette: CorePalette;
	/** Tokens the theme sets apart from the derivation */
	overrides?: ThemeOverrides;
}

/** What the catalog shows for an entry whose `schemaVersion` this app cannot read. */
export interface TooNewPackageInfo {
	/** The entry's schemaVersion, above `THEME_PACKAGE_SCHEMA_VERSION` */
	schemaVersion: number;
	/** Package id */
	id: string;
	/** Display name */
	name: string;
	/** Package version, or an empty string when the entry has none */
	version: string;
	/** Author, or an empty string when the entry has none */
	author: string;
}

/** A catalog entry the app can show. */
export type CatalogEntry = { kind: 'package'; pkg: ThemePackage } | { kind: 'too-new'; info: TooNewPackageInfo };

/** Result of reading one package. */
export type PackageParseResult = CatalogEntry | { kind: 'invalid'; error: string };

/** Result of reading the catalog index; `skipped` holds one reason per refused entry. */
export type CatalogParseResult =
	| { ok: true; entries: CatalogEntry[]; skipped: string[] }
	| { ok: false; error: string };

/** How the catalog presents an entry. */
export type CatalogEntryState = 'install' | 'installed' | 'update' | 'builtin' | 'too-new';

const REQUIRED_PALETTE_KEYS: readonly (keyof CorePalette)[] = [
	'editorBg', 'sidebarBg', 'panelBg', 'popoverBg', 'fg', 'heading', 'mutedFg', 'faintFg',
	'border', 'borderStrong', 'hover', 'selected', 'primary', 'primaryFg', 'secondary',
	'selection', 'highlight', 'codeFg', 'codeBg', 'error', 'errorFg',
	'blue', 'green', 'purple', 'yellow',
];
const OPTIONAL_PALETTE_KEYS: readonly (keyof CorePalette)[] = ['inlineFg', 'linkFg', 'meta', 'blockquoteAccent'];
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Returns the first problem of a palette as a `palette.<key>` message, or null. */
function paletteError(palette: unknown): string | null {
	if (!isPlainObject(palette)) return 'palette is not an object';
	for (const key of Object.keys(palette)) {
		if (!REQUIRED_PALETTE_KEYS.includes(key as keyof CorePalette) && !OPTIONAL_PALETTE_KEYS.includes(key as keyof CorePalette)) {
			return `palette.${key} is not a palette field`;
		}
	}
	for (const key of REQUIRED_PALETTE_KEYS) {
		if (!isThemeColorValue(palette[key])) return `palette.${key} is missing or not a valid color`;
	}
	for (const key of OPTIONAL_PALETTE_KEYS) {
		if (palette[key] !== undefined && !isThemeColorValue(palette[key])) return `palette.${key} is not a valid color`;
	}
	return null;
}

/**
 * Reads one package from untrusted JSON. A `schemaVersion` above the app's is
 * reported as too new after checking only the fields the catalog displays,
 * since the rest of a future format is unknown. Every palette and override
 * value must pass `isThemeColorValue`: the values end up in CSS custom properties.
 */
export function parseThemePackage(raw: unknown): PackageParseResult {
	if (!isPlainObject(raw)) return { kind: 'invalid', error: 'package is not an object' };
	const { schemaVersion, id, name, version, author } = raw;
	if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
		return { kind: 'invalid', error: 'schemaVersion is not a positive integer' };
	}
	if (typeof id !== 'string' || !ID_PATTERN.test(id)) return { kind: 'invalid', error: 'id is not a lowercase slug' };
	if (typeof name !== 'string' || name.trim() === '') return { kind: 'invalid', error: `${id}: name is missing` };
	if (schemaVersion > THEME_PACKAGE_SCHEMA_VERSION) {
		return {
			kind: 'too-new',
			info: {
				schemaVersion, id, name,
				version: typeof version === 'string' ? version : '',
				author: typeof author === 'string' ? author : '',
			},
		};
	}
	if (typeof version !== 'string' || !VERSION_PATTERN.test(version)) {
		return { kind: 'invalid', error: `${id}: version is not MAJOR.MINOR.PATCH` };
	}
	if (typeof author !== 'string') return { kind: 'invalid', error: `${id}: author is not a string` };
	const badPalette = paletteError(raw.palette);
	if (badPalette) return { kind: 'invalid', error: `${id}: ${badPalette}` };
	if (raw.overrides !== undefined) {
		const badToken = findInvalidThemeToken(raw.overrides);
		if (badToken === 'colors') return { kind: 'invalid', error: `${id}: overrides is not an object` };
		if (badToken) return { kind: 'invalid', error: `${id}: overrides.${badToken} is not a valid token or color` };
	}
	const pkg: ThemePackage = { schemaVersion, id, name, version, author, palette: raw.palette as unknown as CorePalette };
	if (raw.overrides !== undefined) pkg.overrides = raw.overrides as ThemeOverrides;
	return { kind: 'package', pkg };
}

/**
 * Reads the catalog `index.json` (`{ schemaVersion, themes: ThemePackage[] }`).
 * The index itself must be well formed; an entry that is not, or that repeats
 * an earlier entry's id, is skipped with its reason, so one bad theme does not
 * hide the others.
 */
export function parseThemeCatalog(text: string): CatalogParseResult {
	if (text.length > MAX_CATALOG_LENGTH) return { ok: false, error: 'Theme catalog is too large' };
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		return { ok: false, error: 'Theme catalog is not valid JSON' };
	}
	if (!isPlainObject(data) || !Array.isArray(data.themes)) {
		return { ok: false, error: 'Theme catalog has no themes list' };
	}
	const entries: CatalogEntry[] = [];
	const skipped: string[] = [];
	// The catalog UI keys its rows by id; a repeated id would throw there.
	const seenIds = new Set<string>();
	for (const raw of data.themes) {
		const result = parseThemePackage(raw);
		if (result.kind === 'invalid') {
			skipped.push(result.error);
			continue;
		}
		const id = result.kind === 'package' ? result.pkg.id : result.info.id;
		if (seenIds.has(id)) {
			skipped.push(`${id}: duplicate id`);
			continue;
		}
		seenIds.add(id);
		entries.push(result);
	}
	return { ok: true, entries, skipped };
}

/**
 * Compares two `MAJOR.MINOR.PATCH` versions part by part as numbers, so
 * `1.0.10` is newer than `1.0.9`. Positive when `a` is newer, negative when
 * older, 0 when equal, null when either is not `MAJOR.MINOR.PATCH`.
 */
export function compareThemeVersions(a: string, b: string): number | null {
	if (!VERSION_PATTERN.test(a) || !VERSION_PATTERN.test(b)) return null;
	const pa = a.split('.').map(Number);
	const pb = b.split('.').map(Number);
	for (let i = 0; i < 3; i++) {
		if (pa[i] !== pb[i]) return pa[i] - pb[i];
	}
	return 0;
}

/** True when `candidate` is a valid version above `current`. */
function isNewerVersion(candidate: string, current: string): boolean {
	return (compareThemeVersions(candidate, current) ?? 0) > 0;
}

/** Expands a package into a theme with the theme builder. */
export function buildThemeFromPackage(pkg: ThemePackage): Theme {
	return buildTheme(pkg.name, pkg.palette, pkg.overrides);
}

/** True when the theme named `name` comes from an installed package (cannot be edited in place). */
export function isInstalledTheme(appearance: AppearanceSettings, name: string): boolean {
	return (appearance.installed ?? []).some((p) => p.name === name);
}

/**
 * Installs a package: its built theme joins the theme list and the package is
 * stored as the source. Refused when the package is already installed or its
 * name is taken by another theme. Does not change the active theme.
 */
export function installThemePackage(
	appearance: AppearanceSettings,
	pkg: ThemePackage,
): { ok: true; appearance: AppearanceSettings } | { ok: false; error: string } {
	const installed = appearance.installed ?? [];
	if (installed.some((p) => p.id === pkg.id)) return { ok: false, error: `"${pkg.name}" is already installed.` };
	if (appearance.themes.some((t) => t.name === pkg.name)) {
		return { ok: false, error: `A theme named "${pkg.name}" already exists. Rename it to install this one.` };
	}
	return {
		ok: true,
		appearance: {
			...appearance,
			themes: [...appearance.themes, buildThemeFromPackage(pkg)],
			installed: [...installed, pkg],
		},
	};
}

/**
 * Replaces an installed package with a newer version of the same `id`. The
 * theme is rebuilt in its list position; when the new version renames it, the
 * list entry and `activeTheme` (if it pointed at the old name) take the new
 * name. Refused when the id is not installed, the version is not newer, or
 * the new name belongs to another theme.
 */
export function updateThemePackage(
	appearance: AppearanceSettings,
	pkg: ThemePackage,
): { ok: true; appearance: AppearanceSettings } | { ok: false; error: string } {
	const installed = appearance.installed ?? [];
	const current = installed.find((p) => p.id === pkg.id);
	if (!current) return { ok: false, error: `"${pkg.name}" is not installed.` };
	if (!isNewerVersion(pkg.version, current.version)) {
		return { ok: false, error: `"${current.name}" ${current.version} is already up to date.` };
	}
	if (pkg.name !== current.name && appearance.themes.some((t) => t.name === pkg.name)) {
		return {
			ok: false,
			error: `The new version of "${current.name}" is named "${pkg.name}", and a theme with that name already exists. Rename it to update.`,
		};
	}
	const built = buildThemeFromPackage(pkg);
	return {
		ok: true,
		appearance: {
			...appearance,
			themes: appearance.themes.map((t) => (t.name === current.name ? built : t)),
			installed: installed.map((p) => (p.id === pkg.id ? pkg : p)),
			activeTheme: appearance.activeTheme === current.name ? pkg.name : appearance.activeTheme,
		},
	};
}

/** Removes an installed theme and its package; the active theme falls back to the default. */
export function uninstallTheme(appearance: AppearanceSettings, name: string): AppearanceSettings {
	return {
		...appearance,
		themes: appearance.themes.filter((t) => t.name !== name),
		installed: (appearance.installed ?? []).filter((p) => p.name !== name),
		activeTheme: appearance.activeTheme === name ? DEFAULT_THEME_NAME : appearance.activeTheme,
	};
}

/** Decides what the catalog shows for an entry, given the current appearance settings. */
export function catalogEntryState(entry: CatalogEntry, appearance: AppearanceSettings): CatalogEntryState {
	const { id, name, version } = entry.kind === 'package' ? entry.pkg : entry.info;
	const current = (appearance.installed ?? []).find((p) => p.id === id);
	if (current) {
		if (!isNewerVersion(version, current.version)) return 'installed';
		return entry.kind === 'package' ? 'update' : 'too-new';
	}
	if (isBuiltinTheme(name)) return 'builtin';
	if (entry.kind === 'too-new') return 'too-new';
	return 'install';
}

/**
 * Normalizes saved appearance settings (`normalizeAppearance`) and rebuilds
 * every installed theme from its package: the colors saved in `themes` under
 * an installed name are discarded, the theme keeps its position, and an
 * installed theme missing from the list is appended. A saved package that no
 * longer validates is dropped; the colors saved under its name stay as a user theme.
 */
export function loadAppearance(raw: Partial<AppearanceSettings>): AppearanceSettings {
	const installed: ThemePackage[] = [];
	for (const saved of Array.isArray(raw.installed) ? raw.installed : []) {
		const result = parseThemePackage(saved);
		if (result.kind === 'package') installed.push(result.pkg);
	}
	const base = normalizeAppearance(raw);
	const built = new Map(installed.map((pkg) => [pkg.name, buildThemeFromPackage(pkg)]));
	const themes = base.themes.map((t) => built.get(t.name) ?? t);
	for (const theme of built.values()) {
		if (!themes.includes(theme)) themes.push(theme);
	}
	return { ...base, themes, installed };
}
