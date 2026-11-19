import type { Theme, ThemeColors, UIColors } from './theme.types';
import { apcaContrast, contrastRatio, ensureContrast, ensureContrastOn, flatten, mixColors, shiftLightness, tint } from '#lib/utils/color.js';

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

/**
 * A foreground token, the background token it is read on, the minimum WCAG
 * contrast, and the `ui` surface a translucent background is flattened over
 * (`editorBg` when absent).
 */
type ReadabilityPair = [
	group: keyof ThemeColors, key: string, bgGroup: keyof ThemeColors, bgKey: string, min: number, base?: keyof UIColors,
];

/** APCA |Lc| floor for muted and small text, the second gate next to WCAG 2. */
export const TEXT_LC = 45;

/** APCA minimum of a pair: text pairs (4.5:1 or more) need `TEXT_LC`, large text and non-text none. */
export function minLcOf(min: number): number {
	return min >= 4.5 ? TEXT_LC : 0;
}

/**
 * Pairs every built-in theme must keep readable: 4.5:1 for text, 7:1 for body
 * text, 3:1 for headings, markers and accent hues (large or non-text). Text
 * pairs also need APCA |Lc| `TEXT_LC` (`minLcOf`). A token read on several
 * surfaces appears once per surface.
 */
export const READABILITY_PAIRS: ReadabilityPair[] = [
	// Hover (`muted`) and selected (`accent`) rows from the same palette: chips and hover
	// rows on the sidebar, highlighted command and menu rows inside a popover, sidebar rows.
	// They come first: when a theme's surfaces pull a token both ways, the later pair wins,
	// and that is the plain surface the token is mostly read on.
	['ui', 'foreground', 'ui', 'muted', 4.5, 'background'],
	['ui', 'mutedForeground', 'ui', 'muted', 4.5, 'background'],
	['ui', 'primary', 'ui', 'muted', 4.5, 'background'],
	['ui', 'destructive', 'ui', 'muted', 4.5, 'background'],
	['ui', 'foreground', 'ui', 'accent', 4.5, 'popover'],
	['ui', 'mutedForeground', 'ui', 'accent', 4.5, 'popover'],
	['ui', 'primary', 'ui', 'accent', 4.5, 'popover'],
	['ui', 'fileExplorerFg', 'ui', 'fileExplorerAccent', 4.5, 'fileExplorerBg'],
	['ui', 'fileExplorerMutedFg', 'ui', 'fileExplorerAccent', 4.5, 'fileExplorerBg'],
	['ui', 'fileExplorerMutedFg', 'ui', 'muted', 4.5, 'fileExplorerBg'],
	['ui', 'fileExplorerMutedFg', 'ui', 'popover', 4.5],
	['ui', 'fileExplorerPrimary', 'ui', 'fileExplorerBg', 4.5],
	['ui', 'fileExplorerPrimary', 'ui', 'fileExplorerAccent', 4.5, 'fileExplorerBg'],
	['ui', 'rightSidebarFg', 'ui', 'rightSidebarAccent', 4.5, 'rightSidebarBg'],
	['ui', 'rightSidebarMutedFg', 'ui', 'rightSidebarAccent', 4.5, 'rightSidebarBg'],
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
	['ui', 'settingsText', 'ui', 'settingsHoverBg', 4.5],
	['ui', 'settingsText', 'ui', 'settingItemBg', 4.5],
	['ui', 'settingsText', 'ui', 'settingsSidebarBg', 4.5],
	['ui', 'mutedForeground', 'ui', 'settingsDialogBg', 4.5],
	['ui', 'mutedForeground', 'ui', 'settingsHoverBg', 4.5],
	['ui', 'mutedForeground', 'ui', 'settingItemBg', 4.5],
	// Primary and destructive as small text on the plain surfaces (links, errors, status bar).
	// They come before the Settings pairs: a Settings surface a theme overrides wins.
	['ui', 'primary', 'ui', 'background', 4.5],
	['ui', 'primary', 'ui', 'card', 4.5],
	['ui', 'primary', 'ui', 'popover', 4.5],
	['ui', 'destructive', 'ui', 'editorBg', 4.5],
	['ui', 'destructive', 'ui', 'background', 4.5],
	['ui', 'destructive', 'ui', 'card', 4.5],
	['ui', 'destructive', 'ui', 'popover', 4.5],
	['ui', 'destructive', 'ui', 'statusBarBg', 4.5],
	['ui', 'rightSidebarPrimary', 'ui', 'rightSidebarBg', 4.5],
	['ui', 'rightSidebarPrimary', 'ui', 'rightSidebarAccent', 4.5, 'rightSidebarBg'],
	// Primary and destructive are also drawn as text in Settings. These come
	// before the label-on-fill pairs, so each label is measured on the lifted fill.
	['ui', 'primary', 'ui', 'settingsDialogBg', 4.5],
	['ui', 'primary', 'ui', 'settingsHoverBg', 4.5],
	['ui', 'primary', 'ui', 'settingItemBg', 4.5],
	['ui', 'destructive', 'ui', 'settingsDialogBg', 4.5],
	['ui', 'destructive', 'ui', 'settingItemBg', 4.5],
	['ui', 'primaryForeground', 'ui', 'primary', 4.5],
	['ui', 'destructiveForeground', 'ui', 'destructive', 4.5],
	...TYPE_PALETTE_TOKENS.map((k): ReadabilityPair => ['ui', k, 'ui', 'fileExplorerBg', 3]),
	['ui', 'warning', 'ui', 'fileExplorerBg', 4.5],
	['ui', 'warning', 'ui', 'fileExplorerAccent', 4.5, 'fileExplorerBg'],
	['ui', 'warning', 'ui', 'muted', 4.5, 'background'],
	['ui', 'success', 'ui', 'fileExplorerBg', 4.5],
	['ui', 'success', 'ui', 'editorBg', 4.5],
	['ui', 'success', 'ui', 'muted', 4.5, 'background'],
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
	// Control edges and indicators (WCAG 1.4.11). `border` stays a quiet divider and is not paired.
	['ui', 'input', 'ui', 'inputBg', 3],
	['ui', 'input', 'ui', 'settingItemBg', 3],
	['ui', 'input', 'ui', 'popover', 3],
	// Search and task fields draw their edge on the sidebar and editor surfaces.
	['ui', 'input', 'ui', 'fileExplorerBg', 3],
	['ui', 'input', 'ui', 'editorBg', 3],
	['ui', 'switchUncheckedBg', 'ui', 'settingItemBg', 3],
	['ui', 'ring', 'ui', 'background', 3],
	['ui', 'ring', 'ui', 'popover', 3],
	['ui', 'ring', 'ui', 'editorBg', 3],
	['ui', 'ring', 'ui', 'settingsSidebarBg', 3],
	['preview', 'taskBorder', 'ui', 'editorBg', 3],
	['preview', 'hrBorder', 'ui', 'editorBg', 3],
	['preview', 'blockquoteBorder', 'ui', 'editorBg', 3],
];

