// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// bits-ui Tooltip positions via @floating-ui/dom, which needs ResizeObserver.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// Tauri IPC, the editor's file opener and saver, the Trash move and the
// toast are side effects; the stores and the event-calendar service stay
// real (CLAUDE.md rule 1).
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
	saveFileByPath: vi.fn(async () => true),
}));

vi.mock('$lib/core/filesystem/fs.service', async () => {
	const actual = await vi.importActual<typeof import('$lib/core/filesystem/fs.service')>('$lib/core/filesystem/fs.service');
	return { ...actual, deleteItem: vi.fn(async () => true) };
});

vi.mock('svelte-sonner', () => ({
	toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), dismiss: vi.fn() }),
}));

import { flushSync, mount, unmount } from 'svelte';
import { toast } from 'svelte-sonner';
import { invoke } from '@tauri-apps/api/core';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { invalidateVaultEntries } from '$lib/core/vault/vault-entries.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import EventCalendarView from '$lib/features/event-calendar/EventCalendarView.svelte';
import { openEventInCalendar, resetEventCalendar } from '$lib/features/event-calendar/event-calendar.service';
import { CALENDAR_SHORTCUTS } from '$lib/features/event-calendar/event-calendar-keys.logic';
import { toKey } from '$lib/features/event-calendar/event-calendar-dates.logic';
import { eventCalendarStore } from '$lib/features/event-calendar/event-calendar.store.svelte';
import { eventCalendarViewStore } from '$lib/features/event-calendar/event-calendar-view.store.svelte';
import type { FileTaskGroupV2, NoteEntryV2 } from '$lib/types/vault-v2.types';
import { eventEntry } from '../../../fixtures/event-notes.fixture';

const VAULT = '/vault';
const P = (name: string) => `${VAULT}/${name}.md`;

/** A promise whose resolution the test controls. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

/** Lets pending loads resolve, then flushes effects and the DOM. */
async function settle() {
	await new Promise((r) => setTimeout(r, 0));
	flushSync();
}

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

function mountView() {
	component = mount(EventCalendarView, { target });
	flushSync();
}

function unmountView() {
	if (component) unmount(component);
	component = null;
	flushSync();
}

/** Text of the first element matching `selector`, trimmed. */
function text(selector: string): string {
	return target.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	clearLocalStorage();
	invalidateVaultEntries();
	vaultStore._reset();
	vaultStore.open(VAULT);
	vaultStore.markIndexReady();
	settingsStore.reset();
	resetEventCalendar();
	eventCalendarViewStore.setDate('2026-11-10');
	vi.mocked(invoke).mockResolvedValue([]);
	target = document.body.appendChild(document.createElement('div'));
});

