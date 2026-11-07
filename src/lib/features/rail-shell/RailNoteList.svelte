<script lang="ts">
	import { untrack, type Component } from 'svelte';
	import dayjs from 'dayjs';
	import { VList } from 'virtua/svelte';
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import ListFilter from '@lucide/svelte/icons/list-filter';
	import Search from '@lucide/svelte/icons/search';
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
	import { FrontmatterWriteError, toastFrontmatterWriteError } from '#lib/core/frontmatter/frontmatter-write.service.js';
	import { debug } from '#lib/utils/debug.js';
	import { appendLog } from '#lib/utils/log.service.js';
	import { Popover, PopoverPortal, PopoverTrigger, PopoverContent } from '#lib/components/ui/popover/index.js';
	import FilterPanel from '#lib/features/collection/toolbar/FilterPanel.svelte';
	import SortPanel from '#lib/features/collection/toolbar/SortPanel.svelte';
	import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
	import type { PropertyIndexRecord, SortDef } from '#lib/features/collection/collection.types.js';
	import type { FilterGroup } from '#lib/features/collection/toolbar/toolbar.types.js';
	import { resolveIconForPath } from '#lib/features/file-icons/icon-resolver.js';
	import { flattenFileTree } from '#lib/core/filesystem/file-entries.logic.js';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import {
		updateViewListProperties,
		updateViewToolbarKey,
		ViewWriteConflict,
		ViewWriteError,
	} from '#lib/features/type-definitions/type-definitions.service.js';
	import { getCachedViewDefinition, getViewContentHash, refreshViewDefinition } from '#lib/features/type-definitions/view-parse-cache.js';
	import { railViewIndex } from '#lib/features/collection/yaml-parser.js';
	import type { CollectionDefinition } from '#lib/features/collection/collection.types.js';
	import { effectiveViewSortLabel, getViewListProperties, getViewSort } from '#lib/features/type-definitions/type-sidebar.logic.js';
	import {
		canonicalToolbarValue,
		combineAvailableProperties,
		countActiveFilters,
		seedToolbarStateFromDefinition,
		TOOLBAR_KEYS,
		toolbarKeyBase,
		toolbarKeysDiffering,
		toolbarValuesFromState,
		type ToolbarKey,
	} from '#lib/features/type-definitions/type-note-list.logic.js';
	import NoteRowMenu from '#lib/features/note-list/NoteRowMenu.svelte';
	import NoteRow from '#lib/features/note-list/NoteRow.svelte';
	import { acquireCalendarClock } from '#lib/features/event-calendar/event-calendar.service.js';
	import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
	import { eventCalendarDailyNoteStore } from '#lib/features/event-calendar/event-calendar-daily-note.store.svelte.js';
	import {
		FOLDER_LENS_KIND,
		lensListsEntries,
		newNoteRule,
		queryViewLens,
		resolveLens,
		resolveViewLens,
		TODAY_DATED_GROUP,
		TODAY_LENS_KIND,
		todayLens,
		VIEW_LENS_KIND,
		viewEntriesLoaded,
		viewLoadFromQuery,
		viewNoteType,
		viewReadError,
	} from './lens.logic';
	import { INITIAL_VIEW_SEED, stepViewSeed, type ViewSeedEvent, type ViewSeedState } from './view-lens-seed.logic';
	import { searchListFullText } from './list-fulltext.service';
	import { defaultLensSort, listPrefsKey, parseRailListPrefs, withListPrefs } from './list-prefs.logic';
	import { saveTypeListProperties, saveTypeListSort, serializeListWrite } from './list-prefs.service';
	import { availableListProperties } from './list-properties.logic';
	import { filterResolvedLens, normalizeListQuery } from './list-search.logic';
	import { applyListSort } from './list-sort-compare.logic';
	import { formatListSort, parseListSort } from './list-sort.logic';
	import type { ListSortConfig } from './list-toolbar.types';
	import { listSortToSortDef, viewListSort } from './list-view-sort.logic';
	import { createNoteHere } from './new-note.service';
	import RailListSearch from './RailListSearch.svelte';
	import RailPropertiesPicker from './RailPropertiesPicker.svelte';
	import RailSortMenu from './RailSortMenu.svelte';
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
	/**
	 * Per key, the value (`toolbarKeyBase`) the file holds for the toolbar state
	 * now shown, once the saves already queued land. Set when the state is seeded
	 * and advanced when an edit is queued; an edit is refused when its key in the
	 * file is no longer this value.
	 */
	let toolbarBase = emptyToolbarBase();
	/**
	 * The saves of the toolbar state now shown that have not finished. While one
	 * is queued the file lags the toolbar, so no load may re-seed from it. Dropped
	 * when the lens loads another view: that load re-seeds the toolbar, and a save
	 * finishing later no longer speaks for it.
	 */
	let viewSaveRun: { path: string; pending: number } | null = null;
	let sortOpen = $state(false);
	let filterOpen = $state(false);

	let activeFilterCount = $derived(countActiveFilters(localGlobalFilters, localViewFilters));
	let availableProperties = $derived(combineAvailableProperties(collectionStore.propertyIndex, viewFormulas));

	let resolved = $derived.by((): ResolvedLens | null => {
		if (viewPath) {
			if (viewLoaded?.path === viewPath) return viewLoaded.lens;
			// The view's first read is in flight: Loading, not an empty list.
			return resolveViewLens(viewPath, { kind: 'loading' }, lensContext());
		}
		const entriesVersion = typeDefinitionsStore.entriesVersion;
		const listed = resolveLens(shownLens, lensContext(), railRegistryStore.lensProviders);
		// The first snapshot is still on its way: Loading, not an empty list.
		if (entriesVersion === 0 && lensListsEntries(shownLens)) {
			return { label: listed?.label ?? '', rule: listed?.rule ?? '', notes: [], status: { kind: 'loading' } };
		}
		return listed;
	});

	/** Sort, Filter and New here: only for a view that ran (no Loading, missing or error status), once its toolbar state is seeded. */
	let viewToolbarReady = $derived(viewPath !== null && viewSeed.seededPath === viewPath && resolved !== null && !resolved.status);

	/**
	 * Whether the picked `.view` is in the file tree. The tree, not the read,
	 * says a view is gone: a failed read is reported as a read error, and only
	 * the watcher's tree refresh sees a delete outside the app. A boolean, so a
	 * tree change re-runs the load only when the view comes or goes.
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
	 * not ready or this vault's entries have not landed (every query would match
	 * nothing), missing when the `.view` is not in the tree, an error when the
	 * read or the parse fails; else it seeds the toolbar state when due and runs
	 * the query.
	 */
	async function loadView(
		path: string,
		generation: number,
		propertyIndex: Map<string, PropertyIndexRecord>,
		indexReady: boolean,
		inTree: boolean,
	) {
		if (viewSaveRun?.path !== path) viewSaveRun = null;
		if (!indexReady || !viewEntriesLoaded(typeDefinitionsStore, propertyIndex, vaultStore.path)) {
			viewLoaded = { path, lens: resolveViewLens(path, { kind: 'loading' }, lensContext()) };
			return;
		}
		if (!inTree) {
			stepSeed({ kind: 'load-failed' });
			viewLoaded = { path, lens: resolveViewLens(path, { kind: 'missing' }, lensContext()) };
			return;
		}
		try {
			// Definition and hash come from one cache entry, so a late read returning
			// its own older parse cannot pair old content with a new hash.
			await refreshViewDefinition(path);
			const parsed = await getCachedViewDefinition(path);
			const contentHash = getViewContentHash(path);
			if (generation !== viewLoadGeneration) return;
			if (!parsed.success) {
				stepSeed({ kind: 'load-failed' });
				viewLoaded = { path, lens: resolveViewLens(path, { kind: 'error', message: parsed.error }, lensContext()) };
				return;
			}
			// A load consumes the self-update latch, and an entries bump or a finished save can load mid-run.
			if (viewSaveRun?.path === path) stepSeed({ kind: 'save-started', path });
			if (stepSeed({ kind: 'loaded', path, hash: contentHash })) {
				const seed = seedToolbarStateFromDefinition(parsed.definition, parsed.definition.views[railViewIndex(parsed.definition)]);
				localGlobalFilters = seed.globalFilters;
				localViewFilters = seed.viewFilters;
				localSort = seed.sort;
				viewFormulas = seed.formulas;
				toolbarBase = baseOf(parsed.definition);
			}
			const result = queryViewLens(
				parsed.definition,
				{ globalFilters: localGlobalFilters, viewFilters: localViewFilters, sort: localSort },
				propertyIndex,
				path,
				lensContext(),
			);
			viewLoaded = { path, lens: resolveViewLens(path, viewLoadFromQuery(result), lensContext()) };
		} catch (err) {
			if (generation !== viewLoadGeneration) return;
			appendLog('VIEW-LENS', `load failed for ${path}: ${String(err)}`);
			stepSeed({ kind: 'load-failed' });
			viewLoaded = { path, lens: resolveViewLens(path, viewReadError(err), lensContext()) };
		}
	}

	function emptyToolbarBase(): Record<ToolbarKey, string> {
		return { filters: '', viewFilters: '', sort: '' };
	}

	function baseOf(definition: CollectionDefinition): Record<ToolbarKey, string> {
		const base = emptyToolbarBase();
		for (const key of TOOLBAR_KEYS) base[key] = toolbarKeyBase(definition, key);
		return base;
	}

	/**
	 * Writes the toolbar's `key` to the `.view` file, and only that key, then
	 * re-runs the query. A refused or failed save re-seeds the toolbar from the
	 * file, and so does a write after which another key in the file differs from
	 * the toolbar, so the list never shows a sort or filter the `.view` does not hold.
	 */
	async function persistViewState(key: ToolbarKey) {
		const path = viewPath;
		if (!path) return;
		// Taken now: by the time a queued save runs, the toolbar may hold a newer pick or another view's state.
		const next = toolbarValuesFromState(localGlobalFilters, localViewFilters, localSort)[key];
		const base = toolbarBase[key];
		toolbarBase[key] = canonicalToolbarValue(key, next);
		const run = viewSaveRun?.path === path ? viewSaveRun : { path, pending: 0 };
		viewSaveRun = run;
		run.pending++;
		stepSeed({ kind: 'save-started', path });
		let failed = false;
		let written: CollectionDefinition | null = null;
		try {
			written = await serializeListWrite(path, () => updateViewToolbarKey(path, key, next, base));
		} catch (err) {
			failed = true;
			appendLog('VIEW-LENS', `save failed for ${path}: ${String(err)}`);
			// Not "on disk": a dirty tab's buffer may be what changed.
			if (err instanceof ViewWriteConflict) toast.error('This view changed. Your edit was not saved.');
			// The editor already toasted a tab save that failed.
			else if (!(err instanceof ViewWriteError && err.reason === 'save-failed')) toast.error('Could not save the view');
		}
		run.pending--;
		// Only the last save decides whether the toolbar matches the file: it read the file after every earlier one.
		if (run.pending === 0) {
			const current = viewSaveRun === run;
			if (current) viewSaveRun = null;
			// A key edited elsewhere may differ from the toolbar now: the latch must not adopt that file unseen.
			const stale =
				current &&
				written !== null &&
				toolbarKeysDiffering(written, toolbarValuesFromState(localGlobalFilters, localViewFilters, localSort)).length > 0;
			if (failed || stale) stepSeed({ kind: 'save-failed' });
			else if (current) stepSeed({ kind: 'save-started', path });
		}
		// The lens moved to another view while saving: its own load already ran.
		if (viewPath !== path) return;
		loadView(path, ++viewLoadGeneration, collectionStore.propertyIndex, collectionStore.isIndexReady, viewInTree);
	}

	/** The one type a view lens's filters require (`viewNoteType`), or null. */
	let viewTypeName = $derived(
		viewPath ? viewNoteType([...localGlobalFilters, ...localViewFilters], typeDefinitionsStore.typeMetadataMap.keys()) : null,
	);

	function handleGlobalFiltersChange(groups: FilterGroup[]) {
		localGlobalFilters = groups;
		persistViewState('filters');
	}

	function handleViewFiltersChange(groups: FilterGroup[]) {
		localViewFilters = groups;
		persistViewState('viewFilters');
	}

	function handleSortsChange(sorts: SortDef[]) {
		localSort = sorts;
		persistViewState('sort');
	}

	/** A type lens's definition note, which holds that list's choices; a type without one saves to settings like any other lens. */
	let definitionPath = $derived(lens.kind === 'type' && lens.target ? typeDefinitionsStore.getTypeDefinitionPath(lens.target) : undefined);
	let savedEntry = $derived.by(() => {
		const path = viewPath ?? definitionPath;
		return path ? typeDefinitionsStore.getEntryByPath(path) : undefined;
	});
	let settingsPrefs = $derived(parseRailListPrefs(settingsStore.layout.railListPrefs)[listPrefsKey(lens)]);

	/** The sort this lens has saved, outside a view (whose saved sort is `localSort`). */
	let savedSort = $derived.by((): ListSortConfig | null => {
		if (definitionPath) return parseListSort(savedEntry?.frontmatter['_list_sort']);
		return settingsPrefs?.sort ?? null;
	});
	let savedProperties = $derived(viewPath || definitionPath ? getViewListProperties(savedEntry) : (settingsPrefs?.properties ?? []));

	/**
	 * A pick written to a file, shown until the entries snapshot holds it: the
	 * snapshot refresh is throttled, so right after a save it still says the old
	 * value. `settled` is set when that pick's write finished, and only then may
	 * a matching snapshot end the overlay. Until then a match is the value from
	 * before an earlier pick still on its way, not this pick being saved.
	 */
	interface ListOverlay<T> {
		value: T;
		settled: boolean;
	}

	let sortOverlay = $state.raw<ListOverlay<ListSortConfig | null> | null>(null);
	let propertiesOverlay = $state.raw<ListOverlay<string[]> | null>(null);

	const sortOverlaySlot = {
		get: () => sortOverlay,
		set: (next: ListOverlay<ListSortConfig | null> | null) => (sortOverlay = next),
	};
	const propertiesOverlaySlot = {
		get: () => propertiesOverlay,
		set: (next: ListOverlay<string[]> | null) => (propertiesOverlay = next),
	};

	let shownSort = $derived(sortOverlay ? sortOverlay.value : savedSort);
	let selectedProperties = $derived(propertiesOverlay ? propertiesOverlay.value : savedProperties);

	$effect(() => {
		if (sortOverlay?.settled && sameSort(sortOverlay.value, savedSort)) sortOverlay = null;
	});

	$effect(() => {
		if (propertiesOverlay?.settled && sameProperties(propertiesOverlay.value, savedProperties)) propertiesOverlay = null;
	});

	function sameSort(a: ListSortConfig | null, b: ListSortConfig | null): boolean {
		return (a && formatListSort(a)) === (b && formatListSort(b));
	}

	function sameProperties(a: readonly string[], b: readonly string[]): boolean {
		return a.length === b.length && a.every((key, i) => key === b[i]);
	}

	/**
	 * Shows `value` at once and writes it. Only the newest pick touches the slot
	 * when its write ends: an older one finishing or failing says nothing about
	 * what the list should show now.
	 */
	async function writeThroughOverlay<T>(
		slot: { get: () => ListOverlay<T> | null; set: (next: ListOverlay<T> | null) => void },
		value: T,
		write: () => Promise<void>,
	) {
		const pick: ListOverlay<T> = { value, settled: false };
		slot.set(pick);
		try {
			await write();
			if (slot.get() === pick) slot.set({ value, settled: true });
		} catch (err) {
			if (slot.get() === pick) slot.set(null);
			appendLog('RAIL-SHELL', `list save failed: ${String(err)}`);
			if (err instanceof FrontmatterWriteError) toastFrontmatterWriteError(err);
			// The editor already toasted a `.view` tab save that failed.
			else if (!(err instanceof ViewWriteError && err.reason === 'save-failed')) toast.error('Could not save the list');
		}
	}

	/** Saves a non-view list's sort; null goes back to the lens's own order. */
	function saveListSort(config: ListSortConfig | null) {
		const path = definitionPath;
		if (path) {
			void writeThroughOverlay(sortOverlaySlot, config, () => saveTypeListSort(path, config));
			return;
		}
		settingsStore.updateLayout({
			railListPrefs: withListPrefs(settingsStore.layout.railListPrefs, listPrefsKey(lens), { sort: config }),
		});
	}

	function handleSortSelect(config: ListSortConfig) {
		if (viewPath) {
			handleSortsChange([listSortToSortDef(config)]);
			return;
		}
		saveListSort(config);
	}

	function handleSortReset() {
		if (viewPath) {
			handleSortsChange([]);
			return;
		}
		saveListSort(null);
	}

	function handlePropertiesChange(next: string[]) {
		const view = viewPath;
		const definition = definitionPath;
		if (view) {
			void writeThroughOverlay(propertiesOverlaySlot, next, () => serializeListWrite(view, () => updateViewListProperties(view, next)));
		} else if (definition) {
			void writeThroughOverlay(propertiesOverlaySlot, next, () => saveTypeListProperties(definition, next));
		} else {
			settingsStore.updateLayout({
				railListPrefs: withListPrefs(settingsStore.layout.railListPrefs, listPrefsKey(lens), { properties: next }),
			});
		}
	}

	let searchOpen = $state(false);
	let query = $state('');
	/** The last answered full-text search. Its hits only count for its own text: another query's hits would keep notes the new query does not match. */
	let fullText = $state.raw<{ text: string; hits: ReadonlySet<string> } | null>(null);
	let fullTextLoading = $state(false);
	let fullTextGeneration = 0;
	let searching = $derived(normalizeListQuery(query) !== '');

	/** Which list this is. A folder or neighbourhood lens keeps its kind while its target moves. */
	let listIdentity = $derived(`${lens.kind}:${lens.target ?? ''}`);

	// Pre: the new lens must not render one frame through the old lens's query or overlay.
	$effect.pre(() => {
		void listIdentity;
		untrack(() => {
			sortOverlay = null;
			propertiesOverlay = null;
			closeSearch();
		});
	});

	function closeSearch() {
		searchOpen = false;
		query = '';
	}

	$effect(() => {
		const text = query.trim();
		untrack(() => {
			const generation = ++fullTextGeneration;
			if (!text) {
				fullText = null;
				fullTextLoading = false;
				return;
			}
			void runFullText(text, generation);
		});
	});

	/** Asks FTS for the query. Rust quotes every term, so a failure is the database, not the text; the local title and pill match still answers then. */
	async function runFullText(text: string, generation: number) {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return;
		fullTextLoading = true;
		try {
			const hits = await searchListFullText(text, vaultPath);
			if (generation === fullTextGeneration) fullText = { text, hits };
		} catch (err) {
			debug('RAIL-SHELL', `list full-text search failed: ${String(err)}`);
			if (generation === fullTextGeneration) fullText = null;
		}
		if (generation === fullTextGeneration) fullTextLoading = false;
	}

	/** A view is ordered by its query. Any other lens keeps its native order until a sort is saved. */
	let sortedResolved = $derived(resolved && !viewPath && !resolved.status && shownSort ? applyListSort(resolved, shownSort) : resolved);
	let shownResolved = $derived(sortedResolved ? filterResolvedLens(sortedResolved, query, listPropertiesFor, fullText?.text === query.trim() ? fullText.hits : undefined) : null);
	let notes = $derived(shownResolved?.notes ?? []);

	/** Sort, Search and Properties here: for a lens that resolved with no status, and a view whose toolbar is ready. */
	let listToolbarReady = $derived(viewPath ? viewToolbarReady : resolved !== null && !resolved.status);
	let sortMenuConfig = $derived(
		viewPath
			? viewListSort(localSort, getViewSort(savedEntry))
			: (shownSort ?? defaultLensSort(lens.kind)),
	);
	let sortCustomized = $derived(viewPath ? localSort.length > 0 : shownSort !== null);
	let unfilteredNotes = $derived(resolved?.notes ?? []);
	let sortProperties = $derived(availableListProperties(unfilteredNotes, []));
	let pickableProperties = $derived(availableListProperties(unfilteredNotes, selectedProperties));

	/** Where the multiple sort panel anchors. Not the header: bits-ui ignores outside clicks inside the anchor, so the panel would stay open over the header's other buttons. */
	let sortPanelAnchor = $state<HTMLElement | null>(null);

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
				viewTypeName,
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
		const groups = shownResolved?.groups;
		if (!groups) return null;
		const items: GroupedItem[] = [];
		for (const group of groups) {
			if (isToday && !searching && group.id === TODAY_DATED_GROUP) {
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

	/** The type chip of a row; none where the list is already that one type. */
	function typeChipFor(note: LensNote): string | null {
		const listedType = lens.kind === 'type' ? lens.target : viewTypeName;
		return note.isA === listedType ? null : note.isA;
	}

	function listPropertiesFor(note: LensNote): string[] {
		// A list with a file of its own shows exactly its selection, also while the metadata still holds a just-unticked key.
		if (viewPath || definitionPath || selectedProperties.length > 0) return selectedProperties;
		return note.isA ? (typeDefinitionsStore.getTypeMetadata(note.isA)?.listPropertiesDisplay ?? []) : [];
	}
</script>

<div class="flex h-full flex-col bg-list-bg text-file-explorer-fg" data-rail-note-list>
	<!-- As the first pane, the pad clears the macOS traffic lights and the rail toggle. -->
	<div
		class="@container relative flex h-10 shrink-0 items-center gap-1 bg-tab-bar pr-3 {firstPane ? 'pl-[var(--rail-header-pad)]' : 'pl-3'}"
		style="box-shadow: inset 0 -1px 0 var(--divider)"
		data-tauri-drag-region
	>
		<span class="absolute right-3 bottom-0 size-0" aria-hidden="true" bind:this={sortPanelAnchor}></span>
		<!-- The title and the sort trigger shrink; min-w-16 keeps at least 4 title characters next to the icon actions. -->
		<span class="min-w-16 flex-1 truncate text-title" data-note-list-label>{resolved?.label ?? ''}</span>
		<!-- On the tab bar only the tab text tokens are pinned readable: active is tab-text-active. -->
		<span class="ml-auto text-meta tabular-nums text-tab-text-inactive @max-[12rem]:hidden" data-note-list-count>{resolved?.status?.kind === 'loading' ? '' : notes.length}</span>
		{#if listToolbarReady}
			<RailSortMenu
				config={sortMenuConfig}
				extraCount={viewPath ? Math.max(0, localSort.length - 1) : 0}
				properties={sortProperties}
				customized={sortCustomized}
				onSelect={handleSortSelect}
				onMultipleSort={viewPath ? () => (sortOpen = true) : undefined}
				onReset={handleSortReset}
			/>
			<button
				type="button"
				class="flex shrink-0 cursor-default items-center rounded-md p-1 transition-colors hover:bg-file-explorer-accent hover:text-tab-text-active focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 {searchOpen
					? 'text-tab-text-active'
					: 'text-tab-text-inactive'}"
				title="Search notes"
				aria-label="Search notes"
				aria-pressed={searchOpen}
				onclick={() => {
					if (searchOpen) closeSearch();
					else searchOpen = true;
				}}
				data-note-list-search-toggle
			>
				<Search class="size-3.5" />
			</button>
			<RailPropertiesPicker available={pickableProperties} selected={selectedProperties} onChange={handlePropertiesChange} />
		{/if}
		{#if viewToolbarReady}
			<Popover bind:open={sortOpen}>
				<PopoverPortal>
					<PopoverContent customAnchor={sortPanelAnchor} align="end" class="w-72">
						<SortPanel
							sorts={localSort}
							{availableProperties}
							propertyConfigs={{}}
							propertyIndex={collectionStore.propertyIndex}
							onSortsChange={handleSortsChange}
							emptyText={viewPath ? effectiveViewSortLabel(typeDefinitionsStore.getEntryByPath(viewPath)) : undefined}
						/>
					</PopoverContent>
				</PopoverPortal>
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
				<PopoverPortal>
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
				</PopoverPortal>
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
	{#if searchOpen && listToolbarReady}
		{#key listIdentity}
			<RailListSearch value={query} loading={fullTextLoading} onChange={(next) => (query = next)} onClose={closeSearch} />
		{/key}
	{/if}
	{#if resolved?.rule}
		<div class="shrink-0 border-b border-file-explorer-border px-3 py-1.5 text-[11px] text-file-explorer-muted-fg" data-note-list-rule>
			{resolved.rule}
		</div>
	{/if}

	<NoteRowMenu {notes} extraItems={railRegistryStore.menuItems} class="flex-1 overflow-hidden">
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
		{:else if notes.length === 0 && searching}
			<div class="flex items-center justify-center py-8 text-sm text-file-explorer-muted-fg" data-note-list-no-matches>
				No matching notes
			</div>
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
		typeName={typeChipFor(note)}
		subtitle={note.subtitle}
		italic={note.italic}
		fallbackIcon={KIND_ICONS[note.kind]}
		draggable
	/>
{/snippet}
