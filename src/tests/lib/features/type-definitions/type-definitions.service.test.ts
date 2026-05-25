import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readDir: vi.fn(),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/core/note-creator/note-creator.service', () => ({
	openOrCreateNote: vi.fn(),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
	syncExternalContentToEditor: vi.fn(),
}));

vi.mock('$lib/core/filesystem/fs.service', () => ({
	createFile: vi.fn(),
}));

vi.mock('$lib/utils/log.service', () => ({
	appendLog: vi.fn(),
}));

import { readDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';
import { openFileInEditor, syncExternalContentToEditor } from '$lib/core/editor/editor.service';
import { createFile } from '$lib/core/filesystem/fs.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import { createNoteOfType, createTypeDefinition, toggleFavoriteForPath } from '$lib/features/type-definitions/type-definitions.service';
import type { TypeMetadata } from '$lib/features/type-definitions/type-definitions.logic';

function makeMeta(overrides: Partial<TypeMetadata> & { name: string }): TypeMetadata {
	return {
		icon: 'file',
		color: 'blue',
		order: 50,
		sidebarLabel: overrides.name + 's',
		template: null,
		sort: 'title',
		view: 'all',
		visible: true,
		listPropertiesDisplay: [],
		...overrides,
	};
}

describe('createNoteOfType', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		typeDefinitionsStore.reset();
	});

	afterEach(() => {
		vaultStore._reset();
		clearLocalStorage();
	});

	it('does nothing when vault path is not set', async () => {
		vaultStore._reset();
		await createNoteOfType('Project');
		expect(readDir).not.toHaveBeenCalled();
		expect(openOrCreateNote).not.toHaveBeenCalled();
	});

	it('creates note with inline template when type has no _template', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);

		await createNoteOfType('Project');

		expect(readDir).toHaveBeenCalledWith('/vault');
		expect(openOrCreateNote).toHaveBeenCalledWith({
			filePath: '/vault/Untitled Project.md',
			templatePath: undefined,
			inlineTemplate: '---\ntype: Project\n---\n',
			title: 'Untitled Project',
		});
	});

	it('resolves template path from type metadata', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		const map = new Map([
			['Person', makeMeta({ name: 'Person', template: '_system/templates/Person.md' })],
		]);
		typeDefinitionsStore.setTypeMetadataMap(map);

		await createNoteOfType('Person');

		expect(openOrCreateNote).toHaveBeenCalledWith({
			filePath: '/vault/Untitled Person.md',
			templatePath: '/vault/_system/templates/Person.md',
			inlineTemplate: '---\ntype: Person\n---\n',
			title: 'Untitled Person',
		});
	});

	it('deduplicates filename when file already exists', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'Untitled Project.md', isDirectory: false, isFile: true, isSymlink: false },
		] as any);

		await createNoteOfType('Project');

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: '/vault/Untitled Project 1.md',
				title: 'Untitled Project 1',
			}),
		);
	});
});

describe('createTypeDefinition', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
	});

	afterEach(() => {
		vaultStore._reset();
		clearLocalStorage();
	});

	it('does nothing when vault path is not set', async () => {
		vaultStore._reset();
		await createTypeDefinition('Sprint');
		expect(createFile).not.toHaveBeenCalled();
	});

	it('creates type definition file with frontmatter and opens it', async () => {
		vaultStore.open('/vault');
		vi.mocked(createFile).mockResolvedValue('/vault/Sprint.md');

		await createTypeDefinition('Sprint');

		expect(createFile).toHaveBeenCalledWith('/vault', 'Sprint.md');
		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/Sprint.md',
			'---\ntype: Type\n_visible: true\n---\n\n# Sprint\n',
		);
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/Sprint.md');
	});

	it('does not write or open when createFile returns null', async () => {
		vaultStore.open('/vault');
		vi.mocked(createFile).mockResolvedValue(null);

		await createTypeDefinition('Sprint');

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(openFileInEditor).not.toHaveBeenCalled();
	});
});

describe('toggleFavoriteForPath', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
	});

	afterEach(() => {
		vaultStore._reset();
		clearLocalStorage();
	});

	it('adds _favorite: true to frontmatter', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntype: Project\n---\n\n# My Note\n');

		await toggleFavoriteForPath('/vault/note.md', true);

		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/note.md',
			expect.stringContaining('_favorite: true'),
		);
		expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path: '/vault/note.md' });
	});

	it('sets _favorite: false when unfavoriting', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntype: Project\n_favorite: true\n---\n\n# My Note\n');

		await toggleFavoriteForPath('/vault/note.md', false);

		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/note.md',
			expect.stringContaining('_favorite: false'),
		);
	});

	it('syncs editor when file is active tab', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntype: Project\n---\n\n# My Note\n');
		editorStore.reset();
		editorStore.addTab({ path: '/vault/note.md', name: 'note', content: '', savedContent: '' });

		await toggleFavoriteForPath('/vault/note.md', true);

		expect(syncExternalContentToEditor).toHaveBeenCalledWith(
			'/vault/note.md',
			expect.stringContaining('_favorite: true'),
			false,
		);
	});

	it('does not sync editor when file is not active tab', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntype: Project\n---\n\n# My Note\n');
		editorStore.reset();

		await toggleFavoriteForPath('/vault/note.md', true);

		expect(syncExternalContentToEditor).not.toHaveBeenCalled();
	});
});
