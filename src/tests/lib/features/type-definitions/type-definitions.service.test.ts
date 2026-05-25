import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readDir: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/core/note-creator/note-creator.service', () => ({
	openOrCreateNote: vi.fn(),
}));

vi.mock('$lib/utils/log.service', () => ({
	appendLog: vi.fn(),
}));

import { readDir } from '@tauri-apps/plugin-fs';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import { createNoteOfType } from '$lib/features/type-definitions/type-definitions.service';
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
