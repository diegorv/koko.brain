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
			editorEmptyBg: '#2b2f40',
			tabTextActive: '#bac5ee',
			tabTextInactive: '#9ca3c7',
			settingsDialogBg: '#313549',
			settingsSidebarBg: '#2B2F40',
			settingsText: '#bfcaf3',
			settingsHoverBg: '#393e50',
			settingItemBg: '#20212d',
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

/** Default appearance settings with only the built-in theme */
export const DEFAULT_APPEARANCE: AppearanceSettings = {
	activeTheme: DEFAULT_THEME_NAME,
	themes: [KOKOBRAIN_DEFAULT_THEME],
};

/**
 * Ensures the built-in "KokoBrain Default" theme always exists in the themes array,
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

	// Ensure built-in theme is always present
	const hasDefault = normalizedThemes.some((t) => t.name === DEFAULT_THEME_NAME);
	if (!hasDefault) {
		normalizedThemes.unshift(KOKOBRAIN_DEFAULT_THEME);
	}

	return { activeTheme, themes: normalizedThemes };
}

/** Finds a theme by name from an array, falling back to the built-in default */
export function findThemeByName(themes: Theme[], name: string): Theme {
	return themes.find((t) => t.name === name) ?? KOKOBRAIN_DEFAULT_THEME;
}
