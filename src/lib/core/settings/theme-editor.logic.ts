import type {
	Theme,
	ThemeColors,
	UIColors,
	SyntaxColors,
	PreviewColors,
	WikilinkColors,
	CalloutColors,
} from './theme.types';
import { DEFAULT_THEME_NAME } from './theme.logic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A labeled sub-group of color token keys within a color group */
export interface ColorSubGroup<K extends string = string> {
	label: string;
	keys: K[];
}

/** The five top-level color group identifiers */
export type ColorGroupKey = keyof ThemeColors;

/** Human-readable labels for each color group tab */
export const COLOR_GROUP_LABELS: Record<ColorGroupKey, string> = {
	ui: 'UI',
	syntax: 'Syntax',
	preview: 'Preview',
	wikilink: 'Wikilink',
	callout: 'Callout',
};

/** Ordered list of color group keys for tab rendering */
export const COLOR_GROUP_ORDER: ColorGroupKey[] = ['ui', 'syntax', 'preview', 'wikilink', 'callout'];

// ---------------------------------------------------------------------------
// UI color sub-groups
// ---------------------------------------------------------------------------

export const UI_COLOR_GROUPS: ColorSubGroup<keyof UIColors>[] = [
	{
		label: 'Base',
		keys: ['background', 'foreground', 'card', 'cardForeground', 'popover', 'popoverForeground'],
	},
	{
		label: 'Brand',
		keys: [
			'primary', 'primaryForeground',
			'secondary', 'secondaryForeground',
			'accent', 'accentForeground',
			'destructive', 'destructiveForeground',
		],
	},
	{
		label: 'Form',
		keys: ['border', 'input', 'ring', 'inputBg', 'inputText', 'switchUncheckedBg'],
	},
	{
		label: 'Muted',
		keys: ['muted', 'mutedForeground'],
	},
	{
		label: 'App Shell',
		keys: ['tabBar', 'divider', 'fileExplorerBg', 'editorEmptyBg', 'tabTextActive', 'tabTextInactive'],
	},
	{
		label: 'Settings',
		keys: ['settingsDialogBg', 'settingsSidebarBg', 'settingsText', 'settingsHoverBg', 'settingItemBg'],
	},
];

// ---------------------------------------------------------------------------
// Syntax color sub-groups
// ---------------------------------------------------------------------------

export const SYNTAX_COLOR_GROUPS: ColorSubGroup<keyof SyntaxColors>[] = [
	{
		label: 'Headings',
		keys: ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6'],
	},
	{
		label: 'Text',
		keys: ['emphasis', 'strong', 'strikethrough'],
	},
	{
		label: 'Links & Code',
		keys: ['link', 'url', 'code', 'codeBg'],
	},
	{
		label: 'Other',
		keys: ['quote', 'meta', 'processing'],
	},
	{
		label: 'Editor',
		keys: ['activeLine', 'selection', 'activeLineGutter'],
	},
];

// ---------------------------------------------------------------------------
// Preview color sub-groups
// ---------------------------------------------------------------------------

export const PREVIEW_COLOR_GROUPS: ColorSubGroup<keyof PreviewColors>[] = [
	{
		label: 'Links',
		keys: ['link', 'linkDecoration', 'wikilink', 'wikilinkDecoration'],
	},
	{
		label: 'Horizontal Rule',
		keys: ['hrBorder'],
	},
	{
		label: 'Blockquote',
		keys: ['blockquoteBorder', 'blockquoteBg', 'blockquoteBg2', 'blockquoteBg3'],
	},
	{
		label: 'Tasks',
		keys: ['taskBorder', 'taskHover', 'taskChecked', 'taskCheckmark'],
	},
	{
		label: 'Highlight & Markers',
		keys: ['highlightBg', 'olMarker'],
	},
	{
		label: 'Code',
		keys: ['codeBg', 'codeblockBg'],
	},
	{
		label: 'Table',
		keys: ['tableBorder', 'tableHeaderBg', 'tableAlt', 'tableHover'],
	},
	{
		label: 'Footnotes',
		keys: ['footnote'],
	},
	{
		label: 'Frontmatter',
		keys: [
			'frontmatterBg', 'frontmatterBorder', 'frontmatterLabel',
			'frontmatterCountBg', 'frontmatterCountText', 'frontmatterRowBorder',
			'frontmatterKey', 'frontmatterValue',
			'frontmatterTagBg', 'frontmatterTagText', 'frontmatterTagX',
		],
	},
	{
		label: 'Collection',
		keys: [
			'collectionBg', 'collectionBorder', 'collectionHeader', 'collectionHeaderBorder',
			'collectionTableHeaderBg', 'collectionTableHeaderText',
			'collectionTableHover', 'collectionTableAlt',
			'collectionNull', 'collectionError', 'collectionLoading', 'collectionEmpty',
		],
	},
	{
		label: 'Embeds',
		keys: ['embedBg', 'embedHover', 'embedHeader', 'embedBorder', 'embedContent', 'embedError'],
	},
];

