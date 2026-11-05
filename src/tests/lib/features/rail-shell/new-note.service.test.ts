// "+ New here" through the real fs.service::createFile owner; only Tauri and
// the editor service are mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dayjs from 'dayjs';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readDir: vi.fn(), readTextFile: vi.fn(), exists: vi.fn(), mkdir: vi.fn(), writeTextFile: vi.fn() }));
vi.mock('#lib/core/editor/editor.service.js', () => ({ openFileInEditor: vi.fn() }));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { readDir, readTextFile } from '@tauri-apps/plugin-fs';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { createNoteHere } from '#lib/features/rail-shell/new-note.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import {
	FAVORITES_LENS,
	FOLDER_LENS_KIND,
	INBOX_LENS,
	TODAY_LENS_KIND,
	UNTYPED_LENS,
	newNoteRule,
} from '#lib/features/rail-shell/lens.logic.js';
import type { Lens, NewNoteContext, PlainNewNoteRule } from '#lib/features/rail-shell/rail-shell.types.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const FOLDER = '/vault/_notes/2026/10-Oct';
const RULE = { folder: FOLDER, frontmatter: { _organized: false } };
const CONTENT = '---\n_organized: false\n---\n';

/** Tauri commands as `createFile` + `refreshTree` need them; `fail` makes one command throw. */
function tauri(fail?: { cmd: string; err: Error }) {
	return async (cmd: string) => {
		if (cmd === fail?.cmd) throw fail.err;
		return cmd === 'scan_vault' ? [] : undefined;
	};
}

function commands(): string[] {
	return vi.mocked(invoke).mock.calls.map(([cmd]) => cmd);
}

describe('createNoteHere', () => {
	beforeEach(() => {
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		vi.mocked(invoke).mockImplementation(tauri());
	});

	afterEach(() => {
		vaultStore._reset();
	});

	it('creates the folder, writes the note with the rule frontmatter and opens it', async () => {
		const path = await createNoteHere(RULE);

		expect(path).toBe(`${FOLDER}/Untitled.md`);
		expect(invoke).toHaveBeenCalledWith('create_folder', { path: FOLDER });
		expect(invoke).toHaveBeenCalledWith('create_note', { path, content: CONTENT });
		expect(commands().indexOf('create_folder')).toBeLessThan(commands().indexOf('create_note'));
		// The note-change owner put the new note in text search, under its vault-relative key.
		expect(invoke).toHaveBeenCalledWith('update_search_index_file', {
			filePath: '_notes/2026/10-Oct/Untitled.md',
			content: CONTENT,
			vaultPath: '/vault',
		});
		// `create_note` already indexed it in Rust; the owner's `fs` row skips that IPC.
		expect(commands()).not.toContain('update_note_in_index');
		expect(openFileInEditor).toHaveBeenCalledWith(path);
	});

	it('picks a free name when Untitled is taken', async () => {
		vi.mocked(readDir).mockResolvedValue([{ name: 'Untitled.md', isDirectory: false, isFile: true, isSymlink: false }]);
		expect(await createNoteHere(RULE)).toBe(`${FOLDER}/Untitled 1.md`);
	});

	it('writes an empty note when the rule sets no frontmatter', async () => {
		const path = await createNoteHere({ folder: FOLDER, frontmatter: {} });
		expect(invoke).toHaveBeenCalledWith('create_note', { path, content: '' });
	});

	it('rejects and opens nothing when the folder cannot be created', async () => {
		vi.mocked(invoke).mockImplementation(tauri({ cmd: 'create_folder', err: new Error('denied') }));
		await expect(createNoteHere(RULE)).rejects.toThrow('denied');
		expect(commands()).not.toContain('create_note');
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('rejects, opens nothing and indexes nothing when the write fails', async () => {
		vi.mocked(invoke).mockImplementation(tauri({ cmd: 'create_note', err: new Error('disk full') }));
		await expect(createNoteHere(RULE)).rejects.toThrow('disk full');
		expect(commands()).not.toContain('update_search_index_file');
		expect(openFileInEditor).not.toHaveBeenCalled();
	});
});

describe('createNoteHere - Explicit organization', () => {
	const ctx: NewNoteContext = {
		vaultPath: '/vault',
		captureBaseFolder: '_notes',
		captureFolderFormat: 'YYYY/MM-MMM',
		now: dayjs('2026-10-31T09:15:00'),
	};
	const rule = (lens: Lens) => newNoteRule(lens, ctx) as PlainNewNoteRule;

	/** The content `create_note` received. */
	function writtenContent(): string {
		const call = vi.mocked(invoke).mock.calls.find(([cmd]) => cmd === 'create_note');
		return (call![1] as { content: string }).content;
	}

	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		settingsStore.reset();
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: true });
		vi.mocked(readDir).mockResolvedValue([]);
		vi.mocked(invoke).mockImplementation(tauri());
	});

	afterEach(() => {
		vaultStore._reset();
		settingsStore.reset();
	});

	it.each([
		['Favorites', FAVORITES_LENS, '---\n_organized: false\n_favorite: true\n---\n'],
		['Today', { kind: TODAY_LENS_KIND }, '---\n_organized: false\ndate: 2026-10-31\n---\n'],
		['Untyped', UNTYPED_LENS, '---\n_organized: false\n---\n'],
		['a folder', { kind: FOLDER_LENS_KIND, target: '/vault/Work' }, '---\n_organized: false\n---\n'],
	])('marks a note from the %s rule unorganized, keeping the rule frontmatter', async (_label, lens, expected) => {
		await createNoteHere(rule(lens as Lens));

		expect(writtenContent()).toBe(expected);
	});

	it('writes the key once for the Inbox rule, which already sets it', async () => {
		await createNoteHere(rule(INBOX_LENS));

		expect(writtenContent()).toBe('---\n_organized: false\n---\n');
	});

	it('writes the rule frontmatter as is while the switch is off', async () => {
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });

		await createNoteHere(rule(FAVORITES_LENS));

		expect(writtenContent()).toBe('---\n_favorite: true\n---\n');
		expect(writtenContent()).not.toContain('_organized');
	});

	it('rejects and opens nothing when create_note fails', async () => {
		vi.mocked(invoke).mockImplementation(tauri({ cmd: 'create_note', err: new Error('disk full') }));

		await expect(createNoteHere(rule(UNTYPED_LENS))).rejects.toThrow('disk full');

		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('marks a note of a type unorganized', async () => {
		const path = await createNoteHere({ typeName: 'Meeting' });

		expect(invoke).toHaveBeenCalledWith('create_note', { path, content: '---\n_organized: false\n_type: Meeting\n---\n' });
	});
});

