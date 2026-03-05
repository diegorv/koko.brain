<script lang="ts">
	import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, CalendarPlus, FileText } from 'lucide-svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { calendarStore } from './calendar.store.svelte';
	import { openOrCreateDailyNoteForDate, openOrCreatePeriodicNoteForDate, openCalendarFile } from './calendar.service';
	import { buildMonthGrid, formatDateLabel, extractDisplayName } from './calendar.logic';
	import CalendarGrid from './CalendarGrid.svelte';

	let grid = $derived(buildMonthGrid(calendarStore.currentYear, calendarStore.currentMonth));

	/** DateKey for the 1st of the currently displayed month (used for month/quarter note creation) */
	let currentMonthDateKey = $derived(
		`${calendarStore.currentYear}-${String(calendarStore.currentMonth + 1).padStart(2, '0')}-01`
	);

	function handleDayClick(dateKey: string) {
		calendarStore.setSelectedDateKey(dateKey);
	}

	function handleWeekClick(dateKey: string) {
		openOrCreatePeriodicNoteForDate('weekly', dateKey).catch(console.error);
	}

	function handleMonthClick() {
		openOrCreatePeriodicNoteForDate('monthly', currentMonthDateKey).catch(console.error);
	}

	function handleQuarterClick() {
		openOrCreatePeriodicNoteForDate('quarterly', currentMonthDateKey).catch(console.error);
	}
</script>

<div class="flex flex-col">
	<div class="flex items-center h-10 px-3 shrink-0">
		<h2 class="font-semibold uppercase tracking-wide text-primary">Calendar</h2>
	</div>
	<Separator />
	<div class="p-2">
		<!-- Month/Year navigation: « < Month Year > » -->
		<div class="flex items-center justify-center gap-1 mb-0.5">
			<button
				class="p-0.5 rounded-md hover:bg-accent transition-colors cursor-pointer"
				onclick={() => calendarStore.prevYear()}
				title="Previous year"
			>
				<ChevronsLeft class="size-3.5 text-muted-foreground" />
			</button>
			<button
				class="p-0.5 rounded-md hover:bg-accent transition-colors cursor-pointer"
				onclick={() => calendarStore.prevMonth()}
				title="Previous month"
			>
				<ChevronLeft class="size-3.5 text-muted-foreground" />
			</button>
			<button
				class="px-2 py-0.5 text-primary font-semibold rounded-md hover:bg-accent transition-colors cursor-pointer"
				onclick={handleMonthClick}
				ondblclick={() => calendarStore.goToToday()}
				title="Open monthly note — double-click to go to today"
			>
				{grid.label}
			</button>
			<button
				class="p-0.5 rounded-md hover:bg-accent transition-colors cursor-pointer"
				onclick={() => calendarStore.nextMonth()}
				title="Next month"
			>
				<ChevronRight class="size-3.5 text-muted-foreground" />
			</button>
			<button
				class="p-0.5 rounded-md hover:bg-accent transition-colors cursor-pointer"
				onclick={() => calendarStore.nextYear()}
				title="Next year"
			>
				<ChevronsRight class="size-3.5 text-muted-foreground" />
			</button>
		</div>

		<!-- Quarter label -->
		<button
			class="block w-full text-xs text-foreground/70 text-center mb-2 rounded-md hover:bg-accent hover:text-foreground transition-colors cursor-pointer py-0.5"
			onclick={handleQuarterClick}
			title="Open quarterly note (Q{grid.quarter})"
		>
			Q{grid.quarter}
		</button>

		<!-- Calendar grid -->
		<CalendarGrid
			{grid}
			dayFileCounts={calendarStore.dayFileCounts}
			selectedDateKey={calendarStore.selectedDateKey}
			onDayClick={handleDayClick}
			onWeekClick={handleWeekClick}
		/>

		<!-- Selected date section -->
		{#if calendarStore.selectedDateKey}
			<Separator class="my-2" />

			<!-- Selected date label -->
			<p class="text-xs text-primary font-semibold px-1 mb-1.5 text-center">
				{formatDateLabel(calendarStore.selectedDateKey)}
			</p>

			<!-- Daily note button -->
			<button
				class="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 mb-1.5 text-[13px] text-foreground/70 rounded-md bg-divider hover:bg-divider/80 transition-colors cursor-pointer"
				onclick={() => openOrCreateDailyNoteForDate(calendarStore.selectedDateKey!)}
				title="Open or create daily note"
			>
				<CalendarPlus class="size-3.5 shrink-0" />
				<span>Daily note</span>
			</button>

			<!-- File list for selected date -->
			{#if calendarStore.selectedDateFiles.length > 0}
				<div class="h-[200px] overflow-y-auto space-y-0.5">
					{#each calendarStore.selectedDateFiles as filePath}
						<button
							class="flex items-center gap-1.5 w-full px-2 py-1 text-foreground rounded-md hover:bg-accent transition-colors cursor-pointer text-left"
							onclick={() => openCalendarFile(filePath)}
							title={filePath}
						>
							<FileText class="size-3 shrink-0" />
							<span class="text-[14px] truncate">{extractDisplayName(filePath)}</span>
						</button>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>
