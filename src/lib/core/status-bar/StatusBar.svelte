<script lang="ts">
	import type { Snippet } from 'svelte';

	let { left, right }: { left?: Snippet; right?: Snippet } = $props();
</script>

<div
	class="flex h-[32px] shrink-0 items-center justify-between border-t border-border bg-status-bar-bg px-2 text-xs text-status-bar-fg"
>
	<div class="status-bar-group flex items-center gap-3">
		{#if left}
			{@render left()}
		{/if}
	</div>
	<div class="status-bar-group flex items-center gap-3">
		{#if right}
			{@render right()}
		{/if}
	</div>
</div>

<style>
	.status-bar-group > :global(:not(:first-child))::before {
		content: '';
		display: inline-block;
		width: 1px;
		height: 12px;
		margin-right: 12px;
		background: var(--status-bar-fg);
		opacity: 0.3;
		vertical-align: middle;
	}
</style>
