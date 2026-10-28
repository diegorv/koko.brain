<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { formatLong, formatTime } from './event-calendar-dates.logic';
	import { HOUR_HEIGHT, layoutDay, MIN_COLUMN_PX, minutesToPx } from './event-calendar-layout.logic';
	import { groupEventsByDay, nowOffsetMinutes } from './event-calendar-view.logic';
	import { eventCalendarStore } from './event-calendar.store.svelte';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
	import EventAllDayLane from './EventAllDayLane.svelte';
	import EventBlock from './EventBlock.svelte';
	import EventDayHeaders from './EventDayHeaders.svelte';
	import type { PendingEventNote } from './event-calendar-event.logic';

	interface Props {
		/** Visible day keys: seven (or five) in week view, one in day view. */
		days: string[];
	}

	let { days }: Props = $props();

	/** Width of the time axis, in px (the `--axis` variable). */
	const AXIS_PX = 56;
	/** Hours that get a line and a label: the grid's top and bottom edges get neither. */
	const HOURS = Array.from({ length: 23 }, (_, i) => i + 1);

	let scroller: HTMLDivElement | undefined = $state();

	let timeFormat = $derived(settingsStore.eventCalendar.timeFormat);
	let events = $derived(eventCalendarStore.events);
	let timed = $derived(groupEventsByDay(events, days).timed);
	let columns = $derived(days.map((day) => layoutDay(timed.get(day) ?? [])));

	/** Axis label: 12h labels drop `:00` ("9 AM"). */
	function hourLabel(hour: number): string {
		return formatTime(hour * 60, timeFormat).replace(':00 ', ' ');
	}

	// Open on the working day; `{#key view}` in the parent remounts the grid.
	onMount(() => {
		if (scroller) scroller.scrollTop = settingsStore.eventCalendar.dayStartHour * HOUR_HEIGHT;
	});

	// When the week is wider than the pane, keep the selected day in view.
	let didScrollX = false;
	$effect(() => {
		const selected = eventCalendarViewStore.focusedDate;
		const visible = days;
		untrack(() => {
			const el = scroller;
			if (!el || el.scrollWidth <= el.clientWidth) return;
			const index = visible.indexOf(selected);
			if (index < 0) return;
			const col = (el.scrollWidth - AXIS_PX) / visible.length;
			const view = el.clientWidth - AXIS_PX;
			const left = index * col;
			if (left >= el.scrollLeft && left + col <= el.scrollLeft + view) return;
			el.scrollTo({ left: Math.max(0, left - (view - col) / 2), behavior: didScrollX ? 'smooth' : 'auto' });
			didScrollX = true;
		});
	});
</script>

<!-- One scroller for both axes: the header block sticks to the top, the time axis to the left. -->
<div
	bind:this={scroller}
	class="relative h-full min-h-0 w-full overflow-auto overscroll-x-contain"
	style="--axis: {AXIS_PX}px"
	data-time-grid
>
	<div
		class="relative flex min-w-full flex-col"
		style="min-width: calc(var(--axis) + {days.length} * {MIN_COLUMN_PX}px)"
		data-time-grid-columns
	>
		<div class="sticky top-0 z-40 bg-editor-bg" data-time-grid-header>
			<EventDayHeaders {days} />
			<EventAllDayLane {days} {events} />
		</div>

		<div class="relative flex w-full" style="height: {24 * HOUR_HEIGHT}px">
			<div class="pointer-events-none absolute inset-y-0 right-0 left-(--axis)" aria-hidden="true">
				{#each HOURS as h (h)}
					<div class="absolute inset-x-0 h-px bg-border" style="top: {h * HOUR_HEIGHT}px"></div>
				{/each}
			</div>

			<div class="sticky left-0 z-30 h-full w-(--axis) shrink-0 bg-editor-bg select-none" aria-hidden="true" data-time-axis>
				{#each HOURS as h (h)}
					<span
						class="absolute right-2 text-[11px] whitespace-nowrap text-muted-foreground"
						style="top: {h * HOUR_HEIGHT - 7}px">{hourLabel(h)}</span
					>
				{/each}
			</div>

			<div class="relative flex h-full min-w-0 flex-1 select-none">
				{#each days as day, i (day)}
					{@const now = nowOffsetMinutes(eventCalendarViewStore.nowMs, day)}
					<div
						class="relative h-full min-w-0 flex-1 border-l border-border"
						role="group"
						aria-label="{formatLong(day)} schedule"
						data-day-column={day}
					>
						{#each columns[i] as placed (placed.event.path)}
							<EventBlock
								event={placed.event as PendingEventNote}
								column={placed.column}
								columns={placed.columns}
								{timeFormat}
							/>
						{/each}
						{#if now !== null}
							<div
								class="pointer-events-none absolute right-0 left-0 z-20 h-0"
								style="top: {minutesToPx(now)}px"
								aria-hidden="true"
								data-now-line
							>
								<span class="absolute -top-1 -left-1 size-2 rounded-full bg-primary"></span>
								<span class="absolute inset-x-0 -top-px h-[1.5px] bg-primary"></span>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
