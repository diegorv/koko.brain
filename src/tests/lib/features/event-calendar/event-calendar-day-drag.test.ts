// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// The note write is the service's side effect; the tests drive its promise.
vi.mock('#lib/features/event-calendar/event-calendar.service.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/features/event-calendar/event-calendar.service.js')>()),
	moveEventToDay: vi.fn(async () => {}),
	toastEventError: vi.fn(),
}));

import { DayDrag } from '#lib/features/event-calendar/event-calendar-day-drag.svelte.js';
import { weekDays } from '#lib/features/event-calendar/event-calendar-dates.logic.js';
import { moveEventToDay, toastEventError } from '#lib/features/event-calendar/event-calendar.service.js';
import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
import type { EventNote } from '#lib/features/event-calendar/event-calendar.types.js';

const P = (name: string) => `/vault/Events/${name}.md`;
/** Monday-first week of 2026-11-09: Nov 10 is cell 1. */
const WEEK = weekDays('2026-11-10', 1);

function event(overrides: Partial<EventNote> & Pick<EventNote, 'path' | 'title' | 'date'>): EventNote {
	return { start: 540, end: 600, allDay: false, color: 'blue', location: '', snippet: '', readOnly: false, ...overrides };
}

let area: HTMLElement;
let events: EventNote[];
let drag: DayDrag;
/** Clicks that bubbled to `document`, i.e. were not swallowed. */
let clicks: number;
const onClick = () => clicks++;

/** A one-row lane of seven 100 px cells; a cell's center is (100 * index + 50, 50). */
const at = (index: number) => ({ clientX: index * 100 + 50, clientY: 50 });

function chip(name: string, attrs: Record<string, string> = {}): HTMLElement {
	const el = area.appendChild(document.createElement('button'));
	el.dataset.eventPath = P(name);
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
	return el;
}

function down(el: HTMLElement, index: number, init: PointerEventInit = {}) {
	el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse', pointerId: 1, ...at(index), ...init }));
}

function win(type: 'pointermove' | 'pointerup' | 'pointercancel', index: number, pointerId = 1) {
	window.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerType: 'mouse', pointerId, ...at(index) }));
}

function pointerClick(el: HTMLElement) {
	el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
}

