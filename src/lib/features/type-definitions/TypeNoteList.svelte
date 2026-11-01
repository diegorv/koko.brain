<script lang="ts">
	import { VList } from 'virtua/svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { resolveIconForPath } from '#lib/features/file-icons/icon-resolver.js';
	import { appendLog } from '#lib/utils/log.service.js';
	import { createNoteOfType, updateViewQuery } from './type-definitions.service';
	import { typeDefinitionsStore } from './type-definitions.store.svelte';
	import { excludeSystemFolder, getNotesForSelection, getNotesForViewPaths, getViewLabel, getViewSort, getViewListProperties, shouldShowSubFilter, countSubFilters, countSubFiltersForPaths, formatPropertyValue, type TypeSidebarNote, type NoteListSubFilter } from './type-sidebar.logic';
	import { flattenFileTree } from '#lib/features/quick-switcher/quick-switcher.logic.js';
	import { executeQuery } from '#lib/features/collection/collection.logic.js';
	import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
	import type { NoteRecord, SortDef } from '#lib/features/collection/collection.types.js';
	import type { FilterGroup } from '#lib/features/collection/toolbar/toolbar.types.js';
	import FilterPanel from '#lib/features/collection/toolbar/FilterPanel.svelte';
	import SortPanel from '#lib/features/collection/toolbar/SortPanel.svelte';
	import { Popover, PopoverTrigger, PopoverContent } from '#lib/components/ui/popover/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import ListFilter from '@lucide/svelte/icons/list-filter';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import { getCachedViewDefinition, getViewContentHash } from './view-parse-cache';
	import {
		seedToolbarStateFromDefinition,
		buildOverriddenQuery,
		combineAvailableProperties,
		countActiveFilters,
		buildViewYamlUpdates,
		resolveViewListSort,
	} from './type-note-list.logic';
	import { getFileName } from '#lib/core/filesystem/fs.logic.js';
	import NoteRowMenu from '#lib/features/note-list/NoteRowMenu.svelte';
	import NoteRow from '#lib/features/note-list/NoteRow.svelte';

	let notes = $state<TypeSidebarNote[]>([]);
	let subFilter = $state<NoteListSubFilter>('open');
	let subCounts = $state({ open: 0, archived: 0, favorites: 0 });
	let activePath = $derived(editorStore.activeTabPath);
	let selection = $derived(typeDefinitionsStore.selectedTypeOrNav);
	let showSubFilter = $derived(selection ? shouldShowSubFilter(selection) : false);
	let prevSelectionKey = $state('');
	let allPaths = $derived(flattenFileTree(fsStore.fileTree).map((f) => f.path));
	let viewLoadGeneration = 0;

	/**
	 * Local filter/sort state for the active view selection. Seeded from the .view
	 * YAML on selection and re-seeded in place whenever its content hash changes.
	 */
	let localGlobalFilters = $state<FilterGroup[]>([]);
	let localViewFilters = $state<FilterGroup[]>([]);
	let localSort = $state<SortDef[]>([]);
	/** Path of the view whose YAML seeded the local state. Triggers re-seed when it changes. */
	let seededViewPath = $state<string | null>(null);
	/** Content hash of the YAML that seeded the local state. Triggers re-seed when it changes. */
	let seededViewHash = $state<string | undefined>(undefined);
	/**
	 * Path of the view whose YAML our own persistViewState is writing. Suppresses the
	 * next re-seed for THAT view only: a selection switch racing the write must not
	 * let the incoming view adopt a latch it did not set.
	 */
	let selfUpdatePath = $state<string | null>(null);
	/** Popover open states. */
	let filterOpen = $state(false);
	let sortOpen = $state(false);

	let activeFilterCount = $derived(countActiveFilters(localGlobalFilters, localViewFilters));

	/** Formulas declared in the active .view (read-only here — Properties panel is out of scope). */
	let viewFormulas = $state<Record<string, string>>({});

	let availableProperties = $derived(combineAvailableProperties(collectionStore.propertyIndex, viewFormulas));

	let isViewSelection = $derived(selection?.kind === 'view');
	let viewToolbarReady = $derived(isViewSelection && seededViewPath === (selection?.kind === 'view' ? selection.path : null));

	let headerLabel = $derived.by(() => {
		if (!selection) return '';
		switch (selection.kind) {
			case 'type': {
				const meta = typeDefinitionsStore.getTypeMetadata(selection.name);
				return meta?.sidebarLabel ?? selection.name + 's';
			}
			case 'untyped':
				return 'Untyped';
			case 'nav':
				switch (selection.id) {
					case 'inbox': return 'Inbox';
					case 'all': return 'All Notes';
					case 'archive': return 'Archive';
					case 'favorites': return 'Favorites';
				}
			case 'view': {
				const entry = typeDefinitionsStore.getEntryByPath(selection.path);
				return getViewLabel(entry, getFileName(selection.path).replace(/\.view$/i, ''));
			}
		}
	});

	let canCreate = $derived(selection?.kind === 'type');
	let typeName = $derived(selection?.kind === 'type' ? selection.name : null);
	let listProperties = $derived.by(() => {
		if (selection?.kind === 'type') {
			const meta = typeDefinitionsStore.getTypeMetadata(selection.name);
			return meta?.listPropertiesDisplay ?? [];
		}
		if (selection?.kind === 'view') {
			const entry = typeDefinitionsStore.getEntryByPath(selection.path);
			return getViewListProperties(entry);
		}
		return [];
	});

	function selectionKey(sel: typeof selection): string {
		if (!sel) return '';
		switch (sel.kind) {
			case 'type': return `type:${sel.name}`;
			case 'nav': return `nav:${sel.id}`;
			case 'untyped': return 'untyped';
			case 'view': return `view:${sel.path}`;
		}
	}

	$effect(() => {
		const _version = typeDefinitionsStore.entriesVersion;
		const rawEntries = typeDefinitionsStore.entries;
		const entries = excludeSystemFolder(rawEntries, vaultStore.path, settingsStore.templates.systemFolder);
		const sel = typeDefinitionsStore.selectedTypeOrNav;
		if (!sel || entries.length === 0) {
			notes = [];
			subCounts = { open: 0, archived: 0, favorites: 0 };
			return;
		}
		const key = selectionKey(sel);
		if (key !== prevSelectionKey) {
			subFilter = 'open';
			prevSelectionKey = key;
		}

		if (sel.kind === 'view') {
			// Read the property index HERE, not inside loadViewNotes: dependencies are
			// only collected during this synchronous run, so a read placed after the
			// await would leave the effect unsubscribed and a view selected before
			// buildPropertyIndex lands would stay empty. Reading it inside this branch
			// keeps non-view selections unsubscribed from per-note index churn.
			loadViewNotes(
				sel.path,
				entries,
				subFilter,
				++viewLoadGeneration,
				collectionStore.propertyIndex,
				collectionStore.isIndexReady,
			);
			return;
		}

		const sf = shouldShowSubFilter(sel) ? subFilter : undefined;
		notes = getNotesForSelection(entries, sel, typeDefinitionsStore.typeMetadataMap, sf);
		if (shouldShowSubFilter(sel)) {
			subCounts = countSubFilters(entries, sel);
		}
	});

	/**
	 * Resolves the notes matched by a .view file. `propertyIndex` / `isIndexReady` are
	 * passed in rather than read from the store because every caller runs in a reactive
	 * context that must subscribe to them synchronously.
	 */
	async function loadViewNotes(
		viewPath: string,
		entries: typeof typeDefinitionsStore.entries,
		sf: NoteListSubFilter,
		generation: number,
		propertyIndex: Map<string, NoteRecord>,
		isIndexReady: boolean,
	) {
		const t0 = performance.now();
		try {
			const parsed = await getCachedViewDefinition(viewPath);
			const contentHash = getViewContentHash(viewPath);
			if (generation !== viewLoadGeneration) return;
			const sel = typeDefinitionsStore.selectedTypeOrNav;
			if (sel?.kind !== 'view' || sel.path !== viewPath) return;
			if (typeDefinitionsStore.entries.length === 0) return;

			if (!parsed.success) {
				notes = [];
				subCounts = { open: 0, archived: 0, favorites: 0 };
				seededViewPath = viewPath;
				seededViewHash = contentHash;
				return;
			}
			const view = parsed.definition.views[0];

			// Seed local toolbar state when switching to a different view, or when the
			// YAML changed on disk (a new content hash). Re-seed in place so
			// viewToolbarReady never flickers false and unmounts an open popover.
			// Skip the seed when our own persistViewState wrote THIS view: the local
			// state already IS what was written; just adopt the hash it produced. A latch
			// left over from another view (its write raced a selection switch and its own
			// run bailed) is dropped here instead of consumed, so it cannot suppress this
			// seed nor survive to suppress that view's next one.
			if (selfUpdatePath === viewPath) {
				selfUpdatePath = null;
				seededViewPath = viewPath;
				seededViewHash = contentHash;
			} else if (seededViewPath !== viewPath || seededViewHash !== contentHash) {
				selfUpdatePath = null;
				const seed = seedToolbarStateFromDefinition(parsed.definition, view);
				localGlobalFilters = seed.globalFilters;
				localViewFilters = seed.viewFilters;
				localSort = seed.sort;
				viewFormulas = seed.formulas;
				seededViewPath = viewPath;
				seededViewHash = contentHash;
			}

			// Without the index every query matches nothing. Skip the work and wait -
			// the effect re-runs when buildPropertyIndex publishes the index.
			if (!isIndexReady) {
				notes = [];
				subCounts = { open: 0, archived: 0, favorites: 0 };
				return;
			}

			const overridden = buildOverriddenQuery(
				parsed.definition,
				view,
				localGlobalFilters,
				localViewFilters,
				localSort,
			);
			if (!overridden) {
				notes = [];
				return;
			}
			const freshEntries = excludeSystemFolder(
				typeDefinitionsStore.entries,
				vaultStore.path,
				settingsStore.templates.systemFolder,
			);
			const result = executeQuery(overridden.definition, overridden.view, propertyIndex);
			const matchingPaths = new Set(result.records.map((r) => r.path));
			const viewEntry = freshEntries.find((e) => e.path === viewPath);
			notes = getNotesForViewPaths(
				freshEntries,
				matchingPaths,
				resolveViewListSort(overridden.view, getViewSort(viewEntry)),
				sf,
			);
			subCounts = countSubFiltersForPaths(freshEntries, matchingPaths);
			appendLog('VIEW-NOTES', `${notes.length} notes in ${(performance.now() - t0).toFixed(1)}ms`);
		} catch {
			notes = [];
		}
	}

	/** Persists current local filter/sort state back into the .view YAML file. */
	async function persistViewState() {
		const sel = typeDefinitionsStore.selectedTypeOrNav;
		if (sel?.kind !== 'view') return;
		const viewPath = sel.path;
		selfUpdatePath = viewPath;
		try {
			await updateViewQuery(viewPath, buildViewYamlUpdates(localGlobalFilters, localViewFilters, localSort));
			// Re-run the query so the panel updates immediately. Bump the generation
			// so the in-flight effect re-trigger (from entriesVersion bump) does not
			// race with this manual call.
			loadViewNotes(
				viewPath,
				typeDefinitionsStore.entries,
				subFilter,
				++viewLoadGeneration,
				collectionStore.propertyIndex,
				collectionStore.isIndexReady,
			);
		} catch {
			selfUpdatePath = null;
		}
	}

	function handleGlobalFiltersChange(groups: FilterGroup[]) {
		localGlobalFilters = groups;
		persistViewState();
	}

	function handleViewFiltersChange(groups: FilterGroup[]) {
		localViewFilters = groups;
		persistViewState();
	}

	function handleSortsChange(sorts: SortDef[]) {
		localSort = sorts;
		persistViewState();
	}

	// Reset seeded state when leaving view selections, so a re-entry triggers a fresh seed.
	$effect(() => {
		if (selection?.kind !== 'view') {
			seededViewPath = null;
			seededViewHash = undefined;
			localGlobalFilters = [];
			localViewFilters = [];
			localSort = [];
			viewFormulas = {};
		}
	});



	function resolveNoteIcon(notePath: string) {
		const noteResolved = resolveIconForPath(notePath);
		if (noteResolved?.icon) return noteResolved;
		if (selection?.kind === 'type') {
			const defPath = typeDefinitionsStore.getTypeDefinitionPath(selection.name);
			if (defPath) {
				const typeResolved = resolveIconForPath(defPath);
				if (typeResolved?.icon) return typeResolved;
			}
		}
		return null;
	}
