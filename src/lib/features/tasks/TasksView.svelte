<script lang="ts">
	import { onDestroy, untrack, type Component } from 'svelte';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
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
		describeTaskRule,
		explainEmptyTasks,
		rowsByNote,
		statusFilterLabel,
		taskCountText,
		toggleQuickStatus,
		type DueRange,
		type EmptyTasksExplanation,
		type TaskQuickFilters,
	} from './task-query.logic';
	import { TASK_STATUSES, statusGlyph, toggleTarget, type StatusGlyphIcon } from './task-status.logic';
	import type { TaskStatus } from './task-metadata.types';
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

	let notes = $derived(rowsByNote(tasksStore.visibleRows));

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
		notes.length === 0
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
		if (scrollRestored || !viewport || !tasksStore.hasLoaded || notes.length === 0) return;
		scrollRestored = true;
		viewport.scrollTop = untrack(() => tasksStore.scrollOffset);
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

<div class="@container flex h-full flex-col">
	<!-- Toolbar -->
	<div class="pane-toolbar">
		<span class="min-w-0 truncate text-title">Tasks</span>
		{#if tasksStore.hasLoaded}
			<span data-task-count class="shrink-0 text-meta text-muted-foreground">{countText}</span>
		{/if}
		{#if tasksStore.hasLoaded && tasksStore.isLoading}
			<span role="status" aria-label="Refreshing tasks" class="flex items-center">
				<Loader2 class="size-3.5 animate-spin text-muted-foreground" />
			</span>
		{/if}
	</div>

	<!-- Filters -->
	<div data-task-filters class="flex shrink-0 items-center gap-2 border-b border-divider px-3 py-1.5">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="flex h-6 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
					>
						<span>Status: {statusFilterLabel(tasksStore.quick)}</span>
						<ChevronDown class="size-3 shrink-0" aria-hidden="true" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" class="w-48">
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
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="flex h-6 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
					>
						<span>Due: {dueTriggerLabel}</span>
						<ChevronDown class="size-3 shrink-0" aria-hidden="true" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" class="w-56">
				<DropdownMenu.RadioGroup value={dueValue} onValueChange={pickDue}>
					{#each DUE_OPTIONS as option (option.value)}
						<DropdownMenu.RadioItem value={option.value}>{option.label}</DropdownMenu.RadioItem>
					{/each}
					<DropdownMenu.Separator />
					{#each DUE_EDITED_OPTIONS as option (option.value)}
						<DropdownMenu.RadioItem value={option.value}>{option.label}</DropdownMenu.RadioItem>
					{/each}
				</DropdownMenu.RadioGroup>
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

				<div class="space-y-6 mt-3">
					{#each notes as note (note.filePath)}
						{@const resolved = resolveIconForPath(note.filePath)}
						<div data-task-group>
							<!-- File header. The icon sits outside the button so an emoji stays out of its name. -->
							<div class="flex items-start gap-2 mb-2">
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
											title={modifiedTitle(note.modifiedAt)}
											onclick={() => handleFileClick(note.filePath)}
										>
											{note.noteTitle}
										</button>
										<span data-task-group-count class="text-xs text-muted-foreground">{`${note.open} of ${note.total} open`}</span>
									</div>
									{#if note.folder}
										<p data-task-group-subtitle class="truncate text-xs text-muted-foreground">{note.folder}</p>
									{/if}
								</div>
							</div>

							<!-- Task list -->
							<div class="space-y-1">
								{#each note.rows as row (row.lineNumber)}
									<!-- The glyph follows the status; the label follows `toggleTarget`, what a click writes. -->
									{@const glyph = statusGlyph(row.status)}
									{@const Glyph = GLYPH_ICONS[glyph.icon]}
									{@const displayText = taskDisplayText(row)}
									{@const chips = taskChips(row.metadata, today, { tags: !usesRawTaskText(row), open: row.open })}
									<!-- A dimmed row fails the filters and stays as the parent of one that passes. -->
									<div
										data-task-row
										class="flex items-start gap-2 w-full group rounded-md px-1 py-0.5 hover:bg-accent/50 transition-colors {row.dimmed ? 'opacity-60' : ''}"
										style="padding-left: {row.indent * 1.25 + 0.25}rem"
									>
										<button
											data-task-toggle
											data-task-status={row.status}
											class="shrink-0 cursor-pointer p-1 -mx-1 -mb-1 -mt-0.5 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
											aria-label="{toggleTarget(row.status) === 'done' ? 'Mark task as done' : 'Mark task as not done'}: {displayText} ({glyph.word})"
											title={glyph.word}
											onclick={() => handleToggle(note.filePath, row)}
										>
											<Glyph class="size-4 {glyph.tone}" />
										</button>
										<!-- Chips trail the text; in a pane under 560px they sit on a line under it. -->
										<!-- Clicking the text, a chip or the space beside them opens the note at the task's line; only the circle toggles. -->
										<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
										<div
											class="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 cursor-pointer @max-[560px]:flex-col @max-[560px]:items-start"
											onclick={(e) => handleTextClick(e, note.filePath, row.lineNumber)}
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
															class="inline cursor-pointer text-primary hover:underline"
															onclick={(e) => { e.stopPropagation(); onOpenWikilink(seg.target); }}
														>{seg.display}</button>
													{:else}
														<a
															href={seg.url}
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
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</ScrollArea>
</div>
