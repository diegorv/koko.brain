<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import type { Snippet } from 'svelte';
	import { appendLog } from '$lib/utils/log.service';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { platformStore } from '$lib/core/platform/platform.store.svelte';
	import { searchStore } from '$lib/features/search/search.store.svelte';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { settingsPanelStore } from '$lib/core/settings/settings-panel.store.svelte';
	import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
	import { excludeSystemFolder } from '$lib/features/type-definitions/type-sidebar.logic';
	import { dockBadgeCount } from '$lib/features/dock-badge/dock-badge.logic';
	import { applyDockBadge } from '$lib/features/dock-badge/dock-badge.service';
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
	import { toggleLeftSidebar, toggleRightSidebar } from './layout.service';
	import { mobileLayoutStore } from './mobile-layout.store.svelte';
	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import PanelRight from '@lucide/svelte/icons/panel-right';
	import SettingsIcon from '@lucide/svelte/icons/settings';

	let { children }: { children: Snippet } = $props();

	// Keep the macOS dock badge in sync with the lifecycle inbox count.
	// Tracks the toggle and the vault entries version; the actual OS call
	// is wrapped in untrack() so the service's reads never become deps.
	// There is no dock on mobile, so the effect is skipped there.
	$effect(() => {
		if (platformStore.isMobile) return;
		const enabled = settingsStore.dockBadgeInboxCount;
		void typeDefinitionsStore.entriesVersion;
		const entries = excludeSystemFolder(
			typeDefinitionsStore.entries,
			vaultStore.path,
			settingsStore.templates.systemFolder,
		);
		const value = dockBadgeCount(enabled, entries);
		untrack(() => {
			applyDockBadge(value);
		});
	});

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

	function handleLeftPaneResize(size: number) {
		settingsStore.updateLayout({ leftPaneSize: size });
	}

	function handleMiddlePanelResize(size: number) {
		settingsStore.updateLayout({ middlePanelSize: size });
	}

	function handleRightSidebarResize(size: number) {
		settingsStore.updateLayout({ rightSidebarSize: size });
	}

	let showMiddlePanel = $derived(
		!searchStore.isOpen && settingsStore.layout.sidebarMode === 'types'
	);

	// Mobile: opening a file from the drawer should reveal the editor, so the
	// drawer closes whenever the active tab path changes. The store write is
	// untracked so the effect only depends on the path.
	$effect(() => {
		const path = editorStore.activeTabPath;
		untrack(() => {
			if (platformStore.isMobile && path !== null) mobileLayoutStore.closeDrawer();
		});
	});
</script>

{#if !vaultStore.isOpen}
	{@render children()}
{:else if platformStore.isMobile}
	<!--
		Touch layout (iOS / iPadOS): the editor fills the screen and the file
		explorer (or the search panel) slides in as an overlay drawer from the
		status-bar button. No resizable panes, no right sidebar, no traffic-light
		spacers. Safe-area insets keep the content clear of the notch and the
		home indicator (`viewport-fit=cover` in app.html).
	-->
	<div class="relative flex h-dvh flex-col bg-tab-bar pt-[env(safe-area-inset-top)]">
		<div class="relative min-h-0 flex-1 bg-card">
			<EditorView />
			{#if mobileLayoutStore.drawerOpen}
				<button
					type="button"
					class="absolute inset-0 z-20 bg-black/40"
					aria-label="Close sidebar"
					onclick={() => mobileLayoutStore.closeDrawer()}
				></button>
				<div
					class="absolute inset-y-0 left-0 z-30 flex w-[85%] max-w-sm flex-col overflow-hidden bg-file-explorer-bg shadow-xl"
					role="dialog"
					aria-label="Sidebar"
				>
					{#if searchStore.isOpen}
						<SearchPanel />
					{:else}
						<FileExplorer />
					{/if}
				</div>
			{/if}
		</div>
		<div class="shrink-0 bg-status-bar-bg pb-[env(safe-area-inset-bottom)]">
			<StatusBar>
				{#snippet left()}
					<button
						type="button"
						class="inline-flex size-6 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
						aria-label={mobileLayoutStore.drawerOpen ? 'Hide sidebar' : 'Show sidebar'}
						aria-pressed={mobileLayoutStore.drawerOpen}
						onclick={() => mobileLayoutStore.toggleDrawer()}
					>
						<PanelLeft class="size-4" />
					</button>
					<button
						type="button"
						class="inline-flex size-6 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
						aria-label="Open settings"
						onclick={() => settingsPanelStore.open()}
					>
						<SettingsIcon class="size-4" />
					</button>
					<SearchStatus />
				{/snippet}
				{#snippet right()}
					<SaveStatus />
					<WordCount />
				{/snippet}
			</StatusBar>
		</div>
	</div>
{:else}
	<div class="relative flex h-screen flex-col">
		<button
			class="absolute left-[82px] top-2 z-20 shrink-0 rounded-md size-6 inline-flex items-center justify-center hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 cursor-default"
			onclick={toggleLeftSidebar}
			title={settingsStore.layout.leftSidebarVisible ? 'Hide left sidebar' : 'Show left sidebar'}
		>
			<PanelLeft class="size-3.5" />
		</button>
		<button
			class="absolute right-2 top-[7px] z-20 shrink-0 rounded-md size-6 inline-flex items-center justify-center hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 cursor-default"
			onclick={toggleRightSidebar}
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