afterEach(() => {
	unmountView();
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

describe('EventCalendarView: header', () => {
	it('shows the range title and the week subtitle', async () => {
		mountView();
		await settle();

		expect(text('[data-calendar-title]')).toBe('November, 2026');
		expect(text('[data-calendar-subtitle]')).toContain('Week 46');
	});

	it('renders the D/W/M control as a tablist with the selected view', async () => {
		mountView();
		await settle();

		const tablist = target.querySelector('[role="tablist"]')!;
		expect(tablist.getAttribute('aria-label')).toBe('Calendar view');
		const tabs = [...tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
		expect(tabs.map((t) => t.textContent?.trim())).toEqual(['D', 'W', 'M']);
		expect(tabs.map((t) => t.getAttribute('aria-keyshortcuts'))).toEqual(['D', 'W', 'M']);
		expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);

		tabs[0].click();
		flushSync();

		expect(eventCalendarViewStore.view).toBe('day');
		expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
	});

	it('moves between the tabs with ArrowLeft and ArrowRight, wrapping', async () => {
		mountView();
		await settle();
		const tabs = () => [...target.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

		tabs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		flushSync();
		expect(eventCalendarViewStore.view).toBe('month');
		expect(document.activeElement).toBe(tabs()[2]);

		tabs()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		flushSync();
		expect(eventCalendarViewStore.view).toBe('day');

		tabs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
		flushSync();
		expect(eventCalendarViewStore.view).toBe('month');
	});

	it('steps the range with prev / next and returns with Today', async () => {
		mountView();
		await settle();

		target.querySelector<HTMLButtonElement>('[aria-label="Next week"]')!.click();
		flushSync();
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-17');

		target.querySelector<HTMLButtonElement>('[aria-label="Previous week"]')!.click();
		target.querySelector<HTMLButtonElement>('[aria-label="Previous week"]')!.click();
		flushSync();
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-03');
	});
});

describe('EventCalendarView: loading', () => {
	it('shows "Indexing vault..." and does not load while the index is not ready', async () => {
		vaultStore._reset();
		vaultStore.open(VAULT);
		mountView();
		await settle();

		expect(target.textContent).toContain('Indexing vault...');
		expect(invoke).not.toHaveBeenCalled();
	});

	it('loads on mount and shows the empty time grid in week view', async () => {
		mountView();
		await settle();

		expect(invoke).toHaveBeenCalledWith('get_all_vault_entries_v2');
		expect(target.querySelector('[data-time-grid]')).not.toBeNull();
		expect(target.querySelectorAll('[data-day-column]')).toHaveLength(7);
		expect(target.querySelector('[data-calendar-issues]')).toBeNull();
	});

	it('shows one day column in day view and the month grid in month view', async () => {
		mountView();
		await settle();

		eventCalendarViewStore.setView('day');
		flushSync();
		expect(target.querySelectorAll('[data-day-column]')).toHaveLength(1);
		expect(target.querySelector('[data-day-column]')?.getAttribute('data-day-column')).toBe('2026-11-10');

		eventCalendarViewStore.setView('month');
		flushSync();
		expect(target.querySelector('[data-time-grid]')).toBeNull();
		expect(target.querySelector('[data-month-grid]')).not.toBeNull();
		expect(target.querySelectorAll('[data-month-cell]')).toHaveLength(42);
	});

	it('shows the week strip above the day grid in day view only, and a strip click moves the day column', async () => {
		mountView();
		await settle();
		expect(target.querySelector('[data-week-strip]')).toBeNull();

		eventCalendarViewStore.setView('day');
		flushSync();
		const strip = target.querySelector('[data-week-strip]')!;
		const grid = target.querySelector('[data-time-grid]')!;
		expect(strip.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

		target.querySelector<HTMLButtonElement>('[data-week-strip-day="2026-11-12"]')!.click();
		flushSync();
		expect(target.querySelector('[data-day-column]')?.getAttribute('data-day-column')).toBe('2026-11-12');
		expect(eventCalendarViewStore.view).toBe('day');

		eventCalendarViewStore.setView('month');
		flushSync();
		expect(target.querySelector('[data-week-strip]')).toBeNull();
	});

	it('renders a loaded event on the grid', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00' })]);
		mountView();
		await settle();

		const block = target.querySelector(`[data-day-column="2026-11-10"] [data-event-path="${P('Standup')}"]`);
		expect(block?.getAttribute('aria-label')).toBe('Standup, 09:00 – 10:00');
	});

	it('re-projects when defaultDurationMinutes changes, with no extra IPC', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00' })]);
		mountView();
		await settle();
		expect(eventCalendarStore.eventByPath(P('Standup'))?.end).toBe(600);

		settingsStore.updateEventCalendar({ defaultDurationMinutes: 30 });
		flushSync();
		await settle();

		expect(eventCalendarStore.eventByPath(P('Standup'))?.end).toBe(570);
		expect(vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'get_all_vault_entries_v2')).toHaveLength(1);
	});

	it('reloads on an index bump', async () => {
		mountView();
		await settle();
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Retro'), { date: '2026-11-11', start: '14:00' })]);

		vaultStore.bumpVaultIndexVersion(vaultStore.vaultIndexVersion + 1);
		flushSync();
		await settle();

		expect(eventCalendarStore.events.map((e) => e.path)).toEqual([P('Retro')]);
	});

	it('shows the inline error and toasts when the current load fails', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd === 'get_all_vault_entries_v2') throw new Error('boom');
			return [];
		});
		mountView();
		await settle();

		expect(text('[data-calendar-load-error]')).toContain('boom');
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(toast.error).toHaveBeenCalledWith('Could not load calendar events', { description: 'boom' });
	});

	it('does not toast for a load that a newer load replaced', async () => {
		const first = deferred<NoteEntryV2[]>();
		vi.mocked(invoke).mockReturnValueOnce(first.promise).mockResolvedValue([]);
		mountView();
		flushSync();

		vaultStore.bumpVaultIndexVersion(vaultStore.vaultIndexVersion + 1);
		flushSync();
		await settle();
		first.reject(new Error('stale'));
		await settle();

		expect(toast.error).not.toHaveBeenCalled();
		expect(eventCalendarStore.loadError).toBeNull();
	});

	it('toasts once when a remount shares the failing in-flight load', async () => {
		const first = deferred<NoteEntryV2[]>();
		vi.mocked(invoke).mockReturnValueOnce(first.promise);
		mountView();
		unmountView();
		mountView();
		first.reject(new Error('boom'));
		await settle();

		expect(vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'get_all_vault_entries_v2')).toHaveLength(1);
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(text('[data-calendar-load-error]')).toContain('boom');
	});

	it('does not toast for a load that a same-vault reset discarded', async () => {
		const first = deferred<NoteEntryV2[]>();
		vi.mocked(invoke).mockReturnValueOnce(first.promise);
		mountView();

		resetEventCalendar();
		first.reject(new Error('stale'));
		await settle();

		expect(toast.error).not.toHaveBeenCalled();
		expect(eventCalendarStore.loadError).toBeNull();
	});
});

