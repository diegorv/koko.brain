// @vitest-environment jsdom
/**
 * Repro (h05: calendar-6).
 *
 * `deleteNow` saves a dirty tab, then `deleteItem` closes the tab with no
 * dirty check. `saveFileByPath` captures `tab.content` before its write, so a
 * keystroke typed while the save IPC is in flight is in the tab but not in the
 * saved bytes, and it is dropped when the tab closes.
 *
 * Uses the calendar's in-memory vault fixture (real stores, fake disk). The
 * test asserts the CORRECT behavior: the unsaved text survives the delete on
 * disk or in the Trash. It fails while the bug exists.
 */
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

// Same as the calendar suite: the fixture replaces `renameItem` with a disk move.
vi.mock('#lib/core/filesystem/fs.service.js', async () => {
	const actual = await vi.importActual<typeof import('#lib/core/filesystem/fs.service.js')>('#lib/core/filesystem/fs.service.js');
	return { ...actual, renameItem: vi.fn() };
});

import { writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { deleteEvent } from '#lib/features/event-calendar/event-calendar.service.js';
import { createCalendarVault, eventFile } from '../../fixtures/calendar-vault.fixture';
import { registerAppPorts } from '#lib/app/boot.js';

registerAppPorts();

const VAULT = '/vault';
const P = (name: string) => `${VAULT}/${name}.md`;

describe('h05 repro: unsaved note text is lost when the note is trashed', () => {
	const vault = createCalendarVault();
	const { disk, refresh } = vault;

	beforeEach(async () => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open(VAULT);
		vault.install();
		disk.set(P('Standup'), eventFile());
		await refresh();
		editorStore.reset();
	});

	afterEach(async () => {
		await vault.teardown();
	});

	/** True when some file on the fake disk (a note or a Trash item) holds `text`. */
	function diskHolds(text: string): boolean {
		return [...disk.values()].some((content) => content.includes(text));
	}

	it('keeps a keystroke typed while the calendar delete saves the note (calendar-6)', async () => {
		const edited = eventFile({ start: '11:00', end: '11:30' });
		editorStore.addTab({ path: P('Standup'), name: 'Standup.md', content: edited, savedContent: disk.get(P('Standup'))! });

		const realWrite = vi.mocked(writeTextFile).getMockImplementation()!;
		vi.mocked(writeTextFile).mockImplementationOnce(async (p, data, options) => {
			await realWrite(p, data, options);
			// Keystroke while the pre-delete save IPC is in flight.
			editorStore.updateContent(`${edited}typed while saving\n`);
		});

		await deleteEvent(P('Standup'));

		expect(diskHolds('typed while saving')).toBe(true);
	});
});
