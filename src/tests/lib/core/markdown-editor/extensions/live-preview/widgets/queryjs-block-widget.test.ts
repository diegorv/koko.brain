// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// No mocks for stores or logic files — use real implementations per CLAUDE.md.
// Only the Tauri IPC boundary is mocked.
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve([])),
}));

import { invoke } from '@tauri-apps/api/core';
import { QueryjsBlockWidget } from '$lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget';
import { queryjsSessionStore } from '$lib/plugins/queryjs/queryjs-session.store.svelte';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { invalidateVaultEntries } from '$lib/core/vault/vault-entries.service';

const JS = 'kb.view("scripts/demo")';

/** Builds a cached result element tagged so we can identify it in the DOM tree. */
function cachedElement(): HTMLElement {
	const el = document.createElement('div');
	el.className = 'cm-lp-qjs-block';
	el.dataset.cached = 'true';
	return el;
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
		queryjsSessionStore.setResult(JS, cached);
		expect(cached.isConnected).toBe(false);

		const dom = new QueryjsBlockWidget(JS).toDOM();

		// Cache hit: the detached cached node is re-parented into the new container.
		expect(dom.contains(cached)).toBe(true);
		expect(dom.querySelector('.cm-lp-qjs-run')).toBeNull();
	});

	it('does NOT steal the cached element while it is still connected elsewhere', () => {
		const cached = cachedElement();
		queryjsSessionStore.setResult(JS, cached);
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
		queryjsSessionStore.setResult(JS, cached);

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
});

describe('QueryjsBlockWidget.execute — vault entries snapshot', () => {
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
		// 'always' so every cache miss executes — the path that fetches entries.
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