describe('EventCalendarView: dated tasks', () => {
	/** A note with `- [ ] Pay rent 📅 2026-11-12` on line 3. */
	const RENT: FileTaskGroupV2 = {
		filePath: P('Home'),
		fileName: 'Home',
		modifiedAt: 0,
		tasks: [
			{
				text: 'Pay rent 📅 2026-11-12',
				checked: false,
				indent: 0,
				lineNumber: 3,
				status: 'todo',
				metadata: { description: 'Pay rent', dueDate: '2026-11-12', tags: [] },
			},
		],
	};

	/** Answers the task index with `groups` and every other command with []. */
	function mockTasks(groups: FileTaskGroupV2[] | Error) {
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd !== 'get_all_tasks_v2') return [];
			if (groups instanceof Error) throw groups;
			return groups;
		});
	}

	const taskCalls = () => vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'get_all_tasks_v2');

	it('shows a dated task in the week task lane and in the month cell of its due day', async () => {
		mockTasks([RENT]);
		mountView();
		await settle();

		expect(taskCalls()).toHaveLength(1);
		const laneChip = target.querySelector<HTMLButtonElement>('[data-task-lane-cell="2026-11-12"] [data-calendar-task]');
		expect(laneChip?.textContent?.trim()).toBe('Pay rent');
		expect(target.querySelectorAll('[data-calendar-task]')).toHaveLength(1);
		// A task is not an event: no event path, so no drag, popover or Delete.
		expect(laneChip!.hasAttribute('data-event-path')).toBe(false);

		eventCalendarViewStore.setView('month');
		flushSync();
		const cellChip = target.querySelector('[data-month-cell="2026-11-12"] [data-calendar-task]');
		expect(cellChip?.textContent?.trim()).toBe('Pay rent');
	});

	it('opens the note when a task chip is clicked', async () => {
		mockTasks([RENT]);
		mountView();
		await settle();

		target.querySelector<HTMLButtonElement>('[data-calendar-task]')!.click();
		await settle();

		expect(openFileInEditor).toHaveBeenCalledWith(P('Home'));
		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('shows no task lane in a week without dated tasks', async () => {
		mockTasks([]);
		mountView();
		await settle();

		expect(target.querySelector('[data-task-lane]')).toBeNull();
	});

	it('reloads the tasks on an index bump', async () => {
		mockTasks([]);
		mountView();
		await settle();
		expect(target.querySelector('[data-calendar-task]')).toBeNull();

		mockTasks([RENT]);
		vaultStore.bumpVaultIndexVersion(vaultStore.vaultIndexVersion + 1);
		flushSync();
		await settle();

		expect(taskCalls()).toHaveLength(2);
		expect(target.querySelector('[data-calendar-task]')).not.toBeNull();
	});

	it('does not reload the tasks on unrelated settings writes', async () => {
		mockTasks([RENT]);
		mountView();
		await settle();
		expect(taskCalls()).toHaveLength(1);

		settingsStore.updateLayout({ leftPaneSize: 30 });
		settingsStore.updateEventCalendar({ showWeekends: false });
		flushSync();
		await settle();

		expect(taskCalls()).toHaveLength(1);
		expect(target.querySelector('[data-calendar-task]')).not.toBeNull();
	});

	it('hides the overlay and stops loading tasks when the setting is off', async () => {
		mockTasks([RENT]);
		mountView();
		await settle();

		settingsStore.updateEventCalendar({ showTasks: false });
		flushSync();
		expect(target.querySelector('[data-calendar-task]')).toBeNull();
		eventCalendarViewStore.setView('month');
		flushSync();
		expect(target.querySelector('[data-calendar-task]')).toBeNull();

		vaultStore.bumpVaultIndexVersion(vaultStore.vaultIndexVersion + 1);
		flushSync();
		await settle();
		expect(taskCalls()).toHaveLength(1);
	});

	it('toasts when the task index fails and still shows the events', async () => {
		mockTasks(new Error('tasks gone'));
		mountView();
		await settle();

		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(toast.error).toHaveBeenCalledWith('Could not load tasks', { description: 'tasks gone' });
		expect(target.querySelector('[data-calendar-load-error]')).toBeNull();
		expect(target.querySelector('[data-time-grid]')).not.toBeNull();
	});
});

