import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// The by-path organized and archived writers: the Tauri boundaries, the
// editor's save and the toast are mocked; the frontmatter writer is real.
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('#lib/core/editor/editor.service.js', () => ({
	syncExternalContentToEditor: vi.fn(),
	saveFileByPath: vi.fn(),
}));

vi.mock('#lib/utils/log.service.js', () => ({
	appendLog: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { saveFileByPath, syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { setArchivedForPath, setOrganizedForPath } from '#lib/features/properties/lifecycle.service.js';

const PATH = '/vault/note.md';

/** Each writer, the key it sets and the frontmatter of a note it changes. */
const writers = [
	{
		name: 'setOrganizedForPath',
		write: (path: string) => setOrganizedForPath(path, true),
		closed: '---\n_organized: false\n_archived: false\n---\n\n# My Note\n',
		expected: '---\n_organized: true\n_archived: false\n---\n\n# My Note\n',
	},
	{
		name: 'setArchivedForPath',
		write: (path: string) => setArchivedForPath(path, true),
		closed: '---\n_organized: false\n_archived: false\n---\n\n# My Note\n',
		expected: '---\n_organized: false\n_archived: true\n---\n\n# My Note\n',
	},
];

describe.each(writers)('$name', ({ write, closed, expected }) => {
	const disk = new Map<string, string>();

	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		editorStore.reset();
		disk.clear();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(saveFileByPath).mockResolvedValue(true);
		// The write runs `notifyAfterSave` -> `applyNoteChange`, which calls `invoke`.
		vi.mocked(invoke).mockResolvedValue(undefined as never);
		vi.mocked(readTextFile).mockImplementation(async (p) => disk.get(String(p)) ?? '');
		vi.mocked(writeTextFile).mockImplementation(async (p, data) => {
			disk.set(String(p), String(data));
		});
	});

	afterEach(() => {
		vaultStore._reset();
		editorStore.reset();
		clearLocalStorage();
	});

	it('writes the flag into a closed note and leaves the other flag and the body alone', async () => {
		disk.set(PATH, closed);

		await write(PATH);

		expect(writeTextFile).toHaveBeenCalledTimes(1);
		expect(disk.get(PATH)).toBe(expected);
	});

	it('writes nothing on a second call, the flag being already set', async () => {
		disk.set(PATH, closed);

		await write(PATH);
		await write(PATH);

		expect(writeTextFile).toHaveBeenCalledTimes(1);
		expect(disk.get(PATH)).toBe(expected);
	});

	it('asks for the index refresh to skip its throttle, so the lists follow the click', async () => {
		disk.set(PATH, closed);

		await write(PATH);

		expect(vaultStore.takePromptIndexRefresh()).toBe(true);
	});

	it('patches an open dirty tab from its own content, keeping the body edit, and saves it', async () => {
		editorStore.addTab({
			path: PATH,
			name: 'note',
			content: closed.replace('# My Note', '# Unsaved edit'),
			savedContent: closed,
		});

		await write(PATH);

		expect(readTextFile).not.toHaveBeenCalled();
		expect(writeTextFile).not.toHaveBeenCalled();
		const [path, content, markClean] = vi.mocked(syncExternalContentToEditor).mock.calls[0];
		expect(path).toBe(PATH);
		expect(content).toBe(expected.replace('# My Note', '# Unsaved edit'));
		expect(markClean).toBe(false);
		expect(saveFileByPath).toHaveBeenCalledWith(PATH);
	});

	it('refuses lossy frontmatter: no write, error toast', async () => {
		disk.set(PATH, '---\n# keep me\n_organized: false\n---\n\n# My Note\n');

		await write(PATH);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith(
			"note.md: The note's frontmatter has comments; it cannot be rewritten without losing them",
		);
	});

	it('propagates a read error', async () => {
		vi.mocked(readTextFile).mockRejectedValue(new Error('EACCES'));

		await expect(write(PATH)).rejects.toThrow('EACCES');
		expect(toast.error).not.toHaveBeenCalled();
	});
});

describe('setArchivedForPath on restore', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vaultStore._reset();
		editorStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(invoke).mockResolvedValue(undefined as never);
	});

	it('sets _archived: false and leaves _organized alone', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n_organized: true\n_archived: true\n---\n\nBody\n');

		await setArchivedForPath(PATH, false);

		expect(writeTextFile).toHaveBeenCalledWith(PATH, '---\n_organized: true\n_archived: false\n---\n\nBody\n', { create: false });
	});
});

describe('setOrganizedForPath back to the inbox', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vaultStore._reset();
		editorStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(invoke).mockResolvedValue(undefined as never);
	});

	it('sets _organized: false on an archived note and keeps it archived', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n_archived: true\n---\n\nBody\n');

		await setOrganizedForPath(PATH, false);

		expect(writeTextFile).toHaveBeenCalledWith(PATH, '---\n_archived: true\n_organized: false\n---\n\nBody\n', { create: false });
	});
});
