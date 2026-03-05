<script lang="ts">
	import type { QueryResult, NoteRecord } from './collection.types';
	import {
		buildLinearYearLayout,
		buildColorMapping,
		getColorForValue,
		type MonthRow,
		type ColorMapping,
	} from './linear-calendar.logic';
	import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-svelte';

	interface Props {
		result: QueryResult;
		/** Which frontmatter property holds the start date */
		dateProperty: string;
		/** Optional end date property for multi-day events */
		endDateProperty?: string;
		/** Optional property to determine event bar color */
		colorProperty?: string;
		/** Called when a record is clicked */
		onClickRecord?: (record: NoteRecord) => void;
	}

	let {
		result,
		dateProperty,
		endDateProperty,
		colorProperty,
		onClickRecord,
	}: Props = $props();

	const BAR_HEIGHT = 24;
	const BAR_GAP = 3;
	const MIN_ROW_HEIGHT = 36;

	const now = new Date();
	let currentYear = $state(now.getFullYear());

	let layout = $derived(buildLinearYearLayout(
		result.records, currentYear, dateProperty, endDateProperty, colorProperty,
	));

	let colorMapping = $derived<ColorMapping | null>(
		colorProperty ? buildColorMapping(result.records, colorProperty) : null,
	);

	let todayMonth = $derived(now.getFullYear() === currentYear ? now.getMonth() : -1);
	let todayDay = $derived(now.getFullYear() === currentYear ? now.getDate() : -1);

	function goToPrevYear() { currentYear -= 1; }
	function goToNextYear() { currentYear += 1; }
	function goToFarPrevYear() { currentYear -= 5; }
	function goToFarNextYear() { currentYear += 5; }

	function goToCurrentYear() {
		currentYear = new Date().getFullYear();
	}

	function getRowHeight(row: MonthRow): number {
		if (row.maxLane < 0) return MIN_ROW_HEIGHT;
		return (row.maxLane + 1) * (BAR_HEIGHT + BAR_GAP) + BAR_GAP;
	}

	function getBarLeft(startDay: number, daysInMonth: number): string {
		return `${((startDay - 1) / daysInMonth) * 100}%`;
	}

	function getBarWidth(startDay: number, endDay: number, daysInMonth: number): string {
		return `${((endDay - startDay + 1) / daysInMonth) * 100}%`;
	}

	function getBarTop(lane: number): string {
		return `${lane * (BAR_HEIGHT + BAR_GAP) + BAR_GAP}px`;
	}

	function getBarColor(colorValue: string | null): string {
		if (!colorMapping || !colorValue) return 'var(--primary)';
		return getColorForValue(colorValue, colorMapping) ?? 'var(--primary)';
	}
</script>

