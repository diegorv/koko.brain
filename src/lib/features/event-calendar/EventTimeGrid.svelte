<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { formatLong, formatTime, formatTimeRange } from './event-calendar-dates.logic';
	import {
		beginCreate,
		beginMove,
		beginResize,
		createGhost,
		previewDayEvents,
		resolveDrag,
		slotFromPoint,
		updateDrag,
		type EventTiming,
		type Slot,
	} from './event-calendar-drag.logic';
	import { HOUR_HEIGHT, layoutDay, MIN_COLUMN_PX, minutesToPx } from './event-calendar-layout.logic';
	import { groupEventsByDay, nowOffsetMinutes } from './event-calendar-view.logic';
	import { moveEvent, resizeEvent, toastEventError } from './event-calendar.service';
	import { eventCalendarStore } from './event-calendar.store.svelte';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
	import EventAllDayLane from './EventAllDayLane.svelte';
	import EventBlock from './EventBlock.svelte';
	import EventDayHeaders from './EventDayHeaders.svelte';
	import EventTaskLane from './EventTaskLane.svelte';
	import type { PendingEventNote } from './event-calendar-event.logic';
	import type { DragState } from './event-calendar.types';

	interface Props {
		/** Visible day keys: seven (or five) in week view, one in day view. */
		days: string[];
	}

	let { days }: Props = $props();

	/** Width of the time axis, in px (the `--axis` variable). */
	const AXIS_PX = 56;
	/** Hours that get a line and a label: the grid's top and bottom edges get neither. */
	const HOURS = Array.from({ length: 23 }, (_, i) => i + 1);

	let scroller: HTMLDivElement | undefined = $state();
	/** The day-columns body: pointer capture target and the rect the slot math reads. */
	let bodyEl: HTMLDivElement | undefined = $state();

	/** A pointer press in progress on the body. Not reactive: only the handlers read it. */
	interface Gesture {
		/** Pointer that started the gesture. */
		pointerId: number;
		/** Press point, for the drag threshold. */
		x: number;
		/** Press point, for the drag threshold. */
		y: number;
		/** Block pressed at pointerdown; `null` for a create on empty space. */
		block: HTMLElement | null;
	}

	let gesture: Gesture | null = null;
	/**
	 * Set from the release of a mouse or pen gesture (or of a discarded one)
	 * until the click that release produces, so that click does nothing. See `armSwallow`.
	 */
	let swallowClick = false;
	/** Live drag preview; held after a drop until its write settles. */
	let preview = $state.raw<DragState | null>(null);
	/** The event a move or resize drags, as shown at pointerdown. */
	let dragged = $state.raw<PendingEventNote | null>(null);

	let timeFormat = $derived(settingsStore.eventCalendar.timeFormat);
	let events = $derived(eventCalendarStore.events);
	/** Unclipped events by path: a span segment's block names the whole range. */
	let eventsByPath = $derived(new Map(events.map((e) => [e.path, e])));
	let timed = $derived(groupEventsByDay(events, days).timed);
	let baseColumns = $derived(days.map((day) => layoutDay(timed.get(day) ?? [])));
	// During a drag only the source and target columns are laid out again.
	let columns = $derived(
		baseColumns.map((column, i) => {
			const shown = previewDayEvents(preview, dragged, i, days[i], timed.get(days[i]) ?? []);
			return shown ? layoutDay(shown) : column;
		}),
	);
	let ghost = $derived(preview ? createGhost(preview) : null);

	/** Axis label: 12h labels drop `:00` ("9 AM"). */
	function hourLabel(hour: number): string {
		return formatTime(hour * 60, timeFormat).replace(':00 ', ' ');
	}

	// Open on the working day; `{#key view}` in the parent remounts the grid.
	onMount(() => {
		if (scroller) scroller.scrollTop = settingsStore.eventCalendar.dayStartHour * HOUR_HEIGHT;
		return () => {
			endGesture();
			disarmSwallow();
		};
	});

	/** Slot under the pointer; the body rect is read live, so a scroll mid-drag stays correct. */
	function slotAt(e: PointerEvent, body: HTMLElement): Slot {
		return slotFromPoint(body.getBoundingClientRect(), e.clientX, e.clientY, days.length);
	}

	/** Forgets the live gesture and its key and focus listeners. The preview is left to the caller. */
	function endGesture() {
		if (gesture) eventCalendarViewStore.setGestureLive(false);
		gesture = null;
		window.removeEventListener('keydown', handleGestureKeydown, true);
		window.removeEventListener('focusin', handleGestureFocusin, true);
	}

	/** Clears the preview. */
	function clearPreview() {
		preview = null;
		dragged = null;
	}

	/**
	 * Drops the live gesture without doing anything (Escape, `pointercancel`,
	 * lost capture, focus leaving the view, the days changing). With
	 * `armOnRelease` the swallow is armed by the release still to come, since
	 * the button is still down and its release clicks. A cancelled pointer or
	 * lost capture passes `false`: nothing is armed, so no later, unrelated
	 * release or assistive-tech click is eaten. The awaited release can be
	 * lost too (released outside the window), so the next press anywhere
	 * drops the wait for it.
	 */
	function discardGesture(armOnRelease: boolean) {
		const live = gesture;
		if (!live) return;
		endGesture();
		clearPreview();
		disarmSwallow();
		if (armOnRelease) {
			window.addEventListener('pointerup', handleReleaseAfterDiscard, true);
			window.addEventListener('pointerdown', disarmSwallow, true);
		}
		if (bodyEl?.hasPointerCapture?.(live.pointerId)) bodyEl.releasePointerCapture(live.pointerId);
	}

	function handleReleaseAfterDiscard() {
		window.removeEventListener('pointerup', handleReleaseAfterDiscard, true);
		armSwallow();
	}

	/**
	 * Arms the swallow for the click the release just produced. That click may
	 * land outside the body (after a discard the capture is gone), where
	 * `handleClickCapture` never sees it, so a press anywhere, or a click
	 * outside the body, disarms it: a later assistive-tech click (`detail >= 1`,
	 * no press) still acts.
	 */
	function armSwallow() {
		swallowClick = true;
		window.addEventListener('pointerdown', disarmSwallow, true);
		window.addEventListener('click', handleClickOutside, true);
	}

	function disarmSwallow() {
		swallowClick = false;
		window.removeEventListener('pointerdown', disarmSwallow, true);
		window.removeEventListener('click', handleClickOutside, true);
		window.removeEventListener('pointerup', handleReleaseAfterDiscard, true);
	}

	function handleClickOutside(e: MouseEvent) {
		if (!bodyEl || !(e.target instanceof Node) || !bodyEl.contains(e.target)) disarmSwallow();
	}

	/**
	 * While a gesture is live, Escape discards it and goes no further. Every
	 * other key passes, so the app's shortcuts (Cmd+S, Cmd+P, ...) still work;
	 * the view's own shortcuts stay off through `gestureLive`.
	 */
	function handleGestureKeydown(e: KeyboardEvent) {
		if (e.key !== 'Escape') return;
		e.stopPropagation();
		e.preventDefault();
		discardGesture(true);
	}

	/**
	 * Focus landing outside the Calendar view (an overlay such as the command
	 * palette opened mid-press) discards the gesture, so the overlay gets the
	 * first Escape and the release opens nothing behind it. `focusin` on the
	 * window, not `focusout` on the root: focus need not be inside the root
	 * when the press starts. The button is still down, so its release arms the
	 * click swallow, as after Escape.
	 */
	function handleGestureFocusin(e: FocusEvent) {
		const root = bodyEl?.closest('[data-event-calendar]') ?? bodyEl;
		if (root && e.target instanceof Node && !root.contains(e.target)) discardGesture(true);
	}

	/**
	 * Starts a gesture for a primary mouse or pen press: resize on a block's
	 * `[data-resize]` handle, move on a block, create on empty space. Read-only
	 * blocks are skipped, so their click opens the popover as before.
	 */
	function handlePointerDown(e: PointerEvent) {
		disarmSwallow();
		const body = bodyEl;
		if (!body || e.button !== 0 || (e.pointerType !== 'mouse' && e.pointerType !== 'pen')) return;
		const target = e.target instanceof Element ? e.target : null;
		const block = target?.closest<HTMLElement>('[data-event-path]') ?? null;
		if (block?.hasAttribute('data-readonly')) return;
		const slot = slotAt(e, body);
		let drag: DragState;
		let event: PendingEventNote | null = null;
		if (block) {
			event = events.find((ev) => ev.path === block.dataset.eventPath) ?? null;
			if (!event) return;
			drag = target?.closest('[data-resize]') ? beginResize(event, slot) : beginMove(event, slot);
		} else {
			drag = beginCreate(slot, settingsStore.eventCalendar.defaultDurationMinutes);
		}
		endGesture();
		gesture = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, block };
		dragged = event;
		preview = drag;
		body.setPointerCapture?.(e.pointerId);
		eventCalendarViewStore.setGestureLive(true);
		window.addEventListener('keydown', handleGestureKeydown, true);
		window.addEventListener('focusin', handleGestureFocusin, true);
	}

	/** The drag at the pointer, or `null` when `e` is not the live gesture's pointer. */
	function dragAt(e: PointerEvent): DragState | null {
		const body = bodyEl;
		if (!gesture || e.pointerId !== gesture.pointerId || !preview || !body) return null;
		return updateDrag(preview, slotAt(e, body), Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y));
	}

	function handlePointerMove(e: PointerEvent) {
		const current = preview;
		const next = dragAt(e);
		if (!current || !next || next === current) return;
		if (next.moved === current.moved && next.day === current.day && next.start === current.start && next.end === current.end) return;
		// The popover would float at a stale anchor while its block moves.
		if (!current.moved) eventCalendarViewStore.closePopover();
		preview = next;
	}

	/** Ends the gesture: opens the dialog or the popover, or writes the drop once. */
	function handlePointerUp(e: PointerEvent) {
		const drag = dragAt(e);
		const live = gesture;
		if (!drag || !live) return;
		endGesture();
		// Every release, not only a moved one: a plain press opens the dialog or
		// the popover right here, and its click must not act a second time.
		armSwallow();
		const result = resolveDrag(drag, events, days);
		if (result.kind === 'move') {
			preview = drag;
			void commitDrop(drag, result.path, result.timing);
			return;
		}
		clearPreview();
		if (result.kind === 'create') {
			eventCalendarViewStore.openDialog({ mode: 'create', ...result.payload });
		} else if (result.kind === 'popover') {
			const block = live.block?.isConnected
				? live.block
				: bodyEl?.querySelector<HTMLElement>(`[data-event-path="${CSS.escape(result.path)}"]`);
			if (block) eventCalendarViewStore.openPopover(result.path, block.getBoundingClientRect());
		}
	}

	/**
	 * Writes a drop through the service. The preview holds the dropped block in
	 * place until the write settles, so it never snaps back; then the pending
	 * overlay (or, on failure, the rolled-back event) shows. A later gesture's
	 * preview is left alone.
	 */
	async function commitDrop(drag: DragState, path: string, timing: EventTiming) {
		try {
			await (drag.kind === 'resize' ? resizeEvent(path, timing.end) : moveEvent(path, timing));
		} catch (err) {
			toastEventError(err, path);
		} finally {
			if (preview === drag) clearPreview();
		}
	}

	// The preview is keyed by column index: a week step or a weekend/week-start
	// change mid-gesture, or while a drop waits on its write, would show it in the
	// new range. Drop both; a held drop's write still settles on its own.
	let daysKey = $derived(days.join(','));
	$effect(() => {
		void daysKey;
		untrack(() => {
			discardGesture(true);
			clearPreview();
		});
	});

	function handlePointerCancel(e: PointerEvent) {
		if (gesture && e.pointerId === gesture.pointerId) discardGesture(false);
	}

	/**
	 * Swallows the click a mouse or pen gesture produces, so a moved block does
	 * not open its popover. Only a pointer click (`detail > 0`) is swallowed: a
	 * keyboard Enter or Space on a block (`detail === 0`) must still act.
	 */
	function handleClickCapture(e: MouseEvent) {
		if (!swallowClick || e.detail === 0) return;
		disarmSwallow();
		e.stopPropagation();
	}

	// When the week is wider than the pane, keep the selected day in view.
	let didScrollX = false;
	$effect(() => {
		const selected = eventCalendarViewStore.focusedDate;
		const visible = days;
		untrack(() => {
			const el = scroller;
			if (!el || el.scrollWidth <= el.clientWidth) return;
			const index = visible.indexOf(selected);
			if (index < 0) return;
			const col = (el.scrollWidth - AXIS_PX) / visible.length;
			const view = el.clientWidth - AXIS_PX;
			const left = index * col;
			if (left >= el.scrollLeft && left + col <= el.scrollLeft + view) return;
			el.scrollTo({ left: Math.max(0, left - (view - col) / 2), behavior: didScrollX ? 'smooth' : 'auto' });
			didScrollX = true;
		});
	});
