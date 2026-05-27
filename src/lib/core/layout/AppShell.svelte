<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { Snippet } from 'svelte';
	import { appendLog } from '$lib/utils/log.service';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { searchStore } from '$lib/features/search/search.store.svelte';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import * as Resizable from '$lib/components/ui/resizable';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';
	import FileExplorer from '$lib/core/file-explorer/FileExplorer.svelte';
	import TypeSidebar from '$lib/features/type-definitions/TypeSidebar.svelte';
	import TypeNoteList from '$lib/features/type-definitions/TypeNoteList.svelte';
	import EditorView from '$lib/core/markdown-editor/EditorView.svelte';
	import BacklinksPanel from '$lib/features/backlinks/BacklinksPanel.svelte';
	import OutgoingLinksPanel from '$lib/features/outgoing-links/OutgoingLinksPanel.svelte';
	import PropertiesView from '$lib/features/properties/PropertiesView.svelte';
	import SearchPanel from '$lib/features/search/SearchPanel.svelte';
	import CalendarPanel from '$lib/plugins/calendar/CalendarPanel.svelte';
	import TableOfContentsPanel from '$lib/plugins/table-of-contents/TableOfContentsPanel.svelte';
	import StatusBar from '$lib/core/status-bar/StatusBar.svelte';
	import WordCount from '$lib/plugins/word-count/WordCount.svelte';
	import SearchStatus from '$lib/features/search/SearchStatus.svelte';
	import SaveStatus from '$lib/core/status-bar/SaveStatus.svelte';
	import SemanticIndexStatus from '$lib/core/status-bar/SemanticIndexStatus.svelte';
	import { saveSettings } from '$lib/core/settings/settings.service';
	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import PanelRight from '@lucide/svelte/icons/panel-right';
	import { debounce } from '$lib/utils/debounce';
	import { error } from '$lib/utils/debug';

	let { children }: { children: Snippet } = $props();

	// [FE-STARTUP-PROBE]
	onMount(async () => {
		appendLog('FE-STARTUP-PROBE', 'AppShell: onMount fired (DOM mounted)');
		await tick();
		appendLog('FE-STARTUP-PROBE', 'AppShell: after first tick (Svelte initial paint done)');
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				appendLog('FE-STARTUP-PROBE', 'AppShell: after 2 RAFs (browser painted)');
			});
		});
	});

	const debouncedSave = debounce(() => {
		if (vaultStore.path) {
			saveSettings(vaultStore.path).catch((err) =>
				error('LAYOUT', 'Failed to save pane sizes:', err)
			);
		}
	}, 300);

	function handleLeftPaneResize(size: number) {
		settingsStore.updateLayout({ leftPaneSize: size });
		debouncedSave();
	}

	function handleMiddlePanelResize(size: number) {
		settingsStore.updateLayout({ middlePanelSize: size });
		debouncedSave();
	}

	function handleRightSidebarResize(size: number) {
		settingsStore.updateLayout({ rightSidebarSize: size });
		debouncedSave();
	}

	let showMiddlePanel = $derived(
		!searchStore.isOpen && settingsStore.layout.sidebarMode === 'types'
	);

</script>

