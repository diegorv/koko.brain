// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DisplayHTML } from '$lib/features/collection/expression/expression.types';
import type { QueryResult } from '$lib/features/collection/collection.types';

// openFileInEditor is a side-effect service used by the row-click handler (not
// exercised by these render-only assertions) — legitimately mocked. No store or
// .logic mocks per CLAUDE.md: buildCollectionTable is tested directly with real
// QueryResult fixtures and the real formatCellValue / isDisplayValue / sanitizeHtml.
vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

import {
	buildCollectionTable,
	CollectionBlockWidget,
	clearCollectionCache,
} from '$lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { openFileInEditor } from '$lib/core/editor/editor.service';

/** Builds a minimal NoteRecord carrying the given properties. */
function record(properties: Map<string, unknown>) {
	return {
		path: '/vault/note.md',
		name: 'note.md',
		basename: 'note',
		folder: '/vault',
		ext: '.md',
		mtime: 0,
		ctime: 0,
		size: 100,
		properties,
	};
}

describe('buildCollectionTable', () => {
	it('renders DisplayHTML values as innerHTML instead of textContent', () => {
		const badgeHtml: DisplayHTML = {
			__display: 'html',
			html: '<span style="color:green">Active</span>',
		};
		const result: QueryResult = {
			records: [record(new Map([['status', badgeHtml]]))],
			columns: [
				{ key: 'file.name', displayName: 'Name' },
				{ key: 'status', displayName: 'Status' },
			],
		};

		const cells = buildCollectionTable(result).querySelectorAll('td');
		expect(cells).toHaveLength(2);

		const span = cells[1].querySelector('span');
		expect(span).not.toBeNull();
		expect(span?.textContent).toBe('Active');
		expect(span?.style.color).toBe('green');
	});

	it('renders plain values as textContent (not innerHTML)', () => {
		const result: QueryResult = {
			records: [record(new Map([['status', 'active']]))],
			columns: [
				{ key: 'file.name', displayName: 'Name' },
				{ key: 'status', displayName: 'Status' },
			],
		};

		const cells = buildCollectionTable(result).querySelectorAll('td');
		expect(cells).toHaveLength(2);
		expect(cells[1].textContent).toBe('active');
		expect(cells[1].querySelector('span')).toBeNull();
	});

	it('sanitizes DisplayHTML before rendering', () => {
		const maliciousHtml: DisplayHTML = {
			__display: 'html',
			html: '<span style="color:red">test</span><script>alert("xss")</script>',
		};
		const result: QueryResult = {
			records: [record(new Map([['status', maliciousHtml]]))],
			columns: [{ key: 'status', displayName: 'Status' }],
		};

		const td = buildCollectionTable(result).querySelector('td')!;
		// Script tag stripped by sanitizeHtml, safe span kept.
		expect(td.querySelector('script')).toBeNull();
		expect(td.querySelector('span')).not.toBeNull();
	});

	it('renders null/undefined values with dash and null class', () => {
		const result: QueryResult = {
			records: [record(new Map())],
			columns: [{ key: 'status', displayName: 'Status' }],
		};

		const td = buildCollectionTable(result).querySelector('td')!;
		expect(td.textContent).toBe('—');
		expect(td.className).toBe('cm-lp-collection-null');
	});

	it('renders one header cell per column in order', () => {
		const result: QueryResult = {
			records: [],
			columns: [
				{ key: 'file.name', displayName: 'Name' },
				{ key: 'status', displayName: 'Status' },
			],
		};

		const headers = buildCollectionTable(result).querySelectorAll('th');
		expect([...headers].map((h) => h.textContent)).toEqual(['Name', 'Status']);
	});
});

