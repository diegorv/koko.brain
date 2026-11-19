// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// vaultStore reads localStorage at module load; stub it before any import pulls it in.
setupLocalStorage();

// openFileInEditor hits Tauri fs IPC — legitimately mocked. Stores stay real
// (CLAUDE.md rule 1): assertions run against the real editorStore.
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));

// The "Show in Calendar" lookup reads the vault entries over Tauri IPC.
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { mount, unmount, flushSync } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import SearchResult from '#lib/features/search/SearchResult.svelte';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { EVENT_CALENDAR_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { resetEventCalendar } from '#lib/features/event-calendar/event-calendar.service.js';
import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
import { eventEntry } from '../../../fixtures/event-notes.fixture';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import type {
	SemanticSearchResult,
	HybridSearchResult,
	SearchResult as LegacySearchResult,
	FtsSearchResult,
} from '#lib/features/search/search.types.js';

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
		tabindex?: number;
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

	it('renders subtitle and score at the meta role in a muted color at full opacity', () => {
		mountResult({ semanticResult: semanticFixture(4) });

		const subtitle = target.querySelector('[data-search-result-subtitle]')!;
		const score = [...target.querySelectorAll('span')].find((s) => s.textContent === '90%')!;
		for (const el of [subtitle, score]) {
			expect(el.classList).toContain('text-meta');
			expect(el.classList).toContain('text-file-explorer-muted-fg');
			expect(el.className).not.toMatch(/\/\d+/);
		}
	});

	it('renders the snippet in the muted sidebar color at full opacity', () => {
		mountResult({ semanticResult: semanticFixture(4) });

		const snippet = target.querySelector('[data-search-result-snippet]')!;
		expect(snippet.textContent?.trim()).toBe('target line here');
		expect(snippet.classList).toContain('text-file-explorer-muted-fg');
		expect(snippet.className).not.toMatch(/\/\d+/);
	});

	it('renders the source badge at the label role', () => {
		mountResult({ hybridResult: hybridFixture(3) });

		const badge = [...target.querySelectorAll('span')].find((s) => s.textContent?.trim() === 'Both')!;
		expect(badge.classList).toContain('text-label');
	});

	it.each([
		['both', 'Both', 'bg-file-explorer-primary/15', 'text-file-explorer-primary-tint-fg'],
		['semantic', 'Semantic', 'bg-search-semantic-bg', 'text-search-semantic-tint-fg'],
		['text', 'Text', 'bg-muted', 'text-file-explorer-fg'],
	] as const)('draws the %s badge text in its text-on-tint color', (source, label, bg, text) => {
		mountResult({ hybridResult: { ...hybridFixture(3), source } });

		const badge = [...target.querySelectorAll('span')].find((s) => s.textContent?.trim() === label)!;
		expect(badge.classList).toContain(bg);
		expect(badge.classList).toContain(text);
		for (const raw of ['text-file-explorer-primary', 'text-search-semantic-fg', 'text-file-explorer-muted-fg']) {
			expect(badge.classList).not.toContain(raw);
		}
	});

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

	it('marks the result row with data-search-result (the E2E specs select on it)', () => {
		mountResult({
			ftsResult: { path: 'notes/target.md', title: 'target', score: 1.2, snippet: 'alpha', tags: '' },
		});

		const rows = target.querySelectorAll('[data-search-result]');
		expect(rows).toHaveLength(1);
		expect(rows[0].textContent).toContain('target');
	});

	it('puts the given tabindex on the card button, and none when not given', () => {
		const ftsResult: FtsSearchResult = { path: 'notes/target.md', title: 'target', score: 1.2, snippet: 'alpha', tags: '' };
		const card = () => target.querySelector('[data-search-result] > button')!;
		mountResult({ ftsResult, tabindex: -1 });
		expect(card().getAttribute('tabindex')).toBe('-1');
		unmount(component!);
		mountResult({ ftsResult, tabindex: 0 });
		expect(card().getAttribute('tabindex')).toBe('0');
		unmount(component!);
		mountResult({ ftsResult });
		expect(card().hasAttribute('tabindex')).toBe(false);
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

describe('SearchResult: card title, subtitle, badge and snippet', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		vi.mocked(invoke).mockResolvedValue([]);
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function mountResult(props: Record<string, unknown>): void {
		component = mount(SearchResult, { target, props });
		flushSync();
	}

	const text = (selector: string): string | null =>
		target.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;

	const MARKDOWN = '## Plan\n- [ ] read **the** [[Docs/Guide|guide]] and `code`';
	const PLAIN = 'Plan read the guide and code';

	/** One card per mode for `<folder>/plan.md` (or `plan.md` at the root). */
	function cards(folder: string, heading: string | null, snippet = MARKDOWN): Record<string, Record<string, unknown>> {
		const rel = folder ? `${folder}/plan.md` : 'plan.md';
		return {
			text: { ftsResult: { path: rel, title: 'plan', score: 1, snippet, tags: '' } },
			semantic: {
				semanticResult: { key: 'k', sourcePath: rel, content: snippet, heading, lineStart: 1, lineEnd: 1, score: 0.9 },
			},
			hybrid: {
				hybridResult: { path: rel, title: 'plan', combinedScore: 1, snippet, heading: heading ?? undefined },
			},
			legacy: {
				legacyResult: {
					filePath: `/vault/${rel}`,
					fileName: 'plan',
					matches: [],
					snippets: [{ text: snippet, matchStart: 0, matchEnd: 0 }],
				},
			},
		};
	}

	for (const mode of ['text', 'semantic', 'hybrid', 'legacy']) {
		it(`${mode}: the title is the note name and the subtitle is the folder, never the file name`, () => {
			mountResult(cards('Projects/Sub', null)[mode]);

			expect(text('[data-search-result-title]')).toBe('plan');
			expect(text('[data-search-result-subtitle]')).toBe('Projects/Sub');
		});

		it(`${mode}: the snippet shows no raw markdown`, () => {
			mountResult(cards('Projects', null)[mode]);

			expect(text('[data-search-result-snippet]')).toBe(PLAIN);
		});

		it(`${mode}: a root-level note shows no folder`, () => {
			mountResult(cards('', null)[mode]);

			expect(text('[data-search-result-subtitle]')).toBe('');
		});

		it(`${mode}: the result button holds only phrasing content`, () => {
			mountResult(cards('Projects', null)[mode]);

			const button = target.querySelector('[data-search-result] > button')!;
			expect(button.querySelectorAll('div, p')).toHaveLength(0);
		});
	}

	for (const mode of ['semantic', 'hybrid']) {
		it(`${mode}: the subtitle adds § heading after the folder`, () => {
			mountResult(cards('Projects', 'Intro')[mode]);

			expect(text('[data-search-result-title]')).toBe('plan');
			expect(text('[data-search-result-subtitle]')).toBe('Projects § Intro');
		});

		it(`${mode}: a root-level note with a heading shows only § heading`, () => {
			mountResult(cards('', 'Intro')[mode]);

			expect(text('[data-search-result-subtitle]')).toBe('§ Intro');
		});
	}

	it('text: keeps the <mark> highlight after stripping markdown', () => {
		mountResult(cards('Projects', null, 'the **<mark>design</mark>** review')['text']);

		const snippet = target.querySelector('[data-search-result-snippet]')!;
		expect(snippet.textContent?.trim()).toBe('the design review');
		expect(snippet.querySelector('mark')?.textContent).toBe('design');
	});

	it('hybrid: a card without source shows no badge', () => {
		mountResult(cards('Projects', 'Intro')['hybrid']);

		const labels = [...target.querySelectorAll('span')].map((s) => s.textContent?.trim());
		expect(labels).not.toContain('Both');
		expect(labels).not.toContain('Text');
		expect(labels).not.toContain('Semantic');
	});

	it('hybrid: a card with source from the legacy merge still shows its badge', () => {
		mountResult({
			hybridResult: { path: 'Projects/plan.md', title: 'plan', combinedScore: 1, snippet: '', source: 'semantic' },
		});

		const labels = [...target.querySelectorAll('span')].map((s) => s.textContent?.trim());
		expect(labels).toContain('Semantic');
	});
});

describe('SearchResult: Show in Calendar', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		invalidateVaultEntries();
		vaultStore._reset();
		vaultStore.open('/vault');
		vaultStore.markIndexReady();
		editorStore.reset();
		resetEventCalendar();
		vi.mocked(invoke).mockResolvedValue([
			eventEntry('/vault/Events/Standup.md', { date: '2026-11-10', start: '09:00', end: '10:00' }),
			entryV2(NOTE_PATH),
		]);
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		editorStore.reset();
	});

	/** Mounts a result and lets the lookup resolve. */
	async function mountWith(props: Record<string, unknown>): Promise<void> {
		component = mount(SearchResult, { target, props });
		flushSync();
		await new Promise((r) => setTimeout(r, 0));
		flushSync();
	}

	/** Mounts an FTS result for a vault-relative path and lets the lookup resolve. */
	async function mountFts(path: string): Promise<void> {
		await mountWith({ ftsResult: { path, title: 'T', score: 1, snippet: '', tags: '' } });
	}

	it('offers the action on an event note and opens the Calendar on its day without opening the note', async () => {
		await mountFts('Events/Standup.md');
		const action = target.querySelector<HTMLButtonElement>('[data-show-in-calendar]');
		expect(action?.getAttribute('aria-label')).toBe('Show in Calendar');
		expect(action?.classList).toContain('bg-list-bg');

		action!.click();
		await new Promise((r) => setTimeout(r, 0));

		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(editorStore.activeTab?.path).toBe(EVENT_CALENDAR_VIRTUAL_PATH);
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
		expect(eventCalendarViewStore.focusRequest?.path).toBe('/vault/Events/Standup.md');
	});

	it('offers no action on a plain note', async () => {
		await mountFts('notes/target.md');
		expect(target.querySelector('[data-show-in-calendar]')).toBeNull();
	});

	it('offers the action on a semantic result, keyed by its vault-relative source path', async () => {
		await mountWith({
			semanticResult: { key: 'k', sourcePath: 'Events/Standup.md', content: 'x', heading: null, lineStart: 1, lineEnd: 1, score: 0.9 },
		});
		expect(target.querySelector('[data-show-in-calendar]')).not.toBeNull();
	});

	it('offers the action on a hybrid result, keyed by its vault-relative path', async () => {
		await mountWith({
			hybridResult: { path: 'Events/Standup.md', title: 'Standup', combinedScore: 1, snippet: '', source: 'both' },
		});
		expect(target.querySelector('[data-show-in-calendar]')).not.toBeNull();
	});

	it('offers the action on a legacy result, whose path is already absolute', async () => {
		await mountWith({
			legacyResult: { filePath: '/vault/Events/Standup.md', fileName: 'Standup', matches: [], snippets: [] },
		});
		expect(target.querySelector('[data-show-in-calendar]')).not.toBeNull();
	});
});
