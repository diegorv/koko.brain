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
	compareThemeVersions,
	updateThemePackage,
	loadAppearance,
	sortThemesForDisplay,
	sortCatalogEntries,
	type CatalogEntry,
	type ThemePackage,
} from '#lib/core/settings/theme-package.logic.js';
import { buildTheme, coreFromColors } from '#lib/core/settings/theme-builder.logic.js';
import {
	DEFAULT_APPEARANCE,
	DEFAULT_THEME_NAME,
	KOKOBRAIN_DEFAULT_THEME,
	LAVENDER_HAZE_THEME,
	normalizeAppearance,
	themeColorsToCssVars,
} from '#lib/core/settings/theme.logic.js';
import type { AppearanceSettings, Theme } from '#lib/core/settings/theme.types.js';
import legacyFixture from '../../../fixtures/legacy-builtin-themes.fixture.json';

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
	return { ...loadAppearance({}), ...partial };
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

	it('accepts overrides that still carry the retired frontmatter tokens and drops them', () => {
		const overrides = { preview: { frontmatterBg: '#ece7da', frontmatterBorder: '#ddd6c6', embedBg: '#123456' } };
		const result = parseThemePackage({ ...makePackage(), overrides });
		expect(result).toEqual({ kind: 'package', pkg: makePackage({ overrides: { preview: { embedBg: '#123456' } } }) });
		const vars = result.kind === 'package' ? themeColorsToCssVars(buildThemeFromPackage(result.pkg).colors) : {};
		expect(Object.keys(vars).filter((name) => name.startsWith('--lp-frontmatter'))).toEqual([]);
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

	it('keeps a catalog entry whose overrides carry the retired frontmatter tokens', () => {
		const entry = { ...makePackage(), overrides: { preview: { frontmatterBg: '#ece7da' } } };
		const result = parseThemeCatalog(index([entry]));
		expect(result.ok && result.skipped).toEqual([]);
		expect(result.ok && result.entries).toEqual([{ kind: 'package', pkg: makePackage({ overrides: { preview: {} } }) }]);
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

	it('is "installed" when a package with the same id and version is installed', () => {
		const installed = installThemePackage(appearance(), makePackage());
		if (!installed.ok) throw new Error('install failed');
		expect(catalogEntryState({ kind: 'package', pkg: makePackage({ name: 'Renamed' }) }, installed.appearance)).toBe('installed');
	});

	it('is "update" when the catalog has a newer version of an installed id', () => {
		const installed = installThemePackage(appearance(), makePackage({ version: '1.0.9' }));
		if (!installed.ok) throw new Error('install failed');
		expect(catalogEntryState({ kind: 'package', pkg: makePackage({ version: '1.0.10' }) }, installed.appearance)).toBe('update');
	});

	it('is "installed", never a downgrade, when the catalog version is older', () => {
		const installed = installThemePackage(appearance(), makePackage({ version: '2.0.0' }));
		if (!installed.ok) throw new Error('install failed');
		expect(catalogEntryState({ kind: 'package', pkg: makePackage({ version: '1.9.9' }) }, installed.appearance)).toBe('installed');
	});

	it('is "too-new" for a newer version of an installed id whose schemaVersion the app does not know', () => {
		const installed = installThemePackage(appearance(), makePackage({ version: '1.0.0' }));
		if (!installed.ok) throw new Error('install failed');
		const info = { schemaVersion: 2, id: 'ocean-breeze', name: 'Ocean Breeze', version: '1.0.2', author: 'a' };
		expect(catalogEntryState({ kind: 'too-new', info }, installed.appearance)).toBe('too-new');
		expect(catalogEntryState({ kind: 'too-new', info: { ...info, version: '1.0.0' } }, installed.appearance)).toBe('installed');
		expect(catalogEntryState({ kind: 'too-new', info: { ...info, version: '' } }, installed.appearance)).toBe('installed');
	});

	it('is "install", never "update", when only a duplicate of the theme is present', () => {
		const pkg = makePackage({ version: '1.0.0' });
		const duplicate = { ...buildThemeFromPackage(pkg), name: 'Ocean Breeze Copy' };
		const start = appearance({ themes: [...appearance().themes, duplicate] });
		expect(catalogEntryState({ kind: 'package', pkg: makePackage({ version: '2.0.0' }) }, start)).toBe('install');
	});

	it('is "too-new" for an entry with a newer schemaVersion', () => {
		const entry = { kind: 'too-new' as const, info: { schemaVersion: 2, id: 'future', name: 'Future', version: '1.0.0', author: 'a' } };
		expect(catalogEntryState(entry, appearance())).toBe('too-new');
	});
});

describe('compareThemeVersions', () => {
	it('compares each part numerically', () => {
		expect(compareThemeVersions('1.0.10', '1.0.9')).toBeGreaterThan(0);
		expect(compareThemeVersions('1.0.9', '1.0.10')).toBeLessThan(0);
		expect(compareThemeVersions('1.10.0', '1.9.99')).toBeGreaterThan(0);
		expect(compareThemeVersions('10.0.0', '9.0.0')).toBeGreaterThan(0);
	});

	it('is 0 for equal versions', () => {
		expect(compareThemeVersions('1.2.3', '1.2.3')).toBe(0);
	});

	it('is null when either version is not MAJOR.MINOR.PATCH', () => {
		expect(compareThemeVersions('1.0', '1.0.0')).toBeNull();
		expect(compareThemeVersions('1.0.0', '1.0.0-beta')).toBeNull();
		expect(compareThemeVersions('', '1.0.0')).toBeNull();
		expect(compareThemeVersions('v1.0.0', '1.0.0')).toBeNull();
	});
});

describe('updateThemePackage', () => {
	const v1 = makePackage({ version: '1.0.0' });
	const v2 = makePackage({
		version: '1.0.2',
		palette: { ...makePackage().palette, primary: '#ff0000' },
	});

	function withInstalled(partial: Partial<AppearanceSettings> = {}): AppearanceSettings {
		const result = installThemePackage(appearance(), v1);
		if (!result.ok) throw new Error('install failed');
		return { ...result.appearance, ...partial };
	}

	it('replaces the package and rebuilds an inactive theme in the same list position', () => {
		const start = withInstalled();
		const index = start.themes.findIndex((t) => t.name === 'Ocean Breeze');
		const result = updateThemePackage(start, v2);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.appearance.installed).toEqual([v2]);
		expect(result.appearance.themes[index]).toEqual(buildThemeFromPackage(v2));
		expect(result.appearance.themes).toHaveLength(start.themes.length);
		expect(result.appearance.activeTheme).toBe(DEFAULT_THEME_NAME);
	});

	it('keeps an active theme active with the new colors', () => {
		const result = updateThemePackage(withInstalled({ activeTheme: 'Ocean Breeze' }), v2);
		if (!result.ok) throw new Error(result.error);
		expect(result.appearance.activeTheme).toBe('Ocean Breeze');
		const theme = result.appearance.themes.find((t) => t.name === 'Ocean Breeze')!;
		expect(theme).toEqual(buildThemeFromPackage(v2));
		expect(theme.colors.ui.primary).not.toBe(buildThemeFromPackage(v1).colors.ui.primary);
	});

	it('renames the theme and carries activeTheme along when the new version is renamed', () => {
		const renamed = { ...v2, name: 'Ocean Breeze Pro' };
		const result = updateThemePackage(withInstalled({ activeTheme: 'Ocean Breeze' }), renamed);
		if (!result.ok) throw new Error(result.error);
		expect(result.appearance.activeTheme).toBe('Ocean Breeze Pro');
		expect(result.appearance.themes.some((t) => t.name === 'Ocean Breeze')).toBe(false);
		expect(result.appearance.themes.find((t) => t.name === 'Ocean Breeze Pro')).toEqual(buildThemeFromPackage(renamed));
		expect(isInstalledTheme(result.appearance, 'Ocean Breeze Pro')).toBe(true);
		expect(loadAppearance(result.appearance)).toEqual(result.appearance);
	});

	it('does not move activeTheme on a rename of an inactive theme', () => {
		const result = updateThemePackage(withInstalled(), { ...v2, name: 'Ocean Breeze Pro' });
		if (!result.ok) throw new Error(result.error);
		expect(result.appearance.activeTheme).toBe(DEFAULT_THEME_NAME);
	});

	it('refuses a rename to another theme\'s name and keeps the installed version', () => {
		const start = withInstalled({
			themes: [...withInstalled().themes, { name: 'Mine', colors: KOKOBRAIN_DEFAULT_THEME.colors }],
		});
		const result = updateThemePackage(start, { ...v2, name: 'Mine' });
		expect(result).toEqual({ ok: false, error: expect.stringContaining('"Mine"') });
	});

	it('matches by id, not by name', () => {
		const result = updateThemePackage(withInstalled(), { ...v2, id: 'other-theme' });
		expect(result.ok).toBe(false);
	});

	it('refuses a version that is not newer', () => {
		expect(updateThemePackage(withInstalled(), { ...v2, version: '1.0.0' }).ok).toBe(false);
		expect(updateThemePackage(withInstalled(), { ...v2, version: '0.9.0' }).ok).toBe(false);
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

	it('keeps an installed package whose overrides carry the retired frontmatter tokens', () => {
		const pkg = { ...makePackage(), overrides: { preview: { frontmatterBg: '#ece7da', frontmatterBorder: '#ddd6c6' } } };
		const result = loadAppearance(JSON.parse(JSON.stringify({ activeTheme: pkg.name, installed: [pkg] })));
		expect(result.installed?.map((p) => p.id)).toEqual([pkg.id]);
		expect(result.activeTheme).toBe(pkg.name);
		const theme = result.themes.find((t) => t.name === pkg.name)!;
		expect(theme.colors.preview).not.toHaveProperty('frontmatterBg');
		expect(theme.colors.preview).not.toHaveProperty('frontmatterBorder');
	});

	it('keeps a saved user theme that still carries the retired frontmatter tokens, without them', () => {
		const colors = { ...KOKOBRAIN_DEFAULT_THEME.colors, preview: { ...KOKOBRAIN_DEFAULT_THEME.colors.preview, frontmatterBg: '#111111', frontmatterBorder: '#222222' } };
		const result = loadAppearance(JSON.parse(JSON.stringify({ activeTheme: 'Mine', themes: [{ name: 'Mine', colors }] })));
		const mine = result.themes.find((t) => t.name === 'Mine')!;
		expect(result.activeTheme).toBe('Mine');
		expect(mine.colors).toEqual(KOKOBRAIN_DEFAULT_THEME.colors);
		expect(Object.keys(themeColorsToCssVars(mine.colors)).filter((name) => name.startsWith('--lp-frontmatter'))).toEqual([]);
	});

	it('behaves like normalizeAppearance when nothing is installed', () => {
		expect(loadAppearance({})).toEqual({ ...normalizeAppearance({}), installed: [], exBuiltinsMigrated: true });
	});
});

describe('loadAppearance - migration of the ex-built-in themes', () => {
	/**
	 * The 22 ex-built-ins as the app saved them, captured from the code before they were removed.
	 * They carry tokens retired since, so the JSON type does not overlap `Theme`.
	 */
	const legacy = legacyFixture as unknown as Theme[];
	/**
	 * A saved theme's CSS variables plus `--success`, which postdates the fixture and is derived on load,
	 * without the retired `--lp-frontmatter-bg` / `--lp-frontmatter-border`, which the fixture still carries.
	 */
	const savedVars = (theme: Theme) => {
		const { '--lp-frontmatter-bg': _bg, '--lp-frontmatter-border': _border, ...vars } = themeColorsToCssVars(theme.colors);
		return { ...vars, '--success': expect.stringMatching(/^#[0-9a-f]{6}$/i) };
	};
	/** Ids the 22 themes were published under in `diegorv/koko.brain-themes` `index.json`. */
	const PUBLISHED_IDS: Record<string, string> = {
		'Cool Mist': 'cool-mist', 'Deep Ocean': 'deep-ocean', Foolscap: 'foolscap', 'Graphite Violet': 'graphite-violet',
		'Ink Night': 'ink-night', 'Lumen Contrast': 'lumen-contrast', 'Mint Linen': 'mint-linen', Sakura: 'sakura',
		Sepia: 'sepia', 'Tolaria Dark': 'tolaria-dark', 'Tolaria Light': 'tolaria-light', 'Twilight Violet': 'twilight-violet',
		'Zettlr Berlin Dark': 'zettlr-berlin-dark', 'Zettlr Berlin Light': 'zettlr-berlin-light',
		'Zettlr Bielefeld Dark': 'zettlr-bielefeld-dark', 'Zettlr Bielefeld Light': 'zettlr-bielefeld-light',
		'Zettlr Bordeaux Dark': 'zettlr-bordeaux-dark', 'Zettlr Bordeaux Light': 'zettlr-bordeaux-light',
		'Zettlr Frankfurt Dark': 'zettlr-frankfurt-dark', 'Zettlr Frankfurt Light': 'zettlr-frankfurt-light',
		'Zettlr Karl-Marx-Stadt Dark': 'zettlr-karl-marx-stadt-dark', 'Zettlr Karl-Marx-Stadt Light': 'zettlr-karl-marx-stadt-light',
	};
	const savedTheme = (name: string): Theme => structuredClone(legacy.find((t) => t.name === name)!);

	/** Saved settings from before the migration: every built-in written out in full, `activeTheme` as given. */
	function savedSettings(activeTheme: string, extra: Theme[] = []): Partial<AppearanceSettings> {
		const savedBuiltins = [KOKOBRAIN_DEFAULT_THEME, ...legacy.slice(0, 1), LAVENDER_HAZE_THEME, ...legacy.slice(1)];
		return JSON.parse(JSON.stringify({ activeTheme, builtinsFromCode: true, themes: [...savedBuiltins, ...extra] }));
	}

	it('covers exactly the 22 published themes', () => {
		expect(legacy.map((t) => t.name).sort()).toEqual(Object.keys(PUBLISHED_IDS).sort());
	});

	it('(a) installs the active ex-preset at 1.0.0 with its published id and the exact saved CSS variables', () => {
		const result = loadAppearance(savedSettings('Sepia'));

		expect(result.activeTheme).toBe('Sepia');
		expect(result.installed?.map((p) => [p.id, p.name, p.version])).toEqual([['sepia', 'Sepia', '1.0.0']]);
		const theme = result.themes.find((t) => t.name === 'Sepia')!;
		expect(themeColorsToCssVars(theme.colors)).toEqual(savedVars(savedTheme('Sepia')));
		expect(isInstalledTheme(result, 'Sepia')).toBe(true);
	});

	it('(b) rebuilds Sakura and Twilight Violet, which carry overrides, exactly', () => {
		for (const name of ['Sakura', 'Twilight Violet']) {
			const result = loadAppearance(savedSettings(name));
			const pkg = result.installed!.find((p) => p.name === name)!;
			expect(pkg.id).toBe(PUBLISHED_IDS[name]);
			expect(pkg.overrides && Object.keys(pkg.overrides).length).toBeGreaterThan(0);
			const theme = result.themes.find((t) => t.name === name)!;
			expect(themeColorsToCssVars(theme.colors), name).toEqual(savedVars(savedTheme(name)));
		}
	});

	it('round-trips every one of the 22 exactly, with its published id and a valid package', () => {
		for (const saved of legacy) {
			const result = loadAppearance(savedSettings(saved.name));
			const pkg = result.installed![0];
			expect(pkg.id, saved.name).toBe(PUBLISHED_IDS[saved.name]);
			expect(parseThemePackage(JSON.parse(JSON.stringify(pkg)))).toEqual({ kind: 'package', pkg });
			expect(themeColorsToCssVars(buildThemeFromPackage(pkg).colors), saved.name).toEqual(savedVars(saved));
		}
	});

	it('keeps the installed theme where the saved one was in the list', () => {
		const saved = savedSettings('Sepia', [{ name: 'Mine', colors: KOKOBRAIN_DEFAULT_THEME.colors }]);
		const result = loadAppearance(saved);
		expect(result.themes.map((t) => t.name)).toEqual([DEFAULT_THEME_NAME, 'Lavender Haze', 'Sepia', 'Mine']);
	});

	it('(c) with a built-in that stays active, drops the 22 and installs nothing', () => {
		const result = loadAppearance(savedSettings('Lavender Haze'));

		expect(result.activeTheme).toBe('Lavender Haze');
		expect(result.installed).toEqual([]);
		expect(result.themes.map((t) => t.name)).toEqual([DEFAULT_THEME_NAME, 'Lavender Haze']);
		expect(result.themes[1]).toBe(LAVENDER_HAZE_THEME);
	});

	it('(d) keeps an active user theme and its colors', () => {
		const mine = { name: 'Mine', colors: KOKOBRAIN_DEFAULT_THEME.colors };
		const result = loadAppearance(savedSettings('Mine', [mine]));

		expect(result.activeTheme).toBe('Mine');
		expect(result.installed).toEqual([]);
		expect(result.themes.map((t) => t.name)).toEqual([DEFAULT_THEME_NAME, 'Lavender Haze', 'Mine']);
		expect(result.themes[2].colors).toEqual(mine.colors);
	});

	it('(e) keeps an active "(edited)" copy of an ex-built-in as a user theme', () => {
		const sakura = savedTheme('Sakura');
		const edited = { name: 'Sakura (edited)', colors: { ...sakura.colors, ui: { ...sakura.colors.ui, primary: '#000000' } } };
		const result = loadAppearance(savedSettings('Sakura (edited)', [edited]));

		expect(result.activeTheme).toBe('Sakura (edited)');
		expect(result.installed).toEqual([]);
		const { frontmatterBg: _bg, frontmatterBorder: _border, ...preview } = edited.colors.preview as Theme['colors']['preview'] & Record<string, string>;
		expect(result.themes.find((t) => t.name === 'Sakura (edited)')!.colors).toEqual({
			...edited.colors, preview, ui: { ...edited.colors.ui, success: expect.stringMatching(/^#[0-9a-f]{6}$/i) },
		});
		expect(result.themes.some((t) => t.name === 'Sakura')).toBe(false);
		expect(isInstalledTheme(result, 'Sakura (edited)')).toBe(false);
	});

	it('falls back to the default theme when the active ex-built-in has no saved colors', () => {
		const result = loadAppearance({ activeTheme: 'Sepia', builtinsFromCode: true, themes: [] });
		expect(result.activeTheme).toBe(DEFAULT_THEME_NAME);
		expect(result.installed).toEqual([]);
	});

	it('runs once: a second load changes nothing and keeps a theme installed later', () => {
		const first = loadAppearance(savedSettings('Sepia'));
		expect(first.exBuiltinsMigrated).toBe(true);
		expect(loadAppearance(JSON.parse(JSON.stringify(first)))).toEqual(first);

		const sakuraPkg = { ...first.installed![0], id: 'sakura', name: 'Sakura', version: '1.0.3' };
		const installed = installThemePackage(first, sakuraPkg);
		if (!installed.ok) throw new Error(installed.error);
		const later = { ...installed.appearance, activeTheme: 'Sakura' };
		const reloaded = loadAppearance(JSON.parse(JSON.stringify(later)));

		expect(reloaded.installed?.map((p) => [p.id, p.version])).toEqual([['sepia', '1.0.0'], ['sakura', '1.0.3']]);
		expect(reloaded.activeTheme).toBe('Sakura');
		expect(reloaded.themes.find((t) => t.name === 'Sakura')).toEqual(buildThemeFromPackage(sakuraPkg));
	});

	it('marks a fresh install as migrated with only the two built-ins', () => {
		const result = loadAppearance({});
		expect(result.exBuiltinsMigrated).toBe(true);
		expect(result.themes.map((t) => t.name)).toEqual([DEFAULT_THEME_NAME, 'Lavender Haze']);
	});
});

describe('sortThemesForDisplay', () => {
	const named = (name: string): Theme => ({ name, colors: KOKOBRAIN_DEFAULT_THEME.colors });

	it('keeps the built-ins first in their own order, then the rest by name, ignoring case', () => {
		const input = [named('zeta'), LAVENDER_HAZE_THEME, named('Alpha'), KOKOBRAIN_DEFAULT_THEME, named('beta')];
		expect(sortThemesForDisplay(input).map((t) => t.name)).toEqual([
			DEFAULT_THEME_NAME,
			'Lavender Haze',
			'Alpha',
			'beta',
			'zeta',
		]);
	});

	it('does not reorder the array it is given', () => {
		const input = [named('b'), named('a'), KOKOBRAIN_DEFAULT_THEME];
		sortThemesForDisplay(input);
		expect(input.map((t) => t.name)).toEqual(['b', 'a', DEFAULT_THEME_NAME]);
	});

	it('returns an empty list for an empty list', () => {
		expect(sortThemesForDisplay([])).toEqual([]);
	});
});

describe('sortCatalogEntries', () => {
	const pkgEntry = (id: string, name: string): CatalogEntry => ({ kind: 'package', pkg: makePackage({ id, name }) });

	it('orders entries by name, not by id, and places too-new entries by their name too', () => {
		const tooNew: CatalogEntry = {
			kind: 'too-new',
			info: { id: 'future', name: 'Future Theme', version: '2.0.0', author: 'someone', schemaVersion: 2 },
		};
		// The id of a renamed theme no longer follows its name.
		const input = [pkgEntry('a-renamed', 'Zest'), tooNew, pkgEntry('sepia', 'sepia'), pkgEntry('cool-mist', 'Cool Mist')];
		const names = sortCatalogEntries(input).map((e) => (e.kind === 'package' ? e.pkg.name : e.info.name));
		expect(names).toEqual(['Cool Mist', 'Future Theme', 'sepia', 'Zest']);
		expect(input.map((e) => (e.kind === 'package' ? e.pkg.id : e.info.id))).toEqual(['a-renamed', 'future', 'sepia', 'cool-mist']);
	});

	it('returns an empty list for an empty catalog', () => {
		expect(sortCatalogEntries([])).toEqual([]);
	});
});
