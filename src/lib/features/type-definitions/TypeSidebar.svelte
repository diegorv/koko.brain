<script lang="ts">
	import { untrack } from 'svelte';
	import { invoke } from '@tauri-apps/api/core';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import FileText from 'lucide-svelte/icons/file-text';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { typeDefinitionsStore } from './type-definitions.store.svelte';
	import { buildTypeSections, countInbox, type SidebarFilter, type TypeSection, type TypeSidebarNote } from './type-sidebar.logic';
	import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

	let filter = $state<SidebarFilter>('all');
	let sections = $state<TypeSection[]>([]);
	let untyped = $state<TypeSidebarNote[]>([]);
	let inboxCount = $state(0);
	let collapsedSections = $state<Set<string>>(new Set());

	$effect(() => {
		const _version = vaultStore.vaultIndexVersion;
		if (!vaultStore.isOpen) return;
		untrack(() => {
			rebuildSections();
		});
	});

	async function rebuildSections() {
		try {
			const entries = await invoke<NoteEntryV2[]>('get_all_vault_entries_v2');
			const result = buildTypeSections(entries, typeDefinitionsStore.typeMetadataMap, filter);
			sections = result.sections;
			untyped = result.untyped;
			inboxCount = countInbox(entries);
		} catch { /* service already logs */ }
	}

	function toggleSection(name: string) {
		const next = new Set(collapsedSections);
		if (next.has(name)) next.delete(name);
		else next.add(name);
		collapsedSections = next;
	}
</script>

<div class="flex flex-col h-full">
	<div class="flex items-center gap-1 px-2 py-1.5 border-b border-border">
		<button
			class="px-2 py-0.5 text-xs rounded {filter === 'all' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'} cursor-pointer"
			onclick={() => { filter = 'all'; rebuildSections(); }}
		>All</button>
		<button
			class="px-2 py-0.5 text-xs rounded {filter === 'inbox' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'} cursor-pointer"
			onclick={() => { filter = 'inbox'; rebuildSections(); }}
		>
			Inbox
			{#if inboxCount > 0}
				<span class="ml-0.5 text-[10px] bg-primary/20 text-primary px-1 rounded-full">{inboxCount}</span>
			{/if}
		</button>
		<button
			class="px-2 py-0.5 text-xs rounded {filter === 'archived' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'} cursor-pointer"
			onclick={() => { filter = 'archived'; rebuildSections(); }}
		>Archived</button>
		<button
			class="px-2 py-0.5 text-xs rounded {filter === 'favorites' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'} cursor-pointer"
			onclick={() => { filter = 'favorites'; rebuildSections(); }}
		>Favorites</button>
	</div>

	<div class="flex-1 overflow-y-auto px-1 py-1">
		{#each sections as section (section.metadata.name)}
			{@const collapsed = collapsedSections.has(section.metadata.name)}
			<div class="mb-1">
				<button
					class="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
					onclick={() => toggleSection(section.metadata.name)}
				>
					<ChevronRight class="size-3 shrink-0 transition-transform {collapsed ? '' : 'rotate-90'}" />
					<span class="truncate" style="color: var(--color-{section.metadata.color}, inherit)">
						{section.metadata.sidebarLabel}
					</span>
					<span class="ml-auto text-xs text-muted-foreground">{section.notes.length}</span>
				</button>
				{#if !collapsed}
					<div class="pl-4">
						{#each section.notes as note (note.path)}
							<button
								class="flex w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors truncate cursor-pointer"
								onclick={() => openFileInEditor(note.path)}
							>
								{note.title}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/each}

		{#if untyped.length > 0}
			{@const untypedCollapsed = collapsedSections.has('__untyped')}
			<div class="mb-1 mt-2 border-t border-border pt-1">
				<button
					class="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
					onclick={() => toggleSection('__untyped')}
				>
					<ChevronRight class="size-3 shrink-0 transition-transform {untypedCollapsed ? '' : 'rotate-90'}" />
					<FileText class="size-3.5 shrink-0" />
					<span>Untyped</span>
					<span class="ml-auto text-xs">{untyped.length}</span>
				</button>
				{#if !untypedCollapsed}
					<div class="pl-4">
						{#each untyped as note (note.path)}
							<button
								class="flex w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors truncate cursor-pointer"
								onclick={() => openFileInEditor(note.path)}
							>
								{note.title}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
