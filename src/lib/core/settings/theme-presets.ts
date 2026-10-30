import type { Theme } from './theme.types';

/**
 * Core palette of a built-in theme; `buildPresetTheme` derives every other
 * token from it. For ported themes each value comes from the source app's
 * stylesheets.
 *
 * Ported sources (palettes copied, no code):
 * - Zettlr (https://github.com/Zettlr/Zettlr): editor themes in
 *   `source/common/modules/markdown-editor/theme/`, greys and accents in
 *   `source/common/vue/window/WindowChrome.vue`, sidebar in `FileItem.vue`.
 * - Tolaria (https://github.com/refactoringhq/tolaria): `src/index.css`
 *   (`[data-theme]` blocks) and `src/theme.json`.
 */
interface PresetPalette {
	/** Editor background */
	editorBg: string;
	/** Sidebar / file explorer background */
	sidebarBg: string;
	/** Raised surfaces: cards, panels, dialogs */
	panelBg: string;
	/** Popovers and dropdowns */
	popoverBg: string;
	/** Main text */
	fg: string;
	/** Heading text */
	heading: string;
	/** Secondary text */
	mutedFg: string;
	/** Disabled / placeholder text */
	faintFg: string;
	/** Default border */
	border: string;
	/** Stronger border (rules, inputs) */
	borderStrong: string;
	/** Hover surface */
	hover: string;
	/** Selected surface */
	selected: string;
	/** Accent: links, markup, cursor */
	primary: string;
	/** Text drawn on the accent */
	primaryFg: string;
	/** Second accent (Zettlr strings and citekeys) */
	secondary: string;
	/** Text selection; may carry alpha */
	selection: string;
	/** `==highlight==` background; may carry alpha */
	highlight: string;
	/** Inline code text */
	codeFg: string;
	/** Inline code background; may carry alpha */
	codeBg: string;
	/** Errors and destructive actions */
	error: string;
	/** Text drawn on the error color (destructive buttons) */
	errorFg: string;
	/** Bold and italic text; defaults to `fg` */
	inlineFg?: string;
	/** Link text; defaults to `primary` */
	linkFg?: string;
	/** Frontmatter keys */
	fmKey: string;
	/** Frontmatter values */
	fmValue: string;
	/** Note callouts */
	blue: string;
	/** Tip callouts */
	green: string;
	/** Important callouts */
	purple: string;
	/** Warning callouts */
	yellow: string;
}

/** Appends a two-digit hex alpha to a 6-digit hex color. */
function alpha(hex: string, a: string): string {
	return `${hex.slice(0, 7)}${a}`;
}

