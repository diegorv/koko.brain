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

/**
 * Three catalog dark themes whose muted text, links and accent rows were the
 * hardest by WCAG and APCA (color audit 2026-11-19), built the way the app
 * builds a catalog theme. Copied from the koko.brain-themes repo at commit
 * 3a6fba2, `themes/<id>.json`: Twilight Violet 1.0.1, Zettlr Bordeaux Dark
 * 1.0.2, Zettlr Karl-Marx-Stadt Dark 1.0.1. Twilight Violet's `frontmatterBg`
 * override is left out: the app has no such token.
 */
export const HARD_DARK_PALETTE_THEMES: Theme[] = [
	// themes/twilight-violet.json
	buildTheme(
		'Twilight Violet',
		{
			editorBg: '#222028', sidebarBg: '#222028', panelBg: '#282630', popoverBg: '#1A181F',
			fg: '#D0CCD8', heading: '#C878A0', mutedFg: '#706888', faintFg: '#444050',
			border: '#343040', borderStrong: '#343040', hover: '#343040', selected: '#383440',
			primary: '#9878B8', primaryFg: '#1A181F', secondary: '#C8A868', selection: '#383050',
			highlight: '#C8A86845', codeFg: '#78B898', codeBg: '#34323a',
			error: '#D06060', errorFg: '#D0CCD8', inlineFg: '#D0CCD8', linkFg: '#7898C8',
			meta: '#706888', blockquoteAccent: '#706888',
			blue: '#7898C8', green: '#78B898', purple: '#9878B8', yellow: '#C8A868',
		},
		{
			ui: {
				accent: '#343040', tabBar: '#2a2830', divider: '#444050', fileExplorerBg: '#2C2A34',
				fileExplorerMutedFg: '#8A84A0', fileExplorerBadgeFg: '#7A7490', searchSemanticBg: 'rgba(152,120,184,0.15)',
				rightSidebarBg: '#282630', rightSidebarMutedFg: '#8A84A0', rightSidebarAccent: '#343038',
				editorEmptyBg: '#282630', tabTextInactive: '#A098B0', settingsSidebarBg: '#2C2A34',
				settingsHoverBg: '#343038', settingItemBg: '#1A181F', statusBarBg: '#27252d', switchUncheckedBg: '#343038',
			},
			syntax: {
				heading2: '#9878B8', heading3: '#7898C8', heading4: '#78B898', heading5: '#C8A868', heading6: '#C87878',
				emphasis: '#C878A0', url: '#C878A0', codeBg: 'rgba(255,255,255,0.06)',
				activeLine: 'rgba(26,24,31,0.3)', activeLineGutter: '#1A181F',
			},
			preview: {
				hrBorder: '#444050', olMarker: '#C8A868', codeblockBg: '#1A181F', tableHeaderBg: '#1A181F',
				tableAlt: '#1A181F45', footnote: '#7898C8', collectionBg: '#1A181F',
				collectionHeader: '#A098B0', collectionTableHeaderBg: '#15131a', collectionTableHeaderText: '#A098B0',
				collectionTableAlt: '#1A181F45', collectionLoading: '#A098B0', embedBg: '#1A181F', embedHover: '#242229',
			},
			wikilink: { heading: '#ac8ccc' },
		},
	),
	// themes/zettlr-bordeaux-dark.json
	buildTheme('Zettlr Bordeaux Dark', {
		editorBg: '#002b36', sidebarBg: '#1e1e1e', panelBg: '#002b36', popoverBg: '#282832',
		fg: '#c8c8c8', heading: '#c8c8c8', mutedFg: '#787882', faintFg: '#50505a',
		border: '#505050', borderStrong: '#505050', hover: '#505050', selected: '#282832',
		primaryFg: '#282832', highlight: '#000000', codeFg: '#c8c8c8', codeBg: '#002024',
		error: '#d02325', errorFg: '#ffffff',
		blue: '#237aff', green: '#62ba46', purple: '#c358c4', yellow: '#e5b41f',
		linkFg: '#93a1a1', primary: '#1bd4e9', meta: '#1bd4e9', secondary: '#d02325', selection: '#0c616acc',
	}),
	// themes/zettlr-karl-marx-stadt-dark.json
	buildTheme('Zettlr Karl-Marx-Stadt Dark', {
		editorBg: '#2b2b2c', sidebarBg: '#1e1e1e', panelBg: '#2b2b2c', popoverBg: '#282832',
		fg: '#f0f0f0', heading: '#f0f0f0', mutedFg: '#787882', faintFg: '#50505a',
		border: '#505050', borderStrong: '#505050', hover: '#505050', selected: '#282832',
		primaryFg: '#ffffff', highlight: '#ffff0060', codeFg: '#c8c8c8', codeBg: '#282832',
		error: '#c82828', errorFg: '#ffffff',
		blue: '#237aff', green: '#62ba46', purple: '#c358c4', yellow: '#e5b41f',
		primary: '#dc2d2d', meta: '#dc2d2d', secondary: '#dc2d2d', selection: '#a32323b3',
	}),
];
