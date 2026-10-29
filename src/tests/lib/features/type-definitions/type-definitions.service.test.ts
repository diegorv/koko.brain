import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dayjs from 'dayjs';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readDir: vi.fn(),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('#lib/core/note-creator/note-creator.service.js', async () => {
	// The real template loader runs against the mocked `readTextFile`, so
	// `createTypedNote` is tested through the actual `processTemplate` path.
	const actual = await vi.importActual<typeof import('#lib/core/note-creator/note-creator.service.js')>(
		'#lib/core/note-creator/note-creator.service.js',
	);
	return {
		openOrCreateNote: vi.fn(),
		loadNoteTemplate: actual.loadNoteTemplate,
	};
});

vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
	syncExternalContentToEditor: vi.fn(),
	saveFileByPath: vi.fn(),
}));

vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	createFile: vi.fn(),
	renameItem: vi.fn(),
}));

vi.mock('#lib/utils/log.service.js', () => ({
	appendLog: vi.fn(),
}));

vi.mock('#lib/features/collection/yaml-parser.js', () => ({
	updateCollectionYaml: vi.fn(),
}));

vi.mock('#lib/features/type-definitions/view-parse-cache.js', () => ({
	refreshViewDefinition: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

import { readDir, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { openFileInEditor, saveFileByPath, syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { createFile, renameItem } from '#lib/core/filesystem/fs.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { createNoteOfType, createTypeDefinition, createTypedNote, refreshTypeDefinitions, renameType, toggleFavoriteForPath } from '#lib/features/type-definitions/type-definitions.service.js';
import { typeNameTakenMessage, type TypeMetadata } from '#lib/features/type-definitions/type-definitions.logic.js';
import { registerCollectionNoteChangeConsumer } from '#lib/features/collection/collection.service.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

function makeMeta(overrides: Partial<TypeMetadata> & { name: string }): TypeMetadata {
	return {
		path: null,
		icon: 'file',
		color: 'blue',
		order: 50,
		sidebarLabel: overrides.name + 's',
		template: null,
		folder: null,
		sort: 'title',
		view: 'all',
		visible: true,
		listPropertiesDisplay: [],
		archiveTo: null,
		...overrides,
	};
}

describe('refreshTypeDefinitions', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		typeDefinitionsStore.reset();
	});

	afterEach(() => {
		typeDefinitionsStore.reset();
	});

	it('builds the type metadata map from provided entries without an IPC call', async () => {
		const entries = [
			entryV2('/vault/Project.md', {
				isA: 'Type',
				frontmatter: { _icon: 'briefcase', _order: 7 },
			}),
			entryV2('/vault/regular-note.md'),
		];

		await refreshTypeDefinitions(entries);

		expect(invoke).not.toHaveBeenCalled();
		expect(typeDefinitionsStore.typeMetadataMap.size).toBe(1);
		expect(typeDefinitionsStore.getTypeMetadata('Project')).toMatchObject({
			name: 'Project',
			path: '/vault/Project.md',
			icon: 'briefcase',
			order: 7,
		});
		// Computed getter reflects the refreshed map.
		expect(typeDefinitionsStore.sortedTypes.map((t) => t.name)).toEqual(['Project']);
	});

	it('fetches entries via get_all_vault_entries_v2 when none are provided', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			entryV2('/vault/Person.md', { isA: 'Type' }),
			entryV2('/vault/Task.md', { isA: 'Type', frontmatter: { _order: 1 } }),
		]);

		await refreshTypeDefinitions();

		expect(invoke).toHaveBeenCalledWith('get_all_vault_entries_v2');
		expect(typeDefinitionsStore.typeMetadataMap.size).toBe(2);
		// sortedTypes orders by _order (Task=1 beats Person's builtin 2).
		expect(typeDefinitionsStore.sortedTypes.map((t) => t.name)).toEqual(['Task', 'Person']);
	});

	it('replaces a previously populated map when no type definitions remain', async () => {
		await refreshTypeDefinitions([entryV2('/vault/Project.md', { isA: 'Type' })]);
		expect(typeDefinitionsStore.typeMetadataMap.size).toBe(1);

		await refreshTypeDefinitions([entryV2('/vault/plain.md')]);

		expect(typeDefinitionsStore.typeMetadataMap.size).toBe(0);
		expect(typeDefinitionsStore.sortedTypes).toEqual([]);
	});

	it('handles an empty entries array', async () => {
		await refreshTypeDefinitions([]);

		expect(typeDefinitionsStore.typeMetadataMap.size).toBe(0);
	});

	it('propagates IPC errors and leaves the store untouched', async () => {
		await refreshTypeDefinitions([entryV2('/vault/Project.md', { isA: 'Type' })]);
		vi.mocked(invoke).mockRejectedValueOnce(new Error('IPC failure'));

		await expect(refreshTypeDefinitions()).rejects.toThrow('IPC failure');

		// Prior map preserved — no partial update on error.
		expect(typeDefinitionsStore.typeMetadataMap.size).toBe(1);
		expect(typeDefinitionsStore.getTypeMetadata('Project')).toBeDefined();
	});
});