<div class="flex h-full flex-col">
	<!-- Navigation header -->
	<div class="flex items-center justify-center gap-1.5 px-3 py-2.5">
		<button
			class="p-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
			onclick={goToFarPrevYear}
			title="Back 5 years"
		>
			<ChevronsLeft class="size-4 text-muted-foreground" />
		</button>
		<button
			class="p-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
			onclick={goToPrevYear}
			title="Previous year"
		>
			<ChevronLeft class="size-4 text-muted-foreground" />
		</button>
		<button
			class="px-3 py-1 text-lg text-primary font-bold rounded-md hover:bg-accent transition-colors cursor-pointer"
			ondblclick={goToCurrentYear}
			title="Double-click to go to current year"
		>
			{currentYear}
		</button>
		<button
			class="p-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
			onclick={goToNextYear}
			title="Next year"
		>
			<ChevronRight class="size-4 text-muted-foreground" />
		</button>
		<button
			class="p-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
			onclick={goToFarNextYear}
			title="Forward 5 years"
		>
			<ChevronsRight class="size-4 text-muted-foreground" />
		</button>
	</div>

	<!-- Color legend -->
	{#if colorMapping && colorMapping.values.length > 0}
		<div class="flex flex-wrap items-center gap-3 px-3 pb-2">
			{#each colorMapping.values as value}
				<div class="flex items-center gap-1.5">
					<span
						class="inline-block size-3 rounded-sm"
						style="background: {getColorForValue(value, colorMapping)}"
					></span>
					<span class="text-xs text-muted-foreground">{value}</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Linear calendar grid -->
	<div class="flex-1 overflow-auto px-3 pb-3">
		<div class="overflow-hidden rounded-lg border border-foreground/15">
			<!-- Day number header row -->
			<div class="grid" style="grid-template-columns: 56px repeat(31, 1fr);">
				<div
					class="bg-muted/60 px-1 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
					style="border-bottom: 1px solid var(--foreground-15, rgba(255,255,255,0.15)); border-right: 1px solid var(--foreground-15, rgba(255,255,255,0.15));"
				></div>
				{#each Array.from({ length: 31 }, (_, i) => i + 1) as day, i}
					<div
						class="bg-muted/60 py-1.5 text-center text-[11px] font-medium text-muted-foreground"
						style="border-bottom: 1px solid var(--foreground-15, rgba(255,255,255,0.15)); {i < 30 ? 'border-right: 1px solid var(--foreground-15, rgba(255,255,255,0.15));' : ''}"
					>
						{String(day).padStart(2, '0')}
					</div>
				{/each}
			</div>

			<!-- Month rows -->
			{#each layout as row, rowIdx}
				{@const rowHeight = getRowHeight(row)}
				{@const isLastRow = rowIdx === layout.length - 1}
				<div class="grid" style="grid-template-columns: 56px repeat(31, 1fr);">
					<!-- Month label -->
					<div
						class="flex items-start justify-center px-1 pt-2 text-xs font-semibold text-muted-foreground"
						style="min-height: {rowHeight}px; border-right: 1px solid var(--foreground-15, rgba(255,255,255,0.15)); {!isLastRow ? 'border-bottom: 1px dashed rgba(255,255,255,0.08);' : ''}"
					>
						{row.label}
					</div>

					<!-- Day cells with event overlay -->
					{#each Array.from({ length: 31 }, (_, i) => i + 1) as day, dayIdx}
						{@const isInactive = day > row.daysInMonth}
						{@const isToday = row.month === todayMonth && day === todayDay}
						<div
							class="relative
								{isInactive ? 'bg-muted/20' : ''}
								{isToday ? 'bg-primary/10' : ''}"
							style="min-height: {rowHeight}px; {dayIdx < 30 ? 'border-right: 1px dashed rgba(255,255,255,0.04);' : ''} {!isLastRow ? 'border-bottom: 1px dashed rgba(255,255,255,0.08);' : ''}"
						></div>
					{/each}
				</div>

				<!-- Event bars overlay (positioned over the day cells) -->
				{#if row.events.length > 0}
					<div
						class="grid pointer-events-none"
						style="grid-template-columns: 56px repeat(31, 1fr); margin-top: -{rowHeight}px; height: {rowHeight}px;"
					>
						<!-- Spacer for month label column -->
						<div></div>
						<!-- Events area spanning all 31 day columns -->
						<div class="relative col-span-31" style="height: {rowHeight}px;">
							{#each row.events as event}
								{@const startDay = event.startDate.getDate()}
								{@const endDay = event.endDate.getDate()}
								<button
									class="absolute flex items-center overflow-hidden rounded px-2 text-xs leading-tight text-white shadow-sm hover:brightness-110 transition-all cursor-pointer pointer-events-auto"
									style="
										left: {getBarLeft(startDay, row.daysInMonth)};
										width: {getBarWidth(startDay, endDay, row.daysInMonth)};
										top: {getBarTop(event.lane)};
										height: {BAR_HEIGHT}px;
										background: {getBarColor(event.colorValue)};
									"
									onclick={() => onClickRecord?.(event.record)}
									title={event.record.basename}
								>
									<span class="truncate">{event.record.basename}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>
