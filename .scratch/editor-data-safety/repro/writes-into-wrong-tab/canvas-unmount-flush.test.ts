// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// xyflow and bits-ui need ResizeObserver / matchMedia; jsdom has neither. The
// no-op ResizeObserver means xyflow never measures nodes, so every `nodes`
// change below comes from the user gesture the test performs.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.scrollTo = () => {};
window.matchMedia ??= ((query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addEventListener: () => {},
	removeEventListener: () => {},
	addListener: () => {},
	removeListener: () => {},
	dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async () => null), convertFileSrc: (p: string) => p }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async () => ''),
	writeTextFile: vi.fn(async () => {}),
	exists: vi.fn(async () => false),
	mkdir: vi.fn(async () => {}),
	readDir: vi.fn(async () => []),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(async () => true) }));

import { mount, unmount, flushSync } from 'svelte';
import EditorView from '#lib/app/EditorView.svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { switchTab, closeActiveTab } from '#lib/core/editor/editor.service.js';

const NOTE_PATH = '/vault/Note.md';
const CANVAS_1 = '/vault/Board-1.canvas';
const CANVAS_2 = '/vault/Board-2.canvas';
const NOTE_CONTENT = '# My note\n\nImportant text the user wrote.\n';

function canvasJson(id: string, text: string): string {
	return JSON.stringify(
		{ nodes: [{ id, type: 'text', text, x: 0, y: 0, width: 200, height: 60 }], edges: [] },
		null,
		'\t',
	);
}
const CANVAS_1_JSON = canvasJson('a', 'card A');
const CANVAS_2_JSON = canvasJson('b', 'card B');

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

async function settle(): Promise<void> {
	for (let i = 0; i < 5; i++) await Promise.resolve();
	flushSync();
}

function render() {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(EditorView, { target, props: {} });
	flushSync();
}

/** Double-click the text card and type `text` into its textarea (TextNode.handleInput -> updateNodeData). */
function typeInCard(text: string): void {
	const card = target.querySelector('.canvas-text-node');
	if (!card) throw new Error('text card not rendered');
	card.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
	flushSync();
	const textarea = target.querySelector('textarea.canvas-textarea') as HTMLTextAreaElement | null;
	if (!textarea) throw new Error('textarea not rendered');
	textarea.value = text;
	textarea.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function pressInCanvas(init: KeyboardEventInit): void {
	const container = target.querySelector('.canvas-container');
	if (!container) throw new Error('canvas not rendered');
	container.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));
	flushSync();
}

const tab = (path: string) => editorStore.tabs.find((t) => t.path === path)!;

