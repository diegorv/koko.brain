import { describe, it, expect, beforeEach } from 'vitest';
import { bookmarksStore } from '$lib/features/bookmarks/bookmarks.store.svelte';

describe('bookmarksStore', () => {
	beforeEach(() => {
		bookmarksStore.reset();
	});

	it('starts with empty bookmarks', () => {
		expect(bookmarksStore.bookmarks).toEqual([]);
	});

	describe('setBookmarks', () => {
		it('replaces the bookmarks list', () => {
			const bookmarks = [
				{ path: '/vault/a.md', type: 'file' as const },
				{ path: '/vault/b.md', type: 'file' as const },
			];
			bookmarksStore.setBookmarks(bookmarks as any);
			expect(bookmarksStore.bookmarks).toBe(bookmarks);
		});
	});

	describe('bookmarks lookup', () => {
		it('bookmarks are accessible after set', () => {
			bookmarksStore.setBookmarks([
				{ path: '/vault/a.md', type: 'file' },
				{ path: '/vault/b.md', type: 'file' },
			] as any);
			expect(bookmarksStore.bookmarks).toHaveLength(2);
			expect(bookmarksStore.bookmarks[0].path).toBe('/vault/a.md');
		});
	});

	describe('isBookmarked', () => {
		it('returns true for bookmarked paths', () => {
			bookmarksStore.setBookmarks([
				{ path: '/vault/a.md', type: 'file' },
			] as any);

			expect(bookmarksStore.isBookmarked('/vault/a.md')).toBe(true);
		});

		it('returns false for non-bookmarked paths', () => {
			bookmarksStore.setBookmarks([
				{ path: '/vault/a.md', type: 'file' },
			] as any);

			expect(bookmarksStore.isBookmarked('/vault/b.md')).toBe(false);
		});

		it('returns false when no bookmarks exist', () => {
			expect(bookmarksStore.isBookmarked('/vault/a.md')).toBe(false);
		});
	});

	describe('reset', () => {
		it('clears all bookmarks', () => {
			bookmarksStore.setBookmarks([{ path: '/a' }] as any);
			bookmarksStore.reset();
			expect(bookmarksStore.bookmarks).toEqual([]);
		});

		it('clears derived state too', () => {
			bookmarksStore.setBookmarks([{ path: '/a.md', type: 'file' }] as any);
			bookmarksStore.reset();
			expect(bookmarksStore.isBookmarked('/a.md')).toBe(false);
		});
	});
});