</script>

<!-- One scroller for both axes: the header block sticks to the top, the time axis to the left.
	`isolate` keeps the grid's z-10..z-40 layers inside it, so they never paint over app overlays such as Settings (also z-40). -->
<div
	bind:this={scroller}
	class="relative isolate h-full min-h-0 w-full overflow-auto overscroll-x-contain"
	style="--axis: {AXIS_PX}px"
	data-time-grid
>
	<div
		class="relative flex min-w-full flex-col"
		style="min-width: calc(var(--axis) + {days.length} * {MIN_COLUMN_PX}px)"
		data-time-grid-columns
	>
		<div class="sticky top-0 z-40 bg-editor-bg" data-time-grid-header>
			<EventDayHeaders {days} />
			<EventAllDayLane {days} {events} />
			{#if settingsStore.eventCalendar.showTasks}
				<EventTaskLane {days} tasks={eventCalendarStore.tasks} />
			{/if}
			<!-- Masks the hour line and label that sit exactly on the header edge after the mount scroll. -->
			<div class="pointer-events-none absolute inset-x-0 top-full h-2" aria-hidden="true" data-time-grid-mask>
				<div class="absolute inset-x-0 top-0 h-px bg-editor-bg"></div>
				<div class="sticky left-0 h-2 w-(--axis) bg-editor-bg"></div>
			</div>
		</div>

		<div class="relative flex w-full" style="height: {24 * HOUR_HEIGHT}px">
			<div class="pointer-events-none absolute inset-y-0 right-0 left-(--axis)" aria-hidden="true">
				{#each HOURS as h (h)}
					<div class="absolute inset-x-0 h-px bg-border" style="top: {h * HOUR_HEIGHT}px"></div>
				{/each}
			</div>

			<div class="sticky left-0 z-30 h-full w-(--axis) shrink-0 bg-editor-bg select-none" aria-hidden="true" data-time-axis>
				{#each HOURS as h (h)}
					<span
						class="absolute right-2 text-[11px] whitespace-nowrap text-muted-foreground"
						style="top: {h * HOUR_HEIGHT - 7}px">{hourLabel(h)}</span
					>
				{/each}
			</div>

			<div
				bind:this={bodyEl}
				class="relative flex h-full min-w-0 flex-1 select-none"
				role="presentation"
				data-time-grid-body
				onpointerdown={handlePointerDown}
				onpointermove={handlePointerMove}
				onpointerup={handlePointerUp}
				onpointercancel={handlePointerCancel}
				onlostpointercapture={handlePointerCancel}
				onclickcapture={handleClickCapture}
			>
				{#each days as day, i (day)}
					{@const now = nowOffsetMinutes(eventCalendarViewStore.nowMs, day)}
					<div
						class="relative h-full min-w-0 flex-1 border-l border-border"
						role="group"
						aria-label="{formatLong(day)} schedule"
						data-day-column={day}
					>
						{#each columns[i] as placed (placed.event.path)}
							<EventBlock
								event={placed.event as PendingEventNote}
								column={placed.column}
								columns={placed.columns}
								{timeFormat}
								whole={eventsByPath.get(placed.event.path)}
							/>
						{/each}
						{#if ghost && ghost.dayIndex === i}
							<div
								class="pointer-events-none absolute right-1 left-0.5 z-20 overflow-hidden rounded-md border border-primary bg-primary/15 px-2 py-1 text-[11px] text-foreground"
								style="top: {minutesToPx(ghost.start) + 1}px; height: {Math.max(minutesToPx(ghost.end - ghost.start) - 2, 14)}px"
								aria-hidden="true"
								data-create-ghost
							>
								{formatTimeRange(ghost.start, ghost.end, timeFormat)}
							</div>
						{/if}
						{#if now !== null}
							<div
								class="pointer-events-none absolute right-0 left-0 z-20 h-0"
								style="top: {minutesToPx(now)}px"
								aria-hidden="true"
								data-now-line
							>
								<span class="absolute -top-1 -left-1 size-2 rounded-full bg-primary"></span>
								<span class="absolute inset-x-0 -top-px h-[1.5px] bg-primary"></span>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
