// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../../fixtures/localStorage.fixture';

setupLocalStorage();

// bits-ui Popover positions via @floating-ui/dom, which needs ResizeObserver.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { mount, unmount, flushSync } from 'svelte';
import CollectionViewHarness from '../../../../fixtures/CollectionViewHarness.svelte';
import { applyPropertyDelta, buildPropertyIndex } from '#lib/features/collection/collection.service.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { getAllKnownProperties, inferPropertyType } from '#lib/features/collection/toolbar/filter.logic.js';
import { getAllAvailableColumns } from '#lib/features/collection/toolbar/properties.logic.js';
import { combineAvailableProperties } from '#lib/features/type-definitions/type-note-list.logic.js';
import type { NoteRecord } from '#lib/contracts/generated/NoteRecord.js';

/** A record as `get_all_property_records` projects it: the view's whole YAML body is its properties. */
function record(path: string, properties: Record<string, unknown>): NoteRecord {
	const name = path.split('/').pop()!;
	const dot = name.lastIndexOf('.');
	return {
		path,
		name,
		basename: name.slice(0, dot),
		folder: path.slice(0, path.lastIndexOf('/')),
		ext: name.slice(dot),
		mtime: 1700000000000,
		ctime: 1690000000000,
		size: 10,
		properties,
	} as NoteRecord;
}

// The view comes first: `inferPropertyType` returns on the first value it sees.
const VIEW = record('/v/Projects.view', {
	views: [{ type: 'table', name: 'All' }],
	_rail: true,
	_sidebar_label: 'Projects',
	status: 5,
	organized: true,
	archived: false,
	favorite: false,
	tags: [],
});
const UPPER_VIEW = record('/v/Other.VIEW', { _visible: false });
const NOTE = record('/v/note.md', { status: 'done', priority: 2, organized: true, archived: false, favorite: false, tags: [] });

const FORMULAS = { remaining: '100' };
const VIEW_ONLY_KEYS = ['views', '_rail', '_sidebar_label', '_visible'];

describe('property suggestions over a real index that holds views', () => {
	beforeEach(async () => {
		clearLocalStorage();
		collectionStore.reset();
		vi.mocked(invoke).mockReset();
		vi.mocked(invoke).mockImplementation(async (command: string) => {
			if (command === 'get_all_property_records') return [VIEW, UPPER_VIEW, NOTE];
			return undefined;
		});
		await buildPropertyIndex();
	});

	afterEach(() => {
		collectionStore.reset();
		document.body.innerHTML = '';
	});

	it('keeps the view records in the index', () => {
		expect(collectionStore.propertyIndex.has(VIEW.path)).toBe(true);
	});

	it('does not suggest a key only a view has to the filter and sort pickers', () => {
		const known = getAllKnownProperties(collectionStore.propertyIndex);
		for (const key of VIEW_ONLY_KEYS) expect(known).not.toContain(key);
		expect(known).toContain('status');
		expect(known).toContain('priority');
	});

	it('does not suggest a key only a view has to the rail list pickers', () => {
		const known = combineAvailableProperties(collectionStore.propertyIndex, FORMULAS);
		for (const key of VIEW_ONLY_KEYS) expect(known).not.toContain(key);
		expect(known).toContain('formula.remaining');
	});

	it('does not suggest a key only a view has to the column picker', () => {
		const columns = getAllAvailableColumns(collectionStore.propertyIndex, { formulas: FORMULAS } as never);
		for (const key of VIEW_ONLY_KEYS) expect(columns).not.toContain(key);
		expect(columns).toContain('status');
		expect(columns).toContain('formula.remaining');
	});

	it('infers a shared key from notes only', () => {
		expect(inferPropertyType('status', collectionStore.propertyIndex)).toBe('text');
	});

	it('does not infer a type from a value only a view has', () => {
		expect(inferPropertyType('_visible', collectionStore.propertyIndex)).toBe('text');
	});

	it('skips a view that reached the index through a delta', () => {
		applyPropertyDelta([record('/v/Late.view', { _late: 1 })], []);

		expect(collectionStore.propertyIndex.has('/v/Late.view')).toBe(true);
		expect(getAllKnownProperties(collectionStore.propertyIndex)).not.toContain('_late');
		expect(getAllAvailableColumns(collectionStore.propertyIndex, {} as never)).not.toContain('_late');
	});

	it('leaves view keys out of the mounted column picker and keeps note keys', () => {
		const target = document.body.appendChild(document.createElement('div'));
		const component = mount(CollectionViewHarness, {
			target,
			props: { initialYaml: 'views:\n  - type: table\n    name: "All"\n' },
		});
		flushSync();

		document.querySelector('svg.lucide-columns-3')!.closest('button')!.click();
		flushSync();

		// The popover only: a `.collection` table's own headers come from its rows.
		const panel = document.querySelector('[data-slot="popover-content"]')?.textContent ?? '';
		expect(panel).toContain('priority');
		expect(panel).not.toContain('_sidebar_label');
		expect(panel).not.toContain('_rail');
		unmount(component);
	});
});
