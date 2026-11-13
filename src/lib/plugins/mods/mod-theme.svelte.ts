import { untrack } from 'svelte';

import { appliedThemeStore } from '#lib/core/settings/applied-theme.store.svelte.js';

import type { ModThemeColorsV1, ModThemeStateV1 } from './contract/mod-api.v1';

/**
 * The mod color contract: each `ctx.theme` color and the CSS variable it reads.
 * It is the "Global" table of `help/documentation/26-theming.md`; renaming a
 * variable here or in `src/app.css` breaks mods (`mod-theme.test.ts` freezes it).
 */
export const MOD_THEME_TOKENS = {
	background: '--background',
	foreground: '--foreground',
	card: '--card',
	cardForeground: '--card-foreground',
	popover: '--popover',
	popoverForeground: '--popover-foreground',
	primary: '--primary',
	primaryForeground: '--primary-foreground',
	secondary: '--secondary',
	secondaryForeground: '--secondary-foreground',
	muted: '--muted',
	mutedForeground: '--muted-foreground',
	accent: '--accent',
	accentForeground: '--accent-foreground',
	destructive: '--destructive',
	destructiveForeground: '--destructive-foreground',
	border: '--border',
	input: '--input',
	ring: '--ring',
	divider: '--divider',
} as const satisfies Record<keyof ModThemeColorsV1, string>;

/** Reads the applied theme's mode and its contract colors from the document root, now */
export function readModTheme(): ModThemeStateV1 {
	const style = getComputedStyle(document.documentElement);
	const colors = Object.fromEntries(
		Object.entries(MOD_THEME_TOKENS).map(([key, cssVar]) => [key, style.getPropertyValue(cssVar).trim()]),
	) as unknown as ModThemeColorsV1;
	return { mode: appliedThemeStore.isDark ? 'dark' : 'light', colors };
}

/**
 * Calls `onChange` after every theme application (`appliedThemeStore.revision`)
 * and mode switch, not at subscription. Returns the disposer of its effect root.
 * The baseline is read at subscription, not at the effect's first run (the next
 * flush), so a change between the two is still reported.
 */
export function watchModTheme(onChange: () => void): () => void {
	let revision = untrack(() => appliedThemeStore.revision);
	let isDark = untrack(() => appliedThemeStore.isDark);
	return $effect.root(() => {
		$effect(() => {
			const nextRevision = appliedThemeStore.revision;
			const nextIsDark = appliedThemeStore.isDark;
			if (nextRevision === revision && nextIsDark === isDark) return;
			revision = nextRevision;
			isDark = nextIsDark;
			untrack(onChange);
		});
	});
}
