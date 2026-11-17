// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// vaultStore reads localStorage at module load; stub it before any import pulls it in.
setupLocalStorage();

// The ScrollArea observes its viewport size; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

// Opening a result hits Tauri fs IPC.
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(() => Promise.resolve()),
}));

// The rows' "Show in Calendar" lookup reads the vault entries over Tauri IPC.
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve([])),
}));

import { mount, unmount, flushSync } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import SearchPanel from '#lib/features/search/SearchPanel.svelte';
import { searchStore } from '#lib/features/search/search.store.svelte.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { settingsPanelStore } from '#lib/core/settings/settings-panel.store.svelte.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { performSearch } from '#lib/features/search/search.service.js';
import type { FtsSearchResult, SemanticSearchResult } from '#lib/features/search/search.types.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const FTS: FtsSearchResult[] = [
	{ path: 'Projects/Roadmap.md', title: 'Roadmap', score: 1, snippet: 'the <mark>roadmap</mark> for Q3', tags: '' },
	{ path: 'Welcome.md', title: 'Welcome', score: 0.5, snippet: 'see the <mark>roadmap</mark>', tags: '' },
];

const SEMANTIC: SemanticSearchResult = {
	key: 'Projects/Roadmap.md#0',
	sourcePath: 'Projects/Roadmap.md',
	heading: 'Goals',
	content: 'Ship the sidebar redesign',
	lineStart: 0,
	lineEnd: 2,
	score: 0.9,
} as SemanticSearchResult;

