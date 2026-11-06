// @vitest-environment jsdom
// The collection editor on a `.view` tab, mounted through EditorView as the
// app does: each toolbar or tab-strip write goes through the `.view` writer and
// changes only its own part of the file. The real editor service, stores and
// `.view` writer run; only the disk (plugin-fs), `invoke` and the toast are
// mocked at their boundaries.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// bits-ui Popover and ContextMenu position via @floating-ui/dom, which needs ResizeObserver.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
// The tab strip scrolls the active tab into view.
Element.prototype.scrollIntoView ??= () => {};
// The Properties panel scrolls to a formula it adds.
Element.prototype.scrollTo ??= () => {};

vi.mock('@tauri-apps/plugin-fs', () => ({
	readDir: vi.fn(),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(() => Promise.resolve(undefined)) }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())), emit: vi.fn() }));
vi.mock('svelte-sonner', () => ({
	toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() }),
}));
// The log writer stands in for its own Tauri file write, which would otherwise land in the disk mock.
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));
// Icon packs load lazily from bundled data.
vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));

import { mount, unmount, flushSync } from 'svelte';
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import EditorView from '#lib/app/EditorView.svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { onContentChange, resetEditor } from '#lib/core/editor/editor.service.js';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';

const VIEW = '/vault/Tasks.view';
/** A top-level filter the toolbar cannot represent as written: a one-item `and` next to an unknown key. */
const YAML = `_sidebar_label: Tasks
filters:
  and:
    - status == 'open'
  note: kept
views:
  - type: table
    name: All
    order:
      - file.name
      - status
  - type: table
    name: Second
`;
const FILTERS = { and: ["status == 'open'"], note: 'kept' };
const ALL = { type: 'table', name: 'All', order: ['file.name', 'status'] };
const SECOND = { type: 'table', name: 'Second' };
const CONFLICT = 'This view changed. Your edit was not saved.';

/** The in-memory disk behind the plugin-fs mocks. */
const disk = new Map<string, string>();

function record(path: string, status: string): PropertyIndexRecord {
	const name = path.split('/').pop()!;
	return {
		path,
		name,
		basename: name.replace(/\.md$/, ''),
		folder: '/vault',
		ext: '.md',
		mtime: 0,
		ctime: 0,
		size: 0,
		properties: new Map([['status', status]]),
	};
}

/** Lets the queued writes, saves and renders run. */
async function settle(): Promise<void> {
	for (let i = 0; i < 5; i++) {
		await new Promise((r) => setTimeout(r, 0));
		flushSync();
	}
}

function tab() {
	return editorStore.tabs.find((t) => t.path === VIEW)!;
}

function diskYaml(): Record<string, unknown> {
	return parseYaml(disk.get(VIEW) ?? '');
}

function header(label: string): HTMLElement {
	const found = [...document.querySelectorAll<HTMLElement>('th')].find((th) => th.textContent?.trim().startsWith(label));
	if (!found) throw new Error(`header "${label}" not found`);
	return found;
}

function viewTab(name: string): HTMLButtonElement {
	const found = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === name);
	if (!found) throw new Error(`view tab "${name}" not found`);
	return found;
}

