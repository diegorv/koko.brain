import type { ThemePackage } from './theme-package.logic';

/** Color tokens for the application UI shell */
export interface UIColors {
	/** File explorer / sidebar background */
	background: string;
	/** Primary text color */
	foreground: string;
	/** Editor content area background */
	card: string;
	/** Popover/dropdown background */
	popover: string;
	/** Text in popovers */
	popoverForeground: string;
	/** Primary accent color (links, focus rings) */
	primary: string;
	/** Text on primary-colored surfaces */
	primaryForeground: string;
	/** Secondary/muted surface color */
	secondary: string;
	/** Text on secondary surfaces */
	secondaryForeground: string;
	/** Muted background (disabled, subtle) */
	muted: string;
	/** Muted text color */
	mutedForeground: string;
	/** Accent surface (hover, selected) */
	accent: string;
	/** Text on accent surfaces */
	accentForeground: string;
	/** Destructive action color (delete, error) */
	destructive: string;
	/** Text on destructive surfaces */
	destructiveForeground: string;
	/** Border color for separators and outlines */
	border: string;
	/** Input field border */
	input: string;
	/** Focus ring color */
	ring: string;
	/** Top header bar background */
	tabBar: string;
	/** Divider/separator line color */
	divider: string;
	/** File explorer panel background */
	fileExplorerBg: string;
	/** File explorer primary text color */
	fileExplorerFg: string;
	/** File explorer secondary/muted text color */
	fileExplorerMutedFg: string;
	/** File explorer accent surface (hover, selected) */
	fileExplorerAccent: string;
	/** File explorer primary accent color (links, headings, selected items) */
	fileExplorerPrimary: string;
	/** File explorer border/separator color */
	fileExplorerBorder: string;
	/** File explorer badge/count text color */
	fileExplorerBadgeFg: string;
	/** Search semantic badge background */
	searchSemanticBg: string;
	/** Search semantic badge text color */
	searchSemanticFg: string;
	/** Right sidebar panel background */
	rightSidebarBg: string;
	/** Right sidebar primary text color */
	rightSidebarFg: string;
	/** Right sidebar secondary/muted text color */
	rightSidebarMutedFg: string;
	/** Right sidebar accent surface (hover, selected) */
	rightSidebarAccent: string;
	/** Right sidebar primary accent color (headings, links) */
	rightSidebarPrimary: string;
	/** Editor content area background */
	editorBg: string;
	/** Editor primary text color */
	editorFg: string;
	/** Empty editor state background */
	editorEmptyBg: string;
	/** Active tab text color */
	tabTextActive: string;
	/** Inactive tab text color */
	tabTextInactive: string;
	/** Settings dialog background */
	settingsDialogBg: string;
	/** Settings sidebar background */
	settingsSidebarBg: string;
	/** Settings text color */
	settingsText: string;
	/** Settings button hover background */
	settingsHoverBg: string;
	/** Setting item row background */
	settingItemBg: string;
	/** Input field background */
	inputBg: string;
	/** Status bar background */
	statusBarBg: string;
	/** Status bar text color */
	statusBarFg: string;
	/** Switch unchecked track background */
	switchUncheckedBg: string;
	/** Type palette red: an icon whose `_color` is `red` */
	typeRed: string;
	/** Type palette orange: an icon whose `_color` is `orange` */
	typeOrange: string;
	/** Type palette yellow: an icon whose `_color` is `yellow` */
	typeYellow: string;
	/** Type palette green: an icon whose `_color` is `green` */
	typeGreen: string;
	/** Type palette teal: an icon whose `_color` is `teal` */
	typeTeal: string;
	/** Type palette blue: an icon whose `_color` is `blue` */
	typeBlue: string;
	/** Type palette purple: an icon whose `_color` is `purple` */
	typePurple: string;
	/** Type palette pink: an icon whose `_color` is `pink` */
	typePink: string;
	/** Type palette gray: an icon whose `_color` is `gray` */
	typeGray: string;
	/** Warning text in the sidebars (an overdue 1:1) */
	warning: string;
	/** Success text in the sidebars and editor (up to date, synced, done) */
	success: string;
}

/** Color tokens for CodeMirror syntax highlighting */
export interface SyntaxColors {
	heading1: string;
	heading2: string;
	heading3: string;
	heading4: string;
	heading5: string;
	heading6: string;
	emphasis: string;
	strong: string;
	strikethrough: string;
	link: string;
	url: string;
	code: string;
	codeBg: string;
	quote: string;
	meta: string;
	processing: string;
	activeLine: string;
	selection: string;
	activeLineGutter: string;
}

/** Color tokens for live preview rendering */
export interface PreviewColors {
	link: string;
	linkDecoration: string;
	wikilink: string;
	wikilinkDecoration: string;
	hrBorder: string;
	blockquoteBorder: string;
	blockquoteBg: string;
	blockquoteBg2: string;
	blockquoteBg3: string;
	taskBorder: string;
	taskHover: string;
	taskChecked: string;
	taskCheckmark: string;
	highlightBg: string;
	olMarker: string;
	codeBg: string;
	codeblockBg: string;
	tableBorder: string;
	tableHeaderBg: string;
	tableAlt: string;
	footnote: string;
	collectionBg: string;
	collectionBorder: string;
	collectionHeader: string;
	collectionHeaderBorder: string;
	collectionTableHeaderBg: string;
	collectionTableHeaderText: string;
	collectionTableHover: string;
	collectionTableAlt: string;
	collectionNull: string;
	collectionError: string;
	collectionLoading: string;
	collectionEmpty: string;
	embedBg: string;
	embedHover: string;
	embedHeader: string;
	embedBorder: string;
	embedContent: string;
	embedError: string;
}

/** Color tokens for wikilink decorations */
export interface WikilinkColors {
	bracket: string;
	target: string;
	targetDecoration: string;
	heading: string;
	display: string;
}

/** Color tokens for callout types */
export interface CalloutColors {
	note: string;
	tip: string;
	important: string;
	warning: string;
	caution: string;
	quote: string;
}

/** Complete set of color tokens for a theme, organized by group */
export interface ThemeColors {
	ui: UIColors;
	syntax: SyntaxColors;
	preview: PreviewColors;
	wikilink: WikilinkColors;
	callout: CalloutColors;
}

/** A named color theme with all token values */
export interface Theme {
	/** Display name shown in the settings dialog */
	name: string;
	/** All color token values */
	colors: ThemeColors;
}

/** Settings for theme selection and custom theme storage */
export interface AppearanceSettings {
	/** Name of the currently active theme */
	activeTheme: string;
	/** Array of available themes (includes built-in + user-created) */
	themes: Theme[];
	/**
	 * True once saved copies of built-in themes stopped overriding the code.
	 * Before that, a saved built-in that differs from the code is kept as an
	 * "(edited)" copy so a user's in-place edit is not lost.
	 */
	builtinsFromCode?: boolean;
	/**
	 * True once the 22 themes that used to be built in were moved to the
	 * catalog. Before that, the active one becomes an installed package rebuilt
	 * from its saved colors and the others are dropped (`loadAppearance`).
	 */
	exBuiltinsMigrated?: boolean;
	/**
	 * Packages installed from the online catalog, stored as their source. Each
	 * one's built theme also sits in `themes` under the package name; on load
	 * that copy is rebuilt from the package (`loadAppearance`).
	 */
	installed?: ThemePackage[];
}