/** Expands a source palette into the full token set of a KokoBrain theme. */
function buildPresetTheme(name: string, p: PresetPalette): Theme {
	const inlineFg = p.inlineFg ?? p.fg;
	const linkFg = p.linkFg ?? p.primary;
	return {
		name,
		colors: {
			ui: {
				background: p.sidebarBg, foreground: p.fg,
				card: p.panelBg, cardForeground: p.fg,
				popover: p.popoverBg, popoverForeground: p.fg,
				primary: p.primary, primaryForeground: p.primaryFg,
				secondary: p.hover, secondaryForeground: p.fg,
				muted: p.hover, mutedForeground: p.mutedFg,
				accent: p.selected, accentForeground: p.fg,
				destructive: p.error, destructiveForeground: p.errorFg,
				border: p.border, input: p.borderStrong, ring: p.primary,
				tabBar: p.sidebarBg, divider: p.border,
				fileExplorerBg: p.sidebarBg, fileExplorerFg: p.fg,
				fileExplorerMutedFg: p.mutedFg, fileExplorerAccent: p.selected,
				fileExplorerPrimary: p.primary, fileExplorerBorder: p.border,
				fileExplorerBadgeFg: p.mutedFg,
				searchSemanticBg: alpha(p.primary, '26'), searchSemanticFg: p.primary,
				rightSidebarBg: p.sidebarBg, rightSidebarFg: p.fg,
				rightSidebarMutedFg: p.mutedFg, rightSidebarAccent: p.selected,
				rightSidebarPrimary: p.primary, rightSidebarBorder: p.border,
				editorBg: p.editorBg, editorFg: p.fg, editorEmptyBg: p.editorBg,
				tabTextActive: p.fg, tabTextInactive: p.mutedFg,
				settingsDialogBg: p.panelBg, settingsSidebarBg: p.sidebarBg,
				settingsText: p.fg, settingsHoverBg: p.hover, settingItemBg: p.sidebarBg,
				statusBarBg: p.sidebarBg, statusBarFg: p.mutedFg,
				inputBg: p.panelBg, inputText: p.fg, switchUncheckedBg: p.borderStrong,
			},
			syntax: {
				heading1: p.heading, heading2: p.heading, heading3: p.heading,
				heading4: p.heading, heading5: p.heading, heading6: p.heading,
				emphasis: inlineFg, strong: inlineFg, strikethrough: p.mutedFg,
				link: linkFg, url: linkFg, code: p.codeFg,
				codeBg: p.codeBg, quote: p.mutedFg, meta: p.primary,
				processing: p.secondary, activeLine: 'transparent',
				selection: p.selection, activeLineGutter: p.hover,
			},
			preview: {
				link: linkFg, linkDecoration: alpha(linkFg, '45'),
				wikilink: p.primary, wikilinkDecoration: alpha(p.primary, '45'),
				hrBorder: p.borderStrong, blockquoteBorder: p.primary,
				blockquoteBg: alpha(p.mutedFg, '12'), blockquoteBg2: alpha(p.mutedFg, '17'), blockquoteBg3: alpha(p.mutedFg, '21'),
				taskBorder: p.faintFg, taskHover: p.primary, taskChecked: p.primary, taskCheckmark: p.primaryFg,
				highlightBg: p.highlight, olMarker: p.primary,
				codeBg: p.codeBg, codeblockBg: p.panelBg === p.editorBg ? p.sidebarBg : p.panelBg,
				tableBorder: p.border, tableHeaderBg: p.sidebarBg,
				tableAlt: alpha(p.hover, '45'), tableHover: alpha(p.hover, '87'),
				footnote: p.primary,
				frontmatterBg: p.sidebarBg, frontmatterBorder: p.border,
				frontmatterLabel: p.fg, frontmatterCountBg: p.hover,
				frontmatterCountText: p.mutedFg, frontmatterRowBorder: alpha(p.border, '66'),
				frontmatterKey: p.fmKey, frontmatterValue: p.fmValue,
				frontmatterTagBg: p.hover, frontmatterTagText: p.fg, frontmatterTagX: p.mutedFg,
				collectionBg: p.sidebarBg, collectionBorder: p.border,
				collectionHeader: p.mutedFg, collectionHeaderBorder: p.border,
				collectionTableHeaderBg: p.hover, collectionTableHeaderText: p.mutedFg,
				collectionTableHover: alpha(p.hover, '87'), collectionTableAlt: alpha(p.hover, '45'),
				collectionNull: p.faintFg, collectionError: p.error,
				collectionLoading: p.mutedFg, collectionEmpty: p.faintFg,
				embedBg: p.sidebarBg, embedHover: p.hover, embedHeader: p.primary,
				embedBorder: p.border, embedContent: p.fg, embedError: p.error,
			},
			wikilink: { bracket: p.mutedFg, target: p.primary, targetDecoration: alpha(p.primary, '45'), heading: p.secondary, display: p.primary },
			callout: { note: p.blue, tip: p.green, important: p.purple, warning: p.yellow, caution: p.error, quote: p.mutedFg },
		},
	};
}

/** Zettlr greys (WindowChrome.vue `--grey-0`..`--grey-7`). */
const Z_GREY = ['#f0f0f0', '#dcdcdc', '#c8c8c8', '#787882', '#64646e', '#50505a', '#46465a', '#282832'] as const;

/** Zettlr directory accent colors (WindowChrome.vue `--accent-*`). */
const Z_ACCENTS = { blue: '#237aff', green: '#62ba46', purple: '#c358c4', yellow: '#e5b41f' };

/** Zettlr light defaults (`defaultVarsLight` in editor.ts, light sidebar in FileItem.vue). */
const Z_LIGHT: Omit<PresetPalette, 'primary' | 'secondary' | 'selection'> = {
	editorBg: '#ffffff', sidebarBg: '#f5f5f5', panelBg: '#ffffff', popoverBg: '#ffffff',
	fg: Z_GREY[5], heading: Z_GREY[5], mutedFg: Z_GREY[3], faintFg: Z_GREY[2],
	border: Z_GREY[1], borderStrong: Z_GREY[2], hover: Z_GREY[1], selected: Z_GREY[2],
	primaryFg: '#ffffff', highlight: '#ffff0080',
	codeFg: Z_GREY[4], codeBg: Z_GREY[0], error: '#c82828', errorFg: '#ffffff',
	fmKey: Z_GREY[3], fmValue: Z_GREY[5],
	...Z_ACCENTS,
};

