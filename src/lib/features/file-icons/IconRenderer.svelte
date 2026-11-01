<script lang="ts">
	import type { NormalizedIcon } from './file-icons.types';
	import { sanitizeSvgContent } from '#lib/utils/sanitize.js';
	import { iconColorCss } from './file-icons.logic';

	/**
	 * Renders a normalized icon as inline SVG, or an emoji as a <span>.
	 * Used in both the icon picker grid and the file tree.
	 */
	interface Props {
		/** The normalized icon to render */
		icon: NormalizedIcon;
		/** CSS class for sizing (e.g. 'size-3.5', 'size-5') */
		class?: string;
		/** Optional color override: a type palette name (`green`) or any CSS color */
		color?: string;
	}

	let { icon, class: className = 'size-4', color }: Props = $props();
	let cssColor = $derived(iconColorCss(color));
</script>

{#if icon.pack === 'emoji'}
	<span class={className} style={cssColor ? `color: ${cssColor}` : undefined}>{icon.name}</span>
{:else}
	<svg
		class={className}
		viewBox={icon.viewBox}
		fill={icon.pack.startsWith('fa-') ? 'currentColor' : 'none'}
		stroke={icon.pack.startsWith('fa-') ? 'none' : 'currentColor'}
		stroke-width={icon.pack.startsWith('fa-') ? undefined : '2'}
		stroke-linecap={icon.pack.startsWith('fa-') ? undefined : 'round'}
		stroke-linejoin={icon.pack.startsWith('fa-') ? undefined : 'round'}
		style={cssColor ? `color: ${cssColor}` : undefined}
	>
		{@html sanitizeSvgContent(icon.svgContent)}
	</svg>
{/if}
