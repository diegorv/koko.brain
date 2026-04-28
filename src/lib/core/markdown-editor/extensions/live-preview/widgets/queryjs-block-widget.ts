import { WidgetType } from '@codemirror/view';
import { appendLog } from '$lib/utils/log.service';
import { profileStart, profileEnd } from '../core/profiling';
import { KBAPI } from '$lib/plugins/queryjs/kb-api';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { queryjsSessionStore } from '$lib/plugins/queryjs/queryjs-session.store.svelte';
import { loadExternalScript } from '$lib/plugins/queryjs/queryjs.service';

/**
 * Module-level shim for the legacy `invalidateQueryjsCache()` API. The Phase
 * 12 refactor moved cache state into `queryjsSessionStore`, but
 * `editor.hooks.ts → notifyAfterSave` still calls the function by name.
 * Forwards to the session store's reset (which wipes both result cache and
 * autoRun markers — same scope as the old "clear everything").
 *
 * **Deletion plan:** once Phase 12.5 lands, callers will be migrated to
 * `queryjsSessionStore.invalidate(contentHash)` (more granular, only drops
 * the saved file's own blocks).
 */
export function invalidateQueryjsCache(): void {
	queryjsSessionStore.reset();
}

/**
 * Renders a `` ```queryjs `` fenced block.
 *
 * Execution policy is governed by `settingsStore.queryjs.autoRunQueries`:
 *
 *   policy        cache hit       cache miss + first-open    cache miss after edit
 *   ───────────── ─────────────── ────────────────────────── ────────────────────────
 *   first-open    re-attach DOM   execute + mark autoRun     show ▶ Run button
 *   always        re-attach DOM   execute + mark autoRun     execute (re-render)
 *   manual        re-attach DOM   show ▶ Run button (1)      show ▶ Run button
 *
 *   (1) **Invariant:** clicking ▶ Run in `manual` mode does NOT mark the
 *   file as autoRun. A user who later switches the policy back to
 *   `first-open` should still get fresh execution on the next open of
 *   each file. Captured in queryjs-session.store.svelte.ts and ADR 0010.
 *
 * Cache key uses `jsContent` directly (no version suffix). Invalidation
 * is per-content via `queryjsSessionStore.invalidate(jsContent)`, called
 * from notifyAfterSave for each just-edited block.
 *
 * No auto-await regex, no canvas/video/iframe exclusions, no clone
 * semantics — `_pendingViews` (in KBAPI) handles unawaited `kb.view()` and
 * the cache holds the live element reference, so `<canvas>` / `<video>` /
 * `<iframe>` survive widget re-mount via shared DOM identity.
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

		if (!this.isIndexReady || editorStore.activeTabPath === null) {
			const loading = document.createElement('div');
			loading.className = 'cm-lp-qjs-loading';
			loading.textContent = 'Building index...';
			container.appendChild(loading);
			return container;
		}

		const filePath = editorStore.activeTabPath;

		// Cache hit: re-attach the cached element so its `<canvas>` / `<video>` /
		// `<iframe>` state survives widget re-mount.
		const cached = queryjsSessionStore.getResult(this.jsContent);
		if (cached) {
			appendLog('QJS-PROFILE', `toDOM() cache HIT — reattach: ${this.jsContent.substring(0, 50)}`);
			container.appendChild(cached);
			return container;
		}

		// Cache miss — decide whether to auto-run or show ▶ Run.
		const policy = settingsStore.queryjs.autoRunQueries;
		const shouldAutoRun =
			policy === 'always' ||
			(policy === 'first-open' && !queryjsSessionStore.hasAutoRun(filePath));

		if (shouldAutoRun) {
			appendLog('QJS-PROFILE', `toDOM() cache MISS — auto-run (${policy}): ${this.jsContent.substring(0, 50)}`);
			// First-open policy marks the file so subsequent renders without a
			// cache hit show the Run button. `always` also marks but it's
			// harmless — auto-run still triggers regardless. Manual mode never
			// reaches this branch.
			if (policy === 'first-open') queryjsSessionStore.markAutoRun(filePath);
			this.execute(container);
			return container;
		}

		// Manual mode, or first-open after the file has already auto-run once.
		// Show a ▶ Run placeholder; execution waits for the user click.
		this.renderRunPrompt(container);
		return container;
	}

	eq(other: QueryjsBlockWidget) {
		// Only compare jsContent — index size and tab path changes should NOT
		// cause script re-execution. The script re-executes when the user
		// edits the code block content (enters/exits the block via cursor).
		return (
			this.jsContent === other.jsContent &&
			this.isIndexReady === other.isIndexReady
		);
	}

	ignoreEvent() {
		return false;
	}

	/** Renders the placeholder + ▶ Run button shown when no cache and no auto-run. */
	private renderRunPrompt(container: HTMLElement): void {
		const placeholder = document.createElement('div');
		placeholder.className = 'cm-lp-qjs-loading';
		placeholder.textContent = 'Query not run yet';
		container.appendChild(placeholder);

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'cm-lp-qjs-run';
		button.textContent = '▶ Run';
		button.onclick = () => {
			// Manual mode never marks autoRun (see the invariant above) — only
			// first-open after a click "promotes" the file. We're already past
			// the auto-run branch, so this only fires after the user explicitly
			// clicks Run.
			container.replaceChildren();
			this.execute(container);
		};
		container.appendChild(button);
	}

	/** Executes the queryjs script inside the container. */
	private async execute(container: HTMLElement): Promise<void> {
		const _t = profileStart();
		try {
			const api = new KBAPI({
				container,
				propertyIndex: collectionStore.propertyIndex,
				noteIndex: noteIndexStore.noteIndex,
				noteContents: noteIndexStore.noteContents,
				currentFilePath: editorStore.activeTabPath ?? '',
				vaultPath: vaultStore.path ?? '',
				loadScript: loadExternalScript,
			});

			// Wrap in an async IIFE so the user code can `kb.view(...)` without
			// `await` — `awaitAllPending()` afterwards waits on every `view()`
			// the script kicked off. No regex rewriting, no string surgery.
			const code = `return (async () => { ${this.jsContent} })()`;
			const fn = new Function('kb', 'dv', code);
			await Promise.resolve(fn(api, api));
			await api.awaitAllPending();
			profileEnd('qjs-execute', _t);

			// Cache the live container — `<canvas>` / `<video>` / `<iframe>`
			// state survives the widget being destroyed and re-mounted because
			// the DOM stays alive via this reference.
			queryjsSessionStore.setResult(this.jsContent, container);
		} catch (err) {
			const errorEl = document.createElement('div');
			errorEl.className = 'cm-lp-qjs-error';
			errorEl.textContent = `QueryJS Error: ${err instanceof Error ? err.message : String(err)}`;
			container.appendChild(errorEl);
		}
	}
}
