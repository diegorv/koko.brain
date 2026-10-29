// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

// The note write is the service's side effect; the drag tests drive its promise.
vi.mock('$lib/features/event-calendar/event-calendar.service', async () => {
	const actual = await vi.importActual<typeof import('$lib/features/event-calendar/event-calendar.service')>(
		'$lib/features/event-calendar/event-calendar.service',
	);
	return { ...actual, moveEventToDay: vi.fn(), toastEventError: vi.fn() };
});

import { flushSync, mount, unmount } from 'svelte';
import EventAllDayLane from '$lib/features/event-calendar/EventAllDayLane.svelte';
import { moveEventToDay } from '$lib/features/event-calendar/event-calendar.service';
import { eventCalendarViewStore } from '$lib/features/event-calendar/event-calendar-view.store.svelte';
import type { EventNote } from '$lib/features/event-calendar/event-calendar.types';

const P = (name: string) => `/vault/Events/${name}.md`;
const DAYS = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'];

function allDay(name: string, date: string, overrides: Partial<EventNote> = {}): EventNote {
	return {
		path: P(name),
		title: name,
		date,
		start: 0,
		end: 1440,
		allDay: true,
		color: 'blue',
		location: '',
		snippet: '',
		readOnly: false,
		...overrides,
	};
}

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

/** Mounts the lane with its cells stubbed to 100 px each, so day `i` is centered at x = 100 * i + 50. */
function mountLane(events: EventNote[], days = DAYS) {
	component = mount(EventAllDayLane, { target, props: { days, events } });
	flushSync();
	const area = target.querySelector<HTMLElement>('[data-all-day-cells]')!;
	area.getBoundingClientRect = () => ({ left: 0, top: 0, width: 500, height: 40, right: 500, bottom: 40, x: 0, y: 0, toJSON: () => ({}) });
}

const chipIn = (day: string, name: string) => target.querySelector<HTMLElement>(`[data-all-day-cell="${day}"] [data-event-path="${P(name)}"]`);

function pointer(el: EventTarget, type: string, dayIndex: number) {
	el.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerType: 'mouse', pointerId: 1, clientX: dayIndex * 100 + 50, clientY: 20 }));
	flushSync();
}

beforeEach(() => {
	vi.clearAllMocks();
	clearLocalStorage();
	eventCalendarViewStore.reset();
	target = document.body.appendChild(document.createElement('div'));
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
});

