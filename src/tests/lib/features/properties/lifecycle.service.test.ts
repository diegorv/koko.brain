import { describe, it, expect, vi, beforeEach } from 'vitest';

// syncExternalContentToEditor is a side-effect service (writes into the
// CodeMirror view + bumps editor signals); per docs/TESTING.md it is the
// only mock here. Stores and .logic.ts modules are real.
vi.mock('$lib/core/editor/editor.service', () => ({
	syncExternalContentToEditor: vi.fn(),
}));

import { syncExternalContentToEditor } from '$lib/core/editor/editor.service';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { propertiesStore } from '$lib/features/properties/properties.store.svelte';
import {
	setOrganized,
	setArchived,
	setFavorite,
} from '$lib/features/properties/lifecycle.service';
import { getLifecycleState, isFavorite } from '$lib/features/properties/lifecycle.logic';
import type { Property } from '$lib/features/properties/properties.types';

function prop(key: string, value: Property['value'], type: Property['type'] = 'text'): Property {
	return { key, value, type };
}

function openTab(path: string, content: string): void {
	editorStore.addTab({ path, name: path.split('/').pop() ?? path, content, savedContent: content });
}

describe('setOrganized', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		propertiesStore.reset();
	});

	it('sets _organized: true in the store and syncs the rebuilt content to the editor', () => {
		propertiesStore.setProperties([prop('title', 'Note')]);
		openTab('/vault/note.md', '---\ntitle: Note\n---\nBody text');

		setOrganized(true);

		// Real store state: flag added with boolean type.
		const organized = propertiesStore.properties.find((p) => p.key === '_organized');
		expect(organized).toEqual({ key: '_organized', value: true, type: 'boolean' });
		expect(getLifecycleState(propertiesStore.properties)).toBe('organized');

		// Rebuilt content carries the new frontmatter and the original body.
		expect(syncExternalContentToEditor).toHaveBeenCalledWith(
			'/vault/note.md',
			'---\ntitle: Note\n_organized: true\n---\nBody text',
			false,
			'frontmatter',
		);
	});

	it('removes the _archived flag when marking organized', () => {
		propertiesStore.setProperties([
			prop('_archived', true, 'boolean'),
			prop('title', 'Note'),
		]);
		openTab('/vault/note.md', '---\n_archived: true\ntitle: Note\n---\nBody');

		setOrganized(true);

		expect(propertiesStore.properties.find((p) => p.key === '_archived')).toBeUndefined();
		expect(getLifecycleState(propertiesStore.properties)).toBe('organized');
	});

	it('sets _organized: false (back to inbox) without removing other flags', () => {
		propertiesStore.setProperties([prop('_organized', true, 'boolean')]);
		openTab('/vault/note.md', '---\n_organized: true\n---\nBody');

		setOrganized(false);

		const organized = propertiesStore.properties.find((p) => p.key === '_organized');
		expect(organized?.value).toBe(false);
		expect(getLifecycleState(propertiesStore.properties)).toBe('inbox');
	});

	it('updates the store but does not sync when no tab is active', () => {
		propertiesStore.setProperties([]);

		setOrganized(true);

		expect(propertiesStore.properties).toEqual([
			{ key: '_organized', value: true, type: 'boolean' },
		]);
		expect(syncExternalContentToEditor).not.toHaveBeenCalled();
	});
});

describe('setArchived', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		propertiesStore.reset();
	});

	it('sets _archived: true and the lifecycle state becomes archived', () => {
		propertiesStore.setProperties([prop('_organized', true, 'boolean')]);
		openTab('/vault/note.md', '---\n_organized: true\n---\nBody');

		setArchived(true);

		const archived = propertiesStore.properties.find((p) => p.key === '_archived');
		expect(archived).toEqual({ key: '_archived', value: true, type: 'boolean' });
		// Archiving leaves _organized as-is.
		expect(propertiesStore.properties.find((p) => p.key === '_organized')?.value).toBe(true);
		expect(getLifecycleState(propertiesStore.properties)).toBe('archived');
		expect(syncExternalContentToEditor).toHaveBeenCalledWith(
			'/vault/note.md',
			'---\n_organized: true\n_archived: true\n---\nBody',
			false,
			'frontmatter',
		);
	});

	it('unarchives back to the previous organized state', () => {
		propertiesStore.setProperties([
			prop('_organized', true, 'boolean'),
			prop('_archived', true, 'boolean'),
		]);
		openTab('/vault/note.md', '---\n_organized: true\n_archived: true\n---\nBody');

		setArchived(false);

		expect(propertiesStore.properties.find((p) => p.key === '_archived')?.value).toBe(false);
		expect(getLifecycleState(propertiesStore.properties)).toBe('organized');
	});

	it('works with empty starting properties', () => {
		propertiesStore.setProperties([]);
		openTab('/vault/note.md', 'Body without frontmatter');

		setArchived(true);

		expect(propertiesStore.properties).toEqual([
			{ key: '_archived', value: true, type: 'boolean' },
		]);
		// Frontmatter block is created around the existing body.
		expect(syncExternalContentToEditor).toHaveBeenCalledWith(
			'/vault/note.md',
			'---\n_archived: true\n---\nBody without frontmatter',
			false,
			'frontmatter',
		);
	});
});

describe('setFavorite', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		propertiesStore.reset();
	});

	it('sets _favorite: true and isFavorite reflects it', () => {
		propertiesStore.setProperties([prop('title', 'Note')]);
		openTab('/vault/note.md', '---\ntitle: Note\n---\nBody');

		setFavorite(true);

		expect(isFavorite(propertiesStore.properties)).toBe(true);
		expect(syncExternalContentToEditor).toHaveBeenCalledWith(
			'/vault/note.md',
			'---\ntitle: Note\n_favorite: true\n---\nBody',
			false,
			'frontmatter',
		);
	});

	it('unfavorites by flipping the existing flag to false', () => {
		propertiesStore.setProperties([prop('_favorite', true, 'boolean')]);
		openTab('/vault/note.md', '---\n_favorite: true\n---\nBody');

		setFavorite(false);

		expect(isFavorite(propertiesStore.properties)).toBe(false);
		expect(propertiesStore.properties.find((p) => p.key === '_favorite')?.value).toBe(false);
	});

	it('does not sync when no tab is active but still updates the store', () => {
		propertiesStore.setProperties([]);

		setFavorite(true);

		expect(isFavorite(propertiesStore.properties)).toBe(true);
		expect(syncExternalContentToEditor).not.toHaveBeenCalled();
	});
});