</script>

<div class="flex flex-col h-full bg-card">
	<div class="flex items-center h-10 px-3 gap-2 bg-tab-bar shrink-0 border-b border-border" data-tauri-drag-region>
		<span class="text-sm font-medium truncate">{headerLabel}</span>
		{#if canCreate && typeName}
			{@const name = typeName}
			<button
				class="ml-auto shrink-0 rounded p-0.5 hover:bg-primary/10 cursor-default"
				onclick={() => createNoteOfType(name)}
			>
				<Plus class="size-4 text-muted-foreground" />
			</button>
		{:else if viewToolbarReady}
			<div class="ml-auto flex items-center gap-0.5">
				<Popover bind:open={sortOpen}>
					<PopoverTrigger>
						<Button
							variant="ghost"
							size="icon-sm"
							class={localSort.length > 0 ? 'text-primary' : 'text-muted-foreground'}
						>
							<ArrowUpDown class="size-3.5" />
						</Button>
					</PopoverTrigger>
					<PopoverContent align="end" class="w-72 p-3">
						<SortPanel
							sorts={localSort}
							{availableProperties}
							propertyConfigs={{}}
							propertyIndex={collectionStore.propertyIndex}
							onSortsChange={handleSortsChange}
						/>
					</PopoverContent>
				</Popover>

				<Popover bind:open={filterOpen}>
					<PopoverTrigger>
						<Button
							variant="ghost"
							size="icon-sm"
							class={activeFilterCount > 0 ? 'text-primary' : 'text-muted-foreground'}
						>
							<ListFilter class="size-3.5" />
						</Button>
					</PopoverTrigger>
					<PopoverContent align="end" class="w-80 p-3">
						<FilterPanel
							globalFilters={localGlobalFilters}
							viewFilters={localViewFilters}
							{availableProperties}
							propertyIndex={collectionStore.propertyIndex}
							onGlobalFiltersChange={handleGlobalFiltersChange}
							onViewFiltersChange={handleViewFiltersChange}
						/>
					</PopoverContent>
				</Popover>
			</div>
		{/if}
	</div>

	{#if showSubFilter}
		<div class="flex items-center pt-1.5 border-b border-border shrink-0">
			<button
				class="flex flex-1 items-center justify-center gap-1.5 py-1 text-xs cursor-pointer border-b-2 {subFilter === 'open' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => { subFilter = 'open'; }}
			>
				Open
				<span class="text-[10px] tabular-nums">{subCounts.open}</span>
			</button>
			<button
				class="flex flex-1 items-center justify-center gap-1.5 py-1 text-xs cursor-pointer border-b-2 {subFilter === 'archived' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => { subFilter = 'archived'; }}
			>
				Archived
				<span class="text-[10px] tabular-nums">{subCounts.archived}</span>
			</button>
			<button
				class="flex flex-1 items-center justify-center gap-1.5 py-1 text-xs cursor-pointer border-b-2 {subFilter === 'favorites' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => { subFilter = 'favorites'; }}
			>
				Favorites
				<span class="text-[10px] tabular-nums">{subCounts.favorites}</span>
			</button>
		</div>
	{/if}

	<NoteRowMenu {notes} class="flex-1 overflow-hidden">
		{#if notes.length === 0}
			<div class="flex items-center justify-center py-8 text-muted-foreground text-sm">
				No notes
			</div>
		{:else}
		<VList data={notes} getKey={(note: TypeSidebarNote) => note.path} class="px-1 py-1">
		{#snippet children(note: TypeSidebarNote, i: number)}
			{#if i > 0}
				<div class="h-px bg-border"></div>
			{/if}
			<NoteRow
				{note}
				icon={resolveNoteIcon(note.path)}
				isActive={note.path === activePath}
				{listProperties}
				{allPaths}
			/>
		{/snippet}
		</VList>
		{/if}
	</NoteRowMenu>
</div>
