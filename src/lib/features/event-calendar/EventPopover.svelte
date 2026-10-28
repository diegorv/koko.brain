<script lang="ts">
	import MapPin from '@lucide/svelte/icons/map-pin';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { formatDuration, formatLong, formatTimeRange, formatWeekday } from './event-calendar-dates.logic';
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

	let target = $derived(eventCalendarViewStore.popover);
	let event = $derived(target ? eventCalendarStore.events.find((e) => e.path === target.path) : undefined);
	let open = $derived(target !== null && event !== undefined);
	let timeFormat = $derived(settingsStore.eventCalendar.timeFormat);
	let anchor = $derived.by(() => {
		const rect = target?.rect ?? { x: 0, y: 0, width: 0, height: 0 };
		return { getBoundingClientRect: () => DOMRect.fromRect(rect) };
	});

	$effect(() => {
		if (open && target) lastPath = target.path;
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

	function handleOpenChange(next: boolean) {
		if (!next) eventCalendarViewStore.closePopover();
	}

	/**
	 * Returns focus to the clicked block, or to the root when the block is gone.
	 * bits-ui would restore it to an element that may have unmounted, leaving it on `<body>`.
	 */
	function handleCloseAutoFocus(e: Event) {
		e.preventDefault();
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
		data-event-popover
	>
		{#if event}
			<div class="flex gap-3 p-4">
				<span class="mt-1 size-3 shrink-0 rounded-[4px]" style="background: var(--event-{event.color}-fg)" data-popover-dot></span>
				<div class="grid min-w-0 flex-1 gap-2">
					<h3 class="text-base leading-5 font-medium break-words" data-popover-title>{event.title}</h3>
					<p class="text-sm text-muted-foreground" data-popover-date>{formatWeekday(event.date)}, {formatLong(event.date)}</p>
					<p class="text-sm text-muted-foreground" data-popover-time>
						{event.allDay
							? 'All day'
							: `${formatTimeRange(event.start, event.end, timeFormat)} · ${formatDuration(event.end - event.start)}`}
					</p>
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
				<Button size="sm" onclick={openNote}>Open note</Button>
			</div>
		{/if}
	</Popover.Content>
</Popover.Root>
