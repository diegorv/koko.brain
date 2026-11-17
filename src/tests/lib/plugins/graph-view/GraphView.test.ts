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
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { graphViewStore } from '#lib/plugins/graph-view/graph-view.store.svelte.js';
import { openGraphTab } from '#lib/plugins/graph-view/graph-view.service.js';
import GraphView from '#lib/plugins/graph-view/GraphView.svelte';
import { KOKOBRAIN_DEFAULT_THEME, LAVENDER_HAZE_THEME } from '#lib/core/settings/theme.logic.js';
import { applyTheme } from '#lib/core/settings/theme.service.js';
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

describe('GraphView states', () => {
	const ISOLATED = 'This note has no links yet';
	const LOADING = 'Building graph...';
	const EMPTY = 'No notes to graph yet';
	const ERROR = 'Could not build the graph.';

	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	const entries = () => [
		entryV2WithContent('/vault/a.md', 'Link to [[b]]'),
		entryV2('/vault/b.md'),
		entryV2('/vault/c.md'),
	];

	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		graphViewStore.reset();
		vaultStore._reset();
		vi.mocked(invoke).mockResolvedValue(entries());
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target.remove();
		vaultStore._reset();
	});

	function mountGraph() {
		component = mount(GraphView, { target });
		flushSync();
	}

	function openLocal(path: string) {
		editorStore.addTab({ path, name: path.split('/').pop()!, content: '', savedContent: '' });
		openGraphTab();
		graphViewStore.setMode('local');
	}

	/** A promise for `invoke` that the test resolves or rejects by hand. */
	function deferred() {
		let resolve!: (value: unknown) => void;
		let reject!: (reason: unknown) => void;
		const promise = new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		});
		return { promise, resolve, reject };
	}

	const alert = () => target.querySelector('[role="alert"]');

	it('tells a centered note with no links that it has none, with Orphans on', async () => {
		openLocal('/vault/c.md');

		mountGraph();

		await vi.waitFor(() => expect(target.textContent).toContain('1 notes'));
		expect(target.textContent).toContain(ISOLATED);
	});

	it('tells a centered note with no links that it has none, with Orphans off', async () => {
		openLocal('/vault/c.md');
		graphViewStore.setFilters({ showOrphans: false });

		mountGraph();

		await vi.waitFor(() => expect(target.textContent).toContain(ISOLATED));
		expect(target.textContent).toContain('0 notes');
	});

	it('shows no isolated message for a centered note with links', async () => {
		openLocal('/vault/a.md');

		mountGraph();

		await vi.waitFor(() => expect(target.textContent).toContain('2 notes'));
		expect(target.textContent).not.toContain(ISOLATED);
	});

	it('shows the loading line until the first snapshot, and not on later refreshes', async () => {
		const first = deferred();
		vi.mocked(invoke).mockReturnValueOnce(first.promise as Promise<never>);
		openGraphTab();

		mountGraph();

		expect(target.textContent).toContain(LOADING);

		first.resolve(entries());
		await vi.waitFor(() => expect(target.textContent).toContain('3 notes'));
		expect(target.textContent).not.toContain(LOADING);

		const refresh = deferred();
		vi.mocked(invoke).mockReturnValueOnce(refresh.promise as Promise<never>);
		vaultStore.bumpVaultIndexVersion(1);
		flushSync();

		expect(invoke).toHaveBeenCalledTimes(2);
		expect(target.textContent).not.toContain(LOADING);
		expect(target.textContent).toContain('3 notes');
		refresh.resolve(entries());
	});

	it('shows an empty state when the first snapshot has no notes', async () => {
		vi.mocked(invoke).mockResolvedValue([]);
		openGraphTab();

		mountGraph();

		await vi.waitFor(() => expect(target.textContent).toContain(EMPTY));
		expect(target.textContent).not.toContain(LOADING);
	});

	it('shows an alert with Retry when the load fails, and Retry loads the graph', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('ipc down'));
		openGraphTab();

		mountGraph();

		await vi.waitFor(() => expect(alert()).not.toBeNull());
		expect(alert()!.textContent).toContain(ERROR);
		const retry = Array.from(alert()!.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Retry');
		expect(retry).toBeDefined();

		retry!.click();

		await vi.waitFor(() => expect(target.textContent).toContain('3 notes'));
		expect(alert()).toBeNull();
		expect(target.textContent).not.toContain(ERROR);
	});

	it('keeps the previous graph and shows the alert when a refresh fails', async () => {
		openGraphTab();
		mountGraph();
		await vi.waitFor(() => expect(target.textContent).toContain('3 notes'));

		vi.mocked(invoke).mockRejectedValueOnce(new Error('ipc down'));
		vaultStore.bumpVaultIndexVersion(1);
		flushSync();

		await vi.waitFor(() => expect(alert()).not.toBeNull());
		expect(alert()!.textContent).toContain(ERROR);
		expect(target.textContent).toContain('3 notes');
	});
});

describe('GraphView theme', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		graphViewStore.reset();
		vi.mocked(invoke).mockResolvedValue([]);
		document.documentElement.style.cssText = '';
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target.remove();
		document.documentElement.style.cssText = '';
	});

	const background = () => target.querySelector<HTMLElement>('[data-testid="graph-view"]')!.style.background;

	it('paints the applied theme editor background and repaints on a theme switch', () => {
		applyTheme(LAVENDER_HAZE_THEME);
		component = mount(GraphView, { target });
		flushSync();

		expect(background()).toBe('rgb(243, 240, 248)');

		applyTheme(KOKOBRAIN_DEFAULT_THEME);
		flushSync();

		expect(background()).toBe('rgb(42, 46, 61)');
	});

	it('falls back to the fixed dark background when no theme tokens are set', () => {
		component = mount(GraphView, { target });
		flushSync();

		expect(background()).toBe('rgb(26, 26, 30)');
	});
});
