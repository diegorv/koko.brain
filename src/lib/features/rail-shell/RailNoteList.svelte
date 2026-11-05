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
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { openFileInEditor } from '#lib/core/editor/editor.service.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import { findNodeByPath } from '#lib/core/filesystem/fs.logic.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { appendLog } from '#lib/utils/log.service.js';
	import { Popover, PopoverTrigger, PopoverContent } from '#lib/components/ui/popover/index.js';
	import FilterPanel from '#lib/features/collection/toolbar/FilterPanel.svelte';
	import SortPanel from '#lib/features/collection/toolbar/SortPanel.svelte';
	import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
	import type { PropertyIndexRecord, SortDef } from '#lib/features/collection/collection.types.js';
	import type { FilterGroup } from '#lib/features/collection/toolbar/toolbar.types.js';
	import { resolveIconForPath } from '#lib/features/file-icons/icon-resolver.js';
	import { flattenFileTree } from '#lib/core/filesystem/file-entries.logic.js';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import { updateViewQuery } from '#lib/features/type-definitions/type-definitions.service.js';
	import { getCachedViewDefinition, getViewContentHash } from '#lib/features/type-definitions/view-parse-cache.js';
	import { railViewIndex } from '#lib/features/collection/yaml-parser.js';
	import { effectiveViewSortLabel, getViewListProperties } from '#lib/features/type-definitions/type-sidebar.logic.js';
	import {
		buildViewYamlUpdates,
		combineAvailableProperties,
		countActiveFilters,
		seedToolbarStateFromDefinition,
	} from '#lib/features/type-definitions/type-note-list.logic.js';
	import NoteRowMenu from '#lib/features/note-list/NoteRowMenu.svelte';
	import NoteRow from '#lib/features/note-list/NoteRow.svelte';
	import { acquireCalendarClock } from '#lib/features/event-calendar/event-calendar.service.js';
	import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
	import { eventCalendarDailyNoteStore } from '#lib/features/event-calendar/event-calendar-daily-note.store.svelte.js';
	import {
		FOLDER_LENS_KIND,
		newNoteRule,
		queryViewLens,
		resolveLens,
		resolveViewLens,
		TODAY_DATED_GROUP,
		TODAY_LENS_KIND,
		todayLens,
		VIEW_LENS_KIND,
		viewLoadFromQuery,
		viewNoteType,
		viewReadError,
	} from './lens.logic';
	import { INITIAL_VIEW_SEED, stepViewSeed, type ViewSeedEvent, type ViewSeedState } from './view-lens-seed.logic';
	import { createNoteHere } from './new-note.service';
	import { railRegistryStore } from './rail-registry.store.svelte';
	import type {
		FileKind,
		Lens,
		LensContext,
		LensNote,
		NewNoteRule,
		RailHeaderAction,
		RailTodaySection,
		ResolvedLens,
	} from './rail-shell.types';

	interface Props {
		/** The lens whose notes fill the list */
		lens: Lens;
		/** True when no navigator sits between the list and the rail, so its header must clear the macOS traffic lights */
		firstPane?: boolean;
	}

	let { lens, firstPane = false }: Props = $props();

	let isToday = $derived(lens.kind === TODAY_LENS_KIND);

	// The shared Calendar clock keeps `todayKey` current, so the Today lens moves to the new day at midnight.
	$effect(() => {
		if (!isToday) return;
		return untrack(() => acquireCalendarClock());
	});

	/** The clock's day key. A string, so a tick that stays on the same day stops here instead of re-resolving the lens. */
	let todayKey = $derived(eventCalendarViewStore.todayKey);

	/** The lens as shown: the Today lens gets the clock's day, any other lens is used as given. */
	let shownLens = $derived(isToday ? todayLens(todayKey) : lens);

	function lensContext(): LensContext {
		return {
			entries: typeDefinitionsStore.entries,
			vaultPath: vaultStore.path,
			systemFolder: settingsStore.templates.systemFolder,
			typeMetadataMap: typeDefinitionsStore.typeMetadataMap,
			// A getter: only a resolver that reads the tree (the folder lens) re-runs when it is replaced.
			get fileTree() {
				return fsStore.fileTree;
			},
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
	 * then persist to the file.
	 */
	let localGlobalFilters = $state<FilterGroup[]>([]);
	let localViewFilters = $state<FilterGroup[]>([]);
	let localSort = $state<SortDef[]>([]);
	let viewFormulas = $state<Record<string, string>>({});
	/** What the toolbar state was seeded from, and which view our own `persistViewState` is writing */
	let viewSeed = $state.raw<ViewSeedState>(INITIAL_VIEW_SEED);
	/** Index in `views` of the view the last query ran (`railViewIndex`); the toolbar's edits are written there */
	let viewRunIndex = 0;
	let sortOpen = $state(false);
	let filterOpen = $state(false);

	let activeFilterCount = $derived(countActiveFilters(localGlobalFilters, localViewFilters));
	let availableProperties = $derived(combineAvailableProperties(collectionStore.propertyIndex, viewFormulas));

	let resolved = $derived.by(() => {
		if (viewPath) {
			if (viewLoaded?.path === viewPath) return viewLoaded.lens;
			// The view's first read is in flight: Loading, not an empty list.
			return resolveViewLens(viewPath, { kind: 'loading' }, lensContext());
		}
		void typeDefinitionsStore.entriesVersion;
		return resolveLens(shownLens, lensContext(), railRegistryStore.lensProviders);
	});

	/** Sort, Filter and New here: only for a view that ran (no Loading, missing or error status), once its toolbar state is seeded. */
	let viewToolbarReady = $derived(viewPath !== null && viewSeed.seededPath === viewPath && resolved !== null && !resolved.status);

	/**
	 * Whether the picked `.view` is in the file tree. The tree, not the read,
	 * says a view is gone: the parse cache serves a deleted file, and only the
	 * watcher's tree refresh sees a delete outside the app. A boolean, so a tree
	 * change re-runs the load only when the view comes or goes.
	 */
	let viewInTree = $derived(viewPath !== null && findNodeByPath(fsStore.fileTree, viewPath) !== null);

	$effect(() => {
		const path = viewPath;
		if (!path) {
			stepSeed({ kind: 'no-view' });
			return;
		}
		void typeDefinitionsStore.entriesVersion;
		// Read here: dependencies are only collected during the synchronous run.
		const propertyIndex = collectionStore.propertyIndex;
		const indexReady = collectionStore.isIndexReady;
		const inTree = viewInTree;
		untrack(() => {
			loadView(path, ++viewLoadGeneration, propertyIndex, indexReady, inTree);
		});
	});

	/** Applies one seed event; true when the toolbar state must be re-seeded now. Untracked: the effect above writes the seed. */
	function stepSeed(event: ViewSeedEvent): boolean {
		const step = stepViewSeed(untrack(() => viewSeed), event);
		viewSeed = step.next;
		return step.reseed;
	}

	/**
	 * Resolves the view lens, in this order: Loading while the property index is
	 * not ready (every query would match nothing), missing when the `.view` is not
	 * in the tree, an error when the read or the parse fails; else it seeds the
	 * toolbar state when due and runs the query.
	 */
	async function loadView(
		path: string,
		generation: number,
		propertyIndex: Map<string, PropertyIndexRecord>,
		indexReady: boolean,
		inTree: boolean,
	) {
		// Another view's index never carries over; a reload of the same view keeps
		// it, because the toolbar stays usable (and may write) while that reload runs.
		if (viewLoaded?.path !== path) viewRunIndex = 0;
		if (!indexReady) {
			viewLoaded = { path, lens: resolveViewLens(path, { kind: 'loading' }, lensContext()) };
			return;
		}
		if (!inTree) {
			stepSeed({ kind: 'load-failed' });
			viewLoaded = { path, lens: resolveViewLens(path, { kind: 'missing' }, lensContext()) };
			return;
		}
		try {
			const parsed = await getCachedViewDefinition(path);
			const contentHash = getViewContentHash(path);
			if (generation !== viewLoadGeneration) return;
			if (!parsed.success) {
				stepSeed({ kind: 'load-failed' });
				viewLoaded = { path, lens: resolveViewLens(path, { kind: 'error', message: parsed.error }, lensContext()) };
				return;
			}
			if (stepSeed({ kind: 'loaded', path, hash: contentHash })) {
				const seed = seedToolbarStateFromDefinition(parsed.definition, parsed.definition.views[railViewIndex(parsed.definition)]);
				localGlobalFilters = seed.globalFilters;
				localViewFilters = seed.viewFilters;
				localSort = seed.sort;
				viewFormulas = seed.formulas;
			}
			const result = queryViewLens(
				parsed.definition,
				{ globalFilters: localGlobalFilters, viewFilters: localViewFilters, sort: localSort },
				propertyIndex,
				path,
				lensContext(),
			);
			viewRunIndex = result?.viewIndex ?? 0;
			viewLoaded = { path, lens: resolveViewLens(path, viewLoadFromQuery(result), lensContext()) };
		} catch (err) {
			if (generation !== viewLoadGeneration) return;
			appendLog('VIEW-LENS', `load failed for ${path}: ${String(err)}`);
			stepSeed({ kind: 'load-failed' });
			viewLoaded = { path, lens: resolveViewLens(path, viewReadError(err), lensContext()) };
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
		stepSeed({ kind: 'save-started', path });
		try {
			await updateViewQuery(path, buildViewYamlUpdates(localGlobalFilters, localViewFilters, localSort, viewRunIndex));
		} catch (err) {
			stepSeed({ kind: 'save-failed' });
			appendLog('VIEW-LENS', `save failed for ${path}: ${String(err)}`);
			toast.error('Could not save the view');
		}
		// The lens moved to another view while saving: its own load already ran.
		if (viewPath !== path) return;
		loadView(path, ++viewLoadGeneration, collectionStore.propertyIndex, collectionStore.isIndexReady, viewInTree);
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
			shownLens,
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

	/**
	 * Today's Daily note: opens or creates the shown day's daily note through
	 * the opener the periodic-notes plugin registers (features may not import plugins).
	 */
	const TODAY_DAILY_NOTE: RailHeaderAction = {
		label: 'Daily note',
		title: "Open or create today's daily note",
		icon: NotebookPen,
		failureMessage: 'Could not open the daily note',
		run: (l) => eventCalendarDailyNoteStore.open(l.target ?? eventCalendarViewStore.todayKey),
	};

	/**
	 * The extra header button: Today's Daily note while an opener is registered,
	 * else the registered provider's for the lens kind (a day's Daily note), if any.
	 */
	let headerAction = $derived(
		isToday
			? eventCalendarDailyNoteStore.available
				? TODAY_DAILY_NOTE
				: null
			: (railRegistryStore.lensProviders.find((p) => p.kind === lens.kind)?.headerAction ?? null),
	);

	async function handleHeaderAction() {
		if (!headerAction) return;
		const action = headerAction;
		try {
			await action.run(shownLens);
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
			return own ?? fromType ?? null;
		}
		return own ?? null;
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

	/** One entry of a grouped list: a group header, a note row, an empty group's notice, or a plugin's Today section. */
	type GroupedItem =
		| { key: string; kind: 'header'; id: string; label: string; count: number | null }
		| { key: string; kind: 'note'; note: LensNote; divided: boolean }
		| { key: string; kind: 'empty' }
		| { key: string; kind: 'section'; section: RailTodaySection };

	/** The grouped lens (Today) as flat list items; null for a lens without groups. Today's plugin sections come before its notes. */
	let groupedItems = $derived.by((): GroupedItem[] | null => {
		const groups = resolved?.groups;
		if (!groups) return null;
		const items: GroupedItem[] = [];
		for (const group of groups) {
			if (isToday && group.id === TODAY_DATED_GROUP) {
				for (const section of railRegistryStore.todaySections) {
					items.push({ key: `section-header:${section.id}`, kind: 'header', id: section.id, label: section.label, count: null });
					items.push({ key: `section:${section.id}`, kind: 'section', section });
				}
			}
			items.push({ key: `header:${group.id}`, kind: 'header', id: group.id, label: group.label, count: group.notes.length });
			group.notes.forEach((note, i) => items.push({ key: `${group.id}:${note.path}`, kind: 'note', note, divided: i > 0 }));
			if (group.notes.length === 0) items.push({ key: `empty:${group.id}`, kind: 'empty' });
		}
		return items;
	});

	function listPropertiesFor(note: LensNote): string[] {
		if (viewPath) return getViewListProperties(typeDefinitionsStore.getEntryByPath(viewPath));
		return note.isA ? (typeDefinitionsStore.getTypeMetadata(note.isA)?.listPropertiesDisplay ?? []) : [];
	}
</script>

<div class="flex h-full flex-col bg-file-explorer-bg text-file-explorer-fg" data-rail-note-list>
	<!-- As the first pane, pl-6 clears the macOS traffic lights, which overflow the 48 px rail. -->
	<div
		class="flex h-10 shrink-0 items-center gap-2 bg-tab-bar pr-3 {firstPane ? 'pl-6' : 'pl-3'}"
		style="box-shadow: inset 0 -1px 0 var(--divider)"
		data-tauri-drag-region
	>
		<!-- The title is the only item that shrinks; min-w-16 keeps at least 4 characters next to the icon actions. -->
		<span class="min-w-16 flex-1 truncate text-title" data-note-list-label>{resolved?.label ?? ''}</span>
		<!-- On the tab bar only the tab text tokens are pinned readable: active is tab-text-active. -->
		<span class="ml-auto text-meta tabular-nums text-tab-text-inactive" data-note-list-count>{notes.length}</span>
		{#if viewToolbarReady}
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
				<PopoverContent align="end" class="w-72">
					<SortPanel
						sorts={localSort}
						{availableProperties}
						propertyConfigs={{}}
						propertyIndex={collectionStore.propertyIndex}
						onSortsChange={handleSortsChange}
						emptyText={viewPath ? effectiveViewSortLabel(typeDefinitionsStore.getEntryByPath(viewPath)) : undefined}
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
				<PopoverContent align="end" class="w-80">
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
				class="flex shrink-0 cursor-default items-center rounded-md p-1 text-tab-text-inactive transition-colors hover:bg-file-explorer-accent hover:text-tab-text-active focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
				title={headerAction.title}
				aria-label={headerAction.label}
				onclick={handleHeaderAction}
				data-note-list-header-action
			>
				<headerAction.icon class="size-3.5" />
			</button>
		{/if}
		{#if canCreate}
			<button
				type="button"
				class="flex shrink-0 cursor-default items-center rounded-md p-1 text-tab-text-inactive transition-colors hover:bg-file-explorer-accent hover:text-tab-text-active focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
				title="Create a note in this list"
				aria-label="New here"
				onclick={handleNewHere}
				data-note-list-new
			>
				<Plus class="size-3.5" />
			</button>
		{/if}
	</div>
	{#if resolved?.rule}
		<div class="shrink-0 border-b border-file-explorer-border px-3 py-1.5 text-[11px] text-file-explorer-muted-fg" data-note-list-rule>
			{resolved.rule}
		</div>
	{/if}

	<NoteRowMenu {notes} class="flex-1 overflow-hidden">
		{#if groupedItems}
			<VList data={groupedItems} getKey={(item: GroupedItem) => item.key} class="px-1 py-1">
				{#snippet children(item: GroupedItem)}
					{#if item.kind === 'header'}
						<div
							class="section-label px-2 pt-2 pb-1 text-file-explorer-muted-fg"
							data-note-list-group={item.id}
						>
							{item.label}
							{#if item.count !== null}
								<span class="font-normal tabular-nums" data-note-list-group-count>{item.count}</span>
							{/if}
						</div>
					{:else if item.kind === 'note'}
						{#if item.divided}
							<div class="h-px bg-file-explorer-border"></div>
						{/if}
						{@render noteRow(item.note)}
					{:else if item.kind === 'empty'}
						<div class="px-2 py-1 text-xs text-file-explorer-muted-fg" data-note-list-group-empty>Nothing here</div>
					{:else}
						<div data-today-section={item.section.id}>
							<item.section.component />
						</div>
					{/if}
				{/snippet}
			</VList>
		{:else if resolved?.status}
			{@const status = resolved.status}
			{#if status.kind === 'loading'}
				<div class="flex items-center justify-center py-8 text-row text-file-explorer-muted-fg" data-note-list-loading>
					Loading...
				</div>
			{:else if status.kind === 'missing'}
				<div class="flex items-center justify-center py-8 text-row text-file-explorer-muted-fg" data-note-list-missing>
					This view no longer exists
				</div>
			{:else}
				<!-- Sort and Filter stay hidden: the fix is in the .view itself. -->
				<div class="flex flex-col items-start gap-2 p-3" data-note-list-error>
					<div role="alert" class="w-full rounded-md border border-destructive/50 bg-destructive/10 p-3 text-row text-destructive">
						<p class="font-medium">This view cannot be shown</p>
						<p class="mt-1 whitespace-pre-wrap break-words font-mono text-meta" data-note-list-error-message>{status.message}</p>
					</div>
					{#if viewPath}
						{@const path = viewPath}
						<button
							type="button"
							class="cursor-default rounded-md border border-file-explorer-border px-2 py-1 text-meta transition-colors hover:bg-file-explorer-accent"
							onclick={() => openFileInEditor(path)}
							data-note-list-open-view
						>
							Open view
						</button>
					{/if}
				</div>
			{/if}
		{:else if notes.length === 0}
			<div class="flex items-center justify-center py-8 text-sm text-file-explorer-muted-fg" data-note-list-empty>
				No notes here
			</div>
		{:else}
			<VList data={notes} getKey={(note: LensNote) => note.path} class="px-1 py-1">
				{#snippet children(note: LensNote, i: number)}
					{#if i > 0}
						<div class="h-px bg-file-explorer-border"></div>
					{/if}
					{@render noteRow(note)}
				{/snippet}
			</VList>
		{/if}
	</NoteRowMenu>
</div>

{#snippet noteRow(note: LensNote)}
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
