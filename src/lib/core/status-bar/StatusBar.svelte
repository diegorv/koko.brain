<script lang="ts">
	import type { Snippet } from 'svelte';

	let { left, right }: { left?: Snippet; right?: Snippet } = $props();
</script>

<div
	class="flex h-[22px] shrink-0 items-center justify-between border-t border-border bg-background px-2 text-xs text-muted-foreground"
>
	<div class="flex items-center gap-3">
		{#if left}
			{@render left()}
		{/if}
	</div>
	<div class="flex items-center gap-3">
		{#if right}
			{@render right()}
		{/if}
	</div>
</div>