/** Zettlr dark defaults (`defaultVarsDark` in editor.ts, dark sidebar in FileItem.vue / MainEditor.vue). */
const Z_DARK: Omit<PresetPalette, 'primary' | 'secondary' | 'selection'> = {
	editorBg: '#2b2b2c', sidebarBg: '#1e1e1e', panelBg: '#2b2b2c', popoverBg: Z_GREY[7],
	fg: Z_GREY[0], heading: Z_GREY[0], mutedFg: Z_GREY[3], faintFg: Z_GREY[5],
	border: '#505050', borderStrong: '#505050', hover: '#505050', selected: Z_GREY[7],
	primaryFg: '#ffffff', highlight: '#ffff0060',
	codeFg: Z_GREY[2], codeBg: Z_GREY[7], error: '#c82828', errorFg: '#ffffff',
	fmKey: Z_GREY[3], fmValue: Z_GREY[0],
	...Z_ACCENTS,
};

/** Built-in theme "Zettlr Berlin Light". */
export const ZETTLR_BERLIN_LIGHT_THEME = buildPresetTheme('Zettlr Berlin Light', {
	...Z_LIGHT, primary: '#1cb27e', primaryFg: Z_GREY[7], secondary: '#1cb27e', selection: '#b4f0aacc',
});
/** Built-in theme "Zettlr Berlin Dark". */
export const ZETTLR_BERLIN_DARK_THEME = buildPresetTheme('Zettlr Berlin Dark', {
	...Z_DARK, primary: '#1cb27e', primaryFg: Z_GREY[7], secondary: '#1cb27e', selection: '#5aaa50cc',
});

/** Built-in theme "Zettlr Bielefeld Light". */
export const ZETTLR_BIELEFELD_LIGHT_THEME = buildPresetTheme('Zettlr Bielefeld Light', {
	...Z_LIGHT, editorBg: '#f3f3e8', primary: '#ffb46c', primaryFg: Z_GREY[7], secondary: '#ffb46c', selection: '#cdcdaa',
});
/** Built-in theme "Zettlr Bielefeld Dark". */
export const ZETTLR_BIELEFELD_DARK_THEME = buildPresetTheme('Zettlr Bielefeld Dark', {
	...Z_DARK, primary: '#ffb46c', primaryFg: Z_GREY[7], secondary: '#ffb46c', selection: Z_GREY[6],
});

/** Built-in theme "Zettlr Bordeaux Light". */
export const ZETTLR_BORDEAUX_LIGHT_THEME = buildPresetTheme('Zettlr Bordeaux Light', {
	...Z_LIGHT, editorBg: '#fffff8', primary: '#1bd4e9', primaryFg: Z_GREY[7], secondary: '#d02325',
	selection: '#b8f0f6cc', error: '#d02325', inlineFg: '#93a1a1', linkFg: '#93a1a1',
});
/** Built-in theme "Zettlr Bordeaux Dark". */
export const ZETTLR_BORDEAUX_DARK_THEME = buildPresetTheme('Zettlr Bordeaux Dark', {
	...Z_DARK, editorBg: '#002b36', panelBg: '#002b36', fg: Z_GREY[2], heading: Z_GREY[2],
	inlineFg: '#93a1a1', linkFg: '#93a1a1',
	primary: '#1bd4e9', primaryFg: Z_GREY[7], secondary: '#d02325', selection: '#0c616acc',
	highlight: '#000000', codeFg: Z_GREY[2], codeBg: '#002024', error: '#d02325', fmValue: Z_GREY[2],
});

/** Built-in theme "Zettlr Frankfurt Light". */
export const ZETTLR_FRANKFURT_LIGHT_THEME = buildPresetTheme('Zettlr Frankfurt Light', {
	...Z_LIGHT, primary: '#1d75b3', secondary: '#1d75b3', selection: '#c8dcf0cc',
});
/** Built-in theme "Zettlr Frankfurt Dark". */
export const ZETTLR_FRANKFURT_DARK_THEME = buildPresetTheme('Zettlr Frankfurt Dark', {
	...Z_DARK, primary: '#1d75b3', secondary: '#1d75b3', selection: '#1d3786cc',
});

