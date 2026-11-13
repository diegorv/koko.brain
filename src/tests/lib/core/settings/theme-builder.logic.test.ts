import { describe, it, expect } from 'vitest';
import { buildTheme, alpha, coreFromColors, READABILITY_PAIRS, TYPE_PALETTE_TOKENS, type CorePalette } from '#lib/core/settings/theme-builder.logic.js';
import { contrastRatio, flatten, mixColors } from '#lib/utils/color.js';
import { BUILTIN_THEMES, mergeThemeWithDefaults } from '#lib/core/settings/theme.logic.js';
import { KOKOBRAIN_DEFAULT_THEME } from '#lib/core/settings/theme.logic.js';
import type { SyntaxColors } from '#lib/core/settings/theme.types.js';

const HEADING_TOKENS = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6'] as const;

/** The six heading colors of a theme's syntax group, H1 first. */
function headings(syntax: SyntaxColors): string[] {
	return HEADING_TOKENS.map((k) => syntax[k].toLowerCase());
}

const CORE: CorePalette = {
	editorBg: '#ffffff', sidebarBg: '#f5f5f5', panelBg: '#fafafa', popoverBg: '#ffffff',
	fg: '#222222', heading: '#111111', mutedFg: '#666666', faintFg: '#999999',
	border: '#dddddd', borderStrong: '#cccccc', hover: '#eeeeee', selected: '#e0e8f0',
	primary: '#1155cc', primaryFg: '#ffffff', secondary: '#884400',
	selection: '#1155cc33', highlight: '#ffee0080', codeFg: '#aa3333', codeBg: '#f0f0f0',
	error: '#cc2222', errorFg: '#ffffff',
	blue: '#1155cc', green: '#228833', purple: '#7744aa', yellow: '#aa8800',
};

describe('alpha', () => {
	it('appends a hex alpha to a 6-digit color', () => {
		expect(alpha('#1155cc', '45')).toBe('#1155cc45');
	});

	it('uses color-mix for colors that are not 6-digit hex', () => {
		expect(alpha('oklch(0.7 0.1 270)', '80')).toBe('color-mix(in srgb, oklch(0.7 0.1 270) 50%, transparent)');
		expect(alpha('#abc', 'ff')).toBe('color-mix(in srgb, #abc 100%, transparent)');
	});

	it('folds the alpha into an existing color-mix instead of nesting it', () => {
		expect(alpha('color-mix(in srgb, #ffffff 50%, transparent)', '4d')).toBe('color-mix(in srgb, #ffffff 15%, transparent)');
		expect(alpha('color-mix(in srgb, oklch(0.7 0.1 270) 80%, transparent)', '80')).toBe('color-mix(in srgb, oklch(0.7 0.1 270) 40%, transparent)');
	});
});

