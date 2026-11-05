import type { Theme, ThemeColors } from './theme.types';
import { ensureContrast, flatten, mixColors } from '#lib/utils/color.js';

/**
 * Names of the categorical type palette. A `_color` set to one of them renders
 * with the active theme's `ui.type<Name>` token (CSS `--type-<name>`).
 */
export const TYPE_PALETTE_NAMES = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'gray'] as const;

/** UI token keys of the type palette, in `TYPE_PALETTE_NAMES` order. */
export const TYPE_PALETTE_TOKENS = [
	'typeRed', 'typeOrange', 'typeYellow', 'typeGreen', 'typeTeal', 'typeBlue', 'typePurple', 'typePink', 'typeGray',
] as const;

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
	/** H1 text; H2 to H6 step from it toward `mutedFg` */
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

const ALPHA_MIX = /^color-mix\(\s*in\s+srgb\s*,\s*(.+?)\s+(\d+(?:\.\d+)?)%\s*,\s*transparent\s*\)$/i;

/**
 * Applies a two-digit hex alpha to a color: appended to a 6-digit hex, and
 * through `color-mix` for any other CSS color so the result stays valid. A
 * color that already is `color-mix(in srgb, X N%, transparent)` gets its
 * percentage scaled instead of a second wrap: theme import refuses a nested
 * `color-mix`, so a nested one would make an exported theme fail to re-import.
 */
