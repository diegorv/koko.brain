import { eventCalendarViewStore } from './event-calendar-view.store.svelte';

/** What a gesture surface (the time grid, a day-cell drag) tells its guard. */
export interface GestureGuardOptions<G> {
	/** The surface's pointer area: a click outside it disarms the swallow, its `[data-event-calendar]` ancestor bounds focus. */
	area: () => HTMLElement | undefined;
	/** Runs after the guard drops a live gesture without acting on it: clear the preview, release capture. */
	onDiscard: (gesture: G) => void;
	/** Runs every time the guard forgets the gesture (end, discard, reset, a new `begin`): drop the surface's own move and release listeners. */
	onEnd?: () => void;
}

/**
 * The lifecycle every Calendar pointer gesture shares: the gesture is live
 * from `begin` to `end`; while live, Escape and focus leaving the Calendar
 * discard it, and every other key passes to the app. After a release the
 * surface may `arm` a swallow for the click that release produces.
 *
 * The surface owns its move and release wiring (element handlers and pointer
 * capture, or window listeners) and decides when to arm: the time grid on
 * every release, a day-cell drag only after a moved one. Its `pointerdown`
 * calls `disarm` first, and binds `clickcapture` on its area in the capture
 * phase.
 */
export class GestureGuard<G extends { pointerId: number }> {
	#options: GestureGuardOptions<G>;
	/** The press in progress. Not reactive: only the handlers read it. */
	#gesture: G | null = null;
	/**
	 * Set from an armed release until the click that release produces, so
	 * that click does nothing. See `arm`.
	 */
	#swallowClick = false;

	constructor(options: GestureGuardOptions<G>) {
		this.#options = options;
	}

	/** The live gesture, or `null`. */
	get gesture(): G | null {
		return this.#gesture;
	}

	/** Whether `e` comes from the live gesture's pointer. */
	owns(e: PointerEvent): boolean {
		return this.#gesture !== null && e.pointerId === this.#gesture.pointerId;
	}

	/** Makes `gesture` the live one, ending any previous gesture first. */
	begin(gesture: G): void {
		this.end();
		this.#gesture = gesture;
		eventCalendarViewStore.setGestureLive(true);
		window.addEventListener('keydown', this.#keydown, true);
		window.addEventListener('focusin', this.#focusin, true);
	}

	/** Forgets the live gesture and its key and focus listeners. The preview is left to the surface. */
	end(): void {
		if (this.#gesture) eventCalendarViewStore.setGestureLive(false);
		this.#gesture = null;
		window.removeEventListener('keydown', this.#keydown, true);
		window.removeEventListener('focusin', this.#focusin, true);
		this.#options.onEnd?.();
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
	discard(armOnRelease: boolean): void {
		const live = this.#gesture;
		if (!live) return;
		this.end();
		this.disarm();
		if (armOnRelease) {
			window.addEventListener('pointerup', this.#releaseAfterDiscard, true);
			window.addEventListener('pointerdown', this.disarm, true);
		}
		this.#options.onDiscard(live);
	}

	/**
	 * Arms the swallow for the click the release just produced. That click may
	 * land outside the area (a drop past its edge, or after a discard the
	 * capture is gone), where `clickcapture` never sees it, so a press
	 * anywhere, or a click outside the area, disarms it: a later
	 * assistive-tech click (`detail >= 1`, no press) still acts.
	 */
	arm(): void {
		this.#swallowClick = true;
		window.addEventListener('pointerdown', this.disarm, true);
		window.addEventListener('click', this.#clickOutside, true);
	}

	/** Drops an armed swallow, or the wait for a discarded gesture's release. */
	disarm = (): void => {
		this.#swallowClick = false;
		window.removeEventListener('pointerdown', this.disarm, true);
		window.removeEventListener('click', this.#clickOutside, true);
		window.removeEventListener('pointerup', this.#releaseAfterDiscard, true);
	};

	/**
	 * Swallows the click an armed release produces. Only a pointer click
	 * (`detail > 0`) is swallowed: a keyboard Enter or Space (`detail === 0`)
	 * must still act.
	 */
	clickcapture = (e: MouseEvent): void => {
		if (!this.#swallowClick || e.detail === 0) return;
		this.disarm();
		e.stopPropagation();
	};

	/** Ends the live gesture and disarms (the surface unmounts or its range changes). */
	reset(): void {
		this.end();
		this.disarm();
	}

	#releaseAfterDiscard = (): void => {
		window.removeEventListener('pointerup', this.#releaseAfterDiscard, true);
		this.arm();
	};

	#clickOutside = (e: MouseEvent): void => {
		const area = this.#options.area();
		if (!area || !(e.target instanceof Node) || !area.contains(e.target)) this.disarm();
	};

	/**
	 * While a gesture is live, Escape discards it and goes no further. Every
	 * other key passes, so the app's shortcuts (Cmd+S, Cmd+P, ...) still work;
	 * the view's own shortcuts stay off through `gestureLive`.
	 */
	#keydown = (e: KeyboardEvent): void => {
		if (e.key !== 'Escape') return;
		e.stopPropagation();
		e.preventDefault();
		this.discard(true);
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
		if (root && e.target instanceof Node && !root.contains(e.target)) this.discard(true);
	};
}
