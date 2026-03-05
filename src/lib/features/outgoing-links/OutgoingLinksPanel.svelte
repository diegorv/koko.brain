<script lang="ts">
	import { ChevronRight, ExternalLink, Type, FileText, AlertCircle } from 'lucide-svelte';
	import { Separator } from '$lib/components/ui/separator';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { outgoingLinksStore } from './outgoing-links.store.svelte';

	let linksOpen = $state(true);
	let unlinkedOpen = $state(true);
</script>

<div class="flex flex-col">
	<div class="flex items-center h-10 px-3 shrink-0">
		<h2 class="font-semibold uppercase tracking-wide text-primary">Outgoing links</h2>
	</div>
	<Separator />
	<div class="max-h-[50vh] overflow-y-auto p-2">
		{#if editorStore.activeTab && editorStore.activeTab.fileType && editorStore.activeTab.fileType !== 'markdown'}
			<p class="text-muted-foreground px-2 py-4 text-center">Not available</p>
		{:else if outgoingLinksStore.outgoingLinks.length === 0 && outgoingLinksStore.unlinkedMentions.length === 0}
			<p class="text-muted-foreground px-2 py-4 text-center">No outgoing links</p>
		{:else}
			<Collapsible.Root bind:open={linksOpen}>
				<Collapsible.Trigger class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 font-medium hover:bg-accent transition-colors cursor-pointer">
					<ChevronRight class="size-3.5 shrink-0 transition-transform {linksOpen ? 'rotate-90' : ''}" />
					<ExternalLink class="size-3.5 shrink-0 text-muted-foreground" />
					<span>Links</span>
					<span class="ml-auto text-muted-foreground">{outgoingLinksStore.outgoingLinks.length}</span>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<div class="pl-2 mt-1 space-y-0.5">
						{#each outgoingLinksStore.outgoingLinks as link (link.target + link.position)}
							{#if link.resolvedPath}
								<button
									class="w-full text-left rounded-md px-2 py-1 hover:bg-accent transition-colors cursor-pointer"
									onclick={() => openFileInEditor(link.resolvedPath!)}
								>
									<div class="flex items-center gap-1.5">
										<FileText class="size-3.5 shrink-0 text-muted-foreground" />
										<span class="text-[14px] truncate">{link.alias ?? link.target}</span>
										{#if link.heading}
											<span class="text-[14px] text-muted-foreground truncate">› {link.heading}</span>
										{/if}
									</div>
								</button>
							{:else}
								<div class="flex items-center gap-1.5 rounded-md px-2 py-1 opacity-60">
									<AlertCircle class="size-3.5 shrink-0 text-destructive" />
									<span class="text-[14px] truncate text-destructive">{link.alias ?? link.target}</span>
									{#if link.heading}
										<span class="text-[14px] text-muted-foreground truncate">› {link.heading}</span>
									{/if}
								</div>
							{/if}
						{/each}
					</div>
				</Collapsible.Content>
			</Collapsible.Root>

			{#if outgoingLinksStore.unlinkedMentions.length > 0}
				<Collapsible.Root bind:open={unlinkedOpen} class="mt-2">
					<Collapsible.Trigger class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 font-medium hover:bg-accent transition-colors cursor-pointer">
						<ChevronRight class="size-3.5 shrink-0 transition-transform {unlinkedOpen ? 'rotate-90' : ''}" />
						<Type class="size-3.5 shrink-0 text-muted-foreground" />
						<span>Unlinked mentions</span>
						<span class="ml-auto text-muted-foreground">{outgoingLinksStore.unlinkedMentions.length}</span>
					</Collapsible.Trigger>
					<Collapsible.Content>
						<div class="pl-2 mt-1 space-y-0.5">
							{#each outgoingLinksStore.unlinkedMentions as mention (mention.notePath)}
								<button
									class="w-full text-left rounded-md px-2 py-1 hover:bg-accent transition-colors cursor-pointer"
									onclick={() => openFileInEditor(mention.notePath)}
								>
									<div class="flex items-center gap-1.5">
										<FileText class="size-3.5 shrink-0 text-muted-foreground" />
										<span class="text-[14px] truncate">{mention.noteName}</span>
										<span class="text-[14px] ml-auto text-muted-foreground">{mention.count}</span>
									</div>
								</button>
							{/each}
						</div>
					</Collapsible.Content>
				</Collapsible.Root>
			{/if}
		{/if}
	</div>
</div>
