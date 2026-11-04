// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// No mocks for stores or logic files — use real implementations per CLAUDE.md.
// Only the Tauri IPC boundary is mocked.
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve([])),
}));

// The session log file is the only other boundary: the widget writes QJS-PROFILE lines through it.
const mockWriteTextFile = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: () => Promise.resolve(true),
	mkdir: () => Promise.resolve(),
	writeTextFile: mockWriteTextFile,
}));
vi.mock('@tauri-apps/api/path', () => ({
	appLogDir: () => Promise.resolve('/logs'),
}));

import { invoke } from '@tauri-apps/api/core';
import { QueryjsBlockWidget, queryjsBlockRenderer } from '#lib/plugins/queryjs/queryjs-block-widget.js';
import { queryjsSessionStore } from '#lib/plugins/queryjs/queryjs-session.store.svelte.js';
import { trackChart } from '#lib/plugins/queryjs/queryjs-charts.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { flushLog, initLogSession, teardownLogSession } from '#lib/utils/log.service.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const JS = 'kb.view("scripts/demo")';

/** Builds a cached result element tagged so we can identify it in the DOM tree. */
function cachedElement(): HTMLElement {
	const el = document.createElement('div');
	el.className = 'cm-lp-qjs-block';
	el.dataset.cached = 'true';
	return el;
}

