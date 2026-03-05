import { describe, it, expect, beforeEach } from 'vitest';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';

describe('backlinksStore', () => {
	beforeEach(() => {
		backlinksStore.reset();
	});

	it('starts with empty state', () => {
		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedMentions).toEqual([]);
	});

	it('setLinkedMentions updates linked mentions', () => {
		const mentions = [{ filePath: '/a.md' }] as any;
		backlinksStore.setLinkedMentions(mentions);
		expect(backlinksStore.linkedMentions).toBe(mentions);
	});

	it('setUnlinkedMentions updates unlinked mentions', () => {
		const mentions = [{ filePath: '/a.md' }] as any;
		backlinksStore.setUnlinkedMentions(mentions);
		expect(backlinksStore.unlinkedMentions).toBe(mentions);
	});

	it('reset clears backlinks state and resets noteIndexStore', () => {
		backlinksStore.setLinkedMentions([{}] as any);
		noteIndexStore.setLoading(true);
		noteIndexStore.setNoteContents(new Map([['a', 'b']]));

		backlinksStore.reset();

		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedMentions).toEqual([]);
		expect(noteIndexStore.isLoading).toBe(false);
		expect(noteIndexStore.noteIndex.size).toBe(0);
		expect(noteIndexStore.noteContents.size).toBe(0);
	});
});