describe('createNoteOfType', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		typeDefinitionsStore.reset();
		settingsStore.reset();
	});

	afterEach(() => {
		vaultStore._reset();
		settingsStore.reset();
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
			inlineTemplate: '---\n_type: Project\n---\n',
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
			inlineTemplate: '---\n_type: Person\n---\n',
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

	it('creates the note inside the type folder when _folder is set', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		const map = new Map([
			['Person', makeMeta({ name: 'Person', folder: 'People' })],
		]);
		typeDefinitionsStore.setTypeMetadataMap(map);

		await createNoteOfType('Person');

		// Siblings are read from the type folder, not the vault root.
		expect(readDir).toHaveBeenCalledWith('/vault/People');
		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: '/vault/People/Untitled Person.md',
				title: 'Untitled Person',
			}),
		);
	});

	it('strips surrounding slashes from _folder and supports nesting', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		const map = new Map([
			['Person', makeMeta({ name: 'Person', folder: '/People/Contacts/' })],
		]);
		typeDefinitionsStore.setTypeMetadataMap(map);

		await createNoteOfType('Person');

		expect(readDir).toHaveBeenCalledWith('/vault/People/Contacts');
		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: '/vault/People/Contacts/Untitled Person.md',
			}),
		);
	});

	it('still creates the note when the type folder does not exist yet', async () => {
		vaultStore.open('/vault');
		// readDir throws on a missing folder — no siblings to dedup against.
		vi.mocked(readDir).mockRejectedValue(new Error('ENOENT'));
		const map = new Map([
			['Person', makeMeta({ name: 'Person', folder: 'People' })],
		]);
		typeDefinitionsStore.setTypeMetadataMap(map);

		await createNoteOfType('Person');

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: '/vault/People/Untitled Person.md',
			}),
		);
	});

	it('nests the type folder under the global base folder setting', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		settingsStore.setSettings({ ...settingsStore.settings, typesBaseFolder: 'Notes' });
		const map = new Map([
			['Person', makeMeta({ name: 'Person', folder: 'People' })],
		]);
		typeDefinitionsStore.setTypeMetadataMap(map);

		await createNoteOfType('Person');

		expect(readDir).toHaveBeenCalledWith('/vault/Notes/People');
		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: '/vault/Notes/People/Untitled Person.md',
			}),
		);
	});

	it('uses the base folder alone when the type has no _folder', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		settingsStore.setSettings({ ...settingsStore.settings, typesBaseFolder: 'Notes' });

		await createNoteOfType('Project');

		expect(readDir).toHaveBeenCalledWith('/vault/Notes');
		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: '/vault/Notes/Untitled Project.md',
			}),
		);
	});
});

