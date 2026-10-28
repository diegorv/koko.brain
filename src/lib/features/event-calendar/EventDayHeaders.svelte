<script lang="ts">
	import { dayOfWeek, formatLong, formatWeekday, fromKey, WEEKDAYS_SHORT } from './event-calendar-dates.logic';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
	import EventDailyNoteButton from './EventDailyNoteButton.svelte';

	interface Props {
		/** Visible day keys, one header button each. */
		days: string[];
	}

	let { days }: Props = $props();

	/** Selects `day`; a click on the already selected day opens day view. */
	function handleClick(day: string) {
		const wasSelected = day === eventCalendarViewStore.focusedDate;
		eventCalendarViewStore.setDate(day);
		if (wasSelected) eventCalendarViewStore.setView('day');
	}
</script>

<div class="flex h-12 w-full shrink-0 items-stretch border-b border-border" data-day-headers>
	<div class="sticky left-0 z-10 w-(--axis) shrink-0 bg-editor-bg"></div>
	{#each days as day (day)}
		{@const selected = day === eventCalendarViewStore.focusedDate}
		{@const today = day === eventCalendarViewStore.todayKey}
		<div class="flex min-w-0 flex-1 items-center border-l border-border">
			<button
				type="button"
				class="group flex h-full min-w-0 flex-1 items-center gap-2 overflow-hidden px-3 text-left outline-none focus-visible:bg-muted"
				aria-pressed={selected}
				aria-label="{formatWeekday(day)}, {formatLong(day)}{selected ? ', selected, open day view' : ''}"
				data-day-header={day}
				onclick={() => handleClick(day)}
			>
				<span class="shrink-0 text-xs whitespace-nowrap text-muted-foreground">{WEEKDAYS_SHORT[dayOfWeek(day)]}</span>
				<span
					class="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1 text-sm whitespace-nowrap
						{selected
						? 'bg-primary font-semibold text-primary-foreground'
						: today
							? 'text-primary group-hover:bg-muted'
							: 'group-hover:bg-muted'}"
				>
					{fromKey(day).getDate()}
				</span>
			</button>
			<EventDailyNoteButton {day} class="mr-1.5 size-6" />
		</div>
	{/each}
</div>