beforeEach(() => {
	vi.clearAllMocks();
	clearLocalStorage();
	eventCalendarViewStore.reset();
	clicks = 0;
	document.addEventListener('click', onClick);
	area = document.body.appendChild(document.createElement('div'));
	area.getBoundingClientRect = () => ({ left: 0, top: 0, width: 700, height: 100, right: 700, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
	events = [event({ path: P('Standup'), title: 'Standup', date: '2026-11-10' })];
	drag = new DayDrag({ area: () => area, days: () => WEEK, rows: 1, events: () => events });
	area.addEventListener('pointerdown', drag.pointerdown);
	area.addEventListener('click', drag.clickcapture, true);
});

afterEach(() => {
	drag.reset();
	document.removeEventListener('click', onClick);
	document.body.innerHTML = '';
});

describe('DayDrag: starting a gesture', () => {
	it('starts on a primary mouse press on a writable chip, with a preview at the pressed cell', () => {
		down(chip('Standup'), 1);

		expect(drag.preview).toEqual({ path: P('Standup'), originDay: 1, day: 1, moved: false });
		expect(eventCalendarViewStore.gestureLive).toBe(true);
	});

	it.each([
		['a read-only chip', () => down(chip('Standup', { 'data-readonly': '' }), 1)],
		['a secondary button', () => down(chip('Standup'), 1, { button: 2 })],
		['a touch press', () => down(chip('Standup'), 1, { pointerType: 'touch' })],
		['a press on empty space', () => down(area, 1)],
		['a chip with no event', () => down(chip('Gone'), 1)],
	])('ignores %s', (_label, press) => {
		press();

		expect(drag.preview).toBeNull();
		expect(eventCalendarViewStore.gestureLive).toBe(false);
	});

	it('ignores a chip whose event is read-only', () => {
		events = [event({ path: P('Standup'), title: 'Standup', date: '2026-11-10', readOnly: true })];
		down(chip('Standup'), 1);

		expect(drag.preview).toBeNull();
	});
});

describe('DayDrag: moving and dropping', () => {
	it('follows the pointer once past the threshold and closes an open popover', () => {
		eventCalendarViewStore.openPopover(P('Standup'), { x: 0, y: 0, width: 0, height: 0 } as DOMRect);
		down(chip('Standup'), 1);
		win('pointermove', 3);

		expect(drag.preview).toEqual({ path: P('Standup'), originDay: 1, day: 3, moved: true });
		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('ignores moves of another pointer', () => {
		down(chip('Standup'), 1);
		win('pointermove', 3, 2);

		expect(drag.preview?.moved).toBe(false);
	});

	it('writes the drop once, holds the preview until the write settles, and swallows the drop click', async () => {
		let settle!: () => void;
		vi.mocked(moveEventToDay).mockReturnValue(new Promise<void>((resolve) => (settle = resolve)));
		const el = chip('Standup');
		down(el, 1);
		win('pointermove', 3);
		win('pointerup', 3);
		pointerClick(el);

		expect(moveEventToDay).toHaveBeenCalledTimes(1);
		expect(moveEventToDay).toHaveBeenCalledWith(P('Standup'), WEEK[3]);
		expect(drag.preview?.day).toBe(3);
		expect(eventCalendarViewStore.gestureLive).toBe(false);
		expect(clicks).toBe(0);

		settle();
		await Promise.resolve();
		await Promise.resolve();
		expect(drag.preview).toBeNull();
	});

	it('leaves a press under the threshold to the chip click: nothing is written or swallowed', () => {
		const el = chip('Standup');
		down(el, 1);
		win('pointerup', 1);
		pointerClick(el);

		expect(moveEventToDay).not.toHaveBeenCalled();
		expect(drag.preview).toBeNull();
		expect(clicks).toBe(1);
	});

	it('writes nothing for a drop back on the origin cell, but still swallows its click', () => {
		const el = chip('Standup');
		down(el, 1);
		win('pointermove', 3);
		win('pointermove', 1);
		win('pointerup', 1);
		pointerClick(el);

		expect(moveEventToDay).not.toHaveBeenCalled();
		expect(drag.preview).toBeNull();
		expect(clicks).toBe(0);
	});

	it('toasts a failed write and drops the held preview', async () => {
		const err = new Error('disk full');
		vi.mocked(moveEventToDay).mockRejectedValue(err);
		down(chip('Standup'), 1);
		win('pointermove', 3);
		win('pointerup', 3);

		await Promise.resolve();
		await Promise.resolve();

		expect(toastEventError).toHaveBeenCalledWith(err, P('Standup'));
		expect(drag.preview).toBeNull();
	});

	it('leaves a later gesture\'s preview alone when an earlier write settles', async () => {
		let settle!: () => void;
		vi.mocked(moveEventToDay).mockReturnValue(new Promise<void>((resolve) => (settle = resolve)));
		const el = chip('Standup');
		down(el, 1);
		win('pointermove', 3);
		win('pointerup', 3);
		down(el, 1);
		const later = drag.preview;

		settle();
		await Promise.resolve();
		await Promise.resolve();

		expect(later).not.toBeNull();
		expect(drag.preview).toBe(later);
	});
});

describe('DayDrag: reset', () => {
	it('drops the live gesture and its preview: a later release writes nothing', () => {
		down(chip('Standup'), 1);
		win('pointermove', 3);

		drag.reset();
		win('pointerup', 3);

		expect(drag.preview).toBeNull();
		expect(eventCalendarViewStore.gestureLive).toBe(false);
		expect(moveEventToDay).not.toHaveBeenCalled();
	});

	it('disarms an armed swallow', () => {
		vi.mocked(moveEventToDay).mockReturnValue(new Promise<void>(() => {}));
		const el = chip('Standup');
		down(el, 1);
		win('pointermove', 3);
		win('pointerup', 3);

		drag.reset();
		pointerClick(el);

		expect(clicks).toBe(1);
	});

	it('removes every window listener it added', () => {
		const add = vi.spyOn(window, 'addEventListener');
		const remove = vi.spyOn(window, 'removeEventListener');
		try {
			vi.mocked(moveEventToDay).mockReturnValue(new Promise<void>(() => {}));
			down(chip('Standup'), 1);
			win('pointermove', 3);
			win('pointerup', 3);

			drag.reset();

			const capture = (options: unknown) => options === true;
			const left = add.mock.calls.filter(
				([type, listener, options]) => !remove.mock.calls.some(([t, l, o]) => t === type && l === listener && capture(o) === capture(options)),
			);
			expect(add.mock.calls.length).toBeGreaterThan(0);
			expect(left).toEqual([]);
		} finally {
			add.mockRestore();
			remove.mockRestore();
		}
	});
});
