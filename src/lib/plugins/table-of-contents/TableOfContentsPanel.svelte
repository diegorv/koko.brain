<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { openNoteAt } from '#lib/core/editor/open-note-at.service.js';
	import SidebarSection from '#lib/core/layout/SidebarSection.svelte';
	import { tocStore } from './toc.store.svelte';
	import { rebuildToc } from './toc.service';

	// Expanded only on the note it was opened on, so a tab switch collapses it.
	let expanded = $derived(tocStore.expandedPath !== null && tocStore.expandedPath === editorStore.activeTabPath);

	function setExpanded(open: boolean) {
		tocStore.setExpandedPath(open ? editorStore.activeTabPath : null);
	}

	// Forget the note on a tab switch, so coming back finds the section collapsed.
	$effect(() => {
		const path = editorStore.activeTabPath;
		untrack(() => {
			if (tocStore.expandedPath !== null && tocStore.expandedPath !== path) {
				tocStore.setExpandedPath(null);
				tocStore.reset();
			}
		});
	});

	// The tab-switch effect above runs only while mounted; the panel unmounts
	// with the right sidebar, so forget the note here too or a hide, tab switch
	// and return would find the section still open.
	onDestroy(() => tocStore.setExpandedPath(null));

	$effect(() => {
		const _content = editorStore.activeTabContent;
		if (expanded) {
			untrack(() => rebuildToc(_content));
		}
	});

	const fileType = $derived(editorStore.activeTab?.fileType);
	const isNonMarkdown = $derived(fileType && fileType !== 'markdown');
</script>

<div class="flex flex-col">
	<SidebarSection title="Table of contents" bind:open={() => expanded, setExpanded}>
		{#if isNonMarkdown}
			<p class="text-meta text-right-sidebar-muted-fg px-2 py-4 text-center">Not available</p>
		{:else if tocStore.headings.length === 0}
			<p class="text-meta text-right-sidebar-muted-fg px-2 py-4 text-center">No headings found</p>
		{:else}
			<div class="space-y-0.5">
				{#each tocStore.headings as heading (heading.pos)}
					{@const depth = heading.level - 1}
					<button
						type="button"
						class="relative flex w-full items-center gap-1 rounded-md py-[5px] pr-2 text-left text-row hover:bg-right-sidebar-primary/10 hover:text-right-sidebar-primary cursor-pointer select-none {depth > 0 ? 'toc-indent-lines' : ''}"
						style="padding-left: {depth * 16 + 8}px; --toc-indent-depth: {depth};"
						title={heading.text}
						onclick={() => openNoteAt(editorStore.activeTabPath, { kind: 'offset', offset: heading.pos })}
					>
						<ChevronRight class="size-3.5 shrink-0 text-right-sidebar-muted-fg" />
						<span class="truncate">{heading.text}</span>
					</button>
				{/each}
			</div>
		{/if}
	</SidebarSection>
</div>

<style>
	.toc-indent-lines {
		background-image: repeating-linear-gradient(
			to right,
			transparent 0 12px,
			color-mix(in oklch, var(--right-sidebar-muted-fg) 40%, transparent) 12px 13px,
			transparent 13px 16px
		);
		background-size: calc(var(--toc-indent-depth, 0) * 16px) 100%;
		background-repeat: no-repeat;
	}
</style>
