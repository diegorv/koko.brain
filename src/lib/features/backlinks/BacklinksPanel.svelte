<script lang="ts">
	import { untrack } from 'svelte';
	import { ChevronRight, Link, Type } from 'lucide-svelte';
	import { Separator } from '$lib/components/ui/separator';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { backlinksStore } from './backlinks.store.svelte';
	import { computeUnlinkedMentionsForFile, fetchBacklinksV2 } from './backlinks.service';
	import LinkItem from './LinkItem.svelte';

	let linkedOpen = $state(true);
	let unlinkedOpen = $state(true);

	// Compute unlinked mentions on demand when the section is open and dirty
	$effect(() => {
		const dirty = backlinksStore.unlinkedDirty;
		const open = unlinkedOpen;
		const path = editorStore.activeTabPath;
		if (dirty && open && path) {
			untrack(() => computeUnlinkedMentionsForFile(path));
		}
	});

	// Refresh linked mentions on active path change OR on `vaultIndexVersion`
	// bumps (save / watcher / etc.). The active-tab tracker also fires
	// fetchBacklinksV2 on tab switch — both paths overwrite the same store
	// with the same result, so the duplication is wasteful but not incorrect.
	$effect(() => {
		const path = editorStore.activeTabPath;
		// Read so the effect re-runs on bump even if path is unchanged.
		const _version = vaultStore.vaultIndexVersion;
		if (!path) return;
		untrack(() => {
			fetchBacklinksV2(path).catch(() => { /* fetchBacklinksV2 already logs */ });
		});
	});
</script>

<div class="flex flex-col">
	<div class="flex items-center h-10 px-3 shrink-0">
		<h2 class="font-semibold uppercase tracking-wide text-primary">Backlinks</h2>
	</div>
	<Separator />
	<div class="max-h-[50vh] overflow-y-auto p-2">
		{#if editorStore.activeTab && editorStore.activeTab.fileType && editorStore.activeTab.fileType !== 'markdown'}
			<p class="text-muted-foreground px-2 py-4 text-center">Not available</p>
		{:else if vaultStore.isOpen && vaultStore.vaultIndexVersion === 0}
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
