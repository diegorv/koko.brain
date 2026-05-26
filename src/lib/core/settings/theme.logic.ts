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
export const KOKOBRAIN_DEFAULT_THEME: Theme = {
	name: DEFAULT_THEME_NAME,
	colors: {
		ui: {
			background: '#21222e',
			foreground: '#F8F8F2',
			card: '#2a2e3d',
			cardForeground: '#f9f9f5',
			popover: '#171a26',
			popoverForeground: '#f9f9f5',
			primary: '#9ba3da',
			primaryForeground: '#10131f',
			secondary: '#242835',
			secondaryForeground: '#f9f9f5',
			muted: '#242835',
			mutedForeground: '#627195',
			accent: '#242835',
			accentForeground: '#f9f9f5',
			destructive: '#f3333b',
			destructiveForeground: '#f9f9f5',
			border: '#242835',
			input: '#242835',
			ring: '#9ba3da',
			tabBar: '#5a5c79',
			divider: '#383a4f',
			fileExplorerBg: '#262938',
			fileExplorerFg: '#F8F8F2',
			fileExplorerMutedFg: 'oklch(0.55 0.06 268)',
			fileExplorerAccent: 'oklch(0.28 0.025 272)',
			fileExplorerPrimary: 'oklch(0.73 0.08 278)',
			fileExplorerBorder: 'oklch(0.28 0.025 272)',
			fileExplorerBadgeFg: '#8a8faa',
			searchSemanticBg: 'rgba(59, 130, 246, 0.15)',
			searchSemanticFg: '#60a5fa',
			rightSidebarBg: '#2a2e3d',
			rightSidebarFg: '#F8F8F2',
			rightSidebarMutedFg: 'oklch(0.55 0.06 268)',
			rightSidebarAccent: 'oklch(0.28 0.025 272)',
			rightSidebarPrimary: 'oklch(0.73 0.08 278)',
			rightSidebarBorder: 'oklch(0.28 0.025 272)',
			editorBg: '#2a2e3d',
			editorFg: '#F8F8F2',
			editorEmptyBg: '#2b2f40',
			tabTextActive: '#bac5ee',
			tabTextInactive: '#9ca3c7',
			settingsDialogBg: '#313549',
			settingsSidebarBg: '#2B2F40',
			settingsText: '#bfcaf3',
			settingsHoverBg: '#393e50',
			settingItemBg: '#20212d',
			statusBarBg: '#21222e',
			statusBarFg: 'oklch(0.55 0.06 268)',
			inputBg: '#333544',
			inputText: '#9aa1c5',
			switchUncheckedBg: '#444660',
		},
		syntax: {
			heading1: '#E8A5FF',
			heading2: '#5DCCFF',
			heading3: '#42E8A8',
			heading4: '#FFD93D',
			heading5: '#FF8C69',
			heading6: '#B19CD9',
			emphasis: '#93c5fd',
			strong: '#93c5fd',
			strikethrough: '#94a3b8',
			link: '#60a5fa',
			url: '#818cf8',
			code: '#86efac',
			codeBg: 'rgba(255,255,255,0.06)',
			quote: '#94a3b8',
			meta: '#64748b',
			processing: '#f9a825',
			activeLine: 'rgba(23, 26, 36, 0.3)',
			selection: '#6f285c',
			activeLineGutter: '#171a24',
		},
		preview: {
			link: '#60a5fa',
			linkDecoration: '#60a5fa44',
			wikilink: '#a78bfa',
			wikilinkDecoration: '#a78bfa44',
			hrBorder: '#4b5563',
			blockquoteBorder: '#6b7280',
			blockquoteBg: '#6b728011',
			blockquoteBg2: '#6b728018',
			blockquoteBg3: '#6b728022',
			taskBorder: '#585b70',
			taskHover: '#a78bfa',
			taskChecked: '#a78bfa',
			taskCheckmark: '#1e1e2e',
			highlightBg: '#fbbf2444',
			olMarker: '#f9a825',
			codeBg: '#3b3b4f',
			codeblockBg: '#1e1e2e',
			tableBorder: '#313244',
			tableHeaderBg: '#1e1e2e',
			tableAlt: '#1e1e2e44',
			tableHover: '#31324488',
			footnote: '#60a5fa',
			frontmatterBg: '#1e1e2e',
			frontmatterBorder: '#313244',
			frontmatterLabel: '#cdd6f4',
			frontmatterCountBg: '#313244',
			frontmatterCountText: '#a6adc8',
			frontmatterRowBorder: '#31324466',
			frontmatterKey: '#6b7280',
			frontmatterValue: '#cdd6f4',
			frontmatterTagBg: '#313244',
			frontmatterTagText: '#cdd6f4',
			frontmatterTagX: '#6b7280',
			collectionBg: '#1e1e2e',
			collectionBorder: '#313244',
			collectionHeader: '#a6adc8',
			collectionHeaderBorder: '#313244',
			collectionTableHeaderBg: '#181825',
			collectionTableHeaderText: '#a6adc8',
			collectionTableHover: '#31324488',
			collectionTableAlt: '#1e1e2e44',
			collectionNull: '#585b70',
			collectionError: '#f38ba8',
			collectionLoading: '#a6adc8',
			collectionEmpty: '#585b70',
			embedBg: '#1e1e2e',
			embedHover: '#262637',
			embedHeader: '#a78bfa',
			embedBorder: '#313244',
			embedContent: '#cdd6f4',
			embedError: '#f38ba8',
		},
		wikilink: {
			bracket: '#64748b',
			target: '#a78bfa',
			targetDecoration: '#a78bfa44',
			heading: '#c4b5fd',
			display: '#60a5fa',
		},
		callout: {
			note: '#60a5fa',
			tip: '#4ade80',
			important: '#a78bfa',
			warning: '#fbbf24',
			caution: '#f87171',
			quote: '#94a3b8',
		},
	},
};