describe('SearchPanel', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	function mountPanel(props: { firstPane?: boolean } = {}) {
		component = mount(SearchPanel, { target, props });
		flushSync();
	}

	const input = () => target.querySelector<HTMLInputElement>('input[placeholder="Search vault..."]')!;
	const modeButton = (label: string) =>
		[...target.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === label)!;
	const rows = () => [...target.querySelectorAll('.h-20')];
	const status = () => target.querySelector<HTMLElement>('[role="status"]')!;
	const modeGroup = () => target.querySelector<HTMLElement>('[role="group"]')!;
	const fuzzyToggle = () => [...target.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === '~')!;

	/** Makes Semantic and Hybrid available: the setting on and the model loaded. */
	function enableSemantic() {
		settingsStore.updateSearch({ semanticSearchEnabled: true });
		searchStore.setModelAvailable(true);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		invalidateVaultEntries();
		vaultStore._reset();
		vaultStore.open('/vault');
		searchStore.reset();
		settingsStore.reset();
		settingsPanelStore._reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	describe('in the rail note list', () => {
		it('paints the list column tone', () => {
			mountPanel();
			expect(target.querySelector('[data-rail-search]')!.classList).toContain('bg-list-bg');
		});

		it('puts the input in the header strip and has no close button', () => {
			mountPanel();
			const header = target.querySelector('[data-rail-search-header]')!;
			expect(header).not.toBeNull();
			expect(header.contains(input())).toBe(true);
			expect(header.classList.contains('bg-tab-bar')).toBe(true);
			expect(target.querySelector('[aria-label="Close search"]')).toBeNull();
		});

		it('clears the traffic lights (header pad) only as the first pane after the rail', () => {
			const header = () => target.querySelector('[data-rail-search-header]')!;

			mountPanel();
			expect(header().classList).toContain('pl-3');
			expect(header().classList).not.toContain('pl-[var(--rail-header-pad)]');
			unmount(component!);

			mountPanel({ firstPane: true });
			expect(header().classList).toContain('pl-[var(--rail-header-pad)]');
			expect(header().classList).not.toContain('pl-3');
		});

		it('focuses the input on mount for a pending focus request, and again on each later one', () => {
			searchStore.requestFocus();
			mountPanel();
			expect(document.activeElement).toBe(input());
			expect(searchStore.handledFocusRequest).toBe(1);
			input().blur();
			expect(document.activeElement).not.toBe(input());
			searchStore.requestFocus();
			flushSync();
			expect(document.activeElement).toBe(input());
			expect(searchStore.handledFocusRequest).toBe(2);
		});

		it('leaves focus where it is on a mount with no pending request (Cmd+2, a saved Search rail item)', () => {
			const editor = document.body.appendChild(document.createElement('button'));
			editor.focus();
			mountPanel();
			expect(document.activeElement).toBe(editor);
		});

		it('does not take focus again on a remount once the request was handled', () => {
			searchStore.requestFocus();
			mountPanel();
			expect(document.activeElement).toBe(input());
			unmount(component!);
			const editor = document.body.appendChild(document.createElement('button'));
			editor.focus();
			mountPanel();
			expect(document.activeElement).toBe(editor);
		});

		it('Escape leaves the input and keeps Search shown', () => {
			settingsStore.updateLayout({ railItem: 'search' });
			searchStore.requestFocus();
			mountPanel();
			expect(document.activeElement).toBe(input());
			input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
			flushSync();
			expect(document.activeElement).not.toBe(input());
			expect(settingsStore.layout.railItem).toBe('search');
			expect(target.querySelector('[data-rail-search]')).not.toBeNull();
		});

		it('shows the store query and writes typed text to it', () => {
			searchStore.setQuery('tag:work');
			mountPanel();
			expect(input().value).toBe('tag:work');
			input().value = 'roadmap';
			input().dispatchEvent(new Event('input', { bubbles: true }));
			expect(searchStore.query).toBe('roadmap');
		});

		it('renders the result rows with their titles and snippets, and opens a clicked one', () => {
			searchStore.setQuery('roadmap');
			searchStore.setFtsResults(FTS);
			mountPanel();
			expect(target.textContent).toContain('2 results');
			expect(rows()).toHaveLength(2);
			expect(rows()[0].textContent).toContain('Roadmap');
			expect(rows()[0].querySelector('mark')?.textContent).toBe('roadmap');
			expect(rows()[0].textContent).toContain('the roadmap for Q3');
			rows()[0].querySelector('button')!.click();
			expect(openFileInEditor).toHaveBeenCalledWith('/vault/Projects/Roadmap.md');
		});

		it('switches modes with the Text / Semantic / Hybrid controls once semantic search is on and loaded', () => {
			mountPanel();
			expect(modeButton('Semantic').getAttribute('aria-disabled')).toBe('true');
			expect(modeButton('Hybrid').getAttribute('aria-disabled')).toBe('true');
			expect(modeButton('Text').getAttribute('aria-disabled')).toBeNull();
			enableSemantic();
			flushSync();
			expect(modeButton('Semantic').getAttribute('aria-disabled')).toBeNull();
			expect(modeButton('Hybrid').getAttribute('aria-disabled')).toBeNull();
			modeButton('Semantic').click();
			flushSync();
			expect(searchStore.mode).toBe('semantic');
			searchStore.setQuery('sidebar');
			searchStore.setSemanticResults([SEMANTIC]);
			flushSync();
			expect(target.textContent).toContain('1 result');
			expect(rows()[0].textContent).toContain('Ship the sidebar redesign');
			modeButton('Hybrid').click();
			flushSync();
			expect(searchStore.mode).toBe('hybrid');
			modeButton('Text').click();
			flushSync();
			expect(searchStore.mode).toBe('text');
		});

		it('prompts for a query when it is empty', () => {
			mountPanel();
			expect(target.textContent).toContain('Type to search across all files');
			expect(rows()).toHaveLength(0);
		});

		it('says so when a query finds nothing', () => {
			searchStore.setQuery('xyznonexistent');
			mountPanel();
			expect(target.textContent).toContain('No results found');
			expect(rows()).toHaveLength(0);
		});

		it('leaves the index status to the status bar', () => {
			searchStore.setIndexStats({ totalDocuments: 12, added: 0, updated: 0, removed: 0, unchanged: 12 });
			searchStore.setSemanticStats({ totalChunks: 50, totalSources: 5, modelLoaded: true });
			mountPanel();
			expect(target.textContent).not.toContain('Indexed:');
			expect(target.textContent).not.toContain('chunks');
			searchStore.setIsIndexing(true);
			flushSync();
			expect(target.textContent).not.toContain('Building index...');
		});

		it('shows the searching notice while a search runs with nothing to keep', () => {
			searchStore.setQuery('roadmap');
			searchStore.setSearching(true);
			mountPanel();
			expect(status().textContent?.trim()).toBe('Searching...');
			expect(rows()).toHaveLength(0);
		});
	});

	describe('while a search runs', () => {
		const list = () => target.querySelector<HTMLElement>('[data-search-result-list]');
		const spinner = () => target.querySelector<HTMLElement>('[data-search-spinner]');

		afterEach(() => {
			vi.useRealTimers();
		});

		it('keeps the previous rows and count instead of "Searching..."', () => {
			searchStore.setQuery('roadmap');
			searchStore.setFtsResults(FTS);
			searchStore.setSearching(true);
			mountPanel();
			expect(rows()).toHaveLength(2);
			expect(status().textContent?.trim()).toBe('2 results');
			expect(target.textContent).not.toContain('Searching...');
		});

		it('dims the list and shows a spinner only after 300 ms, and drops both when the search ends', () => {
			vi.useFakeTimers();
			searchStore.setQuery('roadmap');
			searchStore.setFtsResults(FTS);
			mountPanel();
			searchStore.setSearching(true);
			flushSync();
			vi.advanceTimersByTime(299);
			flushSync();
			expect(list()?.getAttribute('aria-busy')).toBeNull();
			expect(list()?.classList).not.toContain('opacity-50');
			expect(spinner()).toBeNull();

			vi.advanceTimersByTime(1);
			flushSync();
			expect(list()?.getAttribute('aria-busy')).toBe('true');
			expect(list()?.classList).toContain('opacity-50');
			const header = target.querySelector('[data-rail-search-header]')!;
			expect(header.contains(spinner())).toBe(true);
			expect(spinner()!.getAttribute('aria-hidden')).toBe('true');
			// Left of the fuzzy toggle in Text mode
			expect(spinner()!.classList).toContain('right-7');
			expect(fuzzyToggle().classList).toContain('right-2');
			// Typed text stops short of the spinner and the toggle
			expect(input().classList).toContain('pr-12');
			expect(target.querySelectorAll('[role="status"]')).toHaveLength(1);

			searchStore.setFtsResults([FTS[1]]);
			searchStore.setSearching(false);
			flushSync();
			expect(list()?.getAttribute('aria-busy')).toBeNull();
			expect(list()?.classList).not.toContain('opacity-50');
			expect(spinner()).toBeNull();
			expect(rows()).toHaveLength(1);
			expect(rows()[0].textContent).toContain('Welcome');
			expect(status().textContent?.trim()).toBe('1 result');
		});

		it('puts the spinner at the input edge in a mode without the fuzzy toggle', () => {
			vi.useFakeTimers();
			enableSemantic();
			searchStore.setMode('semantic');
			searchStore.setQuery('sidebar');
			searchStore.setSearching(true);
			mountPanel();
			vi.advanceTimersByTime(300);
			flushSync();
			expect(fuzzyToggle()).toBeUndefined();
			expect(spinner()!.classList).toContain('right-2');
			expect(input().classList).toContain('pr-8');
		});

		it('after a mode switch keeps the target mode\'s older rows and dims them after 300 ms', () => {
			vi.useFakeTimers();
			enableSemantic();
			searchStore.setQuery('sidebar');
			searchStore.setFtsResults(FTS);
			searchStore.setSemanticResults([SEMANTIC]);
			mountPanel();
			expect(rows()).toHaveLength(2);

			modeButton('Semantic').click();
			searchStore.setSearching(true);
			flushSync();
			expect(rows()).toHaveLength(1);
			expect(rows()[0].textContent).toContain('Ship the sidebar redesign');
			expect(status().textContent?.trim()).toBe('1 result');
			expect(list()?.getAttribute('aria-busy')).toBeNull();

			vi.advanceTimersByTime(300);
			flushSync();
			expect(rows()).toHaveLength(1);
			expect(list()?.getAttribute('aria-busy')).toBe('true');
		});
	});

	describe('result cap', () => {
		const ftsRows = (n: number): FtsSearchResult[] =>
			Array.from({ length: n }, (_, i) => ({ path: `n${i}.md`, title: `n${i}`, score: -1, snippet: 'x', tags: '' }));

		// `vi.clearAllMocks` keeps implementations: restore the module mock's default.
		afterEach(() => {
			vi.mocked(invoke).mockImplementation(() => Promise.resolve([]));
		});

		it.each([
			[50, '50+ results'],
			[49, '49 results'],
		])('a text search returning %i rows says "%s"', async (n, text) => {
			vi.mocked(invoke).mockImplementation(async (cmd) => (cmd === 'search_fts' ? ftsRows(n) : []));
			searchStore.setQuery('note');
			mountPanel();
			await performSearch();
			flushSync();
			expect(status().textContent?.trim()).toBe(text);
		});

		it('a semantic search returning 20 chunks says "20+ results"', async () => {
			const chunks = Array.from({ length: 20 }, (_, i) => ({ ...SEMANTIC, key: `k${i}`, sourcePath: `n${i}.md` }));
			vi.mocked(invoke).mockImplementation(async (cmd) => (cmd === 'search_semantic' ? chunks : []));
			enableSemantic();
			searchStore.setMode('semantic');
			searchStore.setQuery('sidebar');
			mountPanel();
			await performSearch();
			flushSync();
			expect(status().textContent?.trim()).toBe('20+ results');
		});

		it('an operator-only search returning 100 notes says "100+ results"', async () => {
			const entries = Array.from({ length: 120 }, (_, i) => entryV2(`/vault/n${i}.md`, { tags: ['work'] }));
			vi.mocked(invoke).mockImplementation(async (cmd) => (cmd === 'get_all_vault_entries_v2' ? entries : []));
			searchStore.setQuery('tag:work');
			mountPanel();
			await performSearch();
			flushSync();
			expect(status().textContent?.trim()).toBe('100+ results');
		});

		it('clearing the query drops the "+" with the results', async () => {
			vi.mocked(invoke).mockImplementation(async (cmd) => (cmd === 'search_fts' ? ftsRows(50) : []));
			searchStore.setQuery('note');
			mountPanel();
			await performSearch();
			searchStore.setQuery('');
			await performSearch();
			flushSync();
			expect(searchStore.resultsCapped).toBe(false);
			expect(target.textContent).toContain('Type to search across all files');
		});

		it('a mode switch shows the target mode\'s own cap, not the last search\'s', async () => {
			vi.mocked(invoke).mockImplementation(async (cmd) => (cmd === 'search_fts' ? ftsRows(50) : []));
			enableSemantic();
			searchStore.setQuery('sidebar');
			searchStore.setSemanticResults([SEMANTIC]);
			mountPanel();
			await performSearch();
			flushSync();
			expect(status().textContent?.trim()).toBe('50+ results');

			modeButton('Semantic').click();
			searchStore.setSearching(true);
			flushSync();
			expect(status().textContent?.trim()).toBe('1 result');

			modeButton('Text').click();
			flushSync();
			expect(status().textContent?.trim()).toBe('50+ results');
		});
	});

	describe('short query', () => {
		it.each(['semantic', 'hybrid'] as const)('asks for 3 characters in %s mode instead of "No results found"', (mode) => {
			enableSemantic();
			searchStore.setMode(mode);
			searchStore.setQuery('ab');
			mountPanel();
			expect(status().textContent?.trim()).toBe('Type at least 3 characters');
			expect(target.textContent).not.toContain('No results found');
			searchStore.setQuery('x');
			flushSync();
			expect(status().textContent?.trim()).toBe('Type at least 3 characters');
		});

		it('says "No results found" for a 2-character query in Text mode', () => {
			searchStore.setQuery('ab');
			mountPanel();
			expect(status().textContent?.trim()).toBe('No results found');
			expect(target.textContent).not.toContain('Type at least 3 characters');
		});
	});

	describe('empty state', () => {
		it('adds the operator hint in Text mode', () => {
			mountPanel();
			expect(target.textContent).toContain('Type to search across all files');
			expect(target.textContent).toContain('Try tag:work or path:Projects');
		});

		it.each(['semantic', 'hybrid'] as const)('has no operator hint in %s mode', (mode) => {
			enableSemantic();
			searchStore.setMode(mode);
			mountPanel();
			expect(target.textContent).toContain('Type to search across all files');
			expect(target.textContent).not.toContain('Try tag:work or path:Projects');
		});
	});

	describe('accessible names and state', () => {
		it('labels the input, the mode group and the fuzzy toggle', () => {
			mountPanel();
			expect(input().getAttribute('aria-label')).toBe('Search vault');
			expect(modeGroup().getAttribute('aria-label')).toBe('Search mode');
			expect(modeGroup().contains(modeButton('Text'))).toBe(true);
			expect(fuzzyToggle().getAttribute('aria-label')).toBe('Fuzzy matching');
			expect(fuzzyToggle().getAttribute('title')).toBe('Fuzzy matching enabled');
		});

		it('marks the active mode and the fuzzy state with aria-pressed', () => {
			enableSemantic();
			mountPanel();
			expect(modeButton('Text').getAttribute('aria-pressed')).toBe('true');
			expect(modeButton('Semantic').getAttribute('aria-pressed')).toBe('false');
			expect(modeButton('Hybrid').getAttribute('aria-pressed')).toBe('false');
			expect(fuzzyToggle().getAttribute('aria-pressed')).toBe('true');
			fuzzyToggle().click();
			flushSync();
			expect(fuzzyToggle().getAttribute('aria-pressed')).toBe('false');
			modeButton('Semantic').click();
			flushSync();
			expect(modeButton('Semantic').getAttribute('aria-pressed')).toBe('true');
			expect(modeButton('Text').getAttribute('aria-pressed')).toBe('false');
		});
	});

	describe('unavailable semantic modes', () => {
		const note = () => target.querySelector<HTMLElement>('[data-search-mode-note]');
		const settingsLink = () =>
			[...target.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Open Settings > Search');
		const OFF = 'Semantic search is off. Turn it on in Settings > Search.';
		const STARTING = 'Semantic search is starting...';

		it.each(['Semantic', 'Hybrid'])('%s stays focusable but does not switch the mode, and explains why', (label) => {
			mountPanel();
			expect(modeButton(label).disabled).toBe(false);
			expect(note()).toBeNull();
			modeButton(label).click();
			flushSync();
			expect(searchStore.mode).toBe('text');
			expect(note()?.textContent).toContain(OFF);
			expect(settingsLink()).toBeDefined();
		});

		it('uses the reason as the tooltip: off while the setting is off, starting while the model loads', () => {
			mountPanel();
			expect(modeButton('Semantic').getAttribute('title')).toBe(OFF);
			settingsStore.updateSearch({ semanticSearchEnabled: true });
			flushSync();
			expect(modeButton('Hybrid').getAttribute('title')).toBe(STARTING);
			modeButton('Hybrid').click();
			flushSync();
			expect(note()?.textContent).toContain(STARTING);
			expect(note()?.textContent).not.toContain(OFF);
		});

		it('reads the setting too: a loaded model with the setting off is still off', () => {
			searchStore.setModelAvailable(true);
			mountPanel();
			expect(modeButton('Semantic').getAttribute('aria-disabled')).toBe('true');
			modeButton('Semantic').click();
			flushSync();
			expect(searchStore.mode).toBe('text');
			expect(note()?.textContent).toContain(OFF);
		});

		it('the note link opens Settings > Search', () => {
			mountPanel();
			modeButton('Semantic').click();
			flushSync();
			settingsLink()!.click();
			expect(settingsPanelStore.isOpen).toBe(true);
			expect(settingsPanelStore.activeSection).toBe('search');
		});

		it('the note goes away when the modes become available, or on Text', () => {
			mountPanel();
			modeButton('Semantic').click();
			flushSync();
			expect(note()).not.toBeNull();
			modeButton('Text').click();
			flushSync();
			expect(note()).toBeNull();

			modeButton('Semantic').click();
			flushSync();
			expect(note()).not.toBeNull();
			enableSemantic();
			flushSync();
			expect(note()).toBeNull();
			expect(modeButton('Semantic').getAttribute('title')).toBeNull();
		});

		it('turning the setting off in Semantic mode switches to Text and shows the note with the link', () => {
			enableSemantic();
			searchStore.setMode('semantic');
			mountPanel();
			expect(note()).toBeNull();
			settingsStore.updateSearch({ semanticSearchEnabled: false });
			flushSync();
			expect(searchStore.mode).toBe('text');
			expect(note()?.textContent).toContain(OFF);
			expect(settingsLink()).toBeDefined();
		});
	});

	describe('error state', () => {
		const alert = () => target.querySelector<HTMLElement>('[role="alert"]');

		it('shows "Search failed" with Retry in an alert, not "No results found"', () => {
			searchStore.setQuery('roadmap');
			searchStore.setSearchError('Error: IPC down');
			mountPanel();
			expect(alert()?.textContent).toContain('Search failed');
			expect(alert()?.querySelector('button')?.textContent?.trim()).toBe('Retry');
			expect(status().textContent?.trim()).toBe('');
			expect(target.textContent).not.toContain('No results found');
			expect(rows()).toHaveLength(0);
		});

		it('Retry re-runs the search, which clears the error', async () => {
			searchStore.setQuery('roadmap');
			searchStore.setSearchError('Error: IPC down');
			mountPanel();
			alert()!.querySelector('button')!.click();
			expect(searchStore.searchError).toBeNull();
			await vi.waitFor(() => expect(searchStore.isSearching).toBe(false));
			expect(invoke).toHaveBeenCalledWith('search_fts', { query: 'roadmap', maxResults: 50, fuzzy: true });
			flushSync();
			expect(alert()).toBeNull();
			expect(status().textContent?.trim()).toBe('No results found');
		});

		it('shows no alert without an error', () => {
			searchStore.setQuery('roadmap');
			mountPanel();
			expect(alert()).toBeNull();
		});
	});

	describe('status region', () => {
		it('keeps one role="status" node carrying each status text', () => {
			enableSemantic();
			mountPanel();
			const node = status();
			expect(target.querySelectorAll('[role="status"]')).toHaveLength(1);
			expect(node.textContent?.trim()).toBe('');

			searchStore.setQuery('roadmap');
			searchStore.setSearching(true);
			flushSync();
			expect(status()).toBe(node);
			expect(node.textContent?.trim()).toBe('Searching...');

			searchStore.setSearching(false);
			flushSync();
			expect(status()).toBe(node);
			expect(node.textContent?.trim()).toBe('No results found');

			searchStore.setFtsResults(FTS);
			flushSync();
			expect(status()).toBe(node);
			expect(node.textContent?.trim()).toBe('2 results');

			searchStore.setMode('semantic');
			searchStore.setQuery('ro');
			flushSync();
			expect(status()).toBe(node);
			expect(node.textContent?.trim()).toBe('Type at least 3 characters');
		});
	});
});
