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
	renameItem: vi.fn(),
}));

vi.mock('$lib/utils/log.service', () => ({
	appendLog: vi.fn(),
}));

vi.mock('$lib/features/collection/yaml-parser', () => ({
	updateCollectionYaml: vi.fn(),
}));

vi.mock('$lib/features/type-definitions/view-parse-cache', () => ({
	refreshViewDefinition: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

import { readDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';
import { openFileInEditor, syncExternalContentToEditor } from '$lib/core/editor/editor.service';
import { createFile, renameItem } from '$lib/core/filesystem/fs.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import { createNoteOfType, createTypeDefinition, refreshTypeDefinitions, renameType, toggleFavoriteForPath } from '$lib/features/type-definitions/type-definitions.service';
import type { TypeMetadata } from '$lib/features/type-definitions/type-definitions.logic';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

function makeMeta(overrides: Partial<TypeMetadata> & { name: string }): TypeMetadata {
	return {
		path: null,
		icon: 'file',
		color: 'blue',
		order: 50,
		sidebarLabel: overrides.name + 's',
		template: null,
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
			'---\n_type: Type\n_visible: true\n---\n\n# Sprint\n',
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

	it('selects the new type in the sidebar instead of opening it when select is set', async () => {
		vaultStore.open('/vault');
		typeDefinitionsStore.reset();
		vi.mocked(createFile).mockResolvedValue('/vault/Sprint.md');

		await createTypeDefinition('Sprint', { select: true });

		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/Sprint.md',
			'---\n_type: Type\n_visible: true\n---\n\n# Sprint\n',
		);
		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(typeDefinitionsStore.selectedTypeOrNav).toEqual({ kind: 'type', name: 'Sprint' });
	});

	it('re-indexes the definition after writing its frontmatter so the sidebar updates without a reload', async () => {
		vaultStore.open('/vault');
		typeDefinitionsStore.reset();
		vi.mocked(createFile).mockResolvedValue('/vault/Sprint.md');

		await createTypeDefinition('Sprint', { select: true });

		// createFile's Rust create_note indexes an EMPTY file (content is written
		// afterwards via writeTextFile, with the watcher suppressed by the
		// recent-save guard) — without this explicit re-index the new type only
		// appears after a full vault rescan. The Rust command REQUIRES content;
		// passing only path rejects with "missing required key content".
		expect(invoke).toHaveBeenCalledWith('update_note_in_index', {
			path: '/vault/Sprint.md',
			content: '---\n_type: Type\n_visible: true\n---\n\n# Sprint\n',
		});
		expect(typeDefinitionsStore.selectedTypeOrNav).toEqual({ kind: 'type', name: 'Sprint' });
	});

	it('does not change the selection when createFile fails and select is set', async () => {
		vaultStore.open('/vault');
		typeDefinitionsStore.reset();
		vi.mocked(createFile).mockResolvedValue(null);

		await createTypeDefinition('Sprint', { select: true });

		expect(typeDefinitionsStore.selectedTypeOrNav).toBeNull();
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

describe('updateViewIcon', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('writes updated YAML with icon, color, and titleColor', async () => {
		const { updateViewIcon } = await import('$lib/features/type-definitions/type-definitions.service');
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
		const { removeViewIcon } = await import('$lib/features/type-definitions/type-definitions.service');
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
		const { createView } = await import('$lib/features/type-definitions/type-definitions.service');
		vaultStore._reset();
		await createView();
		expect(createFile).not.toHaveBeenCalled();
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(typeDefinitionsStore.selectedTypeOrNav).toBeNull();
	});

	it('aborts when createFile returns null', async () => {
		const { createView } = await import('$lib/features/type-definitions/type-definitions.service');
		vaultStore.open('/vault');
		vi.mocked(createFile).mockResolvedValue(null);

		await createView();

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(typeDefinitionsStore.selectedTypeOrNav).toBeNull();
	});

	it('writes a minimal .view body and selects the new view in the sidebar', async () => {
		const { createView } = await import('$lib/features/type-definitions/type-definitions.service');
		vaultStore.open('/vault');
		vi.mocked(createFile).mockResolvedValue('/vault/Untitled.view');

		await createView();

		expect(createFile).toHaveBeenCalledWith('/vault', 'Untitled.view');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/Untitled.view', expect.stringContaining('_sidebar_label: Untitled'));
		const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
		expect(written).toContain('views:');
		expect(written).toContain('  - type: table');
		expect(written).toContain('    name: Untitled');
		expect(written).not.toContain('filters:');
		expect(typeDefinitionsStore.selectedTypeOrNav).toEqual({ kind: 'view', path: '/vault/Untitled.view' });
	});

	it('uses the deduplicated filename returned by createFile as the title', async () => {
		const { createView } = await import('$lib/features/type-definitions/type-definitions.service');
		vaultStore.open('/vault');
		vi.mocked(createFile).mockResolvedValue('/vault/Untitled 2.view');

		await createView();

		const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
		expect(written).toContain('_sidebar_label: Untitled 2');
		expect(written).toContain('name: Untitled 2');
	});
});

describe('updateViewQuery', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('writes the patched YAML and refreshes the parse cache', async () => {
		const { updateViewQuery } = await import('$lib/features/type-definitions/type-definitions.service');
		const { updateCollectionYaml } = await import('$lib/features/collection/yaml-parser');
		const { refreshViewDefinition } = await import('$lib/features/type-definitions/view-parse-cache');

		vi.mocked(readTextFile).mockResolvedValue('original yaml\n');
		vi.mocked(updateCollectionYaml).mockReturnValue('patched yaml\n');

		await updateViewQuery('/vault/test.view', { filters: "status == 'active'" });

		expect(updateCollectionYaml).toHaveBeenCalledWith('original yaml\n', { filters: "status == 'active'" });
		expect(writeTextFile).toHaveBeenCalledWith('/vault/test.view', 'patched yaml\n');
		expect(refreshViewDefinition).toHaveBeenCalledWith('/vault/test.view');
	});

	it('skips write and cache refresh when patch produces no change', async () => {
		const { updateViewQuery } = await import('$lib/features/type-definitions/type-definitions.service');
		const { updateCollectionYaml } = await import('$lib/features/collection/yaml-parser');
		const { refreshViewDefinition } = await import('$lib/features/type-definitions/view-parse-cache');

		vi.mocked(readTextFile).mockResolvedValue('unchanged yaml\n');
		vi.mocked(updateCollectionYaml).mockReturnValue('unchanged yaml\n');

		await updateViewQuery('/vault/test.view', { viewSort: [] });

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(refreshViewDefinition).not.toHaveBeenCalled();
	});

	it('forwards view-level sort and filter updates verbatim', async () => {
		const { updateViewQuery } = await import('$lib/features/type-definitions/type-definitions.service');
		const { updateCollectionYaml } = await import('$lib/features/collection/yaml-parser');

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
