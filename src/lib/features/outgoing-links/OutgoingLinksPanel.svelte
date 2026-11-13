<script lang="ts">
	import { untrack } from 'svelte';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import FileText from '@lucide/svelte/icons/file-text';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import SidebarSection from '#lib/core/layout/SidebarSection.svelte';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { openFileInEditor } from '#lib/core/editor/editor.service.js';
	import { outgoingLinksStore } from './outgoing-links.store.svelte';
	import { fetchOutgoingLinksV2 } from './outgoing-links.service';

	let expanded = $state(false);
	let lastFetchedPath = $state<string | null>(null);

	function handleOpenChange(open: boolean) {
		if (open) fetchData();
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

	// Refetch when the Rust VaultIndex changes (watcher / edits in another tab)
	// while the panel is open, so outgoing links don't go stale until the next
	// tab switch. Reads only `vaultIndexVersion` reactively; the fetch runs under
	// `untrack` so it doesn't subscribe to `activeTabPath` (the effect above owns
	// path changes). See CLAUDE.md "Reactive consumer pattern".
	$effect(() => {
		void vaultStore.vaultIndexVersion;
		untrack(() => {
			if (expanded) fetchData();
		});
	});
</script>

<div class="flex flex-col">
	<SidebarSection title="Outgoing links" bind:open={expanded} onOpenChange={handleOpenChange}>
		<div class="max-h-[50vh] overflow-y-auto">
			{#if editorStore.activeTab && editorStore.activeTab.fileType && editorStore.activeTab.fileType !== 'markdown'}
				<p class="text-meta text-right-sidebar-muted-fg px-2 py-4 text-center">Not available</p>
			{:else if outgoingLinksStore.outgoingLinks.length === 0}
				<p class="text-meta text-right-sidebar-muted-fg px-2 py-4 text-center">No outgoing links</p>
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
									<span class="text-row truncate">{link.alias ?? link.target}</span>
									{#if link.heading}
										<span class="text-row text-right-sidebar-muted-fg truncate">› {link.heading}</span>
									{/if}
								</div>
							</button>
						{:else}
							<div class="flex items-center gap-1.5 rounded-md px-2 py-1 opacity-60">
								<AlertCircle class="size-3.5 shrink-0 text-destructive" />
								<span class="text-row truncate text-destructive">{link.alias ?? link.target}</span>
								{#if link.heading}
									<span class="text-row text-right-sidebar-muted-fg truncate">› {link.heading}</span>
								{/if}
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	</SidebarSection>
</div>