{#if !vaultStore.isOpen}
	{@render children()}
{:else}
	<div class="relative flex h-screen flex-col">
		<button
			class="absolute left-[82px] top-2 z-20 shrink-0 rounded-md size-6 inline-flex items-center justify-center hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 cursor-default"
			onclick={() => { const v = settingsStore.layout.leftSidebarVisible; settingsStore.updateLayout({ leftSidebarVisible: !v }); }}
			title={settingsStore.layout.leftSidebarVisible ? 'Hide left sidebar' : 'Show left sidebar'}
		>
			<PanelLeft class="size-3.5" />
		</button>
		<button
			class="absolute right-2 top-[7px] z-20 shrink-0 rounded-md size-6 inline-flex items-center justify-center hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 cursor-default"
			onclick={() => { const v = settingsStore.layout.rightSidebarVisible; settingsStore.updateLayout({ rightSidebarVisible: !v }); }}
			title={settingsStore.layout.rightSidebarVisible ? 'Hide right sidebar' : 'Show right sidebar'}
		>
			<PanelRight class="size-3.5" />
		</button>
		<Resizable.PaneGroup direction="horizontal" class="flex-1 bg-card">
			<Resizable.Pane class="overflow-hidden">
				<Resizable.PaneGroup direction="horizontal" class="h-full">
					{#if !settingsStore.layout.leftSidebarVisible && !settingsStore.layout.rightSidebarVisible}
						<div class="flex flex-col w-[116px] shrink-0">
							<div class="h-10 bg-tab-bar shrink-0" style="box-shadow: inset 0 -1px 0 var(--divider)"></div>
							<div class="flex-1 bg-editor-bg"></div>
						</div>
					{/if}
					{#if settingsStore.layout.leftSidebarVisible}
						<Resizable.Pane
							order={1}
							defaultSize={settingsStore.layout.leftPaneSize}
							minSize={3}
							maxSize={40}
							onResize={handleLeftPaneResize}
						>
							{#if searchStore.isOpen}
								<SearchPanel />
							{:else if settingsStore.layout.sidebarMode === 'calendar'}
								<CalendarPanel />
							{:else if settingsStore.layout.sidebarMode === 'types'}
								<TypeSidebar />
							{:else}
								<FileExplorer />
							{/if}
						</Resizable.Pane>

						<Resizable.Handle />
					{/if}

					{#if showMiddlePanel && settingsStore.layout.leftSidebarVisible}
						<Resizable.Pane
							order={2}
							defaultSize={settingsStore.layout.middlePanelSize}
							minSize={8}
							maxSize={35}
							onResize={handleMiddlePanelResize}
						>
							<TypeNoteList />
						</Resizable.Pane>

						<Resizable.Handle />
					{/if}

					<Resizable.Pane order={3}>
						<EditorView />
					</Resizable.Pane>

					{#if settingsStore.layout.rightSidebarVisible}
						<Resizable.Handle />

						<Resizable.Pane
							order={4}
							defaultSize={settingsStore.layout.rightSidebarSize}
							minSize={5}
							maxSize={30}
							onResize={handleRightSidebarResize}
						>
							<div class="flex h-full flex-col text-[15px] bg-right-sidebar-bg text-right-sidebar-fg">
								<div class="h-10 shrink-0 bg-tab-bar" style="box-shadow: inset 0 -1px 0 var(--divider)" data-tauri-drag-region></div>
								<ScrollArea class="min-h-0 flex-1">
									{#if settingsStore.layout.propertiesVisible}
										<PropertiesView />
									{/if}
									{#if settingsStore.layout.tableOfContentsVisible}
										<TableOfContentsPanel />
										<Separator />
									{/if}
									{#if settingsStore.layout.backlinksVisible}
										<BacklinksPanel />
									{/if}
									{#if settingsStore.layout.outgoingLinksVisible}
										<OutgoingLinksPanel />
									{/if}
								</ScrollArea>
							</div>
						</Resizable.Pane>
					{/if}
						{#if !settingsStore.layout.rightSidebarVisible && !settingsStore.layout.leftSidebarVisible}
							<div class="flex flex-col w-[116px] shrink-0">
								<div class="h-10 bg-tab-bar shrink-0" style="box-shadow: inset 0 -1px 0 var(--divider)"></div>
								<div class="flex-1 bg-editor-bg"></div>
							</div>
						{/if}
				</Resizable.PaneGroup>
			</Resizable.Pane>

		</Resizable.PaneGroup>

		<StatusBar>
			{#snippet left()}
				<SearchStatus />
				<SemanticIndexStatus />
			{/snippet}
			{#snippet right()}
				<SaveStatus />
				<WordCount />
			{/snippet}
		</StatusBar>
	</div>
{/if}