export const SAKURA_THEME: Theme = {
	name: 'Sakura',
	colors: {
		ui: {
			background: '#FDF5F5', foreground: '#3A2030',
			card: '#F5EBEB', cardForeground: '#3A2030',
			popover: '#EEDEDE', popoverForeground: '#3A2030',
			primary: '#C04878', primaryForeground: '#ffffff',
			secondary: '#E8D8D8', secondaryForeground: '#3A2030',
			muted: '#E8D8D8', mutedForeground: '#9A8090',
			accent: '#E8D8D8', accentForeground: '#3A2030',
			destructive: '#CC3040', destructiveForeground: '#3A2030',
			border: '#E8D8D8', input: '#E8D8D8', ring: '#C04878',
			tabBar: '#f7efef', divider: '#D5C0C5',
			fileExplorerBg: '#FFFAFA', fileExplorerFg: '#4A3040',
			fileExplorerMutedFg: '#9A8090', fileExplorerAccent: '#F2E5E5',
			fileExplorerPrimary: '#C04878', fileExplorerBorder: '#E8D8D8',
			fileExplorerBadgeFg: '#9A8090',
			searchSemanticBg: 'rgba(192,72,120,0.15)', searchSemanticFg: '#C04878',
			rightSidebarBg: '#F5EBEB', rightSidebarFg: '#4A3040',
			rightSidebarMutedFg: '#9A8090', rightSidebarAccent: '#EEDEDE',
			rightSidebarPrimary: '#C04878', rightSidebarBorder: '#E8D8D8',
			editorBg: '#FDF5F5', editorFg: '#3A2030', editorEmptyBg: '#F5EBEB',
			tabTextActive: '#3A2030', tabTextInactive: '#5A4050',
			settingsDialogBg: '#F5EBEB', settingsSidebarBg: '#FFFAFA',
			settingsText: '#3A2030', settingsHoverBg: '#E8D8D8', settingItemBg: '#EEDEDE',
			statusBarBg: '#f9f1f1', statusBarFg: '#9A8090',
			inputBg: '#F5EBEB', inputText: '#5A4050', switchUncheckedBg: '#E8D8D8',
		},
		syntax: {
			heading1: '#C04878', heading2: '#D08050', heading3: '#B89830',
			heading4: '#509868', heading5: '#4878B8', heading6: '#8860B0',
			emphasis: '#8860B0', strong: '#3A2030', strikethrough: '#9A8090',
			link: '#4878B8', url: '#8860B0', code: '#509868',
			codeBg: 'rgba(0,0,0,0.04)', quote: '#9A8090', meta: '#9A8090',
			processing: '#D08050', activeLine: 'rgba(238,222,222,0.3)',
			selection: '#F0D8E0', activeLineGutter: '#EEDEDE',
		},
		preview: {
			link: '#4878B8', linkDecoration: '#4878B845',
			wikilink: '#8860B0', wikilinkDecoration: '#8860B045',
			hrBorder: '#D5C0C5', blockquoteBorder: '#9A8090',
			blockquoteBg: '#9A809012', blockquoteBg2: '#9A809017', blockquoteBg3: '#9A809021',
			taskBorder: '#D5C0C5', taskHover: '#C04878', taskChecked: '#C04878', taskCheckmark: '#ffffff',
			highlightBg: '#D0805045', olMarker: '#D08050',
			codeBg: '#f1e9e9', codeblockBg: '#EEDEDE',
			tableBorder: '#E8D8D8', tableHeaderBg: '#EEDEDE',
			tableAlt: '#EEDEDE45', tableHover: '#E8D8D887',
			footnote: '#4878B8',
			frontmatterBg: '#EEDEDE', frontmatterBorder: '#E8D8D8',
			frontmatterLabel: '#3A2030', frontmatterCountBg: '#E8D8D8',
			frontmatterCountText: '#5A4050', frontmatterRowBorder: '#E8D8D866',
			frontmatterKey: '#9A8090', frontmatterValue: '#3A2030',
			frontmatterTagBg: '#E8D8D8', frontmatterTagText: '#3A2030', frontmatterTagX: '#9A8090',
			collectionBg: '#EEDEDE', collectionBorder: '#E8D8D8',
			collectionHeader: '#5A4050', collectionHeaderBorder: '#E8D8D8',
			collectionTableHeaderBg: '#f3e3e3', collectionTableHeaderText: '#5A4050',
			collectionTableHover: '#E8D8D887', collectionTableAlt: '#EEDEDE45',
			collectionNull: '#D5C0C5', collectionError: '#CC3040',
			collectionLoading: '#5A4050', collectionEmpty: '#D5C0C5',
			embedBg: '#EEDEDE', embedHover: '#e9d9d9', embedHeader: '#C04878',
			embedBorder: '#E8D8D8', embedContent: '#3A2030', embedError: '#CC3040',
		},
		wikilink: { bracket: '#9A8090', target: '#8860B0', targetDecoration: '#8860B045', heading: '#744c9c', display: '#4878B8' },
		callout: { note: '#4878B8', tip: '#509868', important: '#8860B0', warning: '#B89830', caution: '#CC3040', quote: '#9A8090' },
	},
};

