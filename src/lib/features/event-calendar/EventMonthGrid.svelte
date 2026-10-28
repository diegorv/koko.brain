<script lang="ts">
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { dayOfWeek, formatLong, formatWeekday, fromKey, WEEKDAYS_SHORT } from './event-calendar-dates.logic';
	import { eventColorStyle } from './event-calendar-event.logic';
	import { itemsByDay, MONTH_MAX_CHIPS } from './event-calendar-view.logic';
	import { eventCalendarStore } from './event-calendar.store.svelte';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
	import EventDailyNoteButton from './EventDailyNoteButton.svelte';

	let cells = $derived(eventCalendarViewStore.monthCells);
	let cols = $derived(settingsStore.eventCalendar.showWeekends ? 7 : 5);
	let headers = $derived(cells.slice(0, cols).map((c) => WEEKDAYS_SHORT[dayOfWeek(c.day)]));
	let events = $derived(eventCalendarStore.events);
	let timeFormat = $derived(settingsStore.eventCalendar.timeFormat);
	let chipsByDay = $derived(
		itemsByDay(
			events,
			cells.map((c) => c.day),
			timeFormat,
		),
	);
	let selectedPath = $derived(eventCalendarViewStore.selectedEventPath);
	let gridColumns = $derived(`grid-template-columns: repeat(${cols}, minmax(0, 1fr))`);

	/** Opens day view on `day` (the "+N more" button, a second click on the selected day number). */
	function openDay(day: string) {
		eventCalendarViewStore.setDate(day);
		eventCalendarViewStore.setView('day');
	}

	/** Selects `day`; a click on the already selected day opens day view (`month-view.tsx:93-97`). */
	function handleDayClick(day: string) {
		if (day === eventCalendarViewStore.focusedDate) openDay(day);
		else eventCalendarViewStore.setDate(day);
	}

	/** Selects the cell's day when the click lands on the cell itself, not on a chip or button. */
	function handleCellClick(e: MouseEvent, day: string) {
		if (e.target === e.currentTarget) eventCalendarViewStore.setDate(day);
	}

	/**
	 * Opens the create dialog at `dayStartHour` when a double-click lands on
	 * the empty cell (the prototype hard-coded 09:00, `month-view.tsx:83`).
	 */
	function handleCellDoubleClick(e: MouseEvent, day: string) {
		if (e.target !== e.currentTarget) return;
		eventCalendarViewStore.openDialog({ mode: 'create', date: day, start: settingsStore.eventCalendar.dayStartHour * 60 });
	}
</script>

<div class="flex h-full min-h-0 flex-col" data-month-grid>
	<div class="grid h-10 shrink-0 border-b border-border" style={gridColumns}>
		{#each headers as header, i (header)}
			<div class="flex items-center px-3 text-xs text-muted-foreground {i > 0 ? 'border-l border-border' : ''}" data-month-weekday>
				{header}
			</div>
		{/each}
	</div>
	<div class="grid min-h-0 flex-1" style="{gridColumns}; grid-template-rows: repeat(6, minmax(0, 1fr))">
		{#each cells as cell, i (cell.day)}
			{@const items = chipsByDay.get(cell.day) ?? []}
			{@const hidden = items.length - MONTH_MAX_CHIPS}
			{@const selected = cell.day === eventCalendarViewStore.focusedDate}
			{@const today = cell.day === eventCalendarViewStore.todayKey}
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<!-- Keyboard users select the day through its day-number button. -->
			<div
				class="flex min-h-0 flex-col gap-1 overflow-hidden border-b border-border p-1.5
					{i % cols > 0 ? 'border-l' : ''}
					{cell.inMonth ? '' : 'bg-muted/40'}"
				data-month-cell={cell.day}
				data-in-month={cell.inMonth}
				onclick={(e) => handleCellClick(e, cell.day)}
				ondblclick={(e) => handleCellDoubleClick(e, cell.day)}
			>
				<!-- Clicks between the two buttons fall through to the cell, which selects the day. -->
				<div class="pointer-events-none flex shrink-0 items-center justify-between *:pointer-events-auto">
					<button
						type="button"
						class="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring
							{selected
							? 'bg-primary font-semibold text-primary-foreground'
							: today
								? 'text-primary hover:bg-muted'
								: cell.inMonth
									? 'hover:bg-muted'
									: 'text-muted-foreground hover:bg-muted'}"
						aria-pressed={selected}
						aria-label="{formatWeekday(cell.day)}, {formatLong(cell.day)}{selected ? ', selected, open day view' : ''}"
						data-month-day
						data-today={today || undefined}
						onclick={() => handleDayClick(cell.day)}
					>
						{fromKey(cell.day).getDate()}
					</button>
					<EventDailyNoteButton day={cell.day} class="size-6" />
				</div>
				{#each items.slice(0, MONTH_MAX_CHIPS) as item (item.event.path)}
					<button
						type="button"
						class="flex h-[22px] w-full shrink-0 items-center overflow-hidden rounded-md px-1.5 text-left text-xs font-medium outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring
							{item.event.pending ? 'border border-dashed border-current' : ''}
							{selectedPath === item.event.path ? 'ring-2 ring-primary/70' : ''}"
						style={eventColorStyle(item.event.color)}
						data-event-path={item.event.path}
						data-pending={item.event.pending || undefined}
						onclick={(e) => eventCalendarViewStore.openPopover(item.event.path, e.currentTarget.getBoundingClientRect())}
					>
						<span class="min-w-0 flex-1 truncate">{item.label}</span>
					</button>
				{/each}
				{#if hidden > 0}
					<button
						type="button"
						class="shrink-0 self-start rounded-md px-1.5 py-1 text-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
						aria-label="{hidden} more events, open day view"
						data-month-more
						onclick={() => openDay(cell.day)}
					>
						+{hidden} more
					</button>
				{/if}
			</div>
		{/each}
	</div>
</div>
