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
	toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), dismiss: vi.fn() }),
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
import { exists, mkdir, readDir, readTextFile, remove, rename, writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { resetHooks } from '$lib/core/editor/editor.hooks';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { renameItem } from '$lib/core/filesystem/fs.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { trashStore } from '$lib/core/trash/trash.store.svelte';
import { invalidateVaultEntries } from '$lib/core/vault/vault-entries.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { _resetParseFrontmatterCache } from '$lib/features/properties/properties.logic';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
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

/** Opens the create dialog on 2026-11-12 at 10:00 and waits for it to render. */
async function openCreate(payload: { allDay?: boolean } = {}) {
	eventCalendarViewStore.openDialog({ mode: 'create', date: '2026-11-12', start: 600, ...payload });
	await settle();
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

	it('saves a location change on a cross-midnight event, leaving its times alone', async () => {
		disk.set(P('Late'), eventFile({ start: '23:00', end: '01:00' }));
		await refresh();
		mountView();
		await openEdit(P('Late'));

		expect(error('time')).toBeNull();
		type(field('location'), 'Club');
		save().click();
		await settle();

		expect(disk.get(P('Late'))).toContain('location: Club\n');
		expect(disk.get(P('Late'))).toContain('start: 23:00\n');
		expect(disk.get(P('Late'))).toContain('end: 01:00\n');
		expect(eventCalendarViewStore.dialog).toBeNull();
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

	/** Makes the next rename refresh the index before it returns, as a fast index bump can. */
	function indexCatchesUpDuringRename() {
		const move = vi.mocked(renameItem).getMockImplementation()!;
		vi.mocked(renameItem).mockImplementationOnce(async (from, newName) => {
			const to = await move(from, newName);
			// The snapshot drops the old path before `writeEvent` remaps the stores.
			await refresh();
			await settle();
			return to;
		});
	}

	it('stays open through a rename whose old path leaves the snapshot mid-save, then focuses the renamed block', async () => {
		indexCatchesUpDuringRename();
		mountView();
		await openEdit(P('Standup'));

		type(field('title'), 'Daily sync');
		save().click();
		await settle();
		await drainEventCalendarWrites();
		await settle();

		expect(disk.get(P('Daily sync'))).toBeDefined();
		expect(eventCalendarViewStore.dialog).toBeNull();
		expect(toast.error).not.toHaveBeenCalled();
		expect(document.activeElement).toBe(block(P('Daily sync')));
	});

	it('shows a field write failure after such a rename inline, not in a toast', async () => {
		indexCatchesUpDuringRename();
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
		mountView();
		await openEdit(P('Standup'));

		type(field('title'), 'Daily sync');
		type(field('location'), 'Room 4');
		save().click();
		await settle();
		await drainEventCalendarWrites();
		await settle();

		expect(toast.error).not.toHaveBeenCalled();
		expect(eventCalendarViewStore.dialog?.payload).toEqual({ mode: 'edit', path: P('Daily sync') });
		expect(dialog()!.querySelector('[data-form-error]')?.textContent).toContain('disk full');
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

describe('EventDialog: create', () => {
	it('opens an untitled form with a notes field and an "Open note after creating" checkbox', async () => {
		mountView();
		await openCreate();

		expect(dialog()!.textContent).toContain('New event');
		expect(field('title').value).toBe('');
		expect(field('start').value).toBe('10:00');
		expect(field('end').value).toBe('11:00');
		expect(dialog()!.querySelector('textarea[data-field="notes"]')).not.toBeNull();
		expect(field('open-after-create').type).toBe('checkbox');
		expect(field('open-after-create').checked).toBe(false);
		expect(dialog()!.querySelector('[data-delete]')).toBeNull();
		expect(save().disabled).toBe(true);
	});

	it('creates the note with the notes as its body and shows the pending create', async () => {
		mountView();
		await openCreate();

		type(field('title'), ' Planning ');
		const notes = dialog()!.querySelector<HTMLTextAreaElement>('[data-field="notes"]')!;
		notes.value = 'Agenda';
		notes.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		save().click();
		await settle();

		const written = disk.get(P('Planning'))!;
		expect(written).toContain('_type: Event\n');
		expect(written).toContain('date: 2026-11-12\n');
		expect(written).toContain('start: 10:00\n');
		expect(written).toContain('Agenda');
		expect(eventCalendarStore.eventByPath(P('Planning'))).toMatchObject({ title: 'Planning', date: '2026-11-12', pending: true });
		expect(eventCalendarViewStore.dialog).toBeNull();
		expect(document.activeElement).toBe(block(P('Planning')));
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('opens the new note when the checkbox is on', async () => {
		mountView();
		await openCreate();

		type(field('title'), 'Planning');
		field('open-after-create').click();
		flushSync();
		save().click();
		await settle();

		expect(openFileInEditor).toHaveBeenCalledWith(P('Planning'));
		expect(eventCalendarViewStore.dialog).toBeNull();
	});

	it('creates an all-day event from an all-day payload', async () => {
		mountView();
		await openCreate({ allDay: true });

		expect(dialog()!.querySelector('[data-field="start"]')).toBeNull();
		type(field('title'), 'Offsite');
		save().click();
		await settle();

		expect(disk.get(P('Offsite'))).toContain('all_day: true\n');
		expect(eventCalendarStore.eventByPath(P('Offsite'))).toMatchObject({ allDay: true });
	});
});

describe('EventDialog: create failures', () => {
	/** The message `createEvent` gives a rejected `create_note`. */
	const CREATE_FAILED = 'Could not create the note; a note with the same name, possibly differing only in case, may exist';

	/** Makes the next `create_note` wait; returns its resolve and reject. */
	function holdCreateNote() {
		const held: { resolve: () => void; reject: (err: Error) => void } = { resolve: () => {}, reject: () => {} };
		const fallback = vi.mocked(invoke).getMockImplementation()!;
		vi.mocked(invoke).mockImplementation(async (cmd, args) => {
			if (cmd !== 'create_note') return fallback(cmd, args);
			vi.mocked(invoke).mockImplementation(fallback);
			await new Promise<void>((resolve, reject) => {
				held.resolve = resolve;
				held.reject = reject;
			});
			return fallback(cmd, args);
		});
		return held;
	}

	it('keeps the dialog open with an inline error and writes nothing when the create fails', async () => {
		const fallback = vi.mocked(invoke).getMockImplementation()!;
		vi.mocked(invoke).mockImplementation(async (cmd, args) => {
			if (cmd === 'create_note') throw new Error('disk full');
			return fallback(cmd, args);
		});
		mountView();
		await openCreate();

		type(field('title'), 'Planning');
		save().click();
		await settle();

		expect(eventCalendarViewStore.dialog).not.toBeNull();
		expect(dialog()).not.toBeNull();
		expect(dialog()!.querySelector('[data-form-error]')?.textContent?.trim()).toBe(CREATE_FAILED);
		expect(disk.has(P('Planning'))).toBe(false);
		expect(eventCalendarStore.eventByPath(P('Planning'))).toBeUndefined();
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('toasts a failed create when the dialog was closed during the write', async () => {
		const held = holdCreateNote();
		mountView();
		await openCreate();

		type(field('title'), 'Planning');
		save().click();
		await settle();
		eventCalendarViewStore.closeDialog();
		await settle();
		held.reject(new Error('disk full'));
		await settle();

		expect(toast.error).toHaveBeenCalledWith(CREATE_FAILED);
		expect(eventCalendarViewStore.dialog).toBeNull();
		expect(disk.has(P('Planning'))).toBe(false);
	});

	it('leaves a newer dialog open when an earlier create finishes', async () => {
		const held = holdCreateNote();
		mountView();
		await openCreate();

		type(field('title'), 'Planning');
		save().click();
		await settle();
		eventCalendarViewStore.closeDialog();
		await settle();
		await openEdit(P('Retreat'));
		const retreat = eventCalendarViewStore.dialog!.session;
		held.resolve();
		await settle();
		await drainEventCalendarWrites();
		await settle();

		expect(disk.has(P('Planning'))).toBe(true);
		expect(eventCalendarViewStore.dialog?.session).toBe(retreat);
		expect(field('title').value).toBe('Retreat');
		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();
	});
});

describe('EventDialog: create cancel', () => {
	it('Cancel on a create opened after an edit leaves focus on the view root', async () => {
		mountView();
		await openEdit(P('Standup'));
		button('Cancel').click();
		await settle();
		expect(document.activeElement).toBe(block(P('Standup')));

		await openCreate();
		button('Cancel').click();
		await settle();

		expect(eventCalendarViewStore.dialog).toBeNull();
		expect(document.activeElement).toBe(root);
		expect(writeTextFile).not.toHaveBeenCalled();
	});
});

describe('EventDialog: footer Delete and Duplicate', () => {
	it('Delete closes the dialog, toasts "Event deleted" with Undo, and leaves focus on the view root', async () => {
		mountView();
		await openEdit(P('Standup'));

		dialog()!.querySelector<HTMLButtonElement>('[data-delete]')!.click();
		await settle();
		await drainEventCalendarWrites();
		await settle();

		expect(eventCalendarViewStore.dialog).toBeNull();
		expect(dialog()).toBeNull();
		expect(disk.has(P('Standup'))).toBe(false);
		expect(root.querySelector(`[data-event-path="${P('Standup')}"]`)).toBeNull();
		expect(document.activeElement).toBe(root);
		expect(toast).toHaveBeenCalledWith('Event deleted', { description: 'Standup', action: { label: 'Undo', onClick: expect.any(Function) } });

		const [, options] = vi.mocked(toast).mock.calls[0] as unknown as [string, { action: { onClick: () => void } }];
		document.body.focus();
		options.action.onClick();
		await settle();
		await drainEventCalendarWrites();
		await settle();

		expect(disk.has(P('Standup'))).toBe(true);
		expect(eventCalendarStore.eventByPath(P('Standup'))).toBeDefined();
		expect(document.activeElement).toBe(root);
	});

	it('Duplicate closes the dialog, toasts the copy\'s title, and focuses the copy\'s block', async () => {
		mountView();
		await openEdit(P('Standup'));

		dialog()!.querySelector<HTMLButtonElement>('[data-duplicate]')!.click();
		await settle();
		await drainEventCalendarWrites();
		await settle();

		expect(eventCalendarViewStore.dialog).toBeNull();
		expect(disk.has(P('Standup (copy)'))).toBe(true);
		expect(toast.success).toHaveBeenCalledWith('Event duplicated', { description: 'Standup (copy)' });
		expect(document.activeElement).toBe(block(P('Standup (copy)')));
	});

	it('a failed delete toasts the error and keeps the event', async () => {
		vi.mocked(rename).mockRejectedValueOnce(new Error('permission denied'));
		mountView();
		await openEdit(P('Standup'));

		dialog()!.querySelector<HTMLButtonElement>('[data-delete]')!.click();
		await settle();
		await drainEventCalendarWrites();
		await settle();

		expect(toast).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalled();
		expect(disk.has(P('Standup'))).toBe(true);
		expect(document.activeElement).toBe(root);
	});
});
