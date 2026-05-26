<script lang="ts">
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Circle from '@lucide/svelte/icons/circle';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { isTabDirty, isVirtualTab } from '$lib/core/editor/editor.logic';

	let status = $derived.by(() => {
		const tab = editorStore.activeTab;
		if (!tab || isVirtualTab(tab)) return null;
		return isTabDirty(tab) ? 'modified' : 'saved';
	});
</script>

{#if status === 'modified'}
	<span class="inline-flex items-center gap-1 text-muted-foreground">
		<Circle class="size-3 fill-current animate-pulse" />
		Modified
	</span>
{:else if status === 'saved'}
	<span class="inline-flex items-center gap-1">
		<CircleCheck class="size-3" />
		Saved
	</span>
{/if}