describe('EventAllDayLane: drag to another day', () => {
	it('moves a chip to the day under the pointer and writes the new day once, swallowing the drop click', () => {
		vi.mocked(moveEventToDay).mockReturnValue(new Promise<void>(() => {}));
		mountLane([allDay('Holiday', '2026-11-10')]);

		pointer(chipIn('2026-11-10', 'Holiday')!, 'pointerdown', 1);
		pointer(window, 'pointermove', 3);
		expect(chipIn('2026-11-10', 'Holiday')).toBeNull();
		expect(chipIn('2026-11-12', 'Holiday')?.textContent?.trim()).toBe('Holiday');

		pointer(window, 'pointerup', 3);
		// A mouse click (`detail: 1`), as the release sends.
		chipIn('2026-11-12', 'Holiday')!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
		flushSync();

		expect(moveEventToDay).toHaveBeenCalledTimes(1);
		expect(moveEventToDay).toHaveBeenCalledWith(P('Holiday'), '2026-11-12');
		expect(eventCalendarViewStore.popover).toBeNull();
		expect(chipIn('2026-11-12', 'Holiday')).not.toBeNull();
	});

	it('leaves a press under the threshold to the chip click, which opens the popover', () => {
		mountLane([allDay('Holiday', '2026-11-10')]);

		pointer(chipIn('2026-11-10', 'Holiday')!, 'pointerdown', 1);
		pointer(window, 'pointerup', 1);
		chipIn('2026-11-10', 'Holiday')!.click();
		flushSync();

		expect(moveEventToDay).not.toHaveBeenCalled();
		expect(eventCalendarViewStore.popover?.path).toBe(P('Holiday'));
	});

	it('a drop whose click lands outside the lane does not swallow the next keyboard activation', () => {
		vi.mocked(moveEventToDay).mockReturnValue(new Promise<void>(() => {}));
		mountLane([allDay('Holiday', '2026-11-10'), allDay('Offsite', '2026-11-13')]);

		pointer(chipIn('2026-11-10', 'Holiday')!, 'pointerdown', 1);
		pointer(window, 'pointermove', 3);
		// Released below the lane: no click reaches the cells.
		pointer(window, 'pointerup', 3);
		// Enter on another chip: a click with `detail: 0` and no pointerdown.
		chipIn('2026-11-13', 'Offsite')!.click();
		flushSync();

		expect(moveEventToDay).toHaveBeenCalledWith(P('Holiday'), '2026-11-12');
		expect(eventCalendarViewStore.popover?.path).toBe(P('Offsite'));
	});

	it('a drop whose click lands outside the lane does not swallow a later pointer-style click with no press', () => {
		vi.mocked(moveEventToDay).mockReturnValue(new Promise<void>(() => {}));
		mountLane([allDay('Holiday', '2026-11-10'), allDay('Offsite', '2026-11-13')]);

		pointer(chipIn('2026-11-10', 'Holiday')!, 'pointerdown', 1);
		pointer(window, 'pointermove', 3);
		pointer(window, 'pointerup', 3);
		// The release's click lands below the lane.
		document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
		// An assistive-tech activation: `detail: 1`, no pointerdown.
		chipIn('2026-11-13', 'Offsite')!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
		flushSync();

		expect(eventCalendarViewStore.popover?.path).toBe(P('Offsite'));
	});

	it('marks a read-only span chip and never drags it', () => {
		mountLane([allDay('Retreat', '2026-11-10', { endDate: '2026-11-11', readOnly: true })]);
		expect(chipIn('2026-11-10', 'Retreat')!.dataset.readonly).toBe('true');
		expect(chipIn('2026-11-11', 'Retreat')!.dataset.readonly).toBe('true');

		pointer(chipIn('2026-11-10', 'Retreat')!, 'pointerdown', 1);
		pointer(window, 'pointermove', 3);
		pointer(window, 'pointerup', 3);

		expect(chipIn('2026-11-12', 'Retreat')).toBeNull();
		expect(chipIn('2026-11-10', 'Retreat')).not.toBeNull();
		expect(moveEventToDay).not.toHaveBeenCalled();
	});

	it('leaves a writable chip unmarked', () => {
		mountLane([allDay('Holiday', '2026-11-10')]);
		expect(chipIn('2026-11-10', 'Holiday')!.hasAttribute('data-readonly')).toBe(false);
	});

	it('lets Cmd+S reach the document mid-drag and marks the gesture live until the release', () => {
		vi.mocked(moveEventToDay).mockReturnValue(new Promise<void>(() => {}));
		mountLane([allDay('Holiday', '2026-11-10')]);
		const reached: string[] = [];
		const onKey = (e: KeyboardEvent) => reached.push(e.key);
		document.addEventListener('keydown', onKey);

		pointer(chipIn('2026-11-10', 'Holiday')!, 'pointerdown', 1);
		pointer(window, 'pointermove', 3);
		document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true, cancelable: true }));
		const liveMidDrag = eventCalendarViewStore.gestureLive;
		pointer(window, 'pointerup', 3);
		document.removeEventListener('keydown', onKey);

		expect(reached).toEqual(['s']);
		expect(liveMidDrag).toBe(true);
		expect(eventCalendarViewStore.gestureLive).toBe(false);
	});

	it('unmounting mid-drag discards the drag: a later release writes nothing', () => {
		mountLane([allDay('Holiday', '2026-11-10')]);

		pointer(chipIn('2026-11-10', 'Holiday')!, 'pointerdown', 1);
		pointer(window, 'pointermove', 3);
		unmount(component!);
		component = null;
		expect(eventCalendarViewStore.gestureLive).toBe(false);
		pointer(window, 'pointerup', 3);

		expect(moveEventToDay).not.toHaveBeenCalled();
	});

	it('cannot move anything in a one-day lane (day view)', () => {
		mountLane([allDay('Holiday', '2026-11-10')], ['2026-11-10']);

		pointer(chipIn('2026-11-10', 'Holiday')!, 'pointerdown', 0);
		pointer(window, 'pointermove', 3);
		pointer(window, 'pointerup', 3);

		expect(moveEventToDay).not.toHaveBeenCalled();
		expect(chipIn('2026-11-10', 'Holiday')).not.toBeNull();
	});

	it('focus leaving the calendar mid-drag discards it: the release writes nothing and its click opens no popover', () => {
		target.setAttribute('data-event-calendar', '');
		mountLane([allDay('Holiday', '2026-11-10')]);
		const overlayInput = document.body.appendChild(document.createElement('input'));

		pointer(chipIn('2026-11-10', 'Holiday')!, 'pointerdown', 1);
		pointer(window, 'pointermove', 3);
		overlayInput.focus();
		flushSync();
		const liveAfterFocus = eventCalendarViewStore.gestureLive;
		pointer(window, 'pointerup', 3);
		chipIn('2026-11-10', 'Holiday')!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
		flushSync();

		expect(liveAfterFocus).toBe(false);
		expect(moveEventToDay).not.toHaveBeenCalled();
		expect(chipIn('2026-11-10', 'Holiday')).not.toBeNull();
		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('focus moving within the calendar root keeps the drag', () => {
		vi.mocked(moveEventToDay).mockResolvedValue(undefined);
		target.setAttribute('data-event-calendar', '');
		mountLane([allDay('Holiday', '2026-11-10')]);
		const elsewhereInRoot = target.appendChild(document.createElement('button'));

		pointer(chipIn('2026-11-10', 'Holiday')!, 'pointerdown', 1);
		pointer(window, 'pointermove', 3);
		elsewhereInRoot.focus();
		flushSync();
		const liveAfterFocus = eventCalendarViewStore.gestureLive;
		pointer(window, 'pointerup', 3);

		expect(liveAfterFocus).toBe(true);
		expect(moveEventToDay).toHaveBeenCalledWith(P('Holiday'), '2026-11-12');
	});
});
