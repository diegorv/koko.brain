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
import { buildTheme } from './theme-builder.logic';
import { PRESET_THEMES } from './theme-presets';

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

/** Converts a ThemeColors object into a flat map of CSS variable name → value */
export function themeColorsToCssVars(colors: ThemeColors): Record<string, string> {
	const vars: Record<string, string> = {};

	for (const [group, tokens] of Object.entries(colors) as [keyof ThemeColors, Record<string, string>][]) {
		const prefix = GROUP_PREFIX[group];
		for (const [key, value] of Object.entries(tokens)) {
			const varName = `--${prefix}${camelToKebab(key)}`;
			vars[varName] = value;
		}
	}

	return vars;
}

/**
 * Deep-merges a partial ThemeColors object with the default theme colors.
 * Missing groups or individual tokens fall back to defaults.
 */
export function mergeThemeWithDefaults(partial: Partial<ThemeColors>): ThemeColors {
	const defaults = KOKOBRAIN_DEFAULT_THEME.colors;

	return {
		ui: { ...defaults.ui, ...partial.ui },
		syntax: { ...defaults.syntax, ...partial.syntax },
		preview: { ...defaults.preview, ...partial.preview },
		wikilink: { ...defaults.wikilink, ...partial.wikilink },
		callout: { ...defaults.callout, ...partial.callout },
	};
}

/** Built-in default theme name */
export const DEFAULT_THEME_NAME = 'KokoBrain Default';

