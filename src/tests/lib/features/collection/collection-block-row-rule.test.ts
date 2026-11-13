// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(() => Promise.resolve([])) }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())), emit: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({
	getCurrentWindow: () => ({ onCloseRequested: vi.fn(), destroy: vi.fn(), onFocusChanged: vi.fn() }),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));

import type { EditorView } from '@codemirror/view';
import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { fencedBlockRenderers } from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { registerAppPorts, unregisterAppPorts } from '#lib/app/boot.js';
import { collectionBlockRenderer, clearCollectionCache } from '#lib/features/collection/collection-block-widget.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { mountMarkdownView, testMarkdown, withFullParse } from '../../core/markdown-editor/test-helpers';
import { RECENT_VAULT, recentIndex } from '../../../fixtures/recent-view.fixture';

/**
 * An inline ```collection block lists rows by the row rule, through the port
 * `registerAppPorts` installs. The fixture's index starts with the files the
 * rule leaves out (an archived note, a `_system/` note, a type definition and
 * two `.view` files), then five plain notes n1..n5. The type-definitions store
 * holds no entries, so every record here is one with no entry yet.
 */

beforeAll(() => {
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});

beforeEach(() => {
	editorStore.reset();
	collectionStore.reset();
	typeDefinitionsStore.reset();
	clearCollectionCache();
	vaultStore.open(RECENT_VAULT);
	collectionStore.setPropertyIndex(recentIndex());
	editorStore.addTab({ path: `${RECENT_VAULT}/note.md`, name: 'note.md', content: '', savedContent: '' });
	registerAppPorts();
});

afterEach(() => {
	unregisterAppPorts();
	vaultStore.close();
	document.body.replaceChildren();
});

function mount(doc: string): EditorView {
	return withFullParse(() =>
		mountMarkdownView(doc, {
			cursor: doc.lastIndexOf('end'),
			extensions: [testMarkdown(), fencedBlockRenderers.of(collectionBlockRenderer), livePreviewExtensions({})],
		}),
	);
}

/** A note with one collection block (`yaml` is the block body); the cursor starts on the trailing `end` line. */
function blockDoc(yaml: string): string {
	return '# C\n\n```collection\n' + yaml + '```\n\nend\n';
}

/** The `file.name` cell of every drawn row, in order. */
function rowNames(view: EditorView): string[] {
	return [...view.contentDOM.querySelectorAll('.cm-lp-collection-table tbody tr')].map((tr) => tr.querySelector('td')?.textContent ?? '');
}

/** The block's header, `<view name> (<row count>)`. */
function header(view: EditorView): string | null | undefined {
	return view.contentDOM.querySelector('.cm-lp-collection-header')?.textContent;
}

const PLAIN = ['n1.md', 'n2.md', 'n3.md', 'n4.md', 'n5.md'];

describe('inline collection block row rule', () => {
	it('leaves out an archived note, a system-folder note, a type definition and a .view', () => {
		const view = mount(blockDoc('views:\n  - type: table\n    name: All\n'));
		expect(rowNames(view)).toEqual(PLAIN);
		expect(header(view)).toBe('All (5)');
	});

	it('lists the archived note when the block cites archived', () => {
		const view = mount(blockDoc("filters: 'archived == true'\nviews:\n  - type: table\n    name: Archive\n"));
		expect(rowNames(view)).toEqual(['old.md']);
	});

	it('keeps a record that has no entry', () => {
		expect(typeDefinitionsStore.entries).toEqual([]);
		const view = mount(blockDoc("filters: 'file.name == \"n3.md\"'\nviews:\n  - type: table\n    name: One\n"));
		expect(rowNames(view)).toEqual(['n3.md']);
	});

	it('counts limit after the rule', () => {
		const view = mount(blockDoc('views:\n  - type: table\n    name: Two\n    limit: 2\n'));
		expect(rowNames(view)).toEqual(['n1.md', 'n2.md']);
		expect(header(view)).toBe('Two (2)');
	});

	it("keeps the query order: the view's sort, no _sort and no pins", () => {
		// n1 sorts last by name DESC; an `_order` pin applied by mistake would put it first.
		const n1 = `${RECENT_VAULT}/n1.md`;
		collectionStore.updateRecord(n1, buildNoteRecord(n1, '---\n_order: 0\n---\n'));
		const view = mount(blockDoc('views:\n  - type: table\n    name: By name\n    sort:\n      - column: file.basename\n        direction: DESC\n'));
		expect(rowNames(view)).toEqual([...PLAIN].reverse());
	});
});
