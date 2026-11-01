import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// `vaultStore.open` persists the recent-vaults list.
setupLocalStorage();

// The dialog, the trash move and the toast are side-effect boundaries; the
// trash move itself is covered by the fs.service and path-change tests.
vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(),
}));

vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	deleteItem: vi.fn(() => Promise.resolve()),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
	revealItemInDir: vi.fn(() => Promise.resolve()),
}));

// The system clipboard is a side-effect boundary.
const writeText = vi.fn((_text: string) => Promise.resolve());
Object.defineProperty(globalThis, 'navigator', {
	value: { clipboard: { writeText } },
	writable: true,
	configurable: true,
});

import { ask } from '@tauri-apps/plugin-dialog';
import { toast } from 'svelte-sonner';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { deleteItem } from '#lib/core/filesystem/fs.service.js';
import {
	copyNoteDeepLink,
	copyNotePath,
	deleteNoteWithConfirm,
	revealNote,
	toggleWideNotes,
} from '#lib/features/note-action-bar/note-action-bar.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { parseDeepLinkUri, resolveFilePath } from '#lib/features/deep-link/deep-link.logic.js';

const PATH = '/vault/Projects/Launch plan.md';

describe('deleteNoteWithConfirm', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('asks the file explorer\'s "Move to Trash" question naming the file, then trashes the note', async () => {
		vi.mocked(ask).mockResolvedValue(true);

		await deleteNoteWithConfirm(PATH);

		expect(ask).toHaveBeenCalledWith('Move "Launch plan.md" to trash?', { title: 'Move to Trash', kind: 'warning' });
		expect(deleteItem).toHaveBeenCalledWith(PATH, false);
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('leaves the note alone when the user declines', async () => {
		vi.mocked(ask).mockResolvedValue(false);

		await deleteNoteWithConfirm(PATH);

		expect(deleteItem).not.toHaveBeenCalled();
	});

	it('shows the file-operation error toast when the trash move fails', async () => {
		vi.mocked(ask).mockResolvedValue(true);
		vi.mocked(deleteItem).mockRejectedValueOnce(new Error('permission denied'));

		await deleteNoteWithConfirm(PATH);

		expect(toast.error).toHaveBeenCalledWith('Could not move "Launch plan.md" to the Trash: permission denied');
	});
});

describe('toggleWideNotes', () => {
	beforeEach(() => {
		settingsStore.reset();
	});

	it('flips the one global wideNotes setting both ways', () => {
		expect(settingsStore.editor.wideNotes).toBe(false);

		toggleWideNotes();
		expect(settingsStore.editor.wideNotes).toBe(true);

		toggleWideNotes();
		expect(settingsStore.editor.wideNotes).toBe(false);
	});
});

describe('revealNote', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('reveals the note in the system file explorer without a toast', async () => {
		await revealNote(PATH);

		expect(revealItemInDir).toHaveBeenCalledWith(PATH);
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('shows an error toast when the reveal fails', async () => {
		vi.mocked(revealItemInDir).mockRejectedValueOnce(new Error('not found'));

		await revealNote(PATH);

		expect(toast.error).toHaveBeenCalledWith('Could not reveal "Launch plan.md" in Finder.');
	});
});

describe('copyNotePath', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('copies the absolute path and confirms with a toast', async () => {
		await copyNotePath(PATH);

		expect(writeText).toHaveBeenCalledWith(PATH);
		expect(toast.success).toHaveBeenCalledWith('Path copied');
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('shows an error toast and no confirmation when the clipboard refuses', async () => {
		writeText.mockRejectedValueOnce(new Error('denied'));

		await copyNotePath(PATH);

		expect(toast.error).toHaveBeenCalledWith('Could not copy the path to the clipboard.');
		expect(toast.success).not.toHaveBeenCalled();
	});
});

describe('copyNoteDeepLink', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
	});

	it('copies a kokobrain://open link that the deep-link parser resolves to the same note', async () => {
		await copyNoteDeepLink(PATH);

		const link = writeText.mock.calls[0][0];
		expect(link).toBe('kokobrain://open?vault=vault&file=Projects%2FLaunch%20plan.md');
		const parsed = parseDeepLinkUri(link);
		if (!parsed.ok || parsed.action.type !== 'open') throw new Error('not an open link');
		expect(vaultStore.recentVaults.find((v) => v.name === parsed.action.vault)?.path).toBe('/vault');
		expect(resolveFilePath('/vault', parsed.action.file!)).toBe(PATH);
		expect(toast.success).toHaveBeenCalledWith('Deeplink copied');
	});

	it('copies nothing and shows an error when no vault is open', async () => {
		vaultStore.close();

		await copyNoteDeepLink(PATH);

		expect(writeText).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith('Could not build a deeplink: the note is not in the open vault.');
	});

	it('shows an error toast when the clipboard refuses', async () => {
		writeText.mockRejectedValueOnce(new Error('denied'));

		await copyNoteDeepLink(PATH);

		expect(toast.error).toHaveBeenCalledWith('Could not copy the deeplink to the clipboard.');
		expect(toast.success).not.toHaveBeenCalled();
	});
});