describe('createTypedNote', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		typeDefinitionsStore.reset();
		settingsStore.reset();
		vi.mocked(createFile).mockImplementation(async (dir, name) => `${dir}/${name}`);
	});

	afterEach(() => {
		vaultStore._reset();
		typeDefinitionsStore.reset();
		settingsStore.reset();
		clearLocalStorage();
	});

	it('creates the note in _folder under typesBaseFolder without opening it', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		settingsStore.setSettings({ ...settingsStore.settings, typesBaseFolder: 'Notes' });
		typeDefinitionsStore.setTypeMetadataMap(new Map([
			['Event', makeMeta({ name: 'Event', folder: 'Events' })],
		]));

		const path = await createTypedNote({ typeName: 'Event', title: 'Standup' });

		expect(path).toBe('/vault/Notes/Events/Standup.md');
		expect(readDir).toHaveBeenCalledWith('/vault/Notes/Events');
		expect(invoke).toHaveBeenCalledWith('create_folder', { path: '/vault/Notes/Events' });
		expect(createFile).toHaveBeenCalledWith('/vault/Notes/Events', 'Standup.md', '---\n_type: Event\n---\n');
		expect(openOrCreateNote).not.toHaveBeenCalled();
		expect(openFileInEditor).not.toHaveBeenCalled();
		// create_folder runs before the write.
		expect(vi.mocked(invoke).mock.invocationCallOrder[0])
			.toBeLessThan(vi.mocked(createFile).mock.invocationCallOrder[0]);
	});

	it('reads the template after create_folder and before createFile', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		vi.mocked(readTextFile).mockResolvedValue('---\n_type: Event\n---\n');
		typeDefinitionsStore.setTypeMetadataMap(new Map([
			['Event', makeMeta({ name: 'Event', template: '_system/templates/Event.md' })],
		]));

		await createTypedNote({ typeName: 'Event', title: 'Standup' });

		const folderAt = vi.mocked(invoke).mock.invocationCallOrder[0];
		const templateAt = vi.mocked(readTextFile).mock.invocationCallOrder[0];
		const writeAt = vi.mocked(createFile).mock.invocationCallOrder[0];
		expect(folderAt).toBeLessThan(templateAt);
		expect(templateAt).toBeLessThan(writeAt);
	});

	it('throws create-failed when create_folder rejects, and creates no file', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		vi.mocked(invoke).mockRejectedValue('Permission denied');

		await expect(createTypedNote({ typeName: 'Event', title: 'Standup' })).rejects.toThrow('create-failed');

		expect(invoke).toHaveBeenCalledWith('create_folder', { path: '/vault' });
		expect(readTextFile).not.toHaveBeenCalled();
		expect(createFile).not.toHaveBeenCalled();
	});

	it('dedupes the filename and hands the deduped target to buildContent', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir)
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([
				{ name: 'Standup.md', isDirectory: false, isFile: true, isSymlink: false },
			] as any);
		const buildContent = vi.fn((base: string, target: { fileName: string; title: string }) => `${base}# ${target.title}\n`);

		const first = await createTypedNote({ typeName: 'Event', title: 'Standup', buildContent });
		const second = await createTypedNote({ typeName: 'Event', title: 'Standup', buildContent });

		expect(first).toBe('/vault/Standup.md');
		expect(second).toBe('/vault/Standup 1.md');
		expect(buildContent).toHaveBeenNthCalledWith(2, '---\n_type: Event\n---\n', { fileName: 'Standup 1.md', title: 'Standup 1' });
		expect(createFile).toHaveBeenNthCalledWith(2, '/vault', 'Standup 1.md', '---\n_type: Event\n---\n# Standup 1\n');
	});

	it('numbers a title that collides with an existing note only by case', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'Standup.md', isDirectory: false, isFile: true, isSymlink: false },
		] as any);
		const buildContent = vi.fn((base: string, target: { fileName: string; title: string }) => `${base}# ${target.title}\n`);

		const path = await createTypedNote({ typeName: 'Event', title: 'standup', buildContent });

		expect(path).toBe('/vault/standup 1.md');
		expect(buildContent).toHaveBeenCalledWith('---\n_type: Event\n---\n', { fileName: 'standup 1.md', title: 'standup 1' });
		expect(createFile).toHaveBeenCalledWith('/vault', 'standup 1.md', '---\n_type: Event\n---\n# standup 1\n');
	});

	it('loads the type template, then applies buildContent on top of it', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		vi.mocked(readTextFile).mockResolvedValue('---\n_type: Event\nlocation: \n---\n# <% tp.file.title %>\n');
		typeDefinitionsStore.setTypeMetadataMap(new Map([
			['Event', makeMeta({ name: 'Event', template: '_system/templates/Event.md' })],
		]));

		const path = await createTypedNote({
			typeName: 'Event',
			title: 'Standup',
			buildContent: (base) => base.replace('location: ', 'location: Room 4'),
		});

		expect(path).toBe('/vault/Standup.md');
		expect(readTextFile).toHaveBeenCalledWith('/vault/_system/templates/Event.md');
		expect(createFile).toHaveBeenCalledWith('/vault', 'Standup.md', '---\n_type: Event\nlocation: Room 4\n---\n# Standup\n');
	});

	it('renders tp.date.now() in the template against contextDate', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		vi.mocked(readTextFile).mockResolvedValue('---\n_type: Event\ndate: <% tp.date.now("YYYY-MM-DD") %>\n---\n');
		typeDefinitionsStore.setTypeMetadataMap(new Map([
			['Event', makeMeta({ name: 'Event', template: '_system/templates/Event.md' })],
		]));

		const path = await createTypedNote({ typeName: 'Event', title: 'Standup', contextDate: dayjs('2026-11-12') });

		expect(path).toBe('/vault/Standup.md');
		expect(createFile).toHaveBeenCalledWith('/vault', 'Standup.md', '---\n_type: Event\ndate: 2026-11-12\n---\n');
	});

	it('creates no file when buildContent throws, and rethrows its error', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);

		await expect(createTypedNote({
			typeName: 'Event',
			title: 'Standup',
			buildContent: () => { throw new Error('bad-frontmatter'); },
		})).rejects.toThrow('bad-frontmatter');

		expect(createFile).not.toHaveBeenCalled();
	});

	it('throws create-failed when createFile returns null', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		vi.mocked(createFile).mockResolvedValue(null);

		await expect(createTypedNote({ typeName: 'Event', title: 'Standup' })).rejects.toThrow('create-failed');

		expect(createFile).toHaveBeenCalledWith('/vault', 'Standup.md', '---\n_type: Event\n---\n');
	});

	it('throws no-vault without a vault and touches nothing', async () => {
		await expect(createTypedNote({ typeName: 'Event', title: 'Standup' })).rejects.toThrow('no-vault');

		expect(readDir).not.toHaveBeenCalled();
		expect(invoke).not.toHaveBeenCalled();
		expect(createFile).not.toHaveBeenCalled();
	});
});

