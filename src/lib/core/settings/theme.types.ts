/** Color tokens for the application UI shell */
export interface UIColors {
	/** File explorer / sidebar background */
	background: string;
	/** Primary text color */
	foreground: string;
	/** Editor content area background */
	card: string;
	/** Text on card surfaces */
	cardForeground: string;
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
	/** Input field text color */
	inputText: string;
	/** Switch unchecked track background */
	switchUncheckedBg: string;
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
	tableHover: string;
	footnote: string;
	frontmatterBg: string;
	frontmatterBorder: string;
	frontmatterLabel: string;
	frontmatterCountBg: string;
	frontmatterCountText: string;
	frontmatterRowBorder: string;
	frontmatterKey: string;
	frontmatterValue: string;
	frontmatterTagBg: string;
	frontmatterTagText: string;
	frontmatterTagX: string;
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
}
