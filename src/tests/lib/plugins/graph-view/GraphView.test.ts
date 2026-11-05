// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
// jsdom has no layout: give the graph container a size so the simulation
// starts, and no 2D canvas, so render() returns early on a null context.
Element.prototype.getBoundingClientRect = () =>
	({ x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON() {} }) as DOMRect;
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { graphViewStore } from '#lib/plugins/graph-view/graph-view.store.svelte.js';
import { openGraphTab } from '#lib/plugins/graph-view/graph-view.service.js';
import GraphView from '#lib/plugins/graph-view/GraphView.svelte';
import { entryV2, entryV2WithContent } from '../../../fixtures/vault-entries.fixture';

const HINT = 'Open a note to see its local graph';

describe('GraphView local mode', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		graphViewStore.reset();
		// a links b; c is unrelated.
		vi.mocked(invoke).mockResolvedValue([
			entryV2WithContent('/vault/a.md', 'Link to [[b]]'),
			entryV2('/vault/b.md'),
			entryV2('/vault/c.md'),
		]);
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target.remove();
	});

	function mountGraph() {
		component = mount(GraphView, { target });
		flushSync();
	}

	it('shows the note the graph was opened from and its neighbours', async () => {
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: '', savedContent: '' });
		openGraphTab();
		graphViewStore.setMode('local');

		mountGraph();

		await vi.waitFor(() => expect(target.textContent).toContain('2 notes'));
		expect(target.textContent).toContain('1 links');
		expect(target.textContent).not.toContain(HINT);
	});

	it('shows the hint when the graph was opened with no note', async () => {
		openGraphTab();
		graphViewStore.setMode('local');

		mountGraph();

		await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('get_all_vault_entries_v2'));
		expect(target.textContent).toContain(HINT);
	});

	it('shows the whole vault in global mode', async () => {
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: '', savedContent: '' });
		openGraphTab();

		mountGraph();

		await vi.waitFor(() => expect(target.textContent).toContain('3 notes'));
		expect(target.textContent).not.toContain(HINT);
	});
});
