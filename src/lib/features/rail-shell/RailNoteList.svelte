<script lang="ts">
	import { untrack, type Component } from 'svelte';
	import dayjs from 'dayjs';
	import { VList } from 'virtua/svelte';
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import ListFilter from '@lucide/svelte/icons/list-filter';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import Database from '@lucide/svelte/icons/database';
	import FileIcon from '@lucide/svelte/icons/file';
	import FileText from '@lucide/svelte/icons/file-text';
	import FileType from '@lucide/svelte/icons/file-type';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Kanban from '@lucide/svelte/icons/kanban';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Table from '@lucide/svelte/icons/table';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { appendLog } from '#lib/utils/log.service.js';
	import { Popover, PopoverTrigger, PopoverContent } from '#lib/components/ui/popover/index.js';
	import FilterPanel from '#lib/features/collection/toolbar/FilterPanel.svelte';
	import SortPanel from '#lib/features/collection/toolbar/SortPanel.svelte';
	import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
	import type { NoteRecord, SortDef } from '#lib/features/collection/collection.types.js';
	import type { FilterGroup } from '#lib/features/collection/toolbar/toolbar.types.js';
	import { resolveIconForPath } from '#lib/features/file-icons/icon-resolver.js';
	import { flattenFileTree } from '#lib/features/quick-switcher/quick-switcher.logic.js';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import { updateViewQuery } from '#lib/features/type-definitions/type-definitions.service.js';
	import { getCachedViewDefinition, getViewContentHash } from '#lib/features/type-definitions/view-parse-cache.js';
	import { getViewListProperties } from '#lib/features/type-definitions/type-sidebar.logic.js';
	import {
		buildViewYamlUpdates,
		combineAvailableProperties,
		countActiveFilters,
		seedToolbarStateFromDefinition,
	} from '#lib/features/type-definitions/type-note-list.logic.js';
	import NoteRowMenu from '#lib/features/note-list/NoteRowMenu.svelte';
	import NoteRow from '#lib/features/note-list/NoteRow.svelte';
	import { FOLDER_LENS_KIND, newNoteRule, queryViewLens, resolveLens, resolveViewLens, VIEW_LENS_KIND, viewNoteType } from './lens.logic';
	import { createNoteHere } from './new-note.service';
	import { railRegistryStore } from './rail-registry.store.svelte';
	import type { FileKind, Lens, LensContext, LensNote, NewNoteRule, ResolvedLens } from './rail-shell.types';

	interface Props {
		/** The lens whose notes fill the list */
		lens: Lens;
	}

	let { lens }: Props = $props();

	function lensContext(): LensContext {
		return {
			entries: typeDefinitionsStore.entries,
			vaultPath: vaultStore.path,
			systemFolder: settingsStore.templates.systemFolder,
			typeMetadataMap: typeDefinitionsStore.typeMetadataMap,
			fileTree: fsStore.fileTree,
		};
	}

	/** The `.view` path when the lens is a view, else null. */
	let viewPath = $derived(lens.kind === VIEW_LENS_KIND && lens.target ? lens.target : null);

	/** The last view list resolved, tagged with its view so another view's list never shows. */
	let viewLoaded = $state<{ path: string; lens: ResolvedLens } | null>(null);
	let viewLoadGeneration = 0;

	/**
	 * The Sort and Filter toolbar state of the view lens. Seeded from the `.view`
	 * YAML when the view or its content hash changes; edits change it here first,
	 * then persist to the file (as the classic `TypeNoteList` does).
	 */
	let localGlobalFilters = $state<FilterGroup[]>([]);
	let localViewFilters = $state<FilterGroup[]>([]);
	let localSort = $state<SortDef[]>([]);
	let viewFormulas = $state<Record<string, string>>({});
	/** The view and content hash the toolbar state was seeded from */
	let seededViewPath = $state<string | null>(null);
	let seededViewHash = $state<string | undefined>(undefined);
	/** The view our own `persistViewState` is writing: its next load adopts the new hash instead of re-seeding */
	let selfUpdatePath: string | null = null;
	let sortOpen = $state(false);
	let filterOpen = $state(false);

	let viewToolbarReady = $derived(viewPath !== null && seededViewPath === viewPath);
	let activeFilterCount = $derived(countActiveFilters(localGlobalFilters, localViewFilters));
	let availableProperties = $derived(combineAvailableProperties(collectionStore.propertyIndex, viewFormulas));

	let resolved = $derived.by(() => {
		if (viewPath) return viewLoaded?.path === viewPath ? viewLoaded.lens : null;
		void typeDefinitionsStore.entriesVersion;
		return resolveLens(lens, lensContext(), railRegistryStore.lensProviders);
	});

	$effect(() => {
		const path = viewPath;
		if (!path) {
			seededViewPath = null;
			seededViewHash = undefined;
			return;
		}
		void typeDefinitionsStore.entriesVersion;
		// Read here: dependencies are only collected during the synchronous run.
		const propertyIndex = collectionStore.propertyIndex;
		const indexReady = collectionStore.isIndexReady;
		untrack(() => {
			loadView(path, ++viewLoadGeneration, propertyIndex, indexReady);
		});
	});

	/** Resolves the view lens: reads the cached parse, seeds the toolbar state when due, runs the query. */
	async function loadView(path: string, generation: number, propertyIndex: Map<string, NoteRecord>, indexReady: boolean) {
		try {
			const parsed = await getCachedViewDefinition(path);
			const contentHash = getViewContentHash(path);
			if (generation !== viewLoadGeneration) return;
			if (!parsed.success) {
				seededViewPath = null;
				seededViewHash = undefined;
				viewLoaded = { path, lens: resolveViewLens(path, null, lensContext()) };
				return;
			}
			if (selfUpdatePath === path) {
				selfUpdatePath = null;
			} else if (seededViewPath !== path || seededViewHash !== contentHash) {
				selfUpdatePath = null;
				const seed = seedToolbarStateFromDefinition(parsed.definition, parsed.definition.views[0]);
				localGlobalFilters = seed.globalFilters;
				localViewFilters = seed.viewFilters;
				localSort = seed.sort;
				viewFormulas = seed.formulas;
			}
			seededViewPath = path;
			seededViewHash = contentHash;
			// Without the property index every query matches nothing: wait for it.
			const result = indexReady
				? queryViewLens(
						parsed.definition,
						{ globalFilters: localGlobalFilters, viewFilters: localViewFilters, sort: localSort },
						propertyIndex,
					)
				: null;
			viewLoaded = { path, lens: resolveViewLens(path, result, lensContext()) };
		} catch (err) {
			if (generation !== viewLoadGeneration) return;
			appendLog('VIEW-LENS', `load failed for ${path}: ${String(err)}`);
			seededViewPath = null;
			viewLoaded = { path, lens: resolveViewLens(path, null, lensContext()) };
		}
	}

	/**
	 * Writes the toolbar state to the `.view` file, then re-runs the query. A
	 * failed save re-seeds the toolbar from the file, so the list never shows a
	 * sort or filter the `.view` does not hold.
	 */
	async function persistViewState() {
		const path = viewPath;
		if (!path) return;
		selfUpdatePath = path;
		try {
			await updateViewQuery(path, buildViewYamlUpdates(localGlobalFilters, localViewFilters, localSort));
		} catch (err) {
			selfUpdatePath = null;
			seededViewHash = undefined;
			appendLog('VIEW-LENS', `save failed for ${path}: ${String(err)}`);
			toast.error('Could not save the view');
		}
		// The lens moved to another view while saving: its own load already ran.
		if (viewPath !== path) return;
		loadView(path, ++viewLoadGeneration, collectionStore.propertyIndex, collectionStore.isIndexReady);
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
	let notes = $derived(resolved?.notes ?? []);
	let activePath = $derived(editorStore.activeTabPath);
	let allPaths = $derived(flattenFileTree(fsStore.fileTree).map((f) => f.path));

	/**
	 * The lens's "+ New here" rule now; null hides the button (and a view's until its filters are known).
	 * A folder lens that no longer resolves (folder deleted or renamed) has none: the recursive
	 * `create_folder` would silently re-create the folder.
	 */
	function currentNewNoteRule(): NewNoteRule | null {
		if (viewPath && !viewToolbarReady) return null;
		if (lens.kind === FOLDER_LENS_KIND && !resolved) return null;
		return newNoteRule(
			lens,
			{
				vaultPath: vaultStore.path,
				captureBaseFolder: settingsStore.periodicNotes.folder,
				captureFolderFormat: settingsStore.quickCapture.folderFormat,
				now: dayjs(),
				viewTypeName: viewPath
					? viewNoteType([...localGlobalFilters, ...localViewFilters], typeDefinitionsStore.typeMetadataMap.keys())
					: null,
			},
			railRegistryStore.lensProviders,
		);
	}

	let canCreate = $derived(currentNewNoteRule() !== null);

	/** True while a "+ New here" creation runs: a second click would pick the same `Untitled.md` and fail. */
	let creating = false;

	async function handleNewHere() {
		if (creating) return;
		// Re-read at click time so the dated Cmd+N folder follows the clock.
		const rule = currentNewNoteRule();
		if (!rule) return;
		creating = true;
		try {
			await createNoteHere(rule);
		} catch {
			// `createNoteHere` already logged the cause.
			toast.error('Could not create the note');
		} finally {
			creating = false;
		}
	}

	/** The registered provider's extra header button for the lens kind (a day's Daily note), if any. */
	let headerAction = $derived(railRegistryStore.lensProviders.find((p) => p.kind === lens.kind)?.headerAction ?? null);

	async function handleHeaderAction() {
		if (!headerAction) return;
		const action = headerAction;
		try {
			await action.run(lens);
		} catch (err) {
			appendLog('RAIL-SHELL', `header action "${action.label}" failed: ${String(err)}`);
			toast.error(action.failureMessage);
		}
	}

	/** The note's own icon, else the icon of its type's definition note. */
	function resolveNoteIcon(note: LensNote) {
		const own = resolveIconForPath(note.path);
		if (own?.icon) return own;
		const defPath = note.isA ? typeDefinitionsStore.getTypeDefinitionPath(note.isA) : undefined;
		if (defPath) {
			const fromType = resolveIconForPath(defPath);
			if (fromType?.icon) return fromType;
		}
		return null;
	}

	/** The row icon of each file kind when the file has no icon of its own (the file tree's kind icons). */
	const KIND_ICONS: Record<FileKind, Component> = {
		markdown: FileText,
		canvas: LayoutDashboard,
		kanban: Kanban,
		view: Table,
		collection: Database,
		pdf: FileType,
		image: ImageIcon,
		other: FileIcon,
	};

	function listPropertiesFor(note: LensNote): string[] {
		if (viewPath) return getViewListProperties(typeDefinitionsStore.getEntryByPath(viewPath));
		return note.isA ? (typeDefinitionsStore.getTypeMetadata(note.isA)?.listPropertiesDisplay ?? []) : [];
	}
</script>

<div class="flex h-full flex-col bg-file-explorer-bg text-file-explorer-fg" data-rail-note-list>
	<!-- pl-6 clears the macOS traffic lights, which overflow the 48 px rail. -->
	<div
		class="flex h-10 shrink-0 items-center gap-2 bg-tab-bar pl-6 pr-3"
		style="box-shadow: inset 0 -1px 0 var(--divider)"
		data-tauri-drag-region
	>
		<span class="truncate text-sm font-medium" data-note-list-label>{resolved?.label ?? ''}</span>
		<span class="ml-auto text-[11px] tabular-nums text-file-explorer-muted-fg">{notes.length}</span>
		{#if viewToolbarReady}
			<!-- On the tab bar only the tab text tokens are pinned readable: active is tab-text-active. -->
			<Popover bind:open={sortOpen}>
				<PopoverTrigger
					class="flex shrink-0 cursor-default items-center rounded-md p-1 transition-colors hover:bg-file-explorer-accent hover:text-tab-text-active {localSort.length > 0
						? 'text-tab-text-active'
						: 'text-tab-text-inactive'}"
					title="Sort"
					data-note-list-sort
				>
					<ArrowUpDown class="size-3.5" />
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
				<PopoverTrigger
					class="flex shrink-0 cursor-default items-center rounded-md p-1 transition-colors hover:bg-file-explorer-accent hover:text-tab-text-active {activeFilterCount > 0
						? 'text-tab-text-active'
						: 'text-tab-text-inactive'}"
					title="Filter"
					data-note-list-filter
				>
					<ListFilter class="size-3.5" />
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
		{/if}
		{#if headerAction}
			<button
				type="button"
				class="flex shrink-0 cursor-default items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-tab-text-inactive transition-colors hover:bg-file-explorer-accent hover:text-tab-text-active"
				title={headerAction.title}
				onclick={handleHeaderAction}
				data-note-list-header-action
			>
				<headerAction.icon class="size-3.5" />
				{headerAction.label}
			</button>
		{/if}
		{#if canCreate}
			<button
				type="button"
				class="flex shrink-0 cursor-default items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-tab-text-inactive transition-colors hover:bg-file-explorer-accent hover:text-tab-text-active"
				title="Create a note in this list"
				onclick={handleNewHere}
				data-note-list-new
			>
				<Plus class="size-3.5" />
				New here
			</button>
		{/if}
	</div>
	{#if resolved?.rule}
		<div class="shrink-0 border-b border-file-explorer-border px-3 py-1.5 text-[11px] text-file-explorer-muted-fg" data-note-list-rule>
			{resolved.rule}
		</div>
	{/if}

	<NoteRowMenu {notes} class="flex-1 overflow-hidden">
		{#if notes.length === 0}
			<div class="flex items-center justify-center py-8 text-sm text-file-explorer-muted-fg" data-note-list-empty>
				No notes here
			</div>
		{:else}
			<VList data={notes} getKey={(note: LensNote) => note.path} class="px-1 py-1">
				{#snippet children(note: LensNote, i: number)}
					{#if i > 0}
						<div class="h-px bg-file-explorer-border"></div>
					{/if}
					<NoteRow
						{note}
						icon={resolveNoteIcon(note)}
						isActive={note.path === activePath}
						listProperties={listPropertiesFor(note)}
						{allPaths}
						subtitle={note.subtitle}
						italic={note.italic}
						fallbackIcon={KIND_ICONS[note.kind]}
						draggable
					/>
				{/snippet}
			</VList>
		{/if}
	</NoteRowMenu>
</div>