/** Built-in theme "Zettlr Karl-Marx-Stadt Light". */
export const ZETTLR_KARL_MARX_STADT_LIGHT_THEME = buildPresetTheme('Zettlr Karl-Marx-Stadt Light', {
	...Z_LIGHT, primary: '#dc2d2d', secondary: '#dc2d2d', selection: '#fbceb1',
});
/** Built-in theme "Zettlr Karl-Marx-Stadt Dark". */
export const ZETTLR_KARL_MARX_STADT_DARK_THEME = buildPresetTheme('Zettlr Karl-Marx-Stadt Dark', {
	...Z_DARK, primary: '#dc2d2d', secondary: '#dc2d2d', selection: '#a32323b3',
});

/** Built-in theme "Tolaria Light". */
export const TOLARIA_LIGHT_THEME = buildPresetTheme('Tolaria Light', {
	editorBg: '#ffffff', sidebarBg: '#f7f6f3', panelBg: '#ffffff', popoverBg: '#ffffff',
	fg: '#37352f', heading: '#37352f', mutedFg: '#787774', faintFg: '#b4b4b4',
	border: '#e9e9e7', borderStrong: '#d9d9d6', hover: '#ebebea', selected: '#e8f4fe',
	primary: '#155dff', primaryFg: '#ffffff', secondary: '#805ad5',
	selection: '#e8f4fe', highlight: '#d69e2e1a',
	codeFg: '#c9383e', codeBg: '#afb8c126', error: '#e53e3e', errorFg: '#ffffff',
	fmKey: '#c9383e', fmValue: '#2a7e4f',
	blue: '#155dff', green: '#38a169', purple: '#805ad5', yellow: '#d69e2e',
});

/** Built-in theme "Tolaria Dark". */
export const TOLARIA_DARK_THEME = buildPresetTheme('Tolaria Dark', {
	editorBg: '#1f1e1b', sidebarBg: '#191814', panelBg: '#23221f', popoverBg: '#292823',
	fg: '#e6e1d8', heading: '#f1ece3', mutedFg: '#b8b1a6', faintFg: '#625b53',
	border: '#34322d', borderStrong: '#46433b', hover: '#2d2b27', selected: '#1e344c',
	primary: '#78a4ff', primaryFg: '#151411', secondary: '#b69cff',
	selection: '#3a63a0', highlight: '#f2c86b2e',
	codeFg: '#ffa6a3', codeBg: '#a7b0bd29', error: '#ff8a86', errorFg: '#151411',
	fmKey: '#ffa6a3', fmValue: '#8edfae',
	blue: '#78a4ff', green: '#79d89d', purple: '#b69cff', yellow: '#f2c86b',
});

/** Reading themes designed for KokoBrain; body text meets WCAG AAA (7:1) on the editor background. */
/** Built-in theme "Foolscap". */
export const FOOLSCAP_THEME = buildPresetTheme('Foolscap', {
	editorBg: '#f7f4ec',
	sidebarBg: '#ece7da',
	panelBg: '#fbf9f4',
	popoverBg: '#fffdf8',
	fg: '#2e2c28',
	heading: '#1c2a39',
	mutedFg: '#66635b',
	faintFg: '#7f7a70',
	border: '#ddd6c6',
	borderStrong: '#c4bbaa',
	hover: '#e6e0d2',
	selected: '#dce5ee',
	primary: '#2f5d8a',
	primaryFg: '#fbf9f4',
	secondary: '#6f5030',
	selection: '#2f5d8a33',
	highlight: '#e0b84d59',
	codeFg: '#8a3f3f',
	codeBg: '#6b5a3f1a',
	error: '#a33a2e',
	errorFg: '#ffffff',
	fmKey: '#5a6b7d',
	fmValue: '#3f6b4c',
	blue: '#2f5d8a',
	green: '#3f6b4c',
	purple: '#6e4f86',
	yellow: '#7d5f10',
});

