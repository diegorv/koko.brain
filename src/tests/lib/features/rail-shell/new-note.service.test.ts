// "+ New here" through the real fs.service::createFile owner; only Tauri and
// the editor service are mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('createNoteHere - a note of a type', () => {
	const TEMPLATE = '---\n_type: Project\nstatus: active\n---\n\n# <% tp.file.title %>\n';

	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		settingsStore.reset();
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