describe('createTypeDefinition', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vi.mocked(readDir).mockResolvedValue([]);
	});

	afterEach(() => {
		vaultStore._reset();
		clearLocalStorage();
	});

	it('does nothing when vault path is not set', async () => {
		vaultStore._reset();
		expect(await createTypeDefinition('Sprint')).toBeNull();
		expect(createFile).not.toHaveBeenCalled();
	});

	it('creates the definition file with its frontmatter as initial content and opens it', async () => {
		vaultStore.open('/vault');
		vi.mocked(createFile).mockResolvedValue('/vault/Sprint.md');

		expect(await createTypeDefinition('Sprint')).toBe('/vault/Sprint.md');

		// Content goes through createFile (one step) so the Rust create_note
		// indexes the real frontmatter — no separate write or re-index needed.
		expect(createFile).toHaveBeenCalledWith(
			'/vault',
			'Sprint.md',
			'---\n_type: Type\n_visible: true\n---\n\n# Sprint\n',
		);
		expect(invoke).not.toHaveBeenCalledWith('update_note_in_index', expect.anything());
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/Sprint.md');
	});

	it('does not open and toasts when createFile returns null', async () => {
		vaultStore.open('/vault');
		vi.mocked(createFile).mockResolvedValue(null);

		expect(await createTypeDefinition('Sprint')).toBeNull();

		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(toast.error).toHaveBeenCalledWith('Could not create the "Sprint" type');
	});

	it('selects the new type in the sidebar instead of opening it when select is set', async () => {
		vaultStore.open('/vault');
		typeDefinitionsStore.reset();
		vi.mocked(createFile).mockResolvedValue('/vault/Sprint.md');

		await createTypeDefinition('Sprint', { select: true });

		expect(createFile).toHaveBeenCalledWith(
			'/vault',
			'Sprint.md',
			'---\n_type: Type\n_visible: true\n---\n\n# Sprint\n',
		);
		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(typeDefinitionsStore.selectedTypeOrNav).toEqual({ kind: 'type', name: 'Sprint' });
	});

	it('does not change the selection when createFile fails and select is set', async () => {
		vaultStore.open('/vault');
		typeDefinitionsStore.reset();
		vi.mocked(createFile).mockResolvedValue(null);

		await createTypeDefinition('Sprint', { select: true });

		expect(typeDefinitionsStore.selectedTypeOrNav).toBeNull();
	});

	it('creates nothing and toasts when an ordinary root note holds the name', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'Sprint.md', isDirectory: false, isFile: true, isSymlink: false },
		]);

		expect(await createTypeDefinition('Sprint')).toBeNull();

		// createFile would dedupe to `Sprint 1.md`, which defines type "Sprint 1".
		expect(readDir).toHaveBeenCalledWith('/vault');
		expect(createFile).not.toHaveBeenCalled();
		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(toast.error).toHaveBeenCalledWith(typeNameTakenMessage('Sprint.md', 'Sprint'));
	});

	it('matches the root name ignoring case', async () => {
		vaultStore.open('/vault');
		typeDefinitionsStore.reset();
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'sprint.MD', isDirectory: false, isFile: true, isSymlink: false },
		]);

		expect(await createTypeDefinition('Sprint', { select: true })).toBeNull();

		expect(createFile).not.toHaveBeenCalled();
		expect(typeDefinitionsStore.selectedTypeOrNav).toBeNull();
		expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('"sprint.MD"'));
	});

	it('creates when the root only holds other names', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'Sprints.md', isDirectory: false, isFile: true, isSymlink: false },
			{ name: 'Sprint', isDirectory: true, isFile: false, isSymlink: false },
		]);
		vi.mocked(createFile).mockResolvedValue('/vault/Sprint.md');

		expect(await createTypeDefinition('Sprint')).toBe('/vault/Sprint.md');

		expect(createFile).toHaveBeenCalledWith('/vault', 'Sprint.md', expect.any(String));
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('creates nothing when the vault root cannot be read', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockRejectedValue(new Error('permission denied'));

		expect(await createTypeDefinition('Sprint')).toBeNull();

		expect(createFile).not.toHaveBeenCalled();
		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(toast.error).toHaveBeenCalledWith('Could not create the "Sprint" type');
	});
});

