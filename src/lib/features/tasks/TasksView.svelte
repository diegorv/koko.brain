<script lang="ts">
	import { flushSync, onDestroy, untrack, type Component } from 'svelte';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Circle from '@lucide/svelte/icons/circle';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleArrowRight from '@lucide/svelte/icons/circle-arrow-right';
	import CircleCheckBig from '@lucide/svelte/icons/circle-check-big';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import CircleMinus from '@lucide/svelte/icons/circle-minus';
	import CircleQuestionMark from '@lucide/svelte/icons/circle-question-mark';
	import FileText from '@lucide/svelte/icons/file-text';
	import Hash from '@lucide/svelte/icons/hash';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { ScrollArea } from '#lib/components/ui/scroll-area/index.js';
	import { tasksStore } from './tasks.store.svelte';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { buildTaskIndex, getTasksResetGeneration, toggleTask, updateSectionTagFilter } from './tasks.service';
	import { openFileInEditor } from '#lib/core/editor/editor.service.js';
	import { openNoteAt } from '#lib/core/editor/open-note-at.service.js';
	import { resolveIconForPath } from '#lib/features/file-icons/icon-resolver.js';
	import { iconColorStyle } from '#lib/features/file-icons/file-icons.logic.js';
	import IconRenderer from '#lib/features/file-icons/IconRenderer.svelte';
	import { formatDate, formatNow } from '#lib/utils/date.js';
	import { parseTaskTextSegments, parseSectionTags, taskChips, taskDisplayText, usesRawTaskText } from './tasks.logic';
	import {
		GROUP_ROW_CAP,
		TASK_PRIORITIES,
		collapseKey,
		describeTaskRule,
		explainEmptyTasks,
		isQuickFieldDefault,
		priorityWord,
		statusFilterLabel,
		tagMenuOptions,
		taskCountText,
		toggleQuickPriority,
		toggleQuickStatus,
		toggleQuickTag,
		type DueRange,
		type EmptyTasksExplanation,
		type GroupedRow,
		type QuickFilterField,
		type TaskGroup,
		type TaskGroupKey,
		type TaskQuickFilters,
	} from './task-query.logic';
	import { TASK_STATUSES, statusGlyph, toggleTarget, type StatusGlyphIcon } from './task-status.logic';
	import { nextCurrentRow, resolveTaskKey, tabStopRow, taskRowKey } from './tasks-keys.logic';
	import type { TaskPriority, TaskStatus } from './task-metadata.types';
	import type { TaskItem } from './tasks.types';

	interface Props {
		/** Opens a task's wikilink target the way an editor click does */
		onOpenWikilink: (target: string) => void;
	}

	let { onOpenWikilink }: Props = $props();

	const GLYPH_ICONS: Record<StatusGlyphIcon, Component<{ class?: string }>> = {
		circle: Circle,
		'circle-dot': CircleDot,
		'circle-check-big': CircleCheckBig,
		'circle-minus': CircleMinus,
		'circle-question-mark': CircleQuestionMark,
		'circle-alert': CircleAlert,
		'circle-arrow-right': CircleArrowRight,
	};

	/** The Due menu's options: `trigger` is the value after `Due: `. The edited options follow a separator. */
	const DUE_OPTIONS: { label: string; trigger: string; value: DueRange }[] = [
		{ label: 'Any', trigger: 'any', value: 'any' },
		{ label: 'Overdue', trigger: 'overdue', value: 'overdue' },
		{ label: 'Today', trigger: 'today', value: 'today' },
		{ label: 'Next 7 days', trigger: 'next 7 days', value: 'next7' },
		{ label: 'No date', trigger: 'no date', value: 'none' },
	];
	const DUE_EDITED_OPTIONS: { label: string; trigger: string; value: DueRange }[] = [
		{ label: 'Note edited in the last 7 days', trigger: 'note edited 7 days', value: 'edited7' },
		{ label: 'Note edited in the last 30 days', trigger: 'note edited 30 days', value: 'edited30' },
	];

	const SHOW_OPTIONS: { label: string; value: TaskQuickFilters['show'] }[] = [
		{ label: 'Open', value: 'open' },
		{ label: 'Closed', value: 'closed' },
		{ label: 'All', value: 'all' },
	];

	/** The Display menu's Group by options. */
	const GROUP_OPTIONS: { label: string; value: TaskGroupKey }[] = [
		{ label: 'Note', value: 'note' },
		{ label: 'Folder', value: 'folder' },
		{ label: 'Due date', value: 'due' },
		{ label: 'Priority', value: 'priority' },
		{ label: 'Status', value: 'status' },
	];

	/**
	 * Text typed into the section tag textbox that its debounce has not applied
	 * yet, or null. The textbox shows it while set and `tasksStore.sectionTag`
	 * otherwise, so a tag changed from outside shows at once.
	 */
	let pendingSectionTag = $state<string | null>(null);
	/**
	 * The pending debounce and the text it applies. A plain variable, not
	 * `pendingSectionTag`: Svelte hands a teardown the value a `$state` had
	 * when its effect last ran, so `onDestroy` would read null.
	 */
	let debounce: { timer: ReturnType<typeof setTimeout>; value: string } | null = null;

	function handleSectionTagChange(value: string) {
		pendingSectionTag = value;
		if (debounce) clearTimeout(debounce.timer);
		debounce = {
			value,
			timer: setTimeout(() => {
				debounce = null;
				pendingSectionTag = null;
				void updateSectionTagFilter(value);
			}, 400),
		};
	}

	/** Empties the section tag, dropping a typed edit still waiting on its debounce. */
	function clearSectionTag() {
		if (debounce) clearTimeout(debounce.timer);
		debounce = null;
		pendingSectionTag = null;
		void updateSectionTagFilter('');
	}

	const resetGenerationAtMount = getTasksResetGeneration();

	// A tag typed just before the view unmounts (another tab activated) is
	// applied instead of dropped. Not after `resetTasks()`: on a vault switch
	// the view unmounts after the reset, and the old vault's tag would land in
	// the new vault's store and start a fetch.
	onDestroy(() => {
		if (!debounce) return;
		clearTimeout(debounce.timer);
		if (getTasksResetGeneration() === resetGenerationAtMount) void updateSectionTagFilter(debounce.value);
	});

	let groups = $derived(tasksStore.groups);

	let countText = $derived(taskCountText(tasksStore.visibleRows, tasksStore.quick));

	/**
	 * Today as `YYYY-MM-DD`, for the overdue test and the chip year. Read again
	 * on every refetch, so a view left open past midnight updates on the next one.
	 */
	let today = $derived.by(() => {
		void tasksStore.rows;
		return formatNow('YYYY-MM-DD');
	});

	let ruleSentence = $derived(
		describeTaskRule({
			sectionTag: tasksStore.sectionTag,
			quick: tasksStore.quick,
		}),
	);

	let emptyExplanation = $derived(
		groups.length === 0
			? explainEmptyTasks({
					rows: tasksStore.rows,
					sectionTag: tasksStore.sectionTag,
					quick: tasksStore.quick,
					today,
					now: Date.now(),
				})
			: null,
	);

	/** The checked Status radio: none while statuses are chosen, since they win over `show`. */
	let showRadioValue = $derived(tasksStore.quick.statuses?.length ? '' : tasksStore.quick.show);

	/** Sets `show` and clears the chosen statuses; bits-ui calls it on every pick, the checked radio included. */
	function pickShow(value: string) {
		tasksStore.setQuick({ show: value as TaskQuickFilters['show'], statuses: undefined });
	}

	function toggleStatus(status: TaskStatus) {
		tasksStore.setQuick({ statuses: toggleQuickStatus(tasksStore.quick.statuses, status) });
	}

	let dueValue = $derived<DueRange>(tasksStore.quick.due ?? 'any');

	let dueTriggerLabel = $derived(
		[...DUE_OPTIONS, ...DUE_EDITED_OPTIONS].find((o) => o.value === dueValue)?.trigger ?? dueValue,
	);

	/** Sets the Due filter; Any stores `undefined`. bits-ui calls it on every pick, the checked radio included. */
	function pickDue(value: string) {
		tasksStore.setQuick({ due: value === 'any' ? undefined : (value as DueRange) });
	}

	let priorityTriggerLabel = $derived.by(() => {
		const chosen = tasksStore.quick.priorities;
		if (!chosen?.length) return 'Priority';
		return `Priority: ${TASK_PRIORITIES.filter((p) => chosen.includes(p)).map(priorityWord).join(', ')}`;
	});

	function togglePriority(priority: TaskPriority) {
		tasksStore.setQuick({ priorities: toggleQuickPriority(tasksStore.quick.priorities, priority) });
	}

	/** Tags of the unfiltered rows, plus a chosen tag no longer among them so it can be unchecked. */
	let tagOptions = $derived(tagMenuOptions(tasksStore.rows, tasksStore.quick.tags));

	let tagTriggerLabel = $derived.by(() => {
		const chosen = tasksStore.quick.tags;
		if (!chosen?.length) return 'Tag';
		return `Tag: ${tagOptions.filter((t) => chosen.includes(t)).map((t) => `#${t}`).join(', ')}`;
	});

	function toggleTag(tag: string) {
		tasksStore.setQuick({ tags: toggleQuickTag(tasksStore.quick.tags, tag, tagOptions) });
	}

	/** Sets the search on every keystroke; an empty box stores `undefined`. */
	function handleSearchInput(value: string) {
		tasksStore.setQuick({ search: value === '' ? undefined : value });
	}

	/** The fields the narrow pane folds into `Filters (n)`. */
	const MENU_FIELDS: QuickFilterField[] = ['status', 'due', 'priority', 'tag'];

	let foldedCount = $derived(MENU_FIELDS.filter((f) => !isQuickFieldDefault(tasksStore.quick, f)).length);

	let quickAtDefault = $derived(
		[...MENU_FIELDS, 'search' as const].every((f) => isQuickFieldDefault(tasksStore.quick, f)),
	);

	function runEmptyAction(action: NonNullable<EmptyTasksExplanation['action']>) {
		if (action.kind === 'clearTag') clearSectionTag();
		else if (action.kind === 'showAllStatuses') tasksStore.setQuick({ show: 'all', statuses: undefined });
		else tasksStore.setQuick({ [action.field]: undefined });
	}

	function handleFileClick(filePath: string) {
		openFileInEditor(filePath);
	}

	async function handleToggle(filePath: string, task: TaskItem) {
		await toggleTask(filePath, task);
	}

	/** Opens the note at the task's line, unless the click ended a text selection inside the text. */
	function handleTextClick(e: MouseEvent & { currentTarget: HTMLElement }, filePath: string, lineNumber: number) {
		const sel = window.getSelection();
		if (sel && !sel.isCollapsed && e.currentTarget.contains(sel.anchorNode)) return;
		void openNoteAt(filePath, { kind: 'line', line: lineNumber });
	}

	// Refetch task groups whenever the Rust `VaultIndex` version bumps
	// (save, watcher event, toggle, or remove_note_from_index). Phase 7.6.
	$effect(() => {
		void vaultStore.vaultIndexVersion;
		untrack(() => {
			void buildTaskIndex();
		});
	});

	let viewportRef = $state<HTMLElement | null>(null);

	// The offset is saved on every scroll, never read at destroy: Svelte
	// detaches the DOM before teardowns run, and a detached viewport reports 0.
	$effect(() => {
		const viewport = viewportRef;
		if (!viewport) return;
		const save = () => tasksStore.setScrollOffset(viewport.scrollTop);
		viewport.addEventListener('scroll', save, { passive: true });
		return () => viewport.removeEventListener('scroll', save);
	});

	let scrollRestored = false;

	// Once per mount, as soon as rows are on screen (effects run after the DOM update).
	$effect(() => {
		const viewport = viewportRef;
		if (scrollRestored || !viewport || !tasksStore.hasLoaded || groups.length === 0) return;
		scrollRestored = true;
		viewport.scrollTop = untrack(() => tasksStore.scrollOffset);
	});

	/** The view's root element. */
	let rootEl = $state<HTMLElement | null>(null);
	/** The element around all groups: the only place the row keys are handled. */
	let listEl = $state<HTMLElement | null>(null);

	/** Every listed row by its `taskRowKey`, in display order. */
	let rowsByKey = $derived(
		new Map(groups.flatMap((group) => group.rows.map((row) => [taskRowKey(row.filePath, row.lineNumber), row] as const))),
	);
	/** Every row key in display order, the rows of collapsed groups and past the cap included. */
	let order = $derived([...rowsByKey.keys()]);
	let currentKey = $derived(
		tasksStore.currentRow ? taskRowKey(tasksStore.currentRow.filePath, tasksStore.currentRow.lineNumber) : null,
	);

	/**
	 * The `collapseKey`s of the groups whose `Show N more` was clicked. View
	 * state, so every group is capped again when the view remounts.
	 */
	let revealedGroups = $state.raw<ReadonlySet<string>>(new Set());

	/** Each group with its `collapseKey` and the rows it renders: none when collapsed, the first `GROUP_ROW_CAP` until revealed. */
	let shownGroups = $derived(
		groups.map((group) => {
			const key = collapseKey(tasksStore.groupBy, group.key);
			const collapsed = tasksStore.collapsedGroups.has(key);
			const rows = collapsed ? [] : revealedGroups.has(key) ? group.rows : group.rows.slice(0, GROUP_ROW_CAP);
			return { group, key, collapsed, rows, hidden: collapsed ? 0 : group.rows.length - rows.length };
		}),
	);
	/** The row keys in the DOM, in display order. */
	let rendered = $derived(shownGroups.flatMap((g) => g.rows.map((row) => taskRowKey(row.filePath, row.lineNumber))));
	/** The row that holds the list's one tab stop; its controls are the only ones in the tab order. */
	let tabStopKey = $derived(tabStopRow(rendered, order, currentKey));

	/** Shows all of a group's rows, then focuses the first one the cap hid, so a keyboard user keeps their place. */
	function revealGroup(key: string, group: TaskGroup) {
		revealedGroups = new Set(revealedGroups).add(key);
		flushSync();
		const first = group.rows[GROUP_ROW_CAP];
		if (first) rowElement(taskRowKey(first.filePath, first.lineNumber))?.focus();
	}

	/** The rendered row element with `key`. Compared by value, so no selector escaping is needed. */
	function rowElement(key: string | null): HTMLElement | undefined {
		if (key === null || !listEl) return undefined;
		return Array.from(listEl.querySelectorAll<HTMLElement>('[data-task-row]')).find((el) => el.dataset.taskKey === key);
	}

	/**
	 * True when moving focus into the list takes it from nowhere the user put
	 * it: `<body>`, the view root, or an element already inside the list.
	 * Never from a text field or from outside the view.
	 */
	function focusIsFree(allowRoot: boolean): boolean {
		const active = document.activeElement;
		return !active || active === document.body || (allowRoot && active === rootEl) || (!!listEl && listEl.contains(active));
	}

	function handleListKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		const rowEls = Array.from(listEl?.querySelectorAll<HTMLElement>('[data-task-row]') ?? []);
		const onRow = target.hasAttribute('data-task-row');
		const action = resolveTaskKey({
			key: e.key,
			repeat: e.repeat,
			onRow,
			meta: e.metaKey,
			ctrl: e.ctrlKey,
			alt: e.altKey,
			shift: e.shiftKey,
			index: onRow ? rowEls.indexOf(target) : -1,
			count: rowEls.length,
		});
		if (!action) return;
		e.preventDefault();
		if (action.kind === 'focus') {
			rowEls[action.index]?.focus();
			return;
		}
		const row = rowsByKey.get(target.dataset.taskKey ?? '');
		if (!row) return;
		if (action.kind === 'toggle') void handleToggle(row.filePath, row);
		else void openNoteAt(row.filePath, { kind: 'line', line: row.lineNumber });
	}

	/** Focus anywhere in a row, a control inside it included, makes that row current. */
	function handleListFocusin(e: FocusEvent) {
		const rowEl = (e.target as HTMLElement).closest<HTMLElement>('[data-task-row]');
		const row = rowEl ? rowsByKey.get(rowEl.dataset.taskKey ?? '') : undefined;
		if (row) tasksStore.setCurrentRow({ filePath: row.filePath, lineNumber: row.lineNumber });
		if (rowEl) lastFocusedRowEl = rowEl;
	}

	/** The row element that last took focus; not reactive, read only by the effect below. */
	let lastFocusedRowEl: HTMLElement | null = null;

	/** The `order` the last run of the effect below saw; null until its first run in this mount. */
	let prevOrder: string[] | null = null;

	// When the list changes, a current row that left it hands its place to a
	// neighbour (`nextCurrentRow`). Focus follows only when it was on the
	// removed row (now on `<body>`) or inside the list, so typing in the
	// search box never moves it. A current row that changed group (a todo
	// completed under Status grouping) is recreated in the other group's keyed
	// `{#each}`, so focus falls to `<body>`: it goes back to the new element,
	// but only when the element that held focus was removed. A recompute that
	// keeps the element (a refetch with the same rows) leaves focus where the
	// user put it. Effects run after the DOM update.
	$effect(() => {
		const next = order;
		untrack(() => {
			const prev = prevOrder;
			prevOrder = next;
			if (prev === null) return;
			const current = currentKey;
			const chosen = nextCurrentRow(next, prev, current);
			if (chosen === current) {
				if (document.activeElement === document.body && lastFocusedRowEl && !lastFocusedRowEl.isConnected) {
					rowElement(current)?.focus();
				}
				return;
			}
			const row = chosen === null ? undefined : rowsByKey.get(chosen);
			tasksStore.setCurrentRow(row ? { filePath: row.filePath, lineNumber: row.lineNumber } : null);
			if (focusIsFree(false)) rowElement(tabStopRow(rendered, next, chosen))?.focus();
		});
	});

	let focusOnOpenTried = false;

	// Once per mount, the first time groups are rendered: focus the tab-stop
	// row, or the first group's chevron when every row is hidden, unless the
	// user's focus is elsewhere (a text field, another pane, the palette).
	// `preventScroll` leaves the scroll restore above in charge.
	$effect(() => {
		if (focusOnOpenTried || order.length === 0 || !listEl) return;
		focusOnOpenTried = true;
		untrack(() => {
			if (!focusIsFree(true)) return;
			const target = rowElement(tabStopKey) ?? listEl?.querySelector<HTMLElement>('[data-task-group-toggle]');
			target?.focus({ preventScroll: true });
		});
	});

	/** The title's hover text for a note modified at `timestamp` (ms): `Jun 15`, with the year when not this year. */
	function modifiedTitle(timestamp: number): string | undefined {
		if (!timestamp) return undefined;
		const sameYear = new Date(timestamp).getFullYear() === new Date().getFullYear();
		return formatDate(timestamp, sameYear ? 'MMM D' : 'MMM D, YYYY');
	}
