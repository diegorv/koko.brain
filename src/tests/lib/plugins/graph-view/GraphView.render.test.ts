// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';
import { createRecordingContext, installRecordingContext, type RecordingContext } from '../../../fixtures/canvas-context.fixture';

setupLocalStorage();

class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
// jsdom has no layout: give the graph container a size so the simulation starts.
Element.prototype.getBoundingClientRect = () =>
	({ x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON() {} }) as DOMRect;

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { graphViewStore } from '#lib/plugins/graph-view/graph-view.store.svelte.js';
import { openGraphTab } from '#lib/plugins/graph-view/graph-view.service.js';
import GraphView from '#lib/plugins/graph-view/GraphView.svelte';
import { entryV2, entryV2WithContent } from '../../../fixtures/vault-entries.fixture';

const NOTE_COUNT = 40;
// Sorts after every other note, so the id tiebreak alone would not place its label first.
const CENTER_NAME = 'zz The note this graph was opened from';
const CENTER_PATH = `/vault/${CENTER_NAME}.md`;

/** 39 unlinked notes with long names, and the center note. */
const entries = () => [
	...Array.from({ length: NOTE_COUNT - 1 }, (_, i) =>
		entryV2(`/vault/Meeting notes about the quarterly planning ${String(i).padStart(2, '0')}.md`),
	),
	entryV2(CENTER_PATH),
];

describe('GraphView labels', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;
	let recording: RecordingContext;

	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		graphViewStore.reset();
		vi.mocked(invoke).mockResolvedValue(entries());
		recording = createRecordingContext();
		installRecordingContext(recording);
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target.remove();
	});

	/** Opens the graph from the center note and mounts it at the default zoom. */
	function mountFromCenter(mode: 'global' | 'local') {
		editorStore.addTab({ path: CENTER_PATH, name: `${CENTER_NAME}.md`, content: '', savedContent: '' });
		openGraphTab();
		graphViewStore.setMode(mode);
		component = mount(GraphView, { target });
		flushSync();
	}

	/** The frames that drew `nodes` circles. */
	const framesWith = (nodes: number) => recording.frames.filter((f) => f.arcs === nodes);

	it('draws fewer labels than nodes when long labels overlap, keeping every orphan', async () => {
		mountFromCenter('global');

		await vi.waitFor(() => expect(framesWith(NOTE_COUNT).length).toBeGreaterThan(0));
		const labels = framesWith(NOTE_COUNT).at(-1)!.fillTexts;

		expect(labels.length).toBeGreaterThan(0);
		expect(labels.length).toBeLessThan(NOTE_COUNT);
	});

	it('draws the center note label in global mode', async () => {
		mountFromCenter('global');

		await vi.waitFor(() => expect(framesWith(NOTE_COUNT).length).toBeGreaterThan(0));

		for (const frame of framesWith(NOTE_COUNT)) {
			expect(frame.fillTexts.map((t) => t.text)).toContain(CENTER_NAME);
		}
	});

	it('draws the center note label in local mode', async () => {
		mountFromCenter('local');

		await vi.waitFor(() => expect(framesWith(1).length).toBeGreaterThan(0));

		expect(framesWith(1).at(-1)!.fillTexts.map((t) => t.text)).toEqual([CENTER_NAME]);
	});

	it('measures each label once across renders at the same zoom', async () => {
		mountFromCenter('global');

		await vi.waitFor(() => expect(framesWith(NOTE_COUNT).length).toBeGreaterThanOrEqual(2));
		const afterTwo = recording.measured.length;
		await vi.waitFor(() => expect(framesWith(NOTE_COUNT).length).toBeGreaterThanOrEqual(4));

		expect(afterTwo).toBe(NOTE_COUNT);
		expect(recording.measured.length).toBe(NOTE_COUNT);
		expect(new Set(recording.measured).size).toBe(NOTE_COUNT);
	});

	it('draws the highlighted node label and its neighbours labels in every frame', async () => {
		// 20 spokes of degree 2 (linked from both hubs) outrank the highlighted
		// note (degree 2, sorts after them) and its neighbours (degree 1), so only
		// forcing keeps those three labels when they overlap a spoke label.
		const spokes = Array.from({ length: 20 }, (_, i) => `Meeting notes about the quarterly planning ${String(i).padStart(2, '0')}`);
		const hubContent = spokes.map((s) => `[[${s}]]`).join(' ');
		const highlighted = 'zz Highlighted note with a long name';
		const neighbours = ['zz First neighbour with a long name', 'zz Second neighbour with a long name'];
		const linked = [
			entryV2WithContent('/vault/Hub one.md', hubContent),
			entryV2WithContent('/vault/Hub two.md', hubContent),
			...spokes.map((s) => entryV2(`/vault/${s}.md`)),
			entryV2WithContent(`/vault/${highlighted}.md`, neighbours.map((n) => `[[${n}]]`).join(' ')),
			...neighbours.map((n) => entryV2(`/vault/${n}.md`)),
		];
		vi.mocked(invoke).mockResolvedValue(linked);
		editorStore.addTab({ path: '/vault/Hub one.md', name: 'Hub one.md', content: '', savedContent: '' });
		openGraphTab();
		graphViewStore.setMode('global');
		graphViewStore.setHighlightedNode(`/vault/${highlighted}.md`);
		component = mount(GraphView, { target });
		flushSync();

		await vi.waitFor(() => expect(framesWith(linked.length).length).toBeGreaterThan(0));

		for (const frame of framesWith(linked.length)) {
			const texts = frame.fillTexts.map((t) => t.text);
			expect(texts).toContain(highlighted);
			for (const n of neighbours) expect(texts).toContain(n);
		}
	});
});
