<script lang="ts">
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import Link from 'lucide-svelte/icons/link';
	import GitBranch from 'lucide-svelte/icons/git-branch';
	import { Separator } from '$lib/components/ui/separator';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { backlinksStore } from './backlinks.store.svelte';
	import { fetchBacklinksV2, fetchRelationshipBacklinks } from './backlinks.service';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import LinkItem from './LinkItem.svelte';

	let expanded = $state(false);
	let linkedOpen = $state(true);
	let relationshipsOpen = $state(true);
	let lastFetchedPath = $state<string | null>(null);

	function handleExpand() {
		if (!expanded) fetchData();
	}

	function fetchData() {
		const path = editorStore.activeTabPath;
		if (!path) return;
		lastFetchedPath = path;
		fetchBacklinksV2(path).catch(() => {});
		fetchRelationshipBacklinks(path).catch(() => {});
	}

	$effect(() => {
		const path = editorStore.activeTabPath;
		if (path !== lastFetchedPath && expanded) {
			expanded = false;
			backlinksStore.reset();
		}
	});
</script>

<div class="flex flex-col">
	<Collapsible.Root bind:open={expanded}>
		<Collapsible.Trigger
			class="flex w-full items-center h-10 px-3 shrink-0 hover:bg-accent/50 transition-colors cursor-pointer"
			onclick={handleExpand}
		>
			<ChevronRight class="size-3.5 shrink-0 text-muted-foreground transition-transform {expanded ? 'rotate-90' : ''}" />
			<h2 class="ml-1.5 font-semibold uppercase tracking-wide text-primary">Backlinks</h2>
		</Collapsible.Trigger>
		<Collapsible.Content>
			<Separator />
			<div class="max-h-[50vh] overflow-y-auto p-2">
				{#if editorStore.activeTab && editorStore.activeTab.fileType && editorStore.activeTab.fileType !== 'markdown'}
					<p class="text-muted-foreground px-2 py-4 text-center">Not available</p>
				{:else if vaultStore.isOpen && vaultStore.vaultIndexVersion === 0}
					<p class="text-muted-foreground px-2 py-4 text-center">Indexing vault...</p>
				{:else if backlinksStore.linkedMentions.length === 0}
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

					{#if backlinksStore.relationshipBacklinks.length > 0}
						<Collapsible.Root bind:open={relationshipsOpen} class="mt-2">
							<Collapsible.Trigger class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 font-medium hover:bg-accent transition-colors cursor-pointer">
								<ChevronRight class="size-3.5 shrink-0 transition-transform {relationshipsOpen ? 'rotate-90' : ''}" />
								<GitBranch class="size-3.5 shrink-0 text-muted-foreground" />
								<span>Relationships</span>
								<span class="ml-auto text-muted-foreground">{backlinksStore.relationshipBacklinks.length}</span>
							</Collapsible.Trigger>
							<Collapsible.Content>
								<div class="pl-2 mt-1 space-y-0.5">
									{#each backlinksStore.relationshipBacklinks as rel (rel.sourcePath + rel.relationshipType)}
										<button
											class="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-accent transition-colors text-left cursor-pointer"
											onclick={() => openFileInEditor(rel.sourcePath)}
										>
											<span class="truncate">{rel.sourceName}</span>
											<span class="ml-auto text-xs text-muted-foreground shrink-0">{rel.relationshipType.replace('_', ' ')}</span>
										</button>
									{/each}
								</div>
							</Collapsible.Content>
						</Collapsible.Root>
					{/if}
				{/if}
			</div>
		</Collapsible.Content>
	</Collapsible.Root>
</div>