/** Built-in theme "Sepia". */
export const SEPIA_THEME = buildPresetTheme('Sepia', {
	editorBg: '#f4ecd8',
	sidebarBg: '#ebe1c8',
	panelBg: '#f9f4e6',
	popoverBg: '#fbf7ec',
	fg: '#3a2a1e',
	heading: '#2a1c12',
	mutedFg: '#6a5443',
	faintFg: '#8f7b66',
	border: '#d6c8a8',
	borderStrong: '#bfae8a',
	hover: '#e2d5b5',
	selected: '#d8c494',
	primary: '#9c3f17',
	primaryFg: '#fbf6ea',
	secondary: '#5f4b22',
	selection: '#9c3f1733',
	highlight: '#e8b84a66',
	codeFg: '#7a3418',
	codeBg: '#e6d8b8',
	error: '#a3262b',
	errorFg: '#ffffff',
	fmKey: '#7d4a22',
	fmValue: '#3d5a3a',
	blue: '#2f5f7a',
	green: '#4d6b2e',
	purple: '#6b4a7a',
	yellow: '#7d5c0a',
});

/** Built-in theme "Cool Mist". */
export const COOL_MIST_THEME = buildPresetTheme('Cool Mist', {
	editorBg: '#f5f8fa',
	sidebarBg: '#e8eff4',
	panelBg: '#ffffff',
	popoverBg: '#ffffff',
	fg: '#1e2d3b',
	heading: '#12202e',
	mutedFg: '#4b6175',
	faintFg: '#617488',
	border: '#d3dde6',
	borderStrong: '#b4c3d0',
	hover: '#dfe9f0',
	selected: '#cfe9e8',
	primary: '#0b7075',
	primaryFg: '#ffffff',
	secondary: '#3f5f9a',
	selection: '#0b707338',
	highlight: '#f5c94a66',
	codeFg: '#0d5c60',
	codeBg: '#dde8ee',
	error: '#b3243a',
	errorFg: '#ffffff',
	fmKey: '#3c6486',
	fmValue: '#1e2d3b',
	blue: '#2563a8',
	green: '#2b7a4f',
	purple: '#6a4fae',
	yellow: '#8f6200',
});

/** Built-in theme "Mint Linen". */
export const MINT_LINEN_THEME = buildPresetTheme('Mint Linen', {
	editorBg: '#f6faf5',
	sidebarBg: '#edf4ee',
	panelBg: '#fbfdfb',
	popoverBg: '#ffffff',
	fg: '#1f3a33',
	heading: '#14291f',
	mutedFg: '#4f6b62',
	faintFg: '#7e958c',
	border: '#d6e3da',
	borderStrong: '#b7cbbf',
	hover: '#e2ede6',
	selected: '#d3e9dc',
	primary: '#2a6b4f',
	primaryFg: '#ffffff',
	secondary: '#8a6a1f',
	selection: '#2a6b4f2e',
	highlight: '#e8d27a80',
	codeFg: '#2f5d4b',
	codeBg: '#1f3a330f',
	error: '#b03a2e',
	errorFg: '#ffffff',
	fmKey: '#3d6b5a',
	fmValue: '#2b3f38',
	blue: '#2d6a8f',
	green: '#2f7a40',
	purple: '#6b4fa0',
	yellow: '#8f6c00',
});

/** Built-in theme "Lumen Contrast". */
export const LUMEN_CONTRAST_THEME = buildPresetTheme('Lumen Contrast', {
	editorBg: '#ffffff',
	sidebarBg: '#f2f2f2',
	panelBg: '#ffffff',
	popoverBg: '#ffffff',
	fg: '#111111',
	heading: '#000000',
	mutedFg: '#4d4d4d',
	faintFg: '#6e6e6e',
	border: '#c4c4c4',
	borderStrong: '#7a7a7a',
	hover: '#e6e6e6',
	selected: '#d6e6ff',
	primary: '#0047b3',
	primaryFg: '#ffffff',
	secondary: '#6b21a8',
	selection: '#0047b338',
	highlight: '#ffd60070',
	codeFg: '#9b1c1c',
	codeBg: '#efefef',
	error: '#b00020',
	errorFg: '#ffffff',
	fmKey: '#0047b3',
	fmValue: '#1a1a1a',
	blue: '#0047b3',
	green: '#1b6b32',
	purple: '#6b21a8',
	yellow: '#7a5800',
});

