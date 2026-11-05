<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import type { Snippet } from 'svelte';
	import { appendLog } from '#lib/utils/log.service.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import { collectViewFiles, excludeSystemFolder } from '#lib/features/type-definitions/type-sidebar.logic.js';
	import { dockBadgeCount } from '#lib/features/dock-badge/dock-badge.logic.js';
	import { applyDockBadge } from '#lib/features/dock-badge/dock-badge.service.js';
	import * as Resizable from '#lib/components/ui/resizable/index.js';
	import { ScrollArea } from '#lib/components/ui/scroll-area/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import Rail from '#lib/features/rail-shell/Rail.svelte';
	import RailNoteList from '#lib/features/rail-shell/RailNoteList.svelte';
	import TypesNavigator from '#lib/features/rail-shell/TypesNavigator.svelte';
	import FilesNavigator from '#lib/features/rail-shell/FilesNavigator.svelte';
	import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
	import { neighbourhoodStore } from '#lib/features/rail-shell/neighbourhood.store.svelte.js';
	import {
		FILES_RAIL_ITEM,
		parseExpandedFolders,
		pickedFolderLens,
		staleFolderPickFix,
		toggleExpandedFolder,
		pickedTypesLens,
		pinnedRailItems,
		restoreRailItem,
		SEARCH_LENS,
		INITIAL_TYPES_PICK_CHECK,
		staleRailPinFix,
		staleTypesPickFix,
		stepTypesPickCheck,
		TYPES_RAIL_ITEM,
		typeNavigatorRows,
		viewNavigatorRows,
	} from '#lib/features/rail-shell/lens.logic.js';
	import type { TypesPickCheck } from '#lib/features/rail-shell/lens.logic.js';
	import { parseRailHidden } from '#lib/features/rail-shell/rail-items.logic.js';
	import EditorView from '#lib/app/EditorView.svelte';
	import { selectRailItem } from '#lib/app/rail-navigation.js';
	import BacklinksPanel from '#lib/features/backlinks/BacklinksPanel.svelte';
	import OutgoingLinksPanel from '#lib/features/outgoing-links/OutgoingLinksPanel.svelte';
	import NoteInfo from '#lib/features/properties/NoteInfo.svelte';
	import PropertiesView from '#lib/features/properties/PropertiesView.svelte';
	import SearchPanel from '#lib/features/search/SearchPanel.svelte';
	import TableOfContentsPanel from '#lib/plugins/table-of-contents/TableOfContentsPanel.svelte';
	import StatusBar from '#lib/core/status-bar/StatusBar.svelte';
	import WordCount from '#lib/plugins/word-count/WordCount.svelte';
	import SearchStatus from '#lib/features/search/SearchStatus.svelte';
	import SaveStatus from '#lib/core/status-bar/SaveStatus.svelte';
	import SemanticIndexStatus from '#lib/features/search/SemanticIndexStatus.svelte';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { toggleRightSidebar } from '#lib/core/layout/layout.service.js';
	import { hidesRightSidebar, isRightSidebarShown } from '#lib/core/layout/layout.logic.js';
	import PanelRight from '@lucide/svelte/icons/panel-right';

	let { children }: { children: Snippet } = $props();

	let rightSidebarShown = $derived(isRightSidebarShown(settingsStore.layout.rightSidebarVisible, editorStore.activeTabPath));

	// Keep the macOS dock badge in sync with the lifecycle inbox count.
	// Tracks the toggle and the vault entries version; the actual OS call
	// is wrapped in untrack() so the service's reads never become deps.
	$effect(() => {
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

	function handleRightSidebarResize(size: number) {
		settingsStore.updateLayout({ rightSidebarSize: size });
	}

	function handleNoteListResize(size: number) {
		settingsStore.updateLayout({ noteListSize: size });
	}

	function handleNavigatorResize(size: number) {
		settingsStore.updateLayout({ navigatorSize: size });
	}

	/** The rail shell's highlighted rail item and its lens, restored from layout settings; Today while the saved item is hidden */
	let railItem = $derived(
		restoreRailItem(
			settingsStore.layout.railItem,
			railRegistryStore.navigators,
			neighbourhoodStore.notePath,
			parseRailHidden(settingsStore.layout.railHidden),
		),
	);
	let showsTypesNavigator = $derived(railItem.item === TYPES_RAIL_ITEM);
	let showsFilesNavigator = $derived(railItem.item === FILES_RAIL_ITEM);
	/** The plugin-registered navigator (Calendar) of the active rail item, if any; its lens is `railItem.lens` */
	let registeredNavigator = $derived(railRegistryStore.navigators.find((n) => n.id === railItem.item) ?? null);
	/** Whether a navigator pane sits between the rail and the note list */
	let showsNavigator = $derived(showsTypesNavigator || showsFilesNavigator || registeredNavigator !== null);
	/**
	 * The tree's `.view` paths, as one string: a tree replacement that keeps the same
	 * views stops here, so the rows (and the Types navigator's view recount) do not re-run.
	 */
	let viewFilesKey = $derived(collectViewFiles(fsStore.fileTree).map((v) => v.path).join('\n'));
	/** The Views rows, rebuilt from the tree (untracked) only when its `.view` paths or the entries change */
	let viewRows = $derived.by(() => {
		void viewFilesKey;
		void typeDefinitionsStore.entriesVersion;
		return viewNavigatorRows(untrack(() => fsStore.fileTree), typeDefinitionsStore.entriesByPath);
	});
	/** The type rows: bound to the entries only, never to the tree */
	let entryTypeRows = $derived.by(() => {
		void typeDefinitionsStore.entriesVersion;
		return typeNavigatorRows(
			{
				entries: typeDefinitionsStore.entries,
				vaultPath: vaultStore.path,
				systemFolder: settingsStore.templates.systemFolder,
				typeMetadataMap: typeDefinitionsStore.typeMetadataMap,
			},
			settingsStore.showUntypedNotes,
		);
	});
	/** The Types navigator's rows (views, then types); also what the saved Types pick is checked against */
	let typeRows = $derived([...viewRows, ...entryTypeRows]);
	/** The lens filling the note list: the navigator's pick on the Types and Files items, else the item's own (a registered navigator's pick) */
	let railLens = $derived(
		showsTypesNavigator
			? pickedTypesLens(settingsStore.layout.railTypesLens, typeRows)
			: showsFilesNavigator
				? pickedFolderLens(settingsStore.layout.railFolder)
				: railItem.lens,
	);

	// A saved Types pick that no longer exists falls back once per vault open, when its
	// first entries snapshot lands (gate: stepTypesPickCheck). Not on every refresh: the
	// refresh is throttled, so a type just created or renamed is missing for a few seconds.
	// The Files pick and expanded folders are checked at the same moment: the tree is loaded
	// before the index turns ready (initializeVault step 4). So is a saved rail pin that is no
	// longer pinned, which is kept while the index loads.
	let typesPickCheck: TypesPickCheck = INITIAL_TYPES_PICK_CHECK;
	$effect(() => {
		const step = stepTypesPickCheck(typesPickCheck, {
			vaultPath: vaultStore.path,
			indexReady: vaultStore.indexReady,
			entriesVersion: typeDefinitionsStore.entriesVersion,
		});
		typesPickCheck = step.next;
		const rows = typeRows;
		if (!step.run) return;
		untrack(() => {
			const layout = settingsStore.layout;
			const viewPaths = collectViewFiles(fsStore.fileTree).map((v) => v.path);
			const typesFix = staleTypesPickFix(layout.railItem, layout.railTypesLens, rows, viewPaths);
			const folderFix = vaultStore.path
				? staleFolderPickFix(layout.railItem, layout.railFolder, layout.railExpandedFolders, fsStore.fileTree, vaultStore.path)
				: null;
			const pinFix = staleRailPinFix(layout.railItem, pinnedRailItems(typeDefinitionsStore.entries, typeDefinitionsStore.typeMetadataMap));
			if (typesFix || folderFix || pinFix) settingsStore.updateLayout({ ...typesFix, ...folderFix, ...pinFix });
		});
	});

</script>

{#if !vaultStore.isOpen}
	{@render children()}
{:else}
	<div class="relative flex h-screen flex-col">
		<!-- The Calendar, Tasks, Tags and Graph tabs always hide the right sidebar, so its toggle would do nothing there. -->
		{#if !hidesRightSidebar(editorStore.activeTabPath)}
			<button
				class="absolute right-2 top-[7px] z-20 shrink-0 rounded-md size-6 inline-flex items-center justify-center hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 cursor-default"
				onclick={toggleRightSidebar}
				title={settingsStore.layout.rightSidebarVisible ? 'Hide right sidebar' : 'Show right sidebar'}
			>
				<PanelRight class="size-3.5" />
			</button>
		{/if}
		<Resizable.PaneGroup direction="horizontal" class="flex-1 bg-card">
			<Resizable.Pane class="overflow-hidden">
				<Resizable.PaneGroup direction="horizontal" class="h-full">
					<Rail
						activeItem={railItem.item}
						onSelect={(key, pin) => selectRailItem({ key, pin })}
					/>
					{#if settingsStore.layout.railPanelsVisible}
						{#if showsNavigator}
							<Resizable.Pane
								order={1}
								defaultSize={settingsStore.layout.navigatorSize}
								minSize={3}
								maxSize={30}
								onResize={handleNavigatorResize}
							>
								{#if registeredNavigator}
									<registeredNavigator.component />
								{:else if showsTypesNavigator}
									<TypesNavigator
										rows={typeRows}
										picked={railLens}
										onPick={(lens) => settingsStore.updateLayout({ railTypesLens: { ...lens } })}
									/>
								{:else}
									<FilesNavigator
										picked={railLens}
										expanded={parseExpandedFolders(settingsStore.layout.railExpandedFolders)}
										onPick={(lens) => settingsStore.updateLayout({ railFolder: lens.target ?? null })}
										onToggle={(path) =>
											settingsStore.updateLayout({
												railExpandedFolders: toggleExpandedFolder(settingsStore.layout.railExpandedFolders, path),
											})}
										onPickView={(lens) => settingsStore.updateLayout({ railItem: TYPES_RAIL_ITEM, railTypesLens: { ...lens } })}
									/>
								{/if}
							</Resizable.Pane>

							<Resizable.Handle />
						{/if}
						<Resizable.Pane
							order={2}
							defaultSize={settingsStore.layout.noteListSize}
							minSize={3}
							maxSize={40}
							onResize={handleNoteListResize}
						>
							{#if railLens.kind === SEARCH_LENS.kind}
								<SearchPanel firstPane={!showsNavigator} />
							{:else}
								<RailNoteList lens={railLens} firstPane={!showsNavigator} />
							{/if}
						</Resizable.Pane>

						<Resizable.Handle />
					{:else}
						<!-- The macOS traffic lights overflow the 48 px rail; this keeps the editor tabs clear of them. -->
						<div class="flex w-6 shrink-0 flex-col" data-rail-traffic-light-spacer>
							<div class="h-10 shrink-0 bg-tab-bar" style="box-shadow: inset 0 -1px 0 var(--divider)" data-tauri-drag-region></div>
							<div class="flex-1 bg-editor-bg"></div>
						</div>
					{/if}

					<Resizable.Pane order={3}>
						<EditorView />
					</Resizable.Pane>

					{#if rightSidebarShown}
						<Resizable.Handle />

						<Resizable.Pane
							order={4}
							defaultSize={settingsStore.layout.rightSidebarSize}
							minSize={3}
							maxSize={30}
							onResize={handleRightSidebarResize}
						>
							<div class="flex h-full flex-col text-row bg-right-sidebar-bg text-right-sidebar-fg" data-right-sidebar>
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
									{#if settingsStore.layout.propertiesVisible}
										<NoteInfo />
									{/if}
								</ScrollArea>
							</div>
						</Resizable.Pane>
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
