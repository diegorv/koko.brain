// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';
setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { EVENT_CALENDAR_VIRTUAL_PATH } from '$lib/core/editor/editor.logic';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { invalidateVaultEntries } from '$lib/core/vault/vault-entries.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import {
	acquireCalendarClock,
	closeEventCalendarTab,
	loadEvents,
	openEventCalendarTab,
	resetEventCalendar,
	toggleEventCalendarTab,
} from '$lib/features/event-calendar/event-calendar.service';
import { eventCalendarStore } from '$lib/features/event-calendar/event-calendar.store.svelte';
import { eventCalendarViewStore } from '$lib/features/event-calendar/event-calendar-view.store.svelte';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import { eventEntry } from '../../../fixtures/event-notes.fixture';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const VAULT = '/vault';
const P = (name: string) => `${VAULT}/${name}.md`;
const RECT = { x: 1, y: 2, width: 3, height: 4 };

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

/** Adds an unrelated markdown tab so the Calendar tab is not alone. */
function addNoteTab(path = P('note')) {
	editorStore.addTab({ path, name: 'note.md', content: '', savedContent: '' });
}

/** Tabs at the Calendar virtual path. */
function calendarTabs() {
	return editorStore.tabs.filter((t) => t.path === EVENT_CALENDAR_VIRTUAL_PATH);
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	clearLocalStorage();
	invalidateVaultEntries();
	vaultStore._reset();
	vaultStore.open(VAULT);
	settingsStore.reset();
	editorStore.reset();
	resetEventCalendar();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('Calendar tab openers', () => {
	it('opens a singleton "Calendar" tab and makes it active', () => {
		addNoteTab();
		openEventCalendarTab();
		expect(calendarTabs()).toHaveLength(1);
		expect(editorStore.activeTab).toMatchObject({
			path: EVENT_CALENDAR_VIRTUAL_PATH,
			name: 'Calendar',
			fileType: 'event-calendar',
			content: '',
			savedContent: '',
		});
	});

	it('focuses the existing tab instead of opening a second one', () => {
		openEventCalendarTab();
		addNoteTab();
		expect(editorStore.activeIndex).toBe(1);
		openEventCalendarTab();
		expect(calendarTabs()).toHaveLength(1);
		expect(editorStore.tabs).toHaveLength(2);
		expect(editorStore.activeIndex).toBe(0);
	});

	it('applies date and view when given, closing the popover', () => {
		eventCalendarViewStore.openPopover(P('a'), RECT);
		openEventCalendarTab({ date: '2026-11-10', view: 'month' });
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
		expect(eventCalendarViewStore.view).toBe('month');
		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('leaves the view store alone when neither date nor view is given', () => {
		eventCalendarViewStore.setDate('2026-01-05');
		eventCalendarViewStore.setView('day');
		eventCalendarViewStore.openPopover(P('a'), RECT);
		openEventCalendarTab();
		expect(eventCalendarViewStore.focusedDate).toBe('2026-01-05');
		expect(eventCalendarViewStore.view).toBe('day');
		expect(eventCalendarViewStore.popover).not.toBeNull();
	});

	it('applies date and view when focusing an already open tab', () => {
		openEventCalendarTab();
		addNoteTab();
		openEventCalendarTab({ date: '2026-12-01', view: 'day' });
		expect(editorStore.activeTab?.path).toBe(EVENT_CALENDAR_VIRTUAL_PATH);
		expect(eventCalendarViewStore.focusedDate).toBe('2026-12-01');
		expect(eventCalendarViewStore.view).toBe('day');
	});

	it('toggle opens the tab when it is closed', () => {
		toggleEventCalendarTab();
		expect(calendarTabs()).toHaveLength(1);
		expect(editorStore.activeTab?.path).toBe(EVENT_CALENDAR_VIRTUAL_PATH);
	});

	it('toggle closes the tab when it is active', () => {
		addNoteTab();
		openEventCalendarTab();
		toggleEventCalendarTab();
		expect(calendarTabs()).toHaveLength(0);
		expect(editorStore.activeTab?.path).toBe(P('note'));
	});

	it('toggle focuses the tab when it is open but not active', () => {
		openEventCalendarTab();
		addNoteTab();
		toggleEventCalendarTab();
		expect(calendarTabs()).toHaveLength(1);
		expect(editorStore.activeIndex).toBe(0);
	});

	it('close removes the tab and is a no-op when there is none', () => {
		addNoteTab();
		openEventCalendarTab();
		closeEventCalendarTab();
		expect(calendarTabs()).toHaveLength(0);
		expect(editorStore.tabs).toHaveLength(1);
		closeEventCalendarTab();
		expect(editorStore.tabs).toHaveLength(1);
	});
});

describe('loadEvents', () => {
	it('projects the vault entries snapshot into the store', async () => {
		vaultStore.bumpVaultIndexVersion(5);
		vi.mocked(invoke).mockResolvedValue([
			eventEntry(P('Standup'), { date: '2026-11-10', start: '09:30', end: '10:00' }),
			eventEntry(P('Retro'), { date: '2026-11-09', start: '14:00', end: '15:00' }),
			entryV2(P('plain note')),
		]);

		await loadEvents();

		expect(invoke).toHaveBeenCalledWith('get_all_vault_entries_v2');
		expect(eventCalendarStore.events.map((e) => e.path)).toEqual([P('Retro'), P('Standup')]);
		expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ title: 'Standup', start: 570, end: 600 });
		expect(eventCalendarStore.snapshotVersion).toBe(5);
		expect(eventCalendarStore.isLoading).toBe(false);
		expect(eventCalendarStore.loadError).toBeNull();
	});

	it('uses the duration and color defaults from settings', async () => {
		settingsStore.updateEventCalendar({ defaultDurationMinutes: 30, defaultColor: 'green' });
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('a'), { date: '2026-11-10', start: '09:00' })]);

		await loadEvents();

		expect(eventCalendarStore.eventByPath(P('a'))).toMatchObject({ start: 540, end: 570, color: 'green' });
	});

	it('loads an empty vault as an empty calendar', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await loadEvents();

		expect(eventCalendarStore.events).toEqual([]);
		expect(eventCalendarStore.issues).toEqual([]);
		expect(eventCalendarStore.archivedCount).toBe(0);
		expect(eventCalendarStore.loadError).toBeNull();
	});

	it('leaves the events untouched, sets loadError and rethrows when the IPC rejects', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([eventEntry(P('a'), { date: '2026-11-10' })]);
		await loadEvents();
		const before = eventCalendarStore.events;

		vaultStore.bumpVaultIndexVersion(2);
		vi.mocked(invoke).mockRejectedValueOnce(new Error('index gone'));

		await expect(loadEvents()).rejects.toThrow('index gone');
		expect(eventCalendarStore.events).toBe(before);
		expect(eventCalendarStore.snapshotVersion).toBe(0);
		expect(eventCalendarStore.loadError).toBe('index gone');
		expect(eventCalendarStore.isLoading).toBe(false);
		expect(console.error).toHaveBeenCalled();
	});

	it('clears a previous loadError on the next successful load', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('boom'));
		await expect(loadEvents()).rejects.toThrow('boom');
		expect(eventCalendarStore.loadError).toBe('boom');

		vi.mocked(invoke).mockResolvedValueOnce([]);
		await loadEvents();
		expect(eventCalendarStore.loadError).toBeNull();
	});

	it('discards a result that lands after resetEventCalendar', async () => {
		const pending = deferred<NoteEntryV2[]>();
		vi.mocked(invoke).mockReturnValueOnce(pending.promise);

		const load = loadEvents();
		expect(eventCalendarStore.isLoading).toBe(true);
		resetEventCalendar();
		pending.resolve([eventEntry(P('a'), { date: '2026-11-10' })]);
		await load;

		expect(eventCalendarStore.events).toEqual([]);
		expect(eventCalendarStore.isLoading).toBe(false);
	});

	it('discards a failure that lands after resetEventCalendar, but still rethrows', async () => {
		const pending = deferred<NoteEntryV2[]>();
		vi.mocked(invoke).mockReturnValueOnce(pending.promise);

		const load = loadEvents();
		resetEventCalendar();
		pending.reject(new Error('late'));

		await expect(load).rejects.toThrow('late');
		expect(eventCalendarStore.loadError).toBeNull();
	});

	it('keeps the latest load when an earlier one resolves last', async () => {
		const first = deferred<NoteEntryV2[]>();
		const second = deferred<NoteEntryV2[]>();
		vaultStore.bumpVaultIndexVersion(1);
		vi.mocked(invoke).mockReturnValueOnce(first.promise);
		const load1 = loadEvents();
		vaultStore.bumpVaultIndexVersion(2);
		vi.mocked(invoke).mockReturnValueOnce(second.promise);
		const load2 = loadEvents();

		second.resolve([eventEntry(P('new'), { date: '2026-11-10' })]);
		await load2;
		first.resolve([eventEntry(P('old'), { date: '2026-11-10' })]);
		await load1;

		expect(eventCalendarStore.events.map((e) => e.path)).toEqual([P('new')]);
		expect(eventCalendarStore.snapshotVersion).toBe(2);
	});

	it('discards a result read for a vault that is no longer open', async () => {
		const pending = deferred<NoteEntryV2[]>();
		vi.mocked(invoke).mockReturnValueOnce(pending.promise);

		const load = loadEvents();
		vaultStore.open('/other');
		pending.resolve([eventEntry(P('a'), { date: '2026-11-10' })]);
		await load;

		expect(eventCalendarStore.events).toEqual([]);
	});

	it('leaves out templates under the system folder and archived events', async () => {
		vi.mocked(invoke).mockResolvedValue([
			eventEntry(P('Standup'), { date: '2026-11-10' }),
			eventEntry(`${VAULT}/_system/templates/Event.md`, { date: '2026-11-10' }),
			eventEntry(P('Old'), { date: '2026-11-01' }, { archived: true }),
		]);

		await loadEvents();

		expect(eventCalendarStore.events.map((e) => e.path)).toEqual([P('Standup')]);
		expect(eventCalendarStore.archivedCount).toBe(1);
	});

	it('loads only notes of the configured event type', async () => {
		settingsStore.updateEventCalendar({ eventTypeName: 'Meeting' });
		vi.mocked(invoke).mockResolvedValue([
			eventEntry(P('Event note'), { date: '2026-11-10' }),
			eventEntry(P('Meeting note'), { _type: 'Meeting', date: '2026-11-10' }),
		]);

		await loadEvents();

		expect(eventCalendarStore.events.map((e) => e.path)).toEqual([P('Meeting note')]);
	});
});

