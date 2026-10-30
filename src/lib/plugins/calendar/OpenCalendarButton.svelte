<script lang="ts">
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import { openEventCalendarTab } from '#lib/features/event-calendar/event-calendar.service.js';
	import { calendarStore } from './calendar.store.svelte';
	import { toDateKey } from './calendar.logic';

	interface Props {
		/** Open on the day selected in the calendar panel instead of today. Only the calendar panel sets it: elsewhere that selection is out of sight. */
		useSelectedDate?: boolean;
	}

	let { useSelectedDate = false }: Props = $props();

	/** Opens the Calendar tab at the selected date (when `useSelectedDate`), otherwise today. */
	function handleOpenCalendar() {
		const selected = useSelectedDate ? calendarStore.selectedDateKey : null;
		openEventCalendarTab({ date: selected ?? toDateKey(new Date()) });
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