/** The built-in theme with all current color values */
export const KOKOBRAIN_DEFAULT_THEME: Theme = buildTheme(DEFAULT_THEME_NAME, {
	editorBg: '#2a2e3d',
	sidebarBg: '#21222e',
	panelBg: '#2a2e3d',
	popoverBg: '#171a26',
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
		heading2: '#5DCCFF',
		heading3: '#42E8A8',
		heading4: '#FFD93D',
		heading5: '#FF8C69',
		heading6: '#B19CD9',
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
		frontmatterBg: '#1e1e2e',
		frontmatterBorder: '#313244',
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

export const SAKURA_THEME: Theme = buildTheme('Sakura', {
	editorBg: '#FDF5F5',
	sidebarBg: '#FDF5F5',
	panelBg: '#F5EBEB',
	popoverBg: '#EEDEDE',
	fg: '#3A2030',
	heading: '#C04878',
	mutedFg: '#9A8090',
	faintFg: '#D5C0C5',
	border: '#E8D8D8',
	borderStrong: '#E8D8D8',
	hover: '#E8D8D8',
	selected: '#F2E5E5',
	primary: '#C04878',
	primaryFg: '#ffffff',
	secondary: '#D08050',
	selection: '#F0D8E0',
	highlight: '#D0805045',
	codeFg: '#509868',
	codeBg: '#f1e9e9',
	error: '#CC3040',
	errorFg: '#3A2030',
	inlineFg: '#3A2030',
	linkFg: '#4878B8',
	meta: '#9A8090',
	blockquoteAccent: '#9A8090',
	blue: '#4878B8',
	green: '#509868',
	purple: '#8860B0',
	yellow: '#B89830',
}, {
	ui: {
		accent: '#E8D8D8',
		tabBar: '#f7efef',
		divider: '#D5C0C5',
		fileExplorerBg: '#FFFAFA',
		fileExplorerFg: '#4A3040',
		searchSemanticBg: 'rgba(192,72,120,0.15)',
		rightSidebarBg: '#F5EBEB',
		rightSidebarFg: '#4A3040',
		rightSidebarAccent: '#EEDEDE',
		editorEmptyBg: '#F5EBEB',
		tabTextInactive: '#5A4050',
		settingsSidebarBg: '#FFFAFA',
		settingItemBg: '#EEDEDE',
		statusBarBg: '#f9f1f1',
	},
	syntax: {
		heading2: '#D08050',
		heading3: '#B89830',
		heading4: '#509868',
		heading5: '#4878B8',
		heading6: '#8860B0',
		emphasis: '#8860B0',
		url: '#8860B0',
		codeBg: 'rgba(0,0,0,0.04)',
		activeLine: 'rgba(238,222,222,0.3)',
		activeLineGutter: '#EEDEDE',
	},
	preview: {
		wikilink: '#8860B0',
		wikilinkDecoration: '#8860B045',
		hrBorder: '#D5C0C5',
		olMarker: '#D08050',
		codeblockBg: '#EEDEDE',
		tableHeaderBg: '#EEDEDE',
		tableAlt: '#EEDEDE45',
		footnote: '#4878B8',
		frontmatterBg: '#EEDEDE',
		collectionBg: '#EEDEDE',
		collectionHeader: '#5A4050',
		collectionTableHeaderBg: '#f3e3e3',
		collectionTableHeaderText: '#5A4050',
		collectionTableAlt: '#EEDEDE45',
		collectionLoading: '#5A4050',
		embedBg: '#EEDEDE',
		embedHover: '#e9d9d9',
	},
	wikilink: {
		target: '#8860B0',
		targetDecoration: '#8860B045',
		heading: '#744c9c',
	},
});

export const LAVENDER_HAZE_THEME: Theme = buildTheme('Lavender Haze', {
	editorBg: '#F3F0F8',
	sidebarBg: '#F3F0F8',
	panelBg: '#EAE6F2',
	popoverBg: '#DDD8E8',
	fg: '#302840',
	heading: '#C83848',
	mutedFg: '#8A80A0',
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
	inlineFg: '#302840',
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
		fileExplorerBg: '#FAF8FE',
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
		heading2: '#D07838',
		heading3: '#A89020',
		heading4: '#408868',
		heading5: '#3868B0',
		heading6: '#7848B8',
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
		frontmatterBg: '#DDD8E8',
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

export const TWILIGHT_VIOLET_THEME: Theme = buildTheme('Twilight Violet', {
	editorBg: '#222028',
	sidebarBg: '#222028',
	panelBg: '#282630',
	popoverBg: '#1A181F',
	fg: '#D0CCD8',
	heading: '#C878A0',
	mutedFg: '#706888',
	faintFg: '#444050',
	border: '#343040',
	borderStrong: '#343040',
	hover: '#343040',
	selected: '#383440',
	primary: '#9878B8',
	primaryFg: '#1A181F',
	secondary: '#C8A868',
	selection: '#383050',
	highlight: '#C8A86845',
	codeFg: '#78B898',
	codeBg: '#34323a',
	error: '#D06060',
	errorFg: '#D0CCD8',
	inlineFg: '#D0CCD8',
	linkFg: '#7898C8',
	meta: '#706888',
	blockquoteAccent: '#706888',
	blue: '#7898C8',
	green: '#78B898',
	purple: '#9878B8',
	yellow: '#C8A868',
}, {
	ui: {
		accent: '#343040',
		tabBar: '#2a2830',
		divider: '#444050',
		fileExplorerBg: '#2C2A34',
		fileExplorerMutedFg: '#8A84A0',
		fileExplorerBadgeFg: '#7A7490',
		searchSemanticBg: 'rgba(152,120,184,0.15)',
		rightSidebarBg: '#282630',
		rightSidebarMutedFg: '#8A84A0',
		rightSidebarAccent: '#343038',
		editorEmptyBg: '#282630',
		tabTextInactive: '#A098B0',
		settingsSidebarBg: '#2C2A34',
		settingsHoverBg: '#343038',
		settingItemBg: '#1A181F',
		statusBarBg: '#27252d',
		switchUncheckedBg: '#343038',
	},
	syntax: {
		heading2: '#9878B8',
		heading3: '#7898C8',
		heading4: '#78B898',
		heading5: '#C8A868',
		heading6: '#C87878',
		emphasis: '#C878A0',
		url: '#C878A0',
		codeBg: 'rgba(255,255,255,0.06)',
		activeLine: 'rgba(26,24,31,0.3)',
		activeLineGutter: '#1A181F',
	},
	preview: {
		hrBorder: '#444050',
		olMarker: '#C8A868',
		codeblockBg: '#1A181F',
		tableHeaderBg: '#1A181F',
		tableAlt: '#1A181F45',
		footnote: '#7898C8',
		frontmatterBg: '#1A181F',
		collectionBg: '#1A181F',
		collectionHeader: '#A098B0',
		collectionTableHeaderBg: '#15131a',
		collectionTableHeaderText: '#A098B0',
		collectionTableAlt: '#1A181F45',
		collectionLoading: '#A098B0',
		embedBg: '#1A181F',
		embedHover: '#242229',
	},
	wikilink: {
		heading: '#ac8ccc',
	},
});

export const BUILTIN_THEMES: Theme[] = [
	KOKOBRAIN_DEFAULT_THEME,
	SAKURA_THEME,
	LAVENDER_HAZE_THEME,
	TWILIGHT_VIOLET_THEME,
	...PRESET_THEMES,
];

/** Default appearance settings with built-in themes */
export const DEFAULT_APPEARANCE: AppearanceSettings = {
	activeTheme: DEFAULT_THEME_NAME,
	themes: BUILTIN_THEMES,
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
 * becomes the active theme if the built-in was. Presets are exempt: they shipped
 * just before this migration, so a difference there is a code change, not an edit.
 */
export function normalizeAppearance(raw: Partial<AppearanceSettings>): AppearanceSettings {
	let activeTheme = raw.activeTheme ?? DEFAULT_THEME_NAME;
	const rawThemes = raw.themes ?? [];
	const builtins = new Map(BUILTIN_THEMES.map((t) => [t.name, t]));
	const taken = new Set(rawThemes.map((t) => t.name));

	const normalizedThemes: Theme[] = [];
	for (const t of rawThemes) {
		const colors = mergeThemeWithDefaults(t.colors as Partial<ThemeColors>);
		const builtin = builtins.get(t.name);
		if (!builtin) {
			normalizedThemes.push({ name: t.name, colors });
			continue;
		}
		normalizedThemes.push(builtin);
		if (!raw.builtinsFromCode && !PRESET_THEMES.includes(builtin) && !sameColors(builtin.colors, colors)) {
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
