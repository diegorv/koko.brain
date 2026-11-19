import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTheme } from '#lib/core/settings/theme-builder.logic.js';
import { BUILTIN_THEMES } from '#lib/core/settings/theme.logic.js';
import type { UIColors } from '#lib/core/settings/theme.types.js';
import { COLOR_PRESET_BG } from '#lib/utils/color-presets.js';
import { contrastRatio, flatten, isDarkColor, mixColors } from '#lib/utils/color.js';

/**
 * Accent and status text drawn on a tint of its own color (a selected row, a
 * badge, a highlighted Delete) uses a `--*-tint-fg` token from `app.css`: the
 * color moved toward the theme text, measured to 4.5:1 on that tint over the
 * surface each one sits on.
 */

const CSS = readFileSync(resolve(__dirname, '../../app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');

/**
 * Two catalog themes whose light surfaces are hard on accent text, built the way
 * the app builds a catalog theme. `palette` and `overrides` are copied from the
 * koko.brain-themes repo at commit eb9f062: `themes/zettlr-bielefeld-light.json`
 * (1.1.0) and `themes/tolaria-light.json` (1.0.1).
 */
const HARD_PALETTES = [
	buildTheme(
		'Zettlr Bielefeld Light',
		{
			editorBg: '#f3f3e8', sidebarBg: '#f5f5f5', panelBg: '#ffffff', popoverBg: '#ffffff',
			fg: '#50505a', heading: '#50505a', mutedFg: '#5c5c64', faintFg: '#c8c8c8',
			border: '#dcdcdc', borderStrong: '#c8c8c8', hover: '#e0e0e4', selected: '#d6d6de',
			primaryFg: '#282832', highlight: '#ffff0080', codeFg: '#64646e', codeBg: '#f0f0f0',
			error: '#c82828', errorFg: '#ffffff',
			blue: '#237aff', green: '#62ba46', purple: '#c358c4', yellow: '#e5b41f',
			primary: '#ffb46c', meta: '#ffb46c', secondary: '#ffb46c', selection: '#cdcdaa',
		},
		{
			ui: {
				fileExplorerBg: '#e8e8e8', fileExplorerFg: '#4a4a54',
				typeYellow: '#9a7500', typeGreen: '#408b27', typeTeal: '#1c879c', typeBlue: '#1d75fa', typePurple: '#bb50bc',
			},
		},
	),
	buildTheme(
		'Tolaria Light',
		{
			editorBg: '#ffffff', sidebarBg: '#f7f6f3', panelBg: '#ffffff', popoverBg: '#ffffff',
			fg: '#37352f', heading: '#37352f', mutedFg: '#787774', faintFg: '#b4b4b4', meta: '#c9383e',
			border: '#e9e9e7', borderStrong: '#d9d9d6', hover: '#ebebea', selected: '#e8f4fe',
			primary: '#155dff', primaryFg: '#ffffff', secondary: '#805ad5', selection: '#e8f4fe',
			highlight: '#d69e2e1a', codeFg: '#c9383e', codeBg: '#afb8c126',
			error: '#e53e3e', errorFg: '#ffffff',
			blue: '#155dff', green: '#38a169', purple: '#805ad5', yellow: '#d69e2e',
		},
		{ ui: { typeOrange: '#ce6630', typeYellow: '#ab7c17', typeGreen: '#2a965f' } },
	),
];

const THEMES = [...BUILTIN_THEMES, ...HARD_PALETTES];

/** `--file-explorer-primary` to `fileExplorerPrimary`. */
function uiKey(cssVar: string): keyof UIColors {
	return cssVar.replace(/^--/, '').replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) as keyof UIColors;
}

/** `color` at `share` over the opaque `base`, as Tailwind's `bg-x/NN` renders it. */
function tint(color: string, share: number, base: string): string {
	const opaque = flatten(color, '#000000')!;
	return flatten(opaque + Math.round(share * 255).toString(16).padStart(2, '0'), base)!;
}

type Stack = [label: string, surface: (ui: UIColors, dark: boolean) => string];

/** A kanban lane, `bg-muted/30` over the editor. */
const lane = (ui: UIColors) => tint(ui.muted, 0.3, ui.editorBg);

/** A hovered kanban table row, `bg-muted/20` over the editor. */
const hoveredRow = (ui: UIColors) => tint(ui.muted, 0.2, ui.editorBg);

