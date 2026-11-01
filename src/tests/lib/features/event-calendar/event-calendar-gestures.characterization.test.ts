// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));

// A drop's write is the service's side effect; the writers never settle, so a
// drop's preview stays held for the whole test.
vi.mock('#lib/features/event-calendar/event-calendar.service.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/features/event-calendar/event-calendar.service.js')>()),
	moveEvent: vi.fn(() => new Promise<void>(() => {})),
	resizeEvent: vi.fn(() => new Promise<void>(() => {})),
	moveEventToDay: vi.fn(() => new Promise<void>(() => {})),
	toastEventError: vi.fn(),
}));

import { flushSync, mount, unmount } from 'svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import EventTimeGrid from '#lib/features/event-calendar/EventTimeGrid.svelte';
import { DayDrag } from '#lib/features/event-calendar/event-calendar-day-drag.svelte.js';
import { weekDays } from '#lib/features/event-calendar/event-calendar-dates.logic.js';
import { moveEvent, moveEventToDay, resizeEvent } from '#lib/features/event-calendar/event-calendar.service.js';
import { eventCalendarStore } from '#lib/features/event-calendar/event-calendar.store.svelte.js';
import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
import type { EventNote } from '#lib/features/event-calendar/event-calendar.types.js';

/**
 * The gesture guard's contract, run against both surfaces that use it: the time
 * grid (element handlers and pointer capture) and DayDrag (window listeners).
 */

const PATH = '/vault/Events/Standup.md';
/** Monday-first week of 2026-11-09. */
const WEEK = weekDays('2026-11-10', 1);

const STANDUP: EventNote = {
	path: PATH,
	title: 'Standup',
	date: '2026-11-10',
	start: 540,
	end: 600,
	allDay: false,
	color: 'blue',
	location: '',
	snippet: '',
	readOnly: false,
};

function rect(width: number, height: number): () => DOMRect {
	return () => ({ left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
}

function pointer(el: EventTarget, type: string, clientX: number, clientY: number, pointerId = 1) {
	el.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerType: 'mouse', pointerId, clientX, clientY }));
	flushSync();
}

/** One surface the guard runs on, driven through its real event wiring. */
interface Surface {
	name: string;
	/** Mounts the surface inside `root` (a `[data-event-calendar]` element). */
	setup(root: HTMLElement): void;
	teardown(): void;
	/** The pressed element, looked up again each time: a held drop may re-render it. */
	chip(): HTMLElement;
	/** Presses the chip and drags it past the threshold. */
	pressAndMove(): void;
	/** Releases the gesture's pointer. */
	release(): void;
	/** Sends `pointercancel` for the gesture's pointer. */
	cancel(): void;
	/** Writes the surface sent. */
	writes(): number;
}

function timeGrid(): Surface {
	let component: Record<string, unknown> | null = null;
	let root!: HTMLElement;
	const body = () => root.querySelector<HTMLElement>('[data-time-grid-body]')!;
	return {
		name: 'EventTimeGrid',
		setup(r) {
			root = r;
			eventCalendarStore.setSnapshot({ events: [STANDUP], issues: [], archivedCount: 0 }, 1);
			component = mount(EventTimeGrid, { target: root, props: { days: WEEK } });
			flushSync();
			body().getBoundingClientRect = rect(700, 1440);
		},
		teardown() {
			if (component) unmount(component);
			component = null;
		},
		chip: () => root.querySelector<HTMLElement>(`[data-event-path="${PATH}"]`)!,
		pressAndMove() {
			// 09:10 on Nov 10 (the second 100 px column), then a day right and down.
			pointer(this.chip(), 'pointerdown', 150, 586);
			pointer(body(), 'pointermove', 250, 696);
		},
		release: () => pointer(body(), 'pointerup', 250, 696),
		cancel: () => pointer(body(), 'pointercancel', 250, 696),
		writes: () => vi.mocked(moveEvent).mock.calls.length + vi.mocked(resizeEvent).mock.calls.length,
	};
}

function dayDrag(): Surface {
	let drag: DayDrag | null = null;
	let area!: HTMLElement;
	return {
		name: 'DayDrag',
		setup(root) {
			area = root.appendChild(document.createElement('div'));
			area.getBoundingClientRect = rect(700, 100);
			const chip = area.appendChild(document.createElement('button'));
			chip.dataset.eventPath = PATH;
			drag = new DayDrag({ area: () => area, days: () => WEEK, rows: 1, events: () => [STANDUP] });
			area.addEventListener('pointerdown', drag.pointerdown);
			area.addEventListener('click', drag.clickcapture, true);
		},
		teardown() {
			drag?.reset();
			drag = null;
		},
		chip: () => area.querySelector<HTMLElement>(`[data-event-path="${PATH}"]`)!,
		pressAndMove() {
			// Cell 1 (Nov 10), then two cells right.
			pointer(this.chip(), 'pointerdown', 150, 50);
			pointer(window, 'pointermove', 350, 50);
		},
		release: () => pointer(window, 'pointerup', 350, 50),
		cancel: () => pointer(window, 'pointercancel', 350, 50),
		writes: () => vi.mocked(moveEventToDay).mock.calls.length,
	};
}

