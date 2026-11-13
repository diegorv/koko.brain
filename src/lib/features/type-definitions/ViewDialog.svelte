<script lang="ts">
	import { untrack } from 'svelte';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { fileOperationErrorMessage, getFileName } from '#lib/core/filesystem/fs.logic.js';
	import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
	import FilterPanel from '#lib/features/collection/toolbar/FilterPanel.svelte';
	import {
		filterGroupsToFilter,
		getAllKnownProperties,
		isUnaryOperator,
		parseFilterToGroups,
	} from '#lib/features/collection/toolbar/filter.logic.js';
	import type { FilterGroup } from '#lib/features/collection/toolbar/toolbar.types.js';
	import { railViewIndex } from '#lib/features/collection/yaml-parser.js';
	import { createView, editView } from './type-definitions.service';
	import { validateViewName } from './type-definitions.logic';
	import { refreshViewDefinition } from './view-parse-cache';

	interface Props {
		/** Whether the dialog is open (bindable). A close request is ignored while a save is in flight. */
		open: boolean;
		/** Labels of the views the name may not take; for Edit view, every view but the edited one. */
		existingLabels: string[];
		/** The view to edit, with the label its row shows; without it the dialog creates a view. */
		edit?: { path: string; label: string } | null;
		/** New view: called with the created `.view` path after the dialog closed. */
		oncreated?: (path: string) => void;
		/** New view: the folder the `.view` is created in; the vault root without it. */
		folder?: string;
	}

	let { open = $bindable(), existingLabels, edit = null, oncreated, folder }: Props = $props();

	let name = $state('');
	/**
	 * The name check's message shows only once the user has typed, so a fresh New view opens without a warning.
	 * Edit view sets it at load: a prefilled label can already fail the check, and Save would be disabled with no reason.
	 */
	let typed = $state(false);
	let saving = $state(false);
	let submitError = $state<string | null>(null);
	let inputRef = $state<HTMLInputElement | null>(null);
	/** The own filters of the view the rail runs (`railViewIndex`), as the note list's Filter panel edits them under "This view". */
	let groups = $state<FilterGroup[]>([]);
	/** Edit view: the top-level filters, under "All views". */
	let globalGroups = $state<FilterGroup[]>([]);
	/** Edit view: "All views" shows only for a view that had top-level filters when the dialog opened. */
	let showGlobal = $state(false);
	let loading = $state(false);
	/** Edit view: why the `.view` could not be read or parsed; Save stays disabled. */
	let loadError = $state<string | null>(null);
	/** Bumped by every load and close, so a read that resolves after either is dropped. */
	let loadSeq = 0;

	let nameError = $derived(validateViewName(name, existingLabels, !edit));
	let availableProperties = $derived(getAllKnownProperties(collectionStore.propertyIndex));
	/** A row whose operator takes a value but has none blocks the save rather than being dropped on save. */
	let blankValue = $derived(
		[...groups, ...(showGlobal ? globalGroups : [])].some((g) =>
			g.rows.some((r) => r.raw === undefined && !isUnaryOperator(r.operator) && r.value.trim() === ''),
		),
	);
	let blocked = $derived(nameError !== null || blankValue || loading || loadError !== null);

	$effect(() => {
		if (!open || !edit) return;
		const target = edit;
		untrack(() => void load(target));
	});

	/** Prefills Edit view from a fresh read of the file, not the cached parse. */
	async function load(target: { path: string; label: string }) {
		const seq = ++loadSeq;
		name = target.label;
		typed = true;
		loading = true;
		loadError = null;
		const fileName = getFileName(target.path);
		let result: Awaited<ReturnType<typeof refreshViewDefinition>>;
		try {
			result = await refreshViewDefinition(target.path);
		} catch (err) {
			if (seq !== loadSeq) return;
			loading = false;
			loadError = fileOperationErrorMessage('read', fileName, err);
			return;
		}
		if (seq !== loadSeq) return;
		loading = false;
		if (!result.success) {
			loadError = fileOperationErrorMessage('read', fileName, result.error);
			return;
		}
		groups = parseFilterToGroups(result.definition.views[railViewIndex(result.definition)].filters);
		globalGroups = parseFilterToGroups(result.definition.filters);
		showGlobal = globalGroups.length > 0;
	}

	/** Every close (Cancel, Escape, outside click, close button) goes through here; a closed dialog reopens blank. */
	function setOpen(next: boolean) {
		if (!next && saving) return;
		open = next;
		if (!next) {
			loadSeq++;
			name = '';
			typed = false;
			submitError = null;
			groups = [];
			globalGroups = [];
			showGlobal = false;
			loading = false;
			loadError = null;
		}
	}

	async function submit() {
		if (blocked || saving) return;
		const trimmed = name.trim();
		if (edit) {
			await save(edit.path, trimmed);
			return;
		}
		saving = true;
		submitError = null;
		let path: string;
		try {
			path = await createView(trimmed, filterGroupsToFilter(groups), folder);
		} catch (err) {
			submitError = fileOperationErrorMessage('create', `${trimmed}.view`, err);
			return;
		} finally {
			saving = false;
		}
		setOpen(false);
		oncreated?.(path);
	}

	/** Edit view: writes the name and filters; the top-level filters only when "All views" is shown. */
	async function save(path: string, label: string) {
		saving = true;
		submitError = null;
		try {
			await editView(path, {
				label,
				viewFilters: filterGroupsToFilter(groups),
				...(showGlobal ? { filters: filterGroupsToFilter(globalGroups) } : {}),
			});
		} catch (err) {
			submitError = fileOperationErrorMessage('save', getFileName(path), err);
			return;
		} finally {
			saving = false;
		}
		setOpen(false);
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
			<Dialog.Title>{edit ? 'Edit view' : 'New view'}</Dialog.Title>
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
		{#if loadError}
			<p class="text-meta text-destructive" role="alert" data-view-dialog-load-error>{loadError}</p>
		{:else}
			<div class="flex flex-col gap-1.5">
				<FilterPanel
					{showGlobal}
					globalFilters={globalGroups}
					viewFilters={groups}
					{availableProperties}
					propertyIndex={collectionStore.propertyIndex}
					onGlobalFiltersChange={(next) => (globalGroups = next)}
					onViewFiltersChange={(next) => (groups = next)}
				/>
				{#if blankValue}
					<span class="text-meta text-destructive" data-view-dialog-filter-error>Every filter needs a value</span>
				{/if}
			</div>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" disabled={saving} onclick={() => setOpen(false)}>Cancel</Button>
			<Button disabled={blocked || saving} onclick={submit}>{edit ? 'Save' : 'Create'}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