describe('EventCalendarView: needs attention', () => {
	it('lists an actionable issue with its title and reason and opens its note', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Broken'), { date: '2026-11-10', start: 'later' })]);
		mountView();
		await settle();

		expect(text('[data-attention-badge]')).toBe('1 event needs attention');
		const row = target.querySelector<HTMLButtonElement>('[data-attention-list] [data-issue-path]')!;
		expect(row.querySelector('[data-issue-title]')?.textContent).toBe('Broken');
		expect(row.querySelector('[data-issue-reason]')?.textContent).toBe('start is not a valid time (HH:mm)');

		row.click();

		expect(openFileInEditor).toHaveBeenCalledWith(P('Broken'));
	});

	it('names the span problems: an unreadable end_date, an end_date before date and an empty range', async () => {
		vi.mocked(invoke).mockResolvedValue([
			eventEntry(P('Bad end date'), { date: '2026-11-10', end_date: 'soon' }),
			eventEntry(P('Backwards'), { date: '2026-11-10', end_date: '2026-11-09' }),
			eventEntry(P('Empty'), { date: '2026-11-10', start: '10:00', end: '10:00' }),
			eventEntry(P('Trip'), { date: '2026-11-10', end_date: '2026-11-12' }),
		]);
		mountView();
		await settle();

		const reason = (name: string) =>
			target.querySelector(`[data-attention-list] [data-issue-path="${P(name)}"] [data-issue-reason]`)?.textContent;
		expect(text('[data-attention-badge]')).toBe('3 events need attention');
		expect(reason('Bad end date')).toBe('end_date is not YYYY-MM-DD');
		expect(reason('Backwards')).toBe('end_date is before date');
		expect(reason('Empty')).toBe('end is not after start');
		expect(target.querySelector(`[data-issue-path="${P('Trip')}"]`)).toBeNull();
	});

	it('counts only actionable issues and keeps 50 unscheduled notes collapsed', async () => {
		const unscheduled = Array.from({ length: 50 }, (_, i) => eventEntry(P(`Someday ${i}`)));
		vi.mocked(invoke).mockResolvedValue([...unscheduled, eventEntry(P('Broken'), { date: '2026-11-10', start: '25:00' })]);
		mountView();
		await settle();

		expect(eventCalendarStore.attentionCount).toBe(1);
		expect(text('[data-attention-badge]')).toBe('1 event needs attention');
		expect(target.querySelectorAll('[data-attention-list] [data-issue-path]')).toHaveLength(1);
		const details = target.querySelector<HTMLDetailsElement>('details[data-unscheduled]')!;
		expect(details.open).toBe(false);
		expect(details.querySelector('summary')?.textContent).toBe('Unscheduled (50)');
		expect(details.querySelectorAll('[data-issue-path]')).toHaveLength(50);
		expect(details.querySelector('[data-issue-reason]')?.textContent).toBe(
			'add `date:` (and `start` / `end` for a timed event)',
		);
	});

	it('shows only a quiet "N unscheduled" link when nothing is actionable', async () => {
		vi.mocked(invoke).mockResolvedValue([
			eventEntry(P('Someday')),
			eventEntry(P('Bad date'), { date: '10/11/2026' }),
		]);
		mountView();
		await settle();

		expect(target.querySelector('[data-attention-badge]')).toBeNull();
		const link = target.querySelector<HTMLButtonElement>('[data-unscheduled] button')!;
		expect(link.textContent?.trim()).toBe('2 unscheduled');
		expect(target.querySelector('[data-unscheduled-list]')).toBeNull();

		link.click();
		flushSync();

		const reasons = [...target.querySelectorAll('[data-unscheduled-list] [data-issue-reason]')].map((r) => r.textContent);
		expect(reasons).toContain('date is not YYYY-MM-DD');
	});

	it('shows the archived footer when archived events are hidden', async () => {
		vi.mocked(invoke).mockResolvedValue([
			eventEntry(P('Done'), { date: '2026-11-01', start: '09:00' }, { archived: true }),
			eventEntry(P('Done too'), { date: '2026-11-02', start: '09:00' }, { archived: true }),
		]);
		mountView();
		await settle();

		expect(text('[data-archived-footer]')).toBe('2 archived events hidden');
	});
});

