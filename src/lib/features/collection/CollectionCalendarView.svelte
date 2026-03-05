<script lang="ts">
	import type { QueryResult, NoteRecord } from './collection.types';
	import {
		getCalendarGrid,
		groupRecordsByDate,
		navigateMonth,
		formatMonthYear,
		getWeekDayLabels,
		formatDateKey,
	} from './calendar.logic';
	import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-svelte';

	interface Props {
		result: QueryResult;
		/** Which frontmatter property holds the start date */
		dateProperty: string;
		/** Optional end date property for multi-day events */
		endDateProperty?: string;
		/** First day of the week (0=Sun, 1=Mon). Default: 1 */
		weekStartDay?: number;
		/** Called when a record is clicked */
		onClickRecord?: (record: NoteRecord) => void;
	}

	let {
		result,
		dateProperty,
		endDateProperty,
		weekStartDay = 1,
		onClickRecord,
	}: Props = $props();

	const MAX_EVENTS_PER_CELL = 3;

	const now = new Date();
	let currentYear = $state(now.getFullYear());
	let currentMonth = $state(now.getMonth());

	let grid = $derived(getCalendarGrid(currentYear, currentMonth, weekStartDay));
	let dayLabels = $derived(getWeekDayLabels(weekStartDay));
	let monthLabel = $derived(formatMonthYear(currentYear, currentMonth));
	let eventsByDate = $derived(groupRecordsByDate(result.records, dateProperty, endDateProperty));

	function goToPrevYear() { currentYear -= 1; }
	function goToNextYear() { currentYear += 1; }

	function goToPrevMonth() {
		const nav = navigateMonth(currentYear, currentMonth, -1);
		currentYear = nav.year;
		currentMonth = nav.month;
	}

	function goToNextMonth() {
		const nav = navigateMonth(currentYear, currentMonth, 1);
		currentYear = nav.year;
		currentMonth = nav.month;
	}

	function goToToday() {
		const today = new Date();
		currentYear = today.getFullYear();
		currentMonth = today.getMonth();
	}

	function getEventsForDay(date: Date) {
		return eventsByDate.get(formatDateKey(date)) ?? [];
	}
</script>

<div class="flex h-full flex-col">
	<!-- Navigation header -->
	<div class="flex items-center justify-center gap-1 px-3 py-2">
		<button
			class="p-0.5 rounded-md hover:bg-accent transition-colors cursor-pointer"
			onclick={goToPrevYear}
			title="Previous year"
		>
			<ChevronsLeft class="size-3.5 text-muted-foreground" />
		</button>
		<button
			class="p-0.5 rounded-md hover:bg-accent transition-colors cursor-pointer"
			onclick={goToPrevMonth}
			title="Previous month"
		>
			<ChevronLeft class="size-3.5 text-muted-foreground" />
		</button>
		<button
			class="px-2 py-0.5 text-primary font-semibold rounded-md hover:bg-accent transition-colors cursor-pointer"
			ondblclick={goToToday}
			title="Double-click to go to today"
		>
			{monthLabel}
		</button>
		<button
			class="p-0.5 rounded-md hover:bg-accent transition-colors cursor-pointer"
			onclick={goToNextMonth}
			title="Next month"
		>
			<ChevronRight class="size-3.5 text-muted-foreground" />
		</button>
		<button
			class="p-0.5 rounded-md hover:bg-accent transition-colors cursor-pointer"
			onclick={goToNextYear}
			title="Next year"
		>
			<ChevronsRight class="size-3.5 text-muted-foreground" />
		</button>
	</div>

	<!-- Calendar grid -->
	<div class="flex-1 overflow-auto px-3 pb-3">
		<div class="calendar-grid grid grid-cols-7 overflow-hidden rounded-lg border border-foreground/15">
			<!-- Day-of-week headers -->
			{#each dayLabels as label, i}
				<div
					class="bg-muted/60 px-2 py-1.5 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
					style="border-bottom: 1px solid var(--foreground-15, rgba(255,255,255,0.15)); {i < 6 ? 'border-right: 1px solid var(--foreground-15, rgba(255,255,255,0.15));' : ''}"
				>
					{label}
				</div>
			{/each}

			<!-- Day cells -->
			{#each grid as week, weekIdx}
				{#each week as day, dayIdx}
					{@const events = getEventsForDay(day.date)}
					{@const visibleEvents = events.slice(0, MAX_EVENTS_PER_CELL)}
					{@const overflowCount = events.length - MAX_EVENTS_PER_CELL}
					{@const isLastRow = weekIdx === grid.length - 1}
					<div
						class="min-h-24 p-1
							{day.isCurrentMonth ? '' : 'bg-muted/20'}
							{day.isToday ? 'bg-primary/5' : ''}"
						style="{dayIdx < 6 ? 'border-right: 1px dashed rgba(255,255,255,0.08);' : ''}{!isLastRow ? 'border-bottom: 1px dashed rgba(255,255,255,0.08);' : ''}"
					>
						<!-- Day number -->
						<div class="mb-0.5 flex justify-end px-0.5">
							<span
								class="inline-flex size-6 items-center justify-center rounded-full text-xs
									{day.isToday ? 'bg-primary text-primary-foreground font-bold' : ''}
									{day.isCurrentMonth ? 'text-foreground/80' : 'text-muted-foreground/40'}"
							>
								{day.date.getDate()}
							</span>
						</div>

						<!-- Events -->
						<div class="flex flex-col gap-0.5">
							{#each visibleEvents as event}
								<button
									class="w-full truncate rounded-sm px-1.5 py-0.5 text-left text-[11px] leading-tight bg-primary/15 text-foreground hover:bg-primary/25 transition-colors cursor-pointer"
									onclick={() => onClickRecord?.(event.record)}
									title={event.record.basename}
								>
									{event.record.basename}
								</button>
							{/each}
							{#if overflowCount > 0}
								<span class="px-1.5 text-[11px] text-muted-foreground">
									+{overflowCount} more
								</span>
							{/if}
						</div>
					</div>
				{/each}
			{/each}
		</div>
	</div>
</div>
