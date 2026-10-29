// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Opening a note is the editor's side effect; the stores stay real (CLAUDE.md rule 1).
vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

// The delete / duplicate flows write through the fs; they run for real in
// `EventDialog.test.ts` and `event-calendar.service.test.ts`.
vi.mock('$lib/features/event-calendar/event-calendar.service', () => ({
	deleteEventFromUi: vi.fn(async () => {}),
	duplicateEventFromUi: vi.fn(async () => {}),
}));

import { flushSync, mount, tick, unmount } from 'svelte';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import EventPopover from '$lib/features/event-calendar/EventPopover.svelte';
import { deleteEventFromUi, duplicateEventFromUi } from '$lib/features/event-calendar/event-calendar.service';
import EventTimeGrid from '$lib/features/event-calendar/EventTimeGrid.svelte';
import { weekDays } from '$lib/features/event-calendar/event-calendar-dates.logic';
import { eventCalendarStore } from '$lib/features/event-calendar/event-calendar.store.svelte';
import { eventCalendarViewStore } from '$lib/features/event-calendar/event-calendar-view.store.svelte';
import type { EventNote } from '$lib/features/event-calendar/event-calendar.types';

const P = (name: string) => `/vault/Events/${name}.md`;
const WEEK = weekDays('2026-11-10', 1);
const RING = 'ring-primary/70';

function event(overrides: Partial<EventNote> & Pick<EventNote, 'path' | 'title' | 'date'>): EventNote {
	return {
		start: 540,
		end: 600,
		allDay: false,
		color: 'blue',
		location: '',
		snippet: '',
		readOnly: false,
		...overrides,
	};
}

const STANDUP = event({
	path: P('Standup'),
	title: 'Standup',
	date: '2026-11-10',
	start: 540,
	end: 630,
	location: 'Room 4',
	snippet: 'Daily sync notes',
	color: 'pink',
});
const REVIEW = event({ path: P('Review'), title: 'Review', date: '2026-11-11', start: 840, end: 900 });
const OFF = event({ path: P('Off'), title: 'Time off', date: '2026-11-12', allDay: true, start: 0, end: 1440 });

let root: HTMLElement;
let components: Record<string, unknown>[] = [];

/** Mounts the week grid and the popover into one root, as `EventCalendarView` does. */
function mountView() {
	components.push(mount(EventTimeGrid, { target: root, props: { days: WEEK } }));
	components.push(mount(EventPopover, { target: root, props: { root } }));
	flushSync();
}

/** Lets bits-ui finish mounting or unmounting the popover. */
async function settle() {
	flushSync();
	await tick();
	await new Promise((r) => setTimeout(r, 0));
	flushSync();
}

const q = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector);
const popover = () => document.querySelector<HTMLElement>('[data-event-popover]');
const block = (path: string) => q(`[data-day-column] [data-event-path="${path}"]`)!;
const laneChip = (path: string) => q<HTMLButtonElement>(`[data-all-day-cell] [data-event-path="${path}"]`)!;

/** Waits past bits-ui's 10 ms outside-pointerdown dismiss debounce. */
const pastDismiss = () => new Promise((r) => setTimeout(r, 30));

/**
 * jsdom lays nothing out, so the card's rect is all zeros; a pointer at (-1, -1) is
 * outside it, which bits-ui checks before it dismisses.
 */
const pointerdown = () => new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: -1, clientY: -1 });

/** A quick click: pointerdown, focus and click back to back, as a trackpad tap lands them. */
function quickClick(el: HTMLElement) {
	el.dispatchEvent(pointerdown());
	el.focus();
	el.click();
}

/** A slow click: pointerdown, then the click after bits-ui has dismissed the popover. */
async function slowClick(el: HTMLElement) {
	el.dispatchEvent(pointerdown());
	el.focus();
	await pastDismiss();
	await settle();
	el.click();
}

beforeEach(() => {
	vi.clearAllMocks();
	clearLocalStorage();
	settingsStore.reset();
	eventCalendarStore.reset();
	eventCalendarViewStore.reset();
	eventCalendarViewStore.setDate('2026-11-10');
	eventCalendarViewStore.setNow(new Date(2026, 10, 10, 10, 0).getTime());
	eventCalendarStore.setSnapshot({ events: [STANDUP, REVIEW, OFF], issues: [], archivedCount: 0 }, 1);
	root = document.body.appendChild(document.createElement('div'));
	root.tabIndex = -1;
});

