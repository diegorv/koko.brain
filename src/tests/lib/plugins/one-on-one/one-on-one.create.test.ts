import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// The real note creator runs: only the Tauri boundaries, the editor open and
// the tree refresh (side-effect services) and the toast are mocked, so the
// 1:1 link is checked on the content `create_note` writes.
vi.mock('@tauri-apps/plugin-fs', () => ({
	readDir: vi.fn(),
	exists: vi.fn(),
	readTextFile: vi.fn(),
}));
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));
vi.mock('#lib/core/editor/editor.hooks.js', () => ({
	markRecentSave: vi.fn(),
}));
vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	addToTree: vi.fn(),
}));
vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

import { exists, readTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import { noteActionBarActionsStore } from '#lib/features/note-action-bar/note-action-bar-actions.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { createOneOnOneNote, registerOneOnOneActionBarAction } from '#lib/plugins/one-on-one/one-on-one.service.js';

const NOTE_PATH = '/vault/_notes/2026/02-Feb/-1on1-Alice-18-02-2026.md';
const TEMPLATE = '/vault/_templates/One on One.md';

/** The content `create_note` wrote, or undefined when it was not called. */
function written(): string | undefined {
	const call = vi.mocked(invoke).mock.calls.find(([cmd]) => cmd === 'create_note');
	return (call?.[1] as { content: string } | undefined)?.content;
}

function relatedTo(content: string | undefined) {
	return parseFrontmatterProperties(content ?? '').filter((p) => p.key === '_related_to');
}

beforeEach(() => {
	vi.clearAllMocks();
	clearLocalStorage();
	clearAllIndexed();
	vaultStore._reset();
	settingsStore.reset();
	settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
	noteActionBarActionsStore.reset();
	vaultStore.open('/vault');
	settingsStore.updatePeriodicNotes({ folder: '_notes' });
	settingsStore.updateOneOnOne({
		folderFormat: 'YYYY/MM-MMM',
		filenameFormat: '[-1on1-]{person}[-]DD-MM-YYYY',
		templatePath: '_templates/One on One.md',
	});
	vi.mocked(exists).mockResolvedValue(false);
	vi.mocked(invoke).mockResolvedValue(undefined);
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-02-18T10:00:00.000'));
});

afterEach(() => {
	vi.useRealTimers();
});

describe('createOneOnOneNote link', () => {
	it('writes _related_to for the person when the template does not', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ndate: <% tp.date.now("YYYY-MM-DD") %>\n---\n# 1:1 with <% person %>\n');

		await createOneOnOneNote('Alice');

		expect(readTextFile).toHaveBeenCalledWith(TEMPLATE);
		expect(written()).toBe('---\n_related_to: "[[Alice]]"\ndate: 2026-02-18\n---\n# 1:1 with Alice\n');
		expect(openFileInEditor).toHaveBeenCalledWith(NOTE_PATH);
	});

	it('does not duplicate a link the template already writes', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n_related_to: "[[<% person %>]]"\n---\n');

		await createOneOnOneNote('Alice');

		expect(written()).toBe('---\n_related_to: "[[Alice]]"\n---\n');
		expect(relatedTo(written())).toHaveLength(1);
	});

	it('writes the link alone when no template is set', async () => {
		settingsStore.updateOneOnOne({ templatePath: '' });

		await createOneOnOneNote('Alice');

		expect(readTextFile).not.toHaveBeenCalled();
		expect(written()).toBe('---\n_related_to: "[[Alice]]"\n---\n');
	});

	it('creates no file when the link cannot be added to the template', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n# comment\n_related_to: "[[Bob]]"\n---\n');

		await expect(createOneOnOneNote('Alice')).rejects.toThrow(/comments/);

		expect(written()).toBeUndefined();
		expect(openFileInEditor).not.toHaveBeenCalled();
	});
});

describe('registerOneOnOneActionBarAction', () => {
	it('registers New 1:1 for Person notes and unregisters it', () => {
		const unregister = registerOneOnOneActionBarAction();

		expect(noteActionBarActionsStore.actions).toHaveLength(1);
		expect(noteActionBarActionsStore.actions[0]).toMatchObject({ id: 'new-one-on-one', label: 'New 1:1', typeName: 'Person' });

		unregister();
		expect(noteActionBarActionsStore.actions).toEqual([]);
	});

	it('creates the 1:1 for the person named by the note file', async () => {
		vi.mocked(readTextFile).mockResolvedValue('# 1:1\n');
		registerOneOnOneActionBarAction();

		await noteActionBarActionsStore.actions[0].run('/vault/_people/Alice.md');

		expect(written()).toBe('---\n_related_to: "[[Alice]]"\n---\n# 1:1\n');
		expect(openFileInEditor).toHaveBeenCalledWith(NOTE_PATH);
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('shows a toast and writes nothing when the creation fails', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd === 'create_folder') throw new Error('disk full');
		});
		registerOneOnOneActionBarAction();

		await noteActionBarActionsStore.actions[0].run('/vault/_people/Alice.md');

		expect(written()).toBeUndefined();
		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith('Failed to create 1:1 note.');
	});
});
