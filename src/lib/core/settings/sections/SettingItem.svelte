<script lang="ts">
	import type { Snippet } from 'svelte';

	let { label, description, children }: {
		/** Setting name displayed on the left */
		label: string;
		/** Optional description shown below the label */
		description?: string;
		/** Control element rendered on the right */
		children: Snippet;
	} = $props();
</script>

<div class="flex items-center justify-between gap-4 rounded-lg py-3 px-4 bg-setting-item-bg">
	<div class="flex min-w-0 flex-1 flex-col gap-0.5">
		<span class="text-sm font-medium text-settings-text">{label}</span>
		{#if description}
			<span class="text-xs text-muted-foreground">{description}</span>
		{/if}
	</div>
	<div class="flex w-2/5 shrink-0 justify-end">
		{@render children()}
	</div>
</div>