export const LAVENDER_HAZE_THEME: Theme = {
	name: 'Lavender Haze',
	colors: {
		ui: {
			background: '#F3F0F8', foreground: '#302840',
			card: '#EAE6F2', cardForeground: '#302840',
			popover: '#DDD8E8', popoverForeground: '#302840',
			primary: '#6848A8', primaryForeground: '#ffffff',
			secondary: '#D5D0E2', secondaryForeground: '#302840',
			muted: '#D5D0E2', mutedForeground: '#8A80A0',
			accent: '#D5D0E2', accentForeground: '#302840',
			destructive: '#C83848', destructiveForeground: '#302840',
			border: '#D5D0E2', input: '#D5D0E2', ring: '#6848A8',
			tabBar: '#edeaf2', divider: '#C0B8D0',
			fileExplorerBg: '#FAF8FE', fileExplorerFg: '#302840',
			fileExplorerMutedFg: '#8078A0', fileExplorerAccent: '#E8E2F2',
			fileExplorerPrimary: '#6848A8', fileExplorerBorder: '#D8D2E5',
			fileExplorerBadgeFg: '#8078A0',
			searchSemanticBg: 'rgba(104,72,168,0.15)', searchSemanticFg: '#6848A8',
			rightSidebarBg: '#EAE6F2', rightSidebarFg: '#302840',
			rightSidebarMutedFg: '#8078A0', rightSidebarAccent: '#DDD8E8',
			rightSidebarPrimary: '#6848A8', rightSidebarBorder: '#D8D2E5',
			editorBg: '#F3F0F8', editorFg: '#302840', editorEmptyBg: '#EAE6F2',
			tabTextActive: '#302840', tabTextInactive: '#504868',
			settingsDialogBg: '#EAE6F2', settingsSidebarBg: '#FAF8FE',
			settingsText: '#302840', settingsHoverBg: '#D2CCE0', settingItemBg: '#DDD8E8',
			statusBarBg: '#efecf4', statusBarFg: '#8A80A0',
			inputBg: '#EAE6F2', inputText: '#504868', switchUncheckedBg: '#D2CCE0',
		},
		syntax: {
			heading1: '#C83848', heading2: '#D07838', heading3: '#A89020',
			heading4: '#408868', heading5: '#3868B0', heading6: '#7848B8',
			emphasis: '#A850A0', strong: '#302840', strikethrough: '#8A80A0',
			link: '#3868B0', url: '#A850A0', code: '#408868',
			codeBg: 'rgba(0,0,0,0.04)', quote: '#8078A0', meta: '#8A80A0',
			processing: '#D07838', activeLine: 'rgba(221,216,232,0.3)',
			selection: '#D8D0E8', activeLineGutter: '#DDD8E8',
		},
		preview: {
			link: '#3868B0', linkDecoration: '#3868B045',
			wikilink: '#7848B8', wikilinkDecoration: '#7848B845',
			hrBorder: '#C0B8D0', blockquoteBorder: '#8A80A0',
			blockquoteBg: '#8A80A012', blockquoteBg2: '#8A80A017', blockquoteBg3: '#8A80A021',
			taskBorder: '#C0B8D0', taskHover: '#6848A8', taskChecked: '#6848A8', taskCheckmark: '#ffffff',
			highlightBg: '#D0783845', olMarker: '#D07838',
			codeBg: '#e7e4ec', codeblockBg: '#DDD8E8',
			tableBorder: '#D5D0E2', tableHeaderBg: '#DDD8E8',
			tableAlt: '#DDD8E845', tableHover: '#D5D0E287',
			footnote: '#3868B0',
			frontmatterBg: '#DDD8E8', frontmatterBorder: '#D5D0E2',
			frontmatterLabel: '#302840', frontmatterCountBg: '#D5D0E2',
			frontmatterCountText: '#504868', frontmatterRowBorder: '#D5D0E266',
			frontmatterKey: '#8A80A0', frontmatterValue: '#302840',
			frontmatterTagBg: '#D5D0E2', frontmatterTagText: '#302840', frontmatterTagX: '#8A80A0',
			collectionBg: '#DDD8E8', collectionBorder: '#D5D0E2',
			collectionHeader: '#504868', collectionHeaderBorder: '#D5D0E2',
			collectionTableHeaderBg: '#e2dded', collectionTableHeaderText: '#504868',
			collectionTableHover: '#D5D0E287', collectionTableAlt: '#DDD8E845',
			collectionNull: '#C0B8D0', collectionError: '#C83848',
			collectionLoading: '#504868', collectionEmpty: '#C0B8D0',
			embedBg: '#DDD8E8', embedHover: '#d8d3e3', embedHeader: '#6848A8',
			embedBorder: '#D5D0E2', embedContent: '#302840', embedError: '#C83848',
		},
		wikilink: { bracket: '#8A80A0', target: '#7848B8', targetDecoration: '#7848B845', heading: '#6434a4', display: '#3868B0' },
		callout: { note: '#3868B0', tip: '#408868', important: '#7848B8', warning: '#A89020', caution: '#C83848', quote: '#8078A0' },
	},
};