/** A copy of every token group, typed so each group reads as a plain token map. */
function copyGroups(colors: ThemeColors) {
	return {
		ui: { ...colors.ui }, syntax: { ...colors.syntax }, preview: { ...colors.preview },
		wikilink: { ...colors.wikilink }, callout: { ...colors.callout },
	};
}

/**
 * `surface` flattened over the `base` surface of `ui` (itself flattened over
 * `editorBg`): the opaque color a translucent background is seen as.
 */
function flattenedSurface(surface: string, ui: Record<string, string>, base: keyof UIColors = 'editorBg'): string {
	const under = ui[base] ?? ui.editorBg;
	return flatten(surface, flatten(under, ui.editorBg) ?? under) ?? surface;
}

/**
 * Moves each failing foreground of `READABILITY_PAIRS` to its minimum contrast
 * (WCAG, and APCA for text) and returns the result as a copy; backgrounds are
 * never changed, except primary, which is moved away from its label until the
 * label also reads on the 90% hover fill. A no-op on a theme that already passes.
 */
export function withReadableContrast(colors: ThemeColors): ThemeColors {
	const out = copyGroups(colors);
	for (const [group, key, bgGroup, bgKey, min, base] of READABILITY_PAIRS) {
		const tokens: Record<string, string> = out[group];
		const bgTokens: Record<string, string> = out[bgGroup];
		// A theme saved before a token existed lacks it until `mergeThemeWithDefaults` fills it in
		if (tokens[key] === undefined || bgTokens[bgKey] === undefined) continue;
		const bg = flattenedSurface(bgTokens[bgKey], out.ui, base);
		const before = tokens[key];
		tokens[key] = ensureContrast(before, bg, min, minLcOf(min));
		const tint = `${key}Decoration`;
		if (tokens[key] !== before && tokens[tint]?.toLowerCase() === `${before}45`.toLowerCase()) {
			tokens[tint] = `${tokens[key]}45`;
		}
	}
	if (out.ui.primary !== undefined && out.ui.primaryForeground !== undefined) {
		out.ui.primary = fillUnderLabel(out.ui.primaryForeground, out.ui.primary, buttonSurfaces(out.ui));
	}
	return out;
}

