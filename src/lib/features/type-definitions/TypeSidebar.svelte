<script lang="ts">
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import FileText from 'lucide-svelte/icons/file-text';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { typeDefinitionsStore } from './type-definitions.store.svelte';
	import { buildTypeSections, countInbox, type SidebarFilter, type TypeSection, type TypeSidebarNote } from './type-sidebar.logic';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import SidebarModeToggle from './SidebarModeToggle.svelte';
	import DailyNoteButton from '$lib/plugins/periodic-notes/DailyNoteButton.svelte';

	let filter = $state<SidebarFilter>('all');
	let sections = $state<TypeSection[]>([]);
	let untyped = $state<TypeSidebarNote[]>([]);
	let inboxCount = $state(0);
	let collapsedSections = $state<Set<string>>(new Set());
	let inboxEnabled = $derived(settingsStore.settings.explicitOrganization);
	let filterTabs = $derived([
		{ id: 'all' as SidebarFilter, label: 'All' },
		...(inboxEnabled ? [{ id: 'inbox' as SidebarFilter, label: 'Inbox' }] : []),
		{ id: 'archived' as SidebarFilter, label: 'Archived' },
		{ id: 'favorites' as SidebarFilter, label: 'Favorites' },
	]);

	$effect(() => {
		const _version = typeDefinitionsStore.entriesVersion;
		const entries = typeDefinitionsStore.entries;
		if (entries.length === 0) return;
		const result = buildTypeSections(entries, typeDefinitionsStore.typeMetadataMap, filter);
		sections = result.sections;
		untyped = result.untyped;
		inboxCount = countInbox(entries);
	});

	function rebuildFromCache() {
		const entries = typeDefinitionsStore.entries;
		const result = buildTypeSections(entries, typeDefinitionsStore.typeMetadataMap, filter);
		sections = result.sections;
		untyped = result.untyped;
		inboxCount = countInbox(entries);
	}

	function toggleSection(name: string) {
		const next = new Set(collapsedSections);
		if (next.has(name)) next.delete(name);
		else next.add(name);
		collapsedSections = next;
	}
</script>

<Tooltip.Provider delayDuration={400}>
<div class="flex flex-col h-full">
	<div class="flex items-center justify-end h-10 px-3 gap-0.5 bg-tab-bar shrink-0" data-tauri-drag-region>
		<div class="flex items-center gap-0.5">
			<DailyNoteButton />
			<SidebarModeToggle />
		</div>
	</div>
	<div class="flex items-center border-b border-border shrink-0">
		{#each filterTabs as f (f.id)}
			<button
				class="flex-1 px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer border-b-2 {filter === f.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => { filter = f.id as SidebarFilter; rebuildFromCache(); }}
			>
				{f.label}
				{#if f.id === 'inbox' && inboxCount > 0}
					<span class="ml-0.5 text-[10px] bg-primary/20 text-primary px-1 rounded-full">{inboxCount}</span>
				{/if}
			</button>
		{/each}
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

		{#if untyped.length > 0 && settingsStore.showUntypedNotes}
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
</Tooltip.Provider>