describe('toggleFavoriteForPath', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		editorStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(saveFileByPath).mockResolvedValue(true);
		// The write runs `notifyAfterSave` -> `applyNoteChange`, which calls `invoke`.
		vi.mocked(invoke).mockResolvedValue(undefined as never);
	});

	afterEach(() => {
		vaultStore._reset();
		editorStore.reset();
		clearLocalStorage();
	});

	it('adds _favorite: true to frontmatter', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntype: Project\n---\n\n# My Note\n');

		await toggleFavoriteForPath('/vault/note.md', true);

		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/note.md',
			expect.stringContaining('_favorite: true'),
		);
		expect(invoke).toHaveBeenCalledWith('update_note_in_index', {
			path: '/vault/note.md',
			content: expect.stringContaining('_favorite: true'),
		});
	});

	it('sets _favorite: false when unfavoriting', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntype: Project\n_favorite: true\n---\n\n# My Note\n');

		await toggleFavoriteForPath('/vault/note.md', false);

		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/note.md',
			expect.stringContaining('_favorite: false'),
		);
	});

	it('patches an open dirty tab from its own content, keeping the body edit, and saves it', async () => {
		editorStore.addTab({
			path: '/vault/note.md',
			name: 'note',
			content: '---\ntype: Project\n---\n\n# Unsaved edit\n',
			savedContent: '---\ntype: Project\n---\n\n# My Note\n',
		});

		await toggleFavoriteForPath('/vault/note.md', true);

		expect(readTextFile).not.toHaveBeenCalled();
		expect(writeTextFile).not.toHaveBeenCalled();
		const [path, content, markClean] = vi.mocked(syncExternalContentToEditor).mock.calls[0];
		expect(path).toBe('/vault/note.md');
		expect(content).toContain('_favorite: true');
		expect(content).toContain('# Unsaved edit');
		expect(markClean).toBe(false);
		expect(saveFileByPath).toHaveBeenCalledWith('/vault/note.md');
	});

	it('refuses lossy frontmatter: no write, error toast', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n# keep me\ntype: Project\n---\n\n# My Note\n');

		await toggleFavoriteForPath('/vault/note.md', true);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith(
			"note.md: The note's frontmatter has comments; it cannot be rewritten without losing them",
		);
	});

	it('propagates a read error', async () => {
		vi.mocked(readTextFile).mockRejectedValue(new Error('EACCES'));

		await expect(toggleFavoriteForPath('/vault/note.md', true)).rejects.toThrow('EACCES');
		expect(toast.error).not.toHaveBeenCalled();
	});
});

describe('updateViewIcon', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('writes updated YAML with icon, color, and titleColor', async () => {
		const { updateViewIcon } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue('_sidebar_label: Test\n');

		await updateViewIcon('/vault/test.view', 'lucide:rocket', 'red', '#fff');

		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/test.view',
			expect.stringContaining('_icon: lucide:rocket'),
		);
		expect(vi.mocked(writeTextFile).mock.calls[0][1]).toContain('_color: red');
		expect(vi.mocked(writeTextFile).mock.calls[0][1]).toContain('_sidebar_label: Test');
	});

	it('removes icon fields via removeViewIcon', async () => {
		const { removeViewIcon } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue('_icon: lucide:star\n_color: blue\n_title_color: white\n_sidebar_label: Test\n');

		await removeViewIcon('/vault/test.view');

		const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
		expect(written).not.toContain('_icon');
		expect(written).not.toContain('_color');
		expect(written).not.toContain('_title_color');
		expect(written).toContain('_sidebar_label: Test');
	});
});

