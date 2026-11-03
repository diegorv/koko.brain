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
import { livePreviewExtensions, forceDecorationRebuild } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { fencedBlockRenderers } from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { collectionBlockRenderer, clearCollectionCache } from '#lib/features/collection/collection-block-widget.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { formatDateKey } from '#lib/features/collection/calendar.logic.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { mountMarkdownView, testMarkdown, withFullParse } from '../../core/markdown-editor/test-helpers';

beforeAll(() => {
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});

/** Today's date key: the calendar views draw the current month / year, so events dated today are always drawn. */
const TODAY = formatDateKey(new Date());

beforeEach(() => {
	editorStore.reset();
	collectionStore.reset();
	clearCollectionCache();
	const rec = (path: string, name: string) => ({
		path, name, basename: name.replace(/\.md$/, ''), folder: '/vault', ext: '.md',
		mtime: 0, ctime: 0, size: 1, properties: new Map<string, unknown>([['date', TODAY]]),
	});
	collectionStore.setPropertyIndex(new Map([
		['/vault/a.md', rec('/vault/a.md', 'a.md')],
		['/vault/b.md', rec('/vault/b.md', 'b.md')],
	]));
	editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
	vi.mocked(openFileInEditor).mockClear();
});

afterEach(() => {
	document.body.replaceChildren();
});

function mount(doc: string): EditorView {
	return withFullParse(() =>
		mountMarkdownView(doc, {
			cursor: doc.lastIndexOf('end'),
			extensions: [
				testMarkdown(),
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

/** A note with one collection block; the cursor starts on the trailing `end` line (the last `end`: `calendar` contains one too). */
function blockDoc(viewYaml: string): string {
	return '# C\n\n```collection\nviews:\n' + viewYaml + '```\n\nend\n';
}

const TABLE_DOC = blockDoc('  - type: table\n    name: "All"\n    order:\n      - file.name\n');
const CALENDAR_DOC = blockDoc('  - type: calendar\n    name: "Cal"\n    dateProperty: date\n');
const LINEAR_DOC = blockDoc('  - type: linear-calendar\n    name: "Year"\n    dateProperty: date\n');

/** Asserts a click on `el` opened `/vault/a.md`, kept the widget drawn and left the cursor at `end`. */
function expectOpenedWithoutReveal(view: EditorView, el: HTMLElement) {
	const connected = realClick(el, view);
	expect.soft(view.contentDOM.querySelector('.cm-lp-collection-block'), 'collection widget still drawn').not.toBeNull();
	expect.soft(connected, 'target still connected at click time').toBe(true);
	expect.soft(vi.mocked(openFileInEditor).mock.calls).toEqual([['/vault/a.md']]);
	expect(view.state.selection.main.head, 'cursor did not move into the block').toBe(view.state.doc.toString().lastIndexOf('end'));
}

describe('collection widget clicks', () => {
	it('row click opens the note and the widget stays drawn', () => {
		const view = mount(TABLE_DOC);
		const row = view.contentDOM.querySelector<HTMLElement>('.cm-lp-collection-table tbody tr');
		expect(row, 'row drawn').not.toBeNull();
		expectOpenedWithoutReveal(view, row!);
	});

	it('calendar pill click opens the note and the widget stays drawn', () => {
		const view = mount(CALENDAR_DOC);
		const pill = [...view.contentDOM.querySelectorAll<HTMLElement>('.cm-lp-collection-table tbody td div')].find(
			(d) => d.textContent === 'a',
		);
		expect(pill, 'pill drawn').toBeTruthy();
		expectOpenedWithoutReveal(view, pill!);
	});

	it('linear-calendar bar click opens the note and the widget stays drawn', () => {
		const view = mount(LINEAR_DOC);
		const bar = view.contentDOM.querySelector<HTMLElement>('.cm-lp-collection-table div[title="a"]');
		expect(bar, 'bar drawn').not.toBeNull();
		expectOpenedWithoutReveal(view, bar!);
	});

	it('control: a press on the header (outside rows) still places the cursor and reveals the source', () => {
		const view = mount(TABLE_DOC);
		const header = view.contentDOM.querySelector<HTMLElement>('.cm-lp-collection-header');
		expect(header, 'header drawn').not.toBeNull();
		realClick(header!, view);
		const doc = view.state.doc.toString();
		const head = view.state.selection.main.head;
		expect(head, 'cursor moved into the block').toBeGreaterThanOrEqual(doc.indexOf('```collection'));
		expect(head, 'cursor moved into the block').toBeLessThan(doc.lastIndexOf('```'));
		expect(view.contentDOM.querySelector('.cm-lp-collection-block'), 'source revealed').toBeNull();
		expect(vi.mocked(openFileInEditor)).not.toHaveBeenCalled();
	});

	it('index version bump + forced rebuild keeps one collection widget drawn', () => {
		const view = mount(TABLE_DOC);
		expect(view.contentDOM.querySelectorAll('.cm-lp-collection-table').length).toBe(1);
		collectionStore.removeRecord('/vault/b.md');
		withFullParse(() => view.dispatch({ effects: forceDecorationRebuild.of(null) }));
		const tables = view.contentDOM.querySelectorAll('.cm-lp-collection-table');
		expect(tables.length).toBe(1);
		expect(tables[0].querySelectorAll('tbody tr').length).toBe(1);
	});
});