describe('EventCalendarView: popover', () => {
	const STANDUP = () => target.querySelector<HTMLElement>(`[data-day-column="2026-11-10"] [data-event-path="${P('Standup')}"]`)!;

	/** Lets bits-ui finish mounting or unmounting the popover. */
	async function settlePopover() {
		await settle();
		await new Promise((r) => setTimeout(r, 0));
		flushSync();
	}

	beforeEach(() => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00' })]);
	});

	it('shows the popover for a clicked block and returns focus to it on Escape', async () => {
		mountView();
		await settle();

		STANDUP().click();
		await settlePopover();
		const card = document.querySelector('[data-event-popover]');
		expect(card?.querySelector('[data-popover-title]')?.textContent?.trim()).toBe('Standup');

		document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settlePopover();

		expect(document.querySelector('[data-event-popover]')).toBeNull();
		expect(document.activeElement).toBe(STANDUP());
	});

	it('closes on a scroll of the time grid inside the view', async () => {
		mountView();
		await settle();
		STANDUP().click();
		await settlePopover();

		target.querySelector('[data-time-grid]')!.dispatchEvent(new Event('scroll'));

		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('focuses the view root when the event leaves the snapshot', async () => {
		mountView();
		await settle();
		STANDUP().click();
		await settlePopover();

		eventCalendarStore.setSnapshot({ events: [], issues: [], archivedCount: 0 }, 99);
		await settlePopover();

		expect(document.activeElement).toBe(target.querySelector('section[data-event-calendar]'));
	});

	it('"Edit" in the popover opens the edit dialog, and Escape returns focus to the block', async () => {
		mountView();
		await settle();
		STANDUP().click();
		await settlePopover();

		const edit = [...document.querySelectorAll<HTMLButtonElement>('[data-event-popover] button')].find((b) => b.textContent?.trim() === 'Edit')!;
		edit.click();
		await settlePopover();

		const dialog = document.querySelector('[data-event-dialog]');
		expect(document.querySelector('[data-event-popover]')).toBeNull();
		expect(dialog?.querySelector<HTMLInputElement>('[data-field="title"]')?.value).toBe('Standup');
		expect(dialog?.contains(document.activeElement)).toBe(true);

		document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settlePopover();

		expect(document.querySelector('[data-event-dialog]')).toBeNull();
		expect(document.activeElement).toBe(STANDUP());
	});

	it('drops an open popover on unmount', async () => {
		mountView();
		await settle();
		STANDUP().click();
		await settlePopover();
		expect(eventCalendarViewStore.popover?.path).toBe(P('Standup'));

		unmountView();

		expect(eventCalendarViewStore.popover).toBeNull();
	});
});

describe('EventCalendarView: keyboard', () => {
	const ROOT = () => target.querySelector<HTMLElement>('section[data-event-calendar]')!;
	const STANDUP = () => target.querySelector<HTMLElement>(`[data-day-column="2026-11-10"] [data-event-path="${P('Standup')}"]`)!;

	/** Dispatches a bubbling keydown on `el` and flushes. */
	function press(el: Element, key: string, mods: KeyboardEventInit = {}) {
		el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...mods }));
		flushSync();
	}

	/** Lets bits-ui finish mounting or unmounting the popover. */
	async function settlePopover() {
		await settle();
		await new Promise((r) => setTimeout(r, 0));
		flushSync();
	}

	it('focuses the view root on mount', async () => {
		mountView();
		await settle();

		expect(document.activeElement).toBe(ROOT());
	});

	it('Cmd+Z with an empty stack shows "Nothing to undo"', async () => {
		mountView();
		await settle();

		press(ROOT(), 'z', { metaKey: true });
		await settle();

		expect(toast).toHaveBeenCalledWith('Nothing to undo');
	});

	it('Shift+Cmd+Z and Ctrl+Y with an empty stack show "Nothing to redo"', async () => {
		mountView();
		await settle();

		press(ROOT(), 'z', { metaKey: true, shiftKey: true });
		press(ROOT(), 'y', { ctrlKey: true });
		await settle();

		expect(vi.mocked(toast).mock.calls).toEqual([['Nothing to redo'], ['Nothing to redo']]);
	});

	it('T, D/W/M and the arrows drive the view store, once per key', async () => {
		mountView();
		await settle();

		press(ROOT(), 'ArrowRight');
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-17');
		press(ROOT(), 'ArrowLeft');
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
		press(ROOT(), 'd');
		expect(eventCalendarViewStore.view).toBe('day');
		press(ROOT(), 'm');
		expect(eventCalendarViewStore.view).toBe('month');
		press(ROOT(), 'w');
		expect(eventCalendarViewStore.view).toBe('week');
		press(ROOT(), 't');
		expect(eventCalendarViewStore.focusedDate).toBe(toKey(new Date()));
	});

	it('keeps the view shortcuts from firing mid-gesture, lets other listeners see the key, and fires them again after the release', async () => {
		mountView();
		await settle();
		const body = target.querySelector<HTMLElement>('[data-time-grid-body]')!;
		const pointer = (type: string) => {
			body.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerType: 'mouse', pointerId: 1 }));
			flushSync();
		};
		const reached: string[] = [];
		const onKey = (e: KeyboardEvent) => reached.push(e.key);
		document.addEventListener('keydown', onKey);

		pointer('pointerdown');
		press(ROOT(), 'm');
		press(ROOT(), 'ArrowRight');
		press(ROOT(), 'z', { metaKey: true });
		await settle();
		expect(eventCalendarViewStore.view).toBe('week');
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
		expect(toast).not.toHaveBeenCalled();
		expect(reached).toEqual(['m', 'ArrowRight', 'z']);

		pointer('pointerup');
		eventCalendarViewStore.closeDialog();
		flushSync();
		press(ROOT(), 'm');
		document.removeEventListener('keydown', onKey);
		expect(eventCalendarViewStore.view).toBe('month');
	});

	it('leaves Enter and Space on a week-strip day to the button, and the arrows step the day from there', async () => {
		mountView();
		await settle();
		eventCalendarViewStore.setView('day');
		flushSync();
		const stripDay = target.querySelector<HTMLButtonElement>('[data-week-strip-day="2026-11-12"]')!;
		stripDay.focus();

		for (const key of ['Enter', ' ']) {
			const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
			stripDay.dispatchEvent(e);
			flushSync();
			expect(e.defaultPrevented).toBe(false);
		}

		press(stripDay, 'ArrowRight');
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-11');
		expect(target.querySelector('[data-week-strip-day="2026-11-11"]')?.getAttribute('aria-pressed')).toBe('true');
	});

	it('leaves the arrows to the D/W/M tablist', async () => {
		mountView();
		await settle();
		const weekTab = target.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1];

		press(weekTab, 'ArrowRight');

		expect(eventCalendarViewStore.view).toBe('month');
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
	});

	it('N opens the create dialog, and letters do nothing while it is open', async () => {
		mountView();
		await settle();

		press(ROOT(), 'n');
		expect(eventCalendarViewStore.dialog?.mode).toBe('create');

		press(ROOT(), 'm');
		expect(eventCalendarViewStore.view).toBe('week');
	});

	it('ignores letters held with Meta', async () => {
		mountView();
		await settle();

		press(ROOT(), 'm', { metaKey: true });

		expect(eventCalendarViewStore.view).toBe('week');
	});

	it('after Escape on an open popover the block has focus and "w" switches to week', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00' })]);
		mountView();
		await settle();
		press(ROOT(), 'd');
		STANDUP().click();
		await settlePopover();
		expect(document.querySelector('[data-event-popover]')).not.toBeNull();

		press(document.activeElement!, 'Escape');
		await settlePopover();

		expect(document.querySelector('[data-event-popover]')).toBeNull();
		expect(document.activeElement).toBe(STANDUP());
		press(document.activeElement!, 'w');
		expect(eventCalendarViewStore.view).toBe('week');
	});

	it('Escape on the focused block closes an open popover', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00' })]);
		mountView();
		await settle();
		eventCalendarViewStore.openPopover(P('Standup'), { x: 0, y: 0, width: 1, height: 1 });
		flushSync();

		press(STANDUP(), 'Escape');

		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('handles a key on <body> but not one in an <input>', async () => {
		mountView();
		await settle();
		ROOT().blur();
		expect(document.activeElement).toBe(document.body);

		press(document.body, 'm');
		expect(eventCalendarViewStore.view).toBe('month');

		const input = document.body.appendChild(document.createElement('input'));
		input.focus();
		press(input, 'w');
		expect(eventCalendarViewStore.view).toBe('month');
	});

	it('ignores a letter typed in an input inside the view', async () => {
		mountView();
		await settle();
		const input = ROOT().appendChild(document.createElement('input'));

		press(input, 'd');

		expect(eventCalendarViewStore.view).toBe('week');
	});

	it('Delete on a focused block deletes that event', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00' })]);
		mountView();
		await settle();
		STANDUP().focus();

		press(STANDUP(), 'Delete');
		await settlePopover();

		expect(toast).toHaveBeenCalledWith('Event deleted', expect.objectContaining({ description: 'Standup', action: { label: 'Undo', onClick: expect.any(Function) } }));
		expect(eventCalendarStore.history.undo.at(-1)).toMatchObject({ kind: 'delete', path: P('Standup') });
		expect(document.activeElement).toBe(ROOT());
	});

	it('Delete with the popover open deletes the popover event and leaves focus on the root', async () => {
		vi.mocked(invoke).mockResolvedValue([
			eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00' }),
			eventEntry(P('Retro'), { date: '2026-11-11', start: '14:00' }),
		]);
		mountView();
		await settle();
		STANDUP().click();
		await settlePopover();
		expect(document.querySelector('[data-event-popover]')).not.toBeNull();

		press(ROOT(), 'Delete');
		await settlePopover();

		expect(document.querySelector('[data-event-popover]')).toBeNull();
		expect(toast).toHaveBeenCalledWith('Event deleted', expect.objectContaining({ description: 'Standup' }));
		expect(eventCalendarStore.history.undo.at(-1)).toMatchObject({ kind: 'delete', path: P('Standup') });
		expect(document.activeElement).toBe(ROOT());
	});

	it('Backspace with no focused block and no popover does nothing', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00' })]);
		mountView();
		await settle();
		const e = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });

		ROOT().dispatchEvent(e);
		await settle();

		expect(e.defaultPrevented).toBe(false);
		expect(toast).not.toHaveBeenCalled();
		expect(eventCalendarStore.history.undo).toHaveLength(0);
		expect(STANDUP()).not.toBeNull();
	});

	it('removes the <body> listener on unmount', async () => {
		mountView();
		await settle();
		unmountView();

		press(document.body, 'm');

		expect(eventCalendarViewStore.view).toBe('week');
	});
});