describe('createView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vaultStore._reset();
		typeDefinitionsStore.reset();
	});

	afterEach(() => {
		vaultStore._reset();
		typeDefinitionsStore.reset();
	});

	it('does nothing when vault path is not set', async () => {
		const { createView } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vaultStore._reset();
		await createView();
		expect(createFile).not.toHaveBeenCalled();
		expect(typeDefinitionsStore.selectedTypeOrNav).toBeNull();
	});

	it('aborts when createFile returns null', async () => {
		const { createView } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		vi.mocked(createFile).mockResolvedValue(null);

		await createView();

		expect(typeDefinitionsStore.selectedTypeOrNav).toBeNull();
	});

	it('aborts without creating anything when the vault root cannot be read', async () => {
		const { createView } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vaultStore.open('/vault');
		// A silent fallback here would create "Untitled 1.view" with a body
		// that still says "Untitled" — abort instead.
		vi.mocked(readDir).mockRejectedValue(new Error('permission denied'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await createView();

		expect(createFile).not.toHaveBeenCalled();
		expect(typeDefinitionsStore.selectedTypeOrNav).toBeNull();
		consoleSpy.mockRestore();
	});

	it('creates a minimal .view body as initial content and selects the new view in the sidebar', async () => {
		const { createView } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		vi.mocked(createFile).mockResolvedValue('/vault/Untitled.view');

		await createView();

		// Content goes through createFile (one step) so the Rust create_note
		// indexes the real view body, not an empty file.
		expect(createFile).toHaveBeenCalledWith('/vault', 'Untitled.view', expect.stringContaining('_sidebar_label: Untitled'));
		const written = vi.mocked(createFile).mock.calls[0][2] as string;
		expect(written).toContain('views:');
		expect(written).toContain('  - type: table');
		expect(written).toContain('    name: Untitled');
		expect(written).not.toContain('filters:');
		expect(typeDefinitionsStore.selectedTypeOrNav).toEqual({ kind: 'view', path: '/vault/Untitled.view' });
	});

	it('embeds the deduplicated filename as the title when Untitled.view already exists', async () => {
		const { createView } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vaultStore.open('/vault');
		// Dedup runs BEFORE createFile so the body can embed the final title.
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'Untitled.view', isDirectory: false, isFile: true, isSymlink: false },
			{ name: 'Untitled 1.view', isDirectory: false, isFile: true, isSymlink: false },
		] as any);
		vi.mocked(createFile).mockResolvedValue('/vault/Untitled 2.view');

		await createView();

		expect(createFile).toHaveBeenCalledWith('/vault', 'Untitled 2.view', expect.any(String));
		const written = vi.mocked(createFile).mock.calls[0][2] as string;
		expect(written).toContain('_sidebar_label: Untitled 2');
		expect(written).toContain('name: Untitled 2');
		expect(typeDefinitionsStore.selectedTypeOrNav).toEqual({ kind: 'view', path: '/vault/Untitled 2.view' });
	});
});

