<script lang="ts">
	import Copy from '@lucide/svelte/icons/copy';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { eventWhenLabel } from './event-calendar-view.logic';
	import { deleteEventFromUi, duplicateEventFromUi } from './event-calendar.service';
	import { eventCalendarStore } from './event-calendar.store.svelte';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';

	interface Props {
		/** The Calendar view root: scroll source, and the focus target when the event block is gone. */
		root: HTMLElement | undefined;
	}

	let { root }: Props = $props();

	let content: HTMLElement | null = $state(null);
	/** Path of the event the popover last showed; focus returns to its block on close. */
	let lastPath: string | null = null;
	/** Target of the outside pointer interaction that is closing the popover; focus goes there on close. */
	let outsideTarget: Element | null = null;
	/** Set by Edit: the dialog that replaces the popover takes focus, so the close leaves it alone. */
	let handOffFocus = false;
	/** Set by Duplicate: the copy's block takes focus once it renders, so the close only parks it on the root. */
	let focusCopy = false;

	/** Elements an outside click may land focus on. */
	const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex], [contenteditable="true"]';

	let target = $derived(eventCalendarViewStore.popover);
	let event = $derived(target ? eventCalendarStore.events.find((e) => e.path === target.path) : undefined);
	let open = $derived(target !== null && event !== undefined);
	let timeFormat = $derived(settingsStore.eventCalendar.timeFormat);
	let when = $derived(event ? eventWhenLabel(event, timeFormat) : null);
	let anchor = $derived.by(() => {
		const rect = target?.rect ?? { x: 0, y: 0, width: 0, height: 0 };
		return { getBoundingClientRect: () => DOMRect.fromRect(rect) };
	});

	$effect(() => {
		if (open && target) lastPath = target.path;
	});

	// The event left the snapshot: drop the target so the card and the ring do not
	// come back on their own at the old anchor when the note returns.
	$effect(() => {
		if (target && !event) eventCalendarViewStore.closePopover();
	});

	// Scroll events do not bubble: a capture listener on the root sees the time-grid scroller.
	$effect(() => {
		const el = root;
		if (!open || !el) return;
		const onScroll = (e: Event) => {
			if (content && e.target instanceof Node && content.contains(e.target)) return;
			eventCalendarViewStore.closePopover();
		};
		el.addEventListener('scroll', onScroll, true);
		return () => el.removeEventListener('scroll', onScroll, true);
	});

	/**
	 * A pointerdown on another event retargets the open popover instead of closing it:
	 * bits-ui dismisses 10 ms after pointerdown, which would clear the target a quick click
	 * just set. Any other outside target is remembered so focus can land on it on close.
	 */
	function handleInteractOutside(e: PointerEvent) {
		const t = e.target;
		if (!(t instanceof Element)) return;
		if (root?.contains(t) && t.closest('[data-event-path]')) {
			e.preventDefault();
			return;
		}
		outsideTarget = t;
	}

	function handleOpenChange(next: boolean) {
		if (!next) eventCalendarViewStore.closePopover();
	}

	/**
	 * Moves focus to the control an outside click landed on; otherwise returns it to the
	 * clicked block, or to the root when the block is gone. bits-ui would restore it to an
	 * element that may have unmounted, leaving it on `<body>`.
	 */
	function handleCloseAutoFocus(e: Event) {
		e.preventDefault();
		const outside = outsideTarget;
		outsideTarget = null;
		if (handOffFocus) {
			handOffFocus = false;
			return;
		}
		if (focusCopy) {
			focusCopy = false;
			if (root?.isConnected && !root.contains(document.activeElement)) root.focus();
			return;
		}
		const focusable = outside?.isConnected ? outside.closest<HTMLElement>(FOCUSABLE) : null;
		// A `tabindex="-1"` wrapper inside this view (the root, the header tablist) is not
		// where the user meant focus to go; one outside it (another pane) is.
		const ownWrapper = focusable?.getAttribute('tabindex') === '-1' && root?.contains(focusable);
		if (focusable && !ownWrapper) {
			focusable.focus();
			return;
		}
		const el = root;
		if (!el || !el.isConnected) return;
		const block = lastPath ? el.querySelector<HTMLElement>(`[data-event-path="${CSS.escape(lastPath)}"]`) : null;
		(block ?? el).focus();
	}

	function openNote() {
		if (!event) return;
		const path = event.path;
		eventCalendarViewStore.closePopover();
		openFileInEditor(path);
	}

	/** Replaces the popover with the edit dialog for the same event. */
	function editNote() {
		if (!event) return;
		const path = event.path;
		handOffFocus = true;
		eventCalendarViewStore.closePopover();
		eventCalendarViewStore.openDialog({ mode: 'edit', path });
	}

	/** Closes the popover (focus goes to the root, the block is going away) and deletes the event. */
	function deleteNote() {
		if (!event) return;
		const path = event.path;
		lastPath = null;
		eventCalendarViewStore.closePopover();
		void deleteEventFromUi(path, root);
	}

	/** Closes the popover and duplicates the event; focus moves to the copy once it renders. */
	function duplicateNote() {
		if (!event) return;
		const path = event.path;
		focusCopy = true;
		eventCalendarViewStore.closePopover();
		void duplicateEventFromUi(path, root);
	}
</script>

<svelte:window onresize={() => eventCalendarViewStore.closePopover()} />

<Popover.Root {open} onOpenChange={handleOpenChange}>
	<Popover.Content
		bind:ref={content}
		customAnchor={anchor}
		side="right"
		align="start"
		sideOffset={8}
		collisionPadding={12}
		class="w-[300px] max-w-[calc(100vw-24px)] gap-0 p-0"
		onOpenAutoFocus={(e) => e.preventDefault()}
		onCloseAutoFocus={handleCloseAutoFocus}
		onInteractOutside={handleInteractOutside}
		data-event-popover
	>
		{#if event}
			<div class="flex gap-3 p-4">
				<span class="mt-1 size-3 shrink-0 rounded-[4px]" style="background: var(--event-{event.color}-fg)" data-popover-dot></span>
				<div class="grid min-w-0 flex-1 gap-2">
					<h3 class="text-base leading-5 font-medium break-words" data-popover-title>{event.title}</h3>
					<p class="text-sm text-muted-foreground" data-popover-date>{when?.date}</p>
					<p class="text-sm text-muted-foreground" data-popover-time>{when?.time}</p>
					{#if event.location}
						<p class="flex items-center gap-1.5 text-sm text-muted-foreground" data-popover-location>
							<MapPin class="size-3.5 shrink-0" aria-hidden="true" />
							<span class="truncate">{event.location}</span>
						</p>
					{/if}
					{#if event.snippet}
						<p class="line-clamp-4 text-sm leading-5 break-words" data-popover-snippet>{event.snippet}</p>
					{/if}
				</div>
			</div>
			<div class="flex items-center gap-1 border-t border-border px-2 py-2">
				<Button size="sm" variant="outline" onclick={editNote}>Edit</Button>
				<Button size="sm" onclick={openNote}>Open note</Button>
				<div class="ml-auto flex items-center gap-1">
					<Button size="icon" variant="ghost" class="size-8" aria-label="Duplicate event" title="Duplicate" onclick={duplicateNote} data-duplicate>
						<Copy />
					</Button>
					<Button size="icon" variant="ghost" class="size-8" aria-label="Delete event" title="Delete" onclick={deleteNote} data-delete>
						<Trash2 class="text-destructive" />
					</Button>
				</div>
			</div>
		{/if}
	</Popover.Content>
</Popover.Root>
