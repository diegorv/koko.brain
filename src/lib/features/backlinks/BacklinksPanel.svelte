<script lang="ts">
	import { untrack } from 'svelte';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import Link from 'lucide-svelte/icons/link';
	import GitBranch from 'lucide-svelte/icons/git-branch';
	import Type from 'lucide-svelte/icons/type';
	import { Separator } from '$lib/components/ui/separator';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { backlinksStore } from './backlinks.store.svelte';
	import { computeUnlinkedMentionsForFile, fetchBacklinksV2, fetchRelationshipBacklinks } from './backlinks.service';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { debounce } from '$lib/utils/debounce';
	import LinkItem from './LinkItem.svelte';

	let linkedOpen = $state(true);
	let relationshipsOpen = $state(true);
	let unlinkedOpen = $state(true);

	// 150 ms coalesce window matches +layout.svelte's tab-switch debounce.
	// During a burst-open (5 files in <200 ms) the panel effect re-fires
	// for every path change; without this debounce each fire dispatches
	// an IPC, queueing on the Tauri command bus. With the debounce only
	// the LAST path triggers a fetch — combined with `dedupeInflight` in
	// the service this collapses 5 burst opens into 1 fetch per panel.
	const refetchBacklinks = debounce((path: string) => {
		fetchBacklinksV2(path).catch(() => { /* fetchBacklinksV2 already logs */ });
		fetchRelationshipBacklinks(path).catch(() => { /* already logs */ });
	}, 150);

	const recomputeUnlinked = debounce((path: string) => {
		computeUnlinkedMentionsForFile(path).catch(() => { /* already logs */ });
	}, 150);

	// Compute unlinked mentions on demand when the section is open and dirty
	$effect(() => {
		const dirty = backlinksStore.unlinkedDirty;
		const open = unlinkedOpen;
		const path = editorStore.activeTabPath;
		if (dirty && open && path) {
			untrack(() => recomputeUnlinked(path));
		} else {
			untrack(() => recomputeUnlinked.cancel());
		}
	});

	// Refresh linked mentions on active path change OR on `vaultIndexVersion`
	// bumps (save / watcher / etc.). +layout.svelte's tab-switch effect also
	// fires fetchBacklinksV2 — both paths land on the same `dedupeInflight`-
	// wrapped function, so duplicate IPCs collapse before reaching Rust.
	$effect(() => {
		const path = editorStore.activeTabPath;
		// Read so the effect re-runs on bump even if path is unchanged.
		const _version = vaultStore.vaultIndexVersion;
		if (!path) {
			untrack(() => refetchBacklinks.cancel());
			return;
		}
		untrack(() => refetchBacklinks(path));
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
