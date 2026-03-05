<script lang="ts">
	import { parseCollectionYaml, updateCollectionYaml } from './yaml-parser';
	import { executeQuery } from './collection.logic';
	import { collectionStore } from './collection.store.svelte';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import type { QueryResult, NoteRecord, SortDef, CollectionViewDef } from './collection.types';
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
	import { Popover, PopoverTrigger, PopoverContent } from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import CalendarConfigPanel from './toolbar/CalendarConfigPanel.svelte';
	import { ListFilter, ArrowUpDown, Columns3, Calendar } from 'lucide-svelte';

	interface Props {
		yamlContent: string;
		/** Called when the YAML content should be updated (e.g. formula persistence) */
		onYamlChange?: (yaml: string) => void;
	}

	let { yamlContent, onYamlChange }: Props = $props();

	/** Local sort state, initialized from view definition */
	let localSort = $state<SortDef[]>([]);
	let initialized = $state(false);

	/** Flag to skip re-initialization when we triggered the YAML change ourselves */
	let selfUpdate = $state(false);

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
		definition?.views[0] ?? null,
	);

	// Initialize local state from view definition
	$effect(() => {
		if (activeView && !initialized) {
			localSort = activeView.sort ? [...activeView.sort] : [];
			localGlobalFilters = parseFilterToGroups(definition?.filters);
			localViewFilters = parseFilterToGroups(activeView.filters);
			localColumns = activeView.order ? [...activeView.order] : undefined;
			localFormulas = formulasToEntries(definition?.formulas);
			initialized = true;
		}
	});

	// Reset when YAML content changes (skip if we triggered the change ourselves)
	$effect(() => {
		void yamlContent;
		if (selfUpdate) {
			selfUpdate = false;
			return;
		}
		initialized = false;
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

	// Sync formula columns in localColumns: remove stale, add new
	$effect(() => {
		if (localColumns === undefined) return;
		const formulaCols = new Set(Object.keys(activeFormulas).map((n) => `formula.${n}`));
		// Keep non-formula columns + only formula columns that still exist
		const withoutStale = localColumns!.filter((c) => !c.startsWith('formula.') || formulaCols.has(c));
		// Add any new formula columns not yet in the list
		const existing = new Set(withoutStale);
		const toAdd = [...formulaCols].filter((c) => !existing.has(c));
		if (toAdd.length > 0 || withoutStale.length !== localColumns!.length) {
			localColumns = [...withoutStale, ...toAdd];
		}
	});

	let queryResult = $derived.by((): QueryResult | null => {
		if (!definition || !activeView || !collectionStore.isIndexReady) return null;

		const globalFilter = filterGroupsToFilter(localGlobalFilters);
		const viewFilter = filterGroupsToFilter(localViewFilters);

		const defWithFilters = { ...definition, filters: globalFilter, formulas: activeFormulas };
		const viewWithOverrides: CollectionViewDef = {
			...activeView,
			filters: viewFilter,
			sort: localSort.length > 0 ? localSort : activeView.sort,
			order: localColumns ?? activeView.order,
		};
		return executeQuery(defWithFilters, viewWithOverrides, collectionStore.propertyIndex);
	});

	/** Persists the current state (formulas, sort, filters) to the YAML file */
	function persistState(opts?: { formulas?: boolean }) {
		if (!onYamlChange) return;
		const formulas = opts?.formulas !== false
			? entriesToFormulas(localFormulas.filter((e) => !e.editing))
			: undefined;
		const globalFilter = filterGroupsToFilter(localGlobalFilters);
		const viewFilter = filterGroupsToFilter(localViewFilters);

		const newYaml = updateCollectionYaml(yamlContent, {
			...(opts?.formulas !== false ? { formulas } : {}),
			filters: globalFilter,
			viewSort: localSort,
			viewFilters: viewFilter,
			viewOrder: localColumns,
		});
		if (newYaml !== yamlContent) {
			selfUpdate = true;
			onYamlChange(newYaml);
		}
	}

	/** Handles formula changes from PropertiesPanel and persists when no entries are being edited */
	function handleFormulasChange(entries: FormulaEntry[]) {
		localFormulas = entries;
		// Persist when no entries are currently being edited
		if (!entries.some((e) => e.editing)) {
			persistState();
		}
	}

	function handleSortsChange(sorts: SortDef[]) {
		localSort = sorts;
		persistState({ formulas: false });
	}

	function handleGlobalFiltersChange(groups: FilterGroup[]) {
		localGlobalFilters = groups;
		persistState({ formulas: false });
	}

	function handleViewFiltersChange(groups: FilterGroup[]) {
		localViewFilters = groups;
		persistState({ formulas: false });
	}

	function handleColumnsChange(cols: string[]) {
		localColumns = cols;
		persistState({ formulas: false });
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
		persistState({ formulas: false });
	}

	function handleDatePropertyChange(prop: string) {
		persistCalendarConfig({ viewDateProperty: prop });
	}

	function handleEndDatePropertyChange(prop: string | undefined) {
		persistCalendarConfig({ viewEndDateProperty: prop });
	}

	function handleWeekStartDayChange(day: number) {
		persistCalendarConfig({ viewWeekStartDay: day });
	}

	function handleColorPropertyChange(prop: string | undefined) {
		persistCalendarConfig({ viewColorProperty: prop });
	}

	/** Persists calendar-specific config fields to YAML */
	function persistCalendarConfig(fields: { viewDateProperty?: string; viewEndDateProperty?: string | undefined; viewWeekStartDay?: number; viewColorProperty?: string | undefined }) {
		if (!onYamlChange) return;
		const newYaml = updateCollectionYaml(yamlContent, fields);
		if (newYaml !== yamlContent) {
			selfUpdate = true;
			onYamlChange(newYaml);
		}
	}

	function handleClickRow(record: NoteRecord) {
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
			<div class="flex h-10 shrink-0 items-center border-b border-border px-3 gap-1">
				<!-- Left: view name + result count -->
				<span class="text-xs font-medium text-muted-foreground">{activeView.name}</span>
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
							<PopoverContent align="end" class="w-64 p-3">
								<CalendarConfigPanel
									dateProperty={activeView.dateProperty}
									endDateProperty={activeView.endDateProperty}
									weekStartDay={activeView.weekStartDay ?? 1}
									colorProperty={activeView.colorProperty}
									{availableProperties}
									onDatePropertyChange={handleDatePropertyChange}
									onEndDatePropertyChange={handleEndDatePropertyChange}
									onWeekStartDayChange={handleWeekStartDayChange}
									onColorPropertyChange={handleColorPropertyChange}
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
						<PopoverContent align="end" class="w-72 p-3">
							<SortPanel
								sorts={localSort}
								{availableProperties}
								propertyConfigs={definition?.properties ?? {}}
								propertyIndex={collectionStore.propertyIndex}
								onSortsChange={handleSortsChange}
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

					<!-- Properties -->
					<Popover bind:open={propertiesOpen}>
						<PopoverTrigger>
							<Button variant="ghost" size="icon-sm" class="text-muted-foreground">
								<Columns3 class="size-3.5" />
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" class="w-72 p-3">
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
			{#if activeView?.type === 'calendar'}
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
				<CollectionTableView
					result={queryResult}
					currentSort={localSort}
					onClickRow={handleClickRow}
					onToggleSort={handleToggleSort}
				/>
			{/if}
		</div>
	{/if}
</div>
