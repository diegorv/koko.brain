// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Infrastructure stubs jsdom lacks: xyflow and the markdown editor's menus
// observe sizes, the canvas reads the color-scheme media query, the editor and
// the tab strip scroll.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.scrollTo ??= () => {};
Element.prototype.scrollIntoView ??= () => {};
window.matchMedia ??= (query: string) =>
	({
		matches: false,
		media: query,
		onchange: null,
		addEventListener() {},
		removeEventListener() {},
		addListener() {},
		removeListener() {},
		dispatchEvent: () => false,
	}) as MediaQueryList;

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(() => Promise.resolve('')),
	writeTextFile: vi.fn(() => Promise.resolve()),
	mkdir: vi.fn(() => Promise.resolve()),
	remove: vi.fn(() => Promise.resolve()),
	rename: vi.fn(() => Promise.resolve()),
	exists: vi.fn(() => Promise.resolve(true)),
	copyFile: vi.fn(() => Promise.resolve()),
	readDir: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(() => Promise.resolve(vi.fn())),
	emit: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));

import { writeTextFile } from '@tauri-apps/plugin-fs';
import { ask } from '@tauri-apps/plugin-dialog';
import { registerAppPorts, unregisterAppPorts } from '#lib/app/boot.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { closeTab, switchTab } from '#lib/core/editor/editor.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import EditorView from '#lib/app/EditorView.svelte';

const A = '/vault/a.canvas';
const B = '/vault/b.canvas';
const M = '/vault/m.md';
const NOTE = '# note';

function canvasJson(id: string, text: string): string {
	return JSON.stringify({
		nodes: [{ id, type: 'text', x: 0, y: 0, width: 250, height: 60, text }],
		edges: [],
	});
}

const A_JSON = canvasJson('card-a', 'alpha');
const B_JSON = canvasJson('card-b', 'beta');

function tabContent(path: string): string | undefined {
	return editorStore.tabs.find((t) => t.path === path)?.content;
}

function tabIndex(path: string): number {
	return editorStore.tabs.findIndex((t) => t.path === path);
}

function writtenPaths(): string[] {
	return vi.mocked(writeTextFile).mock.calls.map(([path]) => String(path));
}

