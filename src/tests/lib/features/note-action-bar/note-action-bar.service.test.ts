import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// `vaultStore.open` persists the recent-vaults list.
setupLocalStorage();

// Note creation and the toast are side-effect boundaries.
vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	createFile: vi.fn((dir: string, name: string) => Promise.resolve(`${dir}/${name}`)),
}));

// Opening a note reads it from disk; the open itself is covered by the editor tests.
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(() => Promise.resolve()),
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

import { toast } from 'svelte-sonner';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { createFile } from '#lib/core/filesystem/fs.service.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import {
	copyNoteDeepLink,
	createLinkedNote,
	copyNotePath,
	revealNote,
	toggleWideNotes,
} from '#lib/features/note-action-bar/note-action-bar.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { parseDeepLinkUri, resolveFilePath } from '#lib/features/deep-link/deep-link.logic.js';

const PATH = '/vault/Projects/Launch plan.md';

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

describe('createLinkedNote', () => {
	const HUB = '/vault/Projects/Launch plan.md';

	beforeEach(() => {
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
		vi.clearAllMocks();
	});

	it('creates an untitled note in the hub\'s folder that belongs to the hub, then opens it', async () => {
		await createLinkedNote(HUB);

		expect(createFile).toHaveBeenCalledWith('/vault/Projects', 'Untitled.md', '---\n_belongs_to: "[[Launch plan]]"\n---\n');
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/Projects/Untitled.md');
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('opens the deduped name createFile picked', async () => {
		vi.mocked(createFile).mockResolvedValueOnce('/vault/Projects/Untitled 2.md');

		await createLinkedNote(HUB);

		expect(openFileInEditor).toHaveBeenCalledWith('/vault/Projects/Untitled 2.md');
	});

	it('shows a toast and opens nothing when the note cannot be created', async () => {
		vi.mocked(createFile).mockRejectedValueOnce(new Error('disk full'));

		await createLinkedNote(HUB);

		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith('Could not create a note linked to "Launch plan".');
	});

	it('marks the linked note unorganized while Explicit organization is on', async () => {
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: true });
		try {
			await createLinkedNote(HUB);
		} finally {
			settingsStore.reset();
		}

		expect(createFile).toHaveBeenCalledWith(
			'/vault/Projects',
			'Untitled.md',
			'---\n_organized: false\n_belongs_to: "[[Launch plan]]"\n---\n',
		);
	});
});
