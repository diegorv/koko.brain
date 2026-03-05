<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuLabel,
	} from '$lib/components/ui/dropdown-menu';
	import { X, ChevronDown } from 'lucide-svelte';
	import type { FilterRow as FilterRowType, FilterOperator } from './toolbar.types';
	import { OPERATOR_LABELS } from './toolbar.types';
	import { getOperatorsForType, inferPropertyType } from './filter.logic';
	import type { NoteRecord } from '../collection.types';

	interface Props {
		/** The filter row data */
		row: FilterRowType;
		/** Available property names for the property selector */
		availableProperties: string[];
		/** The property index for type inference */
		propertyIndex: Map<string, NoteRecord>;
		/** Called when the row is updated */
		onUpdate: (row: FilterRowType) => void;
		/** Called when the row should be removed */
		onRemove: () => void;
	}

	let { row, availableProperties, propertyIndex, onUpdate, onRemove }: Props = $props();

	/** Inferred type of the current property */
	let propertyType = $derived(
		row.property ? inferPropertyType(row.property, propertyIndex) : 'text',
	);

	/** Valid operators for the current property type */
	let validOperators = $derived(getOperatorsForType(propertyType));

	/** Whether the current operator is unary (no value input needed) */
	let isUnaryOperator = $derived(
		['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(row.operator),
	);

	/** Groups properties into File, Note, and Formula categories */
	let propertyGroups = $derived.by(() => {
		const file: string[] = [];
		const note: string[] = [];
		const formula: string[] = [];
		for (const prop of availableProperties) {
			if (prop.startsWith('file.')) {
				file.push(prop);
			} else if (prop.startsWith('formula.')) {
				formula.push(prop);
			} else {
				note.push(prop);
			}
		}
		return { file, note, formula };
	});

	function handlePropertyChange(property: string) {
		const newType = inferPropertyType(property, propertyIndex);
		const operators = getOperatorsForType(newType);
		onUpdate({ ...row, property, operator: operators[0], value: '' });
	}

	function handleOperatorChange(operator: FilterOperator) {
		onUpdate({ ...row, operator, value: isUnaryOp(operator) ? '' : row.value });
	}

	function handleValueChange(value: string) {
		onUpdate({ ...row, value });
	}

	function handleRawChange(raw: string) {
		onUpdate({ ...row, raw });
	}

	function isUnaryOp(op: FilterOperator): boolean {
		return ['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(op);
	}
</script>

{#if row.raw !== undefined}
	<!-- Raw expression mode -->
	<div class="flex items-center gap-1.5">
		<input
			value={row.raw}
			oninput={(e) => handleRawChange(e.currentTarget.value)}
			placeholder="Expression..."
			class="border-input bg-background placeholder:text-muted-foreground h-7 flex-1 rounded-md border px-2 font-mono text-xs outline-none focus-visible:border-ring"
		/>
		<Button variant="ghost" size="icon-sm" class="size-7 shrink-0" onclick={onRemove}>
			<X class="size-3.5" />
		</Button>
	</div>
{:else}
	<!-- Visual filter mode -->
	<div class="flex items-center gap-1.5">
		<!-- Property selector -->
		<DropdownMenu>
			<DropdownMenuTrigger>
				<button
					class="flex h-7 min-w-[80px] items-center justify-between gap-1 rounded-md border border-input bg-background px-2 text-xs hover:bg-accent"
				>
					<span class="truncate">{row.property || 'Property'}</span>
					<ChevronDown class="size-3 shrink-0 opacity-50" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent class="max-h-[300px] overflow-y-auto">
				{#if propertyGroups.file.length > 0}
					<DropdownMenuLabel class="text-xs">File</DropdownMenuLabel>
					{#each propertyGroups.file as prop}
						<DropdownMenuItem onclick={() => handlePropertyChange(prop)}>
							<span class="text-xs">{prop}</span>
						</DropdownMenuItem>
					{/each}
				{/if}
				{#if propertyGroups.note.length > 0}
					{#if propertyGroups.file.length > 0}
						<DropdownMenuSeparator />
					{/if}
					<DropdownMenuLabel class="text-xs">Note</DropdownMenuLabel>
					{#each propertyGroups.note as prop}
						<DropdownMenuItem onclick={() => handlePropertyChange(prop)}>
							<span class="text-xs">{prop}</span>
						</DropdownMenuItem>
					{/each}
				{/if}
				{#if propertyGroups.formula.length > 0}
					<DropdownMenuSeparator />
					<DropdownMenuLabel class="text-xs">Formula</DropdownMenuLabel>
					{#each propertyGroups.formula as prop}
						<DropdownMenuItem onclick={() => handlePropertyChange(prop)}>
							<span class="text-xs">{prop}</span>
						</DropdownMenuItem>
					{/each}
				{/if}
			</DropdownMenuContent>
		</DropdownMenu>

		<!-- Operator selector -->
		<DropdownMenu>
			<DropdownMenuTrigger>
				<button
					class="flex h-7 min-w-[70px] items-center justify-between gap-1 rounded-md border border-input bg-background px-2 text-xs hover:bg-accent"
				>
					<span class="truncate">{OPERATOR_LABELS[row.operator]}</span>
					<ChevronDown class="size-3 shrink-0 opacity-50" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				{#each validOperators as op}
					<DropdownMenuItem onclick={() => handleOperatorChange(op)}>
						<span class="text-xs">{OPERATOR_LABELS[op]}</span>
					</DropdownMenuItem>
				{/each}
			</DropdownMenuContent>
		</DropdownMenu>

		<!-- Value input (hidden for unary operators) -->
		{#if !isUnaryOperator}
			<input
				value={row.value}
				oninput={(e) => handleValueChange(e.currentTarget.value)}
				placeholder="Value..."
				class="border-input bg-background placeholder:text-muted-foreground h-7 min-w-[80px] flex-1 rounded-md border px-2 text-xs outline-none focus-visible:border-ring"
			/>
		{/if}

		<!-- Delete button -->
		<Button variant="ghost" size="icon-sm" class="size-7 shrink-0" onclick={onRemove}>
			<X class="size-3.5" />
		</Button>
	</div>
{/if}
