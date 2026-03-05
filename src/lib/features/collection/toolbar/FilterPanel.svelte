<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Collapsible,
		CollapsibleTrigger,
		CollapsibleContent,
	} from '$lib/components/ui/collapsible';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
	} from '$lib/components/ui/dropdown-menu';
	import { ChevronRight, Plus } from 'lucide-svelte';
	import type { FilterConjunction, FilterGroup, FilterRow as FilterRowType } from './toolbar.types';
	import { CONJUNCTION_LABELS } from './toolbar.types';
	import { createEmptyFilterRow, inferPropertyType } from './filter.logic';
	import type { NoteRecord } from '../collection.types';
	import FilterRow from './FilterRow.svelte';

	interface Props {
		/** Global filters (applied to all views) */
		globalFilters: FilterGroup[];
		/** View-specific filters */
		viewFilters: FilterGroup[];
		/** Available property names */
		availableProperties: string[];
		/** The property index for type inference */
		propertyIndex: Map<string, NoteRecord>;
		/** Called when global filters change */
		onGlobalFiltersChange: (groups: FilterGroup[]) => void;
		/** Called when view filters change */
		onViewFiltersChange: (groups: FilterGroup[]) => void;
	}

	let {
		globalFilters,
		viewFilters,
		availableProperties,
		propertyIndex,
		onGlobalFiltersChange,
		onViewFiltersChange,
	}: Props = $props();

	let globalOpen = $state(true);
	let viewOpen = $state(true);

	/** Total filter count for each section */
	let globalCount = $derived(globalFilters.reduce((n, g) => n + g.rows.length, 0));
	let viewCount = $derived(viewFilters.reduce((n, g) => n + g.rows.length, 0));

	function updateRow(groups: FilterGroup[], groupIdx: number, rowIdx: number, row: FilterRowType): FilterGroup[] {
		return groups.map((g, gi) =>
			gi === groupIdx
				? { ...g, rows: g.rows.map((r, ri) => (ri === rowIdx ? row : r)) }
				: g,
		);
	}

	function removeRow(groups: FilterGroup[], groupIdx: number, rowIdx: number): FilterGroup[] {
		const updated = groups.map((g, gi) =>
			gi === groupIdx ? { ...g, rows: g.rows.filter((_, ri) => ri !== rowIdx) } : g,
		);
		// Remove empty groups
		return updated.filter((g) => g.rows.length > 0);
	}

	function addFilter(groups: FilterGroup[]): FilterGroup[] {
		const defaultProp = availableProperties[0] ?? 'file.name';
		const type = inferPropertyType(defaultProp, propertyIndex);
		const newRow = createEmptyFilterRow(defaultProp, type);

		if (groups.length === 0) {
			return [{ conjunction: 'and', rows: [newRow] }];
		}
		// Add to the first group
		return groups.map((g, i) =>
			i === 0 ? { ...g, rows: [...g.rows, newRow] } : g,
		);
	}

	function changeConjunction(groups: FilterGroup[], groupIdx: number, conjunction: FilterConjunction): FilterGroup[] {
		return groups.map((g, i) =>
			i === groupIdx ? { ...g, conjunction } : g,
		);
	}
</script>

<div class="flex max-h-[400px] flex-col gap-3 overflow-y-auto">
	<!-- All views section -->
	<Collapsible bind:open={globalOpen}>
		<CollapsibleTrigger class="flex w-full items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
			<ChevronRight class="size-3.5 transition-transform {globalOpen ? 'rotate-90' : ''}" />
			All views
			{#if globalCount > 0}
				<span class="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
					{globalCount}
				</span>
			{/if}
		</CollapsibleTrigger>
		<CollapsibleContent>
			<div class="mt-2 flex flex-col gap-2">
				{#each globalFilters as group, gi}
					<!-- Conjunction selector -->
					<DropdownMenu>
						<DropdownMenuTrigger>
							<button class="text-xs text-muted-foreground hover:text-foreground">
								{CONJUNCTION_LABELS[group.conjunction]}
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							{#each (['and', 'or', 'not'] as const) as conj}
								<DropdownMenuItem
									onclick={() =>
										onGlobalFiltersChange(changeConjunction(globalFilters, gi, conj))}
								>
									<span class="text-xs">{CONJUNCTION_LABELS[conj]}</span>
								</DropdownMenuItem>
							{/each}
						</DropdownMenuContent>
					</DropdownMenu>

					<!-- Filter rows -->
					{#each group.rows as row, ri (row.id)}
						<FilterRow
							{row}
							{availableProperties}
							{propertyIndex}
							onUpdate={(updated) =>
								onGlobalFiltersChange(updateRow(globalFilters, gi, ri, updated))}
							onRemove={() => onGlobalFiltersChange(removeRow(globalFilters, gi, ri))}
						/>
					{/each}
				{/each}

				<Button
					variant="ghost"
					size="sm"
					class="h-7 w-fit gap-1 px-2 text-xs text-muted-foreground"
					onclick={() => onGlobalFiltersChange(addFilter(globalFilters))}
				>
					<Plus class="size-3" />
					Add filter
				</Button>
			</div>
		</CollapsibleContent>
	</Collapsible>

	<Separator />

	<!-- This view section -->
	<Collapsible bind:open={viewOpen}>
		<CollapsibleTrigger class="flex w-full items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
			<ChevronRight class="size-3.5 transition-transform {viewOpen ? 'rotate-90' : ''}" />
			This view
			{#if viewCount > 0}
				<span class="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
					{viewCount}
				</span>
			{/if}
		</CollapsibleTrigger>
		<CollapsibleContent>
			<div class="mt-2 flex flex-col gap-2">
				{#each viewFilters as group, gi}
					<!-- Conjunction selector -->
					<DropdownMenu>
						<DropdownMenuTrigger>
							<button class="text-xs text-muted-foreground hover:text-foreground">
								{CONJUNCTION_LABELS[group.conjunction]}
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							{#each (['and', 'or', 'not'] as const) as conj}
								<DropdownMenuItem
									onclick={() =>
										onViewFiltersChange(changeConjunction(viewFilters, gi, conj))}
								>
									<span class="text-xs">{CONJUNCTION_LABELS[conj]}</span>
								</DropdownMenuItem>
							{/each}
						</DropdownMenuContent>
					</DropdownMenu>

					<!-- Filter rows -->
					{#each group.rows as row, ri (row.id)}
						<FilterRow
							{row}
							{availableProperties}
							{propertyIndex}
							onUpdate={(updated) =>
								onViewFiltersChange(updateRow(viewFilters, gi, ri, updated))}
							onRemove={() => onViewFiltersChange(removeRow(viewFilters, gi, ri))}
						/>
					{/each}
				{/each}

				<Button
					variant="ghost"
					size="sm"
					class="h-7 w-fit gap-1 px-2 text-xs text-muted-foreground"
					onclick={() => onViewFiltersChange(addFilter(viewFilters))}
				>
					<Plus class="size-3" />
					Add filter
				</Button>
			</div>
		</CollapsibleContent>
	</Collapsible>
</div>
