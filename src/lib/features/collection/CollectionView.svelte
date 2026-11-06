<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { parseCollectionYaml, addView, removeView, renameView, setViewType, type CollectionYamlUpdates, type ViewType } from './yaml-parser';
	import { executeQuery } from './collection.logic';
	import {
		applyEditorKeyEdit,
		CollectionEditConflict,
		EDITOR_KEYS,
		editorKeyBaseAfter,
		editorKeyBases,
		isViewAt,
		type EditorKey,
	} from './key-edit.logic';
	import { getViewRowSetPort } from './view-row-set.port';
	import { collectionStore } from './collection.store.svelte';
	import { openFileInEditor, reloadExternallyChangedTabs } from '#lib/core/editor/editor.service.js';
	import { error } from '#lib/utils/debug.js';
	import type { QueryResult, PropertyIndexRecord, SortDef, CollectionViewDef } from './collection.types';
	import type { FilterGroup, FormulaEntry } from './toolbar/toolbar.types';
	import { parseFilterToGroups, filterGroupsToFilter, getAllKnownProperties } from './toolbar/filter.logic';
	import { formulasToEntries, entriesToFormulas } from './toolbar/formula.logic';
	import CollectionTableView from './CollectionTableView.svelte';
	import CollectionCalendarView from './CollectionCalendarView.svelte';
	import CollectionLinearCalendarView from './CollectionLinearCalendarView.svelte';
	import FilterPanel from './toolbar/FilterPanel.svelte';
	import SortPanel from './toolbar/SortPanel.svelte';
	import PropertiesPanel from './toolbar/PropertiesPanel.svelte';
	import { getAllAvailableColumns } from './toolbar/properties.logic';
	import { Popover, PopoverTrigger, PopoverContent } from '#lib/components/ui/popover/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import CalendarConfigPanel from './toolbar/CalendarConfigPanel.svelte';
	import ListFilter from '@lucide/svelte/icons/list-filter';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import Columns3 from '@lucide/svelte/icons/columns-3';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Plus from '@lucide/svelte/icons/plus';
	import * as ContextMenu from '#lib/components/ui/context-menu/index.js';

	interface Props {
		/** Absolute path of the `.view` file, keys the remembered view index */
		path: string;
		yamlContent: string;
		/** Called when the YAML content should be updated (e.g. formula persistence) */
		onYamlChange?: (yaml: string) => void;
		/**
		 * Rewrites the `.view` at a path to `transform(base)`, the base being a
		 * dirty tab's buffer, else the file, and saves the tab at once
		 * (`rewriteViewFile`). Writes go through it when given, else to
		 * `onYamlChange`.
		 */
		rewriteView?: (path: string, transform: (base: string) => string) => Promise<boolean>;
	}

	let { path, yamlContent, onYamlChange, rewriteView }: Props = $props();

	/**
	 * The file this instance shows. Read once: the parent keys the view on the
	 * tab path, so another file gets a fresh instance instead of a new `path`.
	 */
	// svelte-ignore state_referenced_locally
	const filePath = path;

	/** Local sort state, initialized from view definition */
	let localSort = $state<SortDef[]>([]);
	let initialized = $state(false);

	/**
	 * The YAML this instance last wrote, until `yamlContent` shows it: the reset
	 * effect then keeps the local toolbar state instead of re-seeding it. Set as
	 * the write builds its bytes, which for a `.view` is after the writer read
	 * the file, so a write still in flight is recognised by its bytes.
	 *
	 * Deliberately a plain variable, NOT `$state`: the reset effect below both
	 * reads and writes it. As `$state`, the `selfYaml = null` write inside
	 * the guard branch dirties the effect's own tracked dependency, re-running
	 * it straight into the reset branch — every self-persist then re-seeds the
	 * local toolbar state (wiping in-progress formula rows and regenerating
	 * filter row uids, which breaks the keyed each and drops input focus per
	 * keystroke). It is never rendered, so it needs no reactivity.
	 */
	let selfYaml: string | null = null;

	/**
	 * Per key, the value the toolbar shows for the active view: the base its
	 * next write of that key is checked against (`applyEditorKeyEdit`). Set at
	 * the seed and advanced by each write as it is queued. Plain: never rendered.
	 */
	let toolbarBase = {} as Record<EditorKey, string>;

	/** Writes queued and not settled yet. */
	let pendingWrites = 0;
	/** Whether a write failed since `pendingWrites` was last 0. */
	let writeFailed = false;

	/** Index of the currently displayed view within definition.views */
	let activeViewIndex = $state(0);
	/** Index of the view whose state was last loaded into the local toolbar state */
	let seededIndex = $state(-1);

	/** Index of the tab currently being renamed inline (null = no rename in progress) */
	let renamingTabIndex = $state<number | null>(null);
	/** Working buffer for the inline rename input */
	let renamingTabValue = $state('');
	/** Index targeted by the per-tab context menu */
	let tabContextIndex = $state<number | null>(null);
	/** DOM node of the rename input, used to focus/select on open */
	let renameInputEl = $state<HTMLInputElement | null>(null);

	/** Panel open states */
	let filterOpen = $state(false);
	let sortOpen = $state(false);
	let propertiesOpen = $state(false);
	let calendarConfigOpen = $state(false);

	/** Local filter state (visual filter groups), initialized from definition/view */
	let localGlobalFilters = $state<FilterGroup[]>([]);
	let localViewFilters = $state<FilterGroup[]>([]);

	/** Local column order, initialized from view definition */
	let localColumns = $state<string[] | undefined>(undefined);

	/** Local formula entries, initialized from definition */
	let localFormulas = $state<FormulaEntry[]>([]);

	let parseResult = $derived(parseCollectionYaml(yamlContent));

	let definition = $derived(
		parseResult.success ? parseResult.definition : null,
	);

	let activeView = $derived(
		definition?.views[activeViewIndex] ?? null,
	);

	// Clamp activeViewIndex if the views array shrinks (e.g. a hand-edit removed views)
	$effect(() => {
		const max = (definition?.views.length ?? 1) - 1;
		if (activeViewIndex > max) activeViewIndex = Math.max(0, max);
	});

	/** Opens the view last used in this file this session, clamped to its view count. */
	function restoreViewIndex() {
		const max = (definition?.views.length ?? 1) - 1;
		activeViewIndex = Math.max(0, Math.min(collectionStore.getViewIndex(filePath) ?? 0, max));
	}

	// Before the seed below, so the first render seeds the restored view.
	restoreViewIndex();

	// Only with a parsed definition: the 0 forced by a YAML error must not
	// overwrite the remembered index.
	$effect(() => {
		if (definition) collectionStore.setViewIndex(filePath, activeViewIndex);
	});

	/** Loads the local toolbar state from the active view when it is not seeded yet. */
	function seedFromDefinition() {
		if (definition && activeView && (!initialized || seededIndex !== activeViewIndex)) {
			localSort = activeView.sort ? [...activeView.sort] : [];
			localGlobalFilters = parseFilterToGroups(definition.filters);
			localViewFilters = parseFilterToGroups(activeView.filters);
			localColumns = activeView.order ? [...activeView.order] : undefined;
			localFormulas = formulasToEntries(definition.formulas);
			toolbarBase = editorKeyBases(definition, activeViewIndex);
			initialized = true;
			seededIndex = activeViewIndex;
		}
	}

	// Seed before the first render: the template runs before top-level effects,
	// so seeding only from the effect below would make the first queryResult
	// ignore the YAML filters and build a row for every note in the vault.
	seedFromDefinition();

	// Re-seeds whenever the user switches tabs (seededIndex diverges) or after a
	// non-self YAML change.
	$effect(() => {
		seedFromDefinition();
	});

	/** Makes the seed effect load the local toolbar state from the YAML again. */
	function reseed() {
		initialized = false;
		seededIndex = -1;
	}

	/**
	 * Skips the reset effect's first run, which would undo the mount-time seed.
	 * Plain variable for the same reason as `selfYaml`. Read after
	 * `void yamlContent` so that first run still tracks `yamlContent`.
	 */
	let resetArmed = false;

	// Reset when YAML content changes (skip if we triggered the change ourselves)
	$effect(() => {
		void yamlContent;
		if (!resetArmed) {
			resetArmed = true;
			return;
		}
		if (yamlContent === selfYaml) {
			selfYaml = null;
			return;
		}
		reseed();
	});

	/** Computed formulas record — only includes confirmed (non-editing) entries */
	let activeFormulas = $derived(
		entriesToFormulas(localFormulas.filter((e) => !e.editing)) ?? {},
	);

	/** All known properties from the index, including formula columns */
	let availableProperties = $derived.by(() => {
		const base = getAllKnownProperties(collectionStore.propertyIndex);
		const formulaProps = Object.keys(activeFormulas).map((n) => `formula.${n}`);
		return [...base, ...formulaProps];
	});

	/** Active filter count for the toolbar badge */
	let activeFilterCount = $derived(
		localGlobalFilters.reduce((n, g) => n + g.rows.length, 0) +
		localViewFilters.reduce((n, g) => n + g.rows.length, 0),
	);

	/** All available columns from index + definition (using active formulas) */
	let allColumns = $derived(
		definition
			? getAllAvailableColumns(collectionStore.propertyIndex, { ...definition, formulas: activeFormulas })
			: [],
	);

	/** `localColumns` with the columns of removed formulas dropped and those of new ones appended, or null when unchanged. */
	function syncedFormulaColumns(): string[] | null {
		if (localColumns === undefined) return null;
		const formulaCols = new Set(Object.keys(activeFormulas).map((n) => `formula.${n}`));
		// Keep non-formula columns + only formula columns that still exist
		const withoutStale = localColumns.filter((c) => !c.startsWith('formula.') || formulaCols.has(c));
		// Add any new formula columns not yet in the list
		const existing = new Set(withoutStale);
		const toAdd = [...formulaCols].filter((c) => !existing.has(c));
		if (toAdd.length > 0 || withoutStale.length !== localColumns.length) return [...withoutStale, ...toAdd];
		return null;
	}

	// Sync formula columns in localColumns: remove stale, add new
	$effect(() => {
		const synced = syncedFormulaColumns();
		if (synced) localColumns = synced;
	});

	let queryResult = $derived.by((): QueryResult | null => {
		if (!definition || !activeView || !collectionStore.isIndexReady) return null;
		// The rail's rule, through the port the app registers; with no port, the plain query.
		const rowSet = getViewRowSetPort();
		if (rowSet && !rowSet.entriesLoaded()) return null;

		const globalFilter = filterGroupsToFilter(localGlobalFilters);
		const viewFilter = filterGroupsToFilter(localViewFilters);

		const defWithFilters = { ...definition, filters: globalFilter, formulas: activeFormulas };
		const viewWithOverrides: CollectionViewDef = {
			...activeView,
			filters: viewFilter,
			sort: localSort.length > 0 ? localSort : activeView.sort,
			order: localColumns ?? activeView.order,
		};
		return executeQuery(
			defWithFilters,
			viewWithOverrides,
			collectionStore.propertyIndex,
			rowSet ? (records, view, def) => rowSet.rows(filePath, records, view, def) : undefined,
		);
	});

	/** The Sort panel's empty-state text: for a `.view`, the sort its list falls back to. */
	let sortEmptyText = $derived.by(() => {
		const rowSet = getViewRowSetPort();
		return rowSet ? rowSet.sortLabel(filePath) : undefined;
	});

	/** Shows why a write was refused or failed. */
	function reportWriteError(err: unknown) {
		// Not "on disk": a dirty tab's buffer may be what changed.
		if (err instanceof CollectionEditConflict) {
			toast.error('This view changed. Your edit was not saved.');
			return;
		}
		// The editor already toasted a tab save that failed (`ViewWriteError`, which collection cannot import).
		if ((err as { reason?: unknown } | null)?.reason === 'save-failed') return;
		error('COLLECTION', 'write failed:', err);
		toast.error('Could not save the view');
	}

	/**
	 * Writes `transform(base)`. With `rewriteView` it writes through it,
	 * so the base is a dirty tab's buffer, else the file (never a clean tab's
	 * older `yamlContent`), and the tab is saved at once; otherwise the base is
	 * `yamlContent` and the result goes to `onYamlChange`. `onApply` runs as the
	 * result is about to reach the tab. What `transform` throws refuses the
	 * write. Once no write is pending, a failure toasts, reloads a clean tab
	 * from the file and re-seeds, and so does a write after which another key
	 * in the file differs from `toolbarBase`, so the toolbar never shows what
	 * the file does not hold.
	 */
	async function writeYaml(transform: (base: string) => string, onApply?: (yaml: string) => void): Promise<void> {
		if (!onYamlChange) return;
		pendingWrites++;
		let written = null as string | null;
		// Not pure, as `rewriteViewFile` asks: its second run happens only once the tab is closed, which destroys this component, so the repeated side effects touch dead state.
		const run = (base: string): string => {
			const out = transform(base);
			if (out !== base) {
				if (out !== yamlContent) selfYaml = out;
				onApply?.(out);
				written = out;
			}
			return out;
		};
		try {
			if (rewriteView) await rewriteView(filePath, run);
			else {
				const out = run(yamlContent);
				if (written !== null) onYamlChange(out);
			}
		} catch (err) {
			writeFailed = true;
			reportWriteError(err);
		}
		if (--pendingWrites > 0) return;
		const failed = writeFailed;
		writeFailed = false;
		if (failed) await reloadExternallyChangedTabs([filePath]);
		const parsed = written !== null && !failed ? parseCollectionYaml(written) : null;
		const bases = parsed?.success ? editorKeyBases(parsed.definition, activeViewIndex) : null;
		if (failed || (bases && EDITOR_KEYS.some((key) => bases[key] !== toolbarBase[key]))) reseed();
	}

	/**
	 * Writes `value` as `key` (of the active view, for a view key), and only
	 * that key. Refused when that key in the file is no longer the value the
	 * toolbar showed (`toolbarBase`).
	 */
	function persistKey<K extends EditorKey>(key: K, value: CollectionYamlUpdates[K]) {
		// Taken now: by the time a queued write runs, the toolbar may hold a newer value or another view.
		const next = $state.snapshot(value) as CollectionYamlUpdates[K];
		const viewIndex = activeViewIndex;
		const base = toolbarBase[key];
		toolbarBase[key] = editorKeyBaseAfter(yamlContent, key, next, viewIndex);
		void writeYaml((content) => {
			const result = applyEditorKeyEdit(content, key, next, base, viewIndex);
			if (result.ok) return result.yaml;
			throw result.reason === 'conflict' ? new CollectionEditConflict() : new Error(result.error);
		});
	}

	/** `content`, or a refusal when the view at `idx` is no longer `name`, the tab the edit was made on. */
	function onView(content: string, idx: number, name: string | undefined): string {
		if (name === undefined || !isViewAt(content, idx, name)) throw new CollectionEditConflict();
		return content;
	}

	/** Handles formula changes from PropertiesPanel and persists when no entries are being edited */
	function handleFormulasChange(entries: FormulaEntry[]) {
		localFormulas = entries;
		// Persist when no entries are currently being edited
		if (!entries.some((e) => e.editing)) {
			persistKey('formulas', entriesToFormulas(localFormulas.filter((e) => !e.editing)));
			// A view with an order shows only those columns, so a formula's column is written with it.
			const synced = syncedFormulaColumns();
			if (synced) handleColumnsChange(synced);
		}
	}

	function handleSortsChange(sorts: SortDef[]) {
		localSort = sorts;
		persistKey('viewSort', localSort);
	}

	function handleGlobalFiltersChange(groups: FilterGroup[]) {
		localGlobalFilters = groups;
		persistKey('filters', filterGroupsToFilter(localGlobalFilters));
	}

	function handleViewFiltersChange(groups: FilterGroup[]) {
		localViewFilters = groups;
		persistKey('viewFilters', filterGroupsToFilter(localViewFilters));
	}

	function handleColumnsChange(cols: string[]) {
		localColumns = cols;
		persistKey('viewOrder', localColumns);
	}

	function handleToggleSort(column: string) {
		const existing = localSort.find((s) => s.column === column);
		if (existing) {
			if (existing.direction === 'ASC') {
				localSort = localSort.map((s) => s.column === column ? { ...s, direction: 'DESC' } : s);
			} else {
				localSort = localSort.filter((s) => s.column !== column);
			}
		} else {
			localSort = [...localSort, { column, direction: 'ASC' }];
		}
		persistKey('viewSort', localSort);
	}

	function handleDatePropertyChange(prop: string) {
		persistKey('viewDateProperty', prop);
	}

	function handleEndDatePropertyChange(prop: string | undefined) {
		persistKey('viewEndDateProperty', prop);
	}

	function handleWeekStartDayChange(day: number) {
		persistKey('viewWeekStartDay', day);
	}

	function handleColorPropertyChange(prop: string | undefined) {
		persistKey('viewColorProperty', prop);
	}

	/** Appends a fresh "Untitled" table view and selects it, opening inline rename. */
	function handleAddView() {
		if (!definition) return;
		void writeYaml(
			(content) => addView(content, 'Untitled', 'table'),
			(yaml) => {
				const parsed = parseCollectionYaml(yaml);
				if (!parsed.success) return;
				// The file's view count, not the one this tab last showed.
				const newIndex = parsed.definition.views.length - 1;
				activeViewIndex = newIndex;
				// Defer the rename to the next microtask so the tab has rendered.
				queueMicrotask(() => startTabRename(newIndex));
			},
		);
	}

	/** Removes the view at `idx`, clamping the active tab if necessary. */
	function handleDeleteView(idx: number) {
		if (!definition || definition.views.length <= 1) return;
		const name = definition.views[idx]?.name;
		const nextIndex = activeViewIndex >= idx && activeViewIndex > 0 ? activeViewIndex - 1 : activeViewIndex;
		// Set as the tab gets the bytes, so the clamp effect never sees the shorter list with the old index.
		void writeYaml((content) => removeView(onView(content, idx, name), idx), () => { activeViewIndex = nextIndex; });
	}

	/** Changes the view type at `idx`. */
	function handleSetViewType(idx: number, type: ViewType) {
		const name = definition?.views[idx]?.name;
		void writeYaml((content) => setViewType(onView(content, idx, name), idx, type));
	}

	/** Opens inline rename for the tab at `idx`. */
	function startTabRename(idx: number) {
		if (!definition) return;
		const current = definition.views[idx]?.name ?? '';
		renamingTabIndex = idx;
		renamingTabValue = current;
		requestAnimationFrame(() => {
			renameInputEl?.focus();
			renameInputEl?.select();
		});
	}

	/** Commits the inline rename. Empty/whitespace input is treated as cancel. */
	function commitTabRename() {
		if (renamingTabIndex === null) return;
		const idx = renamingTabIndex;
		const value = renamingTabValue;
		const name = definition?.views[idx]?.name;
		renamingTabIndex = null;
		void writeYaml((content) => renameView(onView(content, idx, name), idx, value));
	}

	/** Discards the inline rename. */
	function cancelTabRename() {
		renamingTabIndex = null;
	}

	function handleRenameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commitTabRename();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelTabRename();
		}
	}

	function handleClickRow(record: PropertyIndexRecord) {
		openFileInEditor(record.path);
	}