/**
 * `label` on every coloured kanban card (the preset tint layered over the
 * card's `bg-background`) and every coloured list or table row (the tint
 * over the editor), one stack per preset.
 */
function colouredCards(label: string): Stack[] {
	return Object.entries(COLOR_PRESET_BG).flatMap(([name, bg]): Stack[] => [
		[`${label} on a ${name} card`, (ui) => flatten(bg, ui.background)!],
		[`${label} on a ${name} row`, (ui) => flatten(bg, ui.editorBg)!],
	]);
}

/** A kanban date badge, `bg-<color>/15`, on a card, a list row and a hovered table row. */
function dateBadge(label: string, color: (ui: UIColors) => string): Stack[] {
	return [
		[`${label} date badge on a card`, (ui) => tint(color(ui), 0.15, ui.background)],
		[`${label} date badge in a row`, (ui) => tint(color(ui), 0.15, ui.editorBg)],
		[`${label} date badge on a hovered row`, (ui) => tint(color(ui), 0.15, hoveredRow(ui))],
	];
}

/** Each token's source color and the opaque backgrounds its text is drawn on. */
const USES: Record<string, { color: string; stacks: Stack[] }> = {
	'--primary-tint-fg': {
		color: '--primary',
		stacks: [
			['selected note row', (ui) => tint(ui.primary, 0.25, ui.fileExplorerBg)],
			['note row pill', (ui) => tint(ui.primary, 0.1, ui.fileExplorerBg)],
			['note row pill on a hovered row', (ui) => tint(ui.primary, 0.1, tint(ui.primary, 0.1, ui.fileExplorerBg))],
			['hovered wikilink pill', (ui) => tint(ui.primary, 0.15, tint(ui.primary, 0.1, ui.fileExplorerBg))],
			['filter count pill', (ui) => tint(ui.primary, 0.15, ui.popover)],
			['dev build badge', (ui) => tint(ui.primary, 0.2, ui.settingItemBg)],
			['kanban card wikilink', (ui) => ui.background],
			['kanban row wikilink', (ui) => ui.editorBg],
			['kanban hovered row wikilink', hoveredRow],
			...colouredCards('kanban wikilink'),
		],
	},
	'--file-explorer-primary-tint-fg': {
		color: '--file-explorer-primary',
		stacks: [
			['selected navigator row', (ui) => tint(ui.fileExplorerPrimary, 0.25, ui.fileExplorerBg)],
			['search Both badge', (ui) => tint(ui.fileExplorerPrimary, 0.15, ui.background)],
		],
	},
	'--search-semantic-tint-fg': {
		color: '--search-semantic-fg',
		stacks: [['search Semantic badge', (ui) => flatten(ui.searchSemanticBg, ui.background)!]],
	},
	'--destructive-tint-fg': {
		color: '--destructive',
		stacks: [
			['destructive menu item', (ui) => ui.popover],
			['highlighted destructive menu item', (ui, dark) => tint(ui.destructive, dark ? 0.2 : 0.1, ui.popover)],
			['tasks refresh banner', (ui) => tint(ui.destructive, 0.1, ui.editorBg)],
			['hovered Retry', (ui) => tint(ui.destructive, 0.1, tint(ui.destructive, 0.1, ui.editorBg))],
			['deleted diff line', (ui) => tint(ui.destructive, 0.15, ui.popover)],
			['kanban lane card-limit count', lane],
			...dateBadge('overdue', (ui) => ui.destructive),
		],
	},
	'--success-tint-fg': {
		color: '--success',
		stacks: [
			['stable badge in settings', (ui) => tint(ui.success, 0.2, ui.settingItemBg)],
			['stable badge in the footer', (ui) => tint(ui.success, 0.2, ui.card)],
			['inserted diff line', (ui) => tint(ui.success, 0.15, ui.popover)],
			['kanban table Done status', (ui) => ui.editorBg],
			['kanban table Done status on a hovered row', hoveredRow],
			...colouredCards('kanban table Done status').filter(([label]) => label.endsWith(' row')),
		],
	},
	'--warning-tint-fg': {
		color: '--warning',
		stacks: [
			['nightly badge in settings', (ui) => tint(ui.warning, 0.2, ui.settingItemBg)],
			['nightly badge in the footer', (ui) => tint(ui.warning, 0.2, ui.card)],
			...dateBadge('today', (ui) => ui.warning),
		],
	},
	'--type-orange-tint-fg': {
		color: '--type-orange',
		stacks: dateBadge('tomorrow', (ui) => ui.typeOrange),
	},
	'--type-blue-tint-fg': {
		color: '--type-blue',
		stacks: dateBadge('upcoming', (ui) => ui.typeBlue),
	},
	'--muted-tint-fg': {
		color: '--muted-foreground',
		stacks: colouredCards('kanban checked text, note preview and lane column'),
	},
	'--type-purple-tint-fg': {
		color: '--type-purple',
		stacks: [
			['preview badge in settings', (ui) => tint(ui.typePurple, 0.2, ui.settingItemBg)],
			['preview badge in the footer', (ui) => tint(ui.typePurple, 0.2, ui.card)],
		],
	},
};

