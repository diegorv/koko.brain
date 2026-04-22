// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { QueryjsBlockWidget, invalidateQueryjsCache } from '$lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget';
import { queryjsSessionStore } from '$lib/plugins/queryjs/queryjs-session.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';

/**
 * These tests exercise the decision tree in QueryjsBlockWidget.toDOM(),
 * not the KBAPI execution itself. The goal is to lock the policy
 * semantics so a future regression in autoRunOnFirstOpen / cache hit /
 * Run button logic fails here, loudly.
 */

function installFakeActive(notePath: string | null) {
	// The editor store exposes activeTabPath as a getter. We monkey-patch via
	// defineProperty to return the fake path for this test.
	Object.defineProperty(editorStore, 'activeTabPath', {
		configurable: true,
		get: () => notePath,
	});
}

describe('QueryjsBlockWidget.toDOM', () => {
	beforeEach(() => {
		queryjsSessionStore.reset();
		settingsStore.updateQueryjs({ autoRunQueries: 'first-open' });
		// collectionStore.isIndexReady defaults to false; we need it true for
		// the widget to go past the "Building index..." branch.
		Object.defineProperty(collectionStore, 'isIndexReady', {
			configurable: true,
			get: () => true,
		});
		installFakeActive('/note.md');
	});

	it('renders a "Building index..." placeholder when the index is not ready', () => {
		Object.defineProperty(collectionStore, 'isIndexReady', {
			configurable: true,
			get: () => false,
		});
		const widget = new QueryjsBlockWidget('kb.pages()');
		const dom = widget.toDOM();
		expect(dom.className).toBe('cm-lp-qjs-block');
		expect(dom.querySelector('.cm-lp-qjs-loading')?.textContent).toBe('Building index...');
	});

	it('cache hit — appends the cached element directly, no Run button, no execution', () => {
		const cached = document.createElement('div');
		cached.textContent = 'cached output';
		queryjsSessionStore.setCached('script-body', '/note.md', cached);

		const widget = new QueryjsBlockWidget('script-body');
		const dom = widget.toDOM();

		expect(dom.querySelector('.cm-lp-qjs-run')).toBeNull();
		expect(dom.contains(cached)).toBe(true);
		expect(dom.textContent).toBe('cached output');
	});

	describe("policy 'first-open'", () => {
		it('auto-runs on cache miss when the note has never auto-run this session', () => {
			settingsStore.updateQueryjs({ autoRunQueries: 'first-open' });
			expect(queryjsSessionStore.hasAutoRun('/note.md')).toBe(false);

			const widget = new QueryjsBlockWidget('kb.pages()');
			const dom = widget.toDOM();

			// No Run button — auto-ran
			expect(dom.querySelector('.cm-lp-qjs-run')).toBeNull();
			// Note is flagged as having auto-run
			expect(queryjsSessionStore.hasAutoRun('/note.md')).toBe(true);
		});

		it('shows Run button on cache miss after the note already auto-ran once', () => {
			settingsStore.updateQueryjs({ autoRunQueries: 'first-open' });
			queryjsSessionStore.markAutoRun('/note.md');

			const widget = new QueryjsBlockWidget('different-script');
			const dom = widget.toDOM();

			expect(dom.querySelector('.cm-lp-qjs-run')).not.toBeNull();
		});
	});

	describe("policy 'always'", () => {
		it('auto-runs every cache miss regardless of prior autoRun', () => {
			settingsStore.updateQueryjs({ autoRunQueries: 'always' });
			queryjsSessionStore.markAutoRun('/note.md');

			const widget = new QueryjsBlockWidget('kb.pages()');
			const dom = widget.toDOM();

			expect(dom.querySelector('.cm-lp-qjs-run')).toBeNull();
		});
	});

	describe("policy 'manual'", () => {
		it('shows Run button on every cache miss, even the first', () => {
			settingsStore.updateQueryjs({ autoRunQueries: 'manual' });

			const widget = new QueryjsBlockWidget('kb.pages()');
			const dom = widget.toDOM();

			expect(dom.querySelector('.cm-lp-qjs-run')).not.toBeNull();
			// Manual mode must NOT flip the autoRun flag — that would make a
			// later switch to 'first-open' skip the first-open behaviour.
			expect(queryjsSessionStore.hasAutoRun('/note.md')).toBe(false);
		});

		it('clicking Run triggers execution (clearing the placeholder)', () => {
			settingsStore.updateQueryjs({ autoRunQueries: 'manual' });

			const widget = new QueryjsBlockWidget('kb.pages()');
			const dom = widget.toDOM();

			const btn = dom.querySelector('.cm-lp-qjs-run') as HTMLButtonElement;
			expect(btn).not.toBeNull();

			btn.click();
			// After click the button is removed (container.innerHTML cleared before
			// execute appends its DOM). Execution is async; we only verify the
			// sync-visible effect of the click handler.
			expect(dom.querySelector('.cm-lp-qjs-run')).toBeNull();
		});
	});

	describe('invalidateQueryjsCache compatibility shim', () => {
		it('delegates to queryjsSessionStore.reset', () => {
			const spy = vi.spyOn(queryjsSessionStore, 'reset');
			invalidateQueryjsCache();
			expect(spy).toHaveBeenCalledTimes(1);
			spy.mockRestore();
		});
	});
});