describe('CollectionView on a .view writes only what it changes', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		resetHooks();
		clearAllIndexed();
		editorStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		collectionStore.reset();
		collectionStore.setPropertyIndex(new Map([['/vault/a.md', record('/vault/a.md', 'open')]]));
		disk.clear();
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			const content = disk.get(String(p));
			if (content === undefined) throw new Error(`not found: ${String(p)}`);
			return content;
		});
		vi.mocked(writeTextFile).mockImplementation(async (p, data) => {
			disk.set(String(p), String(data));
		});
		vi.mocked(exists).mockImplementation(async (p) => disk.has(String(p)));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		resetEditor();
		resetHooks();
		vaultStore._reset();
		collectionStore.reset();
	});

	/** Opens the `.view` in a tab holding `content` (saved as `saved`) and mounts the editor on it. */
	function open(content: string, saved = content): void {
		editorStore.addTab({ path: VIEW, name: 'Tasks.view', content, savedContent: saved, fileType: 'collection' });
		component = mount(EditorView, { target: document.body.appendChild(document.createElement('div')) });
		flushSync();
	}

	it('keeps a one-item and with an unknown key in the filters when the Sort changes', async () => {
		disk.set(VIEW, YAML);
		open(YAML);

		header('status').click();
		await settle();

		expect(parseYaml(tab().content).filters).toEqual(FILTERS);
		expect(diskYaml()).toEqual({
			_sidebar_label: 'Tasks',
			filters: FILTERS,
			views: [{ ...ALL, sort: [{ column: 'status', direction: 'ASC' }] }, SECOND],
		});
		expect(tab().savedContent).toBe(disk.get(VIEW));
		expect(tab().content).toBe(disk.get(VIEW));
	});

	it('refuses a Sort whose key changed on disk under a clean tab, and shows the file\'s sort', async () => {
		const newer = YAML.replace('      - status\n', '      - status\n    sort:\n      - column: status\n        direction: DESC\n');
		disk.set(VIEW, newer);
		open(YAML);

		header('status').click();
		await settle();

		expect(toast.error).toHaveBeenCalledWith(CONFLICT);
		expect(disk.get(VIEW)).toBe(newer);
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(tab().content).toBe(newer);
		expect(header('status').textContent?.trim()).toBe('status ↓');
	});

	it('writes a Sort when only another key changed on disk, keeping that change', async () => {
		const newer = YAML.replace('_sidebar_label: Tasks', '_sidebar_label: Renamed');
		disk.set(VIEW, newer);
		open(YAML);

		header('status').click();
		await settle();

		expect(toast.error).not.toHaveBeenCalled();
		expect(diskYaml()).toMatchObject({ _sidebar_label: 'Renamed', filters: FILTERS });
		expect((diskYaml().views as unknown[])[0]).toEqual({ ...ALL, sort: [{ column: 'status', direction: 'ASC' }] });
		expect(tab().content).toBe(disk.get(VIEW));
	});

	it('builds on a dirty buffer, so an unsaved edit in it reaches the disk with the Sort', async () => {
		const edited = YAML.replace('_sidebar_label: Tasks', '_sidebar_label: Edited');
		disk.set(VIEW, YAML);
		open(YAML);
		onContentChange(edited);
		flushSync();

		header('status').click();
		await settle();

		expect(diskYaml()).toMatchObject({ _sidebar_label: 'Edited', filters: FILTERS });
		expect((diskYaml().views as unknown[])[0]).toEqual({ ...ALL, sort: [{ column: 'status', direction: 'ASC' }] });
		expect(tab().content).toBe(disk.get(VIEW));
		expect(tab().savedContent).toBe(disk.get(VIEW));
	});

	it('keeps the filter value input and every keystroke across writes still landing', async () => {
		const yaml = `filters: 'status == "open"'\nviews:\n  - type: table\n    name: All\n`;
		disk.set(VIEW, yaml);
		open(yaml);
		document.querySelector('svg.lucide-list-filter')!.closest('button')!.click();
		flushSync();
		const input = document.querySelector<HTMLInputElement>('input[placeholder="Value..."]')!;
		input.focus();

		input.value = 'opened';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		input.value = 'openedx';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		await settle();

		expect(toast.error).not.toHaveBeenCalled();
		expect(diskYaml().filters).toBe("status == 'openedx'");
		expect(input.isConnected).toBe(true);
		expect(document.activeElement).toBe(input);
		expect(input.value).toBe('openedx');
	});

	it('drops a removed formula\'s column from the view order it writes', async () => {
		const yaml = `formulas:\n  score: '1'\nviews:\n  - type: table\n    name: All\n    order:\n      - file.name\n      - formula.score\n`;
		disk.set(VIEW, yaml);
		open(yaml);
		document.querySelector('svg.lucide-columns-3')!.closest('button')!.click();
		flushSync();
		const row = [...document.querySelectorAll('span')].find((s) => s.textContent?.trim() === 'score')!.parentElement!;
		const remove = [...row.querySelectorAll('button')].at(-1)!;

		remove.click();
		await settle();

		expect(toast.error).not.toHaveBeenCalled();
		expect(diskYaml()).toEqual({ views: [{ type: 'table', name: 'All', order: ['file.name'] }] });
	});

	it('adds a confirmed formula\'s column to the view order it writes', async () => {
		const yaml = `views:\n  - type: table\n    name: All\n    order:\n      - file.name\n`;
		disk.set(VIEW, yaml);
		open(yaml);
		document.querySelector('svg.lucide-columns-3')!.closest('button')!.click();
		flushSync();
		[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Add formula')!.click();
		flushSync();
		const name = document.querySelector<HTMLInputElement>('input[placeholder="Formula name..."]')!;
		name.value = 'score';
		name.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		const expr = document.querySelector<HTMLInputElement>('input[placeholder^="Expression"]')!;
		expr.value = '1';
		expr.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		document.querySelector<HTMLButtonElement>('button[aria-label="Confirm formula"]')!.click();
		await settle();

		expect(toast.error).not.toHaveBeenCalled();
		expect(diskYaml()).toEqual({
			formulas: { score: '1' },
			views: [{ type: 'table', name: 'All', order: ['file.name', 'formula.score'] }],
		});
	});

	it('adds a view and names it, writing only the new view', async () => {
		disk.set(VIEW, YAML);
		open(YAML);

		document.querySelector<HTMLButtonElement>('button[title="Add view"]')!.click();
		await settle();

		expect(diskYaml()).toEqual({ _sidebar_label: 'Tasks', filters: FILTERS, views: [ALL, SECOND, { type: 'table', name: 'Untitled' }] });
		const input = document.querySelector<HTMLInputElement>('input.border-ring');
		if (!input) throw new Error('rename input not open on the new view');
		expect(input.value).toBe('Untitled');

		input.value = 'Board';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await settle();

		expect(diskYaml()).toEqual({ _sidebar_label: 'Tasks', filters: FILTERS, views: [ALL, SECOND, { type: 'table', name: 'Board' }] });
		expect(viewTab('Board').className).toContain('font-medium');
	});

	it('renames a view, writing only its name', async () => {
		disk.set(VIEW, YAML);
		open(YAML);

		viewTab('Second').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		flushSync();
		const input = document.querySelector<HTMLInputElement>('input.border-ring')!;
		input.value = 'Later';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await settle();

		expect(diskYaml()).toEqual({ _sidebar_label: 'Tasks', filters: FILTERS, views: [ALL, { ...SECOND, name: 'Later' }] });
		expect(viewTab('Later')).toBeTruthy();
	});

	it('deletes a view from its tab menu, writing only the removal, and keeps the active view', async () => {
		disk.set(VIEW, YAML);
		open(YAML);
		viewTab('Second').click();
		flushSync();

		viewTab('All').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 1, clientY: 1 }));
		for (let i = 0; i < 5; i++) await Promise.resolve();
		flushSync();
		const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((m) => m.textContent?.trim() === 'Delete view');
		if (!item) throw new Error('Delete view item not found');
		item.click();
		await settle();

		expect(diskYaml()).toEqual({ _sidebar_label: 'Tasks', filters: FILTERS, views: [SECOND] });
		expect(viewTab('Second').className).toContain('font-medium');
	});

	it('refuses to delete a view another one replaced at that index on disk', async () => {
		const swapped = YAML.replace('name: All', 'name: Tmp').replace('name: Second', 'name: All').replace('name: Tmp', 'name: Second');
		disk.set(VIEW, swapped);
		open(YAML);

		viewTab('Second').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 1, clientY: 1 }));
		for (let i = 0; i < 5; i++) await Promise.resolve();
		flushSync();
		[...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((m) => m.textContent?.trim() === 'Delete view')!.click();
		await settle();

		expect(toast.error).toHaveBeenCalledWith(CONFLICT);
		expect(disk.get(VIEW)).toBe(swapped);
		expect(writeTextFile).not.toHaveBeenCalled();
	});
});
