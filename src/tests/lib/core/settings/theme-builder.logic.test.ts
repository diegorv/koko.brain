import { describe, it, expect } from 'vitest';
import { buildTheme, alpha, coreFromColors, type CorePalette } from '#lib/core/settings/theme-builder.logic.js';
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
