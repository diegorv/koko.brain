import type {
	Theme,
	ThemeColors,
	UIColors,
	SyntaxColors,
	PreviewColors,
	WikilinkColors,
	CalloutColors,
	AppearanceSettings,
} from './theme.types';
import { isDarkColor } from '#lib/utils/color.js';
import { alpha, buildTheme, coreFromColors } from './theme-builder.logic';

/** Converts a camelCase string to kebab-case */
export function camelToKebab(s: string): string {
	return s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

/**
 * CSS variable prefix per color group.
 * UI colors use no prefix (they map to existing vars like --background, --card).
 * Other groups use a prefix matching the existing CSS class convention.
 */
const GROUP_PREFIX: Record<keyof ThemeColors, string> = {
	ui: '',
	syntax: 'syntax-',
	preview: 'lp-',
	wikilink: 'wikilink-',
	callout: 'callout-',
};

/**
 * Shadow, ring and scrim colors for floating surfaces, read by the `--shadow-*`
 * overrides and `bg-scrim` in `app.css`. Derived here rather than stored as
 * theme tokens, so themes, validation and export do not carry them. A dark
 * editor background (or one `isDarkColor` cannot parse, such as hsl()) gets
 * deep black shadows and a faint light ring; a light one gets soft shadows
 * tinted from the theme's own foreground.
 */
function elevationVars(ui: UIColors): Record<string, string> {
	if (isDarkColor(ui.editorBg) !== false) {
		return {
			'--elev-shadow-1': '#00000040',
			'--elev-shadow-2': '#00000073',
			'--elev-shadow-3': '#00000099',
			'--elev-ring': '#ffffff0f',
			'--elev-scrim': '#0000008c',
		};
	}
	return {
		'--elev-shadow-1': alpha(ui.foreground, '0f'),
		'--elev-shadow-2': alpha(ui.foreground, '1a'),
		'--elev-shadow-3': alpha(ui.foreground, '29'),
		'--elev-ring': alpha(ui.foreground, '14'),
		'--elev-scrim': alpha(ui.foreground, '40'),
	};
}

/** Converts a ThemeColors object into a flat map of CSS variable name → value, plus the derived `--elev-*` variables */
export function themeColorsToCssVars(colors: ThemeColors): Record<string, string> {
	const vars: Record<string, string> = {};

	for (const [group, tokens] of Object.entries(colors) as [keyof ThemeColors, Record<string, string>][]) {
		const prefix = GROUP_PREFIX[group];
		for (const [key, value] of Object.entries(tokens)) {
			const varName = `--${prefix}${camelToKebab(key)}`;
			vars[varName] = value;
		}
	}

	// Real themes are complete (they pass through `mergeThemeWithDefaults`); only cast
	// partial colors, as in the applyTheme edge-case tests, lack an editor background,
	// and then the stylesheet's `--elev-*` fallbacks stay in place.
	return colors.ui?.editorBg ? { ...vars, ...elevationVars(colors.ui) } : vars;
}

/** Keeps exactly the keys of `template`, taking each from `source` when present there, else from `fallback`. */
function pickTokens<T extends object>(template: T, source: Partial<T> | undefined, fallback: T): T {
	const out: Partial<T> = {};
	for (const key of Object.keys(template) as (keyof T)[]) out[key] = source?.[key] ?? fallback[key];
	return out as T;
}

/**
 * Completes a saved or imported theme to the current token set: keys that are
 * no longer tokens are dropped, and a missing token is derived (`buildTheme`)
 * from the theme's own core colors, which themselves fall back to the default
 * theme only when absent. An empty partial yields the default colors.
 */
export function mergeThemeWithDefaults(partial: Partial<ThemeColors>): ThemeColors {
	const defaults = KOKOBRAIN_DEFAULT_THEME.colors;
	const groups = Object.keys(defaults) as (keyof ThemeColors)[];
	if (groups.every((g) => !partial[g] || Object.keys(partial[g]).length === 0)) return defaults;

	const sources = {
		ui: pickTokens(defaults.ui, partial.ui, defaults.ui),
		syntax: pickTokens(defaults.syntax, partial.syntax, defaults.syntax),
		preview: pickTokens(defaults.preview, partial.preview, defaults.preview),
		wikilink: pickTokens(defaults.wikilink, partial.wikilink, defaults.wikilink),
		callout: pickTokens(defaults.callout, partial.callout, defaults.callout),
	};
	const derived = buildTheme('', coreFromColors(sources)).colors;

	return {
		ui: pickTokens(defaults.ui, partial.ui, derived.ui),
		syntax: pickTokens(defaults.syntax, partial.syntax, derived.syntax),
		preview: pickTokens(defaults.preview, partial.preview, derived.preview),
		wikilink: pickTokens(defaults.wikilink, partial.wikilink, derived.wikilink),
		callout: pickTokens(defaults.callout, partial.callout, derived.callout),
	};
}

/** Built-in default theme name */
export const DEFAULT_THEME_NAME = 'KokoBrain Default';

/** The built-in theme with all current color values */
export const KOKOBRAIN_DEFAULT_THEME: Theme = buildTheme(DEFAULT_THEME_NAME, {
	editorBg: '#2a2e3d',
	sidebarBg: '#21222e',
	panelBg: '#2a2e3d',
	// The editor moved 5% toward `fg` in OKLab: mixColors('#2a2e3d', '#F8F8F2', 0.05).
	// One step above the editor, so menus and dialogs lift off the page.
	popoverBg: '#333745',
	fg: '#F8F8F2',
	heading: '#E8A5FF',
	mutedFg: '#627195',
	faintFg: '#585b70',
	border: '#242835',
	borderStrong: '#242835',
	hover: '#242835',
	selected: 'oklch(0.28 0.025 272)',
	primary: '#9ba3da',
	primaryFg: '#10131f',
	secondary: '#f9a825',
	selection: '#6f285c',
	highlight: '#fbbf2444',
	codeFg: '#86efac',
	codeBg: '#3b3b4f',
	error: '#f3333b',
	errorFg: '#f9f9f5',
	inlineFg: '#93c5fd',
	linkFg: '#60a5fa',
	meta: '#64748b',
	blockquoteAccent: '#6b7280',
	blue: '#60a5fa',
	green: '#4ade80',
	purple: '#a78bfa',
	yellow: '#fbbf24',
}, {
	ui: {
		popoverForeground: '#f9f9f5',
		secondaryForeground: '#f9f9f5',
		accent: '#242835',
		accentForeground: '#f9f9f5',
		tabBar: '#5a5c79',
		divider: '#383a4f',
		fileExplorerBg: '#262938',
		fileExplorerMutedFg: 'oklch(0.55 0.06 268)',
		fileExplorerPrimary: 'oklch(0.73 0.08 278)',
		fileExplorerBorder: 'oklch(0.28 0.025 272)',
		fileExplorerBadgeFg: '#8a8faa',
		searchSemanticBg: 'rgba(59, 130, 246, 0.15)',
		searchSemanticFg: '#60a5fa',
		rightSidebarBg: '#2a2e3d',
		rightSidebarMutedFg: 'oklch(0.55 0.06 268)',
		rightSidebarPrimary: 'oklch(0.73 0.08 278)',
		editorEmptyBg: '#2b2f40',
		tabTextActive: '#bac5ee',
		tabTextInactive: '#9ca3c7',
		settingsDialogBg: '#313549',
		settingsSidebarBg: '#2B2F40',
		settingsText: '#bfcaf3',
		settingsHoverBg: '#393e50',
		settingItemBg: '#20212d',
		statusBarFg: 'oklch(0.55 0.06 268)',
		inputBg: '#333544',
		switchUncheckedBg: '#444660',
	},
	syntax: {
		strikethrough: '#94a3b8',
		url: '#818cf8',
		codeBg: 'rgba(255,255,255,0.06)',
		quote: '#94a3b8',
		activeLine: 'rgba(23, 26, 36, 0.3)',
		activeLineGutter: '#171a24',
	},
	preview: {
		linkDecoration: '#60a5fa44',
		wikilink: '#a78bfa',
		wikilinkDecoration: '#a78bfa44',
		hrBorder: '#4b5563',
		blockquoteBg: '#6b728011',
		blockquoteBg2: '#6b728018',
		blockquoteBg3: '#6b728022',
		taskHover: '#a78bfa',
		taskChecked: '#a78bfa',
		taskCheckmark: '#1e1e2e',
		olMarker: '#f9a825',
		codeblockBg: '#1e1e2e',
		tableBorder: '#313244',
		tableHeaderBg: '#1e1e2e',
		tableAlt: '#1e1e2e44',
		footnote: '#60a5fa',
		collectionBg: '#1e1e2e',
		collectionBorder: '#313244',
		collectionHeader: '#a6adc8',
		collectionHeaderBorder: '#313244',
		collectionTableHeaderBg: '#181825',
		collectionTableHeaderText: '#a6adc8',
		collectionTableHover: '#31324488',
		collectionTableAlt: '#1e1e2e44',
		collectionError: '#f38ba8',
		collectionLoading: '#a6adc8',
		embedBg: '#1e1e2e',
		embedHover: '#262637',
		embedHeader: '#a78bfa',
		embedBorder: '#313244',
		embedContent: '#cdd6f4',
		embedError: '#f38ba8',
	},
	wikilink: {
		target: '#a78bfa',
		targetDecoration: '#a78bfa44',
		heading: '#c4b5fd',
	},
	callout: {
		caution: '#f87171',
		quote: '#94a3b8',
	},
});

export const LAVENDER_HAZE_THEME: Theme = buildTheme('Lavender Haze', {
	editorBg: '#F3F0F8',
	sidebarBg: '#F3F0F8',
	panelBg: '#EAE6F2',
	popoverBg: '#FFFFFF',
	fg: '#302840',
	heading: '#6848A8',
	// Already clears readableCore's 4.5:1 lift on every surface, so the lift
	// leaves it as is; it sets muted text and the H6 end of the heading ramp.
	mutedFg: '#645c74',
	faintFg: '#C0B8D0',
	border: '#D5D0E2',
	borderStrong: '#D5D0E2',
	hover: '#D5D0E2',
	selected: '#E8E2F2',
	primary: '#6848A8',
	primaryFg: '#ffffff',
	secondary: '#D07838',
	selection: '#D8D0E8',
	highlight: '#D0783845',
	codeFg: '#408868',
	codeBg: '#e7e4ec',
	error: '#C83848',
	errorFg: '#302840',
	inlineFg: '#843C7E',
	linkFg: '#3868B0',
	meta: '#8A80A0',
	blockquoteAccent: '#8A80A0',
	blue: '#3868B0',
	green: '#408868',
	purple: '#7848B8',
	yellow: '#A89020',
}, {
	ui: {
		accent: '#D5D0E2',
		tabBar: '#edeaf2',
		divider: '#C0B8D0',
		fileExplorerBg: '#e8e7ec',
		fileExplorerAccent: '#DDD8E8',
		typeOrange: '#b66737',
		typeYellow: '#907900',
		fileExplorerMutedFg: '#8078A0',
		fileExplorerBorder: '#D8D2E5',
		fileExplorerBadgeFg: '#8078A0',
		searchSemanticBg: 'rgba(104,72,168,0.15)',
		rightSidebarBg: '#EAE6F2',
		rightSidebarMutedFg: '#8078A0',
		rightSidebarAccent: '#DDD8E8',
		editorEmptyBg: '#EAE6F2',
		tabTextInactive: '#504868',
		settingsSidebarBg: '#FAF8FE',
		settingsHoverBg: '#D2CCE0',
		settingItemBg: '#DDD8E8',
		statusBarBg: '#efecf4',
		switchUncheckedBg: '#D2CCE0',
	},
	syntax: {
		emphasis: '#A850A0',
		url: '#A850A0',
		codeBg: 'rgba(0,0,0,0.04)',
		quote: '#8078A0',
		activeLine: 'rgba(221,216,232,0.3)',
		activeLineGutter: '#DDD8E8',
	},
	preview: {
		wikilink: '#7848B8',
		wikilinkDecoration: '#7848B845',
		hrBorder: '#C0B8D0',
		olMarker: '#D07838',
		codeblockBg: '#DDD8E8',
		tableHeaderBg: '#DDD8E8',
		tableAlt: '#DDD8E845',
		footnote: '#3868B0',
		collectionBg: '#DDD8E8',
		collectionHeader: '#504868',
		collectionTableHeaderBg: '#e2dded',
		collectionTableHeaderText: '#504868',
		collectionTableAlt: '#DDD8E845',
		collectionLoading: '#504868',
		embedBg: '#DDD8E8',
		embedHover: '#d8d3e3',
	},
	wikilink: {
		target: '#7848B8',
		targetDecoration: '#7848B845',
		heading: '#6434a4',
	},
	callout: {
		quote: '#8078A0',
	},
});

/** The themes that ship with the app; every other theme comes from the catalog (ADR-0035). */
export const BUILTIN_THEMES: Theme[] = [KOKOBRAIN_DEFAULT_THEME, LAVENDER_HAZE_THEME];

/**
 * Default appearance settings with built-in themes. A fresh vault is saved
 * from this without going through `loadAppearance`, so it carries the one-time
 * migration flags already set: otherwise an ex-built-in installed in its first
 * session would be migrated again, as a second package, on the next load.
 */
export const DEFAULT_APPEARANCE: AppearanceSettings = {
	activeTheme: DEFAULT_THEME_NAME,
	themes: BUILTIN_THEMES,
	builtinsFromCode: true,
	exBuiltinsMigrated: true,
};

/** True when two themes have the same value for every token. */
function sameColors(a: ThemeColors, b: ThemeColors): boolean {
	return (Object.keys(a) as (keyof ThemeColors)[]).every((group) => {
		const other: Record<string, string> = { ...b[group] };
		return Object.entries(a[group]).every(([key, value]) => other[key] === value);
	});
}

/** Returns `base`, or `base` with the lowest free counter, so it collides with no name in `taken`. */
function freeName(base: string, taken: Set<string>): string {
	if (!taken.has(base)) return base;
	let n = 2;
	while (taken.has(base.replace(/\)$/, ` ${n})`))) n++;
	return base.replace(/\)$/, ` ${n})`);
}