describe('canvas writes after a tab change', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		editorStore.reset();
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target?.remove();
		vi.useRealTimers();
	});

	it('F5: canvas -> note switch inside the 300 ms window flushes into the canvas, not the note', async () => {
		editorStore.addTab({ path: NOTE_PATH, name: 'Note.md', content: NOTE_CONTENT, savedContent: NOTE_CONTENT });
		editorStore.addTab({ path: CANVAS_1, name: 'Board-1.canvas', content: CANVAS_1_JSON, savedContent: CANVAS_1_JSON, fileType: 'canvas' });
		render();
		await settle(); // the sync effect's queueMicrotask resets `syncing`

		typeInCard('edited in canvas');
		expect(tab(CANVAS_1).content).toBe(CANVAS_1_JSON); // still inside the debounce window
		switchTab(0);
		flushSync();

		expect(tab(NOTE_PATH).content).toBe(NOTE_CONTENT);
		expect(tab(CANVAS_1).content).toContain('edited in canvas');
	});

	it('F5 (close variant): Cmd+W on the canvas inside the 300 ms window leaves the neighbour note intact', async () => {
		editorStore.addTab({ path: NOTE_PATH, name: 'Note.md', content: NOTE_CONTENT, savedContent: NOTE_CONTENT });
		editorStore.addTab({ path: CANVAS_1, name: 'Board-1.canvas', content: CANVAS_1_JSON, savedContent: CANVAS_1_JSON, fileType: 'canvas' });
		render();
		await settle();

		typeInCard('edited in canvas');
		await closeActiveTab();
		flushSync();

		expect(tab(NOTE_PATH).content).toBe(NOTE_CONTENT);
	});

	it('F5 side effect: Cmd+W inside the 300 ms window either prompts or saves the canvas edit', async () => {
		const { ask } = await import('@tauri-apps/plugin-dialog');
		const { writeTextFile } = await import('@tauri-apps/plugin-fs');
		vi.mocked(ask).mockClear();
		vi.mocked(writeTextFile).mockClear();
		editorStore.addTab({ path: NOTE_PATH, name: 'Note.md', content: NOTE_CONTENT, savedContent: NOTE_CONTENT });
		editorStore.addTab({ path: CANVAS_1, name: 'Board-1.canvas', content: CANVAS_1_JSON, savedContent: CANVAS_1_JSON, fileType: 'canvas' });
		render();
		await settle();

		typeInCard('edited in canvas');
		await closeActiveTab();
		flushSync();
		vi.advanceTimersByTime(5000);
		await settle();

		const saved = vi.mocked(writeTextFile).mock.calls.some(
			([p, c]) => String(p) === CANVAS_1 && String(c).includes('edited in canvas'),
		);
		expect(saved || vi.mocked(ask).mock.calls.length > 0).toBe(true);
	});

	it('F21: an edit typed <300 ms before a canvas-to-canvas switch is kept in the first canvas', async () => {
		editorStore.addTab({ path: CANVAS_1, name: 'Board-1.canvas', content: CANVAS_1_JSON, savedContent: CANVAS_1_JSON, fileType: 'canvas' });
		editorStore.addTab({ path: CANVAS_2, name: 'Board-2.canvas', content: CANVAS_2_JSON, savedContent: CANVAS_2_JSON, fileType: 'canvas' });
		switchTab(0);
		render();
		await settle();

		typeInCard('last words');
		switchTab(1);
		flushSync();
		await settle();
		vi.advanceTimersByTime(1000);
		flushSync();

		expect(tab(CANVAS_1).content).toContain('last words');
	});

	it('F21 (stale flag): leaving canvas 2 for a note after a canvas-to-canvas switch leaves the note intact', async () => {
		editorStore.addTab({ path: CANVAS_1, name: 'Board-1.canvas', content: CANVAS_1_JSON, savedContent: CANVAS_1_JSON, fileType: 'canvas' });
		editorStore.addTab({ path: CANVAS_2, name: 'Board-2.canvas', content: CANVAS_2_JSON, savedContent: CANVAS_2_JSON, fileType: 'canvas' });
		editorStore.addTab({ path: NOTE_PATH, name: 'Note.md', content: NOTE_CONTENT, savedContent: NOTE_CONTENT });
		switchTab(0);
		render();
		await settle();

		typeInCard('last words');
		switchTab(1);
		flushSync();
		await settle();
		vi.advanceTimersByTime(1000); // no edit in Board-2: nothing re-arms the timer
		switchTab(2);
		flushSync();

		expect(tab(NOTE_PATH).content).toBe(NOTE_CONTENT);
	});

	it('F21 (shared undo history): Cmd+Z right after a canvas-to-canvas switch does not write canvas 1 into canvas 2', async () => {
		editorStore.addTab({ path: CANVAS_1, name: 'Board-1.canvas', content: CANVAS_1_JSON, savedContent: CANVAS_1_JSON, fileType: 'canvas' });
		editorStore.addTab({ path: CANVAS_2, name: 'Board-2.canvas', content: CANVAS_2_JSON, savedContent: CANVAS_2_JSON, fileType: 'canvas' });
		switchTab(0);
		render();
		await settle();

		switchTab(1); // no edit anywhere: just look at Board-2
		flushSync();
		await settle();
		pressInCanvas({ key: 'z', metaKey: true });

		expect(tab(CANVAS_2).content).not.toContain('card A');
		expect(tab(CANVAS_2).content).toBe(CANVAS_2_JSON);
	});
});
