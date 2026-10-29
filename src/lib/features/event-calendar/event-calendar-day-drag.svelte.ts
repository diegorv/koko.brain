import { beginDayDrag, cellFromPoint, resolveDayDrag, updateDayDrag } from './event-calendar-drag.logic';
import { moveEventToDay, toastEventError } from './event-calendar.service';
import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
import type { DayDragState, EventNote } from './event-calendar.types';

/** What a day-cell surface (the month grid, the all-day lane) tells its drag. */
export interface DayDragOptions {
	/** The element holding the day cells, laid out row by row: the rect the hit test reads. */
	area: () => HTMLElement | undefined;
	/** Visible day keys, one per cell, row by row. */
	days: () => string[];
	/** Rows of cells in the area. */
	rows: number;
	/** Events the surface shows. */
	events: () => EventNote[];
}

/**
 * Pointer drag of an event chip to another day cell. The surface binds
 * `pointerdown` and `clickcapture` on its root and calls `reset` when its
 * days change or it unmounts. Move and release are window listeners, not
 * pointer capture: under capture the click of a plain press would land on
 * the area instead of the chip, whose own `onclick` opens the popover.
 */
export class DayDrag {
	/** Live drag preview; held after a drop until its write settles. */
	preview = $state.raw<DayDragState | null>(null);

	#options: DayDragOptions;
	/** The press in progress. Not reactive: only the handlers read it. */
	#gesture: { pointerId: number; x: number; y: number } | null = null;
	/**
	 * Set from the release of a moved or discarded gesture until the click
	 * that release produces, so that click does nothing. See `#arm`.
	 */
	#swallowClick = false;

	constructor(options: DayDragOptions) {
		this.#options = options;
	}

