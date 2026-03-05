import { describe, it, expect, beforeEach } from 'vitest';
import {
	saveTabViewState,
	getTabViewState,
	deleteTabViewState,
	clearAllTabViewStates,
} from '$lib/core/markdown-editor/tab-view-state';

describe('tab-view-state', () => {
	beforeEach(() => {
		clearAllTabViewStates();
	});

	describe('saveTabViewState + getTabViewState', () => {
		it('saves and retrieves a view state', () => {
			saveTabViewState('/vault/note.md', { scrollTop: 100, scrollLeft: 0, cursorPos: 42 });
			const state = getTabViewState('/vault/note.md');
			expect(state).toEqual({ scrollTop: 100, scrollLeft: 0, cursorPos: 42 });
		});

		it('overwrites previous state on re-save', () => {
			saveTabViewState('/vault/note.md', { scrollTop: 100, scrollLeft: 0, cursorPos: 42 });
			saveTabViewState('/vault/note.md', { scrollTop: 200, scrollLeft: 10, cursorPos: 99 });
			expect(getTabViewState('/vault/note.md')).toEqual({ scrollTop: 200, scrollLeft: 10, cursorPos: 99 });
		});

		it('stores independent state per path', () => {
			saveTabViewState('/vault/a.md', { scrollTop: 10, scrollLeft: 0, cursorPos: 5 });
			saveTabViewState('/vault/b.md', { scrollTop: 20, scrollLeft: 0, cursorPos: 15 });
			expect(getTabViewState('/vault/a.md')?.cursorPos).toBe(5);
			expect(getTabViewState('/vault/b.md')?.cursorPos).toBe(15);
		});
	});

	describe('getTabViewState', () => {
		it('returns undefined for unknown path', () => {
			expect(getTabViewState('/vault/unknown.md')).toBeUndefined();
		});
	});

	describe('deleteTabViewState', () => {
		it('removes saved state for a path', () => {
			saveTabViewState('/vault/note.md', { scrollTop: 100, scrollLeft: 0, cursorPos: 42 });
			deleteTabViewState('/vault/note.md');
			expect(getTabViewState('/vault/note.md')).toBeUndefined();
		});

		it('does not throw for unknown path', () => {
			expect(() => deleteTabViewState('/vault/nonexistent.md')).not.toThrow();
		});

		it('does not affect other paths', () => {
			saveTabViewState('/vault/a.md', { scrollTop: 10, scrollLeft: 0, cursorPos: 5 });
			saveTabViewState('/vault/b.md', { scrollTop: 20, scrollLeft: 0, cursorPos: 15 });
			deleteTabViewState('/vault/a.md');
			expect(getTabViewState('/vault/a.md')).toBeUndefined();
			expect(getTabViewState('/vault/b.md')).toEqual({ scrollTop: 20, scrollLeft: 0, cursorPos: 15 });
		});
	});

	describe('clearAllTabViewStates', () => {
		it('removes all saved states', () => {
			saveTabViewState('/vault/a.md', { scrollTop: 10, scrollLeft: 0, cursorPos: 5 });
			saveTabViewState('/vault/b.md', { scrollTop: 20, scrollLeft: 0, cursorPos: 15 });
			saveTabViewState('/vault/c.md', { scrollTop: 30, scrollLeft: 0, cursorPos: 25 });
			clearAllTabViewStates();
			expect(getTabViewState('/vault/a.md')).toBeUndefined();
			expect(getTabViewState('/vault/b.md')).toBeUndefined();
			expect(getTabViewState('/vault/c.md')).toBeUndefined();
		});

		it('does not throw when already empty', () => {
			expect(() => clearAllTabViewStates()).not.toThrow();
		});
	});
});
