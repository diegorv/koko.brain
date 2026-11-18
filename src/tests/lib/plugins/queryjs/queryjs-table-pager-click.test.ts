// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(() => Promise.resolve([])) }));

import type { EditorView } from '@codemirror/view';
import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { fencedBlockRenderers } from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { queryjsBlockRenderer } from '#lib/plugins/queryjs/queryjs-block-widget.js';
import { queryjsSessionStore } from '#lib/plugins/queryjs/queryjs-session.store.svelte.js';
import { KBUI } from '#lib/plugins/queryjs/kb-ui.js';
import { mountMarkdownView, testMarkdown, withFullParse } from '../../core/markdown-editor/test-helpers';

beforeAll(() => {
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});

const NOTE = '/vault/note.md';
const JS = 'kb.ui.table(["n"], rows, { pageSize: 2 })';
const DOC = '# Q\n\n```queryjs\n' + JS + '\n```\n\nend\n';

beforeEach(() => {
	queryjsSessionStore.reset();
	editorStore.reset();
	collectionStore.reset();
	collectionStore.setPropertyIndex(new Map());
	editorStore.addTab({ path: NOTE, name: 'note.md', content: '', savedContent: '' });
	settingsStore.updateQueryjs({ autoRunQueries: 'manual' });
	// A cached result is re-attached without running the script, so the pager is drawn
	// from a real KBUI table with five rows in pages of two.
	const result = document.createElement('div');
	new KBUI(result).table(['n'], [[1], [2], [3], [4], [5]], { pageSize: 2 });
	queryjsSessionStore.setResult(NOTE, JS, result);
});

afterEach(() => {
	document.body.replaceChildren();
});

function mount(): EditorView {
	return withFullParse(() =>
		mountMarkdownView(DOC, {
			cursor: DOC.indexOf('end'),
			extensions: [testMarkdown(), fencedBlockRenderers.of(queryjsBlockRenderer), livePreviewExtensions({})],
		}),
	);
}

/**
 * Real browser order for a click on a control: mousedown, mouseup (bubbles to
 * document), click. jsdom has no layout, so CodeMirror's coordinate lookup is
 * stubbed with what a browser returns for a press on widget DOM: the widget's
 * document position (`posAtDOM`).
 * @returns Whether `el` was still connected when `click` would fire.
 */
function realClick(el: HTMLElement, view: EditorView): boolean {
	const v = view as unknown as { posAndSideAtCoords: () => { pos: number; assoc: number } };
	v.posAndSideAtCoords = () => ({ pos: view.posAtDOM(el), assoc: 1 });
	const opts = { bubbles: true, cancelable: true, button: 0, clientX: 5, clientY: 5 };
	withFullParse(() => el.dispatchEvent(new MouseEvent('mousedown', opts)));
	withFullParse(() => el.dispatchEvent(new MouseEvent('mouseup', opts)));
	const stillConnected = el.isConnected;
	if (stillConnected) withFullParse(() => el.dispatchEvent(new MouseEvent('click', opts)));
	return stillConnected;
}

function navButton(view: EditorView, label: 'Prev' | 'Next'): HTMLElement | undefined {
	return [...view.contentDOM.querySelectorAll<HTMLElement>('.cm-lp-qjs-table-nav-btn')].find(
		(b) => b.textContent === label,
	);
}

function indicator(view: EditorView): string | null | undefined {
	return view.contentDOM.querySelector('.cm-lp-qjs-table-nav-indicator')?.textContent;
}

describe('queryjs table pager in the editor', () => {
	it('Next survives its click and turns the page', () => {
		const view = mount();
		const end = view.state.doc.toString().indexOf('end');
		const next = navButton(view, 'Next');
		expect(next, 'pager drawn').toBeTruthy();
		expect(indicator(view)).toBe('Page 1 of 3');

		expect(realClick(next!, view), 'Next still connected at click time').toBe(true);
		expect(view.contentDOM.querySelector('.cm-lp-qjs-block'), 'queryjs widget still drawn').not.toBeNull();
		expect(indicator(view)).toBe('Page 2 of 3');
		expect(view.state.selection.main.head, 'cursor did not move into the block').toBe(end);
	});

	it('Prev survives its click and turns the page back', () => {
		const view = mount();
		const end = view.state.doc.toString().indexOf('end');
		expect(realClick(navButton(view, 'Next')!, view)).toBe(true);
		expect(indicator(view)).toBe('Page 2 of 3');

		const prev = navButton(view, 'Prev');
		expect(prev, 'pager drawn').toBeTruthy();
		expect(realClick(prev!, view), 'Prev still connected at click time').toBe(true);
		expect(view.contentDOM.querySelector('.cm-lp-qjs-block'), 'queryjs widget still drawn').not.toBeNull();
		expect(indicator(view)).toBe('Page 1 of 3');
		expect(view.state.selection.main.head, 'cursor did not move into the block').toBe(end);
	});
});
