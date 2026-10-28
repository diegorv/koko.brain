// @vitest-environment jsdom
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
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

// `renameItem` runs the full path-change owner (tree refresh, link rewrite,
// Rust re-key); the write tests replace it with a move on the fake disk.
vi.mock('$lib/core/filesystem/fs.service', async () => {
	const actual = await vi.importActual<typeof import('$lib/core/filesystem/fs.service')>('$lib/core/filesystem/fs.service');
	return { ...actual, renameItem: vi.fn() };
});

import { invoke } from '@tauri-apps/api/core';
import { exists, readDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { renameItem } from '$lib/core/filesystem/fs.service';
import { resetHooks } from '$lib/core/editor/editor.hooks';
import { clearAllIndexed } from '$lib/utils/index-dedupe';
import { _resetParseFrontmatterCache } from '$lib/features/properties/properties.logic';
import { FrontmatterWriteError } from '$lib/features/properties/frontmatter-write.service';
import { EVENT_CALENDAR_VIRTUAL_PATH } from '$lib/core/editor/editor.logic';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { invalidateVaultEntries } from '$lib/core/vault/vault-entries.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import {
	acquireCalendarClock,
	closeEventCalendarTab,
	drainEventCalendarWrites,
	editEvent,
	loadEvents,
	moveEvent,
	openEventCalendarTab,
	redoEventChange,
	resetEventCalendar,
	resizeEvent,
	toastEventError,
	toggleEventCalendarTab,
	undoEventChange,
	updateEventFields,
} from '$lib/features/event-calendar/event-calendar.service';
import { eventCalendarStore } from '$lib/features/event-calendar/event-calendar.store.svelte';
import { eventCalendarViewStore } from '$lib/features/event-calendar/event-calendar-view.store.svelte';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
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
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd !== 'get_all_vault_entries_v2') return undefined;
			return [...disk.entries()].map(([path, content]) => eventEntryFromContent(path, content));
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
			await second.catch(() => {});
			expect(writeTextFile).toHaveBeenCalledTimes(2);
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

		it('refuses an undo after an external change and drops the op', async () => {
			await moveEvent(P('Standup'), { date: '2026-11-11', start: 600, end: 660 });
			await refresh();
			const external = eventFile({ date: '2026-11-11', start: '11:00', end: '12:00' });
			disk.set(P('Standup'), external);
			await refresh(2);
			vi.mocked(writeTextFile).mockClear();

			expect(await undoEventChange()).toEqual({ status: 'refused', label: 'Move event' });
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

		it('returns empty with nothing to undo or redo', async () => {
			expect(await undoEventChange()).toEqual({ status: 'empty', label: null });
			expect(await redoEventChange()).toEqual({ status: 'empty', label: null });
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

		it('shows the message of any other error', () => {
			toastEventError(new Error('Could not rename'), P('Standup'));
			expect(toast.error).toHaveBeenCalledWith('Could not rename');
		});
	});
});
