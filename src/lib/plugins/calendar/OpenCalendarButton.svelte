<script lang="ts">
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import { openEventCalendarTab } from '#lib/features/event-calendar/event-calendar.service.js';
	import { calendarStore } from './calendar.store.svelte';
	import { toDateKey } from './calendar.logic';

	/** Opens the Calendar tab at the selected date, or today when none is selected. */
	function handleOpenCalendar() {
		openEventCalendarTab({ date: calendarStore.selectedDateKey ?? toDateKey(new Date()) });
	}
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				size="icon-sm"
				class="size-6"
				aria-label="Open Calendar"
				onclick={handleOpenCalendar}
			>
				<CalendarRange class="size-3.5" />
			</Button>
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content>Open Calendar</Tooltip.Content>
</Tooltip.Root>