describe('acquireCalendarClock', () => {
	const T0 = new Date(2026, 10, 10, 9, 0).getTime();

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		eventCalendarViewStore.setNow(0);
	});

	it('ticks on acquire and every 30 seconds', () => {
		const release = acquireCalendarClock();
		expect(eventCalendarViewStore.nowMs).toBe(T0);

		vi.advanceTimersByTime(29_999);
		expect(eventCalendarViewStore.nowMs).toBe(T0);
		vi.advanceTimersByTime(1);
		expect(eventCalendarViewStore.nowMs).toBe(T0 + 30_000);
		release();
	});

	it('re-ticks on window focus and on visibilitychange', () => {
		const release = acquireCalendarClock();

		vi.setSystemTime(T0 + 86_400_000);
		window.dispatchEvent(new Event('focus'));
		expect(eventCalendarViewStore.nowMs).toBe(T0 + 86_400_000);

		vi.setSystemTime(T0 + 2 * 86_400_000);
		document.dispatchEvent(new Event('visibilitychange'));
		expect(eventCalendarViewStore.nowMs).toBe(T0 + 2 * 86_400_000);
		release();
	});

	it('the last release clears the interval and both listeners', () => {
		const release = acquireCalendarClock();
		release();
		expect(vi.getTimerCount()).toBe(0);

		const stoppedAt = eventCalendarViewStore.nowMs;
		vi.setSystemTime(T0 + 60_000);
		vi.advanceTimersByTime(60_000);
		window.dispatchEvent(new Event('focus'));
		document.dispatchEvent(new Event('visibilitychange'));
		expect(eventCalendarViewStore.nowMs).toBe(stoppedAt);
	});

	it('a double release is a no-op and two acquirers keep the clock until both release', () => {
		const a = acquireCalendarClock();
		const b = acquireCalendarClock();
		expect(vi.getTimerCount()).toBe(1);

		a();
		a();
		vi.advanceTimersByTime(30_000);
		expect(eventCalendarViewStore.nowMs).toBe(T0 + 30_000);

		b();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('never counts below zero: extra releases do not stop a later acquirer', () => {
		const a = acquireCalendarClock();
		a();
		a();
		const b = acquireCalendarClock();
		expect(vi.getTimerCount()).toBe(1);
		vi.advanceTimersByTime(30_000);
		expect(eventCalendarViewStore.nowMs).toBe(T0 + 30_000);
		b();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('resetEventCalendar never touches the clock', () => {
		const a = acquireCalendarClock();
		resetEventCalendar();
		vi.advanceTimersByTime(30_000);
		expect(eventCalendarViewStore.nowMs).toBe(T0 + 30_000);
		a();

		const b = acquireCalendarClock();
		vi.advanceTimersByTime(30_000);
		expect(eventCalendarViewStore.nowMs).toBe(T0 + 60_000);
		b();
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe('resetEventCalendar', () => {
	it('resets the data and view stores', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('a'), { date: '2026-11-10' })]);
		await loadEvents();
		eventCalendarViewStore.setView('month');
		eventCalendarViewStore.openPopover(P('a'), RECT);

		resetEventCalendar();

		expect(eventCalendarStore.events).toEqual([]);
		expect(eventCalendarViewStore.view).toBe('week');
		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('leaves editor tabs alone', () => {
		openEventCalendarTab();
		resetEventCalendar();
		expect(calendarTabs()).toHaveLength(1);
	});
});
