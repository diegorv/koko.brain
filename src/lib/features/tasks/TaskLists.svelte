<script lang="ts">
	import { flushSync, untrack } from 'svelte';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Plus from '@lucide/svelte/icons/plus';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { formatNow } from '#lib/utils/date.js';
	import { tasksStore } from './tasks.store.svelte';
	import {
		deleteTaskView,
		duplicateTaskView,
		renameTaskView,
		revertTaskList,
		saveTaskView,
		saveTaskViewQuery,
		selectTaskList,
	} from './tasks.service';
	import { isQueryModified } from './task-query.logic';
	import { BUILT_IN_TASK_VIEWS, findTaskView, isBuiltInTaskView, taskViewCount } from './task-views.logic';

	interface Props {
		/**
		 * `column`: the list column beside the list, hidden under 720 px.
		 * `menu`: the dropdown that replaces it under 720 px. Both are rendered
		 * and a container query hides one.
		 * `marker`: "modified" and its buttons, while the session differs from
		 * the active list's saved query.
		 */
		variant: 'column' | 'menu' | 'marker';
	}

	let { variant }: Props = $props();
	const uid = $props.id();

	/** The built-ins first, then the saved views in stored order. */
	let lists = $derived([...BUILT_IN_TASK_VIEWS, ...tasksStore.savedViews]);
	let activeView = $derived(findTaskView(tasksStore.activeList, tasksStore.savedViews));
	let activeName = $derived(activeView?.name ?? '');

	/** Whether the session differs from the active list's saved query (the search left out). */
	let modified = $derived(
		!!activeView && isQueryModified({ ...tasksStore.query, groupBy: tasksStore.groupBy, sort: tasksStore.sort }, activeView.query),
	);

	/**
	 * The row count of each list but the active one, by its saved query. It
	 * does not read the session, so a search keystroke or a session edit does
	 * not re-run every list's query. Today and the clock are read when it
	 * re-runs, like the store's `visibleRows`.
	 */
	let savedCounts = $derived.by(() => {
		const folders = { templates: settingsStore.templates.folder, system: settingsStore.templates.systemFolder };
		const today = formatNow('YYYY-MM-DD');
		const now = Date.now();
		const active = tasksStore.activeList;
		return new Map(
			lists
				.filter((view) => view.id !== active)
				.map((view) => [view.id, taskViewCount(tasksStore.rows, view.query, tasksStore.globalExcludes, folders, today, now)]),
		);
	});

	/** The active list's count: the rows on screen, session edit included. */
	let activeCount = $derived(tasksStore.visibleRows.filter((row) => !row.dimmed).length);

	/** What the name input does on Enter: save a new view, or rename the saved view `id`; null while it is closed. */
	let editing = $state<{ kind: 'save' } | { kind: 'rename'; id: string } | null>(null);
	let draft = $state('');
	let rootEl = $state<HTMLElement | null>(null);
	let inputEl = $state<HTMLInputElement | null>(null);

	const markerButtonClass = 'text-xs text-primary hover:underline cursor-pointer';

	/** Opens the name input holding `initial` and focuses it. */
	function startEditing(next: NonNullable<typeof editing>, initial: string) {
		editing = next;
		draft = initial;
		flushSync();
		inputEl?.focus();
		inputEl?.select();
	}

	/** Saves or renames under the typed name; a blank name keeps the input open. */
	function commit() {
		if (!editing) return;
		const id = editing.kind === 'save' ? saveTaskView(draft) : renameTaskView(editing.id, draft) ? editing.id : null;
		if (id !== null) close(id);
	}

	/**
	 * Focuses the list `id`'s button (the column), else the control that opens
	 * the save input: "Save view" in the column, the trigger in the menu.
	 */
	function focusList(id: string | null) {
		const buttons = Array.from(rootEl?.querySelectorAll<HTMLElement>('[data-task-list], [data-task-lists-trigger], [data-task-save-view]') ?? []);
		(buttons.find((el) => id !== null && el.dataset.taskList === id) ?? buttons.find((el) => !el.hasAttribute('data-task-list')))?.focus();
	}

	/**
	 * Closes the name input and puts focus on the list `id`, or with null on the
	 * control that opened the save. A save from the marker unmounts it, so focus
	 * goes to the sentence's Edit button instead.
	 */
	function close(id: string | null) {
		if (variant === 'marker' && id !== null) {
			afterMarkerAction(() => (editing = null));
			return;
		}
		editing = null;
		flushSync();
		focusList(id);
	}

	/**
	 * Runs a marker action. Save, Revert, Reset and a committed save leave the
	 * session equal to the list, which unmounts the marker and its focused
	 * button, so focus moves to the sentence's Edit button beside it.
	 */
	function afterMarkerAction(action: () => unknown) {
		const scope = rootEl?.parentElement;
		action();
		flushSync();
		if (rootEl?.isConnected) return;
		scope?.querySelector<HTMLElement>('[data-task-sources-edit]')?.focus();
	}

	// The marker's save input belongs to the list it opened on: picking another list closes it.
	$effect(() => {
		if (variant !== 'marker') return;
		void tasksStore.activeList;
		untrack(() => (editing = null));
	});

	/** The deleted row's menu trigger leaves the DOM, so focus moves to the list now active. */
	function deleteView(id: string) {
		deleteTaskView(id);
		flushSync();
		focusList(tasksStore.activeList);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commit();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			close(editing?.kind === 'rename' ? editing.id : null);
		}
	}

	/** A menu item that opened the name input keeps focus there instead of on the menu's trigger. */
	function handleCloseFocus(e: Event) {
		if (!editing) return;
		e.preventDefault();
		inputEl?.focus();
	}
