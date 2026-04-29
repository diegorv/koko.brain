import { describe, it, expect, beforeEach } from 'vitest';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';

describe('backlinksStore', () => {
	beforeEach(() => {
		backlinksStore.reset();
	});

	it('starts with empty state', () => {
		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedDirty).toBe(false);
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

	it('markUnlinkedDirty sets the dirty flag', () => {
		expect(backlinksStore.unlinkedDirty).toBe(false);
		backlinksStore.markUnlinkedDirty();
		expect(backlinksStore.unlinkedDirty).toBe(true);
	});

	it('setUnlinkedMentions clears the dirty flag', () => {
		backlinksStore.markUnlinkedDirty();
		expect(backlinksStore.unlinkedDirty).toBe(true);

		backlinksStore.setUnlinkedMentions([]);
		expect(backlinksStore.unlinkedDirty).toBe(false);
	});

	it('reset clears backlinks state including dirty flag', () => {
		backlinksStore.setLinkedMentions([{}] as any);
		backlinksStore.markUnlinkedDirty();

		backlinksStore.reset();

		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedDirty).toBe(false);
	});
});
