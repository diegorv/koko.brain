<script lang="ts">
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { isTabDirty, isVirtualTab } from '$lib/core/editor/editor.logic';

	let status = $derived.by(() => {
		const tab = editorStore.activeTab;
		if (!tab || isVirtualTab(tab)) return null;
		return isTabDirty(tab) ? 'modified' : 'saved';
	});
</script>

{#if status === 'modified'}
	<span class="text-yellow-400">Modified</span>
{:else if status === 'saved'}
	<span>Saved</span>
{/if}