describe('updateViewQuery', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('writes the patched YAML and refreshes the parse cache', async () => {
		const { updateViewQuery } = await import('#lib/features/type-definitions/type-definitions.service.js');
		const { updateCollectionYaml } = await import('#lib/features/collection/yaml-parser.js');
		const { refreshViewDefinition } = await import('#lib/features/type-definitions/view-parse-cache.js');

		vi.mocked(readTextFile).mockResolvedValue('original yaml\n');
		vi.mocked(updateCollectionYaml).mockReturnValue('patched yaml\n');

		await updateViewQuery('/vault/test.view', { filters: "status == 'active'" });

		expect(updateCollectionYaml).toHaveBeenCalledWith('original yaml\n', { filters: "status == 'active'" });
		expect(writeTextFile).toHaveBeenCalledWith('/vault/test.view', 'patched yaml\n');
		expect(refreshViewDefinition).toHaveBeenCalledWith('/vault/test.view');
	});

	it('skips write and cache refresh when patch produces no change', async () => {
		const { updateViewQuery } = await import('#lib/features/type-definitions/type-definitions.service.js');
		const { updateCollectionYaml } = await import('#lib/features/collection/yaml-parser.js');
		const { refreshViewDefinition } = await import('#lib/features/type-definitions/view-parse-cache.js');

		vi.mocked(readTextFile).mockResolvedValue('unchanged yaml\n');
		vi.mocked(updateCollectionYaml).mockReturnValue('unchanged yaml\n');

		await updateViewQuery('/vault/test.view', { viewSort: [] });

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(refreshViewDefinition).not.toHaveBeenCalled();
	});

	it('forwards view-level sort and filter updates verbatim', async () => {
		const { updateViewQuery } = await import('#lib/features/type-definitions/type-definitions.service.js');
		const { updateCollectionYaml } = await import('#lib/features/collection/yaml-parser.js');

		vi.mocked(readTextFile).mockResolvedValue('y\n');
		vi.mocked(updateCollectionYaml).mockReturnValue('y2\n');

		const updates = {
			filters: 'file.hasTag("projeto")',
			viewFilters: { and: ['status != "completed"'] },
			viewSort: [{ column: 'due', direction: 'ASC' as const }],
		};
		await updateViewQuery('/vault/test.view', updates);

		expect(updateCollectionYaml).toHaveBeenCalledWith('y\n', updates);
	});
});

describe('renameType', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		typeDefinitionsStore.reset();
		editorStore.reset();
	});

	afterEach(() => {
		vaultStore._reset();
		clearLocalStorage();
	});

	it('renames the definition and propagates _type to member notes', async () => {
		vi.mocked(renameItem).mockResolvedValue('/vault/Initiative.md');

		await renameType('Project', 'Initiative', '/vault/Project.md');

		expect(renameItem).toHaveBeenCalledWith('/vault/Project.md', 'Initiative.md');
		expect(invoke).toHaveBeenCalledWith('propagate_type_rename', {
			oldType: 'Project',
			newType: 'Initiative',
		});
	});

	it('moves the sidebar selection to the new name when the renamed type was selected', async () => {
		typeDefinitionsStore.setSelection({ kind: 'type', name: 'Project' });
		vi.mocked(renameItem).mockResolvedValue('/vault/Initiative.md');

		await renameType('Project', 'Initiative', '/vault/Project.md');

		expect(typeDefinitionsStore.selectedTypeOrNav).toEqual({ kind: 'type', name: 'Initiative' });
	});

	it('keeps an unrelated selection untouched', async () => {
		typeDefinitionsStore.setSelection({ kind: 'type', name: 'Task' });
		vi.mocked(renameItem).mockResolvedValue('/vault/Initiative.md');

		await renameType('Project', 'Initiative', '/vault/Project.md');

		expect(typeDefinitionsStore.selectedTypeOrNav).toEqual({ kind: 'type', name: 'Task' });
	});

	it('is a no-op when the name is unchanged', async () => {
		await renameType('Project', 'Project', '/vault/Project.md');

		expect(renameItem).not.toHaveBeenCalled();
		expect(invoke).not.toHaveBeenCalled();
	});

	it('does not propagate or move the selection when the definition rename fails', async () => {
		typeDefinitionsStore.setSelection({ kind: 'type', name: 'Project' });
		vi.mocked(renameItem).mockResolvedValue(null);

		await renameType('Project', 'Initiative', '/vault/Project.md');

		expect(invoke).not.toHaveBeenCalled();
		expect(typeDefinitionsStore.selectedTypeOrNav).toEqual({ kind: 'type', name: 'Project' });
	});

	it('rewrites open member tabs in memory before the Rust propagation', async () => {
		// A dirty open tab holds the old _type plus unsaved edits; the Rust
		// command only rewrites DISK state, so without the tab sync the next
		// auto-save would clobber the propagated rewrite with the stale _type.
		editorStore.reset();
		editorStore.addTab({
			path: '/vault/m1.md',
			name: 'm1.md',
			content: '---\n_type: Project\n---\n\nunsaved edits',
			savedContent: '---\n_type: Project\n---\n\nold body',
		});
		vi.mocked(renameItem).mockResolvedValue('/vault/Initiative.md');
		vi.mocked(invoke).mockResolvedValue(undefined as never);

		await renameType('Project', 'Initiative', '/vault/Project.md');

		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/m1.md',
			'---\n_type: Initiative\n---\n\nunsaved edits',
		);
		expect(syncExternalContentToEditor).toHaveBeenCalledWith(
			'/vault/m1.md',
			'---\n_type: Initiative\n---\n\nunsaved edits',
			true,
			'none',
		);
		expect(invoke).toHaveBeenCalledWith('update_note_in_index', {
			path: '/vault/m1.md',
			content: '---\n_type: Initiative\n---\n\nunsaved edits',
		});
		expect(invoke).toHaveBeenCalledWith('propagate_type_rename', {
			oldType: 'Project',
			newType: 'Initiative',
		});
	});

	it('leaves open tabs of other types untouched', async () => {
		editorStore.reset();
		editorStore.addTab({
			path: '/vault/other.md',
			name: 'other.md',
			content: '---\n_type: Task\n---\n\nbody',
			savedContent: '---\n_type: Task\n---\n\nbody',
		});
		vi.mocked(renameItem).mockResolvedValue('/vault/Initiative.md');

		await renameType('Project', 'Initiative', '/vault/Project.md');

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(syncExternalContentToEditor).not.toHaveBeenCalled();
	});

	it('shows a toast and keeps the selection when propagation fails', async () => {
		typeDefinitionsStore.setSelection({ kind: 'type', name: 'Project' });
		vi.mocked(renameItem).mockResolvedValue('/vault/Initiative.md');
		vi.mocked(invoke).mockRejectedValue(new Error('lock poisoned'));

		await renameType('Project', 'Initiative', '/vault/Project.md');

		expect(toast.error).toHaveBeenCalled();
		expect(typeDefinitionsStore.selectedTypeOrNav).toEqual({ kind: 'type', name: 'Project' });
	});
});

