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
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import {
		acquireCalendarClock,
		deleteEventFromUi,
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
	import EventTimeGrid from './EventTimeGrid.svelte';

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
			targetInTablist: el?.closest('[role="tablist"]') != null,
			popoverPath: eventCalendarViewStore.selectedEventPath,
			focusedEventPath: el?.closest('[data-event-path]')?.getAttribute('data-event-path') ?? null,
		});
		if (!action) return;
		e.preventDefault();
		switch (action.kind) {
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
				{#key eventCalendarViewStore.view}
					<EventTimeGrid days={eventCalendarViewStore.visibleDays} />
				{/key}
			{/if}
		</div>
		<EventCalendarNeedsAttention />
		<EventPopover {root} />
		<EventDialog {root} />
	</Tooltip.Provider>
</section>