	/** Starts a gesture for a primary mouse or pen press on a writable chip. */
	pointerdown = (e: PointerEvent): void => {
		this.#disarm();
		if (e.button !== 0 || (e.pointerType !== 'mouse' && e.pointerType !== 'pen')) return;
		const chip = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-event-path]') : null;
		if (!chip || chip.hasAttribute('data-readonly')) return;
		const area = this.#options.area();
		const event = this.#options.events().find((ev) => ev.path === chip.dataset.eventPath);
		if (!area || !event || event.readOnly) return;
		this.#endGesture();
		this.#gesture = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
		this.preview = beginDayDrag(event, this.#cellAt(e, area));
		window.addEventListener('pointermove', this.#pointermove);
		window.addEventListener('pointerup', this.#pointerup);
		window.addEventListener('pointercancel', this.#pointercancel);
		eventCalendarViewStore.setGestureLive(true);
		window.addEventListener('keydown', this.#keydown, true);
		window.addEventListener('focusin', this.#focusin, true);
	};

	/**
	 * Swallows the click a moved or discarded gesture produces, so a dropped
	 * chip does not open its popover. Only a pointer click (`detail > 0`) is
	 * swallowed: a keyboard Enter or Space on a chip or day button
	 * (`detail === 0`) must still act.
	 */
	clickcapture = (e: MouseEvent): void => {
		if (!this.#swallowClick || e.detail === 0) return;
		this.#disarm();
		e.stopPropagation();
	};

	/** Drops the live gesture and any held preview (the days changed, or the surface unmounts). */
	reset = (): void => {
		this.#endGesture();
		this.#disarm();
		this.preview = null;
	};

	/** Cell under the pointer; the area rect is read live, so a scroll mid-drag stays correct. */
	#cellAt(e: PointerEvent, area: HTMLElement): number {
		const days = this.#options.days().length;
		const rows = this.#options.rows;
		return cellFromPoint(area.getBoundingClientRect(), e.clientX, e.clientY, Math.max(1, Math.ceil(days / rows)), rows);
	}

	/** The drag at the pointer, or `null` when `e` is not the live gesture's pointer. */
	#dragAt(e: PointerEvent): DayDragState | null {
		const area = this.#options.area();
		if (!this.#gesture || e.pointerId !== this.#gesture.pointerId || !this.preview || !area) return null;
		return updateDayDrag(this.preview, this.#cellAt(e, area), Math.hypot(e.clientX - this.#gesture.x, e.clientY - this.#gesture.y));
	}

	/** Forgets the live gesture and its listeners. The preview is left to the caller. */
	#endGesture(): void {
		if (this.#gesture) eventCalendarViewStore.setGestureLive(false);
		this.#gesture = null;
		window.removeEventListener('pointermove', this.#pointermove);
		window.removeEventListener('pointerup', this.#pointerup);
		window.removeEventListener('pointercancel', this.#pointercancel);
		window.removeEventListener('keydown', this.#keydown, true);
		window.removeEventListener('focusin', this.#focusin, true);
	}

	/**
	 * Drops the live gesture without doing anything (Escape, `pointercancel`,
	 * focus leaving the view). With `armOnRelease` (Escape, focus) the swallow
	 * is armed by the release still to come, since the button is still down
	 * and its release clicks. A cancelled pointer sends no `pointerup`, so it
	 * passes `false`: nothing is armed and no later, unrelated release can arm
	 * it.
	 */
	#discard(armOnRelease: boolean): void {
		if (!this.#gesture) return;
		this.#endGesture();
		this.preview = null;
		this.#disarm();
		if (armOnRelease) window.addEventListener('pointerup', this.#releaseAfterDiscard, true);
	}

	#releaseAfterDiscard = (): void => {
		window.removeEventListener('pointerup', this.#releaseAfterDiscard, true);
		this.#arm();
	};

	/**
	 * Arms the swallow for the click the release just produced. That click may
	 * land outside the area (a drop past its edge), where `clickcapture` never
	 * sees it, so a press anywhere, or a click outside the area, disarms it:
	 * a later assistive-tech click (`detail >= 1`, no press) still acts.
	 */
	#arm(): void {
		this.#swallowClick = true;
		window.addEventListener('pointerdown', this.#disarm, true);
		window.addEventListener('click', this.#clickOutside, true);
	}

	#disarm = (): void => {
		this.#swallowClick = false;
		window.removeEventListener('pointerdown', this.#disarm, true);
		window.removeEventListener('click', this.#clickOutside, true);
		window.removeEventListener('pointerup', this.#releaseAfterDiscard, true);
	};

	#clickOutside = (e: MouseEvent): void => {
		const area = this.#options.area();
		if (!area || !(e.target instanceof Node) || !area.contains(e.target)) this.#disarm();
	};

	#pointermove = (e: PointerEvent): void => {
		const current = this.preview;
		const next = this.#dragAt(e);
		if (!current || !next || next === current) return;
		if (next.moved === current.moved && next.day === current.day) return;
		// The popover would float at a stale anchor while its chip moves.
		if (!current.moved) eventCalendarViewStore.closePopover();
		this.preview = next;
	};

	/** Ends the gesture: writes the drop once, or leaves a plain press to the chip's click. */
	#pointerup = (e: PointerEvent): void => {
		const drag = this.#dragAt(e);
		if (!drag) return;
		this.#endGesture();
		if (drag.moved) this.#arm();
		const result = resolveDayDrag(drag, this.#options.events(), this.#options.days());
		if (result.kind === 'none') {
			this.preview = null;
			return;
		}
		this.preview = drag;
		void this.#commit(drag, result.path, result.date);
	};

	#pointercancel = (e: PointerEvent): void => {
		if (this.#gesture && e.pointerId === this.#gesture.pointerId) this.#discard(false);
	};

	/**
	 * While a gesture is live, Escape discards it and goes no further; every
	 * other key passes to the app, as in the time grid.
	 */
	#keydown = (e: KeyboardEvent): void => {
		if (e.key !== 'Escape') return;
		e.stopPropagation();
		e.preventDefault();
		this.#discard(true);
	};

	/**
	 * Focus landing outside the Calendar view (an overlay such as the command
	 * palette opened mid-press) discards the gesture, so the overlay gets the
	 * first Escape and the release opens nothing behind it. `focusin` on the
	 * window, not `focusout` on the root: focus need not be inside the root
	 * when the press starts. The button is still down, so its release arms the
	 * click swallow, as after Escape.
	 */
	#focusin = (e: FocusEvent): void => {
		const area = this.#options.area();
		const root = area?.closest('[data-event-calendar]') ?? area;
		if (root && e.target instanceof Node && !root.contains(e.target)) this.#discard(true);
	};

	/**
	 * Writes a drop through the service. The preview holds the chip in its
	 * new cell until the write settles, so it never snaps back; then the
	 * pending overlay (or, on failure, the rolled-back event) shows. A later
	 * gesture's preview is left alone.
	 */
	async #commit(drag: DayDragState, path: string, date: string): Promise<void> {
		try {
			await moveEventToDay(path, date);
		} catch (err) {
			toastEventError(err, path);
		} finally {
			if (this.preview === drag) this.preview = null;
		}
	}
}