/**
 * The surfaces a primary button sits on, flattened: its `hover:bg-primary/90`
 * fill is the 90% tint of primary over each. A pair cannot express a tint, so
 * `withReadableContrast` and `readabilityFailures` check the hover fill apart.
 */
function buttonSurfaces(ui: Record<string, string>): string[] {
	return ['editorBg', 'background', 'card', 'popover', 'settingsDialogBg', 'settingItemBg']
		.filter((k) => ui[k] !== undefined)
		.map((k) => flattenedSurface(ui[k], ui));
}

/** A `READABILITY_PAIRS` pair that a theme's own foreground fails. */
export interface ReadabilityFailure {
	/** Group of the surface token the foreground is read on */
	bgGroup: keyof ThemeColors;
	/** Surface token the foreground is read on */
	bgKey: string;
	/** Measured WCAG contrast; below `min` unless only the APCA gate fails */
	ratio: number;
	/** Minimum WCAG contrast of the pair */
	min: number;
	/** Measured APCA |Lc| */
	lc: number;
	/** Minimum APCA |Lc| of the pair, 0 for large text and non-text */
	minLc: number;
}

/** Share of its minimum a failure reaches on its weaker gate (below 1). */
function failureShare({ ratio, min, lc, minLc }: ReadabilityFailure): number {
	return Math.min(ratio / min, minLc > 0 ? lc / minLc : Infinity);
}

/**
 * The pairs a theme's own colors fail, keyed by foreground token
 * (`ui.mutedForeground`); a token failing several surfaces keeps its worst one
 * (lowest share of the minimum of its weaker gate). Each typed foreground is
 * measured on its surface as `withReadableContrast` leaves it, so a label whose
 * fill the app lifts is reported too, and a pair counts only when the lift
 * would move the typed color: the reported tokens are the ones the app changes.
 * A pair with a missing or unparseable color is skipped.
 */
export function readabilityFailures(colors: ThemeColors): Map<string, ReadabilityFailure> {
	const out = new Map<string, ReadabilityFailure>();
	const typedGroups = copyGroups(colors);
	const lifted = copyGroups(withReadableContrast(colors));
	const record = (id: string, failure: ReadabilityFailure) => {
		const worst = out.get(id);
		if (!worst || failureShare(failure) < failureShare(worst)) out.set(id, failure);
	};
	for (const [group, key, bgGroup, bgKey, min, base] of READABILITY_PAIRS) {
		const typed: Record<string, string> = typedGroups[group];
		const bgTokens: Record<string, string> = lifted[bgGroup];
		const fg = typed[key];
		const surface = bgTokens[bgKey];
		if (fg === undefined || surface === undefined) continue;
		const bg = flattenedSurface(surface, lifted.ui, base);
		const minLc = minLcOf(min);
		const ratio = contrastRatio(fg, bg);
		const lc = apcaContrast(fg, bg);
		if (ratio === null || lc === null || ensureContrast(fg, bg, min, minLc) === fg) continue;
		record(`${group}.${key}`, { bgGroup, bgKey, ratio, min, lc: Math.abs(lc), minLc });
	}
	// A primary the app moves only for its label on the hover fill: primary is the token
	// reported, on its typed fill. A primary failing a pair already names that change.
	const primary = colors.ui.primary;
	const label = lifted.ui.primaryForeground;
	const hoverOnly = !out.has('ui.primary') && lifted.ui.primary !== primary;
	if (hoverOnly && primary !== undefined && label !== undefined && apcaContrast(label, primary) !== null) {
		for (const bg of buttonSurfaces(lifted.ui).map((s) => tint(primary, 0.9, s) ?? primary)) {
			if (readsAsLabel(label, bg)) continue;
			const ratio = contrastRatio(label, bg) ?? 0;
			record('ui.primary', { bgGroup: 'ui', bgKey: 'primaryForeground', ratio, min: 4.5, lc: lcOf(label, bg), minLc: TEXT_LC });
		}
	}
	return out;
}

/**
 * Black or white for a label on `fill`, and the fill moved away from the label in
 * 1% OKLab lightness steps until the label reads at 4.5:1 and |Lc| `TEXT_LC` on
 * it and on its 90% tint over each of `surfaces` (Button's `hover:bg-primary/90`).
 * The label is the one that passes both gates on the fill as given; APCA picks
 * when both or neither do, as `labelColors` does. Null for an unparseable fill.
 */
function labelOnFill(fill: string, surfaces: string[]): { fill: string; label: string } | null {
	if (apcaContrast('#000000', fill) === null) return null;
	const [white, black] = [readsAsLabel('#ffffff', fill), readsAsLabel('#000000', fill)];
	const label = white !== black ? (white ? '#ffffff' : '#000000') : lcOf('#ffffff', fill) > lcOf('#000000', fill) ? '#ffffff' : '#000000';
	return { fill: fillUnderLabel(label, fill, surfaces), label };
}

