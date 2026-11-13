import { WidgetType } from '@codemirror/view';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import type { FencedBlockRenderer } from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { profileStart, profileEnd } from '#lib/core/markdown-editor/extensions/live-preview/core/profiling.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { getVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { appendLog } from '#lib/utils/log.service.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { KBAPI, runQueryjsBlock } from './kb-api';
import { destroyChartsIn } from './queryjs-charts';
import { loadExternalScript } from './queryjs.service';
import { queryjsSessionStore } from './queryjs-session.store.svelte';

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
 * `queryjsSessionStore.invalidate(filePath, jsContent)` (more granular, only
 * drops the just-edited blocks) and remove the shim.
 */
export function invalidateQueryjsCache(): void {
	queryjsSessionStore.clearResults();
}

/** Containers whose `execute()` has not settled yet. */
const runningContainers = new WeakSet<HTMLElement>();

/** Files whose first-open mark is scheduled but not set yet. */
const pendingAutoRunMarks = new Set<string>();

/**
 * Marks `filePath` as auto-run once the current render pass is over, so every
 * block CodeMirror builds in that pass auto-runs, not only the first one.
 * CodeMirror draws widgets synchronously, then its measure pass in the next
 * animation frame can draw more lines: a timer queued from that frame runs
 * after it. Blocks first built on a later scroll show ▶ Run.
 */
function markAutoRunAfterRenderPass(filePath: string): void {
	if (pendingAutoRunMarks.has(filePath)) return;
	pendingAutoRunMarks.add(filePath);
	const mark = () =>
		setTimeout(() => {
			pendingAutoRunMarks.delete(filePath);
			queryjsSessionStore.markAutoRun(filePath);
		}, 0);
	if (typeof requestAnimationFrame === 'function') requestAnimationFrame(mark);
	else mark();
}