afterEach(() => {
	for (const c of components) unmount(c);
	components = [];
	document.body.innerHTML = '';
});

describe('EventPopover: opening', () => {
	it('opens on a lane-chip click with the event title and "All day"', async () => {
		mountView();

		laneChip(P('Off')).click();
		await settle();

		expect(eventCalendarViewStore.popover?.path).toBe(P('Off'));
		expect(popover()?.querySelector('[data-popover-title]')?.textContent?.trim()).toBe('Time off');
		expect(popover()?.querySelector('[data-popover-time]')?.textContent?.trim()).toBe('All day');
	});

	it('shows the time range with its duration, the location and the snippet of a timed block', async () => {
		mountView();

		block(P('Standup')).click();
		await settle();

		const card = popover()!;
		expect(card.querySelector('[data-popover-title]')?.textContent?.trim()).toBe('Standup');
		expect(card.querySelector('[data-popover-time]')?.textContent?.trim()).toBe('09:00 – 10:30 · 1h 30m');
		expect(card.querySelector('[data-popover-location]')?.textContent?.trim()).toBe('Room 4');
		expect(card.querySelector('[data-popover-snippet]')?.textContent?.trim()).toBe('Daily sync notes');
		expect(card.querySelector<HTMLElement>('[data-popover-dot]')?.getAttribute('style')).toContain('var(--event-pink-fg)');
	});

	it('shows both days and the full duration of a cross-midnight event, from either day', async () => {
		const late = event({ path: P('Late'), title: 'Late show', date: '2026-11-10', endDate: '2026-11-11', start: 1380, end: 60, readOnly: true });
		eventCalendarStore.setSnapshot({ events: [late], issues: [], archivedCount: 0 }, 2);
		mountView();

		const segments = root.querySelectorAll<HTMLElement>(`[data-day-column] [data-event-path="${P('Late')}"]`);
		expect([...segments].map((el) => el.closest('[data-day-column]')?.getAttribute('data-day-column'))).toEqual(['2026-11-10', '2026-11-11']);
		segments[1].click();
		await settle();

		const card = popover()!;
		expect(card.querySelector('[data-popover-date]')?.textContent?.trim()).toBe('Tuesday, November 10, 2026 – Wednesday, November 11, 2026');
		expect(card.querySelector('[data-popover-time]')?.textContent?.trim()).toBe('23:00 – 01:00 · 2h');
	});

	it('opens on Enter and on Space on a focused block', async () => {
		mountView();
		const el = block(P('Review'));

		el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await settle();
		expect(eventCalendarViewStore.popover?.path).toBe(P('Review'));

		eventCalendarViewStore.closePopover();
		await settle();
		el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
		await settle();
		expect(eventCalendarViewStore.popover?.path).toBe(P('Review'));
		expect(popover()?.querySelector('[data-popover-title]')?.textContent?.trim()).toBe('Review');
	});

	it('follows a rename overlay to the new path instead of closing', async () => {
		mountView();
		block(P('Standup')).click();
		await settle();

		// What `writeEvent` does on a title rename, in one synchronous step.
		eventCalendarStore.remapPath(P('Standup'), P('Daily sync'), 1);
		eventCalendarViewStore.remapPath(P('Standup'), P('Daily sync'));
		await settle();

		expect(eventCalendarViewStore.popover?.path).toBe(P('Daily sync'));
		expect(popover()?.querySelector('[data-popover-title]')?.textContent?.trim()).toBe('Standup');
		expect(root.querySelector(`[data-event-path="${P('Standup')}"]`)).toBeNull();
	});

	it('renders nothing while no event is selected, or when the selected note is not an event', async () => {
		mountView();
		expect(popover()).toBeNull();

		eventCalendarViewStore.openPopover(P('Gone'), { x: 0, y: 0, width: 10, height: 10 });
		await settle();
		expect(popover()).toBeNull();
	});
});