// ---------------------------------------------------------------------------
// Wikilink & Callout sub-groups (flat — small enough to not need sub-groups)
// ---------------------------------------------------------------------------

export const WIKILINK_COLOR_GROUPS: ColorSubGroup<keyof WikilinkColors>[] = [
	{
		label: 'Wikilinks',
		keys: ['bracket', 'target', 'targetDecoration', 'heading', 'display'],
	},
];

export const CALLOUT_COLOR_GROUPS: ColorSubGroup<keyof CalloutColors>[] = [
	{
		label: 'Callout Types',
		keys: ['note', 'tip', 'important', 'warning', 'caution', 'quote'],
	},
];

// ---------------------------------------------------------------------------
// Label generation
// ---------------------------------------------------------------------------

/**
 * Converts a camelCase token key to a human-readable label.
 * Examples: `tabBar` → "Tab Bar", `heading1` → "Heading 1", `codeBg` → "Code Bg"
 */
export function camelCaseToLabel(key: string): string {
	// Insert space before uppercase letters and before digit sequences preceded by a letter
	const spaced = key
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/([a-zA-Z])(\d)/g, '$1 $2');
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// ---------------------------------------------------------------------------
// Hex validation & normalization
// ---------------------------------------------------------------------------

const HEX_3 = /^#?[0-9a-fA-F]{3}$/;
const HEX_6 = /^#?[0-9a-fA-F]{6}$/;

/** Returns true if the string is a valid 3 or 6 character hex color (with or without `#`) */
export function isValidHex(value: string): boolean {
	return HEX_3.test(value) || HEX_6.test(value);
}

/** Normalizes a hex string: ensures `#` prefix, expands 3-char to 6-char, lowercases */
export function normalizeHex(value: string): string {
	let hex = value.startsWith('#') ? value.slice(1) : value;
	if (hex.length === 3) {
		hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
	}
	return '#' + hex.toLowerCase();
}

/**
 * Converts a color value to a format accepted by `<input type="color">` (`#rrggbb`).
 * Non-hex values (rgba, oklch, etc.) return `#000000` as fallback.
 */
export function hexToColorInputValue(value: string): string {
	if (isValidHex(value)) {
		return normalizeHex(value);
	}
	return '#000000';
}

// ---------------------------------------------------------------------------
// Theme name validation
// ---------------------------------------------------------------------------

/**
 * Validates a theme name for the editor. Returns an error message string
 * if invalid, or `null` if valid.
 */
export function validateThemeName(name: string, existingNames: string[]): string | null {
	const trimmed = name.trim();
	if (!trimmed) {
		return 'Theme name cannot be empty';
	}
	if (trimmed === DEFAULT_THEME_NAME) {
		return `"${DEFAULT_THEME_NAME}" is reserved`;
	}
	if (existingNames.includes(trimmed)) {
		return 'A theme with this name already exists';
	}
	return null;
}

// ---------------------------------------------------------------------------
// Import / Export
// ---------------------------------------------------------------------------

/** Serializes a theme to a pretty-printed JSON string for export */
export function serializeThemeForExport(theme: Theme): string {
	return JSON.stringify(theme, null, 2);
}

/**
 * Parses a JSON string as a Theme. Returns the parsed Theme if valid,
 * or `null` if the JSON is malformed or doesn't have the expected shape.
 */
export function parseThemeFromImport(json: string): Theme | null {
	try {
		const parsed = JSON.parse(json);
		if (
			typeof parsed !== 'object' ||
			parsed === null ||
			typeof parsed.name !== 'string' ||
			!parsed.name.trim() ||
			typeof parsed.colors !== 'object' ||
			parsed.colors === null
		) {
			return null;
		}
		return parsed as Theme;
	} catch {
		return null;
	}
}