describe('CollectionBlockWidget — query data cache', () => {
	const YAML = 'views:\n  - type: table\n    name: "All"\n    order:\n      - file.name\n';

	/** Builds a minimal NoteRecord living at the given path. */
	function recordAt(path: string, name: string) {
		return {
			path,
			name,
			basename: name.replace(/\.md$/, ''),
			folder: '/vault',
			ext: '.md',
			mtime: 0,
			ctime: 0,
			size: 1,
			properties: new Map<string, unknown>(),
		};
	}

	beforeEach(() => {
		// Real collectionStore + real yaml-parser/executeQuery (CLAUDE.md: never
		// mock stores or .logic). Only openFileInEditor stays mocked (top of file).
		clearCollectionCache();
		collectionStore.reset();
		collectionStore.setPropertyIndex(
			new Map([
				['/vault/a.md', recordAt('/vault/a.md', 'a.md')],
				['/vault/b.md', recordAt('/vault/b.md', 'b.md')],
			]),
		);
		vi.clearAllMocks();
	});

	afterEach(() => {
		collectionStore.reset();
		clearCollectionCache();
	});

	it('renders the header and one row per index record', () => {
		const dom = new CollectionBlockWidget(YAML).toDOM();

		expect(dom.querySelector('.cm-lp-collection-header')?.textContent).toBe('All (2)');
		expect(dom.querySelectorAll('tbody tr').length).toBe(2);
	});

	it('never hands the same DOM node to two widgets with the same block', () => {
		// Regression: CodeMirror builds new lines detached, so two widgets for a
		// duplicated collection block can both call toDOM() while nothing is
		// connected. Sharing the cached node moves it to the last widget and
		// blanks the first occurrence.
		const first = new CollectionBlockWidget(YAML).toDOM();
		expect(first.isConnected).toBe(false);

		const second = new CollectionBlockWidget(YAML).toDOM();

		expect(second).not.toBe(first);
		expect(first.querySelector('table')).not.toBeNull();
		expect(second.querySelector('table')).not.toBeNull();
	});

	it('keeps row clicks working on a cache-hit render', () => {
		new CollectionBlockWidget(YAML).toDOM();
		const second = new CollectionBlockWidget(YAML).toDOM();

		const row = second.querySelector('tbody tr') as HTMLElement;
		row.click();

		expect(openFileInEditor).toHaveBeenCalledWith('/vault/a.md');
	});

	it('re-queries when the index changed without changing size', () => {
		const first = new CollectionBlockWidget(YAML).toDOM();
		expect(first.querySelectorAll('tbody tr').length).toBe(2);

		// Both maps hold exactly TWO records on purpose: the old cache key
		// (yaml|indexSize) is byte-identical across the swap, so only the store
		// version can invalidate it. A different size would flip the old key too
		// and let this probe pass against the stale-cache bug.
		collectionStore.setPropertyIndex(
			new Map([
				['/vault/x.md', recordAt('/vault/x.md', 'x.md')],
				['/vault/y.md', recordAt('/vault/y.md', 'y.md')],
			]),
		);

		const second = new CollectionBlockWidget(YAML).toDOM();
		const names = [...second.querySelectorAll('tbody tr td:first-child')].map(
			(td) => td.textContent,
		);
		expect(names).toEqual(['x.md', 'y.md']);
	});

	it('serves the cached query result while the store version is unchanged', () => {
		const first = new CollectionBlockWidget(YAML).toDOM();
		expect(first.querySelectorAll('tbody tr').length).toBe(2);

		// Mutating the live Map bypasses every store method, so no version bump
		// happens and the cache must still hit. Guards against "fix" attempts
		// that simply delete the cache.
		collectionStore.propertyIndex.set('/vault/z.md', recordAt('/vault/z.md', 'z.md'));

		const second = new CollectionBlockWidget(YAML).toDOM();
		const names = [...second.querySelectorAll('tbody tr td:first-child')].map(
			(td) => td.textContent,
		);
		expect(names).toEqual(['a.md', 'b.md']);
	});

	it('eq() is false for a widget built after an index change', () => {
		const before = new CollectionBlockWidget(YAML);
		collectionStore.updateRecord('/vault/c.md', recordAt('/vault/c.md', 'c.md'));
		const after = new CollectionBlockWidget(YAML);

		expect(before.eq(after)).toBe(false);
		expect(after.eq(new CollectionBlockWidget(YAML))).toBe(true);
	});
});