/** Resolves once the current render pass is over: the next animation frame, then a timer. */
function afterRenderPass(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

describe('QueryjsBlockWidget.toDOM — cache re-attach guard', () => {
	beforeEach(() => {
		queryjsSessionStore.reset();
		editorStore.reset();
		collectionStore.reset();
		document.body.replaceChildren();
		// Index ready + an active tab so toDOM gets past the "Building index..." guard.
		collectionStore.setPropertyIndex(new Map());
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		// Manual policy: a cache miss renders the ▶ Run prompt instead of executing
		// (no async invoke), so we can observe the fall-through synchronously.
		settingsStore.updateQueryjs({ autoRunQueries: 'manual' });
	});

	it('re-attaches the cached element when it is detached', () => {
		const cached = cachedElement();
		queryjsSessionStore.setResult('/vault/note.md', JS, cached);
		expect(cached.isConnected).toBe(false);

		const dom = new QueryjsBlockWidget(JS).toDOM();

		// Cache hit: the detached cached node is re-parented into the new container.
		expect(dom.contains(cached)).toBe(true);
		expect(dom.querySelector('.cm-lp-qjs-run')).toBeNull();
	});

	it('does NOT steal the cached element while it is still connected elsewhere', () => {
		const cached = cachedElement();
		queryjsSessionStore.setResult('/vault/note.md', JS, cached);
		// Simulate an identical block already rendered and on screen.
		document.body.appendChild(cached);
		expect(cached.isConnected).toBe(true);

		const dom = new QueryjsBlockWidget(JS).toDOM();

		// The live element stays where it was — not moved into the new container.
		expect(cached.parentElement).toBe(document.body);
		expect(dom.contains(cached)).toBe(false);
		// Falls through to the cache-miss path: manual mode shows the ▶ Run prompt.
		expect(dom.querySelector('.cm-lp-qjs-run')).not.toBeNull();
	});

	it('two identical visible blocks each render their own DOM (no blanking)', () => {
		const cached = cachedElement();
		cached.textContent = 'first block result';
		queryjsSessionStore.setResult('/vault/note.md', JS, cached);

		// First block owns the cached element (still connected).
		const first = new QueryjsBlockWidget(JS).toDOM();
		first.appendChild(cached); // mimic the first widget holding the live result
		document.body.appendChild(first);
		expect(first.contains(cached)).toBe(true);

		// Second identical block renders — must not pull the cached node out of the first.
		const second = new QueryjsBlockWidget(JS).toDOM();

		expect(first.contains(cached)).toBe(true);
		expect(second.contains(cached)).toBe(false);
		expect(second.querySelector('.cm-lp-qjs-run')).not.toBeNull();
	});

	it('shows the building-index placeholder when the index is not ready', () => {
		collectionStore.reset(); // isIndexReady -> false (captured at construction)
		const dom = new QueryjsBlockWidget(JS).toDOM();

		expect(dom.querySelector('.cm-lp-qjs-loading')?.textContent).toBe('Building index...');
	});

	it('clicking Run in manual mode runs the block without marking the file as auto-run', async () => {
		invalidateVaultEntries();
		const dom = new QueryjsBlockWidget('kb.paragraph("ran")').toDOM();

		dom.querySelector<HTMLButtonElement>('.cm-lp-qjs-run')!.click();

		await vi.waitFor(() => expect(dom.querySelector('p')?.textContent).toBe('ran'));
		expect(queryjsSessionStore.hasAutoRun('/vault/note.md')).toBe(false);
	});
});

describe('QueryjsBlockWidget.toDOM — index readiness is read live', () => {
	beforeEach(() => {
		queryjsSessionStore.reset();
		editorStore.reset();
		collectionStore.reset();
		document.body.replaceChildren();
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		settingsStore.updateQueryjs({ autoRunQueries: 'manual' });
	});

	it('renders content when the index became ready AFTER construction', () => {
		// Startup race (audit HIGH finding 4): the auto-opened note renders
		// before the deferred buildPropertyIndex() completes, so widgets are
		// constructed while isIndexReady is still false.
		const widget = new QueryjsBlockWidget(JS);
		collectionStore.setPropertyIndex(new Map()); // index becomes ready

		const dom = widget.toDOM();

		// toDOM must read the LIVE store value, not the construction snapshot
		// — otherwise the block shows "Building index..." forever (scroll
		// re-entry re-calls toDOM on the same stale widget instance).
		expect(dom.textContent).not.toContain('Building index...');
		expect(dom.querySelector('.cm-lp-qjs-run')).not.toBeNull();
	});

	it('still shows the placeholder while the index is genuinely not ready', () => {
		const widget = new QueryjsBlockWidget(JS);

		const dom = widget.toDOM();

		expect(dom.querySelector('.cm-lp-qjs-loading')?.textContent).toBe('Building index...');
	});

	it('the renderer\'s rebuild signal reads the index readiness', () => {
		expect(queryjsBlockRenderer.rebuildOn?.()).toBe(false);
		collectionStore.setPropertyIndex(new Map());
		expect(queryjsBlockRenderer.rebuildOn?.()).toBe(true);
	});
});

describe('QueryjsBlockWidget.execute - vault entries snapshot', () => {
	/** Number of `get_all_vault_entries_v2` IPCs fired so far. */
	const entriesCalls = () =>
		vi.mocked(invoke).mock.calls.filter((c) => c[0] === 'get_all_vault_entries_v2').length;

	beforeEach(() => {
		vi.clearAllMocks();
		queryjsSessionStore.reset();
		editorStore.reset();
		collectionStore.reset();
		vaultStore._reset();
		document.body.replaceChildren();
		collectionStore.setPropertyIndex(new Map());
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		// 'always' so every cache miss executes - the path that fetches entries.
		settingsStore.updateQueryjs({ autoRunQueries: 'always' });
		// Module-level memo: without this the previous test's snapshot leaks in.
		invalidateVaultEntries();
		vaultStore.bumpVaultIndexVersion(1);
	});

	it('fetches the entries snapshot once per index version across widget renders', async () => {
		new QueryjsBlockWidget('/* one */').toDOM();
		new QueryjsBlockWidget('/* two */').toDOM();

		// Let both execute() bodies settle.
		await Promise.resolve();
		await Promise.resolve();

		// One IPC per index version, not one per widget render.
		expect(entriesCalls()).toBe(1);
	});

	it('refetches once the index version moves', async () => {
		new QueryjsBlockWidget('/* one */').toDOM();
		await Promise.resolve();
		await Promise.resolve();
		expect(entriesCalls()).toBe(1);

		vaultStore.bumpVaultIndexVersion(2);
		new QueryjsBlockWidget('/* two */').toDOM();
		await Promise.resolve();
		await Promise.resolve();

		expect(entriesCalls()).toBe(2);
	});
});

describe('QueryjsBlockWidget.toDOM — first-open marks the file after the render pass', () => {
	const FILE = '/vault/note.md';

	beforeEach(() => {
		vi.clearAllMocks();
		queryjsSessionStore.reset();
		editorStore.reset();
		collectionStore.reset();
		invalidateVaultEntries();
		collectionStore.setPropertyIndex(new Map());
		editorStore.addTab({ path: FILE, name: 'note.md', content: '', savedContent: '' });
		settingsStore.updateQueryjs({ autoRunQueries: 'first-open' });
	});

	// Let a scheduled mark land here, not inside the next test.
	afterEach(() => afterRenderPass());

	it('auto-runs every block built in the first render pass of a file', async () => {
		const first = new QueryjsBlockWidget('kb.paragraph("one")').toDOM();
		const second = new QueryjsBlockWidget('kb.paragraph("two")').toDOM();

		expect(first.querySelector('.cm-lp-qjs-run')).toBeNull();
		expect(second.querySelector('.cm-lp-qjs-run')).toBeNull();
		await vi.waitFor(() => expect(first.querySelector('p')?.textContent).toBe('one'));
		await vi.waitFor(() => expect(second.querySelector('p')?.textContent).toBe('two'));
	});

	it('marks the file once the render pass is over, so a block built later shows Run', async () => {
		new QueryjsBlockWidget('kb.paragraph("one")').toDOM();
		expect(queryjsSessionStore.hasAutoRun(FILE)).toBe(false);

		await afterRenderPass();

		expect(queryjsSessionStore.hasAutoRun(FILE)).toBe(true);
		// A block first built on scroll, or a cache miss after an edit.
		const later = new QueryjsBlockWidget('kb.paragraph("later")').toDOM();
		expect(later.querySelector('.cm-lp-qjs-run')).not.toBeNull();
	});

	it('a cache hit in the first pass does not mark the file', async () => {
		const cached = cachedElement();
		queryjsSessionStore.setResult(FILE, JS, cached);

		new QueryjsBlockWidget(JS).toDOM();
		await afterRenderPass();

		expect(queryjsSessionStore.hasAutoRun(FILE)).toBe(false);
	});

	it('manual mode never marks the file, even after the render pass', async () => {
		settingsStore.updateQueryjs({ autoRunQueries: 'manual' });

		const dom = new QueryjsBlockWidget('kb.paragraph("one")').toDOM();
		await afterRenderPass();

		expect(dom.querySelector('.cm-lp-qjs-run')).not.toBeNull();
		expect(queryjsSessionStore.hasAutoRun(FILE)).toBe(false);
	});

	it('always auto-runs a block built after the render pass', async () => {
		settingsStore.updateQueryjs({ autoRunQueries: 'always' });
		new QueryjsBlockWidget('kb.paragraph("one")').toDOM();
		await afterRenderPass();

		const later = new QueryjsBlockWidget('kb.paragraph("later")').toDOM();

		expect(later.querySelector('.cm-lp-qjs-run')).toBeNull();
	});
});

describe('QueryjsBlockWidget.toDOM — run-prompt log line', () => {
	beforeEach(async () => {
		queryjsSessionStore.reset();
		editorStore.reset();
		collectionStore.reset();
		invalidateVaultEntries();
		collectionStore.setPropertyIndex(new Map());
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		settingsStore.updateQueryjs({ autoRunQueries: 'first-open' });
		await initLogSession();
	});

	afterEach(() => {
		teardownLogSession();
		mockWriteTextFile.mockClear();
	});

	/** QJS-PROFILE lines written to the session log. */
	async function profileLines(): Promise<string[]> {
		await flushLog();
		return mockWriteTextFile.mock.calls
			.flatMap((call) => String((call as unknown[])[1]).split('\n'))
			.filter((l) => l.includes('[QJS-PROFILE]'));
	}

	it('under first-open, a block built after the first render pass logs the run-prompt line without its script', async () => {
		const first = new QueryjsBlockWidget('kb.paragraph("first secret")').toDOM();
		await afterRenderPass();
		const second = new QueryjsBlockWidget('kb.paragraph("second secret")').toDOM();

		expect(first.querySelector('.cm-lp-qjs-run')).toBeNull();
		expect(second.querySelector('.cm-lp-qjs-run')).not.toBeNull();
		const prompts = (await profileLines()).filter((l) => l.includes('run prompt'));
		expect(prompts).toHaveLength(1);
		expect(prompts[0]).toMatch(/\[QJS-PROFILE\] toDOM\(\) cache MISS — run prompt \(first-open\)$/);
		expect(prompts[0]).not.toContain('second secret');
	});
});

describe('QueryjsBlockWidget - a result belongs to the file that ran it', () => {
	const A = '/vault/a.md';
	const B = '/vault/b.md';
	/** Same block text in both notes; its output depends on the note it runs in. */
	const SCRIPT = 'kb.paragraph(kb.current()?.file.path ?? "no current page")';
	const ENTRIES = [entryV2(A), entryV2(B)];

	/** Property-index record: KBAPI builds its pages (and `kb.current()`) from these. */
	function record(path: string): PropertyIndexRecord {
		const basename = path.split('/').pop()!.replace(/\.md$/, '');
		return {
			path,
			name: `${basename}.md`,
			basename,
			folder: '/vault',
			ext: 'md',
			mtime: 0,
			ctime: 0,
			size: 0,
			properties: new Map(),
		};
	}

	beforeEach(() => {
		vi.clearAllMocks();
		queryjsSessionStore.reset();
		editorStore.reset();
		collectionStore.reset();
		vaultStore._reset();
		document.body.replaceChildren();
		collectionStore.setPropertyIndex(new Map([A, B].map((path) => [path, record(path)])));
		settingsStore.updateQueryjs({ autoRunQueries: 'always' });
		vi.mocked(invoke).mockImplementation((cmd: string) =>
			Promise.resolve(cmd === 'get_all_vault_entries_v2' ? ENTRIES : []),
		);
		invalidateVaultEntries();
		vaultStore.bumpVaultIndexVersion(1);
		editorStore.addTab({ path: A, name: 'a.md', content: '', savedContent: '' });
		editorStore.addTab({ path: B, name: 'b.md', content: '', savedContent: '' });
		editorStore.setActiveIndex(0);
	});

	afterEach(() => {
		vi.mocked(invoke).mockImplementation(() => Promise.resolve([]));
	});

	it('two notes with identical block text each show their own result', async () => {
		const domA = new QueryjsBlockWidget(SCRIPT).toDOM();
		await vi.waitFor(() => expect(domA.textContent).toContain(A));
		// domA stays detached, as after CodeMirror drops a widget on a note switch.

		editorStore.setActiveIndex(1);
		const domB = new QueryjsBlockWidget(SCRIPT).toDOM();

		await vi.waitFor(() => expect(domB.textContent).toContain(B));
		expect(domB.textContent).not.toContain(A);
		expect(domB.contains(domA)).toBe(false);
	});

	it('a block run after a property-index write sees the new value, not the shared page set of the earlier run', async () => {
		const STATUS = 'kb.paragraph(String(kb.current()?.status ?? "none"))';
		const first = new QueryjsBlockWidget(STATUS).toDOM();
		await vi.waitFor(() => expect(first.querySelector('p')?.textContent).toBe('none'));

		collectionStore.updateRecord(A, { ...record(A), properties: new Map([['status', 'done']]) });
		// Different block text, so the session result cache does not serve the first run.
		const second = new QueryjsBlockWidget(`${STATUS};`).toDOM();

		await vi.waitFor(() => expect(second.querySelector('p')?.textContent).toBe('done'));
	});

	it("kb.pages() leaves out the settings' system folder", async () => {
		const TEMPLATE = '/vault/tpl/t.md';
		collectionStore.setPropertyIndex(new Map([A, B, TEMPLATE].map((path) => [path, record(path)])));
		vaultStore.open('/vault');
		const original = settingsStore.templates.systemFolder;
		settingsStore.updateTemplates({ systemFolder: 'tpl' });
		try {
			const dom = new QueryjsBlockWidget('kb.paragraph(kb.pagePaths().array().join(","))').toDOM();
			await vi.waitFor(() => expect(dom.querySelector('p')?.textContent).toBe(`${A},${B}`));
		} finally {
			settingsStore.updateTemplates({ systemFolder: original });
		}
	});

	it('execute runs against the file toDOM saw, even when the tab switches during the await', async () => {
		let release: (() => void) | undefined;
		vi.mocked(invoke).mockImplementation((cmd: string) =>
			cmd === 'get_all_vault_entries_v2'
				? new Promise((resolve) => {
						release = () => resolve(ENTRIES);
					})
				: Promise.resolve([]),
		);

		const dom = new QueryjsBlockWidget(SCRIPT).toDOM();
		await vi.waitFor(() => expect(release).toBeDefined());
		// Fast prev/next: the active tab moves before the entries snapshot resolves.
		editorStore.setActiveIndex(1);
		release!();

		await vi.waitFor(() => expect(dom.querySelector('p')).not.toBeNull());
		expect(dom.querySelector('p')?.textContent).toBe(A);
		expect(queryjsSessionStore.getResult(A, SCRIPT)).toBe(dom);
		expect(queryjsSessionStore.hasResult(B, SCRIPT)).toBe(false);
	});
});

describe('QueryjsBlockWidget.destroy - charts of a result the cache no longer holds', () => {
	/** A result container holding one tracked chart, as execute() leaves it. */
	function resultWithChart(): { el: HTMLElement; destroy: ReturnType<typeof vi.fn> } {
		const el = cachedElement();
		const canvas = document.createElement('canvas');
		el.appendChild(canvas);
		const destroy = vi.fn();
		trackChart(canvas, { destroy });
		return { el, destroy };
	}

	beforeEach(() => {
		queryjsSessionStore.reset();
		document.body.replaceChildren();
	});

	it('destroys the charts of a result dropped while it was on screen', () => {
		const { el, destroy } = resultWithChart();
		document.body.appendChild(el);
		queryjsSessionStore.setResult('/vault/note.md', JS, el);
		queryjsSessionStore.clearResults(); // a save, while the block is visible
		expect(destroy).not.toHaveBeenCalled();

		// CodeMirror removes the widget whose DOM is the result container.
		el.remove();
		new QueryjsBlockWidget(JS).destroy(el);

		expect(destroy).toHaveBeenCalledTimes(1);
	});

	it('destroys the charts of a re-attached result the cache dropped', () => {
		const { el, destroy } = resultWithChart();
		const wrapper = document.createElement('div');
		wrapper.appendChild(el); // toDOM's cache-hit path wraps the cached node

		new QueryjsBlockWidget(JS).destroy(wrapper);

		expect(destroy).toHaveBeenCalledTimes(1);
	});

	it('keeps the charts of a run still in flight (it caches the container when it settles)', async () => {
		collectionStore.setPropertyIndex(new Map());
		editorStore.reset();
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		settingsStore.updateQueryjs({ autoRunQueries: 'always' });
		let release: (() => void) | undefined;
		vi.mocked(invoke).mockImplementation((cmd: string) =>
			cmd === 'get_all_vault_entries_v2'
				? new Promise((resolve) => {
						release = () => resolve([]);
					})
				: Promise.resolve([]),
		);
		invalidateVaultEntries();
		const widget = new QueryjsBlockWidget('/* in flight */');
		const dom = widget.toDOM();
		const canvas = document.createElement('canvas');
		dom.appendChild(canvas);
		const destroy = vi.fn();
		trackChart(canvas, { destroy });
		await vi.waitFor(() => expect(release).toBeDefined());

		widget.destroy(dom); // scrolled out before the run settled
		release!();
		await vi.waitFor(() => expect(queryjsSessionStore.getResult('/vault/note.md', '/* in flight */')).toBe(dom));

		expect(destroy).not.toHaveBeenCalled();
		vi.mocked(invoke).mockImplementation(() => Promise.resolve([]));
	});

	it('destroys the charts of a failed run when the user clicks Run again', async () => {
		collectionStore.setPropertyIndex(new Map());
		editorStore.reset();
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		settingsStore.updateQueryjs({ autoRunQueries: 'always' });
		invalidateVaultEntries();
		const dom = new QueryjsBlockWidget('throw new Error("boom")').toDOM();
		document.body.appendChild(dom);
		await vi.waitFor(() => expect(dom.querySelector('.cm-lp-qjs-error')).not.toBeNull());
		// A chart the script drew before it threw.
		const canvas = document.createElement('canvas');
		dom.insertBefore(canvas, dom.firstChild);
		const destroy = vi.fn();
		trackChart(canvas, { destroy });

		dom.querySelector<HTMLButtonElement>('.cm-lp-qjs-error .cm-lp-qjs-run')!.click();

		expect(destroy).toHaveBeenCalledTimes(1);
		await vi.waitFor(() => expect(dom.querySelector('.cm-lp-qjs-error')).not.toBeNull());
	});

	it('nests the Run again button with no sized wrapper between it and the error box', async () => {
		// The `.cm-lp-qjs-error .cm-lp-qjs-run` size in styles.ts assumes exactly this chain.
		collectionStore.setPropertyIndex(new Map());
		editorStore.reset();
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		settingsStore.updateQueryjs({ autoRunQueries: 'always' });
		invalidateVaultEntries();
		const dom = new QueryjsBlockWidget('throw new Error("nest")').toDOM();
		await vi.waitFor(() => expect(dom.querySelector('.cm-lp-qjs-error')).not.toBeNull());

		const retry = dom.querySelector<HTMLButtonElement>('.cm-lp-qjs-run')!;
		expect(retry.textContent).toBe('▶ Run again');
		expect(retry.parentElement?.className).toBe('cm-lp-qjs-error');
		expect(retry.parentElement?.parentElement).toBe(dom);
		expect(dom.className).toBe('cm-lp-qjs-block');
	});

	it('destroys the charts of a run that failed after its widget was destroyed', async () => {
		collectionStore.setPropertyIndex(new Map());
		editorStore.reset();
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		settingsStore.updateQueryjs({ autoRunQueries: 'always' });
		let release: (() => void) | undefined;
		vi.mocked(invoke).mockImplementation((cmd: string) =>
			cmd === 'get_all_vault_entries_v2'
				? new Promise((resolve) => {
						release = () => resolve([]);
					})
				: Promise.resolve([]),
		);
		invalidateVaultEntries();
		const widget = new QueryjsBlockWidget('throw new Error("late boom")');
		const dom = widget.toDOM();
		const canvas = document.createElement('canvas');
		dom.appendChild(canvas);
		const destroy = vi.fn();
		trackChart(canvas, { destroy });
		await vi.waitFor(() => expect(release).toBeDefined());

		widget.destroy(dom); // scrolled out before the run settled; dom is detached
		release!();
		await vi.waitFor(() => expect(dom.querySelector('.cm-lp-qjs-error')).not.toBeNull());

		expect(destroy).toHaveBeenCalledTimes(1);
		expect(queryjsSessionStore.hasResult('/vault/note.md', 'throw new Error("late boom")')).toBe(false);
		vi.mocked(invoke).mockImplementation(() => Promise.resolve([]));
	});

	it('keeps the charts of a failed run whose widget is still on screen', async () => {
		collectionStore.setPropertyIndex(new Map());
		editorStore.reset();
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		settingsStore.updateQueryjs({ autoRunQueries: 'always' });
		let release: (() => void) | undefined;
		vi.mocked(invoke).mockImplementation((cmd: string) =>
			cmd === 'get_all_vault_entries_v2'
				? new Promise((resolve) => {
						release = () => resolve([]);
					})
				: Promise.resolve([]),
		);
		invalidateVaultEntries();
		const widget = new QueryjsBlockWidget('throw new Error("visible boom")');
		const dom = widget.toDOM();
		document.body.appendChild(dom);
		// A chart the script drew before it threw.
		const canvas = document.createElement('canvas');
		dom.appendChild(canvas);
		const destroy = vi.fn();
		trackChart(canvas, { destroy });
		await vi.waitFor(() => expect(release).toBeDefined());

		release!();
		await vi.waitFor(() => expect(dom.querySelector('.cm-lp-qjs-error')).not.toBeNull());

		expect(destroy).not.toHaveBeenCalled();
		expect(canvas.parentElement).toBe(dom);
		expect(dom.querySelector('.cm-lp-qjs-error-title')?.textContent).toBe('QueryJS error: visible boom');
		expect(queryjsSessionStore.hasResult('/vault/note.md', 'throw new Error("visible boom")')).toBe(false);
		vi.mocked(invoke).mockImplementation(() => Promise.resolve([]));
	});

	it('keeps the charts of a result that is still cached (scroll-out, re-attached later)', () => {
		const { el, destroy } = resultWithChart();
		queryjsSessionStore.setResult('/vault/note.md', JS, el);
		const wrapper = document.createElement('div');
		wrapper.appendChild(el);

		new QueryjsBlockWidget(JS).destroy(el);
		new QueryjsBlockWidget(JS).destroy(wrapper);

		expect(destroy).not.toHaveBeenCalled();
	});
});
