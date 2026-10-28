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

/** Keys that only modify a press; they pass through a live gesture. */
const MODIFIER_KEYS = new Set(['Shift', 'Meta', 'Control', 'Alt']);

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
	/** Set when a gesture moved or was discarded, so the click that follows it does nothing. */
	#swallowClick = false;

	constructor(options: DayDragOptions) {
		this.#options = options;
	}

	/** Starts a gesture for a primary mouse or pen press on a writable chip. */
	pointerdown = (e: PointerEvent): void => {
		this.#swallowClick = false;
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
		window.addEventListener('keydown', this.#keydown, true);
	};

	/**
	 * Swallows the click a moved or discarded gesture produces, so a dropped
	 * chip does not open its popover. Only a pointer click (`detail > 0`) is
	 * swallowed: a release outside the area sends its click elsewhere and
	 * leaves the flag armed, and a keyboard Enter or Space on a chip or day
	 * button (`detail === 0`) must still act. The next press in the area
	 * resets the flag.
	 */
	clickcapture = (e: MouseEvent): void => {
		if (!this.#swallowClick || e.detail === 0) return;
		this.#swallowClick = false;
		e.stopPropagation();
	};

	/** Drops the live gesture and any held preview (the days changed, or the surface unmounts). */
	reset = (): void => {
		this.#endGesture();
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
		this.#gesture = null;
		window.removeEventListener('pointermove', this.#pointermove);
		window.removeEventListener('pointerup', this.#pointerup);
		window.removeEventListener('pointercancel', this.#pointercancel);
		window.removeEventListener('keydown', this.#keydown, true);
	}

	/** Drops the live gesture without doing anything (Escape, `pointercancel`). */
	#discard(): void {
		if (!this.#gesture) return;
		this.#endGesture();
		this.preview = null;
		this.#swallowClick = true;
	}

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
		this.#swallowClick = drag.moved;
		const result = resolveDayDrag(drag, this.#options.events(), this.#options.days());
		if (result.kind === 'none') {
			this.preview = null;
			return;
		}
		this.preview = drag;
		void this.#commit(drag, result.path, result.date);
	};

	#pointercancel = (e: PointerEvent): void => {
		if (this.#gesture && e.pointerId === this.#gesture.pointerId) this.#discard();
	};

	/**
	 * While a gesture is live, Escape discards it and every other non-modifier
	 * key is kept from the view's shortcuts, as in the time grid.
	 */
	#keydown = (e: KeyboardEvent): void => {
		if (MODIFIER_KEYS.has(e.key)) return;
		e.stopPropagation();
		if (e.key !== 'Escape') return;
		e.preventDefault();
		this.#discard();
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
