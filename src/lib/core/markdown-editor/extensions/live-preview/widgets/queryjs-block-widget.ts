import { WidgetType } from '@codemirror/view';
import { DVAPI } from '$lib/plugins/queryjs/dv-api';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { loadExternalScript } from '$lib/plugins/queryjs/queryjs.service';

/** Widget that renders a ```queryjs code block by executing its JavaScript */
export class QueryjsBlockWidget extends WidgetType {
	private readonly isIndexReady: boolean;
	private readonly indexSize: number;
	private readonly activeTabPath: string | null;

	constructor(readonly jsContent: string) {
		super();
		this.isIndexReady = collectionStore.isIndexReady;
		this.indexSize = collectionStore.propertyIndex.size;
		this.activeTabPath = editorStore.activeTabPath;
	}

	toDOM() {
		const container = document.createElement('div');
		container.className = 'cm-lp-dvjs-block';

		if (!this.isIndexReady || this.activeTabPath === null) {
			const loading = document.createElement('div');
			loading.className = 'cm-lp-dvjs-loading';
			loading.textContent = 'Building index...';
			container.appendChild(loading);
			return container;
		}

		// Execute script asynchronously — errors are caught and shown inline
		this.execute(container);
		return container;
	}

	eq(other: QueryjsBlockWidget) {
		return (
			this.jsContent === other.jsContent &&
			this.isIndexReady === other.isIndexReady &&
			this.indexSize === other.indexSize &&
			this.activeTabPath === other.activeTabPath
		);
	}

	ignoreEvent() {
		return false;
	}

	/** Executes the queryjs script inside the container */
	private async execute(container: HTMLElement): Promise<void> {
		try {
			const dv = new DVAPI({
				container,
				propertyIndex: collectionStore.propertyIndex,
				noteIndex: noteIndexStore.noteIndex,
				noteContents: noteIndexStore.noteContents,
				currentFilePath: this.activeTabPath ?? '',
				vaultPath: vaultStore.path ?? '',
				loadScript: loadExternalScript,
			});

			// Match Obsidian: if script contains await, wrap in async IIFE.
			// Must prepend `return` so the promise is returned from the Function body,
			// otherwise it floats unhandled and errors escape try/catch.
			const code = this.jsContent.includes('await')
				? `return (async () => { ${this.jsContent} })()`
				: this.jsContent;

			const fn = new Function('dv', code);
			await Promise.resolve(fn(dv));
		} catch (err) {
			const errorEl = document.createElement('div');
			errorEl.className = 'cm-lp-dvjs-error';
			errorEl.textContent = `QueryJS Error: ${err instanceof Error ? err.message : String(err)}`;
			container.appendChild(errorEl);
		}
	}
}
