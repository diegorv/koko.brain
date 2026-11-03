import { describe, it, expect } from 'vitest';
import {
	THEME_PACKAGE_SCHEMA_VERSION,
	MAX_CATALOG_LENGTH,
	parseThemePackage,
	parseThemeCatalog,
	buildThemeFromPackage,
	installThemePackage,
	uninstallTheme,
	isInstalledTheme,
	catalogEntryState,
	loadAppearance,
	type ThemePackage,
} from '#lib/core/settings/theme-package.logic.js';
import { buildTheme, coreFromColors } from '#lib/core/settings/theme-builder.logic.js';
import {
	BUILTIN_THEMES,
	DEFAULT_APPEARANCE,
	DEFAULT_THEME_NAME,
	KOKOBRAIN_DEFAULT_THEME,
	normalizeAppearance,
} from '#lib/core/settings/theme.logic.js';
import type { AppearanceSettings } from '#lib/core/settings/theme.types.js';

/** A valid schemaVersion 1 package whose palette is the default theme's core. */
function makePackage(overrides: Partial<ThemePackage> = {}): ThemePackage {
	return {
		schemaVersion: 1,
		id: 'ocean-breeze',
		name: 'Ocean Breeze',
		version: '1.2.3',
		author: 'someone',
		palette: { ...coreFromColors(KOKOBRAIN_DEFAULT_THEME.colors), primary: '#1188cc' },
		...overrides,
	};
}

function appearance(partial: Partial<AppearanceSettings> = {}): AppearanceSettings {
	return { ...normalizeAppearance({}), ...partial };
}

describe('parseThemePackage', () => {
	it('accepts a valid package and keeps its source', () => {
		const pkg = makePackage({ overrides: { ui: { tabBar: '#000000' } } });
		const result = parseThemePackage(JSON.parse(JSON.stringify(pkg)));
		expect(result).toEqual({ kind: 'package', pkg });
	});

	it('accepts a package with no optional palette fields', () => {
		const { inlineFg: _a, linkFg: _b, meta: _c, blockquoteAccent: _d, ...required } = makePackage().palette;
		const result = parseThemePackage({ ...makePackage(), palette: required });
		expect(result.kind).toBe('package');
	});

	it('drops keys outside the package format', () => {
		const result = parseThemePackage({ ...makePackage(), extra: 'x' });
		expect(result.kind === 'package' && 'extra' in result.pkg).toBe(false);
	});

	it.each([
		['not an object', 'x', 'not an object'],
		['missing schemaVersion', { ...makePackage(), schemaVersion: undefined }, 'schemaVersion'],
		['schemaVersion 0', { ...makePackage(), schemaVersion: 0 }, 'schemaVersion'],
		['non-integer schemaVersion', { ...makePackage(), schemaVersion: 1.5 }, 'schemaVersion'],
		['id with uppercase', { ...makePackage(), id: 'Ocean' }, 'id'],
		['id with a trailing dash', { ...makePackage(), id: 'ocean-' }, 'id'],
		['empty name', { ...makePackage(), name: '  ' }, 'name'],
		['version with a pre-release', { ...makePackage(), version: '1.0.0-beta' }, 'version'],
		['version with two parts', { ...makePackage(), version: '1.0' }, 'version'],
		['author not a string', { ...makePackage(), author: 3 }, 'author'],
		['palette missing', { ...makePackage(), palette: undefined }, 'palette'],
		['palette field missing', { ...makePackage(), palette: { ...makePackage().palette, fg: undefined } }, 'palette.fg'],
		['palette unknown key', { ...makePackage(), palette: { ...makePackage().palette, glow: '#fff' } }, 'palette.glow'],
		['palette url value', { ...makePackage(), palette: { ...makePackage().palette, fg: 'url(https://x.test/a)' } }, 'palette.fg'],
		['optional palette field not a color', { ...makePackage(), palette: { ...makePackage().palette, meta: 'red;' } }, 'palette.meta'],
		['overrides not an object', { ...makePackage(), overrides: [] }, 'overrides'],
		['overrides unknown token', { ...makePackage(), overrides: { ui: { glow: '#fff' } } }, 'overrides.ui.glow'],
		['overrides bad value', { ...makePackage(), overrides: { preview: { embedBg: 'var(--x)' } } }, 'overrides.preview.embedBg'],
	])('refuses %s', (_label, raw, path) => {
		const result = parseThemePackage(raw);
		expect(result.kind).toBe('invalid');
		expect(result.kind === 'invalid' && result.error).toContain(path);
	});

	it('reports a schemaVersion above the app as too new, without checking the rest of the format', () => {
		const result = parseThemePackage({
			schemaVersion: THEME_PACKAGE_SCHEMA_VERSION + 1,
			id: 'future',
			name: 'Future',
			version: '2.0.0',
			author: 'someone',
			colors: { whatever: true },
		});
		expect(result).toEqual({
			kind: 'too-new',
			info: { schemaVersion: THEME_PACKAGE_SCHEMA_VERSION + 1, id: 'future', name: 'Future', version: '2.0.0', author: 'someone' },
		});
	});

	it('refuses a too-new entry without a usable id or name', () => {
		expect(parseThemePackage({ schemaVersion: 99, id: 'X X', name: 'Future', version: '2.0.0' }).kind).toBe('invalid');
	});
});

