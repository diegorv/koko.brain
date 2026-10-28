// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Tauri IPC and the filesystem are side effects; the stores, the write
// service and the frontmatter writer stay real (CLAUDE.md rule 1).
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
	toast: { error: vi.fn(), success: vi.fn() },
}));

// Opening a note is the editor's side effect; saving stays real.
vi.mock('$lib/core/editor/editor.service', async () => {
	const actual = await vi.importActual<typeof import('$lib/core/editor/editor.service')>('$lib/core/editor/editor.service');
	return { ...actual, openFileInEditor: vi.fn() };
});

// `renameItem` runs the full path-change owner; a move on the fake disk replaces it.
vi.mock('$lib/core/filesystem/fs.service', async () => {
	const actual = await vi.importActual<typeof import('$lib/core/filesystem/fs.service')>('$lib/core/filesystem/fs.service');
	return { ...actual, renameItem: vi.fn() };
});

import { flushSync, mount, tick, unmount } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import { exists, readDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { resetHooks } from '$lib/core/editor/editor.hooks';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { renameItem } from '$lib/core/filesystem/fs.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { invalidateVaultEntries } from '$lib/core/vault/vault-entries.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { _resetParseFrontmatterCache } from '$lib/features/properties/properties.logic';
import { clearAllIndexed } from '$lib/utils/index-dedupe';
import EventDialog from '$lib/features/event-calendar/EventDialog.svelte';
import EventTimeGrid from '$lib/features/event-calendar/EventTimeGrid.svelte';
import { weekDays } from '$lib/features/event-calendar/event-calendar-dates.logic';
import { drainEventCalendarWrites, loadEvents, resetEventCalendar } from '$lib/features/event-calendar/event-calendar.service';
import { eventCalendarStore } from '$lib/features/event-calendar/event-calendar.store.svelte';
import { eventCalendarViewStore } from '$lib/features/event-calendar/event-calendar-view.store.svelte';
import { eventEntryFromContent, eventNote } from '../../../fixtures/event-notes.fixture';

const VAULT = '/vault';
const P = (name: string) => `${VAULT}/${name}.md`;
const WEEK = weekDays('2026-11-10', 1);

/** In-memory disk behind the mocked `@tauri-apps/plugin-fs`. */
const disk = new Map<string, string>();
let version = 0;

/** Event note content with the given raw frontmatter fields. */
function eventFile(fields: Record<string, string> = {}): string {
	return eventNote({ _type: 'Event', date: '2026-11-10', start: '09:30', end: '10:00', ...fields }, 'Body\n');
}

/** Bumps the index version and re-projects the fake disk. */
async function refresh(): Promise<void> {
	version += 1;
	vaultStore.bumpVaultIndexVersion(version);
	await loadEvents();
}

let root: HTMLElement;
let components: Record<string, unknown>[] = [];

/** Mounts the week grid and the dialog into one root, as `EventCalendarView` does. */
function mountView() {
	components.push(mount(EventTimeGrid, { target: root, props: { days: WEEK } }));
	components.push(mount(EventDialog, { target: root, props: { root } }));
	flushSync();
}

/** Lets bits-ui and pending writes finish. */
async function settle() {
	flushSync();
	await tick();
	await new Promise((r) => setTimeout(r, 0));
	flushSync();
}

/** Opens the edit dialog for `path` and waits for it to render. */
async function openEdit(path: string) {
	eventCalendarViewStore.openDialog({ mode: 'edit', path });
	await settle();
}

const dialog = () => document.querySelector<HTMLElement>('[data-event-dialog]');
const field = (name: string) => dialog()!.querySelector<HTMLInputElement>(`[data-field="${name}"]`)!;
const error = (name: string) => dialog()!.querySelector<HTMLElement>(`[data-error="${name}"]`);
const save = () => dialog()!.querySelector<HTMLButtonElement>('[data-save]')!;
const block = (path: string) => root.querySelector<HTMLElement>(`[data-day-column] [data-event-path="${path}"]`)!;
const button = (label: string) => [...dialog()!.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;

/** Types `value` into an input the way the browser reports it. */
function type(input: HTMLInputElement, value: string) {
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

beforeEach(async () => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	clearLocalStorage();
	invalidateVaultEntries();
	vaultStore._reset();
	vaultStore.open(VAULT);
	settingsStore.reset();
	editorStore.reset();
	resetEventCalendar();
	resetHooks();
	clearAllIndexed();
	_resetParseFrontmatterCache();
	disk.clear();
	version = 0;
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
	disk.set(P('Retreat'), eventFile({ date: '2026-11-12', end_date: '2026-11-14' }));
	await refresh();
	eventCalendarViewStore.setDate('2026-11-10');
	root = document.body.appendChild(document.createElement('div'));
	root.tabIndex = -1;
});

afterEach(async () => {
	for (const c of components) unmount(c);
	components = [];
	document.body.innerHTML = '';
	await drainEventCalendarWrites();
	vi.restoreAllMocks();
});

describe('EventDialog: form', () => {
	it('opens with the event fields and no note body field', async () => {
		mountView();
		await openEdit(P('Standup'));

		expect(dialog()).not.toBeNull();
		expect(field('title').value).toBe('Standup');
		expect(field('date').value).toBe('2026-11-10');
		expect(field('start').value).toBe('09:30');
		expect(field('start').getAttribute('step')).toBe('900');
		expect(field('end').value).toBe('10:00');
		expect(dialog()!.querySelector('textarea')).toBeNull();
		for (const name of ['title', 'date', 'start', 'end', 'location']) {
			expect(dialog()!.querySelector(`label[for="${field(name).id}"]`)).not.toBeNull();
		}
		expect(save().disabled).toBe(false);
	});

	it('shows the empty-date and end-before-start messages and disables Save', async () => {
		mountView();
		await openEdit(P('Standup'));

		type(field('date'), '');
		type(field('end'), '09:00');

		expect(error('date')?.textContent?.trim()).toBe('Enter a valid date.');
		expect(error('time')?.textContent?.trim()).toBe('End time must be after the start time.');
		expect(save().disabled).toBe(true);
	});

	it('accepts a title with a colon', async () => {
		mountView();
		await openEdit(P('Standup'));

		type(field('title'), '1:1 with manager');

		expect(error('title')).toBeNull();
		expect(save().disabled).toBe(false);
	});

	it('shows an empty-title message', async () => {
		mountView();
		await openEdit(P('Standup'));

		type(field('title'), '   ');

		expect(error('title')?.textContent?.trim()).toBe('Enter a title.');
		expect(save().disabled).toBe(true);
	});

	it('disables the date and time fields of a multi-day event, with a notice', async () => {
		mountView();
		await openEdit(P('Retreat'));

		expect(dialog()!.querySelector('[data-timing-locked]')).not.toBeNull();
		expect(field('date').disabled).toBe(true);
		expect(field('start').disabled).toBe(true);
		expect(field('end').disabled).toBe(true);
		expect(field('title').disabled).toBe(false);
	});

	it('keeps the duration when the start moves', async () => {
		mountView();
		await openEdit(P('Standup'));

		type(field('start'), '11:00');

		expect(field('end').value).toBe('11:30');
	});

	it('shows 00:00, not 23:59, as the end of an event that ends at midnight', async () => {
		disk.set(P('Late'), eventFile({ start: '23:00', end: '24:00' }));
		await refresh();
		expect(eventCalendarStore.eventByPath(P('Late'))).toMatchObject({ start: 1380, end: 1440 });
		mountView();
		await openEdit(P('Late'));

		expect(field('start').value).toBe('23:00');
		expect(field('end').value).toBe('00:00');
		expect(error('time')).toBeNull();
		expect(save().disabled).toBe(false);
	});
});

describe('EventDialog: color swatches', () => {
	it('is a radiogroup where arrow keys move and select', async () => {
		mountView();
		await openEdit(P('Standup'));
		const group = dialog()!.querySelector<HTMLElement>('[role="radiogroup"]')!;
		const checked = () => group.querySelector<HTMLElement>('[aria-checked="true"]')!;
		expect(group.querySelectorAll('[role="radio"]')).toHaveLength(6);
		expect(checked().dataset.color).toBe('blue');
		expect(checked().tabIndex).toBe(0);

		checked().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		flushSync();
		expect(checked().dataset.color).toBe('green');
		expect(document.activeElement).toBe(checked());

		checked().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
		flushSync();
		expect(checked().dataset.color).toBe('blue');
		expect(group.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
	});
});

describe('EventDialog: saving', () => {
	it('writes a valid edit through the fs and the store shows the pending event', async () => {
		mountView();
		await openEdit(P('Standup'));

		type(field('start'), '11:00');
		save().click();
		await settle();

		expect(disk.get(P('Standup'))).toContain('start: 11:00\n');
		expect(disk.get(P('Standup'))).toContain('end: 11:30\n');
		expect(eventCalendarStore.eventByPath(P('Standup'))).toMatchObject({ start: 660, end: 690, pending: true });
		expect(eventCalendarViewStore.dialog).toBeNull();
		expect(document.activeElement).toBe(block(P('Standup')));
	});

	it('renames on a title change and returns focus to the renamed block', async () => {
		mountView();
		await openEdit(P('Standup'));

		type(field('title'), '1:1 sync');
		save().click();
		await settle();

		expect(disk.has(P('Standup'))).toBe(false);
		expect(disk.get(P('1-1 sync'))).toContain('event_title: 1:1 sync\n');
		expect(eventCalendarStore.events.map((e) => [e.path, e.title])).toContainEqual([P('1-1 sync'), '1:1 sync']);
		expect(document.activeElement).toBe(block(P('1-1 sync')));
	});

	it('keeps the dialog open with an inline error when the write fails', async () => {
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
		mountView();
		await openEdit(P('Standup'));

		type(field('location'), 'Room 4');
		save().click();
		await settle();

		expect(eventCalendarViewStore.dialog).not.toBeNull();
		expect(dialog()).not.toBeNull();
		expect(dialog()!.querySelector('[data-form-error]')?.textContent?.trim()).not.toBe('');
		expect(save().disabled).toBe(false);
	});

	it('toasts a failed write when the dialog was closed during the save', async () => {
		let reject!: (err: Error) => void;
		vi.mocked(writeTextFile).mockImplementationOnce(() => new Promise<void>((_, r) => (reject = r)));
		mountView();
		await openEdit(P('Standup'));

		type(field('location'), 'Room 4');
		save().click();
		await settle();
		expect(writeTextFile).toHaveBeenCalled();
		eventCalendarViewStore.closeDialog();
		await settle();
		reject(new Error('disk full'));
		await settle();

		expect(toast.error).toHaveBeenCalledWith('disk full');
		expect(eventCalendarViewStore.dialog).toBeNull();
		expect(disk.get(P('Standup'))).not.toContain('Room 4');
	});

	it('leaves a newer dialog open when an earlier save finishes', async () => {
		let resolve!: () => void;
		vi.mocked(writeTextFile).mockImplementationOnce(async (p, data) => {
			await new Promise<void>((r) => (resolve = r));
			disk.set(String(p), String(data));
		});
		mountView();
		await openEdit(P('Standup'));

		type(field('location'), 'Room 4');
		save().click();
		await settle();
		eventCalendarViewStore.closeDialog();
		await settle();
		await openEdit(P('Retreat'));
		const retreat = eventCalendarViewStore.dialog!.session;
		resolve();
		await settle();

		expect(disk.get(P('Standup'))).toContain('Room 4');
		expect(eventCalendarViewStore.dialog?.session).toBe(retreat);
		expect(dialog()).not.toBeNull();
		expect(field('title').value).toBe('Retreat');
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('closes without a write when nothing changed', async () => {
		mountView();
		await openEdit(P('Standup'));

		save().click();
		await settle();

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(eventCalendarViewStore.dialog).toBeNull();
	});
});

describe('EventDialog: closing', () => {
	it('closes on Escape and leaves focus on the edited block', async () => {
		mountView();
		await openEdit(P('Standup'));
		expect(dialog()).not.toBeNull();

		document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settle();

		expect(eventCalendarViewStore.dialog).toBeNull();
		expect(dialog()).toBeNull();
		expect(document.activeElement).toBe(block(P('Standup')));
	});

	it('moves focus to the view root when the edited block is gone', async () => {
		mountView();
		await openEdit(P('Standup'));
		expect(dialog()).not.toBeNull();

		disk.delete(P('Standup'));
		await refresh();
		await settle();

		expect(eventCalendarViewStore.dialog).toBeNull();
		expect(dialog()).toBeNull();
		expect(root.querySelector(`[data-event-path="${P('Standup')}"]`)).toBeNull();
		expect(document.activeElement).toBe(root);
	});

	it('"Open note" closes the dialog and opens the note', async () => {
		mountView();
		await openEdit(P('Standup'));

		button('Open note').click();
		await settle();

		expect(openFileInEditor).toHaveBeenCalledWith(P('Standup'));
		expect(eventCalendarViewStore.dialog).toBeNull();
	});

	it('renders nothing for a path the calendar does not show, and clears the dialog state', async () => {
		mountView();
		await openEdit(P('Gone'));

		expect(dialog()).toBeNull();
		expect(eventCalendarViewStore.dialog).toBeNull();
	});
});
