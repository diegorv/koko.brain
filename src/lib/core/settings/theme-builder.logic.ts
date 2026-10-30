import type { Theme, ThemeColors } from './theme.types';

/**
 * Core palette of a built-in theme; `buildTheme` derives every other token
 * from it. Tokens a theme wants different go through `ThemeOverrides`.
 */
export interface CorePalette {
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
	/** Comments, markup punctuation and wikilink brackets; defaults to `mutedFg` */
	meta?: string;
	/** Blockquote bar, and the base of its background tints; defaults to `primary` */
	blockquoteAccent?: string;
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
export function alpha(hex: string, a: string): string {
	return `${hex.slice(0, 7)}${a}`;
}

/** Per-token overrides applied on top of the derived theme. */
export type ThemeOverrides = { [G in keyof ThemeColors]?: Partial<ThemeColors[G]> };

/**
 * Expands a core palette into the full token set of a KokoBrain theme, then
 * applies `overrides` (tokens a theme sets differently from the derivation).
 */
export function buildTheme(name: string, p: CorePalette, overrides: ThemeOverrides = {}): Theme {
	const inlineFg = p.inlineFg ?? p.fg;
	const linkFg = p.linkFg ?? p.primary;
	const meta = p.meta ?? p.mutedFg;
	const quote = p.blockquoteAccent ?? p.primary;
	const derived: ThemeColors = {
		ui: {
			background: p.sidebarBg, foreground: p.fg,
			card: p.panelBg,
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
			rightSidebarPrimary: p.primary,
			editorBg: p.editorBg, editorFg: p.fg, editorEmptyBg: p.editorBg,
			tabTextActive: p.fg, tabTextInactive: p.mutedFg,
			settingsDialogBg: p.panelBg, settingsSidebarBg: p.sidebarBg,
			settingsText: p.fg, settingsHoverBg: p.hover, settingItemBg: p.sidebarBg,
			statusBarBg: p.sidebarBg, statusBarFg: p.mutedFg,
			inputBg: p.panelBg, switchUncheckedBg: p.borderStrong,
		},
		syntax: {
			heading1: p.heading, heading2: p.heading, heading3: p.heading,
			heading4: p.heading, heading5: p.heading, heading6: p.heading,
			emphasis: inlineFg, strong: inlineFg, strikethrough: p.mutedFg,
			link: linkFg, url: linkFg, code: p.codeFg,
			codeBg: p.codeBg, quote: p.mutedFg, meta,
			processing: p.secondary, activeLine: alpha(p.hover, '4d'),
			selection: p.selection, activeLineGutter: p.hover,
		},
		preview: {
			link: linkFg, linkDecoration: alpha(linkFg, '45'),
			wikilink: p.primary, wikilinkDecoration: alpha(p.primary, '45'),
			hrBorder: p.borderStrong, blockquoteBorder: quote,
			blockquoteBg: alpha(quote, '12'), blockquoteBg2: alpha(quote, '17'), blockquoteBg3: alpha(quote, '21'),
			taskBorder: p.faintFg, taskHover: p.primary, taskChecked: p.primary, taskCheckmark: p.primaryFg,
			highlightBg: p.highlight, olMarker: p.primary,
			codeBg: p.codeBg, codeblockBg: p.panelBg === p.editorBg ? p.sidebarBg : p.panelBg,
			tableBorder: p.border, tableHeaderBg: p.sidebarBg,
			tableAlt: alpha(p.hover, '45'),
			footnote: p.primary,
			frontmatterBg: p.sidebarBg, frontmatterBorder: p.border,
			collectionBg: p.sidebarBg, collectionBorder: p.border,
			collectionHeader: p.mutedFg, collectionHeaderBorder: p.border,
			collectionTableHeaderBg: p.hover, collectionTableHeaderText: p.mutedFg,
			collectionTableHover: alpha(p.hover, '87'), collectionTableAlt: alpha(p.hover, '45'),
			collectionNull: p.faintFg, collectionError: p.error,
			collectionLoading: p.mutedFg, collectionEmpty: p.faintFg,
			embedBg: p.sidebarBg, embedHover: p.hover, embedHeader: p.primary,
			embedBorder: p.border, embedContent: p.fg, embedError: p.error,
		},
		wikilink: { bracket: meta, target: p.primary, targetDecoration: alpha(p.primary, '45'), heading: p.secondary, display: linkFg },
		callout: { note: p.blue, tip: p.green, important: p.purple, warning: p.yellow, caution: p.error, quote: p.mutedFg },
	};
	return {
		name,
		colors: {
			ui: { ...derived.ui, ...overrides.ui },
			syntax: { ...derived.syntax, ...overrides.syntax },
			preview: { ...derived.preview, ...overrides.preview },
			wikilink: { ...derived.wikilink, ...overrides.wikilink },
			callout: { ...derived.callout, ...overrides.callout },
		},
	};
}