/**
 * Serves every built-in theme from code, keeps user themes (merged with
 * defaults) in their saved order, and appends built-ins missing from the save.
 * On the first load after `builtinsFromCode` was introduced, a saved built-in
 * whose colors differ from the code is kept as a "<name> (edited)" copy, and
 * becomes the active theme if the built-in was.
 */
export function normalizeAppearance(raw: Partial<AppearanceSettings>): AppearanceSettings {
	let activeTheme = raw.activeTheme ?? DEFAULT_THEME_NAME;
	const rawThemes = raw.themes ?? [];
	const builtins = new Map(BUILTIN_THEMES.map((t) => [t.name, t]));
	const taken = new Set(rawThemes.map((t) => t.name));

	const normalizedThemes: Theme[] = [];
	for (const t of rawThemes) {
		const builtin = builtins.get(t.name);
		if (!builtin) {
			normalizedThemes.push({ name: t.name, colors: mergeThemeWithDefaults(t.colors as Partial<ThemeColors>) });
			continue;
		}
		normalizedThemes.push(builtin);
		// Fill a saved built-in's missing tokens from that built-in, so only tokens it actually stored can differ.
		const saved = t.colors as Partial<ThemeColors>;
		const colors: ThemeColors = {
			ui: pickTokens(builtin.colors.ui, saved.ui, builtin.colors.ui),
			syntax: pickTokens(builtin.colors.syntax, saved.syntax, builtin.colors.syntax),
			preview: pickTokens(builtin.colors.preview, saved.preview, builtin.colors.preview),
			wikilink: pickTokens(builtin.colors.wikilink, saved.wikilink, builtin.colors.wikilink),
			callout: pickTokens(builtin.colors.callout, saved.callout, builtin.colors.callout),
		};
		if (!raw.builtinsFromCode && !sameColors(builtin.colors, colors)) {
			const copyName = freeName(`${t.name} (edited)`, taken);
			taken.add(copyName);
			normalizedThemes.push({ name: copyName, colors });
			if (activeTheme === t.name) activeTheme = copyName;
		}
	}

	for (const builtin of BUILTIN_THEMES) {
		if (!normalizedThemes.includes(builtin)) normalizedThemes.push(builtin);
	}

	return { activeTheme, themes: normalizedThemes, builtinsFromCode: true };
}

/** True when `name` belongs to a built-in theme, which is served from code and cannot be edited in place. */
export function isBuiltinTheme(name: string): boolean {
	return BUILTIN_THEMES.some((t) => t.name === name);
}

/** Finds a theme by name from an array, falling back to the built-in default */
export function findThemeByName(themes: Theme[], name: string): Theme {
	return themes.find((t) => t.name === name) ?? KOKOBRAIN_DEFAULT_THEME;
}
