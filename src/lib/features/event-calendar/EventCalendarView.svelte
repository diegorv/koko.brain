<script lang="ts" module>
	/**
	 * Bumped per load any mounted view starts, shared across mounts so a
	 * remount supersedes the load an unmounted instance left in flight.
	 */
	let loadSeq = 0;
</script>

<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { acquireCalendarClock, loadEvents } from './event-calendar.service';
	import { eventCalendarStore } from './event-calendar.store.svelte';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
	import EventCalendarHeader from './EventCalendarHeader.svelte';
	import EventCalendarNeedsAttention from './EventCalendarNeedsAttention.svelte';
	import EventMonthGrid from './EventMonthGrid.svelte';
	import EventPopover from './EventPopover.svelte';
	import EventTimeGrid from './EventTimeGrid.svelte';

	/** The view root: the popover's scroll source and focus fallback. */
	let root: HTMLElement | undefined = $state();

	onMount(() => {
		eventCalendarViewStore.initFromSettings();
	});

	// Load on mount, on every index bump and on every projection setting
	// change. The snapshot is memoized per index version, so a settings
	// change re-projects without an IPC.
	$effect(() => {
		void vaultStore.vaultIndexVersion;
		const ready = vaultStore.indexReady;
		const s = settingsStore.eventCalendar;
		void s.defaultDurationMinutes;
		void s.defaultColor;
		void s.eventTypeName;
		void settingsStore.templates.systemFolder;
		if (!ready) return;
		untrack(() => {
			const seq = ++loadSeq;
			const path = vaultStore.path;
			loadEvents().catch((err) => {
				// A load a newer one, a reset or a vault switch replaced is not the
				// user's concern. The service sets loadError only for a current
				// failure, so a null loadError means the service discarded it.
				if (seq !== loadSeq || vaultStore.path !== path) return;
				if (eventCalendarStore.loadError === null) return;
				toast.error('Could not load calendar events', {
					description: err instanceof Error ? err.message : String(err),
				});
			});
		});
	});

	// The mounted view owns the clock; the release is the cleanup.
	$effect(() => untrack(() => acquireCalendarClock()));

	// Unmount (tab switch, "Open note", closing the tab) drops the popover
	// and the dialog so neither comes back at a stale anchor.
	$effect(() => () => eventCalendarViewStore.closeTransient());
</script>

<section bind:this={root} tabindex="-1" class="flex h-full flex-col outline-none" aria-label="Calendar" data-event-calendar>
	<Tooltip.Provider delayDuration={400}>
		<EventCalendarHeader />
		<div class="relative min-h-0 flex-1">
			{#if !vaultStore.indexReady}
				<div class="flex h-full items-center justify-center text-sm text-muted-foreground">Indexing vault...</div>
			{:else if eventCalendarStore.loadError}
				<div class="flex h-full items-center justify-center p-4 text-sm text-destructive" role="alert" data-calendar-load-error>
					Could not load events: {eventCalendarStore.loadError}
				</div>
			{:else if eventCalendarViewStore.view === 'month'}
				<EventMonthGrid />
			{:else}
				{#key eventCalendarViewStore.view}
					<EventTimeGrid days={eventCalendarViewStore.visibleDays} />
				{/key}
			{/if}
		</div>
		<EventCalendarNeedsAttention />
		<EventPopover {root} />
	</Tooltip.Provider>
</section>