describe('createNoteHere - a note of a type', () => {
	const TEMPLATE = '---\n_type: Project\nstatus: active\n---\n\n# <% tp.file.title %>\n';

	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		settingsStore.reset();
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
		typeDefinitionsStore.reset();
		typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap([
			entryV2('/vault/Project.md', {
				isA: 'Type',
				frontmatter: { _folder: 'Projects', _template: '_system/templates/Project.md' },
			}),
		]));
		vi.mocked(readDir).mockResolvedValue([]);
		vi.mocked(readTextFile).mockResolvedValue(TEMPLATE);
		vi.mocked(invoke).mockImplementation(tauri());
	});

	afterEach(() => {
		vaultStore._reset();
		settingsStore.reset();
		typeDefinitionsStore.reset();
	});

	it("creates the note in the type's folder from its template and opens it", async () => {
		const path = await createNoteHere({ typeName: 'Project' });

		expect(path).toBe('/vault/Projects/Untitled Project.md');
		expect(invoke).toHaveBeenCalledWith('create_folder', { path: '/vault/Projects' });
		expect(readTextFile).toHaveBeenCalledWith('/vault/_system/templates/Project.md');
		expect(invoke).toHaveBeenCalledWith('create_note', {
			path,
			content: '---\n_type: Project\nstatus: active\n---\n\n# Untitled Project\n',
		});
		expect(openFileInEditor).toHaveBeenCalledWith(path);
	});

	it('writes the bare type frontmatter for a type with no definition', async () => {
		const path = await createNoteHere({ typeName: 'Meeting' });
		expect(path).toBe('/vault/Untitled Meeting.md');
		expect(invoke).toHaveBeenCalledWith('create_note', { path, content: '---\n_type: Meeting\n---\n' });
	});

	it('rejects and opens nothing when the note cannot be written', async () => {
		vi.mocked(invoke).mockImplementation(tauri({ cmd: 'create_note', err: new Error('disk full') }));
		await expect(createNoteHere({ typeName: 'Project' })).rejects.toThrow('create-failed');
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('rejects without a vault', async () => {
		vaultStore._reset();
		await expect(createNoteHere({ typeName: 'Project' })).rejects.toThrow('no-vault');
		expect(commands()).not.toContain('create_note');
		expect(openFileInEditor).not.toHaveBeenCalled();
	});
});
