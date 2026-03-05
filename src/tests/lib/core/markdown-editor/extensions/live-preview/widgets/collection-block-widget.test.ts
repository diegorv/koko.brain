// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DisplayHTML } from '$lib/features/collection/expression/expression.types';

// Mock collectionStore
vi.mock('$lib/features/collection/collection.store.svelte', () => ({
	collectionStore: {
		isIndexReady: true,
		propertyIndex: new Map([
			['/vault/note.md', {
				path: '/vault/note.md',
				name: 'note.md',
				basename: 'note',
				folder: '/vault',
				ext: '.md',
				mtime: 0,
				ctime: 0,
				size: 100,
				properties: new Map([['status', 'active']]),
			}],
		]),
	},
}));

// Mock editor service
vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

// We need to mock executeQuery to return controlled data with DisplayHTML values
vi.mock('$lib/features/collection/collection.logic', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/features/collection/collection.logic')>();
	return {
		...original,
		executeQuery: vi.fn(),
	};
});

import { CollectionBlockWidget } from '$lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget';
import { executeQuery } from '$lib/features/collection/collection.logic';

const mockedExecuteQuery = vi.mocked(executeQuery);

beforeEach(() => {
	vi.clearAllMocks();
});

describe('CollectionBlockWidget', () => {
	describe('DisplayHTML rendering', () => {
		it('renders DisplayHTML values as innerHTML instead of textContent', () => {
			const badgeHtml: DisplayHTML = {
				__display: 'html',
				html: '<span style="color:green">Active</span>',
			};

			mockedExecuteQuery.mockReturnValue({
				records: [{
					path: '/vault/note.md',
					name: 'note.md',
					basename: 'note',
					folder: '/vault',
					ext: '.md',
					mtime: 0,
					ctime: 0,
					size: 100,
					properties: new Map([
						['status', badgeHtml],
					]),
				}],
				columns: [
					{ key: 'file.name', displayName: 'Name' },
					{ key: 'status', displayName: 'Status' },
				],
			});

			const yaml = 'views:\n  - type: table\n    name: Test\n    order:\n      - file.name\n      - status';
			const widget = new CollectionBlockWidget(yaml);
			const dom = widget.toDOM();

			const cells = dom.querySelectorAll('td');
			expect(cells).toHaveLength(2);

			// The status cell should render HTML, not literal text
			const statusCell = cells[1];
			const span = statusCell.querySelector('span');
			expect(span).not.toBeNull();
			expect(span?.textContent).toBe('Active');
			expect(span?.style.color).toBe('green');
		});

		it('renders plain values as textContent (not innerHTML)', () => {
			mockedExecuteQuery.mockReturnValue({
				records: [{
					path: '/vault/note.md',
					name: 'note.md',
					basename: 'note',
					folder: '/vault',
					ext: '.md',
					mtime: 0,
					ctime: 0,
					size: 100,
					properties: new Map([
						['status', 'active'],
					]),
				}],
				columns: [
					{ key: 'file.name', displayName: 'Name' },
					{ key: 'status', displayName: 'Status' },
				],
			});

			const yaml = 'views:\n  - type: table\n    name: Test\n    order:\n      - file.name\n      - status';
			const widget = new CollectionBlockWidget(yaml);
			const dom = widget.toDOM();

			const cells = dom.querySelectorAll('td');
			expect(cells).toHaveLength(2);

			// Plain text should be set via textContent, not innerHTML
			const statusCell = cells[1];
			expect(statusCell.textContent).toBe('active');
			expect(statusCell.querySelector('span')).toBeNull();
		});

		it('sanitizes DisplayHTML before rendering', () => {
			const maliciousHtml: DisplayHTML = {
				__display: 'html',
				html: '<span style="color:red">test</span><script>alert("xss")</script>',
			};

			mockedExecuteQuery.mockReturnValue({
				records: [{
					path: '/vault/note.md',
					name: 'note.md',
					basename: 'note',
					folder: '/vault',
					ext: '.md',
					mtime: 0,
					ctime: 0,
					size: 100,
					properties: new Map([
						['status', maliciousHtml],
					]),
				}],
				columns: [
					{ key: 'status', displayName: 'Status' },
				],
			});

			const yaml = 'views:\n  - type: table\n    name: Test\n    order:\n      - status';
			const widget = new CollectionBlockWidget(yaml);
			const dom = widget.toDOM();

			const statusCell = dom.querySelector('td')!;
			// Script tag should be removed by sanitizeHtml
			expect(statusCell.querySelector('script')).toBeNull();
			// But the safe span should remain
			expect(statusCell.querySelector('span')).not.toBeNull();
		});

		it('renders null/undefined values with dash and null class', () => {
			mockedExecuteQuery.mockReturnValue({
				records: [{
					path: '/vault/note.md',
					name: 'note.md',
					basename: 'note',
					folder: '/vault',
					ext: '.md',
					mtime: 0,
					ctime: 0,
					size: 100,
					properties: new Map(),
				}],
				columns: [
					{ key: 'status', displayName: 'Status' },
				],
			});

			const yaml = 'views:\n  - type: table\n    name: Test\n    order:\n      - status';
			const widget = new CollectionBlockWidget(yaml);
			const dom = widget.toDOM();

			const statusCell = dom.querySelector('td')!;
			expect(statusCell.textContent).toBe('\u2014');
			expect(statusCell.className).toBe('cm-lp-collection-null');
		});
	});
});
