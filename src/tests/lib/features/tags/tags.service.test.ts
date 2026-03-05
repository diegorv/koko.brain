import { describe, it, expect, vi, beforeEach } from 'vitest';

import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { tagsStore } from '$lib/features/tags/tags.store.svelte';
import { buildTagIndex, updateTagIndexForFile, removeFileFromTagIndex, updateTagSort, resetTags } from '$lib/features/tags/tags.service';

describe('buildTagIndex', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetTags();
		noteIndexStore.reset();
	});

	it('builds tag tree from indexed note contents', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', 'Text with #javascript and #svelte tags'],
			['/vault/b.md', 'Another note with #javascript'],
		]));

		buildTagIndex();

		expect(tagsStore.tagTree.length).toBeGreaterThan(0);
		const tagNames = tagsStore.tagTree.map(t => t.segment);
		expect(tagNames).toContain('javascript');
		expect(tagNames).toContain('svelte');
	});

	it('counts total unique tags', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '#alpha #beta'],
			['/vault/b.md', '#alpha #gamma'],
		]));

		buildTagIndex();

		expect(tagsStore.totalTagCount).toBe(3);
	});

	it('sets loading state during build', () => {
		noteIndexStore.setNoteContents(new Map());

		buildTagIndex();

		expect(tagsStore.isLoading).toBe(false);
	});

	it('handles empty vault with no notes', () => {
		noteIndexStore.setNoteContents(new Map());

		buildTagIndex();

		expect(tagsStore.tagTree).toEqual([]);
		expect(tagsStore.totalTagCount).toBe(0);
	});

	it('handles notes with no tags', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', 'No tags here'],
		]));

		buildTagIndex();

		expect(tagsStore.tagTree).toEqual([]);
		expect(tagsStore.totalTagCount).toBe(0);
	});
});

describe('updateTagIndexForFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetTags();
		noteIndexStore.reset();
	});

	it('incrementally adds new tags for a file', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '#existing'],
		]));
		buildTagIndex();
		expect(tagsStore.totalTagCount).toBe(1);

		updateTagIndexForFile('/vault/a.md', '#existing #newtag');

		expect(tagsStore.totalTagCount).toBe(2);
		const tagNames = tagsStore.tagTree.map(t => t.segment);
		expect(tagNames).toContain('newtag');
	});

	it('skips update when tags have not changed', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '#stable'],
		]));
		buildTagIndex();
		const treeBefore = tagsStore.tagTree;

		updateTagIndexForFile('/vault/a.md', '#stable');

		expect(tagsStore.tagTree).toEqual(treeBefore);
	});

	it('removes tags when file content changes', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '#alpha #beta'],
		]));
		buildTagIndex();
		expect(tagsStore.totalTagCount).toBe(2);

		updateTagIndexForFile('/vault/a.md', '#alpha');

		expect(tagsStore.totalTagCount).toBe(1);
		const tagNames = tagsStore.tagTree.map(t => t.segment);
		expect(tagNames).toContain('alpha');
		expect(tagNames).not.toContain('beta');
	});
});

describe('removeFileFromTagIndex', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetTags();
		noteIndexStore.reset();
	});

	it('removes a file\'s tags from the index', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '#alpha #beta'],
			['/vault/b.md', '#alpha #gamma'],
		]));
		buildTagIndex();
		expect(tagsStore.totalTagCount).toBe(3);

		removeFileFromTagIndex('/vault/a.md');

		expect(tagsStore.totalTagCount).toBe(2);
		const tagNames = tagsStore.tagTree.map(t => t.segment);
		expect(tagNames).toContain('alpha'); // still in b.md
		expect(tagNames).toContain('gamma');
		expect(tagNames).not.toContain('beta'); // only in a.md
	});

	it('removes tag entirely when only file using it is deleted', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '#unique-tag'],
			['/vault/b.md', '#other'],
		]));
		buildTagIndex();
		expect(tagsStore.totalTagCount).toBe(2);

		removeFileFromTagIndex('/vault/a.md');

		expect(tagsStore.totalTagCount).toBe(1);
		const tagNames = tagsStore.tagTree.map(t => t.segment);
		expect(tagNames).not.toContain('unique-tag');
	});

	it('is a no-op for files not in the index', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '#tag'],
		]));
		buildTagIndex();
		const treeBefore = tagsStore.tagTree;

		removeFileFromTagIndex('/vault/nonexistent.md');

		expect(tagsStore.tagTree).toEqual(treeBefore);
	});
});

describe('updateTagSort', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetTags();
		noteIndexStore.reset();
	});

	it('changes sort mode and rebuilds tree', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '#alpha'],
			['/vault/b.md', '#beta #alpha'],
		]));
		buildTagIndex();

		updateTagSort('count');

		expect(tagsStore.sortMode).toBe('count');
		// alpha appears in 2 files, beta in 1 — count sort puts alpha first
		expect(tagsStore.tagTree[0].segment).toBe('alpha');
	});
});

describe('resetTags', () => {
	it('clears all tag state', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '#tag'],
		]));
		buildTagIndex();
		expect(tagsStore.tagTree.length).toBeGreaterThan(0);

		resetTags();

		expect(tagsStore.tagTree).toEqual([]);
		expect(tagsStore.totalTagCount).toBe(0);
		expect(tagsStore.sortMode).toBe('count');
	});
});
