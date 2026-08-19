<script lang="ts">
	import { untrack } from 'svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Separator } from '$lib/components/ui/separator';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { openNoteAt } from '$lib/core/editor/open-note-at.service';
	import { tocStore } from './toc.store.svelte';
	import { rebuildToc } from './toc.service';

	let expanded = $state(false);
	let lastBuiltPath = $state<string | null>(null);

	function handleExpand() {
		if (!expanded) buildToc();
	}

	function buildToc() {
		const content = editorStore.activeTabContent;
		lastBuiltPath = editorStore.activeTabPath;
		rebuildToc(content);
	}

	$effect(() => {
		const path = editorStore.activeTabPath;
		if (path !== lastBuiltPath && expanded) {
			expanded = false;
			tocStore.reset();
		}
	});

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
	<Collapsible.Root bind:open={expanded}>
		<Collapsible.Trigger
			class="flex w-full items-center h-10 px-3 shrink-0 hover:bg-right-sidebar-accent/50 transition-colors cursor-pointer"
			onclick={handleExpand}
		>
			<ChevronRight class="size-3.5 shrink-0 text-right-sidebar-muted-fg transition-transform {expanded ? 'rotate-90' : ''}" />
			<h2 class="ml-1.5 font-semibold uppercase tracking-wide text-right-sidebar-primary">Table of Contents</h2>
		</Collapsible.Trigger>
		<Collapsible.Content>
			<div class="p-2">
				{#if isNonMarkdown}
					<p class="text-right-sidebar-muted-fg px-2 py-4 text-center">Not available</p>
				{:else if tocStore.headings.length === 0}
					<p class="text-right-sidebar-muted-fg px-2 py-4 text-center">No headings found</p>
				{:else}
					<div class="space-y-0.5">
						{#each tocStore.headings as heading (heading.pos)}
							{@const depth = heading.level - 1}
							<button
								type="button"
								class="relative flex w-full items-center gap-1 rounded-md py-[5px] pr-2 text-left text-[15px] hover:bg-right-sidebar-primary/10 hover:text-right-sidebar-primary cursor-pointer select-none {depth > 0 ? 'toc-indent-lines' : ''}"
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
			</div>
		</Collapsible.Content>
	</Collapsible.Root>
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
