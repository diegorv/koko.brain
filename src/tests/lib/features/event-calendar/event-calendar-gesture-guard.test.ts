// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

import { GestureGuard } from '#lib/features/event-calendar/event-calendar-gesture-guard.js';
import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';

interface Press {
	pointerId: number;
	label: string;
}

let root: HTMLElement;
let area: HTMLElement;
let inside: HTMLButtonElement;
let outside: HTMLInputElement;
let discarded: Press[];
let ends: number;
let guard: GestureGuard<Press>;
/** Clicks that bubbled to `document`, i.e. were not swallowed. */
let clicks: number;
const onClick = () => clicks++;

function click(el: HTMLElement, detail = 1) {
	el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail }));
}

function key(k: string): KeyboardEvent {
	const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
	document.body.dispatchEvent(e);
	return e;
}

function pointer(type: string, pointerId = 1) {
	document.body.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId }));
}

beforeEach(() => {
	clearLocalStorage();
	eventCalendarViewStore.reset();
	clicks = 0;
	discarded = [];
	ends = 0;
	document.addEventListener('click', onClick);
	root = document.body.appendChild(document.createElement('div'));
	root.setAttribute('data-event-calendar', '');
	area = root.appendChild(document.createElement('div'));
	inside = root.appendChild(document.createElement('button'));
	outside = document.body.appendChild(document.createElement('input'));
	guard = new GestureGuard<Press>({
		area: () => area,
		onDiscard: (g) => discarded.push(g),
		onEnd: () => ends++,
	});
	area.addEventListener('click', guard.clickcapture, true);
});

afterEach(() => {
	guard.reset();
	document.removeEventListener('click', onClick);
	document.body.innerHTML = '';
});

describe('GestureGuard: a live gesture', () => {
	it('holds the gesture and marks it live until it ends', () => {
		guard.begin({ pointerId: 1, label: 'a' });

		expect(guard.gesture).toEqual({ pointerId: 1, label: 'a' });
		expect(eventCalendarViewStore.gestureLive).toBe(true);

		guard.end();

		expect(guard.gesture).toBeNull();
		expect(eventCalendarViewStore.gestureLive).toBe(false);
		expect(discarded).toEqual([]);
	});

	it('owns only events of the live gesture\'s pointer', () => {
		expect(guard.owns(new PointerEvent('pointermove', { pointerId: 1 }))).toBe(false);
		guard.begin({ pointerId: 1, label: 'a' });

		expect(guard.owns(new PointerEvent('pointermove', { pointerId: 1 }))).toBe(true);
		expect(guard.owns(new PointerEvent('pointermove', { pointerId: 2 }))).toBe(false);
	});

	it('a new begin ends the previous gesture first, without discarding it', () => {
		guard.begin({ pointerId: 1, label: 'a' });
		guard.begin({ pointerId: 2, label: 'b' });

		expect(guard.gesture?.label).toBe('b');
		expect(ends).toBe(2);
		expect(discarded).toEqual([]);
		expect(eventCalendarViewStore.gestureLive).toBe(true);
	});

	it('Escape discards it and stops there; other keys pass', () => {
		guard.begin({ pointerId: 1, label: 'a' });
		const reached: string[] = [];
		const onKey = (e: KeyboardEvent) => reached.push(e.key);
		document.addEventListener('keydown', onKey);
		try {
			const s = key('s');
			const esc = key('Escape');

			expect(s.defaultPrevented).toBe(false);
			expect(esc.defaultPrevented).toBe(true);
			expect(reached).toEqual(['s']);
			expect(discarded).toEqual([{ pointerId: 1, label: 'a' }]);
			expect(guard.gesture).toBeNull();
		} finally {
			document.removeEventListener('keydown', onKey);
		}
	});

	it('focus outside the calendar root discards it; focus inside keeps it', () => {
		guard.begin({ pointerId: 1, label: 'a' });

		inside.focus();
		expect(discarded).toEqual([]);

		outside.focus();
		expect(discarded).toEqual([{ pointerId: 1, label: 'a' }]);
		expect(eventCalendarViewStore.gestureLive).toBe(false);
	});

	it('stops listening for keys and focus once it ends', () => {
		guard.begin({ pointerId: 1, label: 'a' });
		guard.end();

		const esc = key('Escape');
		outside.focus();

		expect(esc.defaultPrevented).toBe(false);
		expect(discarded).toEqual([]);
	});
});

describe('GestureGuard: discard', () => {
	it('does nothing when no gesture is live', () => {
		guard.discard(true);
		pointer('pointerup');
		click(area);

		expect(discarded).toEqual([]);
		expect(clicks).toBe(1);
	});

	it('with armOnRelease, the next release arms the swallow for one click', () => {
		guard.begin({ pointerId: 1, label: 'a' });
		guard.discard(true);
		pointer('pointerup');

		click(area);
		click(area);

		expect(clicks).toBe(1);
	});

	it('without armOnRelease, a later release arms nothing', () => {
		guard.begin({ pointerId: 1, label: 'a' });
		guard.discard(false);
		pointer('pointerup');

		click(area);

		expect(discarded).toEqual([{ pointerId: 1, label: 'a' }]);
		expect(clicks).toBe(1);
	});

	it('a press before the awaited release drops the wait for it', () => {
		guard.begin({ pointerId: 1, label: 'a' });
		guard.discard(true);
		pointer('pointerdown', 2);
		pointer('pointerup', 2);

		click(area);

		expect(clicks).toBe(1);
	});
});

describe('GestureGuard: the click swallow', () => {
	it('swallows one pointer click inside the area once armed', () => {
		guard.arm();

		click(area);
		click(area);

		expect(clicks).toBe(1);
	});

	it('never swallows a detail-0 click', () => {
		guard.arm();

		click(area, 0);
		click(area, 1);

		expect(clicks).toBe(1);
	});

	it('a click outside the area disarms it', () => {
		guard.arm();

		click(outside);
		click(area);

		expect(clicks).toBe(2);
	});

	it('a press anywhere disarms it', () => {
		guard.arm();

		pointer('pointerdown', 2);
		click(area);

		expect(clicks).toBe(1);
	});

	it('reset ends the gesture and disarms, removing every window listener it added', () => {
		const add = vi.spyOn(window, 'addEventListener');
		const remove = vi.spyOn(window, 'removeEventListener');
		try {
			guard.begin({ pointerId: 1, label: 'a' });
			guard.arm();

			guard.reset();
			click(area);

			const capture = (options: unknown) => options === true;
			const left = add.mock.calls.filter(
				([type, listener, options]) => !remove.mock.calls.some(([t, l, o]) => t === type && l === listener && capture(o) === capture(options)),
			);
			expect(add.mock.calls.length).toBeGreaterThan(0);
			expect(left).toEqual([]);
			expect(clicks).toBe(1);
			expect(guard.gesture).toBeNull();
		} finally {
			add.mockRestore();
			remove.mockRestore();
		}
	});
});
