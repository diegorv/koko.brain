// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

// No mocks for stores or logic files — use real implementations per CLAUDE.md.

import { QueryjsBlockWidget } from '$lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget';
import { queryjsSessionStore } from '$lib/plugins/queryjs/queryjs-session.store.svelte';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';

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