export const TWILIGHT_VIOLET_THEME: Theme = {
	name: 'Twilight Violet',
	colors: {
		ui: {
			background: '#222028', foreground: '#D0CCD8',
			card: '#282630', cardForeground: '#D0CCD8',
			popover: '#1A181F', popoverForeground: '#D0CCD8',
			primary: '#9878B8', primaryForeground: '#1A181F',
			secondary: '#343040', secondaryForeground: '#D0CCD8',
			muted: '#343040', mutedForeground: '#706888',
			accent: '#343040', accentForeground: '#D0CCD8',
			destructive: '#D06060', destructiveForeground: '#D0CCD8',
			border: '#343040', input: '#343040', ring: '#9878B8',
			tabBar: '#2a2830', divider: '#444050',
			fileExplorerBg: '#2C2A34', fileExplorerFg: '#D0CCD8',
			fileExplorerMutedFg: '#8A84A0', fileExplorerAccent: '#383440',
			fileExplorerPrimary: '#9878B8', fileExplorerBorder: '#343040',
			fileExplorerBadgeFg: '#7A7490',
			searchSemanticBg: 'rgba(152,120,184,0.15)', searchSemanticFg: '#9878B8',
			rightSidebarBg: '#282630', rightSidebarFg: '#D0CCD8',
			rightSidebarMutedFg: '#8A84A0', rightSidebarAccent: '#343038',
			rightSidebarPrimary: '#9878B8', rightSidebarBorder: '#343040',
			editorBg: '#222028', editorFg: '#D0CCD8', editorEmptyBg: '#282630',
			tabTextActive: '#D0CCD8', tabTextInactive: '#A098B0',
			settingsDialogBg: '#282630', settingsSidebarBg: '#2C2A34',
			settingsText: '#D0CCD8', settingsHoverBg: '#343038', settingItemBg: '#1A181F',
			statusBarBg: '#27252d', statusBarFg: '#706888',
			inputBg: '#282630', inputText: '#A098B0', switchUncheckedBg: '#343038',
		},
		syntax: {
			heading1: '#C878A0', heading2: '#9878B8', heading3: '#7898C8',
			heading4: '#78B898', heading5: '#C8A868', heading6: '#C87878',
			emphasis: '#C878A0', strong: '#D0CCD8', strikethrough: '#706888',
			link: '#7898C8', url: '#C878A0', code: '#78B898',
			codeBg: 'rgba(255,255,255,0.06)', quote: '#706888', meta: '#706888',
			processing: '#C8A868', activeLine: 'rgba(26,24,31,0.3)',
			selection: '#383050', activeLineGutter: '#1A181F',
		},
		preview: {
			link: '#7898C8', linkDecoration: '#7898C845',
			wikilink: '#9878B8', wikilinkDecoration: '#9878B845',
			hrBorder: '#444050', blockquoteBorder: '#706888',
			blockquoteBg: '#70688812', blockquoteBg2: '#70688817', blockquoteBg3: '#70688821',
			taskBorder: '#444050', taskHover: '#9878B8', taskChecked: '#9878B8', taskCheckmark: '#1A181F',
			highlightBg: '#C8A86845', olMarker: '#C8A868',
			codeBg: '#34323a', codeblockBg: '#1A181F',
			tableBorder: '#343040', tableHeaderBg: '#1A181F',
			tableAlt: '#1A181F45', tableHover: '#34304087',
			footnote: '#7898C8',
			frontmatterBg: '#1A181F', frontmatterBorder: '#343040',
			frontmatterLabel: '#D0CCD8', frontmatterCountBg: '#343040',
			frontmatterCountText: '#A098B0', frontmatterRowBorder: '#34304066',
			frontmatterKey: '#706888', frontmatterValue: '#D0CCD8',
			frontmatterTagBg: '#343040', frontmatterTagText: '#D0CCD8', frontmatterTagX: '#706888',
			collectionBg: '#1A181F', collectionBorder: '#343040',
			collectionHeader: '#A098B0', collectionHeaderBorder: '#343040',
			collectionTableHeaderBg: '#15131a', collectionTableHeaderText: '#A098B0',
			collectionTableHover: '#34304087', collectionTableAlt: '#1A181F45',
			collectionNull: '#444050', collectionError: '#D06060',
			collectionLoading: '#A098B0', collectionEmpty: '#444050',
			embedBg: '#1A181F', embedHover: '#242229', embedHeader: '#9878B8',
			embedBorder: '#343040', embedContent: '#D0CCD8', embedError: '#D06060',
		},
		wikilink: { bracket: '#706888', target: '#9878B8', targetDecoration: '#9878B845', heading: '#ac8ccc', display: '#7898C8' },
		callout: { note: '#7898C8', tip: '#78B898', important: '#9878B8', warning: '#C8A868', caution: '#D06060', quote: '#706888' },
	},
};