describe('buildThemeFromPackage', () => {
	it('builds the theme with the theme builder, overrides included', () => {
		const pkg = makePackage({ overrides: { syntax: { heading1: '#123456' } } });
		expect(buildThemeFromPackage(pkg)).toEqual(buildTheme(pkg.name, pkg.palette, pkg.overrides));
	});
});

describe('parseThemeCatalog', () => {
	const index = (themes: unknown[]) => JSON.stringify({ schemaVersion: 1, themes });

	it('returns every valid entry in order', () => {
		const a = makePackage();
		const b = makePackage({ id: 'second', name: 'Second' });
		const result = parseThemeCatalog(index([a, b]));
		expect(result).toEqual({ ok: true, entries: [{ kind: 'package', pkg: a }, { kind: 'package', pkg: b }], skipped: [] });
	});

	it('skips an invalid entry, reports why, and keeps the rest', () => {
		const good = makePackage();
		const result = parseThemeCatalog(index([{ ...makePackage({ id: 'bad' }), version: 'one' }, good]));
		expect(result.ok && result.entries).toEqual([{ kind: 'package', pkg: good }]);
		expect(result.ok && result.skipped).toHaveLength(1);
		expect(result.ok && result.skipped[0]).toContain('version');
	});

	it('keeps the first entry of an id and skips later ones, too-new entries included', () => {
		const first = makePackage();
		const copy = makePackage({ name: 'Ocean Copy' });
		const future = { schemaVersion: 2, id: 'ocean-breeze', name: 'Future', version: '1.0.0', author: 'a' };
		const other = makePackage({ id: 'second', name: 'Second' });
		const result = parseThemeCatalog(index([first, copy, future, other]));
		expect(result.ok && result.entries).toEqual([{ kind: 'package', pkg: first }, { kind: 'package', pkg: other }]);
		expect(result.ok && result.skipped).toEqual(['ocean-breeze: duplicate id', 'ocean-breeze: duplicate id']);
	});

	it('keeps a too-new entry so it can be shown', () => {
		const result = parseThemeCatalog(index([{ schemaVersion: 2, id: 'future', name: 'Future', version: '1.0.0', author: 'a' }]));
		expect(result.ok && result.entries[0].kind).toBe('too-new');
	});

	it('refuses text that is not JSON', () => {
		const result = parseThemeCatalog('<html>404</html>');
		expect(result.ok).toBe(false);
		expect(!result.ok && result.error).toMatch(/not valid JSON/);
	});

	it.each([
		['an array', '[]'],
		['an object without themes', '{"schemaVersion":1}'],
		['themes not an array', '{"themes":{}}'],
	])('refuses %s', (_label, text) => {
		expect(parseThemeCatalog(text).ok).toBe(false);
	});

	it('refuses an index over the size cap before parsing it', () => {
		const result = parseThemeCatalog(' '.repeat(MAX_CATALOG_LENGTH + 1));
		expect(result.ok).toBe(false);
		expect(!result.ok && result.error).toMatch(/too large/);
	});
});

describe('installThemePackage', () => {
	it('adds the built theme to the list and the package to installed, without activating it', () => {
		const pkg = makePackage();
		const result = installThemePackage(appearance(), pkg);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.appearance.installed).toEqual([pkg]);
		expect(result.appearance.themes.at(-1)).toEqual(buildThemeFromPackage(pkg));
		expect(result.appearance.activeTheme).toBe(DEFAULT_THEME_NAME);
	});

	it('refuses a name already used by another theme in the list', () => {
		const start = appearance({ themes: [...normalizeAppearance({}).themes, { name: 'Ocean Breeze', colors: KOKOBRAIN_DEFAULT_THEME.colors }] });
		const result = installThemePackage(start, makePackage());
		expect(result).toEqual({ ok: false, error: expect.stringContaining('"Ocean Breeze"') });
	});

	it('refuses a package that is already installed', () => {
		const first = installThemePackage(appearance(), makePackage());
		if (!first.ok) throw new Error('first install failed');
		const again = installThemePackage(first.appearance, makePackage({ name: 'Renamed' }));
		expect(again.ok).toBe(false);
	});
});

