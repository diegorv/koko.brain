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
import SearchPanel from '#lib/features/search/SearchPanel.svelte';
import { searchStore } from '#lib/features/search/search.store.svelte.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import type { FtsSearchResult, SemanticSearchResult } from '#lib/features/search/search.types.js';

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

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		invalidateVaultEntries();
		vaultStore._reset();
		vaultStore.open('/vault');
		searchStore.reset();
		settingsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	describe('in the rail note list', () => {
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

		it('switches modes with the Text / Semantic / Hybrid controls once the model is available', () => {
			mountPanel();
			expect(modeButton('Semantic').disabled).toBe(true);
			expect(modeButton('Hybrid').disabled).toBe(true);
			searchStore.setModelAvailable(true);
			flushSync();
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

		it('says so when a query finds nothing (a failed search leaves the results empty)', () => {
			searchStore.setQuery('xyznonexistent');
			mountPanel();
			expect(target.textContent).toContain('No results found');
			expect(rows()).toHaveLength(0);
		});

		it('shows the searching notice while a search runs', () => {
			searchStore.setQuery('roadmap');
			searchStore.setSearching(true);
			mountPanel();
			expect(target.textContent).toContain('Searching...');
		});
	});
});
