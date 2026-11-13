// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../fixtures/localStorage.fixture';
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

vi.mock('#lib/core/filesystem/fs.service.js', async () => {
	const actual = await vi.importActual<typeof import('#lib/core/filesystem/fs.service.js')>('#lib/core/filesystem/fs.service.js');
	return { ...actual, renameItem: vi.fn() };
});

import { rename } from '@tauri-apps/plugin-fs';
import { createCalendarVault, eventFile } from '../../fixtures/calendar-vault.fixture';
import { createEvent, deleteEvent, undoDeleteEvent, resetEventCalendar } from '#lib/features/event-calendar/event-calendar.service.js';
import type { EventDraft } from '#lib/features/event-calendar/event-calendar.types.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';

const VAULT = '/vault';
const P = (name: string) => `${VAULT}/${name}.md`;

function draft(overrides: Partial<EventDraft> = {}): EventDraft {
	return { title: 'Planning', date: '2026-11-12', start: 600, end: 630, allDay: false, color: 'blue', location: '', notes: '', ...overrides };
}

const vault = createCalendarVault();
const { disk, refresh, holdNextRename } = vault;

describe('calendar-4: a create at a name whose Trash restore is between its exists check and its rename', () => {
	beforeEach(async () => {
		clearLocalStorage();
		invalidateVaultEntries();
		vaultStore._reset();
		vaultStore.open(VAULT);
		settingsStore.reset();
		editorStore.reset();
		resetEventCalendar();
		vault.install();
		disk.set(P('Standup'), eventFile());
		await refresh();
	});

	afterEach(async () => {
		await vault.teardown();
		vi.restoreAllMocks();
	});

	it('does not let the restore rename overwrite a note created at the same name meanwhile', async () => {
		await deleteEvent(P('Standup'));
		await refresh(2);
		const renamesBefore = vi.mocked(rename).mock.calls.length;

		// Hold the restore's rename out of the Trash: `restoreItem` has already
		// run its exists check on `Standup.md` and is waiting to rename onto it.
		const gate = holdNextRename();
		const restore = undoDeleteEvent(P('Standup'));
		await vi.waitFor(() => expect(vi.mocked(rename).mock.calls.length).toBe(renamesBefore + 1));

		// The create's own readDir sees `Standup.md` free (the restore has not
		// landed), so it writes its note there.
		const created = await createEvent(draft({ title: 'Standup', date: '2026-11-10', start: 600, end: 630 }));
		expect(created).toBe(P('Standup'));
		const createdBytes = disk.get(created)!;
		expect(createdBytes).toContain('start: 10:00');

		gate.resolve();
		await restore;

		// Correct behavior: the bytes of both notes survive, one of them under a
		// suffixed name. Actual: the restore's rename replaces the created note.
		expect([...disk.values()]).toContain(createdBytes);
	});

	// Control: the same two operations run one after the other keep both notes,
	// so the failure above comes from the interleaving, not from the fixture.
	it('control: a create issued after the restore has landed keeps both notes', async () => {
		await deleteEvent(P('Standup'));
		await refresh(2);
		await undoDeleteEvent(P('Standup'));
		const created = await createEvent(draft({ title: 'Standup', date: '2026-11-10', start: 600, end: 630 }));

		expect(created).toBe(`${VAULT}/Standup 1.md`);
		expect(disk.get(P('Standup'))).toContain('start: 09:30');
		expect(disk.get(created)).toContain('start: 10:00');
	});
});