describe('uninstallTheme', () => {
	it('removes the theme and its package', () => {
		const installed = installThemePackage(appearance(), makePackage());
		if (!installed.ok) throw new Error('install failed');
		const result = uninstallTheme(installed.appearance, 'Ocean Breeze');
		expect(result.installed).toEqual([]);
		expect(result.themes.some((t) => t.name === 'Ocean Breeze')).toBe(false);
	});

	it('falls back to the default theme when the active theme is uninstalled', () => {
		const installed = installThemePackage(appearance(), makePackage());
		if (!installed.ok) throw new Error('install failed');
		const result = uninstallTheme({ ...installed.appearance, activeTheme: 'Ocean Breeze' }, 'Ocean Breeze');
		expect(result.activeTheme).toBe(DEFAULT_THEME_NAME);
	});

	it('keeps a duplicate made from the installed theme', () => {
		const installed = installThemePackage(appearance(), makePackage());
		if (!installed.ok) throw new Error('install failed');
		const copy = { name: 'Ocean Breeze Copy', colors: structuredClone(buildThemeFromPackage(makePackage()).colors) };
		const result = uninstallTheme({ ...installed.appearance, themes: [...installed.appearance.themes, copy] }, 'Ocean Breeze');
		expect(result.themes.find((t) => t.name === 'Ocean Breeze Copy')).toEqual(copy);
		expect(isInstalledTheme(result, 'Ocean Breeze Copy')).toBe(false);
	});
});

describe('isInstalledTheme', () => {
	it('is true only for a theme that came from a package', () => {
		const installed = installThemePackage(appearance(), makePackage());
		if (!installed.ok) throw new Error('install failed');
		expect(isInstalledTheme(installed.appearance, 'Ocean Breeze')).toBe(true);
		expect(isInstalledTheme(installed.appearance, DEFAULT_THEME_NAME)).toBe(false);
		expect(isInstalledTheme(DEFAULT_APPEARANCE, 'Ocean Breeze')).toBe(false);
	});
});

describe('catalogEntryState', () => {
	it('is "install" for a package that is neither installed nor built in', () => {
		expect(catalogEntryState({ kind: 'package', pkg: makePackage() }, appearance())).toBe('install');
	});

	it('is "installed" when a package with the same id is installed', () => {
		const installed = installThemePackage(appearance(), makePackage());
		if (!installed.ok) throw new Error('install failed');
		expect(catalogEntryState({ kind: 'package', pkg: makePackage({ version: '9.9.9' }) }, installed.appearance)).toBe('installed');
	});

	it('is "builtin" for an entry whose name is a built-in theme', () => {
		const name = BUILTIN_THEMES.at(-1)!.name;
		expect(catalogEntryState({ kind: 'package', pkg: makePackage({ name }) }, appearance())).toBe('builtin');
	});

	it('is "too-new" for an entry with a newer schemaVersion', () => {
		const entry = { kind: 'too-new' as const, info: { schemaVersion: 2, id: 'future', name: 'Future', version: '1.0.0', author: 'a' } };
		expect(catalogEntryState(entry, appearance())).toBe('too-new');
	});
});

describe('loadAppearance', () => {
	it('rebuilds an installed theme from its package, ignoring the colors saved in the list', () => {
		const pkg = makePackage();
		const stale = { name: pkg.name, colors: { ...KOKOBRAIN_DEFAULT_THEME.colors, ui: { ...KOKOBRAIN_DEFAULT_THEME.colors.ui, primary: '#ff0000' } } };
		const result = loadAppearance(JSON.parse(JSON.stringify({ activeTheme: pkg.name, themes: [stale], installed: [pkg] })));
		expect(result.themes[0]).toEqual(buildThemeFromPackage(pkg));
		expect(result.installed).toEqual([pkg]);
		expect(result.activeTheme).toBe(pkg.name);
	});

	it('appends an installed theme missing from the saved list', () => {
		const pkg = makePackage();
		const result = loadAppearance({ installed: [pkg] });
		expect(result.themes.at(-1)).toEqual(buildThemeFromPackage(pkg));
	});

	it('drops an invalid saved package; the colors saved under its name stay as a user theme', () => {
		const bad = { ...makePackage(), palette: { ...makePackage().palette, fg: 'url(x)' } };
		const result = loadAppearance({ themes: [{ name: bad.name, colors: KOKOBRAIN_DEFAULT_THEME.colors }], installed: [bad as ThemePackage] });
		expect(result.installed).toEqual([]);
		expect(result.themes.some((t) => t.name === bad.name)).toBe(true);
	});

	it('behaves like normalizeAppearance when nothing is installed', () => {
		expect(loadAppearance({})).toEqual({ ...normalizeAppearance({}), installed: [] });
	});
});