/**
 * Renders a `` ```queryjs `` fenced block.
 *
 * Execution policy is governed by `settingsStore.queryjs.autoRunQueries`:
 *
 *   policy        cache hit       cache miss + first-open    cache miss after edit
 *   ───────────── ─────────────── ────────────────────────── ────────────────────────
 *   first-open    re-attach DOM   execute + mark autoRun     show ▶ Run button
 *   always        re-attach DOM   execute                    execute (re-render)
 *   manual        re-attach DOM   show ▶ Run button (1)      show ▶ Run button
 *
 *   The first-open mark lands after the render pass, so every block of that
 *   pass auto-runs; a block first built on a later scroll shows ▶ Run.
 *
 *   (1) **Invariant:** clicking ▶ Run in `manual` mode does NOT mark the
 *   file as autoRun. A user who later switches the policy back to
 *   `first-open` should still get fresh execution on the next open of
 *   each file. Captured in queryjs-session.store.svelte.ts and ADR 0010.
 *
 * Cache key is the note's path plus `jsContent` (no version suffix): a
 * shared script reads `kb.current()`, so the same block text in two notes
 * renders two results (ADR 0010, amendment 2026-11-03). Every content
 * invalidation drops all results via `invalidateQueryjsCache()`.
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

		// Read readiness LIVE from the store, never from the construction
		// snapshot: widgets built before the deferred buildPropertyIndex()
		// completes (app-lifecycle Step 5b runs via setTimeout(0), after the
		// auto-opened note renders) would otherwise show "Building index..."
		// forever — scroll re-entry re-calls toDOM() on the same stale
		// instance. The snapshot (`this.isIndexReady`) still feeds eq() so a
		// forceDecorationRebuild after the flip replaces the placeholder DOM.
		// Mirrors collection-block-widget.ts.
		if (!collectionStore.isIndexReady || editorStore.activeTabPath === null) {
			const loading = document.createElement('div');
			loading.className = 'cm-lp-qjs-loading';
			loading.textContent = 'Building index...';
			container.appendChild(loading);
			return container;
		}

		const filePath = editorStore.activeTabPath;

		// Cache hit: re-attach the cached element so its `<canvas>` / `<video>` /
		// `<iframe>` state survives widget re-mount. Only re-attach when the
		// cached node is DETACHED — if it is still connected, an identical block
		// elsewhere on screen owns it and `appendChild` would steal that live DOM
		// (blanking the other block). Fall through to a fresh execution instead.
		// This guard exists only here: mermaid and block/inline math cache markup
		// STRINGS and collection caches the query DATA, so those widgets build
		// fresh DOM on every toDOM() and have no live node to steal.
		const cached = queryjsSessionStore.getResult(filePath, this.jsContent);
		if (cached && !cached.isConnected) {
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
			// First-open policy marks the file so later renders without a cache
			// hit show the Run button. The mark waits for the render pass so
			// every block built in it auto-runs. Manual mode never reaches this
			// branch.
			if (policy === 'first-open') markAutoRunAfterRenderPass(filePath);
			this.execute(container, filePath);
			return container;
		}

		// Manual mode, or first-open after the file has already auto-run once.
		// Show a ▶ Run placeholder; execution waits for the user click.
		this.renderRunPrompt(container, filePath);
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

	/**
	 * CodeMirror removed this widget's DOM. The result it shows is either the
	 * container itself (it ran here) or the container's child (re-attached from
	 * the cache). If the cache no longer holds it, nothing can show it again:
	 * destroy its charts. A result still cached keeps them for its re-attach,
	 * and the store destroys them when it drops it.
	 */
	destroy(dom: HTMLElement): void {
		// A run still in flight caches this container when it finishes.
		if (runningContainers.has(dom)) return;
		const child = dom.firstElementChild;
		const stillCached =
			queryjsSessionStore.holdsResult(dom) ||
			(child instanceof HTMLElement && queryjsSessionStore.holdsResult(child));
		if (!stillCached) destroyChartsIn(dom);
	}

	/** Renders the placeholder + ▶ Run button shown when no cache and no auto-run. */
	private renderRunPrompt(container: HTMLElement, filePath: string): void {
		// No script text here: it can quote note content, and logs go into bug reports.
		appendLog('QJS-PROFILE', `toDOM() cache MISS — run prompt (${settingsStore.queryjs.autoRunQueries})`);
		const placeholder = document.createElement('div');
		placeholder.className = 'cm-lp-qjs-loading';
		placeholder.textContent = 'Query not run yet';
		container.appendChild(placeholder);

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'cm-lp-qjs-run';
		button.textContent = '▶ Run';
		// CodeMirror's `mousedown` handler moves the cursor onto the line of
		// the widget — which reveals the block as source and
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
			destroyChartsIn(container);
			container.replaceChildren();
			this.execute(container, filePath);
		};
		container.appendChild(button);
	}

	/**
	 * Executes the queryjs script inside the container, for the note `toDOM`
	 * rendered it in. `filePath` is captured before the await on purpose: the
	 * active tab can move on (fast prev/next) before the entries resolve.
	 */
	private async execute(container: HTMLElement, filePath: string): Promise<void> {
		const _t = profileStart('qjs-execute');

		// Render loading indicator immediately. Replaced by the script's DOM on success
		// or by the structured error block on failure.
		const loading = document.createElement('div');
		loading.className = 'cm-lp-qjs-loading';
		loading.textContent = 'Running query…';
		container.appendChild(loading);
		runningContainers.add(container);

		try {
			// Rust VaultIndex snapshot, shared through the version-keyed memo:
			// one IPC per index version however many blocks render. The
			// snapshot covers tags / tasks / outgoing links — KBAPI uses it
			// instead of iterating noteIndexStore (gone in Phase 11.5k).
			const ipcStart = performance.now();
			const entries = await getVaultEntries();
			const bodyStart = performance.now();
			const api = new KBAPI({
				container,
				propertyIndex: collectionStore.propertyIndex,
				entries,
				propertyIndexVersion: collectionStore.version,
				currentFilePath: filePath,
				vaultPath: vaultStore.path ?? '',
				systemFolder: settingsStore.templates.systemFolder,
				loadScript: loadExternalScript,
			});

			await runQueryjsBlock(api, this.jsContent);
			profileEnd('qjs-execute', _t);
			appendLog(
				'QJS-PROFILE',
				`execute ipc=${(bodyStart - ipcStart).toFixed(1)}ms body=${(performance.now() - bodyStart).toFixed(1)}ms`,
			);

			// Strip the loading indicator now that the script finished. The
			// script may or may not have written DOM into the container.
			loading.remove();

			// Cache the live container — `<canvas>` / `<video>` / `<iframe>`
			// state survives the widget being destroyed and re-mounted because
			// the DOM stays alive via this reference.
			queryjsSessionStore.setResult(filePath, this.jsContent, container);
		} catch (err) {
			loading.remove();
			// A failed run is never cached. If its widget is already gone,
			// `destroy()` skipped it as in flight, so nothing else frees its charts.
			if (!container.isConnected) destroyChartsIn(container);
			this.renderStructuredError(container, err, filePath);
		} finally {
			runningContainers.delete(container);
		}
	}

	/**
	 * Renders a script error as a title + collapsible stack trace + ▶ Run retry.
	 * Replaces the legacy `errorEl.textContent = "QueryJS Error: …"` flat string.
	 * The retry button re-runs the script (without re-marking autoRun, since the
	 * file is already past its first-open by the time an error happened).
	 */
	private renderStructuredError(container: HTMLElement, err: unknown, filePath: string): void {
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
			// The failed run may have drawn charts before it threw; it was never cached.
			destroyChartsIn(container);
			container.replaceChildren();
			this.execute(container, filePath);
		};
		wrapper.appendChild(retry);

		container.appendChild(wrapper);
	}
}

/** Renders `` ```queryjs `` blocks; the app installs it in the editor's `fencedBlockRenderers`. */
export const queryjsBlockRenderer: FencedBlockRenderer = {
	language: 'queryjs',
	widget: (source) => new QueryjsBlockWidget(source),
	// A widget built before the property index is ready shows a placeholder.
	rebuildOn: () => collectionStore.isIndexReady,
};
