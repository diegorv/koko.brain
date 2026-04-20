import { WidgetType } from '@codemirror/view';
import { appendLog } from '$lib/utils/log.service';
import { profileStart, profileEnd } from '../core/profiling';
import { KBAPI } from '$lib/plugins/queryjs/kb-api';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { loadExternalScript } from '$lib/plugins/queryjs/queryjs.service';

/**
 * Module-level cache for queryjs script results.
 * Keyed by `jsContent:version` — reuses cached DOM when the script hasn't
 * changed and no save/tab-switch has occurred since the last execution.
 * Invalidated via incrementing cacheVersion on save (notifyAfterSave) or
 * tab switch, NOT on every keystroke (which would cause 600ms re-execution).
 */
const scriptResultCache = new Map<string, HTMLElement>();
let cacheVersion = 0;

/** Invalidates the queryjs cache. Call on save or tab switch. */
export function invalidateQueryjsCache(): void {
	cacheVersion++;
	scriptResultCache.clear();
}

/** Builds a cache key from script content + current version */
function cacheKey(jsContent: string): string {
	return `${jsContent}::${cacheVersion}`;
}

/** Widget that renders a ```queryjs code block by executing its JavaScript */
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

		// Check cache: if this exact script + index state was already executed, clone the result
		const key = cacheKey(this.jsContent);
		const cached = scriptResultCache.get(key);
		if (cached) {
			appendLog('QJS-PROFILE', `toDOM() cache HIT — skipping execution for: ${this.jsContent.substring(0, 50)}`);
			container.appendChild(cached.cloneNode(true));
			return container;
		}

		appendLog('QJS-PROFILE', `toDOM() cache MISS — executing: ${this.jsContent.substring(0, 50)}`);
		// Execute script asynchronously — errors are caught and shown inline
		this.execute(container);
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

	/** Executes the queryjs script inside the container */
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

			// Always wrap in an async IIFE so fn() returns a Promise we can await.
			// Without this, a bare `kb.view("…")` statement (no `await`) would
			// evaluate — kicking off the async load + render — but fn() would
			// return undefined synchronously, so the caller below would cache an
			// EMPTY container before the script finished appending DOM. Next
			// toDOM() call with the same cacheVersion would then clone the empty
			// snapshot and render nothing.
			//
			// Auto-prepend `await` to top-level `kb.view(…)` / `dv.view(…)` calls
			// so users don't have to remember — matches works the same whether
			// their code block writes `await kb.view(…)` or just `kb.view(…)`.
			// The negative lookbehind avoids touching member accesses like
			// `foo.kb.view(` and already-awaited calls are idempotent (double
			// `await` on the same Promise resolves to the same value).
			const autoAwaited = this.jsContent.replace(
				/(?<![\w.])(kb|dv)\.view\(/g,
				'await $1.view(',
			);
			const code = `return (async () => { ${autoAwaited} })()`;

			const fn = new Function('kb', 'dv', code);
			await Promise.resolve(fn(api, api));
		profileEnd('qjs-execute', _t);
		// Cache the rendered result for future toDOM() calls with same key,
		// UNLESS the container holds elements whose visual state isn't
		// preserved by cloneNode(true). Notably:
		//   - <canvas>: element is cloned but its pixel buffer is not, so a
		//     Chart.js radar/bar/etc. would clone as a blank square.
		//   - <video>/<iframe>: playback state / loaded content aren't cloned.
		// For those, re-execute every render — slower but correct. The
		// per-KBAPI _pageCache + O(1) outlinks resolution keep the re-exec
		// cost reasonable (~200 ms for a 1870-note vault).
		const hasUnclonable = container.querySelector('canvas, video, iframe') !== null;
		if (!hasUnclonable) {
			scriptResultCache.set(cacheKey(this.jsContent), container.cloneNode(true) as HTMLElement);
		}
		} catch (err) {
			const errorEl = document.createElement('div');
			errorEl.className = 'cm-lp-qjs-error';
			errorEl.textContent = `QueryJS Error: ${err instanceof Error ? err.message : String(err)}`;
			container.appendChild(errorEl);
		}
	}
}
