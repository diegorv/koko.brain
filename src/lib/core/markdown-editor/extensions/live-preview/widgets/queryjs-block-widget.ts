import { WidgetType } from '@codemirror/view';
import { appendLog } from '$lib/utils/log.service';
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
		const _t = performance.now();
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

			// If script contains await, wrap in async IIFE.
			// Must prepend `return` so the promise is returned from the Function body,
			// otherwise it floats unhandled and errors escape try/catch.
			const code = this.jsContent.includes('await')
				? `return (async () => { ${this.jsContent} })()`
				: this.jsContent;

			const fn = new Function('kb', 'dv', code);
			await Promise.resolve(fn(api, api));
		appendLog('QJS-PROFILE', `execute() completed in ${(performance.now() - _t).toFixed(1)}ms`);
		// Cache the rendered result for future toDOM() calls with same key
		scriptResultCache.set(cacheKey(this.jsContent), container.cloneNode(true) as HTMLElement);
		} catch (err) {
			const errorEl = document.createElement('div');
			errorEl.className = 'cm-lp-qjs-error';
			errorEl.textContent = `QueryJS Error: ${err instanceof Error ? err.message : String(err)}`;
			container.appendChild(errorEl);
		}
	}
}
