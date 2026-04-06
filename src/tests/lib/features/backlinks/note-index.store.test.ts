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

	it('starts with empty reverse index', () => {
		expect(noteIndexStore.reverseIndex.size).toBe(0);
	});

	it('setNoteIndex builds reverse index from links', () => {
		// note-b links to note-a via [[note-a]]
		const contents = new Map([
			['note-a.md', 'Hello'],
			['note-b.md', 'See [[note-a]]'],
		]);
		noteIndexStore.setNoteContents(contents);

		const index = new Map([
			['note-a.md', []],
			['note-b.md', [{ target: 'note-a', alias: null, heading: null, position: 4 }]],
		]) as any;
		noteIndexStore.setNoteIndex(index);

		const sources = noteIndexStore.reverseIndex.get('note-a.md');
		expect(sources).toBeDefined();
		expect(sources!.has('note-b.md')).toBe(true);
	});

	it('updateNoteEntry incrementally updates reverse index', () => {
		const contents = new Map([
			['note-a.md', 'Hello'],
			['note-b.md', 'No links'],
		]);
		noteIndexStore.setNoteContents(contents);
		noteIndexStore.setNoteIndex(new Map([
			['note-a.md', []],
			['note-b.md', []],
		]) as any);

		expect(noteIndexStore.reverseIndex.size).toBe(0);

		// Now update note-b to link to note-a
		noteIndexStore.updateNoteEntry(
			'note-b.md',
			'See [[note-a]]',
			[{ target: 'note-a', alias: null, heading: null, position: 4 }] as any,
		);

		const sources = noteIndexStore.reverseIndex.get('note-a.md');
		expect(sources).toBeDefined();
		expect(sources!.has('note-b.md')).toBe(true);
	});

	it('updateNoteEntry removes old reverse entries when links change', () => {
		const contents = new Map([
			['note-a.md', 'Hello'],
			['note-b.md', 'See [[note-a]]'],
			['note-c.md', 'Other'],
		]);
		noteIndexStore.setNoteContents(contents);
		noteIndexStore.setNoteIndex(new Map([
			['note-a.md', []],
			['note-b.md', [{ target: 'note-a', alias: null, heading: null, position: 4 }]],
			['note-c.md', []],
		]) as any);

		expect(noteIndexStore.reverseIndex.get('note-a.md')?.has('note-b.md')).toBe(true);

		// Update note-b to link to note-c instead
		noteIndexStore.updateNoteEntry(
			'note-b.md',
			'See [[note-c]]',
			[{ target: 'note-c', alias: null, heading: null, position: 4 }] as any,
		);

		// note-a should no longer have note-b as a source
		const sourcesA = noteIndexStore.reverseIndex.get('note-a.md');
		expect(sourcesA === undefined || sourcesA.size === 0).toBe(true);

		// note-c should now have note-b as a source
		const sourcesC = noteIndexStore.reverseIndex.get('note-c.md');
		expect(sourcesC).toBeDefined();
		expect(sourcesC!.has('note-b.md')).toBe(true);
	});

	it('reset clears reverse index', () => {
		const contents = new Map([
			['note-a.md', 'Hello'],
			['note-b.md', 'See [[note-a]]'],
		]);
		noteIndexStore.setNoteContents(contents);
		noteIndexStore.setNoteIndex(new Map([
			['note-a.md', []],
			['note-b.md', [{ target: 'note-a', alias: null, heading: null, position: 4 }]],
		]) as any);

		noteIndexStore.reset();
		expect(noteIndexStore.reverseIndex.size).toBe(0);
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