</script>

<div class="flex h-full flex-col overflow-hidden bg-card">
	{#if !parseResult.success}
		<div class="p-4">
			<div class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
				<p class="font-medium">Parse Error</p>
				<p class="mt-1 font-mono text-xs">{parseResult.error}</p>
			</div>
		</div>
	{:else if !queryResult}
		<div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
			Building index...
		</div>
	{:else}
		<!-- Toolbar -->
		{#if activeView}
			<div class="pane-toolbar">
				<!-- Left: view tabs (rename / context menu / add) -->
				{#if definition}
					<ContextMenu.Root>
						<ContextMenu.Trigger>
							{#snippet child({ props })}
								<div {...props} class="flex items-center gap-0.5 overflow-x-auto">
									{#each definition.views as v, i (i)}
										{#if renamingTabIndex === i}
											<input
												bind:this={renameInputEl}
												bind:value={renamingTabValue}
												onkeydown={handleRenameKeydown}
												onblur={commitTabRename}
												class="text-xs px-2 py-0.5 h-6 rounded-xs shrink-0 border border-ring bg-background outline-none"
												style="min-width: 80px;"
											/>
										{:else}
											<button
												class="text-xs px-2 py-0.5 rounded-xs shrink-0 cursor-default {i === activeViewIndex ? 'bg-primary/15 text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}"
												onclick={() => activeViewIndex = i}
												ondblclick={() => startTabRename(i)}
												oncontextmenu={() => { tabContextIndex = i; }}
											>
												{v.name}
											</button>
										{/if}
									{/each}
									<button
										class="text-xs px-1.5 py-0.5 rounded-xs shrink-0 cursor-default text-muted-foreground hover:text-foreground hover:bg-muted"
										title="Add view"
										onclick={handleAddView}
									>
										<Plus class="size-3" />
									</button>
								</div>
							{/snippet}
						</ContextMenu.Trigger>
						<ContextMenu.Content class="w-44">
							{#if tabContextIndex !== null}
								{@const idx = tabContextIndex}
								<ContextMenu.Item onclick={() => startTabRename(idx)}>
									<span>Rename</span>
								</ContextMenu.Item>
								<ContextMenu.Sub>
									<ContextMenu.SubTrigger>
										<span>Change type</span>
									</ContextMenu.SubTrigger>
									<ContextMenu.SubContent>
										<ContextMenu.Item onclick={() => handleSetViewType(idx, 'table')}>
											<span>Table</span>
										</ContextMenu.Item>
										<ContextMenu.Item onclick={() => handleSetViewType(idx, 'calendar')}>
											<span>Calendar</span>
										</ContextMenu.Item>
										<ContextMenu.Item onclick={() => handleSetViewType(idx, 'linear-calendar')}>
											<span>Linear calendar</span>
										</ContextMenu.Item>
									</ContextMenu.SubContent>
								</ContextMenu.Sub>
								<ContextMenu.Item
									variant="destructive"
									disabled={definition.views.length <= 1}
									onclick={() => handleDeleteView(idx)}
								>
									<span>Delete view</span>
								</ContextMenu.Item>
							{/if}
						</ContextMenu.Content>
					</ContextMenu.Root>
				{/if}
				<span class="ml-1 text-xs text-muted-foreground/60">{queryResult.records.length} results</span>

				<!-- Right: toolbar buttons -->
				<div class="ml-auto flex items-center gap-0.5">
					<!-- Calendar config (only for calendar views) -->
					{#if activeView.type === 'calendar' || activeView.type === 'linear-calendar'}
						<Popover bind:open={calendarConfigOpen}>
							<PopoverTrigger>
								<Button
									variant="ghost"
									size="icon-sm"
									class={activeView.dateProperty ? 'text-primary' : 'text-muted-foreground'}
								>
									<Calendar class="size-3.5" />
								</Button>
							</PopoverTrigger>
							<PopoverContent align="end" class="w-64">
								<CalendarConfigPanel
									dateProperty={activeView.dateProperty}
									endDateProperty={activeView.endDateProperty}
									weekStartDay={activeView.weekStartDay ?? 1}
									colorProperty={activeView.colorProperty}
									{availableProperties}
									onDatePropertyChange={handleDatePropertyChange}
									onEndDatePropertyChange={handleEndDatePropertyChange}
									onWeekStartDayChange={activeView.type === 'calendar' ? handleWeekStartDayChange : undefined}
									onColorPropertyChange={activeView.type === 'linear-calendar' ? handleColorPropertyChange : undefined}
								/>
							</PopoverContent>
						</Popover>
					{/if}

					<!-- Sort -->
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
						<PopoverContent align="end" class="w-72">
							<SortPanel
								sorts={localSort}
								{availableProperties}
								propertyConfigs={definition?.properties ?? {}}
								propertyIndex={collectionStore.propertyIndex}
								onSortsChange={handleSortsChange}
								emptyText={sortEmptyText}
							/>
						</PopoverContent>
					</Popover>

					<!-- Filter -->
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

					<!-- Properties -->
					<Popover bind:open={propertiesOpen}>
						<PopoverTrigger>
							<Button variant="ghost" size="icon-sm" class="text-muted-foreground">
								<Columns3 class="size-3.5" />
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" class="w-72">
							<PropertiesPanel
								visibleColumns={localColumns ?? allColumns}
								{allColumns}
								propertyConfigs={definition?.properties ?? {}}
								onColumnsChange={handleColumnsChange}
								formulaEntries={localFormulas}
								onFormulasChange={handleFormulasChange}
							/>
						</PopoverContent>
					</Popover>
				</div>
			</div>
		{/if}
		<div class="flex-1 overflow-auto">
			{#if queryResult.filterError}
				<!-- Toolbar stays above, so the filter can be fixed where it was typed. -->
				<div class="p-4">
					<div role="alert" class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-row text-destructive">
						<p class="font-medium">Filter error</p>
						<p class="mt-1 font-mono text-meta">{queryResult.filterError}</p>
					</div>
				</div>
			{:else if activeView?.type === 'calendar'}
				{#if activeView.dateProperty}
					<CollectionCalendarView
						result={queryResult}
						dateProperty={activeView.dateProperty}
						endDateProperty={activeView.endDateProperty}
						weekStartDay={activeView.weekStartDay}
						onClickRecord={handleClickRow}
					/>
				{:else}
					<div class="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
						Configure a date property to display entries on the calendar
					</div>
				{/if}
			{:else if activeView?.type === 'linear-calendar'}
				{#if activeView.dateProperty}
					<CollectionLinearCalendarView
						result={queryResult}
						dateProperty={activeView.dateProperty}
						endDateProperty={activeView.endDateProperty}
						colorProperty={activeView.colorProperty}
						onClickRecord={handleClickRow}
					/>
				{:else}
					<div class="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
						Configure a date property to display the linear calendar
					</div>
				{/if}
			{:else}
				<!-- Keyed so each view tab starts at the row cap, not at the count "Show more" reached on another tab. -->
				{#key activeViewIndex}
					<CollectionTableView
						result={queryResult}
						currentSort={localSort}
						onClickRow={handleClickRow}
						onToggleSort={handleToggleSort}
					/>
				{/key}
			{/if}
		</div>
	{/if}
</div>
