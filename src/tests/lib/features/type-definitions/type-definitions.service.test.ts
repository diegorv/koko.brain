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
	waitForTabSave: vi.fn(),
}));

vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	createFile: vi.fn(),
	renameItem: vi.fn(),
}));

vi.mock('#lib/utils/log.service.js', () => ({
	appendLog: vi.fn(),
}));

vi.mock('#lib/features/type-definitions/view-parse-cache.js', () => ({
	refreshViewDefinition: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
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
import { createNoteOfType, createTypeDefinition, createTypedNote, refreshTypeDefinitions, renameType, updateViewToolbarKey } from '#lib/features/type-definitions/type-definitions.service.js';
import { canonicalToolbarValue } from '#lib/features/type-definitions/type-note-list.logic.js';
import { refreshViewDefinition } from '#lib/features/type-definitions/view-parse-cache.js';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';
import { typeNameTakenMessage, type TypeMetadata } from '#lib/features/type-definitions/type-definitions.logic.js';
import { buildNewViewYaml } from '#lib/features/type-definitions/type-sidebar.logic.js';
import { registerCollectionNoteChangeConsumer } from '#lib/features/collection/collection.service.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { areAllRecentSaves, resetHooks } from '#lib/core/editor/editor.hooks.js';
import { registerFileIconsNoteChangeConsumer } from '#lib/features/file-icons/file-icons.service.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import { parse as parseYaml } from 'yaml';
import { filterGroupsToFilter, filterRowToExpression, parseFilterToGroups } from '#lib/features/collection/toolbar/filter.logic.js';
import type { CollectionFilter } from '#lib/features/collection/collection.types.js';
import type { FilterGroup } from '#lib/features/collection/toolbar/toolbar.types.js';

/** A `.view` with one view and no filters or sort; `stringify` gives these bytes back. */
const PLAIN_VIEW = 'views:\n  - type: table\n    name: Projects\n';

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
		hub: false,
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
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
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

	it('marks the note unorganized while Explicit organization is on', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: true });

		await createNoteOfType('Project');

		const { buildContent, inlineTemplate } = vi.mocked(openOrCreateNote).mock.calls[0][0];
		const written = buildContent!(inlineTemplate!);
		expect(written).toBe('---\n_organized: false\n_type: Project\n---\n');
		expect(written.match(/^_organized:/gm)).toHaveLength(1);
	});

	it('keeps a type template that already sets _organized: true while the switch is on', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: true });
		typeDefinitionsStore.setTypeMetadataMap(new Map([
			['Person', makeMeta({ name: 'Person', template: '_system/templates/Person.md' })],
		]));

		await createNoteOfType('Person');

		const { buildContent } = vi.mocked(openOrCreateNote).mock.calls[0][0];
		const rendered = '---\n_type: Person\n_organized: true\n---\n# Untitled Person\n';
		expect(buildContent!(rendered)).toBe(rendered);
	});
});

