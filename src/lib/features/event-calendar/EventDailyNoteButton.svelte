<script lang="ts">
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import { toast } from 'svelte-sonner';
	import { formatLong } from './event-calendar-dates.logic';
	import { eventCalendarDailyNoteStore } from './event-calendar-daily-note.store.svelte';

	interface Props {
		/** Day key whose daily note the button opens. */
		day: string;
		/** Extra classes for sizing in the host layout. */
		class?: string;
	}

	let { day, class: className = '' }: Props = $props();

	function handleClick() {
		eventCalendarDailyNoteStore.open(day).catch((err) => {
			toast.error('Could not open the daily note', {
				description: err instanceof Error ? err.message : String(err),
			});
		});
	}
</script>

<!-- Renders nothing unless a plugin registered a daily note opener. -->
{#if eventCalendarDailyNoteStore.available}
	<button
		type="button"
		class="flex shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-60 outline-none hover:bg-muted hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring {className}"
		aria-label="Open daily note for {formatLong(day)}"
		title="Open daily note"
		data-daily-note={day}
		onclick={handleClick}
	>
		<NotebookPen class="size-3.5" />
	</button>
{/if}
