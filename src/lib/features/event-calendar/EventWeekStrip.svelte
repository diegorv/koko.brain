<script lang="ts">
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { dayOfWeek, formatLong, formatWeekday, fromKey, weekDays, WEEKDAYS_SHORT } from './event-calendar-dates.logic';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';

	// All seven days, whatever `showWeekends` says: the strip is how a day view
	// reaches a weekend day the week view hides.
	const days = $derived(weekDays(eventCalendarViewStore.focusedDate, settingsStore.eventCalendar.weekStartsOn));
</script>

<div
	class="flex h-16 w-full shrink-0 items-center gap-1 border-b border-border px-2"
	role="group"
	aria-label="Days of the week"
	data-week-strip
>
	{#each days as day (day)}
		{@const selected = day === eventCalendarViewStore.focusedDate}
		{@const today = day === eventCalendarViewStore.todayKey}
		<button
			type="button"
			class="group flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg outline-none focus-visible:bg-muted"
			aria-pressed={selected}
			aria-label="{formatWeekday(day)}, {formatLong(day)}{selected ? ', selected' : ''}"
			data-week-strip-day={day}
			data-today={today || undefined}
			onclick={() => eventCalendarViewStore.setDate(day)}
		>
			<span class="text-[11px] leading-none whitespace-nowrap text-muted-foreground">{WEEKDAYS_SHORT[dayOfWeek(day)]}</span>
			<span
				class="flex size-7 items-center justify-center rounded-lg text-sm whitespace-nowrap
					{selected
					? 'bg-primary font-semibold text-primary-foreground'
					: today
						? 'text-primary group-hover:bg-muted'
						: 'group-hover:bg-muted'}"
			>
				{fromKey(day).getDate()}
			</span>
		</button>
	{/each}
</div>
