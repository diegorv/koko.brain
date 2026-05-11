import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EditorView } from '@codemirror/view';
import { tocStore } from '$lib/plugins/table-of-contents/toc.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { rebuildToc, scrollToHeading } from '$lib/plugins/table-of-contents/toc.service';

interface FakeView {
	state: { doc: { length: number } };
	dispatch: ReturnType<typeof vi.fn>;
	focus: ReturnType<typeof vi.fn>;
}

function makeFakeView(docLength: number): FakeView {
	return {
		state: { doc: { length: docLength } },
		dispatch: vi.fn(),
		focus: vi.fn(),
	};
}

describe('rebuildToc', () => {
	beforeEach(() => {
		tocStore.reset();
	});

	it('clears the store on null input', () => {
		tocStore.setHeadings([{ level: 1, text: 'x', line: 0, pos: 0 }]);
		rebuildToc(null);
		expect(tocStore.headings).toEqual([]);
	});

	it('clears the store on empty string', () => {
		tocStore.setHeadings([{ level: 1, text: 'x', line: 0, pos: 0 }]);
		rebuildToc('');
		expect(tocStore.headings).toEqual([]);
	});

	it('populates the store with parsed headings', () => {
		rebuildToc('# A\n## B');
		expect(tocStore.headings.map((h) => ({ level: h.level, text: h.text }))).toEqual([
			{ level: 1, text: 'A' },
			{ level: 2, text: 'B' },
		]);
	});
});

describe('scrollToHeading', () => {
	beforeEach(() => {
		editorStore.setEditorView(null);
	});

	it('is a no-op when editorView is null', () => {
		expect(() => scrollToHeading(10)).not.toThrow();
	});

	it('dispatches a cursor+scroll transaction at the given offset', () => {
		const view = makeFakeView(100);
		editorStore.setEditorView(view as unknown as EditorView);

		scrollToHeading(42);

		expect(view.dispatch).toHaveBeenCalledTimes(1);
		const arg = view.dispatch.mock.calls[0][0];
		expect(arg.selection.head).toBe(42);
		expect(arg.effects).toBeDefined();
		expect(view.focus).toHaveBeenCalledTimes(1);
	});

	it('clamps pos to doc length when out of range', () => {
		const view = makeFakeView(50);
		editorStore.setEditorView(view as unknown as EditorView);

		scrollToHeading(999);

		const arg = view.dispatch.mock.calls[0][0];
		expect(arg.selection.head).toBe(50);
	});

	it('clamps negative pos to zero', () => {
		const view = makeFakeView(50);
		editorStore.setEditorView(view as unknown as EditorView);

		scrollToHeading(-5);

		const arg = view.dispatch.mock.calls[0][0];
		expect(arg.selection.head).toBe(0);
	});
});