describe('EventPopover: clicking another event while open', () => {
	it('retargets the open popover to a second block on a quick click', async () => {
		mountView();
		block(P('Standup')).click();
		await settle();

		quickClick(block(P('Review')));
		await pastDismiss();
		await settle();

		expect(eventCalendarViewStore.popover?.path).toBe(P('Review'));
		expect(popover()?.querySelector('[data-popover-title]')?.textContent?.trim()).toBe('Review');
		expect(block(P('Review')).className).toContain(RING);
		expect(block(P('Standup')).className).not.toContain(RING);
	});

	it('retargets the open popover to a lane chip on a quick click', async () => {
		mountView();
		block(P('Standup')).click();
		await settle();

		quickClick(laneChip(P('Off')));
		await pastDismiss();
		await settle();

		expect(popover()?.querySelector('[data-popover-title]')?.textContent?.trim()).toBe('Time off');
		expect(laneChip(P('Off')).className).toContain(RING);
		expect(block(P('Standup')).className).not.toContain(RING);
	});
});

describe('EventPopover: selected-event ring', () => {
	it('rings only the clicked block', async () => {
		mountView();

		block(P('Standup')).click();
		await settle();

		expect(block(P('Standup')).className).toContain(RING);
		expect(block(P('Review')).className).not.toContain(RING);
		expect(laneChip(P('Off')).className).not.toContain(RING);
	});

	it('rings only the clicked lane chip', async () => {
		mountView();

		laneChip(P('Off')).click();
		await settle();

		expect(laneChip(P('Off')).className).toContain(RING);
		expect(block(P('Standup')).className).not.toContain(RING);
	});
});