describe('createTypedNote', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		typeDefinitionsStore.reset();
		settingsStore.reset();
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
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
		const buildContent = vi.fn((base: string, target: { fileName: string; title: string; path: string }) => `${base}# ${target.title}\n`);

		const first = await createTypedNote({ typeName: 'Event', title: 'Standup', buildContent });
		const second = await createTypedNote({ typeName: 'Event', title: 'Standup', buildContent });

		expect(first).toBe('/vault/Standup.md');
		expect(second).toBe('/vault/Standup 1.md');
		expect(buildContent).toHaveBeenNthCalledWith(2, '---\n_type: Event\n---\n', { fileName: 'Standup 1.md', title: 'Standup 1', path: '/vault/Standup 1.md' });
		expect(createFile).toHaveBeenNthCalledWith(2, '/vault', 'Standup 1.md', '---\n_type: Event\n---\n# Standup 1\n');
	});

	it('numbers a title that collides with an existing note only by case', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'Standup.md', isDirectory: false, isFile: true, isSymlink: false },
		] as any);
		const buildContent = vi.fn((base: string, target: { fileName: string; title: string; path: string }) => `${base}# ${target.title}\n`);

		const path = await createTypedNote({ typeName: 'Event', title: 'standup', buildContent });

		expect(path).toBe('/vault/standup 1.md');
		expect(buildContent).toHaveBeenCalledWith('---\n_type: Event\n---\n', { fileName: 'standup 1.md', title: 'standup 1', path: '/vault/standup 1.md' });
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

	it('throws create-failed when createFile fails', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		vi.mocked(createFile).mockRejectedValue(new Error('write error'));

		await expect(createTypedNote({ typeName: 'Event', title: 'Standup' })).rejects.toThrow('create-failed');

		expect(createFile).toHaveBeenCalledWith('/vault', 'Standup.md', '---\n_type: Event\n---\n');
	});

	it('marks the final content unorganized, after buildContent, while Explicit organization is on', async () => {
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: true });

		await createTypedNote({ typeName: 'Event', title: 'Standup', buildContent: (base) => `${base}# Standup\n` });

		expect(createFile).toHaveBeenCalledWith('/vault', 'Standup.md', '---\n_organized: false\n_type: Event\n---\n# Standup\n');
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

	it('does not open and toasts when createFile fails', async () => {
		vaultStore.open('/vault');
		vi.mocked(createFile).mockRejectedValue(new Error('write error'));

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
		vi.mocked(createFile).mockRejectedValue(new Error('write error'));

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

describe('updateViewIcon', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(invoke).mockResolvedValue(undefined as never);
		// The `.view` writer checks the closed file still exists before writing.
		vi.mocked(exists).mockResolvedValue(true);
	});

	it('writes updated YAML with icon, color, and titleColor', async () => {
		const { updateViewIcon } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue('_sidebar_label: Test\n');

		await updateViewIcon('/vault/test.view', 'lucide:rocket', 'red', '#fff');

		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/test.view',
			expect.stringContaining('_icon: lucide:rocket'),
			{ create: false },
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

	it('rejects without a vault and creates nothing', async () => {
		const { createView } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vaultStore._reset();
		await expect(createView('Reading')).rejects.toThrow('No vault is open');
		expect(createFile).not.toHaveBeenCalled();
		expect(typeDefinitionsStore.selectedTypeOrNav).toBeNull();
		expect(vaultStore.takePromptIndexRefresh()).toBe(false);
	});

	it('rejects when createFile fails', async () => {
		const { createView } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vaultStore.open('/vault');
		vi.mocked(createFile).mockRejectedValue(new Error('write error'));

		await expect(createView('Reading')).rejects.toThrow('write error');

		expect(typeDefinitionsStore.selectedTypeOrNav).toBeNull();
	});

	it('rejects without selecting anything when the vault root cannot be read', async () => {
		const { createView } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vaultStore.open('/vault');
		// `createFile` reads the root to dedupe and rejects with the read error.
		vi.mocked(createFile).mockRejectedValue(new Error('permission denied'));

		await expect(createView('Reading')).rejects.toThrow('permission denied');

		expect(typeDefinitionsStore.selectedTypeOrNav).toBeNull();
	});

	it('creates the view under the typed name with the built YAML, selects it and asks for a prompt index refresh', async () => {
		const { createView } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vaultStore.open('/vault');
		vi.mocked(createFile).mockResolvedValue('/vault/Reading.view');

		expect(await createView('Reading')).toBe('/vault/Reading.view');

		// Content goes through createFile (one step) so the Rust create_note
		// indexes the real view body, not an empty file.
		expect(createFile).toHaveBeenCalledWith('/vault', 'Reading.view', buildNewViewYaml('Reading'));
		const written = vi.mocked(createFile).mock.calls[0][2] as string;
		expect(written).toContain('_sidebar_label: Reading');
		expect(written).toContain('name: Reading');
		expect(written).not.toContain('filters:');
		expect(readDir).not.toHaveBeenCalled();
		expect(typeDefinitionsStore.selectedTypeOrNav).toEqual({ kind: 'view', path: '/vault/Reading.view' });
		expect(vaultStore.takePromptIndexRefresh()).toBe(true);
	});

	it('keeps the typed name as label and view name when createFile dedupes the file name', async () => {
		const { createView } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vaultStore.open('/vault');
		vi.mocked(createFile).mockResolvedValue('/vault/Foo 1.view');

		expect(await createView('Foo')).toBe('/vault/Foo 1.view');

		expect(createFile).toHaveBeenCalledWith('/vault', 'Foo.view', expect.any(String));
		const written = vi.mocked(createFile).mock.calls[0][2] as string;
		expect(written).toContain('_sidebar_label: Foo\n');
		expect(written).toContain('name: Foo\n');
		expect(written).not.toContain('Foo 1');
		expect(typeDefinitionsStore.selectedTypeOrNav).toEqual({ kind: 'view', path: '/vault/Foo 1.view' });
	});

	describe('with filters', () => {
		/** Creates `Reading` with `filters` and returns the written first view's filter, read back as groups. */
		async function createAndReadBack(filters: CollectionFilter | string | undefined) {
			const { createView } = await import('#lib/features/type-definitions/type-definitions.service.js');
			vaultStore.open('/vault');
			vi.mocked(createFile).mockResolvedValue('/vault/Reading.view');
			await createView('Reading', filters);
			const written = vi.mocked(createFile).mock.calls[0][2] as string;
			const top = parseYaml(written) as { filters?: unknown; views: { filters?: CollectionFilter | string }[] };
			expect(top).not.toHaveProperty('filters');
			return { stored: top.views[0].filters, groups: parseFilterToGroups(top.views[0].filters) };
		}

		/** Conjunction and expression per row; row ids are not compared. */
		function shape(groups: FilterGroup[]) {
			return groups.map((g) => ({ conjunction: g.conjunction, expressions: g.rows.map(filterRowToExpression) }));
		}

		function row(property: string, operator: FilterGroup['rows'][number]['operator'], value: string) {
			return { id: `test-${property}-${operator}`, property, operator, value };
		}

		it('stores a filter string with double quotes under the first view as written', async () => {
			const { stored, groups } = await createAndReadBack('_type == "Project"');
			expect(stored).toBe('_type == "Project"');
			expect(shape(groups)).toEqual(shape(parseFilterToGroups('_type == "Project"')));
		});

		it('reads an All group of two rows back with the same conjunction and expressions', async () => {
			const groups: FilterGroup[] = [{ conjunction: 'and', rows: [row('_type', 'is', 'Project'), row('title', 'contains', 'say "hi"')] }];
			const { groups: back } = await createAndReadBack(filterGroupsToFilter(groups));
			expect(shape(back)).toEqual(shape(groups));
			expect(back[0].rows[1].value).toBe('say "hi"');
		});

		it('reads a None group back as None', async () => {
			const groups: FilterGroup[] = [{ conjunction: 'not', rows: [row('_type', 'is', 'Project')] }];
			const { groups: back } = await createAndReadBack(filterGroupsToFilter(groups));
			expect(shape(back)).toEqual(shape(groups));
		});

		it('reads a one-row Any group back as All, one expression either way', async () => {
			const groups: FilterGroup[] = [{ conjunction: 'or', rows: [row('_type', 'is', 'Project')] }];
			const { stored, groups: back } = await createAndReadBack(filterGroupsToFilter(groups));
			expect(stored).toBe("_type == 'Project'");
			expect(shape(back)).toEqual([{ conjunction: 'and', expressions: ["_type == 'Project'"] }]);
		});
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

	it('keeps the rail Types pick on the renamed type', async () => {
		settingsStore.reset();
		settingsStore.updateLayout({ railItem: 'types', railTypesLens: { kind: 'type', target: 'Project' } });
		vi.mocked(renameItem).mockResolvedValue('/vault/Initiative.md');

		await renameType('Project', 'Initiative', '/vault/Project.md');

		expect(settingsStore.layout.railTypesLens).toEqual({ kind: 'type', target: 'Initiative' });
		expect(settingsStore.layout.railItem).toBe('types');
		settingsStore.reset();
	});

	it('moves a rail pin of the renamed type to the new name', async () => {
		settingsStore.reset();
		settingsStore.updateLayout({ railItem: 'type:Project' });
		vi.mocked(renameItem).mockResolvedValue('/vault/Initiative.md');

		await renameType('Project', 'Initiative', '/vault/Project.md');

		expect(settingsStore.layout.railItem).toBe('type:Initiative');
		settingsStore.reset();
	});

	it('leaves a rail pin of another type, and the pin when the definition rename fails, alone', async () => {
		settingsStore.reset();
		settingsStore.updateLayout({ railItem: 'type:Task' });
		vi.mocked(renameItem).mockResolvedValue('/vault/Initiative.md');
		await renameType('Project', 'Initiative', '/vault/Project.md');
		expect(settingsStore.layout.railItem).toBe('type:Task');

		settingsStore.updateLayout({ railItem: 'type:Project' });
		vi.mocked(renameItem).mockRejectedValue(new Error('"Initiative.md" already exists in this folder'));
		await renameType('Project', 'Initiative', '/vault/Project.md');
		expect(settingsStore.layout.railItem).toBe('type:Project');
		settingsStore.reset();
	});

	it('leaves a rail Types pick on another type, or on Untyped, alone', async () => {
		settingsStore.reset();
		vi.mocked(renameItem).mockResolvedValue('/vault/Initiative.md');
		settingsStore.updateLayout({ railTypesLens: { kind: 'type', target: 'Task' } });
		await renameType('Project', 'Initiative', '/vault/Project.md');
		expect(settingsStore.layout.railTypesLens).toEqual({ kind: 'type', target: 'Task' });

		settingsStore.updateLayout({ railTypesLens: { kind: 'untyped' } });
		await renameType('Project', 'Initiative', '/vault/Project.md');
		expect(settingsStore.layout.railTypesLens).toEqual({ kind: 'untyped' });
		settingsStore.reset();
	});

	it('keeps the rail Types pick when the definition rename fails', async () => {
		settingsStore.reset();
		settingsStore.updateLayout({ railTypesLens: { kind: 'type', target: 'Project' } });
		vi.mocked(renameItem).mockRejectedValue(new Error('"Initiative.md" already exists in this folder'));

		await renameType('Project', 'Initiative', '/vault/Project.md');

		expect(settingsStore.layout.railTypesLens).toEqual({ kind: 'type', target: 'Project' });
		settingsStore.reset();
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
		vi.mocked(renameItem).mockRejectedValue(new Error('"Initiative.md" already exists in this folder'));

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
		// (organized / archived / favorite / tags) with an empty one. The `.view`
		// writers go through the note-change owner, and the collection consumer
		// skips a `.view` upsert so that record is kept.
		collectionStore.updateRecord('/vault/test.view', {
			path: '/vault/test.view', name: 'test.view', basename: 'test', folder: '/vault',
			ext: '.view', mtime: 0, ctime: 0, size: 0,
			properties: new Map<string, unknown>([['archived', false], ['tags', []]]),
		});
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(PLAIN_VIEW);
		vi.mocked(refreshViewDefinition).mockResolvedValue(parseCollectionYaml(PLAIN_VIEW));

		await updateViewToolbarKey('/vault/test.view', 'filters', "status == 'active'", canonicalToolbarValue('filters', undefined));

		expect(collectionStore.propertyIndex.get('/vault/test.view')?.properties.get('archived')).toBe(false);
	});
});

describe('.view writes through the note-change owner', () => {
	let unregister: (() => void)[] = [];

	/** The `invoke` calls made for one Tauri command. */
	function invokesOf(cmd: string): unknown[][] {
		return vi.mocked(invoke).mock.calls.filter(([c]) => c === cmd);
	}

	/** The content the last `writeTextFile` call put on disk. */
	function lastWritten(): string {
		const calls = vi.mocked(writeTextFile).mock.calls;
		return calls[calls.length - 1][1] as string;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		resetHooks();
		collectionStore.reset();
		fileIconsStore.reset();
		vi.mocked(invoke).mockResolvedValue(undefined as never);
		vi.mocked(exists).mockResolvedValue(true);
		unregister = [registerCollectionNoteChangeConsumer(), registerFileIconsNoteChangeConsumer()];
	});

	afterEach(() => {
		for (const fn of unregister) fn();
		unregister = [];
		resetHooks();
		collectionStore.reset();
		fileIconsStore.reset();
	});

	it('updateViewToolbarKey indexes the written content in Rust only and marks a recent save', async () => {
		vi.mocked(readTextFile).mockResolvedValue(PLAIN_VIEW);
		vi.mocked(refreshViewDefinition).mockResolvedValue(parseCollectionYaml(PLAIN_VIEW));

		await updateViewToolbarKey('/vault/Projects.view', 'filters', "status == 'active'", canonicalToolbarValue('filters', undefined));

		expect(lastWritten()).toContain("status == 'active'");
		expect(invokesOf('update_note_in_index')).toEqual([
			['update_note_in_index', { path: '/vault/Projects.view', content: lastWritten() }],
		]);
		expect(invokesOf('update_search_index_file')).toEqual([]);
		expect(invokesOf('update_semantic_file')).toEqual([]);
		expect(areAllRecentSaves(['/vault/Projects.view'])).toBe(true);
	});

	it('updateViewToolbarKey with no change marks no recent save', async () => {
		vi.mocked(readTextFile).mockResolvedValue(PLAIN_VIEW);
		vi.mocked(refreshViewDefinition).mockResolvedValue(parseCollectionYaml(PLAIN_VIEW));

		await updateViewToolbarKey('/vault/Projects.view', 'sort', [], canonicalToolbarValue('sort', []));

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(invokesOf('update_note_in_index')).toEqual([]);
		expect(areAllRecentSaves(['/vault/Projects.view'])).toBe(false);
	});

	it('updateViewIcon indexes the written content, marks a recent save and sets the row icon', async () => {
		const { updateViewIcon } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue('_sidebar_label: Projects\nviews:\n  - type: table\n');

		await updateViewIcon('/vault/Projects.view', 'lucide:rocket', 'red', 'blue');

		expect(invokesOf('update_note_in_index')).toEqual([
			['update_note_in_index', { path: '/vault/Projects.view', content: lastWritten() }],
		]);
		expect(invokesOf('update_search_index_file')).toEqual([]);
		expect(invokesOf('update_semantic_file')).toEqual([]);
		expect(areAllRecentSaves(['/vault/Projects.view'])).toBe(true);
		expect(fileIconsStore.getFrontmatterIcon('/vault/Projects.view')).toEqual({
			iconPack: 'lucide', iconName: 'rocket', color: 'red', titleColor: 'blue',
		});
	});

	it('removeViewIcon indexes the written content, marks a recent save and clears the row icon', async () => {
		const { updateViewIcon, removeViewIcon } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue('_sidebar_label: Projects\n');
		await updateViewIcon('/vault/Projects.view', 'lucide:rocket', 'red', 'blue');
		expect(fileIconsStore.getFrontmatterIcon('/vault/Projects.view')).toBeDefined();
		vi.mocked(readTextFile).mockResolvedValue(lastWritten());
		resetHooks();
		vi.mocked(invoke).mockClear();

		await removeViewIcon('/vault/Projects.view');

		expect(invokesOf('update_note_in_index')).toEqual([
			['update_note_in_index', { path: '/vault/Projects.view', content: lastWritten() }],
		]);
		expect(invokesOf('update_search_index_file')).toEqual([]);
		expect(invokesOf('update_semantic_file')).toEqual([]);
		expect(areAllRecentSaves(['/vault/Projects.view'])).toBe(true);
		expect(fileIconsStore.getFrontmatterIcon('/vault/Projects.view')).toBeUndefined();
	});

	it('updateViewIconColors keeps an _icon the parser rejects, indexes the file and sets the row colors', async () => {
		const { updateViewIconColors } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue('_icon: mdi:home\n_sidebar_label: Projects\n');

		await updateViewIconColors('/vault/Projects.view', 'red', 'blue');

		expect(lastWritten()).toContain('_icon: mdi:home');
		expect(invokesOf('update_note_in_index')).toEqual([
			['update_note_in_index', { path: '/vault/Projects.view', content: lastWritten() }],
		]);
		expect(areAllRecentSaves(['/vault/Projects.view'])).toBe(true);
		expect(fileIconsStore.getFrontmatterIcon('/vault/Projects.view')).toEqual({ color: 'red', titleColor: 'blue' });
	});

	it('updateViewIconColors clears a text color held by its alias from the row', async () => {
		const { updateViewIconColors } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue('title_color: blue\n_sidebar_label: Projects\n');
		fileIconsStore.updateFrontmatterIcon('/vault/Projects.view', { titleColor: 'blue' });

		await updateViewIconColors('/vault/Projects.view', undefined, undefined);

		expect(lastWritten()).not.toContain('title_color');
		expect(fileIconsStore.getFrontmatterIcon('/vault/Projects.view')).toBeUndefined();
	});

	it('updateViewIconColors does not rewrite a file whose colors do not change, keeping its comments', async () => {
		const { updateViewIconColors } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue('# my view\n_icon: mdi:home\n_title_color: blue\n');

		await updateViewIconColors('/vault/Projects.view', undefined, 'blue');

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(invokesOf('update_note_in_index')).toEqual([]);
		expect(areAllRecentSaves(['/vault/Projects.view'])).toBe(false);
	});

	it('updateViewIconColors propagates a read error and writes nothing', async () => {
		const { updateViewIconColors } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockRejectedValue(new Error('EACCES'));

		await expect(updateViewIconColors('/vault/Projects.view', 'red')).rejects.toThrow('EACCES');
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it.each([
		['the same values', '# my view\n_icon: lucide:star\n_color: red\n', 'lucide:star', 'red', undefined],
		['the same values with a title color', '# my view\n_icon: lucide:star\n_color: red\n_title_color: blue\n', 'lucide:star', 'red', 'blue'],
		['a bare name of the same icon', '# my view\n_icon: star\n_color: red\n', 'lucide:star', 'red', undefined],
		['values held by the aliases', '# my view\nicon: lucide:star\ncolor: red\ntitle_color: blue\n', 'lucide:star', 'red', 'blue'],
		['an old Lucide spelling the picker hands back', '# my view\n_icon: lucide:trash2\n', 'lucide:trash2', undefined, undefined],
	])('updateViewIcon does not rewrite a file holding %s, keeping its comments', async (_label, content, icon, color, titleColor) => {
		const { updateViewIcon } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue(content);

		await updateViewIcon('/vault/Projects.view', icon, color, titleColor);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(invokesOf('update_note_in_index')).toEqual([]);
		expect(areAllRecentSaves(['/vault/Projects.view'])).toBe(false);
	});

	it.each([
		['a different color', '_icon: lucide:star\n_color: red\n', 'lucide:star', 'blue', undefined, { _icon: 'lucide:star', _color: 'blue' }],
		['a cleared color', '_icon: lucide:star\n_color: red\n', 'lucide:star', undefined, undefined, { _icon: 'lucide:star' }],
		['a different icon', '_icon: lucide:star\n_color: red\n', 'lucide:home', 'red', undefined, { _icon: 'lucide:home', _color: 'red' }],
		['another pack with the same name', '_icon: star\n', 'feather:star', undefined, undefined, { _icon: 'feather:star' }],
		['an icon the parser rejects', '_icon: mdi:home\n', 'lucide:star', undefined, undefined, { _icon: 'lucide:star' }],
		['another Lucide spelling, which is a different stored name', '_icon: lucide:trash2\n', 'lucide:trash-2', undefined, undefined, { _icon: 'lucide:trash-2' }],
	])('updateViewIcon writes %s', async (_label, content, icon, color, titleColor, expected) => {
		const { updateViewIcon } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue(content);

		await updateViewIcon('/vault/Projects.view', icon, color, titleColor);

		expect(parseYaml(lastWritten())).toEqual(expected);
		expect(invokesOf('update_note_in_index')).toEqual([
			['update_note_in_index', { path: '/vault/Projects.view', content: lastWritten() }],
		]);
	});

	it('updateViewIcon propagates a read error and writes nothing', async () => {
		const { updateViewIcon } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockRejectedValue(new Error('EACCES'));

		await expect(updateViewIcon('/vault/Projects.view', 'lucide:star')).rejects.toThrow('EACCES');
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('removeViewIcon removes an _icon the parser rejects, which resolves to nothing', async () => {
		const { removeViewIcon } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue('# my view\n_icon: mdi:home\n_sidebar_label: Projects\n');

		await removeViewIcon('/vault/Projects.view');

		expect(lastWritten().trim()).toBe('_sidebar_label: Projects');
	});

	it('removeViewIcon removes the keys and their aliases', async () => {
		const { removeViewIcon } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue('_icon: mdi:home\n_color: red\ntitle_color: blue\n_sidebar_label: Projects\n');

		await removeViewIcon('/vault/Projects.view');

		expect(lastWritten().trim()).toBe('_sidebar_label: Projects');
		expect(fileIconsStore.getFrontmatterIcon('/vault/Projects.view')).toBeUndefined();
	});

	it('setViewRailPin writes _rail: true through the owner, marks a recent save and asks for a prompt index refresh', async () => {
		const { setViewRailPin } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vaultStore._reset();
		vi.mocked(readTextFile).mockResolvedValue('_sidebar_label: Projects\nviews:\n  - type: table\n');

		await setViewRailPin('/vault/Projects.view', true);

		expect(parseYaml(lastWritten())).toEqual({ _sidebar_label: 'Projects', _rail: true, views: [{ type: 'table' }] });
		expect(invokesOf('update_note_in_index')).toEqual([
			['update_note_in_index', { path: '/vault/Projects.view', content: lastWritten() }],
		]);
		expect(invokesOf('update_search_index_file')).toEqual([]);
		expect(areAllRecentSaves(['/vault/Projects.view'])).toBe(true);
		expect(vaultStore.takePromptIndexRefresh()).toBe(true);
	});

	it('setViewRailPin with false deletes the key', async () => {
		const { setViewRailPin } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue('_sidebar_label: Projects\n_rail: true\n');

		await setViewRailPin('/vault/Projects.view', false);

		expect(parseYaml(lastWritten())).toEqual({ _sidebar_label: 'Projects' });
		expect(areAllRecentSaves(['/vault/Projects.view'])).toBe(true);
	});

	it('setViewRailPin writes nothing when the re-serialised file is unchanged', async () => {
		const { setViewRailPin } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue('_sidebar_label: Projects\n');
		await setViewRailPin('/vault/Projects.view', false);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(invokesOf('update_note_in_index')).toEqual([]);
	});

	it('setViewRailPin rejects a .view whose YAML does not parse and writes nothing', async () => {
		const { setViewRailPin } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue('views: [');

		await expect(setViewRailPin('/vault/Broken.view', true)).rejects.toThrow("The .view file's YAML does not parse");
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(invokesOf('update_note_in_index')).toEqual([]);
	});

	it('setViewRailPin propagates a read error and writes nothing', async () => {
		const { setViewRailPin } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockRejectedValue(new Error('EACCES'));

		await expect(setViewRailPin('/vault/Projects.view', true)).rejects.toThrow('EACCES');
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('updateViewListProperties writes _list_properties_display through the owner, marks a recent save and asks for a prompt index refresh', async () => {
		const { updateViewListProperties } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vaultStore._reset();
		vi.mocked(readTextFile).mockResolvedValue('_sidebar_label: Projects\nviews:\n  - type: table\n');

		await updateViewListProperties('/vault/Projects.view', ['budget', 'status']);

		expect(parseYaml(lastWritten())).toEqual({
			_sidebar_label: 'Projects',
			_list_properties_display: ['budget', 'status'],
			views: [{ type: 'table' }],
		});
		expect(invokesOf('update_note_in_index')).toEqual([
			['update_note_in_index', { path: '/vault/Projects.view', content: lastWritten() }],
		]);
		expect(areAllRecentSaves(['/vault/Projects.view'])).toBe(true);
		expect(vaultStore.takePromptIndexRefresh()).toBe(true);
	});

	it('updateViewListProperties with an empty list deletes the key', async () => {
		const { updateViewListProperties } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue('_sidebar_label: Projects\n_list_properties_display:\n  - budget\n');

		await updateViewListProperties('/vault/Projects.view', []);

		expect(parseYaml(lastWritten())).toEqual({ _sidebar_label: 'Projects' });
	});

	it('updateViewListProperties writes nothing when the list is unchanged', async () => {
		const { updateViewListProperties } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue('_sidebar_label: Projects\n_list_properties_display:\n  - budget\n');

		await updateViewListProperties('/vault/Projects.view', ['budget']);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(invokesOf('update_note_in_index')).toEqual([]);
	});

	it('updateViewListProperties rejects a .view whose YAML does not parse and writes nothing', async () => {
		const { updateViewListProperties } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockResolvedValue('views: [');

		await expect(updateViewListProperties('/vault/Broken.view', ['budget'])).rejects.toThrow("The .view file's YAML does not parse");
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('updateViewListProperties propagates a read error and writes nothing', async () => {
		const { updateViewListProperties } = await import('#lib/features/type-definitions/type-definitions.service.js');
		vi.mocked(readTextFile).mockRejectedValue(new Error('EACCES'));

		await expect(updateViewListProperties('/vault/Projects.view', ['budget'])).rejects.toThrow('EACCES');
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('updateViewIcon keeps the Rust-projected property record of the view', async () => {
		const { updateViewIcon } = await import('#lib/features/type-definitions/type-definitions.service.js');
		collectionStore.updateRecord('/vault/Projects.view', {
			path: '/vault/Projects.view', name: 'Projects.view', basename: 'Projects', folder: '/vault',
			ext: '.view', mtime: 0, ctime: 0, size: 0,
			properties: new Map<string, unknown>([['archived', true], ['tags', ['work']]]),
		});
		vi.mocked(readTextFile).mockResolvedValue('_sidebar_label: Projects\n');

		await updateViewIcon('/vault/Projects.view', 'lucide:rocket');

		const props = collectionStore.propertyIndex.get('/vault/Projects.view')?.properties;
		expect(props?.get('archived')).toBe(true);
		expect(props?.get('tags')).toEqual(['work']);
	});
});