// Not covered: CanvasInner building its flush JSON from `lastSyncedData`
// rather than the `jsonContent` prop. Svelte 5 lets an effect teardown read a
// source's pre-flush value, so the prop still holds this canvas's content at
// destroy time and no test here fails if that base is reverted.
//
// The first EditorView + SvelteFlow mount in a worker takes 4 to 7 s under a
// loaded suite, past vitest's 5 s default, hence the longer timeout.
describe('canvas persistence across tab switch and close', { timeout: 20_000 }, () => {
	let component: Record<string, unknown> | null = null;

	beforeAll(() => registerAppPorts());
	afterAll(() => unregisterAppPorts());

	beforeEach(() => {
		vi.useFakeTimers();
		vi.mocked(writeTextFile).mockClear();
		vi.mocked(ask).mockReset();
		editorStore.reset();
		settingsStore.reset();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		vi.useRealTimers();
	});

	/**
	 * Opens the given tabs (the first one active) and mounts EditorView. Yields
	 * once so the canvas's content-sync microtask settles, as it does before a
	 * user can type.
	 */
	async function render(tabs: { path: string; content: string; fileType?: 'canvas' }[]): Promise<void> {
		for (const tab of tabs) {
			editorStore.addTab({ ...tab, name: tab.path.split('/').pop()!, savedContent: tab.content });
		}
		editorStore.setActiveIndex(0);
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(EditorView, { target });
		flushSync();
		await vi.advanceTimersByTimeAsync(0);
	}

	/** Double-clicks the active canvas's text card and types `text` into it. */
	function typeIntoCard(text: string): void {
		const card = document.body.querySelector<HTMLElement>('.canvas-text-node');
		expect(card).not.toBeNull();
		card!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		flushSync();
		const textarea = document.body.querySelector<HTMLTextAreaElement>('.canvas-textarea');
		expect(textarea).not.toBeNull();
		textarea!.value = text;
		textarea!.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	it('a canvas edit made just before switching to a note lands in the canvas tab, not the note', async () => {
		await render([
			{ path: A, content: A_JSON, fileType: 'canvas' },
			{ path: M, content: NOTE },
		]);

		typeIntoCard('typed in A');
		await vi.advanceTimersByTimeAsync(100);
		switchTab(tabIndex(M));
		flushSync();
		await vi.advanceTimersByTimeAsync(3000);

		expect(tabContent(M)).toBe(NOTE);
		expect(writtenPaths()).not.toContain(M);
		expect(tabContent(A)).toContain('typed in A');
	});

	it('closing a canvas just after an edit writes nothing into the neighbour tab', async () => {
		await render([
			{ path: A, content: A_JSON, fileType: 'canvas' },
			{ path: M, content: NOTE },
		]);

		typeIntoCard('typed in A');
		await vi.advanceTimersByTimeAsync(100);
		await closeTab(tabIndex(A));
		flushSync();
		await vi.advanceTimersByTimeAsync(3000);

		expect(editorStore.activeTabPath).toBe(M);
		expect(tabContent(M)).toBe(NOTE);
		expect(writtenPaths()).not.toContain(M);
	});

	it('closing a canvas inside the debounce window saves the edit to its file with no prompt', async () => {
		await render([
			{ path: A, content: A_JSON, fileType: 'canvas' },
			{ path: M, content: NOTE },
		]);

		typeIntoCard('typed in A');
		await vi.advanceTimersByTimeAsync(100);
		await closeTab(tabIndex(A));
		flushSync();
		await vi.advanceTimersByTimeAsync(3000);

		expect(tabIndex(A)).toBe(-1);
		const writesToA = vi.mocked(writeTextFile).mock.calls.filter(([path]) => path === A);
		expect(writesToA).toHaveLength(1);
		expect(String(writesToA[0][1])).toContain('typed in A');
		expect(ask).not.toHaveBeenCalled();
		expect(writtenPaths()).not.toContain(M);
		expect(tabContent(M)).toBe(NOTE);
	});

	it('closing a canvas with no pending edit closes it with no write and no prompt', async () => {
		await render([
			{ path: A, content: A_JSON, fileType: 'canvas' },
			{ path: M, content: NOTE },
		]);

		await closeTab(tabIndex(A));
		flushSync();
		await vi.advanceTimersByTimeAsync(3000);

		expect(tabIndex(A)).toBe(-1);
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(ask).not.toHaveBeenCalled();
	});

	it('switching canvas A to canvas B within the debounce keeps A\'s edit, and leaving B untouched changes no note', async () => {
		await render([
			{ path: A, content: A_JSON, fileType: 'canvas' },
			{ path: B, content: B_JSON, fileType: 'canvas' },
			{ path: M, content: NOTE },
		]);

		typeIntoCard('typed in A');
		await vi.advanceTimersByTimeAsync(100);
		switchTab(tabIndex(B));
		flushSync();
		await vi.advanceTimersByTimeAsync(3000);

		expect(tabContent(A)).toContain('typed in A');
		expect(tabContent(B)).toBe(B_JSON);

		switchTab(tabIndex(M));
		flushSync();
		await vi.advanceTimersByTimeAsync(3000);

		expect(tabContent(M)).toBe(NOTE);
		expect(writtenPaths()).not.toContain(M);
	});

	it('an edit on the active canvas persists after the debounce and autosaves to the canvas path', async () => {
		await render([
			{ path: A, content: A_JSON, fileType: 'canvas' },
			{ path: M, content: NOTE },
		]);

		typeIntoCard('typed in A');
		await vi.advanceTimersByTimeAsync(299);
		expect(tabContent(A)).toBe(A_JSON);

		await vi.advanceTimersByTimeAsync(1);
		expect(tabContent(A)).toContain('typed in A');

		await vi.advanceTimersByTimeAsync(2000);
		const writes = vi.mocked(writeTextFile).mock.calls;
		expect(writes.map(([path]) => path)).toEqual([A]);
		expect(String(writes[0][1])).toContain('typed in A');
		expect(tabContent(M)).toBe(NOTE);
	});
});
