<script lang="ts">
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Circle from '@lucide/svelte/icons/circle';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { isTabDirty, isVirtualTab } from '#lib/core/editor/editor.logic.js';

	let status = $derived.by(() => {
		const tab = editorStore.activeTab;
		if (!tab || isVirtualTab(tab)) return null;
		return isTabDirty(tab) ? 'modified' : 'saved';
	});
</script>

<!-- Both labels share one grid cell, so the slot is always as wide as the wider
     label and the items beside it do not move when the state flips. The grid is
     a child of the outer span, which keeps the status bar divider (drawn as the
     outer span's ::before) outside the cell. -->
{#if status}
	<span class="inline-flex items-center gap-1" data-save-status data-state={status}>
		<span class="inline-grid">
			<span
				class="col-start-1 row-start-1 inline-flex items-center gap-1 text-muted-foreground"
				class:invisible={status !== 'modified'}
				aria-hidden={status !== 'modified' ? 'true' : undefined}
			>
				<Circle class="size-3 fill-current" />
				Modified
			</span>
			<span
				class="col-start-1 row-start-1 inline-flex items-center gap-1"
				class:invisible={status !== 'saved'}
				aria-hidden={status !== 'saved' ? 'true' : undefined}
			>
				<CircleCheck class="size-3" />
				Saved
			</span>
		</span>
	</span>
{/if}