describe('EventCalendarView: shortcuts help', () => {
	const ROOT = () => target.querySelector<HTMLElement>('section[data-event-calendar]')!;
	const HELP = () => document.querySelector<HTMLElement>('[data-calendar-shortcuts]');
	const BUTTON = () => target.querySelector<HTMLButtonElement>('[data-calendar-shortcuts-button]')!;

	/** Dispatches a bubbling keydown on `el` and flushes. */
	function press(el: Element, key: string, mods: KeyboardEventInit = {}) {
		el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...mods }));
		flushSync();
	}

	/** Lets bits-ui mount or unmount the dialog; its open auto-focus runs on the next animation frame. */
	async function settleDialog() {
		await settle();
		await new Promise((r) => requestAnimationFrame(() => r(undefined)));
		flushSync();
	}

	it('? opens the help listing every chord and label of the key table', async () => {
		mountView();
		await settle();

		press(ROOT(), '?', { shiftKey: true });
		await settleDialog();

		const help = HELP();
		expect(help).not.toBeNull();
		expect(help!.contains(document.activeElement)).toBe(true);
		const rows = [...help!.querySelectorAll('[data-shortcut]')].map((tr) => ({
			keys: [...tr.querySelectorAll('kbd')].map((k) => k.textContent?.trim()),
			label: tr.querySelectorAll('td')[1]?.textContent?.trim(),
		}));
		expect(rows).toEqual(CALENDAR_SHORTCUTS.map((r) => ({ keys: [...r.keys], label: r.label })));
	});

	it('Escape closes the help and returns focus to the view root', async () => {
		mountView();
		await settle();
		press(ROOT(), '?');
		await settleDialog();
		expect(HELP()!.contains(document.activeElement)).toBe(true);

		press(document.activeElement!, 'Escape');
		await settleDialog();

		expect(HELP()).toBeNull();
		expect(eventCalendarViewStore.helpOpen).toBe(false);
		expect(document.activeElement).toBe(ROOT());
	});

	it('the header button opens the help, and Escape returns focus to the button', async () => {
		mountView();
		await settle();
		expect(BUTTON().getAttribute('aria-keyshortcuts')).toBe('?');

		BUTTON().focus();
		BUTTON().click();
		await settleDialog();
		expect(HELP()!.contains(document.activeElement)).toBe(true);

		press(document.activeElement!, 'Escape');
		await settleDialog();

		expect(HELP()).toBeNull();
		expect(document.activeElement).toBe(BUTTON());
	});

	it('view shortcuts do nothing while the help is open', async () => {
		mountView();
		await settle();
		press(ROOT(), '?');
		await settleDialog();

		press(ROOT(), 'm');
		press(ROOT(), 'n');

		expect(eventCalendarViewStore.view).toBe('week');
		expect(eventCalendarViewStore.dialog).toBeNull();
	});
});