export function alpha(color: string, a: string): string {
	if (/^#[0-9a-f]{6}$/i.test(color)) return `${color}${a}`;
	const fraction = parseInt(a, 16) / 255;
	const mix = ALPHA_MIX.exec(color);
	if (mix) return `color-mix(in srgb, ${mix[1]} ${Math.round(Number(mix[2]) * fraction)}%, transparent)`;
	return `color-mix(in srgb, ${color} ${Math.round(fraction * 100)}%, transparent)`;
}

/** A foreground token, the background token it is read on, and the minimum WCAG contrast. */
type ReadabilityPair = [keyof ThemeColors, string, keyof ThemeColors, string, number];

/**
 * Pairs every built-in theme must keep readable: 4.5:1 for text, 7:1 for body
 * text, 3:1 for headings, markers and accent hues (large or non-text). A token
 * read on several surfaces appears once per surface.
 */
export const READABILITY_PAIRS: ReadabilityPair[] = [
	['ui', 'editorFg', 'ui', 'editorBg', 7],
	['ui', 'foreground', 'ui', 'background', 4.5],
	['ui', 'mutedForeground', 'ui', 'editorBg', 4.5],
	['ui', 'mutedForeground', 'ui', 'background', 4.5],
	['ui', 'mutedForeground', 'ui', 'card', 4.5],
	['ui', 'mutedForeground', 'ui', 'popover', 4.5],
	['ui', 'fileExplorerBadgeFg', 'ui', 'fileExplorerBg', 4.5],
	['ui', 'fileExplorerFg', 'ui', 'fileExplorerBg', 4.5],
	['ui', 'fileExplorerMutedFg', 'ui', 'fileExplorerBg', 4.5],
	['ui', 'rightSidebarFg', 'ui', 'rightSidebarBg', 4.5],
	['ui', 'rightSidebarMutedFg', 'ui', 'rightSidebarBg', 4.5],
	['ui', 'statusBarFg', 'ui', 'statusBarBg', 4.5],
	['ui', 'tabTextActive', 'ui', 'tabBar', 4.5],
	['ui', 'tabTextInactive', 'ui', 'tabBar', 4.5],
	['ui', 'settingsText', 'ui', 'settingsDialogBg', 4.5],
	['ui', 'primaryForeground', 'ui', 'primary', 4.5],
	['ui', 'destructiveForeground', 'ui', 'destructive', 4.5],
	...TYPE_PALETTE_TOKENS.map((k): ReadabilityPair => ['ui', k, 'ui', 'fileExplorerBg', 3]),
	['ui', 'warning', 'ui', 'fileExplorerBg', 4.5],
	['ui', 'warning', 'ui', 'fileExplorerAccent', 3],
	['ui', 'success', 'ui', 'fileExplorerBg', 4.5],
	['ui', 'success', 'ui', 'editorBg', 4.5],
	...(['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6'] as const).map(
		(h): ReadabilityPair => ['syntax', h, 'ui', 'editorBg', 3],
	),
	['syntax', 'emphasis', 'ui', 'editorBg', 4.5],
	['syntax', 'strong', 'ui', 'editorBg', 4.5],
	['syntax', 'link', 'ui', 'editorBg', 4.5],
	['syntax', 'url', 'ui', 'editorBg', 4.5],
	['syntax', 'code', 'preview', 'codeBg', 4.5],
	['syntax', 'quote', 'ui', 'editorBg', 4.5],
	['syntax', 'strikethrough', 'ui', 'editorBg', 3],
	['syntax', 'meta', 'ui', 'editorBg', 3],
	['preview', 'link', 'ui', 'editorBg', 4.5],
	['preview', 'wikilink', 'ui', 'editorBg', 4.5],
	['preview', 'footnote', 'ui', 'editorBg', 4.5],
	['preview', 'olMarker', 'ui', 'editorBg', 3],
	['preview', 'taskChecked', 'ui', 'editorBg', 3],
	['preview', 'collectionHeader', 'preview', 'collectionBg', 4.5],
	['preview', 'collectionTableHeaderText', 'preview', 'collectionTableHeaderBg', 4.5],
	['preview', 'collectionLoading', 'preview', 'collectionBg', 4.5],
	['preview', 'embedContent', 'preview', 'embedBg', 4.5],
	['wikilink', 'bracket', 'ui', 'editorBg', 3],
	['wikilink', 'target', 'ui', 'editorBg', 4.5],
	['wikilink', 'heading', 'ui', 'editorBg', 4.5],
	['wikilink', 'display', 'ui', 'editorBg', 4.5],
	...(['note', 'tip', 'important', 'warning', 'caution', 'quote'] as const).map(
		(k): ReadabilityPair => ['callout', k, 'ui', 'editorBg', 3],
	),
];

/** Moves each failing foreground of `READABILITY_PAIRS` to its minimum contrast; backgrounds are never changed. */
function withReadableContrast(colors: ThemeColors): ThemeColors {
	const out = {
		ui: { ...colors.ui }, syntax: { ...colors.syntax }, preview: { ...colors.preview },
		wikilink: { ...colors.wikilink }, callout: { ...colors.callout },
	};
	for (const [group, key, bgGroup, bgKey, min] of READABILITY_PAIRS) {
		const tokens: Record<string, string> = out[group];
		const bgTokens: Record<string, string> = out[bgGroup];
		const bg = flatten(bgTokens[bgKey], out.ui.editorBg) ?? bgTokens[bgKey];
		const before = tokens[key];
		tokens[key] = ensureContrast(before, bg, min);
		const tint = `${key}Decoration`;
		if (tokens[key] !== before && tokens[tint]?.toLowerCase() === `${before}45`.toLowerCase()) {
			tokens[tint] = `${tokens[key]}45`;
		}
	}
	return out;
}

/**
 * Lifts the core colors that are read as text or accents to their minimum
 * contrast on every surface they appear on, before derivation, so every token
 * derived from one source (link, hover, underline tint) stays the same color.
 */
function readableCore(p: CorePalette): CorePalette {
	const surfaces = [p.editorBg, p.sidebarBg, p.panelBg, p.popoverBg];
	const lift = (color: string, min: number, on: string[] = [p.editorBg]) =>
		on.reduce((c, bg) => ensureContrast(c, bg, min), color);
	const primary = lift(p.primary, 4.5);
	const error = lift(p.error, 3);
	return {
		...p,
		fg: lift(lift(p.fg, 7), 4.5, surfaces),
		heading: lift(p.heading, 3),
		mutedFg: lift(p.mutedFg, 4.5, surfaces),
		primary,
		primaryFg: ensureContrast(p.primaryFg, primary, 4.5),
		secondary: lift(p.secondary, 4.5),
		codeFg: lift(p.codeFg, 4.5, [flatten(p.codeBg, p.editorBg) ?? p.editorBg]),
		error,
		errorFg: ensureContrast(p.errorFg, error, 4.5),
		inlineFg: p.inlineFg && lift(p.inlineFg, 4.5),
		linkFg: p.linkFg && lift(p.linkFg, 4.5),
		meta: p.meta && lift(p.meta, 3),
		blue: lift(p.blue, 3),
		green: lift(p.green, 3),
		purple: lift(p.purple, 3),
		yellow: lift(p.yellow, 3),
	};
}

/** Per-token overrides applied on top of the derived theme. */
export type ThemeOverrides = { [G in keyof ThemeColors]?: Partial<ThemeColors[G]> };

/**
 * Expands a core palette into the full token set of a KokoBrain theme, applies
 * `overrides` (tokens a theme sets differently from the derivation). Text and
 * accent colors are lifted to readable contrast in the core first; a final pass
 * over `READABILITY_PAIRS` catches overrides that still fall short.
 */
export function buildTheme(name: string, core: CorePalette, overrides: ThemeOverrides = {}): Theme {
	const p = readableCore(core);
	const inlineFg = p.inlineFg ?? p.fg;
	const linkFg = p.linkFg ?? p.primary;
	const meta = p.meta ?? p.mutedFg;
	const quote = p.blockquoteAccent ?? p.primary;
	const mix = (a: string, b: string, t?: number) => mixColors(a, b, t) ?? a;
	// Heading levels step from the heading color (H1) to the muted text color (H6).
	const headingAt = (level: number) => (level === 5 ? p.mutedFg : mix(p.heading, p.mutedFg, level / 5));
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
			typeRed: p.error, typeOrange: mix(p.error, p.yellow), typeYellow: p.yellow,
			typeGreen: p.green, typeTeal: mix(p.green, p.blue), typeBlue: p.blue,
			typePurple: p.purple, typePink: mix(p.error, p.purple), typeGray: p.mutedFg,
			warning: p.yellow,
			success: p.green,
		},
		syntax: {
			heading1: p.heading, heading2: headingAt(1), heading3: headingAt(2),
			heading4: headingAt(3), heading5: headingAt(4), heading6: headingAt(5),
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
		colors: withReadableContrast({
			ui: { ...derived.ui, ...overrides.ui },
			syntax: { ...derived.syntax, ...overrides.syntax },
			preview: { ...derived.preview, ...overrides.preview },
			wikilink: { ...derived.wikilink, ...overrides.wikilink },
			callout: { ...derived.callout, ...overrides.callout },
		}),
	};
}

/**
 * Reads a core palette back out of a full theme, from the token each core field
 * is derived into; inverse of `buildTheme` for themes built without overrides.
 */
export function coreFromColors(c: ThemeColors): CorePalette {
	return {
		editorBg: c.ui.editorBg, sidebarBg: c.ui.background, panelBg: c.ui.card, popoverBg: c.ui.popover,
		fg: c.ui.foreground, heading: c.syntax.heading1, mutedFg: c.ui.mutedForeground, faintFg: c.preview.taskBorder,
		border: c.ui.border, borderStrong: c.ui.input, hover: c.ui.muted, selected: c.ui.fileExplorerAccent,
		primary: c.ui.primary, primaryFg: c.ui.primaryForeground, secondary: c.syntax.processing,
		selection: c.syntax.selection, highlight: c.preview.highlightBg, codeFg: c.syntax.code, codeBg: c.preview.codeBg,
		error: c.ui.destructive, errorFg: c.ui.destructiveForeground,
		inlineFg: c.syntax.strong, linkFg: c.syntax.link, meta: c.syntax.meta, blockquoteAccent: c.preview.blockquoteBorder,
		blue: c.callout.note, green: c.callout.tip, purple: c.callout.important, yellow: c.callout.warning,
	};
}
