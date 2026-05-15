import { WidgetType } from '@codemirror/view';
import { invoke } from '$lib/api';
import { appendLog } from '$lib/utils/log.service';
import { profileStart, profileEnd } from '../core/profiling';
import { KBAPI } from '$lib/plugins/queryjs/kb-api';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { queryjsSessionStore } from '$lib/plugins/queryjs/queryjs-session.store.svelte';
import { loadExternalScript } from '$lib/plugins/queryjs/queryjs.service';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

/**
 * Module-level shim for the legacy `invalidateQueryjsCache()` API. The Phase
 * 12 refactor moved cache state into `queryjsSessionStore`, but
 * `editor.hooks.ts → notifyAfterSave` still calls the function by name.
 *
 * Forwards to `clearResults()` — drops every cached rendered DOM but KEEPS
 * the `autoRunOnFirstOpen` markers. If we called `reset()` instead, every
 * save would also clear the per-file autoRun marker, which would silently
 * make the `'first-open'` policy auto-execute again on the next render
 * instead of showing the ▶ Run button (the entire point of cache
 * invalidation on save). The autoRun marker is per-file, not per-content,
 * and survives content edits intentionally.
 *
 * **Deletion plan:** Phase 12.5 will migrate the call site to per-block
 * `queryjsSessionStore.invalidate(contentHash)` (more granular, only drops
 * the just-edited blocks) and remove the shim.
 */
export function invalidateQueryjsCache(): void {
	queryjsSessionStore.clearResults();
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
		// CodeMirror's `mousedown` handler moves the cursor onto the line of
		// the widget — which makes `shouldShowSource(...)` return true and
		// destroys the widget BEFORE the click handler can fire. Stopping
		// propagation at mousedown keeps the widget mounted long enough for
		// the click to reach our handler. Same pattern as
		// `code-block-widget.ts` and the meta-bind / callout / table buttons.
		button.addEventListener('mousedown', (e) => e.stopPropagation());
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
		const _t = profileStart('qjs-execute');

		// Render loading indicator immediately. Replaced by the script's DOM on success
		// or by the structured error block on failure.
		const loading = document.createElement('div');
		loading.className = 'cm-lp-qjs-loading';
		loading.textContent = 'Running query…';
		container.appendChild(loading);

		try {
			// Fetch the Rust VaultIndex snapshot once per widget render. The
			// snapshot covers tags / tasks / outgoing links — KBAPI uses it
			// instead of iterating noteIndexStore (gone in Phase 11.5k).
			const entries = await invoke<NoteEntryV2[]>('get_all_vault_entries_v2');
			const api = new KBAPI({
				container,
				propertyIndex: collectionStore.propertyIndex,
				entries,
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

			// Strip the loading indicator now that the script finished. The
			// script may or may not have written DOM into the container.
			loading.remove();

			// Cache the live container — `<canvas>` / `<video>` / `<iframe>`
			// state survives the widget being destroyed and re-mounted because
			// the DOM stays alive via this reference.
			queryjsSessionStore.setResult(this.jsContent, container);
		} catch (err) {
			loading.remove();
			this.renderStructuredError(container, err);
		}
	}

	/**
	 * Renders a script error as a title + collapsible stack trace + ▶ Run retry.
	 * Replaces the legacy `errorEl.textContent = "QueryJS Error: …"` flat string.
	 * The retry button re-runs the script (without re-marking autoRun, since the
	 * file is already past its first-open by the time an error happened).
	 */
	private renderStructuredError(container: HTMLElement, err: unknown): void {
		const wrapper = document.createElement('div');
		wrapper.className = 'cm-lp-qjs-error';

		const title = document.createElement('div');
		title.className = 'cm-lp-qjs-error-title';
		title.textContent = `QueryJS error: ${err instanceof Error ? err.message : String(err)}`;
		wrapper.appendChild(title);

		const stack = err instanceof Error ? err.stack : undefined;
		if (stack) {
			const details = document.createElement('details');
			details.className = 'cm-lp-qjs-error-details';
			const summary = document.createElement('summary');
			summary.textContent = 'Stack trace';
			details.appendChild(summary);
			const pre = document.createElement('pre');
			pre.className = 'cm-lp-qjs-error-stack';
			pre.textContent = stack;
			details.appendChild(pre);
			wrapper.appendChild(details);
		}

		const retry = document.createElement('button');
		retry.type = 'button';
		retry.className = 'cm-lp-qjs-run';
		retry.textContent = '▶ Run again';
		// Same `mousedown` stopPropagation as the initial Run button —
		// without it, CodeMirror moves the cursor to this line, destroys the
		// error widget, and the click lands on detached DOM.
		retry.addEventListener('mousedown', (e) => e.stopPropagation());
		retry.onclick = () => {
			container.replaceChildren();
			this.execute(container);
		};
		wrapper.appendChild(retry);

		container.appendChild(wrapper);
	}
}
