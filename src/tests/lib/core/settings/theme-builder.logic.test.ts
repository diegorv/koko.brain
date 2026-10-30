import { describe, it, expect } from 'vitest';
import { buildTheme, alpha, coreFromColors, READABILITY_PAIRS, type CorePalette } from '#lib/core/settings/theme-builder.logic.js';
import { contrastRatio, flatten } from '#lib/utils/color.js';
import { BUILTIN_THEMES } from '#lib/core/settings/theme.logic.js';
import { KOKOBRAIN_DEFAULT_THEME } from '#lib/core/settings/theme.logic.js';

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
		expect(syntax.heading3).toBe('#111111');
		expect(syntax.activeLine).toBe('#eeeeee4d');
		expect(preview.linkDecoration).toBe('#1155cc45');
		expect(wikilink.heading).toBe('#884400');
		expect(callout.caution).toBe('#cc2222');
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
		expect(syntax.heading2).toBe('#111111');
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
		// oklch values the contrast math cannot read; anything new here needs a hex value or a check
		expect(skipped).toEqual([
			'KokoBrain Default ui.fileExplorerMutedFg',
			'KokoBrain Default ui.rightSidebarMutedFg',
			'KokoBrain Default ui.statusBarFg',
		]);
	});
});
