<script lang="ts">
	import { untrack } from 'svelte';
	import ChevronsLeft from '@lucide/svelte/icons/chevrons-left';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronsRight from '@lucide/svelte/icons/chevrons-right';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import { acquireCalendarClock } from '#lib/features/event-calendar/event-calendar.service.js';
	import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import { calendarStore } from './calendar.store.svelte';
	import { openOrCreatePeriodicNoteForDate } from './calendar.service';
	import { buildMonthGrid } from './calendar.logic';
	import { noteDateCounts, parseRailDay, pickedDayLens } from './day-lens.logic';
	import CalendarGrid from './CalendarGrid.svelte';

	// The shared Calendar clock keeps `todayKey` current, so the today mark (and the
	// default day) moves at midnight.
	$effect(() => untrack(() => acquireCalendarClock()));

	// A saved day may be in another month than the one `calendarStore` starts on
	// (today's, after a restart): open on its month so the pick is visible.
	untrack(() => {
		const saved = parseRailDay(settingsStore.layout.railDay);
		if (saved) calendarStore.showMonth(Number(saved.slice(0, 4)), Number(saved.slice(5, 7)) - 1);
	});

	let grid = $derived(
		buildMonthGrid(
			calendarStore.currentYear,
			calendarStore.currentMonth,
			settingsStore.eventCalendar.weekStartsOn,
			eventCalendarViewStore.todayKey,
		),
	);

	/** The picked day: the saved one, else today. */
	let pickedDay = $derived(pickedDayLens(settingsStore.layout.railDay, eventCalendarViewStore.todayKey).target ?? null);

	/** Dots: notes per note date, by the rule the Day lens lists with. */
	let dayCounts = $derived.by(() => {
		void typeDefinitionsStore.entriesVersion;
		return noteDateCounts({
			entries: typeDefinitionsStore.entries,
			vaultPath: vaultStore.path,
			systemFolder: settingsStore.templates.systemFolder,
			typeMetadataMap: typeDefinitionsStore.typeMetadataMap,
			fileTree: fsStore.fileTree,
		});
	});

	function pickDay(dateKey: string) {
		settingsStore.updateLayout({ railDay: dateKey });
	}

	/** Shows today's month and drops the saved day, so the pick is today and follows the clock. */
	function goToToday() {
		calendarStore.goToToday();
		settingsStore.updateLayout({ railDay: null });
	}

	function openWeeklyNote(dateKey: string) {
		openOrCreatePeriodicNoteForDate('weekly', dateKey).catch(console.error);
	}
</script>

<div class="flex h-full flex-col bg-file-explorer-bg text-file-explorer-fg" data-calendar-navigator>
	<!-- pl-6 clears the macOS traffic lights, which overflow the 48 px rail. -->
	<div
		class="flex h-10 shrink-0 items-center gap-2 bg-tab-bar pl-6 pr-3"
		style="box-shadow: inset 0 -1px 0 var(--divider)"
		data-tauri-drag-region
	>
		<span class="truncate text-sm font-medium text-tab-text-active">Calendar</span>
	</div>
	<div class="flex flex-1 flex-col overflow-y-auto p-2">
		<!-- « < Month Year > » -->
		<div class="mb-1 flex shrink-0 items-center justify-center gap-1">
			<button
				class="cursor-default rounded-md p-0.5 transition-colors hover:bg-file-explorer-accent"
				onclick={() => calendarStore.prevYear()}
				title="Previous year"
				aria-label="Previous year"
			>
				<ChevronsLeft class="size-3.5 text-file-explorer-muted-fg" />
			</button>
			<button
				class="cursor-default rounded-md p-0.5 transition-colors hover:bg-file-explorer-accent"
				onclick={() => calendarStore.prevMonth()}
				title="Previous month"
				aria-label="Previous month"
			>
				<ChevronLeft class="size-3.5 text-file-explorer-muted-fg" />
			</button>
			<button
				class="cursor-default rounded-md px-2 py-0.5 font-semibold text-file-explorer-primary transition-colors hover:bg-file-explorer-accent"
				onclick={goToToday}
				title="Go to today"
				data-calendar-month-label
			>
				{grid.label}
			</button>
			<button
				class="cursor-default rounded-md p-0.5 transition-colors hover:bg-file-explorer-accent"
				onclick={() => calendarStore.nextMonth()}
				title="Next month"
				aria-label="Next month"
			>
				<ChevronRight class="size-3.5 text-file-explorer-muted-fg" />
			</button>
			<button
				class="cursor-default rounded-md p-0.5 transition-colors hover:bg-file-explorer-accent"
				onclick={() => calendarStore.nextYear()}
				title="Next year"
				aria-label="Next year"
			>
				<ChevronsRight class="size-3.5 text-file-explorer-muted-fg" />
			</button>
		</div>

		<CalendarGrid {grid} dayFileCounts={dayCounts} selectedDateKey={pickedDay} onDayClick={pickDay} onWeekClick={openWeeklyNote} />
	</div>
</div>