describe('EventCalendarView: focus request', () => {
	const STANDUP = () => target.querySelector<HTMLElement>(`[data-event-path="${P('Standup')}"]`);
	const ENTRIES = [
		eventEntry(P('Standup'), { date: '2026-11-24', start: '09:00', end: '10:00' }),
		eventEntry(P('Other'), { date: '2026-11-24', start: '11:00', end: '12:00' }),
	];

	it('focuses and pulses the requested block once the events load, then drops the request', async () => {
		vi.mocked(invoke).mockResolvedValue(ENTRIES);
		await openEventInCalendar(P('Standup'));
		mountView();
		await settle();
		await settle();

		const block = STANDUP();
		expect(block?.closest('[data-day-column]')?.getAttribute('data-day-column')).toBe('2026-11-24');
		expect(document.activeElement).toBe(block);
		expect(block?.hasAttribute('data-event-pulse')).toBe(true);
		expect(target.querySelectorAll('[data-event-pulse]')).toHaveLength(1);
		expect(eventCalendarViewStore.focusRequest).toBeNull();
	});

	it('pulses once: the attribute goes after the animation', async () => {
		vi.mocked(invoke).mockResolvedValue(ENTRIES);
		mountView();
		await settle();
		vi.useFakeTimers();
		try {
			eventCalendarViewStore.setDate('2026-11-24');
			eventCalendarViewStore.requestFocus(P('Standup'));
			flushSync();
			await vi.advanceTimersByTimeAsync(0);
			expect(STANDUP()?.hasAttribute('data-event-pulse')).toBe(true);

			await vi.advanceTimersByTimeAsync(2000);
			expect(STANDUP()?.hasAttribute('data-event-pulse')).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it('focuses a block in an already mounted view, in the month grid too', async () => {
		vi.mocked(invoke).mockResolvedValue(ENTRIES);
		mountView();
		await settle();
		eventCalendarViewStore.setView('month');
		flushSync();

		await openEventInCalendar(P('Standup'));
		await settle();

		expect(eventCalendarViewStore.view).toBe('month');
		expect(document.activeElement).toBe(STANDUP());
		expect(STANDUP()?.hasAttribute('data-event-pulse')).toBe(true);
	});

	it('keeps the request while the load is in flight and drops it on navigation', async () => {
		const load = deferred<unknown>();
		vi.mocked(invoke).mockReturnValue(load.promise);
		eventCalendarViewStore.requestFocus(P('Standup'));
		mountView();
		await settle();

		expect(eventCalendarStore.isLoading).toBe(true);
		expect(eventCalendarViewStore.focusRequest?.path).toBe(P('Standup'));
		expect(target.querySelector('[data-event-pulse]')).toBeNull();

		eventCalendarViewStore.step(1);
		flushSync();
		expect(eventCalendarViewStore.focusRequest).toBeNull();
		load.resolve([]);
		await settle();
	});

	it('drops the request once a completed load has no block for it, so a later load cannot steal focus', async () => {
		vi.mocked(invoke).mockResolvedValue([]);
		mountView();
		await settle();
		eventCalendarViewStore.setDate('2026-11-24');
		eventCalendarViewStore.requestFocus(P('Standup'));
		await settle();

		expect(eventCalendarViewStore.focusRequest).toBeNull();

		// The event appears later: it renders, but nothing focuses or pulses it.
		vaultStore.bumpVaultIndexVersion(2);
		vi.mocked(invoke).mockResolvedValue(ENTRIES);
		await settle();
		await settle();
		expect(STANDUP()).not.toBeNull();
		expect(document.activeElement).not.toBe(STANDUP());
		expect(target.querySelector('[data-event-pulse]')).toBeNull();
	});

	it('focuses and pulses the all-day "+N" control for an event it hides, in the day view too', async () => {
		vi.mocked(invoke).mockResolvedValue([
			eventEntry(P('A'), { date: '2026-11-24' }),
			eventEntry(P('B'), { date: '2026-11-24' }),
			eventEntry(P('C'), { date: '2026-11-24' }),
			eventEntry(P('D'), { date: '2026-11-24' }),
		]);
		eventCalendarViewStore.initFromSettings();
		eventCalendarViewStore.setView('day');
		await openEventInCalendar(P('D'));
		mountView();
		await settle();
		await settle();

		const more = target.querySelector<HTMLElement>('[data-all-day-cell="2026-11-24"] [data-all-day-more]');
		expect(target.querySelector(`[data-event-path="${P('D')}"]`)).toBeNull();
		expect(more).not.toBeNull();
		expect(document.activeElement).toBe(more);
		expect(more?.hasAttribute('data-event-pulse')).toBe(true);
		expect(target.querySelectorAll('[data-event-pulse]')).toHaveLength(1);
		expect(eventCalendarViewStore.focusRequest).toBeNull();
	});

	it('drops the request on unmount', async () => {
		mountView();
		eventCalendarViewStore.requestFocus(P('Standup'));
		unmountView();

		expect(eventCalendarViewStore.focusRequest).toBeNull();
	});
});

describe('EventCalendarView: lifecycle', () => {
	it('closes the popover, the dialog and the shortcuts help on unmount', async () => {
		eventCalendarViewStore.openPopover(P('a'), { x: 1, y: 2, width: 3, height: 4 });
		eventCalendarViewStore.openDialog({ mode: 'edit', path: P('a') });
		eventCalendarViewStore.openHelp();
		mountView();
		unmountView();
		mountView();

		expect(eventCalendarViewStore.popover).toBeNull();
		expect(eventCalendarViewStore.dialog).toBeNull();
		expect(eventCalendarViewStore.helpOpen).toBe(false);
	});

	it('holds the clock while mounted', async () => {
		eventCalendarViewStore.setNow(0);
		mountView();

		expect(eventCalendarViewStore.nowMs).toBeGreaterThan(0);
	});

	it('releases the clock on unmount', async () => {
		vi.useFakeTimers();
		try {
			mountView();
			unmountView();
			eventCalendarViewStore.setNow(0);

			vi.advanceTimersByTime(61_000);
			window.dispatchEvent(new Event('focus'));

			expect(eventCalendarViewStore.nowMs).toBe(0);
		} finally {
			vi.useRealTimers();
		}
	});
});