describe('note-change indexing (issue 29)', () => {
	let unregister: (() => void) | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		editorStore.reset();
		typeDefinitionsStore.reset();
		clearAllIndexed();
		collectionStore.reset();
		vi.mocked(invoke).mockResolvedValue(undefined as never);
		// `updateNoteFrontmatter` checks the closed note still exists before writing.
		vi.mocked(exists).mockResolvedValue(true);
		unregister = registerCollectionNoteChangeConsumer();
	});

	afterEach(() => {
		unregister?.();
		unregister = null;
		collectionStore.reset();
		vaultStore._reset();
		clearLocalStorage();
	});

	it('toggleFavoriteForPath indexes the written bytes into the real property index', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntype: Project\n---\n\n# My Note\n');

		await toggleFavoriteForPath('/vault/note.md', true);

		expect(collectionStore.propertyIndex.get('/vault/note.md')?.properties.get('_favorite')).toBe(true);
	});

	it('renameType indexes each rewritten open tab into the real property index', async () => {
		editorStore.addTab({
			path: '/vault/m1.md',
			name: 'm1.md',
			content: '---\n_type: Project\n---\n\nbody',
			savedContent: '---\n_type: Project\n---\n\nbody',
		});
		vi.mocked(renameItem).mockResolvedValue('/vault/Initiative.md');

		await renameType('Project', 'Initiative', '/vault/Project.md');

		expect(collectionStore.propertyIndex.get('/vault/m1.md')?.properties.get('_type')).toBe('Initiative');
	});

	it('leaves .view writes out of the property index', async () => {
		// A `.view` body is bare YAML with no `---` fences, so `buildNoteRecord`
		// would parse zero properties and replace the Rust-projected record
		// (organized / archived / favorite / tags) with an empty one. The three
		// registered consumers can read nothing from a fenceless file, so the
		// `.view` writers deliberately stay off the note-change owner.
		const { updateViewQuery } = await import('#lib/features/type-definitions/type-definitions.service.js');
		const { updateCollectionYaml } = await import('#lib/features/collection/yaml-parser.js');
		collectionStore.updateRecord('/vault/test.view', {
			path: '/vault/test.view', name: 'test.view', basename: 'test', folder: '/vault',
			ext: '.view', mtime: 0, ctime: 0, size: 0,
			properties: new Map<string, unknown>([['archived', false], ['tags', []]]),
		});
		vi.mocked(readTextFile).mockResolvedValue('original yaml\n');
		vi.mocked(updateCollectionYaml).mockReturnValue('patched yaml\n');

		await updateViewQuery('/vault/test.view', { filters: "status == 'active'" });

		expect(collectionStore.propertyIndex.get('/vault/test.view')?.properties.get('archived')).toBe(false);
	});
});
