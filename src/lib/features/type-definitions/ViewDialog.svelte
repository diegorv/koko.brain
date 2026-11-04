<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { fileOperationErrorMessage } from '#lib/core/filesystem/fs.logic.js';
	import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
	import FilterPanel from '#lib/features/collection/toolbar/FilterPanel.svelte';
	import {
		filterGroupsToFilter,
		getAllKnownProperties,
		isUnaryOperator,
	} from '#lib/features/collection/toolbar/filter.logic.js';
	import type { FilterGroup } from '#lib/features/collection/toolbar/toolbar.types.js';
	import { createView } from './type-definitions.service';
	import { validateViewName } from './type-definitions.logic';

	interface Props {
		/** Whether the dialog is open (bindable). A close request is ignored while a create is in flight. */
		open: boolean;
		/** Labels of the views the navigator lists; a name matching one is refused. */
		existingLabels: string[];
		/** Called with the created `.view` path after the dialog closed. */
		oncreated: (path: string) => void;
	}

	let { open = $bindable(), existingLabels, oncreated }: Props = $props();

	let name = $state('');
	/** The name check's message shows only once the user has typed, so a fresh dialog opens without a warning. */
	let typed = $state(false);
	let saving = $state(false);
	let submitError = $state<string | null>(null);
	let inputRef = $state<HTMLInputElement | null>(null);
	/** The first view's own filters, as the note list's Filter panel edits them under "This view". */
	let groups = $state<FilterGroup[]>([]);

	let nameError = $derived(validateViewName(name, existingLabels));
	let availableProperties = $derived(getAllKnownProperties(collectionStore.propertyIndex));
	/** A row whose operator takes a value but has none blocks Create rather than being dropped on save. */
	let blankValue = $derived(
		groups.some((g) => g.rows.some((r) => r.raw === undefined && !isUnaryOperator(r.operator) && r.value.trim() === '')),
	);

	/** Every close (Cancel, Escape, outside click, close button) goes through here; a closed dialog reopens blank. */
	function setOpen(next: boolean) {
		if (!next && saving) return;
		open = next;
		if (!next) {
			name = '';
			typed = false;
			submitError = null;
			groups = [];
		}
	}

	async function submit() {
		if (nameError !== null || blankValue || saving) return;
		const trimmed = name.trim();
		saving = true;
		submitError = null;
		let path: string;
		try {
			path = await createView(trimmed, filterGroupsToFilter(groups));
		} catch (err) {
			submitError = fileOperationErrorMessage('create', `${trimmed}.view`, err);
			return;
		} finally {
			saving = false;
		}
		setOpen(false);
		oncreated(path);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			void submit();
		}
	}
</script>

<Dialog.Root bind:open={() => open, setOpen}>
	<Dialog.Content
		class="sm:max-w-lg"
		onOpenAutoFocus={(e) => {
			e.preventDefault();
			inputRef?.focus();
		}}
	>
		<Dialog.Header>
			<Dialog.Title>New view</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-1.5">
			<Input
				bind:ref={inputRef}
				bind:value={name}
				oninput={() => {
					typed = true;
					// A failed-create reason names the file of the old name.
					submitError = null;
				}}
				onkeydown={handleKeydown}
				placeholder="View name"
				aria-invalid={typed && nameError !== null ? true : undefined}
			/>
			{#if typed && nameError !== null}
				<span class="text-meta text-destructive" data-view-dialog-name-error>{nameError}</span>
			{/if}
			{#if submitError}
				<p class="text-meta text-destructive" role="alert">{submitError}</p>
			{/if}
		</div>
		<div class="flex flex-col gap-1.5">
			<FilterPanel
				showGlobal={false}
				globalFilters={[]}
				viewFilters={groups}
				{availableProperties}
				propertyIndex={collectionStore.propertyIndex}
				onGlobalFiltersChange={() => {}}
				onViewFiltersChange={(next) => (groups = next)}
			/>
			{#if blankValue}
				<span class="text-meta text-destructive" data-view-dialog-filter-error>Every filter needs a value</span>
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" disabled={saving} onclick={() => setOpen(false)}>Cancel</Button>
			<Button disabled={nameError !== null || blankValue || saving} onclick={submit}>Create</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
