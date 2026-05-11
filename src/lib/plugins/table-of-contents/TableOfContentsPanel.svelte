<script lang="ts">
	import { untrack } from 'svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { tocStore } from './toc.store.svelte';
	import { rebuildToc, scrollToHeading } from './toc.service';

	// Rebuild the heading list whenever the active buffer changes.
	// Reading `activeTabContent` makes the effect re-run on keystrokes;
	// extraction is O(N) over lines and cheap enough not to need debouncing
	// for any realistic note size.
	$effect(() => {
		const content = editorStore.activeTabContent;
		untrack(() => rebuildToc(content));
	});

	const fileType = $derived(editorStore.activeTab?.fileType);
	const isNonMarkdown = $derived(fileType && fileType !== 'markdown');
</script>

<div class="flex flex-col">
	<div class="flex items-center h-10 px-3 shrink-0">
		<h2 class="font-semibold uppercase tracking-wide text-primary">Table of Contents</h2>
	</div>
	<Separator />
	<div class="max-h-[50vh] overflow-y-auto p-2">
		{#if isNonMarkdown}
			<p class="text-muted-foreground px-2 py-4 text-center">Not available</p>
		{:else if tocStore.headings.length === 0}
			<p class="text-muted-foreground px-2 py-4 text-center">No headings found</p>
		{:else}
			<div class="space-y-0.5">
				{#each tocStore.headings as heading (heading.pos)}
					{@const depth = heading.level - 1}
					<button
						type="button"
						class="relative block w-full truncate rounded-md py-1 pr-2 text-left text-sm hover:bg-accent cursor-pointer {depth > 0 ? 'toc-indent-lines' : ''}"
						style="padding-left: {depth * 16 + 8}px; --toc-indent-depth: {depth};"
						title={heading.text}
						onclick={() => scrollToHeading(heading.pos)}
					>
						{heading.text}
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.toc-indent-lines {
		background-image: repeating-linear-gradient(
			to right,
			transparent 0 12px,
			color-mix(in oklch, var(--muted-foreground) 40%, transparent) 12px 13px,
			transparent 13px 16px
		);
		background-size: calc(var(--toc-indent-depth, 0) * 16px) 100%;
		background-repeat: no-repeat;
	}
</style>
