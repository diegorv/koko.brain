<script lang="ts">
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import { toast } from 'svelte-sonner';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import { formatLong } from './event-calendar-dates.logic';
	import { eventCalendarDailyNoteStore } from './event-calendar-daily-note.store.svelte';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';

	interface Props {
		/** Day key whose daily note the button opens. */
		day: string;
		/** Extra classes for sizing in the host layout. */
		class?: string;
	}

	let { day, class: className = '' }: Props = $props();

	// Off today the button shows only while its `group/day` host (the month
	// cell or the day header) is hovered, or while it has keyboard focus.
	// `opacity-0` rather than `invisible` or `hidden`, so it stays a Tab stop
	// and a click target. `focus-within` is the own-focus reveal that
	// `chrome-state-styles.test.ts` recognises for a `group-hover` reveal;
	// `focus-visible` stays for the keyboard case it names.
	let reveal = $derived(
		day === eventCalendarViewStore.todayKey
			? ''
			: 'opacity-0 group-hover/day:opacity-100 focus-visible:opacity-100 focus-within:opacity-100',
	);

	/** Repeat clicks are safe: the store joins an open of the same day that is still in flight. */
	function handleClick() {
		eventCalendarDailyNoteStore.open(day).catch((err) => {
			toast.error('Could not open the daily note', {
				description: err instanceof Error ? err.message : String(err),
			});
		});
	}
</script>

<!-- Renders nothing unless a plugin registered a daily note opener. The host owns the Tooltip.Provider. -->
{#if eventCalendarDailyNoteStore.available}
	<Tooltip.Root>
		<Tooltip.Trigger
			class="flex shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring {reveal} {className}"
			aria-label="Open daily note for {formatLong(day)}"
			data-daily-note={day}
			onclick={handleClick}
		>
			<CalendarPlus class="size-3.5" />
		</Tooltip.Trigger>
		<Tooltip.Content>Open daily note</Tooltip.Content>
	</Tooltip.Root>
{/if}
