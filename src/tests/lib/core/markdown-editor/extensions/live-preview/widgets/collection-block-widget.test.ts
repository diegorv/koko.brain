// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import type { DisplayHTML } from '$lib/features/collection/expression/expression.types';
import type { QueryResult } from '$lib/features/collection/collection.types';

// openFileInEditor is a side-effect service used by the row-click handler (not
// exercised by these render-only assertions) — legitimately mocked. No store or
// .logic mocks per CLAUDE.md: buildCollectionTable is tested directly with real
// QueryResult fixtures and the real formatCellValue / isDisplayValue / sanitizeHtml.
vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

import { buildCollectionTable } from '$lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget';

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
