import { WidgetType } from '@codemirror/view';
import { appendLog } from '$lib/utils/log.service';
import { profileStart, profileEnd } from '../core/profiling';
import { KBAPI } from '$lib/plugins/queryjs/kb-api';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { loadExternalScript } from '$lib/plugins/queryjs/queryjs.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { queryjsSessionStore } from '$lib/plugins/queryjs/queryjs-session.store.svelte';

/**
 * Legacy compatibility shim. Callers in editor.hooks.ts and
 * watcher-handler.service.ts invoke this on save / vault index rebuild
 * to flush stale query results. Delegates to the new session store so
 * both the cached DOM references AND the per-note autoRun tracking get
 * reset in one call — matches the legacy "bump cacheVersion" semantics.
 */
export function invalidateQueryjsCache(): void {
	queryjsSessionStore.reset();
}

/**
 * Widget that renders a ```queryjs``` code block.
 *
 * Execution policy (settings.queryjs.autoRunQueries):
 *   - `'first-open'` (default): the first queryjs widget in a note that
 *     the session has never auto-run executes; subsequent identical-hash
 *     widgets cache-hit; edits to the block content produce a new hash
 *     and render the Run button instead of auto-executing.
 *   - `'always'`: every cache miss executes. Matches legacy behavior.
 *   - `'manual'`: cache misses render the Run button, never auto-execute.
 *
 * The cache stores a LIVE DOM reference (not a clone) — re-inserting
 * the same element into a new container preserves <canvas> pixel
 * buffers, <iframe>/<video> playback state and any other mutable state
 * without the legacy cloneNode exclusion dance.
 */
export class QueryjsBlockWidget extends WidgetType {
	private readonly isIndexReady: boolean;

	constructor(readonly jsContent: string) {
		super();
		this.isIndexReady = collectionStore.isIndexReady;
	}

	toDOM() {
		const container = document.createElement('div');
		container.className = 'cm-lp-qjs-block';

		const notePath = editorStore.activeTabPath;
		if (!this.isIndexReady || notePath === null) {
			const loading = document.createElement('div');
			loading.className = 'cm-lp-qjs-loading';
			loading.textContent = 'Building index...';
			container.appendChild(loading);
			return container;
		}

		const hit = queryjsSessionStore.getCached(this.jsContent);
		if (hit) {
			appendLog('QJS-PROFILE', `toDOM() cache HIT: ${this.jsContent.substring(0, 50)}`);
			// Live reference: moving it into the new container preserves any
			// canvas/iframe/video state that accumulated since the original run.
			container.appendChild(hit);
			return container;
		}

		const policy = settingsStore.queryjs.autoRunQueries;
		const shouldAutoRun =
			policy === 'always' ||
			(policy === 'first-open' && !queryjsSessionStore.hasAutoRun(notePath));

		if (shouldAutoRun) {
			appendLog('QJS-PROFILE', `toDOM() auto-run (${policy}): ${this.jsContent.substring(0, 50)}`);
			queryjsSessionStore.markAutoRun(notePath);
			this.execute(container, notePath);
			return container;
		}

		// Manual mode OR first-open mode with the note already auto-run at least
		// once (typical: block content was edited, producing a new hash).
		appendLog('QJS-PROFILE', `toDOM() Run button (${policy}): ${this.jsContent.substring(0, 50)}`);
		this.renderRunButton(container, notePath);
		return container;
	}

	eq(other: QueryjsBlockWidget) {
		return this.jsContent === other.jsContent && this.isIndexReady === other.isIndexReady;
	}

	ignoreEvent() {
		return false;
	}

	/** Renders a ▶ Run button that executes the script when clicked. */
	private renderRunButton(container: HTMLElement, notePath: string): void {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'cm-lp-qjs-run';
		btn.textContent = '▶ Run';
		btn.addEventListener('click', () => {
			container.innerHTML = '';
			this.execute(container, notePath);
		});
		container.appendChild(btn);
	}

	/** Renders a spinner-style loading indicator used while the script runs. */
	private renderLoading(container: HTMLElement): HTMLElement {
		const loading = document.createElement('div');
		loading.className = 'cm-lp-qjs-loading';
		loading.textContent = 'Running query…';
		container.appendChild(loading);
		return loading;
	}

	/** Renders the error state: a structured block with message, optional
	 * stack details, and a Run button to retry. */
	private renderError(container: HTMLElement, notePath: string, err: unknown): void {
		const message = err instanceof Error ? err.message : String(err);
		const stack = err instanceof Error && err.stack ? err.stack : null;

		const wrap = document.createElement('div');
		wrap.className = 'cm-lp-qjs-error';

		const title = document.createElement('div');
		title.className = 'cm-lp-qjs-error-title';
		title.textContent = `QueryJS Error: ${message}`;
		wrap.appendChild(title);

		if (stack) {
			const details = document.createElement('details');
			details.className = 'cm-lp-qjs-error-stack';
			const summary = document.createElement('summary');
			summary.textContent = 'Stack trace';
			const pre = document.createElement('pre');
			pre.textContent = stack;
			details.appendChild(summary);
			details.appendChild(pre);
			wrap.appendChild(details);
		}

		container.appendChild(wrap);
		this.renderRunButton(container, notePath);
	}

	/** Executes the queryjs script, awaits every `kb.view()` promise the user
	 * code kicked off (tracked by KBAPI), then caches the container element
	 * by content hash for later cache hits. */
	private async execute(container: HTMLElement, notePath: string): Promise<void> {
		const _t = profileStart();
		const loading = this.renderLoading(container);
		try {
			const api = new KBAPI({
				container,
				propertyIndex: collectionStore.propertyIndex,
				noteIndex: noteIndexStore.noteIndex,
				noteContents: noteIndexStore.noteContents,
				currentFilePath: notePath,
				vaultPath: vaultStore.path ?? '',
				loadScript: loadExternalScript,
			});

			const fn = new Function('kb', 'dv', `return (async () => { ${this.jsContent} })()`);
			await Promise.resolve(fn(api, api));
			// Wait for bare `kb.view(...)` calls the user didn't await —
			// replaces the legacy auto-await regex via KBAPI.awaitAllPending().
			await api.awaitAllPending();
			profileEnd('qjs-execute', _t);

			loading.remove();
			// Live DOM reference. No clone, no <canvas>/<video>/<iframe> exclusion.
			queryjsSessionStore.setCached(this.jsContent, notePath, container);
		} catch (err) {
			loading.remove();
			this.renderError(container, notePath, err);
		}
	}
}