describe('EventPopover: closing', () => {
	it('closes on Escape and returns focus to the clicked block', async () => {
		mountView();
		block(P('Standup')).click();
		await settle();
		expect(popover()).not.toBeNull();

		document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settle();

		expect(eventCalendarViewStore.popover).toBeNull();
		expect(popover()).toBeNull();
		expect(document.activeElement).toBe(block(P('Standup')));
		expect(block(P('Standup')).className).not.toContain(RING);
	});

	it('focuses the root when the clicked event is gone on close, and stays closed when it returns', async () => {
		mountView();
		block(P('Review')).click();
		await settle();

		eventCalendarStore.setSnapshot({ events: [STANDUP, OFF], issues: [], archivedCount: 0 }, 2);
		await settle();

		expect(popover()).toBeNull();
		expect(eventCalendarViewStore.popover).toBeNull();
		expect(eventCalendarViewStore.selectedEventPath).toBeNull();
		expect(document.activeElement).toBe(root);

		eventCalendarStore.setSnapshot({ events: [STANDUP, REVIEW, OFF], issues: [], archivedCount: 0 }, 3);
		await settle();

		expect(popover()).toBeNull();
		expect(root.querySelector(`.${CSS.escape(RING)}`)).toBeNull();
	});

	it('leaves focus on an outside button the user clicked', async () => {
		const outside = document.body.appendChild(document.createElement('button'));
		mountView();
		block(P('Standup')).click();
		await settle();

		await slowClick(outside);
		await settle();

		expect(eventCalendarViewStore.popover).toBeNull();
		expect(popover()).toBeNull();
		expect(document.activeElement).toBe(outside);
	});

	it('returns focus to the block, not to the tabindex="-1" root, after a click on empty space in the view', async () => {
		mountView();
		const empty = root.appendChild(document.createElement('span'));
		block(P('Standup')).click();
		await settle();

		await slowClick(empty);
		await settle();

		expect(eventCalendarViewStore.popover).toBeNull();
		expect(document.activeElement).not.toBe(root);
		expect(document.activeElement).toBe(block(P('Standup')));
	});

	it('leaves focus on an unselected tabindex="-1" view tab inside the view the user clicked', async () => {
		mountView();
		const tab = root.appendChild(document.createElement('button'));
		tab.setAttribute('role', 'tab');
		tab.tabIndex = -1;
		block(P('Standup')).click();
		await settle();

		await slowClick(tab);
		await settle();

		expect(eventCalendarViewStore.popover).toBeNull();
		expect(document.activeElement).toBe(tab);
	});

	it('leaves focus on a tabindex="-1" surface outside the view the user clicked', async () => {
		const surface = document.body.appendChild(document.createElement('div'));
		surface.tabIndex = -1;
		const text = surface.appendChild(document.createElement('span'));
		mountView();
		block(P('Standup')).click();
		await settle();

		await slowClick(text);
		await settle();

		expect(eventCalendarViewStore.popover).toBeNull();
		expect(document.activeElement).toBe(surface);
	});

	it('does not leave focus on <body> when an outside control moves to a week without the event', async () => {
		const next = document.body.appendChild(document.createElement('button'));
		next.addEventListener('click', () => eventCalendarViewStore.setDate('2026-11-17'));
		mountView();
		block(P('Standup')).click();
		await settle();

		await slowClick(next);
		await settle();

		expect(eventCalendarViewStore.popover).toBeNull();
		expect(document.activeElement).not.toBe(document.body);
		expect(document.activeElement).toBe(next);
	});

	it('closes on a scroll inside the root and on a window resize', async () => {
		mountView();
		block(P('Standup')).click();
		await settle();

		q('[data-time-grid]')!.dispatchEvent(new Event('scroll'));
		expect(eventCalendarViewStore.popover).toBeNull();

		block(P('Standup')).click();
		await settle();
		window.dispatchEvent(new Event('resize'));
		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('closes on a view or date change', async () => {
		mountView();
		block(P('Standup')).click();
		await settle();
		eventCalendarViewStore.setView('day');
		expect(eventCalendarViewStore.popover).toBeNull();

		block(P('Standup')).click();
		await settle();
		eventCalendarViewStore.setDate('2026-11-11');
		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('"Edit" replaces the popover with the edit dialog for the same event', async () => {
		mountView();
		block(P('Standup')).click();
		await settle();

		const edit = [...popover()!.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Edit')!;
		edit.click();
		await settle();

		expect(eventCalendarViewStore.popover).toBeNull();
		expect(popover()).toBeNull();
		expect(eventCalendarViewStore.dialog?.payload).toEqual({ mode: 'edit', path: P('Standup') });
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('"Open note" closes the popover and opens the note', async () => {
		mountView();
		block(P('Standup')).click();
		await settle();

		const open = [...popover()!.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Open note')!;
		open.click();
		await settle();

		expect(openFileInEditor).toHaveBeenCalledWith(P('Standup'));
		expect(eventCalendarViewStore.popover).toBeNull();
		expect(popover()).toBeNull();
	});

	it('"Delete" closes the popover, deletes the event and focuses the view root', async () => {
		mountView();
		block(P('Standup')).click();
		await settle();

		popover()!.querySelector<HTMLButtonElement>('[data-delete]')!.click();
		await settle();

		expect(deleteEventFromUi).toHaveBeenCalledWith(P('Standup'), root);
		expect(eventCalendarViewStore.popover).toBeNull();
		expect(popover()).toBeNull();
		expect(document.activeElement).toBe(root);
	});

	it('"Duplicate" closes the popover, duplicates the event and parks focus on the view root', async () => {
		mountView();
		block(P('Standup')).click();
		await settle();
		document.body.focus();

		popover()!.querySelector<HTMLButtonElement>('[data-duplicate]')!.click();
		await settle();

		expect(duplicateEventFromUi).toHaveBeenCalledWith(P('Standup'), root);
		expect(eventCalendarViewStore.popover).toBeNull();
		expect(document.activeElement).toBe(root);
	});

	it('"Duplicate" leaves focus where the flow moves it once the copy renders', async () => {
		vi.mocked(duplicateEventFromUi).mockImplementationOnce(async () => {
			await new Promise((r) => setTimeout(r, 5));
			block(P('Review')).focus();
		});
		mountView();
		block(P('Standup')).click();
		await settle();

		popover()!.querySelector<HTMLButtonElement>('[data-duplicate]')!.click();
		await settle();
		await new Promise((r) => setTimeout(r, 10));
		await settle();

		expect(popover()).toBeNull();
		expect(document.activeElement).toBe(block(P('Review')));
	});
});