describe('buildTheme', () => {
	it('produces every token of the default theme', () => {
		const colors = buildTheme('T', CORE).colors;
		const defaults = KOKOBRAIN_DEFAULT_THEME.colors;
		for (const group of Object.keys(defaults) as (keyof typeof defaults)[]) {
			expect(Object.keys(colors[group]).sort(), group).toEqual(Object.keys(defaults[group]).sort());
		}
	});

	it('derives tokens from the core palette', () => {
		const { ui, syntax, preview, wikilink, callout } = buildTheme('T', CORE).colors;
		expect(ui.editorBg).toBe('#ffffff');
		expect(ui.background).toBe('#f5f5f5');
		expect(ui.destructiveForeground).toBe('#ffffff');
		expect(syntax.heading1).toBe('#111111');
		expect(syntax.activeLine).toBe('#eeeeee4d');
		expect(preview.linkDecoration).toBe('#1155cc45');
		expect(wikilink.heading).toBe('#884400');
		expect(callout.caution).toBe('#cc2222');
	});

	it('derives the type palette and warning from the core hues', () => {
		const { ui, callout } = buildTheme('T', CORE).colors;
		expect(ui.typeRed).toBe(CORE.error);
		expect(ui.typeGreen).toBe(CORE.green);
		expect(ui.typeBlue).toBe(CORE.blue);
		expect(ui.typePurple).toBe(CORE.purple);
		expect(ui.typeYellow).toBe(callout.warning);
		expect(ui.typeGray).toBe(ui.mutedForeground);
		expect(ui.typeOrange).toBe(mixColors(CORE.error, CORE.yellow));
		expect(ui.typeTeal).toBe(mixColors(CORE.green, CORE.blue));
		expect(ui.typePink).toBe(mixColors(CORE.error, CORE.purple));
		expect(contrastRatio(ui.warning, ui.fileExplorerBg)!).toBeGreaterThanOrEqual(4.5);
	});

	it('falls back to the first hue when a palette mix cannot be computed', () => {
		const { ui } = buildTheme('T', { ...CORE, yellow: 'hsl(45 90% 50%)' }).colors;
		expect(ui.typeOrange).toBe(CORE.error);
	});

	it('falls back for optional core fields', () => {
		const { syntax, preview, wikilink } = buildTheme('T', CORE).colors;
		expect(syntax.strong).toBe(CORE.fg);
		expect(syntax.link).toBe(CORE.primary);
		expect(syntax.meta).toBe(CORE.mutedFg);
		expect(wikilink.bracket).toBe(CORE.mutedFg);
		expect(wikilink.display).toBe(CORE.primary);
		expect(preview.blockquoteBorder).toBe(CORE.primary);
		expect(preview.blockquoteBg2).toBe('#1155cc17');
	});

	it('uses optional core fields when given', () => {
		const { syntax, preview, wikilink } = buildTheme('T', {
			...CORE, inlineFg: '#333333', linkFg: '#0000ff', meta: '#777777', blockquoteAccent: '#008800',
		}).colors;
		expect(syntax.emphasis).toBe('#333333');
		expect(syntax.link).toBe('#0000ff');
		expect(wikilink.display).toBe('#0000ff');
		expect(syntax.meta).toBe('#777777');
		expect(wikilink.bracket).toBe('#777777');
		expect(preview.blockquoteBorder).toBe('#008800');
		expect(preview.blockquoteBg).toBe('#00880012');
	});

	it('applies overrides last, leaving the other tokens derived', () => {
		const { ui, syntax } = buildTheme('T', CORE, { ui: { tabBar: '#123456' }, syntax: { heading1: '#ff0000' } }).colors;
		expect(ui.tabBar).toBe('#123456');
		expect(ui.statusBarBg).toBe('#f5f5f5');
		expect(syntax.heading1).toBe('#ff0000');
		expect(syntax.heading2).toBe(buildTheme('T', CORE).colors.syntax.heading2);
	});

	it('gives each heading level its own color, from the heading color at H1 to the muted text color at H6', () => {
		const { ui, syntax } = buildTheme('T', CORE).colors;
		const levels = headings(syntax);
		expect(new Set(levels).size).toBe(6);
		expect(levels[0]).toBe(CORE.heading);
		expect(levels[5]).toBe(ui.mutedForeground.toLowerCase());
		for (const [i, k] of HEADING_TOKENS.entries()) {
			expect(syntax[k], k).toBe(i === 0 ? CORE.heading : mixColors(CORE.heading, CORE.mutedFg, i / 5));
		}
	});

	it('keeps every heading level apart from bold and body text', () => {
		const { ui, syntax } = buildTheme('T', CORE).colors;
		for (const color of headings(syntax)) {
			expect(color).not.toBe(syntax.strong.toLowerCase());
			expect(color).not.toBe(ui.editorFg.toLowerCase());
		}
	});

	it('keeps the name', () => {
		expect(buildTheme('My Theme', CORE).name).toBe('My Theme');
	});
});

describe('coreFromColors', () => {
	it('reads back the core palette a built theme came from', () => {
		const full: CorePalette = { ...CORE, inlineFg: '#333333', linkFg: '#0000ff', meta: '#777777', blockquoteAccent: '#008800' };
		expect(coreFromColors(buildTheme('T', full).colors)).toEqual(full);
	});
});

