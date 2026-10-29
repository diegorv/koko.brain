// @vitest-environment jsdom
import dayjs from 'dayjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';
setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
	readDir: vi.fn(),
	mkdir: vi.fn(),
	rename: vi.fn(),
	remove: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), dismiss: vi.fn() }),
}));

// `renameItem` runs the full path-change owner (tree refresh, link rewrite,
// Rust re-key); the write tests replace it with a move on the fake disk.
vi.mock('$lib/core/filesystem/fs.service', async () => {
	const actual = await vi.importActual<typeof import('$lib/core/filesystem/fs.service')>('$lib/core/filesystem/fs.service');
	return { ...actual, renameItem: vi.fn() };
});

import { invoke } from '@tauri-apps/api/core';
import { exists, mkdir, readDir, readTextFile, remove, rename, writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { deleteItem, moveItem, renameItem } from '$lib/core/filesystem/fs.service';
import { resetHooks } from '$lib/core/editor/editor.hooks';
import { clearAllIndexed } from '$lib/utils/index-dedupe';
import { _resetParseFrontmatterCache } from '$lib/features/properties/properties.logic';
import { FrontmatterWriteError } from '$lib/features/properties/frontmatter-write.service';
import { EVENT_CALENDAR_VIRTUAL_PATH } from '$lib/core/editor/editor.logic';
import { getFileName } from '$lib/core/filesystem/fs.logic';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { invalidateVaultEntries } from '$lib/core/vault/vault-entries.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { switchVault } from '$lib/core/vault/vault.service';
import { trashStore } from '$lib/core/trash/trash.store.svelte';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import {
	acquireCalendarClock,
	closeEventCalendarTab,
	createEvent,
	deleteEvent,
	deleteEventFromUi,
	drainEventCalendarWrites,
	duplicateEvent,
	duplicateEventFromUi,
	editEvent,
	EventCalendarError,
	eventErrorMessage,
	findCalendarEvent,
	loadCalendarTasks,
	loadEvents,
	moveEvent,
	moveEventToDay,
	openEventCalendarTab,
	openEventInCalendar,
	openNewEventDialog,
	redoEventChange,
	redoEventChangeFromUi,
	registerEventCalendarPathChangeConsumer,
	resetEventCalendar,
	resizeEvent,
	restoreDeletedEvent,
	toastEventError,
	toggleEventCalendarTab,
	undoDeleteEvent,
	undoEventChange,
	undoEventChangeFromUi,
	updateEventFields,
} from '$lib/features/event-calendar/event-calendar.service';
import { eventState } from '$lib/features/event-calendar/event-calendar-event.logic';
import { eventCalendarStore } from '$lib/features/event-calendar/event-calendar.store.svelte';
import { eventCalendarViewStore } from '$lib/features/event-calendar/event-calendar-view.store.svelte';
import type { EventDraft } from '$lib/features/event-calendar/event-calendar.types';
import type { FileTaskGroupV2, NoteEntryV2 } from '$lib/types/vault-v2.types';
import { eventEntry, eventEntryFromContent, eventNote } from '../../../fixtures/event-notes.fixture';
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

	it('keeps an explicit view when the tab first mounts and applies the default view', () => {
		settingsStore.updateEventCalendar({ defaultView: 'week' });
		openEventCalendarTab({ date: '2026-11-24', view: 'day' });
		// EventCalendarView's onMount
		eventCalendarViewStore.initFromSettings();
		expect(eventCalendarViewStore.view).toBe('day');
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-24');
	});

	it('still applies the default view on first mount when no view is given', () => {
		settingsStore.updateEventCalendar({ defaultView: 'month' });
		openEventCalendarTab({ date: '2026-11-24' });
		eventCalendarViewStore.initFromSettings();
		expect(eventCalendarViewStore.view).toBe('month');
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

describe('findCalendarEvent', () => {
	it('finds an event note through the vault entries snapshot when nothing is loaded', async () => {
		vi.mocked(invoke).mockResolvedValue([
			eventEntry(P('Standup'), { date: '2026-11-10', start: '09:30', end: '10:00' }),
			entryV2(P('plain note')),
		]);

		expect(await findCalendarEvent(P('Standup'))).toMatchObject({ path: P('Standup'), date: '2026-11-10', start: 570 });
		expect(await findCalendarEvent(P('plain note'))).toBeNull();
		expect(await findCalendarEvent(P('missing'))).toBeNull();
		// One snapshot read and one projection serve every lookup at one index version.
		expect(invoke).toHaveBeenCalledTimes(1);
	});

	it('returns null for an empty vault', async () => {
		vi.mocked(invoke).mockResolvedValue([]);
		expect(await findCalendarEvent(P('Standup'))).toBeNull();
	});

	it('prefers the loaded store, which carries pending writes', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:30', end: '10:00' })]);
		await loadEvents();
		const loaded = eventCalendarStore.eventByPath(P('Standup'))!;
		eventCalendarStore.putPending({ kind: 'update', path: P('Standup'), state: { ...eventState(loaded), date: '2026-11-11' }, settled: false });

		expect(await findCalendarEvent(P('Standup'))).toMatchObject({ date: '2026-11-11' });
	});

	it('reads the snapshot over a store left stale by an unmounted Calendar', async () => {
		vaultStore.bumpVaultIndexVersion(1);
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:30', end: '10:00' })]);
		await loadEvents();
		// The event moved while the Calendar was not mounted: no reload followed.
		vaultStore.bumpVaultIndexVersion(5);
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-20', start: '09:30', end: '10:00' })]);

		expect(await findCalendarEvent(P('Standup'))).toMatchObject({ date: '2026-11-20' });
		expect(await openEventInCalendar(P('Standup'))).toBe(true);
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-20');
	});

	it('finds nothing for a note a stale store still holds as an event', async () => {
		vaultStore.bumpVaultIndexVersion(1);
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10' })]);
		await loadEvents();
		vaultStore.bumpVaultIndexVersion(5);
		vi.mocked(invoke).mockResolvedValue([entryV2(P('Standup'))]);
		addNoteTab();

		expect(await findCalendarEvent(P('Standup'))).toBeNull();
		expect(await openEventInCalendar(P('Standup'))).toBe(false);
		expect(calendarTabs()).toHaveLength(0);
	});

	it('keeps a pending write of a stale store over the snapshot', async () => {
		vaultStore.bumpVaultIndexVersion(1);
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:30', end: '10:00' })]);
		await loadEvents();
		const loaded = eventCalendarStore.eventByPath(P('Standup'))!;
		eventCalendarStore.putPending({ kind: 'update', path: P('Standup'), state: { ...eventState(loaded), date: '2026-11-12' }, settled: false });
		vaultStore.bumpVaultIndexVersion(5);

		const found = await findCalendarEvent(P('Standup'));
		expect(found).toMatchObject({ date: '2026-11-12' });
		expect(found).not.toHaveProperty('pending');
	});

	it('finds nothing at the old path of a rename or delete tombstone in a stale store', async () => {
		vaultStore.bumpVaultIndexVersion(1);
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:30', end: '10:00' })]);
		await loadEvents();
		eventCalendarStore.remapPath(P('Standup'), P('Daily'), 1);
		// The store goes stale and the entries snapshot has not caught up with the rename.
		vaultStore.bumpVaultIndexVersion(2);
		addNoteTab();

		expect(await findCalendarEvent(P('Standup'))).toBeNull();
		expect(await openEventInCalendar(P('Standup'))).toBe(false);
		expect(calendarTabs()).toHaveLength(0);
		expect(await findCalendarEvent(P('Daily'))).toMatchObject({ path: P('Daily'), date: '2026-11-10' });
	});

	it('finds a note restored at the path of an expired delete tombstone in a stale store', async () => {
		vaultStore.bumpVaultIndexVersion(1);
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-20' })]);
		await loadEvents();
		eventCalendarStore.putPending({ kind: 'delete', path: P('Standup'), settled: true, settledAtVersion: 1 });
		// The Calendar tab closed; the note came back from the Trash panel since.
		vaultStore.bumpVaultIndexVersion(50);

		expect(await findCalendarEvent(P('Standup'))).toMatchObject({ path: P('Standup'), date: '2026-11-20' });
	});

	it('still hides a delete tombstone the stale store would keep', async () => {
		vaultStore.bumpVaultIndexVersion(1);
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-20' })]);
		await loadEvents();
		eventCalendarStore.putPending({ kind: 'delete', path: P('Standup'), settled: true, settledAtVersion: 1 });
		vaultStore.bumpVaultIndexVersion(2);

		expect(await findCalendarEvent(P('Standup'))).toBeNull();
	});

	it('judges a delete tombstone by the index version of the snapshot it read, not a bump during the read', async () => {
		vaultStore.bumpVaultIndexVersion(1);
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-20' })]);
		await loadEvents();
		eventCalendarStore.putPending({ kind: 'delete', path: P('Standup'), settled: true, settledAtVersion: 1 });
		vaultStore.bumpVaultIndexVersion(2);
		// The index bumps while the version-2 snapshot is read.
		vi.mocked(invoke).mockImplementation(async () => {
			vaultStore.bumpVaultIndexVersion(3);
			return [eventEntry(P('Standup'), { date: '2026-11-20' })];
		});

		expect(await findCalendarEvent(P('Standup'))).toBeNull();
	});

	it('reads the snapshot when a projection setting changed after the load', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('m'), { _type: 'Meeting', date: '2026-11-10' })]);
		await loadEvents();
		expect(await findCalendarEvent(P('m'))).toBeNull();

		settingsStore.updateEventCalendar({ eventTypeName: 'Meeting' });
		expect(await findCalendarEvent(P('m'))).toMatchObject({ date: '2026-11-10' });
	});

	it('re-projects when the index version or a projection setting changes', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([eventEntry(P('a'), { date: '2026-11-10' })]);
		expect(await findCalendarEvent(P('a'))).not.toBeNull();

		vaultStore.bumpVaultIndexVersion(2);
		vi.mocked(invoke).mockResolvedValueOnce([eventEntry(P('a'), { date: '2026-11-10' }, { archived: true })]);
		expect(await findCalendarEvent(P('a'))).toBeNull();

		vaultStore.bumpVaultIndexVersion(3);
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('m'), { _type: 'Meeting', date: '2026-11-10' })]);
		expect(await findCalendarEvent(P('m'))).toBeNull();
		settingsStore.updateEventCalendar({ eventTypeName: 'Meeting' });
		expect(await findCalendarEvent(P('m'))).not.toBeNull();
	});

	it('propagates an IPC rejection', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('index gone'));
		await expect(findCalendarEvent(P('a'))).rejects.toThrow('index gone');
	});
});

describe('openEventInCalendar', () => {
	it('opens the Calendar on the event day in the current view and asks for focus', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:30', end: '10:00' })]);
		addNoteTab();
		eventCalendarViewStore.initFromSettings();
		eventCalendarViewStore.setView('month');
		eventCalendarViewStore.openPopover(P('other'), RECT);

		expect(await openEventInCalendar(P('Standup'))).toBe(true);

		expect(editorStore.activeTab?.path).toBe(EVENT_CALENDAR_VIRTUAL_PATH);
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
		expect(eventCalendarViewStore.view).toBe('month');
		expect(eventCalendarViewStore.popover).toBeNull();
		expect(eventCalendarViewStore.focusRequest?.path).toBe(P('Standup'));
	});

	it('applies the default view on first open', async () => {
		settingsStore.updateEventCalendar({ defaultView: 'day' });
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10' })]);

		await openEventInCalendar(P('Standup'));
		// EventCalendarView's onMount
		eventCalendarViewStore.initFromSettings();

		expect(eventCalendarViewStore.view).toBe('day');
		expect(eventCalendarViewStore.focusRequest?.path).toBe(P('Standup'));
	});

	it('switches the month view to the day view for an event behind "+N more"', async () => {
		vi.mocked(invoke).mockResolvedValue([
			eventEntry(P('a'), { date: '2026-11-10', start: '08:00', end: '09:00' }),
			eventEntry(P('b'), { date: '2026-11-10', start: '09:00', end: '10:00' }),
			eventEntry(P('c'), { date: '2026-11-10', start: '10:00', end: '11:00' }),
			eventEntry(P('d'), { date: '2026-11-10', start: '11:00', end: '12:00' }),
		]);
		eventCalendarViewStore.initFromSettings();
		eventCalendarViewStore.setView('month');

		await openEventInCalendar(P('c'));
		expect(eventCalendarViewStore.view).toBe('month');

		await openEventInCalendar(P('d'));
		expect(eventCalendarViewStore.view).toBe('day');
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
		expect(eventCalendarViewStore.focusRequest?.path).toBe(P('d'));
	});

	it('switches to the day view when hidden weekends would hide the event', async () => {
		settingsStore.updateEventCalendar({ showWeekends: false, defaultView: 'week' });
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Brunch'), { date: '2026-11-14', start: '11:00' })]);

		await openEventInCalendar(P('Brunch'));

		expect(eventCalendarViewStore.view).toBe('day');
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-14');
	});

	it('leaves the tabs and the view alone for a note that is not an event', async () => {
		vi.mocked(invoke).mockResolvedValue([entryV2(P('plain note'))]);
		addNoteTab();
		eventCalendarViewStore.setDate('2026-01-05');

		expect(await openEventInCalendar(P('plain note'))).toBe(false);

		expect(calendarTabs()).toHaveLength(0);
		expect(eventCalendarViewStore.focusedDate).toBe('2026-01-05');
		expect(eventCalendarViewStore.focusRequest).toBeNull();
	});

	it('propagates an IPC rejection without opening the tab', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('index gone'));
		await expect(openEventInCalendar(P('a'))).rejects.toThrow('index gone');
		expect(calendarTabs()).toHaveLength(0);
	});
});