</script>

<!-- The list stays under the alert: it is stale, not gone. -->
{#snippet refreshAlert(message: string)}
	<div
		role="alert"
		class="my-2 flex items-center justify-between gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-row text-destructive"
	>
		<p>{message}</p>
		<button
			class="shrink-0 rounded-md px-2 py-0.5 font-medium hover:bg-destructive/10 transition-colors cursor-pointer disabled:cursor-default disabled:opacity-50"
			disabled={tasksStore.isLoading}
			onclick={() => void buildTaskIndex()}
		>
			Retry
		</button>
	</div>
{/snippet}

<!-- Each filter menu's items, rendered in its own menu and again in the narrow pane's Filters menu. -->
{#snippet statusItems()}
	<DropdownMenu.RadioGroup value={showRadioValue} onValueChange={pickShow}>
		{#each SHOW_OPTIONS as option (option.value)}
			<DropdownMenu.RadioItem value={option.value}>{option.label}</DropdownMenu.RadioItem>
		{/each}
	</DropdownMenu.RadioGroup>
	<DropdownMenu.Separator />
	{#each TASK_STATUSES as status (status)}
		<DropdownMenu.CheckboxItem
			checked={tasksStore.quick.statuses?.includes(status) ?? false}
			closeOnSelect={false}
			onCheckedChange={() => toggleStatus(status)}
		>
			{statusGlyph(status).word}
		</DropdownMenu.CheckboxItem>
	{/each}
{/snippet}

{#snippet dueItems()}
	<DropdownMenu.RadioGroup value={dueValue} onValueChange={pickDue}>
		{#each DUE_OPTIONS as option (option.value)}
			<DropdownMenu.RadioItem value={option.value}>{option.label}</DropdownMenu.RadioItem>
		{/each}
		<DropdownMenu.Separator />
		{#each DUE_EDITED_OPTIONS as option (option.value)}
			<DropdownMenu.RadioItem value={option.value}>{option.label}</DropdownMenu.RadioItem>
		{/each}
	</DropdownMenu.RadioGroup>
{/snippet}

{#snippet priorityItems()}
	{#each TASK_PRIORITIES as priority (priority)}
		<DropdownMenu.CheckboxItem
			checked={tasksStore.quick.priorities?.includes(priority) ?? false}
			closeOnSelect={false}
			onCheckedChange={() => togglePriority(priority)}
		>
			{priorityWord(priority)}
		</DropdownMenu.CheckboxItem>
	{/each}
{/snippet}

{#snippet tagItems()}
	{#each tagOptions as tag (tag)}
		<DropdownMenu.CheckboxItem
			checked={tasksStore.quick.tags?.includes(tag) ?? false}
			closeOnSelect={false}
			onCheckedChange={() => toggleTag(tag)}
		>
			#{tag}
		</DropdownMenu.CheckboxItem>
	{:else}
		<DropdownMenu.Item disabled>No tags in these tasks</DropdownMenu.Item>
	{/each}
{/snippet}

<!-- A group's collapse chevron. A click never focuses it in WebKit, and collapsing never moves focus by code. -->
{#snippet groupToggle(group: TaskGroup, key: string, collapsed: boolean, extraClass: string)}
	<button
		type="button"
		data-task-group-toggle
		class="flex shrink-0 cursor-pointer items-center rounded-sm text-muted-foreground hover:bg-accent outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 {extraClass}"
		aria-label={collapsed ? `Expand ${group.label}` : `Collapse ${group.label}`}
		aria-expanded={!collapsed}
		onclick={() => tasksStore.toggleGroupCollapsed(key)}
	>
		<ChevronRight class="size-3.5 transition-transform {collapsed ? '' : 'rotate-90'}" />
	</button>
{/snippet}

<!-- One group's header, after its chevron. A Note group shows the note (icon, title, folder, "N of M open"); any other shows its label and row count. -->
{#snippet groupHeader(group: TaskGroup, key: string, collapsed: boolean)}
	{#if group.filePath !== undefined}
		{@const filePath = group.filePath}
		{@const resolved = resolveIconForPath(filePath)}
		<!-- File header. The icon sits outside the button so an emoji stays out of its name. -->
		<div class="flex items-start gap-2 mb-2">
			{@render groupToggle(group, key, collapsed, 'h-5')}
			<span class="flex h-5 shrink-0 items-center">
				{#if resolved?.icon}
					<IconRenderer icon={resolved.icon} class="size-4 shrink-0" color={resolved.color} />
				{:else}
					<FileText class="size-4 shrink-0 text-muted-foreground" style={iconColorStyle(resolved?.color)} />
				{/if}
			</span>
			<div class="min-w-0 flex-1">
				<div class="flex items-baseline gap-2">
					<button
						data-task-group-title
						class="text-sm font-medium text-foreground hover:underline cursor-pointer"
						title={modifiedTitle(group.modifiedAt ?? 0)}
						onclick={() => handleFileClick(filePath)}
					>
						{group.label}
					</button>
					<span data-task-group-count class="text-xs text-muted-foreground">{`${group.open} of ${group.total} open`}</span>
				</div>
				{#if group.folder}
					<p data-task-group-subtitle class="truncate text-xs text-muted-foreground @max-[560px]:hidden">{group.folder}</p>
				{/if}
			</div>
		</div>
	{:else}
		<div class="flex items-baseline gap-2 mb-2">
			{@render groupToggle(group, key, collapsed, 'self-center')}
			<span data-task-group-label class="text-sm font-medium text-foreground">{group.label}</span>
			<span data-task-group-count class="text-xs text-muted-foreground">{group.count}</span>
		</div>
	{/if}
{/snippet}

<!-- One task row, shared by Note groups (indented by `row.indent`) and flat groups (`flat`: no indent, breadcrumb above). -->
{#snippet taskRow(row: GroupedRow, flat: boolean)}
	<!-- The glyph follows the status; the label follows `toggleTarget`, what a click writes. -->
	{@const glyph = statusGlyph(row.status)}
	{@const Glyph = GLYPH_ICONS[glyph.icon]}
	{@const displayText = taskDisplayText(row)}
	{@const chips = taskChips(row.metadata, today, { tags: !usesRawTaskText(row), open: row.open })}
	{@const rowKey = taskRowKey(row.filePath, row.lineNumber)}
	<!-- Roving focus: only the tab-stop row and its controls are in the tab order. -->
	{@const rowTabindex = rowKey === tabStopKey ? 0 : -1}
	<!-- A dimmed row fails the filters and stays as the parent of one that passes. -->
	<!-- A flat row has no indent: its breadcrumb, on its own line above the text, carries the hierarchy. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex (roving-focus list: the row is the focus stop) -->
	<div
		data-task-row
		data-task-key={rowKey}
		role="listitem"
		tabindex={rowTabindex}
		class="flex items-start gap-x-2 w-full group rounded-md px-1 py-0.5 hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset {row.dimmed ? 'opacity-60' : ''} {row.breadcrumb ? 'flex-wrap' : ''}"
		style={flat ? undefined : `padding-left: ${row.indent * 1.25 + 0.25}rem`}
	>
		{#if row.breadcrumb}
			<span data-task-breadcrumb class="basis-full truncate pl-6 text-xs text-muted-foreground">{row.breadcrumb}</span>
		{/if}
		<button
			data-task-toggle
			data-task-status={row.status}
			tabindex={rowTabindex}
			class="shrink-0 cursor-pointer p-1 -mx-1 -mb-1 -mt-0.5 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
			aria-label="{toggleTarget(row.status) === 'done' ? 'Mark task as done' : 'Mark task as not done'}: {displayText} ({glyph.word})"
			title={glyph.word}
			onclick={() => handleToggle(row.filePath, row)}
		>
			<Glyph class="size-4 {glyph.tone}" />
		</button>
		<!-- Chips trail the text; in a pane under 560px they sit on a line under it. -->
		<!-- Clicking the text, a chip or the space beside them opens the note at the task's line; only the circle toggles. -->
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			class="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 cursor-pointer @max-[560px]:flex-col @max-[560px]:items-start"
			onclick={(e) => handleTextClick(e, row.filePath, row.lineNumber)}
		>
			<span
				data-task-text
				class="min-w-0 break-words text-sm {row.open ? 'text-foreground' : 'text-muted-foreground line-through'}"
			>
				{#each parseTaskTextSegments(displayText) as seg}
					{#if seg.type === 'text'}
						{seg.value}
					{:else if seg.type === 'wikilink'}
						<button
							tabindex={rowTabindex}
							class="inline cursor-pointer text-primary hover:underline"
							onclick={(e) => { e.stopPropagation(); onOpenWikilink(seg.target); }}
						>{seg.display}</button>
					{:else}
						<a
							href={seg.url}
							tabindex={rowTabindex}
							target="_blank"
							rel="noopener noreferrer"
							title={seg.url}
							class="text-primary underline decoration-primary/40 hover:decoration-primary"
							onclick={(e) => e.stopPropagation()}
						>{seg.label}</a>
					{/if}
				{/each}
			</span>
			{#if chips.length > 0}
				<span class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
					{#each chips as chip, i (i)}
						<span
							data-task-chip={chip.kind}
							data-overdue={chip.overdue ? '' : undefined}
							title={chip.title}
							class="inline-flex items-center gap-1 text-label text-muted-foreground"
						>
							{#if chip.kind === 'due'}
								<Calendar class="size-3 shrink-0 {chip.overdue ? 'text-destructive' : ''}" />
							{/if}
							<span class={chip.overdue ? 'text-foreground' : 'text-muted-foreground'}>{chip.label}</span>
						</span>
					{/each}
				</span>
			{/if}
		</div>
	</div>
{/snippet}

<div bind:this={rootEl} class="@container flex h-full flex-col">
	<!-- Toolbar -->
	<div class="pane-toolbar">
		<span class="min-w-0 truncate text-title">Tasks</span>
		{#if tasksStore.hasLoaded}
			<span data-task-count class="shrink-0 text-meta text-muted-foreground @max-[420px]:hidden">{countText}</span>
		{/if}
		{#if tasksStore.hasLoaded && tasksStore.isLoading}
			<span role="status" aria-label="Refreshing tasks" class="flex items-center">
				<Loader2 class="size-3.5 animate-spin text-muted-foreground" />
			</span>
		{/if}
		<input
			type="search"
			value={tasksStore.quick.search ?? ''}
			oninput={(e) => handleSearchInput(e.currentTarget.value)}
			placeholder="Search tasks"
			aria-label="Search tasks"
			class="h-6 w-40 min-w-0 shrink px-2 text-xs rounded-md bg-background/50 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
		/>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
					>
						<span>Display</span>
						<ChevronDown class="size-3 shrink-0" aria-hidden="true" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-48">
				<DropdownMenu.Label>Group by</DropdownMenu.Label>
				<!-- bits-ui calls onValueChange on every pick, the checked radio included; setGroupBy then changes nothing. -->
				<DropdownMenu.RadioGroup value={tasksStore.groupBy} onValueChange={(value) => tasksStore.setGroupBy(value as TaskGroupKey)}>
					{#each GROUP_OPTIONS as option (option.value)}
						<DropdownMenu.RadioItem value={option.value}>{option.label}</DropdownMenu.RadioItem>
					{/each}
				</DropdownMenu.RadioGroup>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>

	<!-- Filters. Under 560px the four menus fold into the Filters menu; both are rendered and CSS hides one. -->
	<div data-task-filters class="flex shrink-0 flex-wrap items-center gap-2 border-b border-divider px-3 py-1.5">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="hidden h-6 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent transition-colors cursor-pointer @max-[560px]:flex"
					>
						<span>Filters ({foldedCount})</span>
						<ChevronDown class="size-3 shrink-0" aria-hidden="true" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" class="w-56">
				<DropdownMenu.Label>Status</DropdownMenu.Label>
				<DropdownMenu.Separator />
				{@render statusItems()}
				<DropdownMenu.Label>Due</DropdownMenu.Label>
				<DropdownMenu.Separator />
				{@render dueItems()}
				<DropdownMenu.Label>Priority</DropdownMenu.Label>
				<DropdownMenu.Separator />
				{@render priorityItems()}
				<DropdownMenu.Label>Tag</DropdownMenu.Label>
				<DropdownMenu.Separator />
				{@render tagItems()}
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="flex h-6 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent transition-colors cursor-pointer @max-[560px]:hidden"
					>
						<span>Status: {statusFilterLabel(tasksStore.quick)}</span>
						<ChevronDown class="size-3 shrink-0" aria-hidden="true" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" class="w-48">
				{@render statusItems()}
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="flex h-6 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent transition-colors cursor-pointer @max-[560px]:hidden"
					>
						<span>Due: {dueTriggerLabel}</span>
						<ChevronDown class="size-3 shrink-0" aria-hidden="true" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" class="w-56">
				{@render dueItems()}
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="flex h-6 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent transition-colors cursor-pointer @max-[560px]:hidden"
					>
						<span>{priorityTriggerLabel}</span>
						<ChevronDown class="size-3 shrink-0" aria-hidden="true" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" class="w-48">
				{@render priorityItems()}
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="flex h-6 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent transition-colors cursor-pointer @max-[560px]:hidden"
					>
						<span>{tagTriggerLabel}</span>
						<ChevronDown class="size-3 shrink-0" aria-hidden="true" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" class="w-48">
				{@render tagItems()}
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<div class="flex items-center gap-1 relative">
			<Hash class="size-3 text-muted-foreground absolute left-1.5 pointer-events-none" />
			<input
				type="text"
				value={pendingSectionTag ?? tasksStore.sectionTag}
				oninput={(e) => handleSectionTagChange(e.currentTarget.value)}
				placeholder="#tag #tag"
				aria-label="Section tag"
				class="h-6 w-40 pl-5 pr-2 text-xs rounded-md bg-background/50 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
			/>
		</div>

		{#if !quickAtDefault}
			<button
				class="h-6 rounded-md px-2 text-xs text-primary hover:bg-accent transition-colors cursor-pointer"
				onclick={() => tasksStore.resetQuick()}
			>
				Reset filters
			</button>
		{/if}
	</div>

	<!-- Content -->
	<ScrollArea class="flex-1 min-h-0" bind:viewportRef>
		<div class="p-4">
			{#if !tasksStore.hasLoaded}
				<p class="text-sm text-muted-foreground text-center py-8">Indexing tasks...</p>
			{:else if tasksStore.error && tasksStore.rows.length === 0}
				<!-- No list was loaded: the alert takes the empty state's place. -->
				<p class="text-xs text-muted-foreground mb-1">{ruleSentence}</p>
				{@render refreshAlert(tasksStore.error)}
			{:else if emptyExplanation}
				<p class="text-xs text-muted-foreground mb-1">{ruleSentence}</p>
				{#if tasksStore.error}{@render refreshAlert(tasksStore.error)}{/if}
				<div class="flex flex-col items-center gap-2 py-8">
					<p class="text-sm text-muted-foreground text-center">{emptyExplanation.message}</p>
					{#if emptyExplanation.action}
						{@const action = emptyExplanation.action}
						<button
							class="px-2 py-0.5 text-xs rounded-md text-primary hover:bg-accent transition-colors cursor-pointer"
							onclick={() => runEmptyAction(action)}
						>
							{action.label}
						</button>
					{/if}
				</div>
			{:else}
				<div class="flex items-baseline gap-2 mb-1">
					<p class="text-xs text-muted-foreground">{ruleSentence}</p>
					{#if parseSectionTags(tasksStore.sectionTag).length > 0}
						<button class="text-xs text-primary hover:underline cursor-pointer" onclick={clearSectionTag}>
							Clear tag
						</button>
					{/if}
				</div>
				{#if tasksStore.error}{@render refreshAlert(tasksStore.error)}{/if}

				<!-- svelte-ignore a11y_no_static_element_interactions (roving-focus list: the rows take the keys) -->
				<div
					bind:this={listEl}
					class="space-y-6 mt-3"
					onkeydown={handleListKeydown}
					onfocusin={handleListFocusin}
				>
					{#each shownGroups as { group, key, collapsed, rows, hidden } (group.key)}
						<div data-task-group data-task-group-key={group.key}>
							{@render groupHeader(group, key, collapsed)}
							<!-- A collapsed group's rows leave the DOM, so the list's keys skip them. -->
							{#if !collapsed}
								<div class="space-y-1" role="list" aria-label={group.label}>
									{#each rows as row (taskRowKey(row.filePath, row.lineNumber))}
										{@render taskRow(row, group.filePath === undefined)}
									{/each}
								</div>
								<!-- Outside the list and not a row, so the list's keydown handler leaves it alone. -->
								{#if hidden > 0}
									<button
										type="button"
										class="mt-1 rounded-md px-1 text-xs text-primary hover:underline cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
										onclick={() => revealGroup(key, group)}
									>
										Show {hidden} more
									</button>
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</ScrollArea>
</div>
