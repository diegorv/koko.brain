<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import FileText from '@lucide/svelte/icons/file-text';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import { Separator } from '$lib/components/ui/separator';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { outgoingLinksStore } from './outgoing-links.store.svelte';
	import { fetchOutgoingLinksV2 } from './outgoing-links.service';

	let expanded = $state(false);
	let lastFetchedPath = $state<string | null>(null);

	function handleExpand() {
		if (!expanded) fetchData();
	}

	function fetchData() {
		const path = editorStore.activeTabPath;
		if (!path) return;
		lastFetchedPath = path;
		const content = editorStore.activeTab?.content ?? '';
		fetchOutgoingLinksV2(path, content).catch(() => {});
	}

	$effect(() => {
		const path = editorStore.activeTabPath;
		if (path !== lastFetchedPath && expanded) {
			expanded = false;
			outgoingLinksStore.reset();
		}
	});
</script>

<div class="flex flex-col">
	<Collapsible.Root bind:open={expanded}>
		<Collapsible.Trigger
			class="flex w-full items-center h-10 px-3 shrink-0 hover:bg-right-sidebar-accent/50 transition-colors cursor-pointer"
			onclick={handleExpand}
		>
			<ChevronRight class="size-3.5 shrink-0 text-right-sidebar-muted-fg transition-transform {expanded ? 'rotate-90' : ''}" />
			<h2 class="ml-1.5 font-semibold uppercase tracking-wide text-right-sidebar-primary">Outgoing links</h2>
		</Collapsible.Trigger>
		<Collapsible.Content>
			<div class="max-h-[50vh] overflow-y-auto p-2">
				{#if editorStore.activeTab && editorStore.activeTab.fileType && editorStore.activeTab.fileType !== 'markdown'}
					<p class="text-right-sidebar-muted-fg px-2 py-4 text-center">Not available</p>
				{:else if outgoingLinksStore.outgoingLinks.length === 0}
					<p class="text-right-sidebar-muted-fg px-2 py-4 text-center">No outgoing links</p>
				{:else}
					<div class="space-y-0.5">
						{#each outgoingLinksStore.outgoingLinks as link (link.target + link.position)}
							{#if link.resolvedPath}
								<button
									class="w-full text-left rounded-md px-2 py-1 hover:bg-right-sidebar-accent transition-colors cursor-pointer"
									onclick={() => openFileInEditor(link.resolvedPath!)}
								>
									<div class="flex items-center gap-1.5">
										<FileText class="size-3.5 shrink-0 text-right-sidebar-muted-fg" />
										<span class="text-[14px] truncate">{link.alias ?? link.target}</span>
										{#if link.heading}
											<span class="text-[14px] text-right-sidebar-muted-fg truncate">› {link.heading}</span>
										{/if}
									</div>
								</button>
							{:else}
								<div class="flex items-center gap-1.5 rounded-md px-2 py-1 opacity-60">
									<AlertCircle class="size-3.5 shrink-0 text-destructive" />
									<span class="text-[14px] truncate text-destructive">{link.alias ?? link.target}</span>
									{#if link.heading}
										<span class="text-[14px] text-right-sidebar-muted-fg truncate">› {link.heading}</span>
									{/if}
								</div>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		</Collapsible.Content>
	</Collapsible.Root>
</div>