describe('heading and bold colors of every theme', () => {
	it('gives the six heading levels six colors in every built-in theme', () => {
		for (const theme of BUILTIN_THEMES) {
			expect(new Set(headings(theme.colors.syntax)).size, theme.name).toBe(6);
		}
	});

	it('colors H2 to H5 of every built-in theme from one ramp between its H1 and its muted text color', () => {
		for (const theme of BUILTIN_THEMES) {
			const { ui, syntax } = theme.colors;
			for (const [i, k] of HEADING_TOKENS.entries()) {
				if (i === 0 || i === 5) continue;
				expect(syntax[k], `${theme.name} ${k}`).toBe(mixColors(syntax.heading1, ui.mutedForeground, i / 5));
			}
		}
	});

	it('draws bold text in its own color, apart from body text and every heading, in every built-in theme', () => {
		for (const theme of BUILTIN_THEMES) {
			const { ui, syntax } = theme.colors;
			const strong = syntax.strong.toLowerCase();
			expect(strong, theme.name).not.toBe(ui.editorFg.toLowerCase());
			expect(headings(syntax), theme.name).not.toContain(strong);
		}
	});

	it('derives six heading colors for a saved theme that has only H1', () => {
		const merged = mergeThemeWithDefaults({ syntax: { heading1: '#cc3366' } as SyntaxColors });
		expect(merged.syntax.heading1).toBe('#cc3366');
		expect(new Set(headings(merged.syntax)).size).toBe(6);
	});
});

