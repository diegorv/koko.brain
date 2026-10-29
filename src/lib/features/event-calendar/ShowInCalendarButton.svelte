<script lang="ts">
	import CalendarSearch from '@lucide/svelte/icons/calendar-search';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { error } from '#lib/utils/debug.js';
	import { findCalendarEvent, openEventInCalendar } from './event-calendar.service';
	import { eventCalendarStore } from './event-calendar.store.svelte';

	/**
	 * "Show in Calendar" icon button for a row that stands for a note (a
	 * search result, a backlink). Renders only when the note is a calendar
	 * event; a click opens the Calendar on its day with the block focused.
	 */
	let { path, class: className = '' }: { path: string; class?: string } = $props();

	/** Whether `path` resolved to a calendar event. */
	let isEvent = $state(false);
	/** Bumped per lookup; only the latest lookup writes `isEvent`. */
	let lookupSeq = 0;

	// Re-resolve on a new path, an index bump, a calendar load or a change of
	// the settings the projection reads.
	$effect(() => {
		const notePath = path;
		const ready = vaultStore.indexReady;
		void vaultStore.vaultIndexVersion;
		void eventCalendarStore.events;
		const s = settingsStore.eventCalendar;
		void s.eventTypeName;
		void settingsStore.templates.systemFolder;
		untrack(() => {
			const seq = ++lookupSeq;
			if (!ready) {
				isEvent = false;
				return;
			}
			findCalendarEvent(notePath).then(
				(event) => {
					if (seq === lookupSeq) isEvent = event !== null;
				},
				(err) => {
					error('EVENT-CALENDAR', 'findCalendarEvent failed:', err);
					if (seq === lookupSeq) isEvent = false;
				},
			);
		});
	});

	async function handleClick() {
		try {
			if (!(await openEventInCalendar(path))) {
				toast.error('This note is no longer a calendar event');
			}
		} catch (err) {
			toast.error('Could not open the Calendar', {
				description: err instanceof Error ? err.message : String(err),
			});
		}
	}
</script>

{#if isEvent}
	<button
		type="button"
		class="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none cursor-pointer {className}"
		aria-label="Show in Calendar"
		title="Show in Calendar"
		data-show-in-calendar
		onclick={handleClick}
	>
		<CalendarSearch class="size-3.5" />
	</button>
{/if}
