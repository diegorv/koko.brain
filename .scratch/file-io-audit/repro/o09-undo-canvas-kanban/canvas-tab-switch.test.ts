// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Tauri boundaries only; editor store, canvas.logic and the real CanvasView /
// CanvasInner / SvelteFlow components are used as-is.
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async () => ''),
	writeTextFile: vi.fn(async () => {}),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(async () => true) }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
// d3-zoom / xyflow read these in jsdom.
(globalThis as any).DOMMatrixReadOnly ??= class {
	m22 = 1;
	constructor() {}
};

window.matchMedia ??= ((query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addEventListener() {},
	removeEventListener() {},
	addListener() {},
	removeListener() {},
	dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

import { mount, unmount, flushSync } from 'svelte';
import Harness from './CanvasTabHarness.svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';

const NOTE = '/vault/Note.md';
const NOTE_CONTENT = '# My note\n\nImportant prose that must survive.\n';
const BOARD = '/vault/Board.canvas';

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

function mountHarness() {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(Harness, { target });
	flushSync();
}

function clickAddCard() {
	const btn = target.querySelector<HTMLButtonElement>('.add-card-btn');
	if (!btn) throw new Error('"+ Add card" button not rendered');
	btn.click();
	flushSync();
}

describe('o09 canvas', () => {
	beforeEach(() => {
		editorStore.reset();
		flushSync();
	});
	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target?.remove();
	});

	it('feature-writers-1: switching away within 300 ms of a canvas edit does not write canvas JSON into the newly active note', async () => {
		const empty = '{"nodes":[],"edges":[]}';
		editorStore.addTab({ path: NOTE, name: 'Note.md', content: NOTE_CONTENT, savedContent: NOTE_CONTENT });
		editorStore.addTab({ path: BOARD, name: 'Board.canvas', content: empty, savedContent: empty, fileType: 'canvas' });
		flushSync();
		mountHarness();
		// The canvas was open for a while before the user acts: let the
		// mount-time `syncing` microtask reset run (CanvasInner.svelte:96).
		await new Promise((r) => setTimeout(r, 0));

		clickAddCard();
		// The canvas tab got the new card (immediate persistChanges).
		expect(editorStore.tabs[1].content).toContain('"type": "text"');

		// Ctrl+Tab back to the note well inside the 300 ms debounce window.
		editorStore.setActiveIndex(0);
		flushSync();

		// The note must still hold its own markdown, not the canvas JSON.
		expect(editorStore.tabs[0].content).toBe(NOTE_CONTENT);
	});

	async function openCanvasWithPendingEdit(): Promise<void> {
		const empty = '{"nodes":[],"edges":[]}';
		editorStore.addTab({ path: NOTE, name: 'Note.md', content: NOTE_CONTENT, savedContent: NOTE_CONTENT });
		editorStore.addTab({ path: BOARD, name: 'Board.canvas', content: empty, savedContent: empty, fileType: 'canvas' });
		flushSync();
		mountHarness();
		await new Promise((r) => setTimeout(r, 0));
		clickAddCard();
	}

	it('feature-writers-1 (natural batching): switch flushed by the scheduler, not flushSync', async () => {
		await openCanvasWithPendingEdit();
		editorStore.setActiveIndex(0);
		await new Promise((r) => setTimeout(r, 0));
		expect(editorStore.tabs[0].content).toBe(NOTE_CONTENT);
		// The onDestroy flush landed on the canvas tab it belongs to.
		expect(editorStore.tabs[1].content).toContain('"type": "text"');
	});

	it('feature-writers-1 (file-node click path): openFileInEditor-style addTab after an await', async () => {
		await openCanvasWithPendingEdit();
		const OTHER = '/vault/Other.md';
		const OTHER_CONTENT = 'Other note body\n';
		await Promise.resolve(); // the readTextFile await inside openFileInEditor
		editorStore.addTab({ path: OTHER, name: 'Other.md', content: OTHER_CONTENT, savedContent: OTHER_CONTENT });
		await new Promise((r) => setTimeout(r, 0));
		expect(editorStore.activeTab?.path).toBe(OTHER);
		expect(editorStore.activeTab?.content).toBe(OTHER_CONTENT);
		expect(editorStore.tabs[0].content).toBe(NOTE_CONTENT);
	});

	it('feature-writers-1 (close path): closing the canvas tab within 300 ms does not write into the neighbour', async () => {
		await openCanvasWithPendingEdit();
		editorStore.removeTab(1);
		await new Promise((r) => setTimeout(r, 0));
		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.tabs[0].content).toBe(NOTE_CONTENT);
	});

	it('feature-writers-6 / fidelity-10: an unparseable .canvas is not replaced by the first edit', () => {
		// Trailing comma: JSON.parse throws.
		const broken = '{\n\t"nodes": [\n\t\t{"id":"keepme0000000001","type":"text","text":"Years of notes","x":0,"y":0,"width":260,"height":60},\n\t],\n\t"edges": []\n}';
		editorStore.addTab({ path: BOARD, name: 'Board.canvas', content: broken, savedContent: broken, fileType: 'canvas' });
		flushSync();
		mountHarness();

		// The broken canvas renders as empty, with the "+ Add card" prompt.
		clickAddCard();

		// Correct behavior: the original node is not silently dropped from the
		// content autosave will write (either the edit is refused, or the
		// original bytes are kept).
		expect(editorStore.tabs[0].content).toContain('keepme0000000001');
	});
});
