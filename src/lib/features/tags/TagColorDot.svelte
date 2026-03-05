<script lang="ts">
	import { Hash } from 'lucide-svelte';

	interface Props {
		/** Hex color string, or undefined for no color (shows Hash icon) */
		color?: string;
	}

	let { color }: Props = $props();
</script>

{#if color}
	<span
		class="size-3 shrink-0 rounded-full inline-block"
		style:background-color={color}
	></span>
{:else}
	<Hash class="size-3 shrink-0 text-muted-foreground" />
{/if}
