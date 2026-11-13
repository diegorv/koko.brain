<script lang="ts">
	import { tick } from 'svelte';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import { Popover, PopoverPortal, PopoverTrigger, PopoverContent } from '#lib/components/ui/popover/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import {
		filterPropertyItems,
		moveListProperty,
		orderedPropertyItems,
		toggleListProperty,
	} from './list-properties.logic.js';

	let {
		available,
		selected,
		onChange,
	}: {
		/** Every key the picker may offer, already sorted */
		available: string[];
		/** The keys shown in the note list, in display order */
		selected: string[];
		/** Receives the next selected-key list; the parent saves it */
		onChange: (next: string[]) => void;
	} = $props();

	let open = $state(false);
	let query = $state('');

	// The query is per open: a closed panel must not keep filtering the next time it opens.
	$effect(() => {
		if (!open) {
			query = '';
			lastFocused = null;
		}
	});

	const searching = $derived(query.trim() !== '');
	const items = $derived(filterPropertyItems(orderedPropertyItems(selected, available), query));

	// Set on dragstart, read on drop. Plain state: no markup depends on it.
	let dragKey: string | null = null;

	let listEl: HTMLElement | undefined = $state();
	let searchInput: HTMLInputElement | null = $state(null);
	/** Where focus last was in this open of the panel. Plain: no markup depends on it. */
	let lastFocused: HTMLElement | null = null;

	async function moveBy(key: string, step: number) {
		const index = selected.indexOf(key);
		const target = selected[index + step];
		if (index === -1 || target === undefined) return;
		onChange(moveListProperty(selected, key, target));
		await refocusRow(key);
	}

	async function handleToggle(key: string) {
		onChange(toggleListProperty(selected, key));
		await refocusRow(key);
	}

	/** The keyed list moves a row's node when its order changes, and moving a focused node blurs it. */
	async function refocusRow(key: string) {
		await tick();
		const rows = Array.from(listEl?.querySelectorAll<HTMLElement>('[data-note-list-property-row]') ?? []);
		rows.find((row) => row.dataset.noteListPropertyRow === key)?.querySelector('input')?.focus();
	}

	function handleDragStart(event: DragEvent, key: string) {
		dragKey = key;
		// A private type: with text/plain, a drop on the note editor would insert the key as text.
		event.dataTransfer?.setData('application/x-kokobrain-list-property', key);
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
	}

	function handleDragOver(event: DragEvent, key: string, isSelected: boolean) {
		if (dragKey === null || !isSelected) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
	}

	function handleDrop(event: DragEvent, key: string, isSelected: boolean) {
		const from = dragKey;
		dragKey = null;
		if (from === null || !isSelected) return;
		event.preventDefault();
		const next = moveListProperty(selected, from, key);
		if (next !== selected) onChange(next);
	}

	function handleCheckboxKeydown(event: KeyboardEvent, key: string, isSelected: boolean) {
		if (!event.altKey || !isSelected || searching) return;
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			moveBy(key, -1);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			moveBy(key, 1);
		}
	}
</script>

<Popover bind:open>
	<PopoverTrigger
		class="flex shrink-0 cursor-default items-center rounded-md p-1 transition-colors hover:bg-file-explorer-accent hover:text-tab-text-active {selected.length >
		0
			? 'text-tab-text-active'
			: 'text-tab-text-inactive'}"
		title="Show in note list"
		aria-label="Show in note list"
		data-note-list-properties
	>
		<SlidersHorizontal class="size-3.5" />
	</PopoverTrigger>
	<!-- The list pane clips its overflow, and the rows paint over anything inline in its header. -->
	<PopoverPortal>
		<PopoverContent
			align="end"
			class="w-64"
			onOpenAutoFocus={(event) => {
				// The default focuses the panel, not its search input. bits-ui can run this more than once
				// per open, so a later run restores where focus got to instead of the input.
				event.preventDefault();
				void tick().then(() => (lastFocused?.isConnected ? lastFocused : searchInput)?.focus());
			}}
			onfocusin={(event) => {
				lastFocused = event.target as HTMLElement;
			}}
		>
			<div class="section-label pb-2 text-file-explorer-muted-fg">Show in note list</div>
			<Input
				bind:ref={searchInput}
				bind:value={query}
				placeholder="Search properties..."
				aria-label="Search properties"
				class="mb-2 h-8"
			/>
			<ul bind:this={listEl} class="max-h-60 overflow-y-auto">
				{#each items as item (item.key)}
					<li
						class="flex items-center gap-2 rounded-sm px-1 py-1 hover:bg-file-explorer-accent"
						data-note-list-property-row={item.key}
						data-selected={item.selected}
						ondragover={(event) => handleDragOver(event, item.key, item.selected)}
						ondrop={(event) => handleDrop(event, item.key, item.selected)}
					>
						<label class="flex min-w-0 flex-1 cursor-default items-center gap-2">
							<input
								type="checkbox"
								checked={item.selected}
								aria-label={item.label}
								onchange={() => handleToggle(item.key)}
								onkeydown={(event) => handleCheckboxKeydown(event, item.key, item.selected)}
							/>
							<span class="truncate text-meta">{item.label}</span>
						</label>
						{#if item.selected && !searching}
							<span
								class="flex shrink-0 cursor-grab items-center text-file-explorer-muted-fg"
								draggable="true"
								title="Drag to reorder"
								aria-hidden="true"
								data-note-list-property-handle
								ondragstart={(event) => handleDragStart(event, item.key)}
								ondragend={() => (dragKey = null)}
							>
								<GripVertical class="size-3.5" />
							</span>
						{/if}
					</li>
				{:else}
					<li class="px-1 py-2 text-meta text-file-explorer-muted-fg">No matching properties</li>
				{/each}
			</ul>
		</PopoverContent>
	</PopoverPortal>
</Popover>