describe.each([
	{ name: 'EventTimeGrid', make: timeGrid },
	{ name: 'DayDrag', make: dayDrag },
])('gesture guard contract: $name', ({ make }) => {
	let surface: Surface;
	let root: HTMLElement;
	/** Clicks that bubbled to `document`, i.e. were not swallowed. */
	let clicks: number;
	/** Keys that reached a bubbling listener on `document` (where the app's shortcuts sit). */
	let keys: string[];
	const onClick = () => clicks++;
	const onKey = (e: KeyboardEvent) => keys.push(e.key);

	/** `detail: 1` is a pointer click (or an assistive-tech one with no press); `detail: 0` a keyboard one. */
	function click(detail: number) {
		surface.chip().dispatchEvent(new MouseEvent('click', { bubbles: true, detail }));
		flushSync();
	}

	function key(k: string, mods: KeyboardEventInit = {}): KeyboardEvent {
		const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...mods });
		document.body.dispatchEvent(e);
		flushSync();
		return e;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		settingsStore.reset();
		eventCalendarStore.reset();
		eventCalendarViewStore.reset();
		eventCalendarViewStore.setDate('2026-11-10');
		clicks = 0;
		keys = [];
		document.addEventListener('click', onClick);
		document.addEventListener('keydown', onKey);
		root = document.body.appendChild(document.createElement('div'));
		root.setAttribute('data-event-calendar', '');
		surface = make();
		surface.setup(root);
	});

	afterEach(() => {
		surface.teardown();
		document.removeEventListener('click', onClick);
		document.removeEventListener('keydown', onKey);
		document.body.innerHTML = '';
	});

	it('an Escape discard swallows only the click of its own release', () => {
		surface.pressAndMove();
		const esc = key('Escape');
		surface.release();

		click(1);
		const afterOwnClick = clicks;
		click(1);

		expect(esc.defaultPrevented).toBe(true);
		expect(afterOwnClick).toBe(0);
		expect(clicks).toBe(1);
		expect(surface.writes()).toBe(0);
	});

	it('a pointercancel arms nothing: a later unrelated release and click act', () => {
		surface.pressAndMove();
		surface.cancel();
		pointer(document.body, 'pointerup', 0, 0);

		click(1);

		expect(eventCalendarViewStore.gestureLive).toBe(false);
		expect(clicks).toBe(1);
		expect(surface.writes()).toBe(0);
	});

	it('a release lost after an Escape discard does not let a later press and release elsewhere arm the swallow', () => {
		surface.pressAndMove();
		key('Escape');
		pointer(document.body, 'pointerdown', 0, 0, 2);
		pointer(document.body, 'pointerup', 0, 0, 2);

		click(1);

		expect(clicks).toBe(1);
	});

	it('never swallows a click with detail 0, even while the swallow is armed', () => {
		surface.pressAndMove();
		surface.release();

		click(0);
		const keyboardReached = clicks;
		click(1);

		expect(keyboardReached).toBe(1);
		expect(clicks).toBe(1);
		expect(surface.writes()).toBe(1);
	});

	it('focus leaving the calendar mid-gesture discards it: Escape passes, the release writes nothing and its click is swallowed', () => {
		const outside = document.body.appendChild(document.createElement('input'));
		surface.pressAndMove();

		outside.focus();
		flushSync();
		const liveAfterFocus = eventCalendarViewStore.gestureLive;
		const esc = key('Escape');
		surface.release();
		click(1);

		expect(liveAfterFocus).toBe(false);
		expect(esc.defaultPrevented).toBe(false);
		expect(keys).toEqual(['Escape']);
		expect(surface.writes()).toBe(0);
		expect(clicks).toBe(0);
	});

	it('focus moving within the calendar keeps the gesture', () => {
		const inside = root.appendChild(document.createElement('button'));
		surface.pressAndMove();

		inside.focus();
		flushSync();

		expect(eventCalendarViewStore.gestureLive).toBe(true);
	});

	it('lets app shortcuts pass through a live gesture', () => {
		surface.pressAndMove();

		const save = key('s', { metaKey: true });
		key('p', { metaKey: true });
		key('d');

		expect(keys).toEqual(['s', 'p', 'd']);
		expect(save.defaultPrevented).toBe(false);
		expect(eventCalendarViewStore.gestureLive).toBe(true);
	});
});
