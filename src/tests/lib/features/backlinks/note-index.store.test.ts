import { describe, it, expect, beforeEach } from 'vitest';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';

describe('noteIndexStore', () => {
	beforeEach(() => {
		noteIndexStore.reset();
	});

	it('starts with empty state', () => {
		expect(noteIndexStore.noteIndex.size).toBe(0);
		expect(noteIndexStore.noteContents.size).toBe(0);
		expect(noteIndexStore.isLoading).toBe(false);
	});

	it('setNoteIndex updates the index', () => {
		const index = new Map([['key', [{ target: 'a' }]]]) as any;
		noteIndexStore.setNoteIndex(index);
		expect(noteIndexStore.noteIndex).toBe(index);
	});

	it('setNoteContents updates contents map', () => {
		const contents = new Map([['key', 'content']]);
		noteIndexStore.setNoteContents(contents);
		expect(noteIndexStore.noteContents).toBe(contents);
	});

	it('setLoading updates loading state', () => {
		noteIndexStore.setLoading(true);
		expect(noteIndexStore.isLoading).toBe(true);
	});

	it('updateNoteEntry updates both noteContents and noteIndex atomically', () => {
		const initialIndex = new Map([['existing.md', [{ target: 'a', alias: null, heading: null, position: 0 }]]]) as any;
		const initialContents = new Map([['existing.md', 'old content']]);
		noteIndexStore.setNoteIndex(initialIndex);
		noteIndexStore.setNoteContents(initialContents);

		const newLinks = [{ target: 'b', alias: null, heading: null, position: 5 }] as any;
		noteIndexStore.updateNoteEntry('new.md', 'new content', newLinks);

		expect(noteIndexStore.noteContents.get('new.md')).toBe('new content');
		expect(noteIndexStore.noteIndex.get('new.md')).toBe(newLinks);
		expect(noteIndexStore.noteContents.get('existing.md')).toBe('old content');
		expect(noteIndexStore.noteIndex.get('existing.md')).toEqual([{ target: 'a', alias: null, heading: null, position: 0 }]);
	});

	it('updateNoteEntry replaces existing entry for same path', () => {
		noteIndexStore.updateNoteEntry('note.md', 'v1', [{ target: 'a', alias: null, heading: null, position: 0 }] as any);
		noteIndexStore.updateNoteEntry('note.md', 'v2', [{ target: 'b', alias: null, heading: null, position: 0 }] as any);

		expect(noteIndexStore.noteContents.get('note.md')).toBe('v2');
		expect(noteIndexStore.noteIndex.get('note.md')?.[0].target).toBe('b');
		expect(noteIndexStore.noteContents.size).toBe(1);
	});

	it('updateNoteEntry preserves Map reference (in-place mutation)', () => {
		noteIndexStore.updateNoteEntry('a.md', 'content a', []);
		const contentsBefore = noteIndexStore.noteContents;
		const indexBefore = noteIndexStore.noteIndex;

		noteIndexStore.updateNoteEntry('b.md', 'content b', []);

		expect(noteIndexStore.noteContents).toBe(contentsBefore);
		expect(noteIndexStore.noteIndex).toBe(indexBefore);
		expect(noteIndexStore.noteContents.size).toBe(2);
	});

	it('reset clears all state', () => {
		noteIndexStore.setLoading(true);
		noteIndexStore.setNoteContents(new Map([['a', 'b']]));
		noteIndexStore.setNoteIndex(new Map([['a', []]]) as any);

		noteIndexStore.reset();

		expect(noteIndexStore.noteIndex.size).toBe(0);
		expect(noteIndexStore.noteContents.size).toBe(0);
		expect(noteIndexStore.isLoading).toBe(false);
	});
});
