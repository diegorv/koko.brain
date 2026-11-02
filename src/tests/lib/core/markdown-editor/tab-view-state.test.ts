import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import {
	saveTabViewState,
	getTabViewState,
	deleteTabViewState,
	clearAllTabViewStates,
	saveTabEditorState,
	getTabEditorState,
	clearTabEditorStates,
	renameTabViewState,
} from '#lib/core/markdown-editor/tab-view-state.js';

const editorState = (doc: string) => EditorState.create({ doc });

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

		it('also drops the saved editor state of that path only', () => {
			const b = editorState('b');
			saveTabEditorState('/vault/a.md', editorState('a'));
			saveTabEditorState('/vault/b.md', b);
			deleteTabViewState('/vault/a.md');
			expect(getTabEditorState('/vault/a.md')).toBeUndefined();
			expect(getTabEditorState('/vault/b.md')).toBe(b);
		});
	});

	describe('saveTabEditorState + getTabEditorState', () => {
		it('returns the saved state, and undefined for an unknown path', () => {
			const a = editorState('a');
			saveTabEditorState('/vault/a.md', a);
			expect(getTabEditorState('/vault/a.md')).toBe(a);
			expect(getTabEditorState('/vault/unknown.md')).toBeUndefined();
		});
	});

	describe('clearTabEditorStates', () => {
		it('drops every editor state and keeps the scroll/cursor states', () => {
			saveTabEditorState('/vault/a.md', editorState('a'));
			saveTabViewState('/vault/a.md', { scrollTop: 10, scrollLeft: 0, cursorPos: 5 });
			clearTabEditorStates();
			expect(getTabEditorState('/vault/a.md')).toBeUndefined();
			expect(getTabViewState('/vault/a.md')).toEqual({ scrollTop: 10, scrollLeft: 0, cursorPos: 5 });
		});
	});

	describe('renameTabViewState', () => {
		it('moves both states to the new path', () => {
			const a = editorState('a');
			saveTabEditorState('/vault/a.md', a);
			saveTabViewState('/vault/a.md', { scrollTop: 10, scrollLeft: 0, cursorPos: 5 });
			renameTabViewState('/vault/a.md', '/vault/z.md');
			expect(getTabEditorState('/vault/z.md')).toBe(a);
			expect(getTabViewState('/vault/z.md')).toEqual({ scrollTop: 10, scrollLeft: 0, cursorPos: 5 });
			expect(getTabEditorState('/vault/a.md')).toBeUndefined();
			expect(getTabViewState('/vault/a.md')).toBeUndefined();
		});

		it('leaves the new path untouched when the old path has nothing saved', () => {
			const z = editorState('z');
			saveTabEditorState('/vault/z.md', z);
			renameTabViewState('/vault/missing.md', '/vault/z.md');
			expect(getTabEditorState('/vault/z.md')).toBe(z);
		});
	});

	describe('clearAllTabViewStates', () => {
		it('removes all saved states', () => {
			saveTabEditorState('/vault/a.md', editorState('a'));
			saveTabViewState('/vault/a.md', { scrollTop: 10, scrollLeft: 0, cursorPos: 5 });
			saveTabViewState('/vault/b.md', { scrollTop: 20, scrollLeft: 0, cursorPos: 15 });
			saveTabViewState('/vault/c.md', { scrollTop: 30, scrollLeft: 0, cursorPos: 25 });
			clearAllTabViewStates();
			expect(getTabViewState('/vault/a.md')).toBeUndefined();
			expect(getTabViewState('/vault/b.md')).toBeUndefined();
			expect(getTabViewState('/vault/c.md')).toBeUndefined();
			expect(getTabEditorState('/vault/a.md')).toBeUndefined();
		});

		it('does not throw when already empty', () => {
			expect(() => clearAllTabViewStates()).not.toThrow();
		});
	});
});
