<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Pencil, X, Check } from 'lucide-svelte';
	import type { FormulaEntry } from './toolbar.types';

	interface Props {
		/** The formula entry data */
		entry: FormulaEntry;
		/** Called when the entry is updated (name, expression, editing state) */
		onUpdate: (
			updates: Partial<Pick<FormulaEntry, 'name' | 'expression' | 'editing'>>,
		) => void;
		/** Called when the entry should be removed */
		onRemove: () => void;
		/** Validation error for the name field */
		nameError?: string;
	}

	let { entry, onUpdate, onRemove, nameError }: Props = $props();
</script>

{#if entry.editing}
	<!-- Edit mode: name input + expression input -->
	<div class="flex flex-col gap-1.5 rounded-md border border-input bg-background p-2">
		<div class="flex items-center gap-1.5">
			<input
				value={entry.name}
				oninput={(e) => onUpdate({ name: e.currentTarget.value })}
				placeholder="Formula name..."
				class="border-input bg-background placeholder:text-muted-foreground h-7 flex-1 rounded-md border px-2 text-xs outline-none focus-visible:border-ring"
			/>
			<Button
				variant="ghost"
				size="icon-sm"
				class="size-7 shrink-0"
				onclick={() => onUpdate({ editing: false })}
			>
				<Check class="size-3.5" />
			</Button>
			<Button variant="ghost" size="icon-sm" class="size-7 shrink-0" onclick={onRemove}>
				<X class="size-3.5" />
			</Button>
		</div>
		{#if nameError}
			<p class="text-[10px] text-destructive">{nameError}</p>
		{/if}
		<input
			value={entry.expression}
			oninput={(e) => onUpdate({ expression: e.currentTarget.value })}
			placeholder="Expression (e.g. priority * 2)..."
			class="border-input bg-background placeholder:text-muted-foreground h-7 rounded-md border px-2 font-mono text-xs outline-none focus-visible:border-ring"
		/>
		{#if entry.error}
			<p class="text-[10px] text-destructive">{entry.error}</p>
		{/if}
	</div>
{:else}
	<!-- View mode: name display + edit/delete buttons -->
	<div class="flex items-center gap-1.5 rounded px-1 py-0.5 text-xs hover:bg-accent">
		<span class="flex-1 truncate">{entry.name || '(unnamed)'}</span>
		<button
			class="text-muted-foreground/50 hover:text-foreground"
			onclick={() => onUpdate({ editing: true })}
		>
			<Pencil class="size-3" />
		</button>
		<button class="text-muted-foreground/50 hover:text-destructive" onclick={onRemove}>
			<X class="size-3" />
		</button>
	</div>
{/if}
