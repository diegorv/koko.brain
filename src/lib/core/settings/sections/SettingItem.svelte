<script lang="ts">
	import type { Snippet } from 'svelte';

	let { label, description, layout = 'inline', children }: {
		/** Setting name displayed on the left */
		label: string;
		/** Optional description shown below the label */
		description?: string;
		/**
		 * `inline` (default): the control sits right of the text in a column sized
		 * by its content, at most half the row; a free-text Input takes the full half.
		 * `stacked`: the control sits below the text at full width, for wide values.
		 */
		layout?: 'inline' | 'stacked';
		/** Control element rendered on the right, or below the text when stacked */
		children: Snippet;
	} = $props();
</script>

<div
	class="flex min-h-14 rounded-lg px-4 py-3 bg-setting-item-bg {layout === 'stacked'
		? 'flex-col items-stretch gap-2'
		: 'items-center justify-between gap-4'}"
>
	<div class="flex min-w-0 flex-1 flex-col gap-0.5">
		<span class="text-row font-medium text-settings-text">{label}</span>
		{#if description}
			<span class="text-meta text-muted-foreground text-pretty">{description}</span>
		{/if}
	</div>
	{#if layout === 'stacked'}
		<!-- A block, not a flex row, so a block child (Input + Browse) fills the width. -->
		<div class="w-full">
			{@render children()}
		</div>
	{:else}
		<div class="flex max-w-[50%] shrink-0 justify-end has-[[data-slot=input]:not([type=number])]:w-1/2">
			{@render children()}
		</div>
	{/if}
</div>