describe('openNewEventDialog', () => {
	it('opens the Calendar tab and the create dialog at now, rounded, on today', () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(2026, 10, 10, 10, 7));
		eventCalendarViewStore.setDate('2026-11-10');

		openNewEventDialog();

		expect(editorStore.activeTab?.path).toBe(EVENT_CALENDAR_VIRTUAL_PATH);
		expect(eventCalendarViewStore.dialog?.payload).toEqual({
			mode: 'create',
			date: '2026-11-10',
			start: 600,
			end: 600 + settingsStore.eventCalendar.defaultDurationMinutes,
		});
	});

	it('uses dayStartHour on a day other than today', () => {
		settingsStore.updateEventCalendar({ dayStartHour: 8 });
		eventCalendarViewStore.setDate('2000-01-03');

		openNewEventDialog();

		expect(eventCalendarViewStore.dialog?.payload).toMatchObject({ mode: 'create', date: '2000-01-03', start: 480 });
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
		expect(eventCalendarStore.isLoading).toBe(false);
	});

	it('discards a failure read for a vault that is no longer open, but clears isLoading and rethrows', async () => {
		const pending = deferred<NoteEntryV2[]>();
		vi.mocked(invoke).mockReturnValueOnce(pending.promise);

		const load = loadEvents();
		vaultStore.open('/other');
		pending.reject(new Error('old vault'));

		await expect(load).rejects.toThrow('old vault');
		expect(eventCalendarStore.loadError).toBeNull();
		expect(eventCalendarStore.isLoading).toBe(false);
	});

	it('re-projects after a settings change at the same index version without a second IPC', async () => {
		vaultStore.bumpVaultIndexVersion(3);
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('a'), { date: '2026-11-10', start: '09:00' })]);
		await loadEvents();

		settingsStore.updateEventCalendar({ defaultColor: 'green' });
		await loadEvents();

		expect(invoke).toHaveBeenCalledTimes(1);
		expect(eventCalendarStore.eventByPath(P('a'))?.color).toBe('green');
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

describe('loadCalendarTasks', () => {
	/** A task group with one task per `[line, text, dueDate?]`. */
	function taskGroup(path: string, tasks: [number, string, string?][]): FileTaskGroupV2 {
		return {
			filePath: path,
			fileName: getFileName(path).replace(/\.md$/, ''),
			modifiedAt: 0,
			tasks: tasks.map(([lineNumber, text, dueDate]) => ({
				text,
				checked: false,
				indent: 0,
				lineNumber,
				status: 'todo',
				metadata: { description: text, dueDate, tags: [] },
			})),
		};
	}

	it('stores the dated tasks of the task index', async () => {
		vi.mocked(invoke).mockResolvedValue([
			taskGroup(P('Projects'), [[3, 'Pay rent', '2026-11-12'], [4, 'Undated']]),
		]);

		await loadCalendarTasks();

		expect(invoke).toHaveBeenCalledWith('get_all_tasks_v2');
		expect(eventCalendarStore.tasks).toEqual([
			{ path: P('Projects'), fileName: 'Projects', line: 3, description: 'Pay rent', status: 'todo', date: '2026-11-12' },
		]);
	});

	it('stores an empty list for an index without tasks', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await loadCalendarTasks();

		expect(eventCalendarStore.tasks).toEqual([]);
	});

	it('leaves the tasks untouched and rethrows when the IPC rejects', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([taskGroup(P('a'), [[1, 'Pay rent', '2026-11-12']])]);
		await loadCalendarTasks();
		const before = eventCalendarStore.tasks;
		vi.mocked(invoke).mockRejectedValueOnce(new Error('index gone'));

		await expect(loadCalendarTasks()).rejects.toThrow('index gone');

		expect(eventCalendarStore.tasks).toBe(before);
		expect(console.error).toHaveBeenCalled();
	});

	it('keeps the latest load when an earlier one resolves last', async () => {
		const first = deferred<FileTaskGroupV2[]>();
		const second = deferred<FileTaskGroupV2[]>();
		vi.mocked(invoke).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		const load1 = loadCalendarTasks();
		const load2 = loadCalendarTasks();

		second.resolve([taskGroup(P('new'), [[1, 'new', '2026-11-12']])]);
		await load2;
		first.resolve([taskGroup(P('old'), [[1, 'old', '2026-11-12']])]);
		await load1;

		expect(eventCalendarStore.tasks.map((t) => t.path)).toEqual([P('new')]);
	});

	it('discards a result read for a vault that is no longer open, or after a reset', async () => {
		const pending = deferred<FileTaskGroupV2[]>();
		vi.mocked(invoke).mockReturnValueOnce(pending.promise);
		const load = loadCalendarTasks();
		vaultStore.open('/other');
		pending.resolve([taskGroup(P('a'), [[1, 'a', '2026-11-12']])]);
		await load;
		expect(eventCalendarStore.tasks).toEqual([]);

		const afterReset = deferred<FileTaskGroupV2[]>();
		vi.mocked(invoke).mockReturnValueOnce(afterReset.promise);
		const load2 = loadCalendarTasks();
		resetEventCalendar();
		afterReset.resolve([taskGroup(P('a'), [[1, 'a', '2026-11-12']])]);
		await load2;
		expect(eventCalendarStore.tasks).toEqual([]);
	});

	it('logs but does not rethrow the failure of a load a newer one replaced', async () => {
		const first = deferred<FileTaskGroupV2[]>();
		vi.mocked(invoke).mockReturnValueOnce(first.promise).mockResolvedValueOnce([taskGroup(P('new'), [[1, 'new', '2026-11-12']])]);
		const load1 = loadCalendarTasks();
		await loadCalendarTasks();

		first.reject(new Error('stale'));

		await expect(load1).resolves.toBeUndefined();
		expect(console.error).toHaveBeenCalled();
		expect(eventCalendarStore.tasks.map((t) => t.path)).toEqual([P('new')]);
	});
});

