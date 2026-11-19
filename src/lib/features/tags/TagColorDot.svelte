<script lang="ts">
	import Hash from '@lucide/svelte/icons/hash';
	import { appliedThemeStore } from '#lib/core/settings/applied-theme.store.svelte.js';
	import { readableOn, themeSurface } from '#lib/core/settings/theme-surfaces.logic.js';

	interface Props {
		/** Hex color string, or undefined for no color (shows Hash icon) */
		color?: string;
	}

	let { color }: Props = $props();

	/**
	 * The dot as drawn in the Tags view (editor-bg, accent/50 on hover, checked
	 * against the full accent): the presets are tuned for dark themes, so the color is lifted to 3:1 there. The saved color does not change.
	 */
	let shown = $derived(
		readableOn(appliedThemeStore, color, [themeSurface(appliedThemeStore, 'editor-bg'), themeSurface(appliedThemeStore, 'accent')], 3),
	);
</script>

{#if color}
	<span
		class="size-3 shrink-0 rounded-full inline-block"
		style:background-color={shown}
		data-tag-color-dot
	></span>
{:else}
	<Hash class="size-3 shrink-0 text-muted-foreground" />
{/if}
