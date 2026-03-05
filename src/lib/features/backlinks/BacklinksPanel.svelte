<script lang="ts">
	import { ChevronRight, Link, Type } from 'lucide-svelte';
	import { Separator } from '$lib/components/ui/separator';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { backlinksStore } from './backlinks.store.svelte';
	import { noteIndexStore } from './note-index.store.svelte';
	import LinkItem from './LinkItem.svelte';

	let linkedOpen = $state(true);
	let unlinkedOpen = $state(true);
</script>

<div class="flex flex-col">
	<div class="flex items-center h-10 px-3 shrink-0">
		<h2 class="font-semibold uppercase tracking-wide text-primary">Backlinks</h2>
	</div>
	<Separator />
	<div class="max-h-[50vh] overflow-y-auto p-2">
		{#if editorStore.activeTab && editorStore.activeTab.fileType && editorStore.activeTab.fileType !== 'markdown'}
			<p class="text-muted-foreground px-2 py-4 text-center">Not available</p>
		{:else if noteIndexStore.isLoading}
			<p class="text-muted-foreground px-2 py-4 text-center">Indexing vault...</p>
		{:else if backlinksStore.linkedMentions.length === 0 && backlinksStore.unlinkedMentions.length === 0}
			<p class="text-muted-foreground px-2 py-4 text-center">No backlinks found</p>
		{:else}
			<Collapsible.Root bind:open={linkedOpen}>
				<Collapsible.Trigger class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 font-medium hover:bg-accent transition-colors cursor-pointer">
					<ChevronRight class="size-3.5 shrink-0 transition-transform {linkedOpen ? 'rotate-90' : ''}" />
					<Link class="size-3.5 shrink-0 text-muted-foreground" />
					<span>Linked mentions</span>
					<span class="ml-auto text-muted-foreground">{backlinksStore.linkedMentions.length}</span>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<div class="pl-2 mt-1 space-y-0.5">
						{#each backlinksStore.linkedMentions as entry (entry.sourcePath)}
							<LinkItem {entry} />
						{/each}
					</div>
				</Collapsible.Content>
			</Collapsible.Root>

			<Collapsible.Root bind:open={unlinkedOpen} class="mt-2">
				<Collapsible.Trigger class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 font-medium hover:bg-accent transition-colors cursor-pointer">
					<ChevronRight class="size-3.5 shrink-0 transition-transform {unlinkedOpen ? 'rotate-90' : ''}" />
					<Type class="size-3.5 shrink-0 text-muted-foreground" />
					<span>Unlinked mentions</span>
					<span class="ml-auto text-muted-foreground">{backlinksStore.unlinkedMentions.length}</span>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<div class="pl-2 mt-1 space-y-0.5">
						{#each backlinksStore.unlinkedMentions as entry (entry.sourcePath)}
							<LinkItem {entry} />
						{/each}
					</div>
				</Collapsible.Content>
			</Collapsible.Root>
		{/if}
	</div>
</div>
