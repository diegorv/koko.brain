<script lang="ts" module>
	/**
	 * Bumped per load any mounted view starts, shared across mounts so a
	 * remount supersedes the load an unmounted instance left in flight.
	 */
	let loadSeq = 0;
</script>

<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import {
		acquireCalendarClock,
		deleteEventFromUi,
		loadCalendarTasks,
		loadEvents,
		openNewEventDialog,
		redoEventChangeFromUi,
		undoEventChangeFromUi,
	} from './event-calendar.service';
	import { eventCalendarStore } from './event-calendar.store.svelte';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
	import { isTypingTarget, resolveCalendarKey } from './event-calendar-keys.logic';
	import EventCalendarHeader from './EventCalendarHeader.svelte';
	import EventCalendarNeedsAttention from './EventCalendarNeedsAttention.svelte';
	import EventDialog from './EventDialog.svelte';
	import EventMonthGrid from './EventMonthGrid.svelte';
	import EventPopover from './EventPopover.svelte';
	import EventShortcutsDialog from './EventShortcutsDialog.svelte';
	import EventTimeGrid from './EventTimeGrid.svelte';
	import EventWeekStrip from './EventWeekStrip.svelte';

	/** The view root: the popover's scroll source and the popover's and dialog's focus fallback. */
	let root: HTMLElement | undefined = $state();

	onMount(() => {
		eventCalendarViewStore.initFromSettings();
		root?.focus();
	});

	/**
	 * The view's keyboard shortcuts (`resolveCalendarKey`). Bare keys never go
	 * through `registerKeybinding`, which has no typing guard.
	 */
	function handleKeydown(e: KeyboardEvent) {
		const el = e.target instanceof Element ? e.target : null;
		const action = resolveCalendarKey(e, {
			typing: isTypingTarget(e.target),
			dialogOpen: eventCalendarViewStore.isDialogOpen,
			gestureLive: eventCalendarViewStore.gestureLive,
			targetInTablist: el?.closest('[role="tablist"]') != null,
			popoverPath: eventCalendarViewStore.selectedEventPath,
			focusedEventPath: el?.closest('[data-event-path]')?.getAttribute('data-event-path') ?? null,
		});
		if (!action) return;
		e.preventDefault();
		switch (action.kind) {
			case 'help':
				eventCalendarViewStore.openHelp();
				break;
			case 'today':
				eventCalendarViewStore.goToToday();
				break;
			case 'view':
				eventCalendarViewStore.setView(action.view);
				break;
			case 'step':
				eventCalendarViewStore.step(action.dir);
				break;
			case 'new-event':
				openNewEventDialog();
				break;
			case 'delete':
				// The block is about to go; park focus on the root so keys keep working.
				eventCalendarViewStore.closePopover();
				root?.focus();
				void deleteEventFromUi(action.path, root).then(parkFocusAfterDelete);
				break;
			case 'close-popover':
				eventCalendarViewStore.closePopover();
				break;
			case 'undo':
				void undoEventChangeFromUi(root);
				break;
			case 'redo':
				void redoEventChangeFromUi(root);
				break;
		}
	}

	/**
	 * Focuses the root once a key-driven delete has settled and focus fell to
	 * `<body>`: a popover closed by the delete returns focus to the deleted
	 * block after the root took it, and that block then unmounts. Focus the
	 * user moved elsewhere in the meantime is left alone.
	 */
	async function parkFocusAfterDelete() {
		await tick();
		const active = document.activeElement;
		if (root?.isConnected && (!active || active === document.body)) root.focus();
	}

	// Lost-focus fallback: a key whose target is <body> (focus restored to an
	// editor the tab switch unmounted, an external toast) still reaches the
	// view. Keys inside the root target the root's subtree, never <body>, so
	// no key is handled twice.
	$effect(() => {
		const onDocumentKeydown = (e: KeyboardEvent) => {
			if (e.target === document.body) handleKeydown(e);
		};
		document.addEventListener('keydown', onDocumentKeydown);
		return () => document.removeEventListener('keydown', onDocumentKeydown);
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

	/** How long a focused block keeps `data-event-pulse`: the pulse animation plus slack. */
	const PULSE_MS = 1600;

	// Focus request (`openEventInCalendar`): once the requested block renders,
	// scroll it into view, focus it and pulse it once. Re-runs on every load
	// and navigation, so a block that lands after the first render is still
	// found. Once a current load is in and the block is still absent, the
	// day's overflow control ("+N") stands in for an event it hides, and the
	// request ends either way, so no later load can steal focus with it.
	$effect(() => {
		const request = eventCalendarViewStore.focusRequest;
		void eventCalendarStore.events;
		void eventCalendarStore.isLoading;
		void eventCalendarStore.snapshotVersion;
		void vaultStore.vaultIndexVersion;
		void eventCalendarViewStore.view;
		void eventCalendarViewStore.focusedDate;
		if (!request) return;
		untrack(() => {
			void tick().then(() => {
				if (eventCalendarViewStore.focusRequest?.seq !== request.seq) return;
				let target = root?.querySelector<HTMLElement>(`[data-event-path="${CSS.escape(request.path)}"]`);
				if (!target) {
					const loaded =
						!eventCalendarStore.isLoading && eventCalendarStore.snapshotVersion === vaultStore.vaultIndexVersion;
					if (!loaded) return;
					const day = eventCalendarStore.eventByPath(request.path)?.date;
					target = day
						? root?.querySelector<HTMLElement>(
								`[data-all-day-cell="${day}"] [data-all-day-more], [data-month-cell="${day}"] [data-month-more]`,
							)
						: null;
				}
				eventCalendarViewStore.clearFocusRequest(request.seq);
				if (!target) return;
				target.scrollIntoView?.({ block: 'center', inline: 'nearest' });
				target.focus({ preventScroll: true });
				pulse(target);
			});
		});
	});

	/** Marks `block` with `data-event-pulse` for one pulse animation. */
	function pulse(block: HTMLElement) {
		block.removeAttribute('data-event-pulse');
		// Restart the animation when the same block pulses again.
		void block.offsetWidth;
		block.setAttribute('data-event-pulse', '');
		setTimeout(() => block.removeAttribute('data-event-pulse'), PULSE_MS);
	}

	// Every settings write (a pane drag included) replaces the whole settings
	// object; a separate `$derived` notifies only when the flag changes, so
	// unrelated writes do not refetch the task index.
	let showTasks = $derived(settingsStore.eventCalendar.showTasks);

	// Dated tasks: load on mount, on every index bump and when the overlay is
	// turned on. Off, the store keeps its last tasks and nothing renders them.
	$effect(() => {
		void vaultStore.vaultIndexVersion;
		const ready = vaultStore.indexReady;
		if (!ready || !showTasks) return;
		untrack(() => {
			// The service rejects only for the current load.
			loadCalendarTasks().catch((err) => {
				toast.error('Could not load tasks', {
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

<!-- The keydown is the view-scoped shortcut handler, not a widget interaction. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section
	bind:this={root}
	tabindex="-1"
	class="flex h-full flex-col outline-none"
	aria-label="Calendar"
	data-event-calendar
	onkeydown={handleKeydown}
>
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
				<div class="flex h-full min-h-0 flex-col">
					{#if eventCalendarViewStore.view === 'day'}
						<EventWeekStrip />
					{/if}
					<div class="min-h-0 flex-1">
						{#key eventCalendarViewStore.view}
							<EventTimeGrid days={eventCalendarViewStore.visibleDays} />
						{/key}
					</div>
				</div>
			{/if}
		</div>
		<EventCalendarNeedsAttention />
		<EventPopover {root} />
		<EventDialog {root} />
		<EventShortcutsDialog />
	</Tooltip.Provider>
</section>

<style>
	/* One pulse on the block a focus request landed on (`openEventInCalendar`). */
	:global([data-event-calendar] [data-event-pulse]) {
		animation: event-calendar-pulse 1.4s ease-out 1;
	}

	@keyframes -global-event-calendar-pulse {
		/* A 3px ring: month and all-day cells clip overflow at 4px of padding. */
		0% {
			box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 90%, transparent);
		}
		100% {
			box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 0%, transparent);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global([data-event-calendar] [data-event-pulse]) {
			animation: none;
			outline: 2px solid var(--primary);
		}
	}
</style>