/** Built-in theme "Ink Night". */
export const INK_NIGHT_THEME = buildPresetTheme('Ink Night', {
	editorBg: '#1c1a17',
	sidebarBg: '#161411',
	panelBg: '#23211c',
	popoverBg: '#2a2721',
	fg: '#ece4d3',
	heading: '#f6efe0',
	mutedFg: '#aca18d',
	faintFg: '#7a7262',
	border: '#37332b',
	borderStrong: '#4d473d',
	hover: '#2d2a23',
	selected: '#3b3226',
	primary: '#e3a64f',
	primaryFg: '#1c1a17',
	secondary: '#d9a09a',
	selection: '#e3a64f59',
	highlight: '#e3a64f40',
	codeFg: '#ebbc8c',
	codeBg: '#2c2820',
	error: '#ec7f6e',
	errorFg: '#1c1a17',
	fmKey: '#d9a86b',
	fmValue: '#b5c99a',
	blue: '#8fb3d9',
	green: '#a8c686',
	purple: '#c4a6d9',
	yellow: '#e6c76a',
});

/** Built-in theme "Deep Ocean". */
export const DEEP_OCEAN_THEME = buildPresetTheme('Deep Ocean', {
	editorBg: '#0d1b2a',
	sidebarBg: '#0a1520',
	panelBg: '#112236',
	popoverBg: '#15293f',
	fg: '#c5d4e3',
	heading: '#e3edf7',
	mutedFg: '#8ea3b8',
	faintFg: '#5d7289',
	border: '#1f3349',
	borderStrong: '#2d4862',
	hover: '#172c43',
	selected: '#1d3a57',
	primary: '#3fd0e8',
	primaryFg: '#0d1b2a',
	secondary: '#7fb0ff',
	selection: '#2f6f9ab3',
	highlight: '#e7c35a40',
	codeFg: '#9ee3d6',
	codeBg: '#3a5a7a59',
	error: '#ff7a85',
	errorFg: '#0d1b2a',
	fmKey: '#7fb0ff',
	fmValue: '#b5e8d5',
	blue: '#6aa8ff',
	green: '#7bd9a4',
	purple: '#b89cff',
	yellow: '#f0c86a',
});

/** Built-in theme "Graphite Violet". */
export const GRAPHITE_VIOLET_THEME = buildPresetTheme('Graphite Violet', {
	editorBg: '#2e2e33',
	sidebarBg: '#26262b',
	panelBg: '#36363c',
	popoverBg: '#3c3c43',
	fg: '#e8e8ea',
	heading: '#f4f4f6',
	mutedFg: '#a8a8b0',
	faintFg: '#6e6e78',
	border: '#3e3e46',
	borderStrong: '#55555f',
	hover: '#3d3d45',
	selected: '#4a4a55',
	primary: '#a99fd4',
	primaryFg: '#1e1c24',
	secondary: '#8e9bb0',
	selection: '#a99fd45c',
	highlight: '#e0c97a40',
	codeFg: '#c3bce0',
	codeBg: '#ffffff14',
	error: '#d98a8a',
	errorFg: '#2e2e33',
	fmKey: '#b3a9dc',
	fmValue: '#c9c9d1',
	blue: '#8fa8cc',
	green: '#95b89a',
	purple: '#b39ddb',
	yellow: '#d4bf78',
});

/** Themes ported from Zettlr and Tolaria plus the reading themes, in display order. */
export const PRESET_THEMES: Theme[] = [
	ZETTLR_BERLIN_LIGHT_THEME, ZETTLR_BERLIN_DARK_THEME,
	ZETTLR_BIELEFELD_LIGHT_THEME, ZETTLR_BIELEFELD_DARK_THEME,
	ZETTLR_BORDEAUX_LIGHT_THEME, ZETTLR_BORDEAUX_DARK_THEME,
	ZETTLR_FRANKFURT_LIGHT_THEME, ZETTLR_FRANKFURT_DARK_THEME,
	ZETTLR_KARL_MARX_STADT_LIGHT_THEME, ZETTLR_KARL_MARX_STADT_DARK_THEME,
	TOLARIA_LIGHT_THEME, TOLARIA_DARK_THEME,
	FOOLSCAP_THEME, SEPIA_THEME, COOL_MIST_THEME, MINT_LINEN_THEME, LUMEN_CONTRAST_THEME, INK_NIGHT_THEME, DEEP_OCEAN_THEME, GRAPHITE_VIOLET_THEME,
];