/** APCA |Lc| of `label` on `bg`, 0 when either is unparseable. */
function lcOf(label: string, bg: string): number {
	return Math.abs(apcaContrast(label, bg) ?? 0);
}

/** Whether `label` reads on `bg` at 4.5:1 and |Lc| `TEXT_LC`. */
function readsAsLabel(label: string, bg: string): boolean {
	return (contrastRatio(label, bg) ?? 0) >= 4.5 && lcOf(label, bg) >= TEXT_LC;
}

/**
 * `fill` moved away from `label` in 1% OKLab lightness steps until the label
 * reads on it and on its 90% tint over each of `surfaces`, at most 100 steps.
 * Returned as is when it already passes or a color is unparseable.
 */
function fillUnderLabel(label: string, fill: string, surfaces: string[]): string {
	const lc = apcaContrast(label, fill);
	if (lc === null) return fill;
	// APCA is positive for a label darker than its fill: lighten the fill then
	const delta = lc > 0 ? 0.01 : -0.01;
	let out = fill;
	for (let step = 0; step < 100; step++) {
		const fills = [out, ...surfaces.map((s) => tint(out, 0.9, s) ?? out)];
		if (fills.every((f) => readsAsLabel(label, f))) break;
		out = shiftLightness(out, delta) ?? out;
	}
	return out;
}

/**
 * Lifts the core colors that are read as text or accents to their minimum
 * contrast (WCAG, and APCA |Lc| `TEXT_LC` for text) on every surface they appear
 * on, before derivation, so every token derived from one source (link, hover,
 * underline tint) stays the same color. `ui` holds the theme's UI overrides: a
 * Settings surface or row fill it overrides is the one the text is read on.
 */
function readableCore(p: CorePalette, ui: Partial<UIColors> = {}): CorePalette {
	const surfaces = [p.editorBg, p.sidebarBg, p.panelBg, p.popoverBg];
	const lift = (color: string, min: number, on: string[] = [p.editorBg]) => ensureContrastOn(color, on, min, minLcOf(min));
	const over = (bg: string, base: string) => flatten(bg, flatten(base, p.editorBg) ?? base) ?? bg;
	// The Settings surfaces as `buildTheme` derives them; the hover fill may be translucent.
	const [dialog, hover, item, settingsSidebar] = [
		ui.settingsDialogBg ?? p.panelBg, ui.settingsHoverBg ?? p.hover,
		ui.settingItemBg ?? p.sidebarBg, ui.settingsSidebarBg ?? p.sidebarBg,
	].map((bg) => over(bg, p.editorBg));
	// Hover (`muted`) and selected (`accent`) rows over the surface each sits on.
	const rows = [
		over(ui.muted ?? p.hover, p.sidebarBg), over(ui.accent ?? p.selected, p.popoverBg),
		over(ui.fileExplorerAccent ?? p.selected, p.sidebarBg), over(ui.rightSidebarAccent ?? p.selected, p.sidebarBg),
	];
	const text = [...surfaces, dialog, hover, item, ...rows];
	// Primary is also the focus ring and the selected-state cue on every surface (3:1, non-text).
	const lifted = lift(lift(p.primary, 4.5, text), 3, surfaces);
	const button = labelOnFill(lifted, [...surfaces, dialog, item]);
	const primary = button?.fill ?? lifted;
	// Destructive is small text too (errors, status), besides the fill of destructive buttons.
	const error = lift(p.error, 4.5, [...surfaces, dialog, item, rows[0]]);
	return {
		...p,
		fg: lift(lift(p.fg, 7), 4.5, [...text, settingsSidebar]),
		heading: lift(p.heading, 3),
		mutedFg: lift(p.mutedFg, 4.5, text),
		primary,
		primaryFg: button?.label ?? ensureContrast(p.primaryFg, primary, 4.5, TEXT_LC),
		secondary: lift(p.secondary, 4.5),
		codeFg: lift(p.codeFg, 4.5, [flatten(p.codeBg, p.editorBg) ?? p.editorBg]),
		error,
		errorFg: ensureContrast(p.errorFg, error, 4.5, TEXT_LC),
		inlineFg: p.inlineFg && lift(p.inlineFg, 4.5),
		linkFg: p.linkFg && lift(p.linkFg, 4.5),
		meta: p.meta && lift(p.meta, 3),
		blockquoteAccent: p.blockquoteAccent && lift(p.blockquoteAccent, 3),
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
	const p = readableCore(core, overrides.ui);
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
