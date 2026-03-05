<script lang="ts">
	import type { PropertyConfig } from '../collection.types';
	import type { FormulaEntry } from './toolbar.types';
	import { toggleColumn } from './properties.logic';
	import {
		addFormulaEntry,
		removeFormulaEntry,
		updateFormulaEntry,
		setFormulaEditing,
		validateFormulaName,
	} from './formula.logic';
	import FormulaRow from './FormulaRow.svelte';
	import { Plus, Pencil, X } from 'lucide-svelte';

	interface Props {
		/** Currently visible columns */
		visibleColumns: string[];
		/** All available columns */
		allColumns: string[];
		/** Property display name configs */
		propertyConfigs: Record<string, PropertyConfig>;
		/** Called when visible columns change */
		onColumnsChange: (columns: string[]) => void;
		/** Formula entries for the management UI */
		formulaEntries: FormulaEntry[];
		/** Called when formula entries change (add, edit, delete) */
		onFormulasChange: (entries: FormulaEntry[]) => void;
	}

	let {
		visibleColumns,
		allColumns,
		propertyConfigs,
		onColumnsChange,
		formulaEntries,
		onFormulasChange,
	}: Props = $props();

	/** Group columns into File and Note categories (formulas are managed via formulaEntries) */
	let columnGroups = $derived.by(() => {
		const file: string[] = [];
		const note: string[] = [];
		for (const col of allColumns) {
			if (col.startsWith('file.')) {
				file.push(col);
			} else if (!col.startsWith('formula.')) {
				note.push(col);
			}
		}
		return { file, note };
	});

	function getDisplayName(column: string): string {
		return propertyConfigs[column]?.displayName ?? column;
	}

	let scrollContainer = $state<HTMLDivElement | null>(null);

	function handleToggle(column: string, checked: boolean) {
		onColumnsChange(toggleColumn(visibleColumns, column, checked, allColumns));
	}

	function handleAddFormula() {
		onFormulasChange(addFormulaEntry(formulaEntries));
		// Scroll to bottom after DOM updates
		requestAnimationFrame(() => {
			scrollContainer?.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
		});
	}
</script>

<div bind:this={scrollContainer} class="flex max-h-[300px] flex-col gap-1 overflow-y-auto">
	{#if columnGroups.file.length > 0}
		<p class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">File</p>
		{#each columnGroups.file as col}
			<label class="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-accent">
				<input
					type="checkbox"
					checked={visibleColumns.includes(col)}
					onchange={(e) => handleToggle(col, e.currentTarget.checked)}
					class="size-3.5 rounded border-input accent-primary"
				/>
				{getDisplayName(col)}
			</label>
		{/each}
	{/if}

	{#if columnGroups.note.length > 0}
		{#if columnGroups.file.length > 0}
			<div class="my-1 h-px bg-border"></div>
		{/if}
		<p class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">Note</p>
		{#each columnGroups.note as col}
			<label class="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-accent">
				<input
					type="checkbox"
					checked={visibleColumns.includes(col)}
					onchange={(e) => handleToggle(col, e.currentTarget.checked)}
					class="size-3.5 rounded border-input accent-primary"
				/>
				{getDisplayName(col)}
			</label>
		{/each}
	{/if}

	{#if formulaEntries.length > 0}
		{#if columnGroups.file.length > 0 || columnGroups.note.length > 0}
			<div class="my-1 h-px bg-border"></div>
		{/if}
		<p class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
			Formula
		</p>
		{#each formulaEntries as entry (entry.id)}
			{#if entry.editing}
				<FormulaRow
					{entry}
					nameError={validateFormulaName(entry.name, formulaEntries, entry.id)}
					onUpdate={(updates) =>
						onFormulasChange(updateFormulaEntry(formulaEntries, entry.id, updates))}
					onRemove={() => onFormulasChange(removeFormulaEntry(formulaEntries, entry.id))}
				/>
			{:else}
				<div class="flex items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-accent">
					<input
						type="checkbox"
						checked={visibleColumns.includes(`formula.${entry.name}`)}
						onchange={(e) => handleToggle(`formula.${entry.name}`, e.currentTarget.checked)}
						class="size-3.5 rounded border-input accent-primary"
					/>
					<span class="flex-1 truncate">{entry.name || '(unnamed)'}</span>
					<button
						class="text-muted-foreground/50 hover:text-foreground"
						onclick={() =>
							onFormulasChange(setFormulaEditing(formulaEntries, entry.id))}
					>
						<Pencil class="size-3" />
					</button>
					<button
						class="text-muted-foreground/50 hover:text-destructive"
						onclick={() =>
							onFormulasChange(removeFormulaEntry(formulaEntries, entry.id))}
					>
						<X class="size-3" />
					</button>
				</div>
			{/if}
		{/each}
	{/if}

	{#if allColumns.length === 0 && formulaEntries.length === 0}
		<p class="text-xs text-muted-foreground">No properties available</p>
	{/if}
</div>

<!-- Add formula button -->
<div class="mt-1 h-px bg-border"></div>
<button
	class="mt-1 flex h-7 w-fit items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
	onclick={(e) => {
		e.stopPropagation();
		handleAddFormula();
	}}
>
	<Plus class="size-3" />
	Add formula
</button>
