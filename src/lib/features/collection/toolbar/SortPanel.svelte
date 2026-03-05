<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
	} from '$lib/components/ui/dropdown-menu';
	import { GripVertical, X, Plus, ChevronDown } from 'lucide-svelte';
	import type { SortDef, PropertyConfig, NoteRecord } from '../collection.types';
	import { inferPropertyType } from './filter.logic';
	import {
		removeSort,
		toggleSortDirection,
		reorderSorts,
		getSortDirectionLabel,
	} from './sort.logic';

	interface Props {
		/** Current sort definitions */
		sorts: SortDef[];
		/** Available property names for adding new sorts */
		availableProperties: string[];
		/** Property display name configs */
		propertyConfigs: Record<string, PropertyConfig>;
		/** The property index for type inference */
		propertyIndex: Map<string, NoteRecord>;
		/** Called when sorts change */
		onSortsChange: (sorts: SortDef[]) => void;
	}

	let { sorts, availableProperties, propertyConfigs, propertyIndex, onSortsChange }: Props = $props();

	/** Properties not yet sorted, available for the "+ Add sort" dropdown */
	let unsortedProperties = $derived(
		availableProperties.filter((p) => !sorts.some((s) => s.column === p)),
	);

	/** Drag state */
	let dragIndex = $state<number | null>(null);

	function getDisplayName(column: string): string {
		return propertyConfigs[column]?.displayName ?? column;
	}

	function handleDragStart(index: number, event: DragEvent) {
		dragIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleDragOver(index: number, event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}

	function handleDrop(toIndex: number) {
		if (dragIndex !== null && dragIndex !== toIndex) {
			onSortsChange(reorderSorts(sorts, dragIndex, toIndex));
		}
		dragIndex = null;
	}

	function handleDragEnd() {
		dragIndex = null;
	}
</script>

<div class="flex flex-col gap-2">
	{#each sorts as sort, i (sort.column)}
		{@const propType = inferPropertyType(sort.column, propertyIndex)}
		<div
			class="flex items-center gap-1.5"
			draggable="true"
			ondragstart={(e) => handleDragStart(i, e)}
			ondragover={(e) => handleDragOver(i, e)}
			ondrop={() => handleDrop(i)}
			ondragend={handleDragEnd}
			role="listitem"
		>
			<!-- Drag handle -->
			<span class="cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing">
				<GripVertical class="size-3.5" />
			</span>

			<!-- Property name -->
			<span class="min-w-[80px] truncate text-xs">{getDisplayName(sort.column)}</span>

			<!-- Direction toggle -->
			<DropdownMenu>
				<DropdownMenuTrigger>
					<button
						class="flex h-7 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs hover:bg-accent"
					>
						<span class="whitespace-nowrap">{getSortDirectionLabel(sort.direction, propType)}</span>
						<ChevronDown class="size-3 shrink-0 opacity-50" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem
						onclick={() => {
							if (sort.direction !== 'ASC') onSortsChange(toggleSortDirection(sorts, sort.column));
						}}
					>
						<span class="text-xs">{getSortDirectionLabel('ASC', propType)}</span>
					</DropdownMenuItem>
					<DropdownMenuItem
						onclick={() => {
							if (sort.direction !== 'DESC') onSortsChange(toggleSortDirection(sorts, sort.column));
						}}
					>
						<span class="text-xs">{getSortDirectionLabel('DESC', propType)}</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<!-- Delete button -->
			<Button
				variant="ghost"
				size="icon-sm"
				class="size-7 shrink-0"
				onclick={() => onSortsChange(removeSort(sorts, sort.column))}
			>
				<X class="size-3.5" />
			</Button>
		</div>
	{/each}

	{#if sorts.length === 0}
		<p class="text-xs text-muted-foreground">No sorts applied</p>
	{/if}

	<!-- Add sort -->
	{#if unsortedProperties.length > 0}
		<DropdownMenu>
			<DropdownMenuTrigger>
				<Button variant="ghost" size="sm" class="h-7 w-fit gap-1 px-2 text-xs text-muted-foreground">
					<Plus class="size-3" />
					Add sort
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent class="max-h-[300px] overflow-y-auto">
				{#each unsortedProperties as prop}
					<DropdownMenuItem onclick={() => onSortsChange([...sorts, { column: prop, direction: 'ASC' }])}>
						<span class="text-xs">{getDisplayName(prop)}</span>
					</DropdownMenuItem>
				{/each}
			</DropdownMenuContent>
		</DropdownMenu>
	{/if}
</div>