describe('readable contrast', () => {
	it('raises failing text and accent colors to their minimum contrast', () => {
		const colors = buildTheme('T', { ...CORE, primary: '#e5b41f', mutedFg: '#cccccc', heading: '#dddddd' }).colors;
		expect(contrastRatio(colors.preview.link, colors.ui.editorBg)!).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(colors.ui.mutedForeground, colors.ui.editorBg)!).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(colors.syntax.heading1, colors.ui.editorBg)!).toBeGreaterThanOrEqual(3);
	});

	it('leaves colors that already pass untouched', () => {
		const colors = buildTheme('T', CORE).colors;
		expect(colors.ui.foreground).toBe(CORE.fg);
		expect(colors.ui.primary).toBe(CORE.primary);
	});

	it('lifts the shared source, so tokens derived from it stay consistent', () => {
		const { ui, preview, wikilink } = buildTheme('T', { ...CORE, primary: '#1cb27e' }).colors;
		expect(contrastRatio(preview.wikilink, ui.editorBg)!).toBeGreaterThanOrEqual(4.5);
		expect(ui.primary).toBe(preview.wikilink);
		expect(preview.taskHover).toBe(preview.taskChecked);
		expect(wikilink.targetDecoration).toBe(`${wikilink.target}45`);
		expect(preview.linkDecoration).toBe(`${preview.link}45`);
	});

	it('moves an override\'s underline tint with its lifted link color', () => {
		const { preview, wikilink } = buildTheme('T', CORE, {
			preview: { wikilink: '#c0a0e0', wikilinkDecoration: '#c0a0e045' },
			wikilink: { target: '#c0a0e0', targetDecoration: '#c0a0e045' },
		}).colors;
		expect(preview.wikilink).not.toBe('#c0a0e0');
		expect(preview.wikilinkDecoration).toBe(`${preview.wikilink}45`);
		expect(wikilink.targetDecoration).toBe(`${wikilink.target}45`);
	});

	it('checks inline code against the code background it is drawn on', () => {
		const { syntax, preview } = buildTheme('T', { ...CORE, codeFg: '#aa7777', codeBg: '#e8dddd' }).colors;
		expect(contrastRatio(syntax.code, preview.codeBg)!).toBeGreaterThanOrEqual(4.5);
	});

	it('checks the type palette at 3:1 and warning at 4.5:1 against the sidebar background, and warning at 3:1 on the selected row', () => {
		const pairs = READABILITY_PAIRS.filter(([g, k]) => g === 'ui' && ((TYPE_PALETTE_TOKENS as readonly string[]).includes(k) || k === 'warning'));
		expect(pairs.map(([, k, bg, bgKey, min]) => `${k}@${bg}.${bgKey}:${min}`).sort()).toEqual(
			[...TYPE_PALETTE_TOKENS.map((k) => `${k}@ui.fileExplorerBg:3`), 'warning@ui.fileExplorerBg:4.5', 'warning@ui.fileExplorerAccent:3'].sort(),
		);
		const { ui } = buildTheme('T', { ...CORE, sidebarBg: '#ffffff', yellow: '#ffee88', green: '#bbffbb' }).colors;
		expect(contrastRatio(ui.typeYellow, ui.fileExplorerBg)!).toBeGreaterThanOrEqual(3);
		expect(contrastRatio(ui.typeGreen, ui.fileExplorerBg)!).toBeGreaterThanOrEqual(3);
		expect(contrastRatio(ui.warning, ui.fileExplorerBg)!).toBeGreaterThanOrEqual(4.5);
		const row = buildTheme('T', { ...CORE, sidebarBg: '#f5f5f5', selected: '#c8c8c8', yellow: '#e5b41f' }).colors.ui;
		expect(contrastRatio(row.warning, row.fileExplorerAccent)!).toBeGreaterThanOrEqual(3);
	});

	it('derives success from the core green and checks it at 4.5:1 on the sidebar and editor backgrounds', () => {
		const pairs = READABILITY_PAIRS.filter(([g, k]) => g === 'ui' && k === 'success');
		expect(pairs.map(([, k, bg, bgKey, min]) => `${k}@${bg}.${bgKey}:${min}`).sort()).toEqual(
			['success@ui.editorBg:4.5', 'success@ui.fileExplorerBg:4.5'],
		);
		expect(buildTheme('T', { ...CORE, green: '#116622' }).colors.ui.success).toBe('#116622');
		const { ui } = buildTheme('T', { ...CORE, sidebarBg: '#ffffff', green: '#bbffbb' }).colors;
		expect(contrastRatio(ui.success, ui.fileExplorerBg)!).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(ui.success, ui.editorBg)!).toBeGreaterThanOrEqual(4.5);
	});

	it('holds for every pair in every built-in theme', () => {
		const failures: string[] = [];
		const skipped: string[] = [];
		for (const theme of BUILTIN_THEMES) {
			for (const [group, key, bgGroup, bgKey, min] of READABILITY_PAIRS) {
				const tokens: Record<string, string> = { ...theme.colors[group] };
				const bgTokens: Record<string, string> = { ...theme.colors[bgGroup] };
				const bg = flatten(bgTokens[bgKey], theme.colors.ui.editorBg) ?? bgTokens[bgKey];
				const ratio = contrastRatio(tokens[key], bg);
				if (ratio === null) skipped.push(`${theme.name} ${group}.${key}`);
				else if (ratio < min - 0.005) failures.push(`${theme.name} ${group}.${key} ${ratio.toFixed(2)} < ${min}`);
			}
		}
		expect(failures).toEqual([]);
		expect(skipped).toEqual([]);
	});

	it('lifts the default theme\'s oklch muted sidebar and status bar text to hex at 4.5:1', () => {
		const { ui } = KOKOBRAIN_DEFAULT_THEME.colors;
		const pairs = [
			[ui.fileExplorerMutedFg, ui.fileExplorerBg],
			[ui.rightSidebarMutedFg, ui.rightSidebarBg],
			[ui.statusBarFg, ui.statusBarBg],
		];
		for (const [fg, bg] of pairs) {
			expect(fg).toMatch(/^#[0-9a-f]{6}$/);
			expect(contrastRatio(fg, bg)!).toBeGreaterThanOrEqual(4.5);
		}
	});
});
