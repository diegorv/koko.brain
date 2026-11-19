import { describe, it, expect } from 'vitest';
import { buildTheme, alpha, coreFromColors, READABILITY_PAIRS, TYPE_PALETTE_TOKENS, readabilityFailures, withReadableContrast, type CorePalette } from '#lib/core/settings/theme-builder.logic.js';
import { colorDistance, contrastRatio, flatten, mixColors } from '#lib/utils/color.js';
import { BUILTIN_THEMES, mergeThemeWithDefaults } from '#lib/core/settings/theme.logic.js';
import { KOKOBRAIN_DEFAULT_THEME, LAVENDER_HAZE_THEME } from '#lib/core/settings/theme.logic.js';
import type { SyntaxColors, ThemeColors } from '#lib/core/settings/theme.types.js';
import { HARD_PALETTE_THEMES } from '../../../fixtures/hard-palette-themes.fixture';

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
		const { ui } = buildTheme('T', { ...CORE, yellow: 'var(--yellow)' }).colors;
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
		// Edges dark enough that the builder does not lift them (3:1 on the panel, sidebar and editor)
		const full: CorePalette = {
			...CORE, borderStrong: '#888888', faintFg: '#8c8c8c',
			inlineFg: '#333333', linkFg: '#0000ff', meta: '#777777', blockquoteAccent: '#008800',
		};
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

	it('keeps bold and italic off the link and wikilink hues in every built-in theme, so emphasis does not look clickable', () => {
		for (const theme of BUILTIN_THEMES) {
			const { syntax, wikilink } = theme.colors;
			expect(colorDistance(syntax.strong, syntax.link)!, `${theme.name} strong vs link`).toBeGreaterThanOrEqual(12);
			expect(colorDistance(syntax.emphasis, syntax.link)!, `${theme.name} emphasis vs link`).toBeGreaterThanOrEqual(12);
			expect(colorDistance(syntax.strong, wikilink.target)!, `${theme.name} strong vs wikilink`).toBeGreaterThanOrEqual(12);
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

	it('lifts a full token set as a copy, and skips a pair whose token a theme saved before it existed lacks', () => {
		const colors = buildTheme('T', CORE).colors;
		const failing: ThemeColors = { ...colors, ui: { ...colors.ui, mutedForeground: '#dddddd' } };
		const { success: _success, ...uiWithoutSuccess } = failing.ui;
		const old = { ...failing, ui: uiWithoutSuccess } as unknown as ThemeColors;
		const lifted = withReadableContrast(old);
		expect(contrastRatio(lifted.ui.mutedForeground, lifted.ui.editorBg)!).toBeGreaterThanOrEqual(4.5);
		expect(lifted.ui.success).toBeUndefined();
		expect(old.ui.mutedForeground).toBe('#dddddd');
		expect(withReadableContrast(colors)).toEqual(colors);
	});

	it('pairs Settings text, muted text, primary and destructive with the Settings surfaces at 4.5:1', () => {
		const text = ['settingsText', 'mutedForeground', 'primary', 'destructive'];
		const pairs = READABILITY_PAIRS.filter(([g, k, bg, bgKey]) => g === 'ui' && text.includes(k) && bg === 'ui' && bgKey.startsWith('setting'));
		expect(pairs.map(([, k, , bgKey, min]) => `${k}@${bgKey}:${min}`).sort()).toEqual([
			'destructive@settingItemBg:4.5', 'destructive@settingsDialogBg:4.5',
			'mutedForeground@settingItemBg:4.5', 'mutedForeground@settingsDialogBg:4.5', 'mutedForeground@settingsHoverBg:4.5',
			'primary@settingItemBg:4.5', 'primary@settingsDialogBg:4.5', 'primary@settingsHoverBg:4.5',
			'settingsText@settingItemBg:4.5', 'settingsText@settingsDialogBg:4.5', 'settingsText@settingsHoverBg:4.5', 'settingsText@settingsSidebarBg:4.5',
		]);
		const { ui } = buildTheme('T', { ...CORE, hover: '#c8c8c8', error: '#ff6666' }).colors;
		expect(contrastRatio(ui.mutedForeground, ui.settingsHoverBg)!).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(ui.destructive, ui.settingsDialogBg)!).toBeGreaterThanOrEqual(4.5);
		const dark = buildTheme('T', CORE, { ui: { settingsDialogBg: '#2a2a2a', settingsHoverBg: '#2a2a2a', settingItemBg: '#2a2a2a' } }).colors.ui;
		expect(contrastRatio(dark.primary, '#2a2a2a')!).toBeGreaterThanOrEqual(4.5);
		// The fill is lifted before its label is measured on it
		expect(contrastRatio(ui.destructiveForeground, ui.destructive)!).toBeGreaterThanOrEqual(4.5);
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

describe('readabilityFailures', () => {
	it('reports nothing for a theme that passes every pair', () => {
		for (const theme of BUILTIN_THEMES) expect(readabilityFailures(theme.colors).size, theme.name).toBe(0);
	});

	it('reports each failing token once, at its worst pair, with the measured ratio and the minimum', () => {
		const colors = buildTheme('T', CORE).colors;
		const ui = { ...colors.ui, mutedForeground: '#bbbbbb', settingsHoverBg: '#dddddd' };
		const failures = readabilityFailures({ ...colors, ui });
		expect([...failures.keys()]).toEqual(['ui.mutedForeground']);
		expect(failures.get('ui.mutedForeground')).toEqual({
			bgGroup: 'ui', bgKey: 'settingsHoverBg', ratio: contrastRatio('#bbbbbb', '#dddddd'), min: 4.5,
		});
	});

	it('measures the colors as given, not lifted, and leaves them untouched', () => {
		const colors = buildTheme('T', CORE).colors;
		const failing = { ...colors, syntax: { ...colors.syntax, link: '#eeeeee' } };
		const failure = readabilityFailures(failing).get('syntax.link')!;
		expect(failure.ratio).toBe(contrastRatio('#eeeeee', colors.ui.editorBg));
		expect(failing.syntax.link).toBe('#eeeeee');
	});

	it('warns on a label that passes on the typed fill but the app changes on the lifted fill', () => {
		const colors = LAVENDER_HAZE_THEME.colors;
		const ui = { ...colors.ui, primary: '#b09ad8', primaryForeground: '#000000' };
		const typed = { ...colors, ui };
		expect(contrastRatio('#000000', '#b09ad8')!).toBeGreaterThanOrEqual(4.5);
		const lifted = withReadableContrast(typed);
		expect(lifted.ui.primaryForeground).not.toBe('#000000');
		const failure = readabilityFailures(typed).get('ui.primaryForeground')!;
		expect(failure).toEqual({
			bgGroup: 'ui', bgKey: 'primary', ratio: contrastRatio('#000000', lifted.ui.primary), min: 4.5,
		});
		expect(typed.ui.primary).toBe('#b09ad8');
	});

	it('reports exactly the tokens the lift changes', () => {
		const colors = LAVENDER_HAZE_THEME.colors;
		const typed = { ...colors, ui: { ...colors.ui, primary: '#b09ad8', primaryForeground: '#000000', mutedForeground: '#d0d0d0' } };
		const lifted = withReadableContrast(typed);
		const changed = (Object.keys(typed) as (keyof ThemeColors)[]).flatMap((g) =>
			Object.entries(typed[g]).filter(([k, v]) => (lifted[g] as unknown as Record<string, string>)[k] !== v && !k.endsWith('Decoration')).map(([k]) => `${g}.${k}`),
		);
		expect([...readabilityFailures(typed).keys()].sort()).toEqual(changed.sort());
	});

	it('warns on primary that fails on the Settings dialog and lifts it there', () => {
		const colors = buildTheme('T', CORE).colors;
		const ui = { ...colors.ui, settingsDialogBg: '#2a2a2a', settingsHoverBg: '#2a2a2a', settingItemBg: '#2a2a2a' };
		const typed = { ...colors, ui };
		expect(readabilityFailures(typed).get('ui.primary')?.bgKey).toBe('settingsDialogBg');
		expect(contrastRatio(withReadableContrast(typed).ui.primary, '#2a2a2a')!).toBeGreaterThanOrEqual(4.5);
	});

	it('skips a pair whose colors it cannot parse or that a theme lacks', () => {
		const colors = buildTheme('T', CORE).colors;
		// An unparseable muted text, and a theme saved before `success` existed
		const { success: _success, ...ui } = { ...colors.ui, mutedForeground: 'var(--x)' };
		expect(readabilityFailures({ ...colors, ui: ui as ThemeColors['ui'] }).size).toBe(0);
	});
});

describe('non-text boundaries of every built-in and hard-palette theme', () => {
	/** [group, token, surface group, surface token]: a control edge or indicator and the surface it sits on, at 3:1 */
	const BOUNDARIES: [keyof ThemeColors, string, keyof ThemeColors, string][] = [
		['ui', 'input', 'ui', 'inputBg'],
		['ui', 'input', 'ui', 'settingItemBg'],
		['ui', 'input', 'ui', 'popover'],
		['ui', 'input', 'ui', 'fileExplorerBg'],
		['ui', 'input', 'ui', 'editorBg'],
		['ui', 'switchUncheckedBg', 'ui', 'settingItemBg'],
		['preview', 'taskBorder', 'ui', 'editorBg'],
		['preview', 'hrBorder', 'ui', 'editorBg'],
		['preview', 'blockquoteBorder', 'ui', 'editorBg'],
		['ui', 'ring', 'ui', 'background'],
		['ui', 'ring', 'ui', 'popover'],
		['ui', 'ring', 'ui', 'editorBg'],
		['ui', 'ring', 'ui', 'settingsSidebarBg'],
	];

	it('draws each boundary at 3:1 or more on its surface', () => {
		const failures: string[] = [];
		for (const { name, colors } of [...BUILTIN_THEMES, ...HARD_PALETTE_THEMES]) {
			for (const [group, key, bgGroup, bgKey] of BOUNDARIES) {
				const fg = (colors[group] as unknown as Record<string, string>)[key];
				const bg = (colors[bgGroup] as unknown as Record<string, string>)[bgKey];
				const ratio = contrastRatio(fg, flatten(bg, colors.ui.editorBg) ?? bg);
				if (ratio === null || ratio < 3 - 0.005) failures.push(`${name} ${group}.${key} on ${bgKey} ${ratio?.toFixed(2)}`);
			}
		}
		expect(failures).toEqual([]);
	});

	it('keeps the divider border quiet: it is not lifted', () => {
		expect(buildTheme('T', { ...CORE, border: '#eeeeee' }).colors.ui.border).toBe('#eeeeee');
	});

	it('lifts a faint input border, off switch track and task checkbox border from the core palette', () => {
		const { ui, preview } = buildTheme('T', { ...CORE, borderStrong: '#e8e8e8', faintFg: '#dddddd' }).colors;
		expect(contrastRatio(ui.input, ui.inputBg)!).toBeGreaterThanOrEqual(3);
		expect(contrastRatio(ui.switchUncheckedBg, ui.settingItemBg)!).toBeGreaterThanOrEqual(3);
		expect(contrastRatio(preview.taskBorder, ui.editorBg)!).toBeGreaterThanOrEqual(3);
	});
});

describe('tab strip of every built-in theme', () => {
	it('keeps the tab strip within 1.5:1 of the editor, so it is not brighter than the page it labels', () => {
		for (const theme of BUILTIN_THEMES) {
			const { ui } = theme.colors;
			expect(contrastRatio(ui.tabBar, ui.editorBg)!, theme.name).toBeLessThanOrEqual(1.5);
		}
	});

	it('shows the inactive tab hover at 1.1:1 or more against the strip', () => {
		for (const theme of BUILTIN_THEMES) {
			const { ui } = theme.colors;
			// EditorTabs' `hover:bg-tab-text-inactive/10`: 10% alpha, here 0x1a (0.102)
			const hover = flatten(alpha(ui.tabTextInactive, '1a'), ui.tabBar);
			expect(hover, theme.name).not.toBeNull();
			expect(contrastRatio(hover!, ui.tabBar)!, theme.name).toBeGreaterThanOrEqual(1.1);
		}
	});
});

describe('note list pills of every built-in theme', () => {
	// Raw primary on NoteRow's `bg-primary/10` pill over the sidebar, as the builder pairs it (the pill text itself is
	// `--primary-tint-fg`, tint-text-tokens.test.ts). 10% alpha, here 0x1a (0.102)
	function pillBg(ui: (typeof BUILTIN_THEMES)[number]['colors']['ui']): string | null {
		return flatten(alpha(ui.primary, '1a'), ui.fileExplorerBg);
	}

	it('reads the pill text at 4.5:1 or more on the pill', () => {
		for (const theme of BUILTIN_THEMES) {
			const { ui } = theme.colors;
			const bg = pillBg(ui);
			expect(bg, theme.name).not.toBeNull();
			expect(contrastRatio(ui.primary, bg!)!, theme.name).toBeGreaterThanOrEqual(4.5);
		}
	});

	it('would fail 4.5:1 with the text at 80%, so the full color is needed', () => {
		const failing = BUILTIN_THEMES.filter((theme) => {
			const { ui } = theme.colors;
			return contrastRatio(alpha(ui.primary, 'cc'), pillBg(ui)!)! < 4.5;
		}).map((theme) => theme.name);
		expect(failing).toContain('Lavender Haze');
	});
});
