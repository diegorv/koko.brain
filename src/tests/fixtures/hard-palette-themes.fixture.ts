import { buildTheme } from '#lib/core/settings/theme-builder.logic.js';
import type { Theme } from '#lib/core/settings/theme.types.js';

/**
 * Two catalog themes whose light rails are hard on fixed hues (color audit
 * 2026-11-19), built the way the app builds a catalog theme. `palette` and
 * `overrides` are copied from the koko.brain-themes repo, `themes/<id>.json`
 * at version 1.0.1 (commit 3a6fba2).
 */
export const HARD_PALETTE_THEMES: Theme[] = [
	// themes/zettlr-bielefeld-light.json
	buildTheme(
		'Zettlr Bielefeld Light',
		{
			editorBg: '#f3f3e8', sidebarBg: '#f5f5f5', panelBg: '#ffffff', popoverBg: '#ffffff',
			fg: '#50505a', heading: '#50505a', mutedFg: '#787882', faintFg: '#c8c8c8',
			border: '#dcdcdc', borderStrong: '#c8c8c8', hover: '#dcdcdc', selected: '#c8c8c8',
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
	// themes/tolaria-light.json
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
