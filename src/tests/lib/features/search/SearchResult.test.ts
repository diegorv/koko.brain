// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// vaultStore reads localStorage at module load; stub it before any import pulls it in.
setupLocalStorage();

// openFileInEditor hits Tauri fs IPC — legitimately mocked. Stores stay real
// (CLAUDE.md rule 1): assertions run against the real editorStore.
vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

import { mount, unmount, flushSync } from 'svelte';
import SearchResult from '$lib/features/search/SearchResult.svelte';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import type {
	SemanticSearchResult,
	HybridSearchResult,
	SearchResult as LegacySearchResult,
	FtsSearchResult,
} from '$lib/features/search/search.types';

/**
 * Note content served by the mocked openFileInEditor. 1-indexed line start offsets:
 * line 1 "# Title" → 0, line 2 "" → 8, line 3 "alpha beta" → 9,
 * line 4 "target line here" → 20, line 5 "tail" → 37.
 */
const NOTE_CONTENT = '# Title\n\nalpha beta\ntarget line here\ntail\n';
const NOTE_PATH = '/vault/notes/target.md';

describe('SearchResult — click lands the cursor on the match (issue 02)', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		editorStore.reset();
		// Synchronous rAF: the pre-fix legacy branch scheduled its store write
		// inside requestAnimationFrame, so collapsing the frame delay lets the
		// race probe below assert in a deterministic window instead of racing a
		// real frame. Removing it makes that probe pass against the broken code.
		vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
			cb(0);
			return 0;
		});
		vi.mocked(openFileInEditor).mockImplementation(async (path: string) => {
			editorStore.addTab({ path, name: 'target.md', content: NOTE_CONTENT, savedContent: NOTE_CONTENT });
		});
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		editorStore.reset();
		vi.unstubAllGlobals();
	});

	function mountResult(props: {
		ftsResult?: FtsSearchResult;
		semanticResult?: SemanticSearchResult;
		hybridResult?: HybridSearchResult;
		legacyResult?: LegacySearchResult;
	}): void {
		component = mount(SearchResult, { target, props });
		flushSync();
	}

	/** Clicks the result card and flushes the async click handler. */
	async function clickResult(): Promise<void> {
		const button = target.querySelector('button');
		if (!button) throw new Error('result button not found');
		button.click();
		flushSync();
		await new Promise((r) => setTimeout(r, 0));
	}

	function semanticFixture(lineStart: number): SemanticSearchResult {
		return {
			key: 'notes/target.md#0',
			sourcePath: 'notes/target.md',
			content: 'target line here',
			heading: null,
			lineStart,
			lineEnd: lineStart,
			score: 0.9,
		};
	}

	function hybridFixture(lineStart?: number): HybridSearchResult {
		return {
			path: 'notes/target.md',
			title: 'target',
			combinedScore: 0.8,
			snippet: 'alpha beta',
			lineStart,
			source: 'both',
		};
	}

	it('semantic result: converts the 1-indexed lineStart to a character offset', async () => {
		mountResult({ semanticResult: semanticFixture(4) });
		await clickResult();

		expect(openFileInEditor).toHaveBeenCalledWith(NOTE_PATH);
		// Line 4 ("target line here") starts at character offset 20 — NOT 4,
		// which is what the pre-fix code passed (the raw line number).
		expect(editorStore.pendingScrollPosition).toBe(20);
	});

	it('hybrid result: converts the 1-indexed lineStart to a character offset', async () => {
		mountResult({ hybridResult: hybridFixture(3) });
		await clickResult();

		expect(openFileInEditor).toHaveBeenCalledWith(NOTE_PATH);
		// Line 3 ("alpha beta") starts at character offset 9.
		expect(editorStore.pendingScrollPosition).toBe(9);
	});

	it('semantic result with lineStart 0 sets no scroll target', async () => {
		mountResult({ semanticResult: semanticFixture(0) });
		await clickResult();

		expect(openFileInEditor).toHaveBeenCalledWith(NOTE_PATH);
		expect(editorStore.pendingScrollPosition).toBeNull();
	});

	it('hybrid result without lineStart sets no scroll target', async () => {
		mountResult({ hybridResult: hybridFixture(undefined) });
		await clickResult();

		expect(openFileInEditor).toHaveBeenCalledWith(NOTE_PATH);
		expect(editorStore.pendingScrollPosition).toBeNull();
	});

	it('sets no scroll target when the note fails to open', async () => {
		// openFileInEditor swallows read errors internally (toast + no tab added).
		vi.mocked(openFileInEditor).mockResolvedValue(undefined);
		mountResult({ semanticResult: semanticFixture(4) });
		await clickResult();

		expect(editorStore.pendingScrollPosition).toBeNull();
	});

	it('legacy result keeps passing the raw character offset', async () => {
		mountResult({
			legacyResult: {
				filePath: NOTE_PATH,
				fileName: 'target.md',
				matches: [{ position: 12, lineNumber: 2 }],
				snippets: [],
			},
		});
		await clickResult();

		expect(openFileInEditor).toHaveBeenCalledWith(NOTE_PATH);
		expect(editorStore.pendingScrollPosition).toBe(12);
	});

	it('fts result opens the file without a scroll target', async () => {
		mountResult({
			ftsResult: { path: 'notes/target.md', title: 'target', score: 1.2, snippet: 'alpha', tags: '' },
		});
		await clickResult();

		expect(openFileInEditor).toHaveBeenCalledWith(NOTE_PATH);
		expect(editorStore.pendingScrollPosition).toBeNull();
	});

	it('legacy result: writes no scroll target until the note is actually open', async () => {
		const DECOY_PATH = '/vault/notes/other.md';
		editorStore.addTab({ path: DECOY_PATH, name: 'other.md', content: 'decoy', savedContent: 'decoy' });
		// Simulate the real readTextFile IPC gap: the tab only appears after a macrotask.
		vi.mocked(openFileInEditor).mockImplementation(async (path: string) => {
			await new Promise((r) => setTimeout(r, 0));
			editorStore.addTab({ path, name: 'target.md', content: NOTE_CONTENT, savedContent: NOTE_CONTENT });
		});

		mountResult({
			legacyResult: {
				filePath: NOTE_PATH,
				fileName: 'target.md',
				matches: [{ position: 12, lineNumber: 2 }],
				snippets: [],
			},
		});

		const button = target.querySelector('button');
		if (!button) throw new Error('result button not found');
		button.click();
		flushSync();

		// Synchronously after the click the decoy note is still active. Writing a
		// scroll target now moves the cursor in the WRONG document, because
		// MarkdownEditor.svelte consumes pendingScrollPosition against whatever
		// view is currently mounted.
		expect(editorStore.activeTabPath).toBe(DECOY_PATH);
		expect(editorStore.pendingScrollPosition).toBeNull();

		await new Promise((r) => setTimeout(r, 0));
		await new Promise((r) => setTimeout(r, 0));

		// ...and once the note is really open the offset still lands on it.
		expect(editorStore.activeTabPath).toBe(NOTE_PATH);
		expect(editorStore.pendingScrollPosition).toBe(12);
	});
});