</script>

{#snippet nameInput()}
	<Input
		bind:ref={inputEl}
		bind:value={draft}
		type="text"
		class="h-7 min-w-0 text-meta md:text-meta"
		placeholder="View name"
		aria-label="View name"
		onkeydown={handleKeydown}
	/>
{/snippet}

{#if variant === 'column'}
	<nav
		bind:this={rootEl}
		data-task-lists="column"
		aria-label="Task lists"
		class="flex w-44 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-divider p-2 @max-[720px]:hidden"
	>
		{#each lists as view (view.id)}
			{@const active = view.id === tasksStore.activeList}
			{#if editing?.kind === 'rename' && editing.id === view.id}
				{@render nameInput()}
			{:else}
				<div class="group/list flex items-center rounded-md {active ? 'bg-accent' : 'hover:bg-accent/50'}">
					<button
						type="button"
						data-task-list={view.id}
						aria-current={active ? 'true' : undefined}
						aria-describedby={tasksStore.hasLoaded ? `${uid}-count-${view.id}` : undefined}
						class="min-w-0 flex-1 cursor-pointer truncate rounded-md px-2 py-1 text-left text-row outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 {active ? 'font-medium text-foreground' : 'text-muted-foreground'}"
						onclick={() => selectTaskList(view.id)}
					>
						{view.name}
					</button>
					{#if tasksStore.hasLoaded}
						<span id="{uid}-count-{view.id}" data-task-list-count={view.id} class="shrink-0 px-1 text-xs tabular-nums text-muted-foreground"
							>{active ? activeCount : savedCounts.get(view.id)}</span
						>
					{/if}
					{#if !isBuiltInTaskView(view.id)}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<button
										{...props}
										type="button"
										aria-label="List actions: {view.name}"
										class="shrink-0 cursor-pointer rounded-sm p-0.5 text-muted-foreground opacity-0 hover:bg-accent hover:text-foreground group-hover/list:opacity-100 group-focus-within/list:opacity-100 data-[state=open]:opacity-100 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
									>
										<Ellipsis class="size-4" />
									</button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="start" class="w-40" onCloseAutoFocus={handleCloseFocus}>
								<DropdownMenu.Item onSelect={() => startEditing({ kind: 'rename', id: view.id }, view.name)}>Rename</DropdownMenu.Item>
								<DropdownMenu.Item onSelect={() => duplicateTaskView(view.id)}>Duplicate</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<!-- The last saved view cannot be deleted. -->
								<DropdownMenu.Item variant="destructive" disabled={tasksStore.savedViews.length <= 1} onSelect={() => deleteView(view.id)}>
									Delete
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					{/if}
				</div>
			{/if}
		{/each}
		{#if editing?.kind === 'save'}
			{@render nameInput()}
		{:else}
			<button
				type="button"
				data-task-save-view
				class="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-meta text-muted-foreground hover:bg-accent/50 hover:text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
				onclick={() => startEditing({ kind: 'save' }, '')}
			>
				<Plus class="size-3.5" aria-hidden="true" />
				Save view
			</button>
		{/if}
	</nav>
{:else if variant === 'marker'}
	{#if modified || editing}
		<div bind:this={rootEl} data-task-modified class="mb-1 flex flex-wrap items-center gap-x-2">
			<span class="text-xs text-muted-foreground">modified</span>
			{#if editing}
				<div class="w-48">{@render nameInput()}</div>
			{:else if activeView && isBuiltInTaskView(activeView.id)}
				<button type="button" data-task-save-view class={markerButtonClass} onclick={() => startEditing({ kind: 'save' }, '')}>
					Save as view
				</button>
				<button type="button" class={markerButtonClass} onclick={() => afterMarkerAction(revertTaskList)}>Reset</button>
			{:else}
				<button type="button" class={markerButtonClass} onclick={() => afterMarkerAction(saveTaskViewQuery)}>Save</button>
				<button type="button" class={markerButtonClass} onclick={() => afterMarkerAction(revertTaskList)}>Revert</button>
			{/if}
		</div>
	{/if}
{:else}
	<div bind:this={rootEl} data-task-lists="menu" class="mb-2 hidden flex-wrap items-center gap-2 @max-[720px]:flex">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						data-task-lists-trigger
						aria-label="List: {activeName}"
						class="flex h-6 min-w-0 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
					>
						<span class="truncate">{activeName}</span>
						<ChevronDown class="size-3 shrink-0" aria-hidden="true" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" class="w-48" onCloseAutoFocus={handleCloseFocus}>
				<DropdownMenu.RadioGroup value={tasksStore.activeList} onValueChange={selectTaskList}>
					{#each lists as view (view.id)}
						<DropdownMenu.RadioItem value={view.id}>{view.name}</DropdownMenu.RadioItem>
					{/each}
				</DropdownMenu.RadioGroup>
				<DropdownMenu.Separator />
				<DropdownMenu.Item onSelect={() => startEditing({ kind: 'save' }, '')}>
					<Plus aria-hidden="true" />
					Save view
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
		{#if editing}
			<div class="w-48">{@render nameInput()}</div>
		{/if}
	</div>
{/if}
