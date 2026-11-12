<script lang="ts">
	import { onDestroy, untrack, type Component } from 'svelte';
	import Circle from '@lucide/svelte/icons/circle';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleArrowRight from '@lucide/svelte/icons/circle-arrow-right';
	import CircleCheckBig from '@lucide/svelte/icons/circle-check-big';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import CircleMinus from '@lucide/svelte/icons/circle-minus';
	import CircleQuestionMark from '@lucide/svelte/icons/circle-question-mark';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import FileText from '@lucide/svelte/icons/file-text';
	import Hash from '@lucide/svelte/icons/hash';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import { ScrollArea } from '#lib/components/ui/scroll-area/index.js';
	import { tasksStore } from './tasks.store.svelte';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { buildTaskIndex, getTasksResetGeneration, toggleTask, updateSectionTagFilter } from './tasks.service';
	import { openFileInEditor } from '#lib/core/editor/editor.service.js';
	import { openNoteAt } from '#lib/core/editor/open-note-at.service.js';
	import { resolveIconForPath } from '#lib/features/file-icons/icon-resolver.js';
	import { iconColorStyle } from '#lib/features/file-icons/file-icons.logic.js';
	import IconRenderer from '#lib/features/file-icons/IconRenderer.svelte';
	import { formatDate } from '#lib/utils/date.js';
	import {
		filterByDate,
		filterCompleted,
		computeTaskStats,
		parseTaskTextSegments,
		describeTaskRule,
		explainEmptyTasks,
		parseSectionTags,
		noteFolder,
		noteTaskCounts,
		type EmptyTasksExplanation,
	} from './tasks.logic';
	import { isTaskOpen, statusGlyph, toggleTarget, type StatusGlyphIcon } from './task-status.logic';
	import type { TaskDateFilter, TaskItem } from './tasks.types';

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

	const DATE_FILTERS: { label: string; value: TaskDateFilter }[] = [
		{ label: 'All time', value: 'all' },
		{ label: 'Last 7 days', value: 'last7days' },
		{ label: 'Last 30 days', value: 'last30days' },
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

	let filteredGroups = $derived.by(() => {
		let groups = filterByDate(tasksStore.fileTaskGroups, tasksStore.dateFilter);
		if (tasksStore.hideCompleted) {
			groups = filterCompleted(groups);
		}
		return groups;
	});

	let stats = $derived(computeTaskStats(filteredGroups));

	/**
	 * Each note's counts before the view's own filters, by path: the groups in
	 * `filteredGroups` are copies with the hidden tasks left out. Every group
	 * there comes from `fileTaskGroups`, so each has an entry.
	 */
	let noteCounts = $derived(
		new Map(tasksStore.fileTaskGroups.map((group) => [group.filePath, noteTaskCounts(group.tasks)])),
	);

	let ruleSentence = $derived(
		describeTaskRule({
			sectionTag: tasksStore.sectionTag,
			hideCompleted: tasksStore.hideCompleted,
			dateFilter: tasksStore.dateFilter,
		}),
	);

	let emptyExplanation = $derived(
		filteredGroups.length === 0
			? explainEmptyTasks({
					groups: tasksStore.fileTaskGroups,
					sectionTag: tasksStore.sectionTag,
					hideCompleted: tasksStore.hideCompleted,
					dateFilter: tasksStore.dateFilter,
				})
			: null,
	);

	function runEmptyAction(kind: NonNullable<EmptyTasksExplanation['action']>['kind']) {
		if (kind === 'clearTag') clearSectionTag();
		else if (kind === 'showCompleted') tasksStore.setHideCompleted(false);
		else tasksStore.setDateFilter('all');
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
		if (scrollRestored || !viewport || !tasksStore.hasLoaded || filteredGroups.length === 0) return;
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

<div class="flex h-full flex-col">
	<!-- Toolbar -->
	<div class="pane-toolbar">
		<div class="flex items-center gap-1">
			{#each DATE_FILTERS as filter (filter.value)}
				<button
					class="px-2 py-0.5 text-xs rounded-md transition-colors cursor-pointer
						{tasksStore.dateFilter === filter.value
							? 'bg-primary/20 text-primary'
							: 'text-muted-foreground hover:bg-accent'}"
					onclick={() => tasksStore.setDateFilter(filter.value)}
				>
					{filter.label}
				</button>
			{/each}
		</div>

		<div class="flex items-center gap-1">
			<button
				class="p-1 rounded-md transition-colors cursor-pointer
					{tasksStore.hideCompleted
						? 'bg-primary/20 text-primary'
						: 'text-muted-foreground hover:bg-accent'}"
				onclick={() => tasksStore.setHideCompleted(!tasksStore.hideCompleted)}
				title="{tasksStore.hideCompleted ? 'Show' : 'Hide'} closed tasks"
			>
				{#if tasksStore.hideCompleted}
					<EyeOff class="size-3.5" />
				{:else}
					<Eye class="size-3.5" />
				{/if}
			</button>
		</div>

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

		{#if tasksStore.hasLoaded && tasksStore.isLoading}
			<span role="status" aria-label="Refreshing tasks" class="flex items-center">
				<Loader2 class="size-3.5 animate-spin text-muted-foreground" />
			</span>
		{/if}
	</div>

	<!-- Content -->
	<ScrollArea class="flex-1 min-h-0" bind:viewportRef>
		<div class="p-4">
			{#if !tasksStore.hasLoaded}
				<p class="text-sm text-muted-foreground text-center py-8">Indexing tasks...</p>
			{:else if tasksStore.error && tasksStore.fileTaskGroups.length === 0}
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
							onclick={() => runEmptyAction(action.kind)}
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
				<p class="text-xs text-muted-foreground mb-4">
					{stats.pending} open in {stats.fileCount} {stats.fileCount === 1 ? 'note' : 'notes'}
				</p>

				<div class="space-y-6">
					{#each filteredGroups as group (group.filePath)}
						{@const resolved = resolveIconForPath(group.filePath)}
						{@const folder = noteFolder(vaultStore.path, group.filePath)}
						{@const counts = noteCounts.get(group.filePath)!}
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
											title={modifiedTitle(group.modifiedAt)}
											onclick={() => handleFileClick(group.filePath)}
										>
											{group.fileName}
										</button>
										<span data-task-group-count class="text-xs text-muted-foreground">{`${counts.open} of ${counts.total} open`}</span>
									</div>
									{#if folder}
										<p data-task-group-subtitle class="truncate text-xs text-muted-foreground">{folder}</p>
									{/if}
								</div>
							</div>

							<!-- Task list -->
							<div class="space-y-1">
								{#each group.tasks as task (task.lineNumber)}
									<!-- The glyph follows the status; the label follows `toggleTarget`, what a click writes. -->
									{@const glyph = statusGlyph(task.status)}
									{@const Glyph = GLYPH_ICONS[glyph.icon]}
									<div
										data-task-row
										class="flex items-start gap-2 w-full group rounded-md px-1 py-0.5 hover:bg-accent/50 transition-colors"
										style="padding-left: {task.indent * 1.25 + 0.25}rem"
									>
										<button
											data-task-toggle
											data-task-status={task.status}
											class="shrink-0 cursor-pointer p-1 -mx-1 -mb-1 -mt-0.5 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
											aria-label="{toggleTarget(task.status) === 'done' ? 'Mark task as done' : 'Mark task as not done'}: {task.text} ({glyph.word})"
											title={glyph.word}
											onclick={() => handleToggle(group.filePath, task)}
										>
											<Glyph class="size-4 {glyph.tone}" />
										</button>
										<!-- Clicking the text opens the note at the task's line; only the circle toggles. -->
										<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
										<span
											data-task-text
											class="flex-1 min-w-0 break-words text-sm cursor-pointer {isTaskOpen(task.status) ? 'text-foreground' : 'text-muted-foreground line-through'}"
											onclick={(e) => handleTextClick(e, group.filePath, task.lineNumber)}
										>
											{#each parseTaskTextSegments(task.text) as seg}
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
