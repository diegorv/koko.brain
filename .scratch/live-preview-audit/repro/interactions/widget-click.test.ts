// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(() => Promise.resolve([])) }));
vi.mock('#lib/core/editor/editor.service.js', async (orig) => ({
	...(await orig<object>()),
	openFileInEditor: vi.fn(),
}));

import type { EditorView } from '@codemirror/view';
import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { fencedBlockRenderers } from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { queryjsBlockRenderer } from '#lib/plugins/queryjs/queryjs-block-widget.js';
import { queryjsSessionStore } from '#lib/plugins/queryjs/queryjs-session.store.svelte.js';
import { KBUI } from '#lib/plugins/queryjs/kb-ui.js';
import { collectionBlockRenderer, clearCollectionCache } from '#lib/features/collection/collection-block-widget.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { mountMarkdownView, testMarkdown, withFullParse } from '../../../test-helpers';

beforeAll(() => {
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});

beforeEach(() => {
	queryjsSessionStore.reset();
	editorStore.reset();
	collectionStore.reset();
	clearCollectionCache();
	const rec = (path: string, name: string) => ({
		path, name, basename: name.replace(/\.md$/, ''), folder: '/vault', ext: '.md',
		mtime: 0, ctime: 0, size: 1, properties: new Map<string, unknown>(),
	});
	collectionStore.setPropertyIndex(new Map([
		['/vault/a.md', rec('/vault/a.md', 'a.md')],
		['/vault/b.md', rec('/vault/b.md', 'b.md')],
	]));
	editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
	settingsStore.updateQueryjs({ autoRunQueries: 'manual' });
	vi.mocked(openFileInEditor).mockClear();
});

afterEach(() => {
	document.body.replaceChildren();
});

function mount(doc: string): EditorView {
	return withFullParse(() =>
		mountMarkdownView(doc, {
			cursor: doc.indexOf('end'),
			extensions: [
				testMarkdown(),
				fencedBlockRenderers.of(queryjsBlockRenderer),
				fencedBlockRenderers.of(collectionBlockRenderer),
				livePreviewExtensions({}),
			],
		}),
	);
}

/**
 * Real browser order for a click on a control: mousedown, mouseup (bubbles to
 * document), click. jsdom has no layout, so CodeMirror's coordinate lookup is
 * stubbed with what a browser returns for a press on widget DOM: the widget's
 * document position (`posAtDOM`).
 */
function realClick(el: HTMLElement, view: EditorView) {
	const v = view as unknown as { posAndSideAtCoords: () => { pos: number; assoc: number } };
	v.posAndSideAtCoords = () => ({ pos: view.posAtDOM(el), assoc: 1 });
	const opts = { bubbles: true, cancelable: true, button: 0, clientX: 5, clientY: 5 };
	withFullParse(() => el.dispatchEvent(new MouseEvent('mousedown', opts)));
	withFullParse(() => el.dispatchEvent(new MouseEvent('mouseup', opts)));
	const stillConnected = el.isConnected;
	if (stillConnected) withFullParse(() => el.dispatchEvent(new MouseEvent('click', opts)));
	return stillConnected;
}

const JS = 'kb.ui.table(["n"], rows, { pageSize: 2 })';

function cachedPagedResult(): HTMLElement {
	const el = document.createElement('div');
	const ui = new KBUI(el);
	el.appendChild(ui.table(['n'], [[1], [2], [3], [4], [5]], { pageSize: 2 }));
	return el;
}

describe('queryjs widget controls', () => {
	const DOC = '# Q\n\n```queryjs\n' + JS + '\n```\n\nend\n';

	it('control: the Run button survives its click', () => {
		const view = mount(DOC);
		const run = view.contentDOM.querySelector<HTMLElement>('.cm-lp-qjs-run');
		expect(run).not.toBeNull();
		expect(realClick(run!, view), 'Run button still connected at click time').toBe(true);
		expect(view.state.selection.main.head).toBe(view.state.doc.toString().indexOf('end'));
		expect(view.contentDOM.querySelector('.cm-lp-qjs-block')).not.toBeNull();
	});

	it('pager Next survives its click and turns the page', () => {
		queryjsSessionStore.setResult(JS, cachedPagedResult());
		const view = mount(DOC);
		const next = [...view.contentDOM.querySelectorAll<HTMLElement>('.cm-lp-qjs-table-nav-btn')].find((b) => b.textContent === 'Next');
		expect(next, 'pager drawn').toBeTruthy();
		const connected = realClick(next!, view);
		expect.soft(view.contentDOM.querySelector('.cm-lp-qjs-block'), 'queryjs widget still drawn').not.toBeNull();
		expect.soft(connected, 'Next still connected at click time').toBe(true);
		expect.soft(view.contentDOM.querySelector('.cm-lp-qjs-table-nav-indicator')?.textContent).toBe('Page 2 of 3');
		expect(view.state.selection.main.head, 'cursor did not move into the block').toBe(view.state.doc.toString().indexOf('end'));
	});
});

describe('queryjs index-ready flip', () => {
	it('replaces the Building index placeholder after the forced rebuild', async () => {
		collectionStore.reset();
		const view = mount('# Q\n\n```queryjs\n' + JS + '\n```\n\nend\n');
		expect(view.contentDOM.querySelector('.cm-lp-qjs-loading')?.textContent).toBe('Building index...');
		collectionStore.setPropertyIndex(new Map());
		const { forceDecorationRebuild } = await import('#lib/core/markdown-editor/extensions/live-preview/live-preview.js');
		withFullParse(() => view.dispatch({ effects: forceDecorationRebuild.of(null) }));
		expect(view.contentDOM.querySelectorAll('.cm-lp-qjs-block').length).toBe(1);
		expect(view.contentDOM.querySelector('.cm-lp-qjs-run')).not.toBeNull();
	});
});

// The collection widget cases moved to src/tests/lib/features/collection/collection-block-click.test.ts.