/** Every `--*-tint-fg: color-mix(in oklab, var(--c) N%, var(--text))` in app.css. */
function tintTokens(css: string): { name: string; color: string; share: number; text: string }[] {
	const re = /(--[\w-]+-tint-fg)\s*:\s*color-mix\(in oklab, var\((--[\w-]+)\) (\d+)%, var\((--[\w-]+)\)\)\s*;/g;
	return [...css.matchAll(re)].map((m) => ({ name: m[1], color: m[2], share: Number(m[3]) / 100, text: m[4] }));
}

const TOKENS = tintTokens(CSS);

describe('text-on-tint tokens in app.css', () => {
	it('parses a token declaration', () => {
		expect(tintTokens(':root { --x-tint-fg: color-mix(in oklab, var(--x) 30%, var(--foreground)); }')).toEqual([
			{ name: '--x-tint-fg', color: '--x', share: 0.3, text: '--foreground' },
		]);
		expect(tintTokens('')).toEqual([]);
	});

	it('declares each token once, mixing its own color with a text color', () => {
		expect(TOKENS.map((t) => t.name).sort()).toEqual(Object.keys(USES).sort());
		for (const token of TOKENS) {
			expect(token.color, token.name).toBe(USES[token.name].color);
			expect(token.text, token.name).toMatch(/^--(foreground|file-explorer-fg)$/);
		}
	});

	it('exposes each token as a Tailwind color', () => {
		for (const name of Object.keys(USES)) {
			expect(CSS, name).toContain(`--color-${name.slice(2)}: var(${name});`);
		}
	});

	describe.each(TOKENS)('$name', (token) => {
		const { stacks } = USES[token.name];

		it.each(stacks)('is at least 4.5:1 on the %s in every built-in and hard-palette theme', (_, surface) => {
			for (const theme of THEMES) {
				const { ui } = theme.colors;
				const text = mixColors(ui[uiKey(token.color)], ui[uiKey(token.text)], 1 - token.share)!;
				const bg = surface(ui, isDarkColor(ui.editorBg) !== false);
				expect(contrastRatio(text, bg)!, theme.name).toBeGreaterThanOrEqual(4.5);
			}
		});

		it('replaces a raw color that falls under 4.5:1 on one of its stacks in at least one theme', () => {
			const ratios = THEMES.flatMap((theme) => {
				const { ui } = theme.colors;
				const dark = isDarkColor(ui.editorBg) !== false;
				return stacks.map(([, surface]) => contrastRatio(ui[uiKey(token.color)], surface(ui, dark))!);
			});
			expect(Math.min(...ratios)).toBeLessThan(4.5);
		});
	});
});

describe('search Text badge', () => {
	it('file-explorer-fg on --muted is at least 4.5:1 in every built-in and hard-palette theme', () => {
		for (const theme of THEMES) {
			const { ui } = theme.colors;
			expect(contrastRatio(ui.fileExplorerFg, ui.muted)!, theme.name).toBeGreaterThanOrEqual(4.5);
		}
	});

	it('file-explorer-muted-fg on --muted is also at least 4.5:1: the theme builder lifts it on the hover fill', () => {
		for (const theme of THEMES) {
			const { ui } = theme.colors;
			expect(contrastRatio(ui.fileExplorerMutedFg, ui.muted)!, theme.name).toBeGreaterThanOrEqual(4.5);
		}
	});
});

describe('kanban view toggle', () => {
	it('the active toggle icon, primary on primary/10 over the editor, is at least 3:1 in every built-in and hard-palette theme', () => {
		for (const theme of THEMES) {
			const { ui } = theme.colors;
			expect(contrastRatio(ui.primary, tint(ui.primary, 0.1, ui.editorBg))!, theme.name).toBeGreaterThanOrEqual(3);
		}
	});
});