export const BUILTIN_THEMES: Theme[] = [
	KOKOBRAIN_DEFAULT_THEME,
	SAKURA_THEME,
	LAVENDER_HAZE_THEME,
	TWILIGHT_VIOLET_THEME,
];

/** Default appearance settings with built-in themes */
export const DEFAULT_APPEARANCE: AppearanceSettings = {
	activeTheme: DEFAULT_THEME_NAME,
	themes: BUILTIN_THEMES,
};

/**
 * Ensures all built-in themes always exist in the themes array,
 * and that all themes have their colors fully populated (merged with defaults).
 */
export function normalizeAppearance(raw: Partial<AppearanceSettings>): AppearanceSettings {
	const activeTheme = raw.activeTheme ?? DEFAULT_THEME_NAME;
	const rawThemes = raw.themes ?? [];

	// Ensure each user theme is fully populated via merge with defaults
	const normalizedThemes: Theme[] = rawThemes.map((t) => ({
		name: t.name,
		colors: mergeThemeWithDefaults(t.colors as Partial<ThemeColors>),
	}));

	// Ensure all built-in themes are present
	for (const builtin of BUILTIN_THEMES) {
		if (!normalizedThemes.some((t) => t.name === builtin.name)) {
			normalizedThemes.push(builtin);
		}
	}

	return { activeTheme, themes: normalizedThemes };
}

/** Finds a theme by name from an array, falling back to the built-in default */
export function findThemeByName(themes: Theme[], name: string): Theme {
	return themes.find((t) => t.name === name) ?? KOKOBRAIN_DEFAULT_THEME;
}