describe('acquireCalendarClock', () => {
	const T0 = new Date(2026, 10, 10, 9, 0).getTime();

	/** Releases handed out in the current test; released in afterEach so a failing test cannot leak a clock ref. */
	let releases: Array<() => void> = [];

	/** Acquires the clock and records the release for afterEach. */
	function acquire(): () => void {
		const release = acquireCalendarClock();
		releases.push(release);
		return release;
	}

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		eventCalendarViewStore.setNow(0);
	});

	afterEach(() => {
		for (const release of releases) release();
		releases = [];
	});

	it('ticks on acquire and every 30 seconds', () => {
		const release = acquire();
		expect(eventCalendarViewStore.nowMs).toBe(T0);

		vi.advanceTimersByTime(29_999);
		expect(eventCalendarViewStore.nowMs).toBe(T0);
		vi.advanceTimersByTime(1);
		expect(eventCalendarViewStore.nowMs).toBe(T0 + 30_000);
		release();
	});

	it('re-ticks on window focus and on visibilitychange', () => {
		const release = acquire();

		vi.setSystemTime(T0 + 86_400_000);
		window.dispatchEvent(new Event('focus'));
		expect(eventCalendarViewStore.nowMs).toBe(T0 + 86_400_000);

		vi.setSystemTime(T0 + 2 * 86_400_000);
		document.dispatchEvent(new Event('visibilitychange'));
		expect(eventCalendarViewStore.nowMs).toBe(T0 + 2 * 86_400_000);
		release();
	});

	it('the last release clears the interval and both listeners', () => {
		const release = acquire();
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
		const a = acquire();
		const b = acquire();
		expect(vi.getTimerCount()).toBe(1);

		a();
		a();
		vi.advanceTimersByTime(30_000);
		expect(eventCalendarViewStore.nowMs).toBe(T0 + 30_000);

		b();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('never counts below zero: extra releases do not stop a later acquirer', () => {
		const a = acquire();
		a();
		a();
		const b = acquire();
		expect(vi.getTimerCount()).toBe(1);
		vi.advanceTimersByTime(30_000);
		expect(eventCalendarViewStore.nowMs).toBe(T0 + 30_000);
		b();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('resetEventCalendar never touches the clock', () => {
		const a = acquire();
		resetEventCalendar();
		vi.advanceTimersByTime(30_000);
		expect(eventCalendarViewStore.nowMs).toBe(T0 + 30_000);
		a();

		const b = acquire();
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

describe('calendar writes', () => {
	/** In-memory disk behind the mocked `@tauri-apps/plugin-fs`. */
	const disk = new Map<string, string>();
	/** Index version the next `refresh` bumps to. */
	let version = 0;

	/** Event note content with the given raw frontmatter fields. */
	function eventFile(fields: Record<string, string> = {}): string {
		return eventNote({ _type: 'Event', date: '2026-11-10', start: '09:30', end: '10:00', ...fields }, 'Body\n');
	}

	/** Bumps the index version and re-projects the fake disk (one index refresh). */
	async function refresh(times = 1): Promise<void> {
		for (let i = 0; i < times; i++) {
			version += 1;
			vaultStore.bumpVaultIndexVersion(version);
			await loadEvents();
		}
	}

	/** One index refresh that serves `files` instead of the fake disk (an index that has not caught up). */
	async function refreshWith(files: Record<string, string>, overrides: Partial<NoteEntryV2> = {}): Promise<void> {
		const real = vi.mocked(invoke).getMockImplementation()!;
		vi.mocked(invoke).mockImplementation(async (cmd) =>
			cmd === 'get_all_vault_entries_v2' ? Object.entries(files).map(([path, content]) => eventEntryFromContent(path, content, overrides)) : undefined,
		);
		try {
			await refresh();
		} finally {
			vi.mocked(invoke).mockImplementation(real);
		}
	}

	/** Lets every queued microtask run. */
	async function flush(): Promise<void> {
		for (let i = 0; i < 20; i++) await Promise.resolve();
	}

	/** The `FrontmatterWriteError` reason `promise` rejects with, or fails the test. */
	async function reasonOf(promise: Promise<unknown>): Promise<string> {
		try {
			await promise;
		} catch (err) {
			expect(err).toBeInstanceOf(FrontmatterWriteError);
			return (err as FrontmatterWriteError).reason;
		}
		throw new Error('expected a FrontmatterWriteError');
	}

	/** Holds the next `writeTextFile` open until the returned settlers run. */
	function holdNextWrite() {
		const gate = deferred<void>();
		vi.mocked(writeTextFile).mockImplementationOnce(async (p, data) => {
			await gate.promise;
			disk.set(String(p), String(data));
		});
		return gate;
	}

	beforeEach(async () => {
		disk.clear();
		version = 0;
		resetHooks();
		clearAllIndexed();
		_resetParseFrontmatterCache();
		trashStore.clear();
		typeDefinitionsStore.reset();
		vi.mocked(invoke).mockImplementation(async (cmd, args) => {
			// `create_note` writes the note; `scan_vault` feeds `refreshTree` an empty tree.
			if (cmd === 'create_note') {
				const { path, content } = args as { path: string; content: string };
				disk.set(path, content);
				return undefined;
			}
			if (cmd === 'scan_vault') return [];
			if (cmd !== 'get_all_vault_entries_v2') return undefined;
			// Rust skips dot-folders, so the Trash under `.kokobrain/` is never indexed.
			return [...disk.entries()].filter(([path]) => !path.includes('/.')).map(([path, content]) => eventEntryFromContent(path, content));
		});
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			const path = String(p);
			if (!disk.has(path)) throw new Error(`No such file: ${path}`);
			return disk.get(path)!;
		});
		vi.mocked(writeTextFile).mockImplementation(async (p, data) => {
			disk.set(String(p), String(data));
		});
		vi.mocked(exists).mockImplementation(async (p) => disk.has(String(p)));
		vi.mocked(mkdir).mockResolvedValue(undefined);
		vi.mocked(rename).mockImplementation(async (from, to) => {
			if (!disk.has(String(from))) throw new Error(`No such file: ${String(from)}`);
			disk.set(String(to), disk.get(String(from))!);
			disk.delete(String(from));
		});
		vi.mocked(remove).mockImplementation(async (p) => {
			const prefix = `${String(p)}/`;
			for (const key of [...disk.keys()]) if (key === String(p) || key.startsWith(prefix)) disk.delete(key);
		});
		vi.mocked(readDir).mockImplementation(async (dir) => {
			const prefix = `${String(dir)}/`;
			return [...disk.keys()]
				.filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/'))
				.map((p) => ({ name: p.slice(prefix.length), isFile: true, isDirectory: false, isSymlink: false }));
		});
		vi.mocked(renameItem).mockImplementation(async (from, newName) => {
			const to = `${from.slice(0, from.lastIndexOf('/'))}/${newName}`;
			if (disk.has(to)) return null;
			disk.set(to, disk.get(from)!);
			disk.delete(from);
			return to;
		});
		disk.set(P('Standup'), eventFile());
		await refresh();
	});

	afterEach(async () => {
		await drainEventCalendarWrites();
		vi.mocked(invoke).mockReset();
		vi.mocked(writeTextFile).mockReset();
		vi.mocked(exists).mockReset();
		vi.mocked(renameItem).mockReset();
		vi.mocked(rename).mockReset();
	});

	describe('updateEventFields, moveEvent and resizeEvent', () => {
		it('shows the change through the overlay before the snapshot, then settles and prunes it', async () => {
			const gate = holdNextWrite();
			const move = moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			await flush();

			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ date: '2026-11-11', start: 600, end: 660, pending: true });
			expect(eventCalendarStore.isPending(P('Standup'))).toBe(true);

			gate.resolve();
			await move;
			expect(disk.get(P('Standup'))).toContain('start: 10:00');
			expect(eventCalendarStore.isPending(P('Standup'))).toBe(true);
			expect(eventCalendarStore.history.undo).toEqual([
				expect.objectContaining({ kind: 'update', label: 'Move event', path: P('Standup') }),
			]);

			await refresh();
			expect(eventCalendarStore.isPending(P('Standup'))).toBe(false);
			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ date: '2026-11-11', start: 600, end: 660, pending: false });
		});

		it('refuses a timing write on a span before writing, so date and end_date never desync', async () => {
			const trip = eventFile({ start: '09:00', end: '17:00', end_date: '2026-11-12' });
			const late = eventFile({ start: '23:00', end: '01:00' });
			disk.set(P('Trip'), trip);
			disk.set(P('Late'), late);
			await refresh();
			expect(eventCalendarStore.eventByPath(P('Trip'))).toMatchObject({ endDate: '2026-11-12', readOnly: true });
			vi.mocked(writeTextFile).mockClear();

			for (const write of [
				moveEvent(P('Trip'), { date: '2026-11-11', start: 540, end: 1020 }),
				resizeEvent(P('Trip'), 1080),
				updateEventFields(P('Late'), { allDay: true }, { label: 'Edit event' }),
				editEvent(P('Late'), { date: '2026-11-12' }),
			]) {
				await expect(write).rejects.toMatchObject({ name: 'EventCalendarError', reason: 'read-only' });
			}

			expect(writeTextFile).not.toHaveBeenCalled();
			expect(disk.get(P('Trip'))).toBe(trip);
			expect(disk.get(P('Late'))).toBe(late);
			expect(eventCalendarStore.isPending(P('Trip'))).toBe(false);
			expect(eventCalendarStore.history.undo).toEqual([]);
		});

		it('writes a non-timing change of a span and keeps its endDate through the overlay', async () => {
			disk.set(P('Late'), eventFile({ start: '23:00', end: '01:00' }));
			await refresh();

			await updateEventFields(P('Late'), { color: 'pink' }, { label: 'Edit event' });

			expect(disk.get(P('Late'))).toContain('event_color: pink');
			expect(disk.get(P('Late'))).toContain('start: 23:00');
			expect(disk.get(P('Late'))).toContain('end: 01:00');
			expect(eventCalendarStore.eventByPath(P('Late'))).toMatchObject({ color: 'pink', endDate: '2026-11-11', readOnly: true, pending: true });
			await refresh();
			expect(eventCalendarStore.isPending(P('Late'))).toBe(false);
		});

		it('resizeEvent writes only the end, as a Resize event op', async () => {
			await resizeEvent(P('Standup'), 630);

			expect(disk.get(P('Standup'))).toContain('end: 10:30');
			expect(disk.get(P('Standup'))).toContain('start: 09:30');
			const op = eventCalendarStore.history.undo[0];
			expect(op).toMatchObject({ label: 'Resize event' });
			expect(op.kind === 'update' && op.after.end).toBe(630);
		});

		it('rolls the overlay back and rethrows when the write fails', async () => {
			vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));

			await expect(moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 })).rejects.toThrow('disk full');

			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ date: '2026-11-10', start: 570, end: 600, pending: false });
			expect(eventCalendarStore.isPending(P('Standup'))).toBe(false);
			expect(eventCalendarStore.history.undo).toEqual([]);
		});

		it('a refusal leaves the file and the store untouched', async () => {
			const content = '---\n_type: Event\ndate: 2026-11-10\nstart: 09:30\nend: 10:00\n# keep me\n---\nBody\n';
			disk.set(P('Standup'), content);
			await refresh();
			const before = eventCalendarStore.events;

			expect(await reasonOf(moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 }))).toBe('comments');

			expect(disk.get(P('Standup'))).toBe(content);
			expect(writeTextFile).not.toHaveBeenCalled();
			expect(eventCalendarStore.events).toEqual(before);
			expect(eventCalendarStore.pendingPaths.size).toBe(0);
			expect(eventCalendarStore.history.undo).toEqual([]);
		});

		it('a missing error drops the pending entry', async () => {
			vi.mocked(exists).mockResolvedValueOnce(false);

			expect(await reasonOf(moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 }))).toBe('missing');

			expect(eventCalendarStore.isPending(P('Standup'))).toBe(false);
			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ date: '2026-11-10', start: 570 });
		});

		it('record: false writes without pushing an op', async () => {
			await updateEventFields(P('Standup'), { color: 'green' }, { label: 'Edit event', record: false });

			expect(disk.get(P('Standup'))).toContain('event_color: green');
			expect(eventCalendarStore.eventByPath(P('Standup'))?.color).toBe('green');
			expect(eventCalendarStore.history.undo).toEqual([]);
		});

		it('rejects with missing when the note was deleted on disk before the index caught up', async () => {
			disk.delete(P('Standup'));

			expect(await reasonOf(moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 }))).toBe('missing');

			expect(writeTextFile).not.toHaveBeenCalled();
			expect(eventCalendarStore.isPending(P('Standup'))).toBe(false);
			expect(eventCalendarStore.history.undo).toEqual([]);
		});

		it('rejects with missing and writes nothing for a path the calendar does not show', async () => {
			expect(await reasonOf(moveEvent(P('Nope'), { date: '2026-11-11', start: 600, end: 660 }))).toBe('missing');
			expect(writeTextFile).not.toHaveBeenCalled();
		});
	});

	describe('write queue', () => {
		it('runs two writes to the same path in order', async () => {
			const gate = holdNextWrite();
			const first = moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			const second = resizeEvent(P('Standup'), 690);
			await flush();
			expect(writeTextFile).toHaveBeenCalledTimes(1);

			gate.resolve();
			await Promise.all([first, second]);
			expect(writeTextFile).toHaveBeenCalledTimes(2);
			const content = disk.get(P('Standup'))!;
			expect(content).toContain('date: 2026-11-11');
			expect(content).toContain('start: 10:00');
			expect(content).toContain('end: 11:30');
			expect(eventCalendarStore.history.undo.map((op) => op.label)).toEqual(['Move event', 'Resize event']);
		});

		it('a failed write does not block the next one on the same path', async () => {
			vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
			const first = moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			const second = resizeEvent(P('Standup'), 630);

			await expect(first).rejects.toThrow('disk full');
			await second;
			expect(disk.get(P('Standup'))).toContain('end: 10:30');
		});

		it('a write resolving after resetEventCalendar leaves the stores untouched', async () => {
			const gate = holdNextWrite();
			const move = moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			await flush();

			resetEventCalendar();
			gate.resolve();
			await move;

			expect(disk.get(P('Standup'))).toContain('start: 10:00');
			expect(eventCalendarStore.events).toEqual([]);
			expect(eventCalendarStore.pendingPaths.size).toBe(0);
			expect(eventCalendarStore.history.undo).toEqual([]);
		});

		it('resetEventCalendar keeps the queue: a later write still waits for the one in flight', async () => {
			const gate = holdNextWrite();
			const first = moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			await flush();
			resetEventCalendar();
			await refresh();

			const second = resizeEvent(P('Standup'), 630);
			await flush();
			expect(writeTextFile).toHaveBeenCalledTimes(1);

			gate.resolve();
			await first;
			await expect(second).resolves.toBeUndefined();
			expect(writeTextFile).toHaveBeenCalledTimes(2);
			expect(disk.get(P('Standup'))).toContain('end: 10:30');
		});

		it('drainEventCalendarWrites resolves after an in-flight write and never rejects', async () => {
			const gate = holdNextWrite();
			const move = moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			let drained = false;
			const drain = drainEventCalendarWrites().then(() => {
				drained = true;
			});
			await flush();
			expect(drained).toBe(false);

			gate.reject(new Error('disk full'));
			await expect(move).rejects.toThrow('disk full');
			await drain;
			expect(drained).toBe(true);
		});

		it('drainEventCalendarWrites resolves at once with nothing queued', async () => {
			await expect(drainEventCalendarWrites()).resolves.toBeUndefined();
		});

		it('switchVault lets a write to a closed note finish its index update in the old vault', async () => {
			const indexedIn: (string | null)[] = [];
			const real = vi.mocked(invoke).getMockImplementation()!;
			vi.mocked(invoke).mockImplementation(async (cmd, args) => {
				if (cmd === 'update_note_in_index') indexedIn.push(vaultStore.path);
				return real(cmd, args);
			});
			const gate = holdNextWrite();
			const move = moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			await flush();

			const switched = switchVault('/other');
			await flush();
			expect(vaultStore.path).toBe(VAULT);

			gate.resolve();
			await expect(move).resolves.toBeUndefined();
			await switched;
			expect(disk.get(P('Standup'))).toContain('start: 10:00');
			expect(indexedIn).toEqual([VAULT]);
			expect(vaultStore.path).toBe('/other');
		});

		it('switchVault also waits for a write to another closed note enqueued while it drains', async () => {
			disk.set(P('Retro'), eventFile({ date: '2026-11-09' }));
			await refresh();
			const indexed: { path: string; vault: string | null }[] = [];
			const real = vi.mocked(invoke).getMockImplementation()!;
			vi.mocked(invoke).mockImplementation(async (cmd, args) => {
				if (cmd === 'update_note_in_index') indexed.push({ path: (args as { path: string }).path, vault: vaultStore.path });
				return real(cmd, args);
			});
			const standupGate = holdNextWrite();
			const retroGate = holdNextWrite();
			const standup = moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			await flush();

			const switched = switchVault('/other');
			await flush();
			const retro = moveEvent(P('Retro'), { date: '2026-11-12', start: 600, end: 660 });
			await flush();
			standupGate.resolve();
			await expect(standup).resolves.toBeUndefined();
			await flush();
			expect(vaultStore.path).toBe(VAULT);

			retroGate.resolve();
			await expect(retro).resolves.toBeUndefined();
			await switched;
			expect(disk.get(P('Retro'))).toContain('date: 2026-11-12');
			expect(indexed).toEqual([
				{ path: P('Standup'), vault: VAULT },
				{ path: P('Retro'), vault: VAULT },
			]);
			expect(vaultStore.path).toBe('/other');
		});
	});

	describe('editEvent', () => {
		it('renames on a title change and remaps overlay, view and history, with one event visible before the snapshot', async () => {
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			eventCalendarViewStore.openPopover(P('Standup'), RECT);

			const finalPath = await editEvent(P('Standup'), { title: 'Daily sync' });

			expect(finalPath).toBe(P('Daily sync'));
			expect(renameItem).toHaveBeenCalledWith(P('Standup'), 'Daily sync.md');
			expect(disk.has(P('Standup'))).toBe(false);
			expect(disk.get(P('Daily sync'))).not.toContain('event_title');
			expect(eventCalendarStore.events.map((e) => [e.path, e.title])).toEqual([[P('Daily sync'), 'Daily sync']]);
			expect(eventCalendarViewStore.popover?.path).toBe(P('Daily sync'));
			expect(eventCalendarStore.history.undo.map((op) => [op.label, op.path])).toEqual([
				['Move event', P('Daily sync')],
				['Edit event', P('Daily sync')],
			]);

			await refresh(2);
			expect(eventCalendarStore.pendingPaths.size).toBe(0);
			expect(eventCalendarStore.events.map((e) => [e.path, e.title])).toEqual([[P('Daily sync'), 'Daily sync']]);
		});

		it('keeps a renamed read-only event read-only in the overlay before the snapshot', async () => {
			disk.set(P('Retreat'), eventFile({ date: '2026-11-12', end_date: '2026-11-14' }));
			await refresh();
			expect(eventCalendarStore.eventByPath(P('Retreat'))?.readOnly).toBe(true);

			const finalPath = await editEvent(P('Retreat'), { title: 'Offsite', location: 'Lisbon' });

			expect(finalPath).toBe(P('Offsite'));
			expect(eventCalendarStore.eventByPath(P('Offsite'))).toMatchObject({ title: 'Offsite', location: 'Lisbon', readOnly: true, pending: true });
			// The index has the rename but not the field write yet.
			await refreshWith({ [P('Offsite')]: eventFile({ date: '2026-11-12', end_date: '2026-11-14' }) });
			expect(eventCalendarStore.eventByPath(P('Offsite'))).toMatchObject({ title: 'Offsite', location: 'Lisbon', readOnly: true, pending: true });
			await refresh();
			expect(eventCalendarStore.isPending(P('Offsite'))).toBe(false);
			expect(eventCalendarStore.eventByPath(P('Offsite'))).toMatchObject({ location: 'Lisbon', readOnly: true, pending: false });
		});

		it('keeps the written time after a rename while the index still shows the old fields, until it catches up', async () => {
			await refreshWith({ [P('Standup')]: eventFile() }, { snippet: 'Body' });
			expect(eventCalendarStore.eventByPath(P('Standup'))?.snippet).toBe('Body');

			await editEvent(P('Standup'), { title: 'Daily sync', start: 600, end: 660 });
			// Rust indexed the rename, not the field write: new path, old time, no snippet.
			await refreshWith({ [P('Daily sync')]: eventFile() });

			expect(eventCalendarStore.events).toHaveLength(1);
			expect(eventCalendarStore.eventByPath(P('Daily sync'))).toMatchObject({
				title: 'Daily sync',
				start: 600,
				end: 660,
				snippet: 'Body',
				readOnly: false,
				pending: true,
			});

			await refresh();
			expect(eventCalendarStore.isPending(P('Daily sync'))).toBe(false);
			expect(eventCalendarStore.eventByPath(P('Daily sync'))).toMatchObject({ start: 600, end: 660, pending: false });
		});

		it('drops a renamed overlay on the version clock when the index never shows the written state', async () => {
			await editEvent(P('Standup'), { title: 'Daily sync', start: 600, end: 660 });

			await refreshWith({ [P('Daily sync')]: eventFile() });
			expect(eventCalendarStore.isPending(P('Daily sync'))).toBe(true);
			await refreshWith({ [P('Daily sync')]: eventFile() });
			expect(eventCalendarStore.isPending(P('Daily sync'))).toBe(false);
		});

		it('a second "Standup" renames to Standup 1.md with event_title: Standup', async () => {
			disk.set(P('Retro'), eventFile({ date: '2026-11-12' }));
			await refresh();

			const finalPath = await editEvent(P('Retro'), { title: 'Standup' });

			expect(finalPath).toBe(P('Standup 1'));
			expect(disk.get(P('Standup 1'))).toContain('event_title: Standup');
			expect(eventCalendarStore.eventByPath(P('Standup 1'))?.title).toBe('Standup');
		});

		it('a case-only edit renames nothing and writes event_title', async () => {
			const finalPath = await editEvent(P('Standup'), { title: 'standup' });

			expect(finalPath).toBe(P('Standup'));
			expect(renameItem).not.toHaveBeenCalled();
			expect(disk.get(P('Standup'))).toContain('event_title: standup');
			expect(eventCalendarStore.eventByPath(P('Standup'))?.title).toBe('standup');
		});

		it('throws when the rename loses a race, leaving file and store untouched', async () => {
			vi.mocked(renameItem).mockResolvedValueOnce(null);

			await expect(editEvent(P('Standup'), { title: 'Daily sync' })).rejects.toThrow(/may already exist/);

			expect(disk.has(P('Standup'))).toBe(true);
			expect(writeTextFile).not.toHaveBeenCalled();
			expect(eventCalendarStore.pendingPaths.size).toBe(0);
			expect(eventCalendarStore.history.undo).toEqual([]);
		});

		it('writes fields without a title as one Edit event op', async () => {
			await editEvent(P('Standup'), { location: 'Room 4', color: 'pink' });

			expect(renameItem).not.toHaveBeenCalled();
			expect(readDir).not.toHaveBeenCalled();
			expect(disk.get(P('Standup'))).toContain('location: Room 4');
			expect(eventCalendarStore.history.undo).toHaveLength(1);
			expect(eventCalendarStore.history.undo[0]).toMatchObject({ label: 'Edit event' });
		});

		it('records only the rename when the field write fails after it', async () => {
			vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));

			await expect(editEvent(P('Standup'), { title: 'Daily sync', start: 600, end: 660 })).rejects.toThrow('disk full');

			expect(disk.has(P('Daily sync'))).toBe(true);
			expect(eventCalendarStore.events.map((e) => [e.path, e.title, e.start])).toEqual([[P('Daily sync'), 'Daily sync', 570]]);
			const op = eventCalendarStore.history.undo[0];
			expect(eventCalendarStore.history.undo).toHaveLength(1);
			expect(op).toMatchObject({ label: 'Edit event', path: P('Daily sync') });
			expect(op.kind === 'update' && [op.before.title, op.after.title, op.after.start]).toEqual(['Standup', 'Daily sync', 570]);
		});

		it('drops the rename-only overlay of a failed field write on the version clock', async () => {
			vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
			await expect(editEvent(P('Standup'), { title: 'Daily sync', start: 600, end: 660 })).rejects.toThrow('disk full');

			await refreshWith({});
			expect(eventCalendarStore.isPending(P('Daily sync'))).toBe(true);
			expect(eventCalendarStore.events.map((e) => [e.path, e.start])).toEqual([[P('Daily sync'), 570]]);
			await refreshWith({});
			expect(eventCalendarStore.isPending(P('Daily sync'))).toBe(false);
			expect(eventCalendarStore.events).toEqual([]);
		});
	});

	describe('moveEventToDay', () => {
		it('writes only the date of a timed event, as an undoable Move event op', async () => {
			await moveEventToDay(P('Standup'), '2026-11-12');

			const bytes = disk.get(P('Standup'))!;
			expect(bytes).toContain('date: 2026-11-12');
			expect(bytes).toContain('start: 09:30');
			expect(bytes).toContain('end: 10:00');
			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ date: '2026-11-12', start: 570, end: 600 });

			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Move event' });
			expect(disk.get(P('Standup'))).toContain('date: 2026-11-10');
			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ date: '2026-11-10', start: 570, end: 600 });
		});

		it('keeps all_day on an all-day event and adds no start or end, also through undo', async () => {
			disk.set(P('Holiday'), eventNote({ _type: 'Event', date: '2026-11-10', all_day: 'true' }, ''));
			await refresh();

			await moveEventToDay(P('Holiday'), '2026-11-11');

			const bytes = disk.get(P('Holiday'))!;
			expect(bytes).toContain('date: 2026-11-11');
			expect(bytes).toContain('all_day: true');
			expect(bytes).not.toMatch(/\n(start|end):/);
			expect(eventCalendarStore.eventByPath(P('Holiday'))).toMatchObject({ date: '2026-11-11', allDay: true });

			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Move event' });
			expect(disk.get(P('Holiday'))).toContain('date: 2026-11-10');
			expect(disk.get(P('Holiday'))).toContain('all_day: true');
		});

		it('refuses a span before writing', async () => {
			const trip = eventFile({ end_date: '2026-11-12' });
			disk.set(P('Trip'), trip);
			await refresh();
			vi.mocked(writeTextFile).mockClear();

			await expect(moveEventToDay(P('Trip'), '2026-11-13')).rejects.toMatchObject({ name: 'EventCalendarError', reason: 'read-only' });

			expect(writeTextFile).not.toHaveBeenCalled();
			expect(disk.get(P('Trip'))).toBe(trip);
			expect(eventCalendarStore.history.undo).toEqual([]);
		});

		it('rolls back and rethrows when the write fails', async () => {
			vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));

			await expect(moveEventToDay(P('Standup'), '2026-11-12')).rejects.toThrow('disk full');

			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ date: '2026-11-10', pending: false });
			expect(eventCalendarStore.history.undo).toEqual([]);
		});
	});

	describe('undoEventChange and redoEventChange', () => {
		it('undoes and redoes a move', async () => {
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });

			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Move event' });
			expect(disk.get(P('Standup'))).toContain('date: 2026-11-10');
			expect(disk.get(P('Standup'))).toContain('start: 09:30');
			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ date: '2026-11-10', start: 570, end: 600 });
			expect(eventCalendarStore.canUndo).toBe(false);
			expect(eventCalendarStore.canRedo).toBe(true);

			expect(await redoEventChange()).toEqual({ status: 'done', label: 'Move event' });
			expect(disk.get(P('Standup'))).toContain('date: 2026-11-11');
			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ date: '2026-11-11', start: 600, end: 660 });
			expect(eventCalendarStore.canUndo).toBe(true);
			expect(eventCalendarStore.canRedo).toBe(false);
		});

		it('undoes and redoes an edit that changed the title, renaming back and forth', async () => {
			await editEvent(P('Standup'), { title: 'Daily sync' });
			await refresh(2);

			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Edit event' });
			expect(disk.has(P('Daily sync'))).toBe(false);
			expect(disk.get(P('Standup'))).not.toContain('event_title');
			expect(eventCalendarStore.events.map((e) => [e.path, e.title])).toEqual([[P('Standup'), 'Standup']]);
			expect(eventCalendarStore.history.redo.map((op) => op.path)).toEqual([P('Standup')]);

			await refresh(2);
			expect(await redoEventChange()).toEqual({ status: 'done', label: 'Edit event' });
			expect(disk.has(P('Daily sync'))).toBe(true);
			expect(eventCalendarStore.events.map((e) => [e.path, e.title])).toEqual([[P('Daily sync'), 'Daily sync']]);
			expect(eventCalendarStore.history.undo.map((op) => op.path)).toEqual([P('Daily sync')]);
		});

		it('keeps the undone time after an undo that renames while the index still shows the old fields', async () => {
			await editEvent(P('Standup'), { title: 'Daily sync', start: 600, end: 660 });
			await refresh(2);
			const written = disk.get(P('Daily sync'))!;

			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Edit event' });
			await refreshWith({ [P('Standup')]: written });

			expect(eventCalendarStore.events).toHaveLength(1);
			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ title: 'Standup', start: 570, end: 600, pending: true });

			await refresh();
			expect(eventCalendarStore.isPending(P('Standup'))).toBe(false);
			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ start: 570, end: 600, pending: false });
		});

		it('refuses an undo after an external change and drops the op', async () => {
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			await refresh();
			const external = eventFile({ date: '2026-11-11', start: '11:00', end: '12:00' });
			disk.set(P('Standup'), external);
			await refresh(2);
			vi.mocked(writeTextFile).mockClear();

			expect(await undoEventChange()).toEqual({ status: 'refused', label: 'Move event', path: P('Standup') });
			expect(disk.get(P('Standup'))).toBe(external);
			expect(writeTextFile).not.toHaveBeenCalled();
			expect(eventCalendarStore.canUndo).toBe(false);
			expect(eventCalendarStore.canRedo).toBe(false);
		});

		it('returns vanished and empties the history of a note renamed outside the calendar', async () => {
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			await resizeEvent(P('Standup'), 690);
			await refresh();
			disk.set(P('Moved'), disk.get(P('Standup'))!);
			disk.delete(P('Standup'));
			await refresh();

			expect(await undoEventChange()).toEqual({ status: 'vanished', label: 'Resize event' });
			expect(eventCalendarStore.history.undo).toEqual([]);
			expect(eventCalendarStore.history.redo).toEqual([]);
			expect(disk.has(P('Standup'))).toBe(false);
		});

		it('two undos started back to back undo a title edit and the move before it', async () => {
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			await editEvent(P('Standup'), { title: 'Daily sync' });
			await refresh(2);

			const first = undoEventChange();
			const second = undoEventChange();

			expect(await first).toEqual({ status: 'done', label: 'Edit event' });
			expect(await second).toEqual({ status: 'done', label: 'Move event' });
			expect(disk.has(P('Daily sync'))).toBe(false);
			expect(disk.get(P('Standup'))).toContain('date: 2026-11-10');
			expect(disk.get(P('Standup'))).toContain('start: 09:30');
			expect(disk.get(P('Standup'))).toContain('end: 10:00');
			expect(eventCalendarStore.history.undo).toEqual([]);
			expect(eventCalendarStore.history.redo.map((op) => [op.label, op.path])).toEqual([
				['Edit event', P('Standup')],
				['Move event', P('Standup')],
			]);
		});

		it('Cmd+Z then an immediate drag on the same event: the undo applies first, then the drag', async () => {
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });

			const undo = undoEventChange();
			const drag = moveEvent(P('Standup'), { date: '2026-11-12', start: 720, end: 780 });

			expect(await undo).toEqual({ status: 'done', label: 'Move event' });
			await drag;
			expect(disk.get(P('Standup'))).toContain('date: 2026-11-12');
			expect(disk.get(P('Standup'))).toContain('start: 12:00');
			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ date: '2026-11-12', start: 720, end: 780 });
			const op = eventCalendarStore.history.undo[0];
			expect(eventCalendarStore.history.undo).toHaveLength(1);
			expect(op.kind === 'update' && [op.before.date, op.before.start, op.after.date]).toEqual(['2026-11-10', 570, '2026-11-12']);
		});

		it('a drag started after the second of two quick undos waits for both', async () => {
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			await resizeEvent(P('Standup'), 690);

			const first = undoEventChange();
			const second = undoEventChange();
			const drag = moveEvent(P('Standup'), { date: '2026-11-12', start: 720, end: 780 });

			expect(await first).toEqual({ status: 'done', label: 'Resize event' });
			expect(await second).toEqual({ status: 'done', label: 'Move event' });
			await drag;
			expect(disk.get(P('Standup'))).toContain('date: 2026-11-12');
			const op = eventCalendarStore.history.undo[0];
			expect(op.kind === 'update' && [op.before.date, op.before.start, op.before.end]).toEqual(['2026-11-10', 570, 600]);
		});

		it('drainEventCalendarWrites waits for a write queued behind an undo', async () => {
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });

			// The undo writes through; the drag queued behind it is held open.
			vi.mocked(writeTextFile).mockImplementationOnce(async (p, data) => {
				disk.set(String(p), String(data));
			});
			const gate = holdNextWrite();
			void undoEventChange();
			void moveEvent(P('Standup'), { date: '2026-11-12', start: 720, end: 780 });
			let drained = false;
			const drain = drainEventCalendarWrites().then(() => {
				drained = true;
			});
			await flush();
			expect(drained).toBe(false);

			gate.resolve();
			await drain;
			expect(disk.get(P('Standup'))).toContain('date: 2026-11-12');
		});

		it('drops an undo whose field write fails after it renamed the note back', async () => {
			await editEvent(P('Standup'), { title: 'Daily sync', start: 600, end: 660 });
			await refresh(2);
			vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));

			await expect(undoEventChange()).rejects.toThrow('disk full');

			expect(disk.has(P('Standup'))).toBe(true);
			expect(disk.has(P('Daily sync'))).toBe(false);
			expect(eventCalendarStore.history.undo).toEqual([]);
			expect(eventCalendarStore.history.redo).toEqual([]);
		});

		it('an undo that starts after resetEventCalendar returns empty and writes nothing', async () => {
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			vi.mocked(writeTextFile).mockClear();

			const undo = undoEventChange();
			resetEventCalendar();

			expect(await undo).toEqual({ status: 'empty', label: null });
			expect(writeTextFile).not.toHaveBeenCalled();
			expect(disk.get(P('Standup'))).toContain('date: 2026-11-11');
		});

		it('returns empty with nothing to undo or redo', async () => {
			expect(await undoEventChange()).toEqual({ status: 'empty', label: null });
			expect(await redoEventChange()).toEqual({ status: 'empty', label: null });
		});
	});

	/** A draft for a timed event on 2026-11-12 at 10:00-10:30. */
	function draft(overrides: Partial<EventDraft> = {}): EventDraft {
		return { title: 'Planning', date: '2026-11-12', start: 600, end: 630, allDay: false, color: 'blue', location: '', notes: '', ...overrides };
	}

	/** Configures the Event type with a `_template` (and optional `_folder`) whose content is on the fake disk. */
	function useTemplate(content: string, folder: string | null = null): void {
		disk.set(`${VAULT}/_system/templates/Event.md`, content);
		typeDefinitionsStore.setTypeMetadataMap(
			new Map([
				[
					'Event',
					{
						name: 'Event',
						path: null,
						icon: 'file',
						color: 'blue',
						order: 50,
						sidebarLabel: 'Events',
						template: '_system/templates/Event.md',
						folder,
						sort: 'title',
						view: 'all',
						visible: true,
						listPropertiesDisplay: [],
						archiveTo: null,
					},
				],
			]),
		);
	}

	/** The `EventCalendarError` reason `promise` rejects with, or fails the test. */
	async function calendarReasonOf(promise: Promise<unknown>): Promise<string> {
		try {
			await promise;
		} catch (err) {
			expect(err).toBeInstanceOf(EventCalendarError);
			return (err as EventCalendarError).reason;
		}
		throw new Error('expected an EventCalendarError');
	}

	/** Paths on the fake disk inside the Trash. */
	function trashedPaths(): string[] {
		return [...disk.keys()].filter((p) => p.includes('/.kokobrain/trash/items/'));
	}

	/** Opens `path` in a tab whose unsaved content is `content`. */
	function openDirtyTab(path: string, content: string): void {
		editorStore.addTab({ path, name: getFileName(path), content, savedContent: disk.get(path)! });
	}

	describe('createEvent', () => {
		it('writes the inline template with the draft, overlays it at once and records a Create event op', async () => {
			const path = await createEvent(draft());

			expect(path).toBe(P('Planning'));
			const written = disk.get(P('Planning'))!;
			expect(written).toContain('_type: Event');
			expect(written).toContain('date: 2026-11-12');
			expect(written).toContain('start: 10:00');
			expect(written).toContain('end: 10:30');
			expect(written).not.toContain('event_title');
			expect(eventCalendarStore.eventByPath(P('Planning'))).toMatchObject({ title: 'Planning', date: '2026-11-12', start: 600, end: 630, pending: true });
			expect(eventCalendarStore.history.undo).toEqual([expect.objectContaining({ kind: 'create', label: 'Create event', path: P('Planning') })]);

			await refresh(2);
			expect(eventCalendarStore.pendingPaths.size).toBe(0);
			expect(eventCalendarStore.eventByPath(P('Planning'))).toMatchObject({ title: 'Planning', start: 600, end: 630, pending: false });
		});

		it("uses the Event type's folder and template", async () => {
			useTemplate('---\n_type: Event\nattendees: Ana\n---\n## Agenda\n', 'Events');

			const path = await createEvent(draft({ notes: 'Bring the slides' }));

			expect(path).toBe(`${VAULT}/Events/Planning.md`);
			const written = disk.get(path)!;
			expect(written).toContain('attendees: Ana');
			expect(written).toContain('start: 10:00');
			expect(written).toContain('Bring the slides\n\n## Agenda');
		});

		it("renders tp.date.now for the draft's day, not today", async () => {
			useTemplate('---\n_type: Event\ndate: <% tp.date.now("YYYY-MM-DD") %>\n---\n# Notes for <% tp.date.now("YYYY-MM-DD") %>\n');

			const path = await createEvent(draft({ date: '2027-03-04' }));

			const written = disk.get(path)!;
			expect(written).toContain('date: 2027-03-04');
			expect(written).toContain('# Notes for 2027-03-04');
			expect(written).not.toContain(dayjs().format('YYYY-MM-DD'));
		});

		it('refuses a template whose frontmatter has a comment, writing nothing', async () => {
			useTemplate('---\n_type: Event\n# who attends\nattendees: Ana\n---\n');

			expect(await calendarReasonOf(createEvent(draft()))).toBe('template-lossy');

			expect(disk.has(P('Planning'))).toBe(false);
			expect(invoke).not.toHaveBeenCalledWith('create_note', expect.anything());
			expect(eventCalendarStore.pendingPaths.size).toBe(0);
			expect(eventCalendarStore.history.undo).toEqual([]);
		});

		it('a second "Standup" lands in Standup 1.md with event_title: Standup', async () => {
			const path = await createEvent(draft({ title: 'Standup' }));

			expect(path).toBe(P('Standup 1'));
			expect(disk.get(path)).toContain('event_title: Standup');
			expect(eventCalendarStore.eventByPath(path)?.title).toBe('Standup');
			await refresh(2);
			expect(eventCalendarStore.eventByPath(path)).toMatchObject({ title: 'Standup', pending: false });
		});

		it('"1:1 with manager" lands in 1-1 with manager.md and keeps its title', async () => {
			const path = await createEvent(draft({ title: '1:1 with manager' }));

			expect(path).toBe(P('1-1 with manager'));
			expect(disk.get(path)).toContain('event_title:');
			await refresh(2);
			expect(eventCalendarStore.eventByPath(path)).toMatchObject({ title: '1:1 with manager', pending: false });
		});

		it('turns a refused createFile into create-failed', async () => {
			const real = vi.mocked(invoke).getMockImplementation()!;
			vi.mocked(invoke).mockImplementation(async (cmd, args) => {
				if (cmd === 'create_note') throw new Error('a note with that name exists');
				return real(cmd, args);
			});

			expect(await calendarReasonOf(createEvent(draft()))).toBe('create-failed');
			expect(disk.has(P('Planning'))).toBe(false);
			expect(eventCalendarStore.history.undo).toEqual([]);
		});

		it('drainEventCalendarWrites waits for a create in flight', async () => {
			const gate = deferred<void>();
			const real = vi.mocked(invoke).getMockImplementation()!;
			vi.mocked(invoke).mockImplementation(async (cmd, args) => {
				if (cmd === 'create_note') await gate.promise;
				return real(cmd, args);
			});
			const create = createEvent(draft());
			let drained = false;
			const drain = drainEventCalendarWrites().then(() => {
				drained = true;
			});
			await flush();
			expect(drained).toBe(false);

			gate.resolve();
			await create;
			await drain;
			expect(drained).toBe(true);
			expect(disk.has(P('Planning'))).toBe(true);
		});
	});

	describe('duplicateEvent', () => {
		it('copies the bytes unchanged into "<title> (copy).md" as a Duplicate event op', async () => {
			const path = await duplicateEvent(P('Standup'));

			expect(path).toBe(P('Standup (copy)'));
			expect(disk.get(path)).toBe(disk.get(P('Standup')));
			expect(eventCalendarStore.eventByPath(path)).toMatchObject({ title: 'Standup (copy)', start: 570, end: 600, pending: true });
			expect(eventCalendarStore.history.undo).toEqual([expect.objectContaining({ kind: 'create', label: 'Duplicate event', path })]);
			await refresh(2);
			expect(eventCalendarStore.eventByPath(path)).toMatchObject({ title: 'Standup (copy)', pending: false });
		});

		it("copies a dirty tab's content", async () => {
			const edited = eventFile({ start: '11:00', end: '11:30' });
			openDirtyTab(P('Standup'), edited);

			const path = await duplicateEvent(P('Standup'));

			expect(disk.get(path)).toBe(edited);
		});

		it('gives the copy of an event_title note "<title> (copy)"', async () => {
			disk.set(P('1-1 sync'), eventFile({ event_title: '"1:1 sync"' }));
			await refresh();

			const path = await duplicateEvent(P('1-1 sync'));

			expect(path).toBe(P('1-1 sync (copy)'));
			expect(eventCalendarStore.eventByPath(path)?.title).toBe('1:1 sync (copy)');
			await refresh(2);
			expect(eventCalendarStore.eventByPath(path)).toMatchObject({ title: '1:1 sync (copy)', start: 570, pending: false });
		});

		it('keeps the bytes of a lossy note, which then shows the original title', async () => {
			const lossy = eventNote({ _type: 'Event', date: '2026-11-10', start: '09:30', end: '10:00', event_title: 'Retro # monthly' }, 'Body\n');
			disk.set(P('Retro'), lossy);
			await refresh();

			const path = await duplicateEvent(P('Retro'));

			expect(disk.get(path)).toBe(lossy);
		});

		it("waits for a write in flight on the copy's path before creating the copy", async () => {
			await duplicateEvent(P('Standup'));
			await refresh(2);
			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Duplicate event' });
			disk.set(P('Standup'), eventFile({ start: '11:00', end: '11:30' }));
			await refresh(2);
			// The redo restores the first copy to "Standup (copy)"; hold its move out of the Trash.
			const gate = deferred<void>();
			const real = vi.mocked(rename).getMockImplementation()!;
			vi.mocked(rename).mockImplementationOnce(async (from, to) => {
				await gate.promise;
				return real(from, to);
			});

			const redo = redoEventChange();
			const copy = duplicateEvent(P('Standup'));
			await flush();
			gate.resolve();

			expect(await redo).toEqual({ status: 'done', label: 'Duplicate event' });
			expect(await copy).toBe(P('Standup (copy) 1'));
			expect(disk.get(P('Standup (copy)'))).toContain('start: 09:30');
			expect(disk.get(P('Standup (copy) 1'))).toContain('start: 11:00');
		});

		it('turns a refused createFile into create-failed, leaving history and overlay unchanged', async () => {
			const real = vi.mocked(invoke).getMockImplementation()!;
			vi.mocked(invoke).mockImplementation(async (cmd, args) => {
				if (cmd === 'create_note') throw new Error('a note with that name exists');
				return real(cmd, args);
			});

			expect(await calendarReasonOf(duplicateEvent(P('Standup')))).toBe('create-failed');

			expect(disk.has(P('Standup (copy)'))).toBe(false);
			expect(eventCalendarStore.history.undo).toEqual([]);
			expect(eventCalendarStore.pendingPaths.size).toBe(0);
		});
	});

	describe('deleteEvent and restoreDeletedEvent', () => {
		it('saves a dirty tab first, so the trashed and restored bytes keep the edit', async () => {
			const edited = eventFile({ start: '11:00', end: '11:30' });
			openDirtyTab(P('Standup'), edited);

			await deleteEvent(P('Standup'));

			expect(disk.has(P('Standup'))).toBe(false);
			expect(trashedPaths().map((p) => disk.get(p))).toEqual([edited]);
			expect(eventCalendarStore.eventByPath(P('Standup'))).toBeUndefined();
			expect(editorStore.tabs.some((t) => t.path === P('Standup'))).toBe(false);
			const [item] = trashStore.items;
			expect(item.originalPath).toBe('Standup.md');
			expect(eventCalendarStore.history.undo).toEqual([
				expect.objectContaining({ kind: 'delete', label: 'Delete event', path: P('Standup'), trashId: item.id }),
			]);

			expect(await restoreDeletedEvent(P('Standup'))).toBe(P('Standup'));
			expect(disk.get(P('Standup'))).toBe(edited);
			expect(trashStore.items).toEqual([]);
			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ title: 'Standup', pending: true });
			await refresh();
			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ start: 660, end: 690, pending: false });
		});

		it('keeps a restored span read-only in the overlay before the snapshot', async () => {
			disk.set(P('Trip'), eventFile({ end_date: '2026-11-12' }));
			await refresh();
			await deleteEvent(P('Trip'));

			await undoEventChange();

			expect(eventCalendarStore.eventByPath(P('Trip'))).toMatchObject({ endDate: '2026-11-12', readOnly: true, pending: true });
		});

		it('a save failure aborts the delete', async () => {
			openDirtyTab(P('Standup'), eventFile({ start: '11:00' }));
			vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));

			expect(await reasonOf(deleteEvent(P('Standup')))).toBe('save-failed');

			expect(disk.has(P('Standup'))).toBe(true);
			expect(trashStore.items).toEqual([]);
			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ pending: false });
			expect(eventCalendarStore.history.undo).toEqual([]);
		});

		it('throws when deleteItem fails, rolling the overlay back', async () => {
			vi.mocked(rename).mockRejectedValueOnce(new Error('permission denied'));

			await expect(deleteEvent(P('Standup'))).rejects.toThrow('Could not move the note to the Trash');

			expect(disk.has(P('Standup'))).toBe(true);
			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ pending: false });
			expect(eventCalendarStore.history.undo).toEqual([]);
		});

		it('restores the entry with the given id', async () => {
			await deleteEvent(P('Standup'));
			const firstId = trashStore.items[0].id;
			disk.set(P('Standup'), eventFile({ start: '14:00', end: '15:00' }));
			await refresh(2);
			await deleteEvent(P('Standup'));
			const secondId = trashStore.items[0].id;

			expect(await restoreDeletedEvent(P('Standup'), firstId)).toBe(P('Standup'));

			expect(disk.get(P('Standup'))).toContain('start: 09:30');
			expect(trashStore.items.map((i) => i.id)).toEqual([secondId]);
			// The overlay shows the state the first delete recorded, not the second's 14:00.
			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ start: 570, end: 600, pending: true });
		});

		it('a restore with no recorded delete op shows the note once indexed', async () => {
			await deleteEvent(P('Standup'));
			eventCalendarStore.setHistory({ undo: [], redo: [], max: 100 });

			expect(await restoreDeletedEvent(P('Standup'))).toBe(P('Standup'));

			expect(eventCalendarStore.pendingPaths.size).toBe(0);
			await refresh();
			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ start: 570, pending: false });
		});

		it.each([
			['without a recorded delete op', true],
			['with the recorded state', false],
		])('a suffixed restore %s drops the delete tombstone that hides the note now at the old path', async (_label, clearHistory) => {
			await deleteEvent(P('Standup'));
			if (clearHistory) eventCalendarStore.setHistory({ undo: [], redo: [], max: 100 });
			disk.set(P('Standup'), eventFile({ start: '14:00', end: '15:00' }));
			// One refresh: the settled tombstone outlives it and still hides the new note.
			await refresh();
			expect(eventCalendarStore.eventByPath(P('Standup'))).toBeUndefined();

			expect(await restoreDeletedEvent(P('Standup'))).toBe(P('Standup (restored)'));

			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ start: 840, pending: false });
		});

		it('remaps its own history to a suffixed path, leaving the view and the note now at the old path alone', async () => {
			await deleteEvent(P('Standup'));
			disk.set(P('Standup'), eventFile({ start: '14:00', end: '15:00' }));
			await refresh();
			eventCalendarViewStore.openPopover(P('Standup'), RECT);

			const restored = await restoreDeletedEvent(P('Standup'));

			expect(restored).toBe(P('Standup (restored)'));
			expect(disk.get(restored)).toContain('start: 09:30');
			expect(eventCalendarStore.history.undo.map((op) => op.path)).toEqual([restored]);
			// The popover was opened on the note that now holds the old path.
			expect(eventCalendarViewStore.popover?.path).toBe(P('Standup'));
			expect(eventCalendarStore.eventByPath(restored)).toMatchObject({ title: 'Standup (restored)', start: 570, pending: true });
			await refresh(2);
			expect(eventCalendarStore.events.map((e) => [e.path, e.start, e.pending])).toEqual([
				[P('Standup (restored)'), 570, false],
				[P('Standup'), 840, false],
			]);
		});

		it('refuses with not-in-trash after the Trash was emptied, leaving every store untouched', async () => {
			await deleteEvent(P('Standup'));
			trashStore.setItems([]);
			const before = { events: eventCalendarStore.events, history: eventCalendarStore.history, pending: eventCalendarStore.pendingPaths };

			expect(await calendarReasonOf(restoreDeletedEvent(P('Standup')))).toBe('not-in-trash');

			expect(eventCalendarStore.events).toBe(before.events);
			expect(eventCalendarStore.history).toBe(before.history);
			expect(eventCalendarStore.pendingPaths).toBe(before.pending);
			expect(trashStore.items).toEqual([]);
		});

		it('refuses with not-in-trash for a path that was never trashed', async () => {
			await deleteEvent(P('Standup'));
			const items = trashStore.items;

			expect(await calendarReasonOf(restoreDeletedEvent(P('Unknown')))).toBe('not-in-trash');

			expect(trashStore.items).toBe(items);
			expect(disk.has(P('Standup'))).toBe(false);
		});

		it('refuses with restore-failed when the rename out of the Trash fails, keeping the entry', async () => {
			await deleteEvent(P('Standup'));
			const items = trashStore.items;
			const history = eventCalendarStore.history;
			vi.mocked(rename).mockRejectedValueOnce(new Error('permission denied'));

			const restore = restoreDeletedEvent(P('Standup'));

			await expect(restore).rejects.toThrow('Could not restore the note from the Trash');
			expect(await calendarReasonOf(restore)).toBe('restore-failed');
			expect(trashStore.items).toBe(items);
			expect(trashedPaths()).toHaveLength(1);
			expect(disk.has(P('Standup'))).toBe(false);
			expect(eventCalendarStore.history).toBe(history);
		});

		it('a suffixed toast Undo leaves the ops of the note created at the old path on it', async () => {
			await deleteEvent(P('Standup'));
			await refresh(2);
			const created = await createEvent(draft({ title: 'Standup', date: '2026-11-10', start: 570, end: 600 }));
			expect(created).toBe(P('Standup'));
			await refresh(2);
			eventCalendarViewStore.openPopover(P('Standup'), RECT);

			expect(await undoDeleteEvent(P('Standup'))).toBe(P('Standup (restored)'));

			expect(eventCalendarStore.history.undo).toEqual([expect.objectContaining({ kind: 'create', label: 'Create event', path: P('Standup'), state: expect.objectContaining({ title: 'Standup' }) })]);
			expect(eventCalendarViewStore.popover?.path).toBe(P('Standup'));
			await refresh(2);
			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Create event' });
			expect(disk.has(P('Standup'))).toBe(false);
			expect(disk.get(P('Standup (restored)'))).toContain('start: 09:30');
		});

		it('a suffixed restoreDeletedEvent moves only the delete op, not the later create on the old path', async () => {
			await deleteEvent(P('Standup'));
			await refresh(2);
			await createEvent(draft({ title: 'Standup', date: '2026-11-10', start: 570, end: 600 }));
			await refresh(2);

			expect(await restoreDeletedEvent(P('Standup'))).toBe(P('Standup (restored)'));

			expect(eventCalendarStore.history.undo.map((op) => [op.kind, op.path])).toEqual([
				['delete', P('Standup (restored)')],
				['create', P('Standup')],
			]);
			await refresh(2);
			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Create event' });
			expect(disk.has(P('Standup'))).toBe(false);
			expect(disk.has(P('Standup (restored)'))).toBe(true);
		});

		it('a suffixed restore leaves the ops of an earlier note at the old path on it', async () => {
			// Note A: moved through the calendar, then deleted outside it.
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 630 });
			await refresh(2);
			disk.delete(P('Standup'));
			await refresh();
			// Note B: created at the same path, then deleted through the calendar.
			expect(await createEvent(draft({ title: 'Standup', date: '2026-11-10', start: 570, end: 600 }))).toBe(P('Standup'));
			await refresh(2);
			await deleteEvent(P('Standup'));
			disk.set(P('Standup'), eventFile({ start: '14:00', end: '15:00' }));
			await refresh(2);

			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Delete event' });

			const restored = P('Standup (restored)');
			expect(eventCalendarStore.history.undo.map((op) => [op.kind, op.path])).toEqual([
				['update', P('Standup')],
				['create', restored],
			]);
			expect(eventCalendarStore.history.redo.map((op) => [op.kind, op.path])).toEqual([['delete', restored]]);
		});

		it('a suffixed restore leaves an earlier delete and the ops before it on the old path', async () => {
			// Note A: moved, then deleted through the calendar. Note B appears outside it.
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 630 });
			await refresh(2);
			await deleteEvent(P('Standup'));
			disk.set(P('Standup'), eventFile({ start: '12:00', end: '13:00' }));
			await refresh(2);
			await moveEvent(P('Standup'), { date: '2026-11-12', start: 720, end: 780 });
			await refresh(2);
			await deleteEvent(P('Standup'));
			disk.set(P('Standup'), eventFile({ start: '14:00', end: '15:00' }));
			await refresh(2);

			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Delete event' });

			const restored = P('Standup (restored)');
			expect(disk.get(restored)).toContain('start: 12:00');
			expect(eventCalendarStore.history.undo.map((op) => [op.kind, op.path])).toEqual([
				['update', P('Standup')],
				['delete', P('Standup')],
				['update', restored],
			]);
		});

		it("undoDeleteEvent restores and retires the delete op, so Cmd+Z offers nothing", async () => {
			await deleteEvent(P('Standup'));

			expect(await undoDeleteEvent(P('Standup'))).toBe(P('Standup'));

			expect(disk.has(P('Standup'))).toBe(true);
			expect(eventCalendarStore.canUndo).toBe(false);
			expect(eventCalendarStore.canRedo).toBe(false);
			expect(await undoEventChange()).toEqual({ status: 'empty', label: null });
		});
	});

	describe('undo and redo of creates and deletes', () => {
		it('undo of a delete restores the note, redo deletes it again', async () => {
			await deleteEvent(P('Standup'));

			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Delete event' });
			expect(disk.has(P('Standup'))).toBe(true);
			expect(trashStore.items).toEqual([]);
			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ start: 570, end: 600 });

			expect(await redoEventChange()).toEqual({ status: 'done', label: 'Delete event' });
			expect(disk.has(P('Standup'))).toBe(false);
			expect(trashStore.items).toHaveLength(1);
			expect(eventCalendarStore.eventByPath(P('Standup'))).toBeUndefined();

			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Delete event' });
			expect(disk.has(P('Standup'))).toBe(true);
		});

		it('undo of a create deletes the note, redo restores it', async () => {
			await createEvent(draft());

			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Create event' });
			expect(disk.has(P('Planning'))).toBe(false);
			expect(eventCalendarStore.eventByPath(P('Planning'))).toBeUndefined();
			expect(trashStore.items.map((i) => i.originalPath)).toEqual(['Planning.md']);

			expect(await redoEventChange()).toEqual({ status: 'done', label: 'Create event' });
			expect(disk.get(P('Planning'))).toContain('start: 10:00');
			expect(trashStore.items).toEqual([]);
			expect(eventCalendarStore.eventByPath(P('Planning'))).toMatchObject({ title: 'Planning', start: 600 });
		});

		it('undo of a duplicate deletes the copy', async () => {
			await duplicateEvent(P('Standup'));

			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Duplicate event' });
			expect(disk.has(P('Standup (copy)'))).toBe(false);
			expect(disk.has(P('Standup'))).toBe(true);
		});

		it('refuses to undo a create after the note changed, keeping the note', async () => {
			await createEvent(draft());
			await refresh(2);
			const external = eventFile({ date: '2026-11-12', start: '16:00', end: '17:00' });
			disk.set(P('Planning'), external);
			await refresh(2);

			expect(await undoEventChange()).toEqual({ status: 'refused', label: 'Create event', path: P('Planning') });
			expect(disk.get(P('Planning'))).toBe(external);
			expect(eventCalendarStore.canUndo).toBe(false);
			expect(eventCalendarStore.canRedo).toBe(false);
		});

		it('returns vanished for a created note deleted outside the calendar', async () => {
			await createEvent(draft());
			await refresh(2);
			disk.delete(P('Planning'));
			await refresh();

			expect(await undoEventChange()).toEqual({ status: 'vanished', label: 'Create event' });
			expect(eventCalendarStore.history.undo).toEqual([]);
			expect(eventCalendarStore.history.redo).toEqual([]);
		});

		it('refuses to undo a delete once the Trash was emptied', async () => {
			await deleteEvent(P('Standup'));
			trashStore.setItems([]);

			expect(await undoEventChange()).toEqual({ status: 'refused', label: 'Delete event', reason: 'not-in-trash' });
			expect(disk.has(P('Standup'))).toBe(false);
			expect(eventCalendarStore.canUndo).toBe(false);
			expect(eventCalendarStore.canRedo).toBe(false);
		});

		it('undo of a delete restored under a suffixed path remaps the op there', async () => {
			await deleteEvent(P('Standup'));
			disk.set(P('Standup'), eventFile({ start: '14:00', end: '15:00' }));
			await refresh(2);

			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Delete event' });

			expect(disk.get(P('Standup (restored)'))).toContain('start: 09:30');
			expect(eventCalendarStore.history.redo.map((op) => op.path)).toEqual([P('Standup (restored)')]);
			expect(await redoEventChange()).toEqual({ status: 'done', label: 'Delete event' });
			expect(disk.has(P('Standup (restored)'))).toBe(false);
			expect(disk.get(P('Standup'))).toContain('start: 14:00');
		});
	});

	describe('path changes made outside the calendar', () => {
		const MOVED = { date: '2026-11-11', start: 600, end: 660 };
		let unregister: () => void;

		beforeEach(async () => {
			// The real rename runs `applyPathChange`, which is what reaches the consumer.
			const actual = await vi.importActual<typeof import('$lib/core/filesystem/fs.service')>('$lib/core/filesystem/fs.service');
			vi.mocked(renameItem).mockImplementation(actual.renameItem);
			// The link rewrite of a rename reads the note's backlinks; none here.
			const served = vi.mocked(invoke).getMockImplementation()!;
			vi.mocked(invoke).mockImplementation(async (cmd, args) => (cmd === 'get_backlinks_v2' ? [] : served(cmd, args)));
			unregister = registerEventCalendarPathChangeConsumer();
		});

		afterEach(() => {
			unregister();
		});

		it('undoes a move on the renamed note before the index catches up', async () => {
			await moveEvent(P('Standup'), MOVED);

			expect(await renameItem(P('Standup'), 'Retro.md')).toBe(P('Retro'));

			expect(eventCalendarStore.history.undo.map((op) => op.path)).toEqual([P('Retro')]);
			expect(eventCalendarStore.eventByPath(P('Retro'))).toMatchObject({ title: 'Retro', ...MOVED });
			expect(eventCalendarStore.eventByPath(P('Standup'))).toBeUndefined();
			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Move event' });
			expect(disk.has(P('Standup'))).toBe(false);
			expect(disk.get(P('Retro'))).toContain('date: 2026-11-10');
			expect(disk.get(P('Retro'))).toContain('start: 09:30');
		});

		it('undoes and redoes a move on the renamed note once the index shows the new name', async () => {
			await moveEvent(P('Standup'), MOVED);
			await renameItem(P('Standup'), 'Retro.md');
			await refresh();
			expect(eventCalendarStore.events.map((e) => [e.path, e.title])).toEqual([[P('Retro'), 'Retro']]);

			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Move event' });
			expect(disk.get(P('Retro'))).toContain('start: 09:30');
			await refresh();
			expect(await redoEventChange()).toEqual({ status: 'done', label: 'Move event' });
			expect(disk.get(P('Retro'))).toContain('start: 10:00');
			expect(eventCalendarStore.eventByPath(P('Retro'))).toMatchObject({ title: 'Retro', ...MOVED });
		});

		it('keeps an event_title, which the rename does not change', async () => {
			disk.set(P('Standup'), eventFile({ event_title: 'Team standup' }));
			await refresh();
			await moveEvent(P('Standup'), MOVED);
			await renameItem(P('Standup'), 'Retro.md');
			await refresh();

			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Move event' });
			expect(disk.get(P('Retro'))).toContain('start: 09:30');
		});

		it('follows a redo op on the renamed note', async () => {
			await moveEvent(P('Standup'), MOVED);
			await undoEventChange();
			await renameItem(P('Standup'), 'Retro.md');

			expect(eventCalendarStore.history.redo.map((op) => op.path)).toEqual([P('Retro')]);
			expect(await redoEventChange()).toEqual({ status: 'done', label: 'Move event' });
			expect(disk.get(P('Retro'))).toContain('start: 10:00');
		});

		it('remaps the notes under a moved folder', async () => {
			const inFolder = `${VAULT}/Events/Sync.md`;
			const moved = `${VAULT}/Archive/Events/Sync.md`;
			disk.set(inFolder, eventFile());
			await refresh();
			await moveEvent(inFolder, MOVED);
			await moveEvent(P('Standup'), MOVED);
			// The fake `rename` moves one key; a folder rename carries its children.
			vi.mocked(rename).mockImplementationOnce(async (from, to) => {
				for (const key of [...disk.keys()]) {
					if (!key.startsWith(`${String(from)}/`)) continue;
					disk.set(String(to) + key.slice(String(from).length), disk.get(key)!);
					disk.delete(key);
				}
			});

			expect(await moveItem(`${VAULT}/Events`, `${VAULT}/Archive`)).toBe(`${VAULT}/Archive/Events`);

			expect(eventCalendarStore.history.undo.map((op) => op.path)).toEqual([moved, P('Standup')]);
			await refresh();
			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Move event' });
			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Move event' });
			expect(disk.get(moved)).toContain('start: 09:30');
			expect(disk.has(inFolder)).toBe(false);
		});

		it('drops the ops of a note deleted outside the calendar', async () => {
			disk.set(P('Retro'), eventFile());
			await refresh();
			await moveEvent(P('Retro'), MOVED);
			await moveEvent(P('Standup'), MOVED);
			await undoEventChange();

			expect(await deleteItem(P('Standup'))).toBe(true);

			expect(eventCalendarStore.history.undo.map((op) => op.path)).toEqual([P('Retro')]);
			expect(eventCalendarStore.history.redo).toEqual([]);
			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Move event' });
			expect(disk.get(P('Retro'))).toContain('start: 09:30');
		});

		it('drops the event of a note moved into a dot-folder, which the index never shows', async () => {
			await moveEvent(P('Standup'), MOVED);

			expect(await moveItem(P('Standup'), `${VAULT}/.archive`)).toBe(`${VAULT}/.archive/Standup.md`);
			await refresh(6);

			expect(eventCalendarStore.events).toEqual([]);
			expect(eventCalendarStore.isPending(`${VAULT}/.archive/Standup.md`)).toBe(false);
		});

		it('drops the event of a note renamed to a non-.md name', async () => {
			await moveEvent(P('Standup'), MOVED);
			// The fake index still lists any key; a real one has no `.txt` note.
			const served = vi.mocked(invoke).getMockImplementation()!;
			vi.mocked(invoke).mockImplementation(async (cmd, args) => {
				const result = await served(cmd, args);
				return cmd === 'get_all_vault_entries_v2' ? (result as NoteEntryV2[]).filter((e) => e.path.endsWith('.md')) : result;
			});

			expect(await renameItem(P('Standup'), 'Standup.txt')).toBe(`${VAULT}/Standup.txt`);
			await refresh(6);

			expect(eventCalendarStore.events).toEqual([]);
		});

		it('hides a note renamed and then deleted before the index catches up', async () => {
			await moveEvent(P('Standup'), MOVED);
			await renameItem(P('Standup'), 'Retro.md');

			expect(await deleteItem(P('Retro'))).toBe(true);

			expect(eventCalendarStore.events).toEqual([]);
			expect(eventCalendarStore.history.undo).toEqual([]);
			await refresh(6);
			expect(eventCalendarStore.events).toEqual([]);
			expect(eventCalendarStore.pendingPaths.size).toBe(0);
		});

		it('shows a note deleted and restored before the index dropped it again two refreshes later', async () => {
			const content = disk.get(P('Standup'))!;
			expect(await deleteItem(P('Standup'))).toBe(true);
			expect(eventCalendarStore.eventByPath(P('Standup'))).toBeUndefined();
			expect(eventCalendarStore.pendingWrite(P('Standup'))).toMatchObject({ kind: 'delete', settledAtVersion: version });

			// Restored from the Trash within the throttle window: the index never drops the path.
			disk.set(P('Standup'), content);
			await refresh(2);

			expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ title: 'Standup', pending: false });
			expect(eventCalendarStore.pendingPaths.size).toBe(0);
		});

		it('shows the event at the old path after a rename and a rename back before the index catches up', async () => {
			await renameItem(P('Standup'), 'Retro.md');
			await renameItem(P('Retro'), 'Standup.md');

			expect(eventCalendarStore.events.map((e) => [e.path, e.title])).toEqual([[P('Standup'), 'Standup']]);
			await refresh(2);
			expect(eventCalendarStore.events.map((e) => [e.path, e.title])).toEqual([[P('Standup'), 'Standup']]);
			expect(eventCalendarStore.pendingPaths.size).toBe(0);
		});

		it('does not leave an unsettled overlay when the rename lands during a calendar write', async () => {
			const gate = holdNextWrite();
			const move = moveEvent(P('Standup'), MOVED);
			await flush();

			await renameItem(P('Standup'), 'Retro.md');
			gate.resolve();
			await move;
			await refresh(6);

			expect(eventCalendarStore.pendingWrite(P('Retro'))).toBeUndefined();
		});

		it('leaves the history alone for a note the calendar does not know', async () => {
			disk.set(P('Notes'), '# Notes\n');
			await moveEvent(P('Standup'), MOVED);
			const { history } = eventCalendarStore;

			await renameItem(P('Notes'), 'Journal.md');
			await deleteItem(P('Journal'));

			expect(eventCalendarStore.history).toBe(history);
			expect(eventCalendarStore.isPending(P('Notes'))).toBe(false);
		});

		it('keeps the ops of its own delete, so undo restores the note and then undoes the move', async () => {
			await moveEvent(P('Standup'), MOVED);
			await deleteEvent(P('Standup'));

			expect(eventCalendarStore.history.undo.map((op) => op.kind)).toEqual(['update', 'delete']);
			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Delete event' });
			await refresh();
			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Move event' });
			expect(disk.get(P('Standup'))).toContain('start: 09:30');
		});

		it('keeps the redo of an undone create, whose undo deletes the note', async () => {
			const path = await createEvent(draft());
			await refresh();

			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Create event' });
			expect(disk.has(path)).toBe(false);
			expect(eventCalendarStore.history.redo.map((op) => op.path)).toEqual([path]);
			expect(await redoEventChange()).toEqual({ status: 'done', label: 'Create event' });
			expect(disk.has(path)).toBe(true);
		});

		it('undoes and redoes its own title rename through the real rename', async () => {
			await editEvent(P('Standup'), { title: 'Daily sync' });
			await refresh(2);
			expect(eventCalendarStore.history.undo.map((op) => op.path)).toEqual([P('Daily sync')]);

			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Edit event' });
			expect(disk.has(P('Daily sync'))).toBe(false);
			expect(eventCalendarStore.history.redo.map((op) => op.path)).toEqual([P('Standup')]);
			await refresh(2);
			expect(await redoEventChange()).toEqual({ status: 'done', label: 'Edit event' });
			expect(eventCalendarStore.events.map((e) => [e.path, e.title])).toEqual([[P('Daily sync'), 'Daily sync']]);
		});
	});

	describe('deleteEventFromUi and duplicateEventFromUi', () => {
		/** A focusable stand-in for the Calendar view root. */
		function makeRoot(): HTMLElement {
			const el = document.body.appendChild(document.createElement('div'));
			el.tabIndex = -1;
			return el;
		}

		/** The `onClick` of the action the last plain toast carried. */
		function toastAction(): () => void {
			const [, options] = vi.mocked(toast).mock.calls.at(-1) as unknown as [string, { action: { onClick: () => void } }];
			return options.action.onClick;
		}

		afterEach(() => {
			document.body.innerHTML = '';
		});

		it('deletes, toasts "Event deleted" with Undo, and the Undo restores and focuses the root', async () => {
			const root = makeRoot();

			await deleteEventFromUi(P('Standup'), root);

			expect(disk.has(P('Standup'))).toBe(false);
			expect(toast).toHaveBeenCalledWith('Event deleted', {
				description: 'Standup',
				onDismiss: expect.any(Function),
				onAutoClose: expect.any(Function),
				action: { label: 'Undo', onClick: expect.any(Function) },
			});
			toastAction()();
			await drainEventCalendarWrites();
			await flush();
			expect(disk.has(P('Standup'))).toBe(true);
			expect(eventCalendarStore.history.undo.some((op) => op.kind === 'delete')).toBe(false);
			expect(document.activeElement).toBe(root);
		});

		it('the Undo focuses the live view root when the view remounted while the toast was up', async () => {
			const stale = makeRoot();
			await deleteEventFromUi(P('Standup'), stale);
			stale.remove();
			const live = makeRoot();
			live.dataset.eventCalendar = '';

			toastAction()();
			await drainEventCalendarWrites();
			await flush();

			expect(disk.has(P('Standup'))).toBe(true);
			expect(document.activeElement).toBe(live);
		});

		it('the Undo focuses the view that deleted, not the first Calendar root in the DOM', async () => {
			const first = makeRoot();
			first.dataset.eventCalendar = '';
			const second = makeRoot();
			second.dataset.eventCalendar = '';
			await deleteEventFromUi(P('Standup'), second);

			toastAction()();
			await drainEventCalendarWrites();
			await flush();

			expect(disk.has(P('Standup'))).toBe(true);
			expect(document.activeElement).toBe(second);
		});

		it('an Undo after the Trash was emptied toasts "Event is no longer in the Trash" and focuses the root', async () => {
			const root = makeRoot();
			await deleteEventFromUi(P('Standup'), root);
			trashStore.setItems([]);

			toastAction()();
			await drainEventCalendarWrites();
			await flush();

			expect(toast.error).toHaveBeenCalledWith('Event is no longer in the Trash');
			expect(document.activeElement).toBe(root);
		});

		it('an Undo whose restore fails toasts that the restore failed, not that the note left the Trash', async () => {
			const root = makeRoot();
			await deleteEventFromUi(P('Standup'), root);
			const historyBefore = eventCalendarStore.history;
			vi.mocked(rename).mockRejectedValueOnce(new Error('permission denied'));

			toastAction()();
			await drainEventCalendarWrites();
			await flush();

			expect(vi.mocked(toast.error).mock.calls).toEqual([['Could not restore the note from the Trash']]);
			expect(trashStore.items).toHaveLength(1);
			// Unlike the restore-from-Trash path, the toast Undo keeps its delete op when the restore fails.
			expect(eventCalendarStore.history).toEqual(historyBefore);
			expect(eventCalendarStore.canUndo).toBe(true);
			expect(document.activeElement).toBe(root);
		});

		it('a vault switch dismisses the "Event deleted" toasts', async () => {
			// The suite's own reset dismissed earlier tests' toasts.
			vi.mocked(toast.dismiss).mockClear();
			vi.mocked(toast).mockReturnValueOnce('first').mockReturnValueOnce('second');
			disk.set(P('Retro'), eventFile());
			await refresh();
			await deleteEventFromUi(P('Standup'), makeRoot());
			await deleteEventFromUi(P('Retro'), makeRoot());

			resetEventCalendar();

			expect(vi.mocked(toast.dismiss).mock.calls).toEqual([['first'], ['second']]);
			resetEventCalendar();
			expect(toast.dismiss).toHaveBeenCalledTimes(2);
		});

		it('a vault switch while the delete is in flight shows no "Event deleted" toast', async () => {
			const gate = deferred<void>();
			const real = vi.mocked(rename).getMockImplementation()!;
			vi.mocked(rename).mockImplementationOnce(async (...args) => {
				await gate.promise;
				return real(...args);
			});
			const done = deleteEventFromUi(P('Standup'), makeRoot());
			await flush();

			resetEventCalendar();
			gate.resolve();
			await done;

			expect(disk.has(P('Standup'))).toBe(false);
			expect(toast).not.toHaveBeenCalled();
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('a toast closed by the user or by its timer is not dismissed again on a vault switch', async () => {
			vi.mocked(toast.dismiss).mockClear();
			vi.mocked(toast).mockReturnValueOnce('closed').mockReturnValueOnce('timed-out').mockReturnValueOnce('open');
			disk.set(P('Retro'), eventFile());
			disk.set(P('Review'), eventFile());
			await refresh();
			await deleteEventFromUi(P('Standup'), makeRoot());
			await deleteEventFromUi(P('Retro'), makeRoot());
			await deleteEventFromUi(P('Review'), makeRoot());
			const options = vi.mocked(toast).mock.calls.map(([, o]) => o as { onDismiss: (t: { id: string }) => void; onAutoClose: (t: { id: string }) => void });
			options[0].onDismiss({ id: 'closed' });
			options[1].onAutoClose({ id: 'timed-out' });

			resetEventCalendar();

			expect(vi.mocked(toast.dismiss).mock.calls).toEqual([['open']]);
		});

		it('an Undo clicked after a vault switch restores nothing and says the note is no longer in the Trash', async () => {
			const root = makeRoot();
			await deleteEventFromUi(P('Standup'), root);
			// The next vault resolves the same relative path (a nested vault, or the same one reopened).
			resetEventCalendar();

			toastAction()();
			await drainEventCalendarWrites();
			await flush();

			expect(disk.has(P('Standup'))).toBe(false);
			expect(trashStore.items.map((i) => i.originalPath)).toEqual(['Standup.md']);
			expect(toast.error).toHaveBeenCalledWith('Event is no longer in the Trash');
			expect(document.activeElement).toBe(root);
		});

		it('a failed delete toasts the error and shows no "Event deleted"', async () => {
			vi.mocked(rename).mockRejectedValueOnce(new Error('permission denied'));

			await deleteEventFromUi(P('Standup'), makeRoot());

			expect(toast).not.toHaveBeenCalled();
			expect(toast.error).toHaveBeenCalled();
			expect(disk.has(P('Standup'))).toBe(true);
		});

		it("duplicates, toasts the copy's title, and focuses the root when the copy has no block", async () => {
			const root = makeRoot();

			await duplicateEventFromUi(P('Standup'), root);

			expect(disk.has(P('Standup (copy)'))).toBe(true);
			expect(toast.success).toHaveBeenCalledWith('Event duplicated', { description: 'Standup (copy)' });
			expect(document.activeElement).toBe(root);
		});

		it("focuses the copy's block when it renders", async () => {
			const root = makeRoot();
			const copyBlock = root.appendChild(document.createElement('div'));
			copyBlock.tabIndex = 0;
			copyBlock.dataset.eventPath = P('Standup (copy)');

			await duplicateEventFromUi(P('Standup'), root);

			expect(document.activeElement).toBe(copyBlock);
		});

		it('a failed duplicate toasts the error and focuses the root', async () => {
			const root = makeRoot();

			await duplicateEventFromUi(P('Gone'), root);

			expect(toast.success).not.toHaveBeenCalled();
			expect(toast.error).toHaveBeenCalledWith('The note was moved or deleted outside the calendar');
			expect(document.activeElement).toBe(root);
		});
	});

	describe('undoEventChangeFromUi and redoEventChangeFromUi', () => {
		/** A focusable stand-in for the Calendar view root. */
		function makeRoot(): HTMLElement {
			const el = document.body.appendChild(document.createElement('div'));
			el.tabIndex = -1;
			return el;
		}

		/** The `onClick` of the action the last plain toast carried. */
		function toastAction(): () => void {
			const [, options] = vi.mocked(toast).mock.calls.at(-1) as unknown as [string, { action: { onClick: () => void } }];
			return options.action.onClick;
		}

		afterEach(() => {
			document.body.innerHTML = '';
		});

		it('says "Nothing to undo" and "Nothing to redo" with empty stacks', async () => {
			await undoEventChangeFromUi();
			await redoEventChangeFromUi();

			expect(vi.mocked(toast).mock.calls).toEqual([['Nothing to undo'], ['Nothing to redo']]);
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('toasts "Undone: <label>" with Redo; the Redo re-applies, toasts "Redone" with Undo and focuses the root', async () => {
			const root = makeRoot();
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });

			await undoEventChangeFromUi(root);

			expect(disk.get(P('Standup'))).toContain('date: 2026-11-10');
			expect(toast).toHaveBeenLastCalledWith('Undone: Move event', { action: { label: 'Redo', onClick: expect.any(Function) } });

			toastAction()();
			await drainEventCalendarWrites();
			await flush();

			expect(disk.get(P('Standup'))).toContain('date: 2026-11-11');
			expect(toast).toHaveBeenLastCalledWith('Redone: Move event', { action: { label: 'Undo', onClick: expect.any(Function) } });
			expect(document.activeElement).toBe(root);
		});

		it('the toast action focuses the live view root over the stale one', async () => {
			const stale = makeRoot();
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			await undoEventChangeFromUi(stale);
			stale.remove();
			const live = makeRoot();
			live.dataset.eventCalendar = '';

			toastAction()();
			await drainEventCalendarWrites();
			await flush();

			expect(document.activeElement).toBe(live);
		});

		it('the toast action focuses the view that issued it, not the first Calendar root in the DOM', async () => {
			const first = makeRoot();
			first.dataset.eventCalendar = '';
			const second = makeRoot();
			second.dataset.eventCalendar = '';
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			await undoEventChangeFromUi(second);

			toastAction()();
			await drainEventCalendarWrites();
			await flush();

			expect(document.activeElement).toBe(second);
		});

		it('a refusal on a note still on disk toasts "Event changed since; not undone" with Open note', async () => {
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			await refresh();
			disk.set(P('Standup'), eventFile({ date: '2026-11-11', start: '11:00', end: '12:00' }));
			await refresh(2);

			await undoEventChangeFromUi();

			expect(toast.error).toHaveBeenCalledWith('Event changed since; not undone', {
				action: { label: 'Open note', onClick: expect.any(Function) },
			});
			expect(toast).not.toHaveBeenCalled();
		});

		it('a redo refusal on a note still on disk says "not redone"', async () => {
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			await refresh();
			await undoEventChange();
			await refresh();
			disk.set(P('Standup'), eventFile({ date: '2026-11-12', start: '11:00', end: '12:00' }));
			await refresh(2);

			await redoEventChangeFromUi();

			expect(toast.error).toHaveBeenCalledWith('Event changed since; not redone', {
				action: { label: 'Open note', onClick: expect.any(Function) },
			});
		});

		it('an undo of a delete whose Trash entry is gone says the note left the Trash, without Open note', async () => {
			await deleteEvent(P('Standup'));
			trashStore.setItems([]);

			await undoEventChangeFromUi();

			expect(vi.mocked(toast.error).mock.calls).toEqual([['The note is no longer in the Trash; cannot undo']]);
		});

		it('an undo of a delete whose restore fails says the restore failed and refuses the op', async () => {
			await deleteEvent(P('Standup'));
			vi.mocked(rename).mockRejectedValueOnce(new Error('permission denied'));

			await undoEventChangeFromUi();

			expect(vi.mocked(toast.error).mock.calls).toEqual([['Could not restore the note from the Trash']]);
			expect(trashStore.items).toHaveLength(1);
			expect(eventCalendarStore.canUndo).toBe(false);
		});

		it('a redo of a create whose Trash entry is gone says the note left the Trash', async () => {
			await createEvent(draft());
			await refresh(2);
			await undoEventChange();
			await refresh(2);
			trashStore.setItems([]);

			await redoEventChangeFromUi();

			expect(vi.mocked(toast.error).mock.calls).toEqual([['The note is no longer in the Trash; cannot redo']]);
		});

		it('vanished toasts that the event was moved or renamed outside the calendar', async () => {
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			await refresh();
			disk.set(P('Moved'), disk.get(P('Standup'))!);
			disk.delete(P('Standup'));
			await refresh();

			await undoEventChangeFromUi();

			expect(toast.error).toHaveBeenCalledWith('Event was moved or renamed outside the calendar; cannot undo');
			expect(toast).not.toHaveBeenCalled();
		});

		it('a failed undo write goes through toastEventError', async () => {
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));

			await undoEventChangeFromUi();

			expect(toast.error).toHaveBeenCalledWith('disk full');
			expect(toast).not.toHaveBeenCalled();
		});
	});

	describe('toastEventError', () => {
		it('skips save-failed, which the editor already toasted', () => {
			toastEventError(new FrontmatterWriteError('save-failed', P('Standup')), P('Standup'));
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('reports missing as moved or deleted outside the calendar', () => {
			toastEventError(new FrontmatterWriteError('missing', P('Standup')), P('Standup'));
			expect(toast.error).toHaveBeenCalledWith('The note was moved or deleted outside the calendar');
		});

		it.each(['comments', 'nested', 'unparseable', 'vault-changed'] as const)('offers Open note for %s', (reason) => {
			toastEventError(new FrontmatterWriteError(reason, P('Standup')), P('Standup'));
			expect(toast.error).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ action: expect.objectContaining({ label: 'Open note' }) }),
			);
		});

		it.each([
			['not-in-trash', 'Event is no longer in the Trash'],
			['template-lossy', "The Event template's frontmatter has comments or nested values; fix it or remove the template from the Event type"],
			['create-failed', 'Could not create the note; a note with the same name, possibly differing only in case, may exist'],
			['restore-failed', 'Could not restore the note from the Trash'],
		] as const)('shows the message of EventCalendarError %s', (reason, message) => {
			toastEventError(new EventCalendarError(reason), P('Standup'));
			expect(toast.error).toHaveBeenCalledWith(message);
		});

		it('shows the message of any other error', () => {
			toastEventError(new Error('Could not rename'), P('Standup'));
			expect(toast.error).toHaveBeenCalledWith('Could not rename');
		});
	});

	describe('eventErrorMessage', () => {
		it.each([
			['save-failed', 'Could not save the note'],
			['missing', 'The note was moved or deleted outside the calendar'],
			['comments', "The note's frontmatter has comments; the calendar cannot rewrite it"],
			['vault-changed', 'The vault changed before the event was saved'],
		] as const)('maps FrontmatterWriteError %s to its message', (reason, message) => {
			expect(eventErrorMessage(new FrontmatterWriteError(reason, P('Standup')))).toBe(message);
		});

		it('maps an EventCalendarError to its reason message', () => {
			expect(eventErrorMessage(new EventCalendarError('not-in-trash'))).toBe('Event is no longer in the Trash');
			expect(eventErrorMessage(new EventCalendarError('read-only'))).toBe('This event has an end date or crosses midnight; change its date and time in the note');
		});

		it('passes any other error message through, and stringifies a non-error', () => {
			expect(eventErrorMessage(new Error('disk full'))).toBe('disk full');
			expect(eventErrorMessage('boom')).toBe('boom');
		});
	});
});
