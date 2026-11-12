// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Tauri IPC and the disk are mocked; tasksStore and editorStore stay real
// (CLAUDE.md rule 1).
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())), emit: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn(), writeTextFile: vi.fn(), exists: vi.fn(async () => false) }));

import { unmount, flushSync } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import { exists, readTextFile } from '@tauri-apps/plugin-fs';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { buildTaskIndex, resetTasks, setTaskSources } from '#lib/features/tasks/tasks.service.js';
import { statusGlyph } from '#lib/features/tasks/task-status.logic.js';
import { DEFAULT_QUICK, defaultTaskExcludes, headingSources } from '#lib/features/tasks/task-query.logic.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { preloadPacks } from '#lib/features/file-icons/file-icons.icon-data.js';
import type { FileTaskGroupV2, NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import type { TaskStatus } from '#lib/features/tasks/task-metadata.types.js';
import { mockTaskFetch, mountTasksView, openMenu, sevenStatusGroup, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const NOTE = '/vault/Projects/2026-Q2.md';

/** The rule sentence's part for the default excludes. */
const EXCEPT = ', except archived notes, type definitions, templates, the system folder';

/** `NOTE` with one todo task per text under `## <heading>`, on lines 2, 3, ... */
function noteUnder(heading: string, texts: string[], path = NOTE): NoteEntryV2 {
	return entryV2(path, {
		taskHeadings: [{ level: 2, text: heading, line: 1 }],
		tasks: texts.map((text, i) => taskV2(text, { lineNumber: i + 2, heading: 0 })),
	});
}

function toggleCalls() {
	return vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'toggle_task_status');
}

/** How many whole-vault snapshot reads reached IPC. */
function entryReads(): number {
	return vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'get_all_vault_entries_v2').length;
}

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]'));

/** The toolbar's task count text. */
const countText = () => document.querySelector('[data-task-count]')?.textContent?.trim();

/** The circle button of the row showing `status`. */
function toggleOf(status: TaskStatus): HTMLButtonElement {
	const button = document.querySelector<HTMLButtonElement>(`[data-task-toggle][data-task-status="${status}"]`);
	if (!button) throw new Error(`no toggle with status ${status}`);
	return button;
}

/** The text span in the same row as `toggle`. */
function textOf(toggle: HTMLElement): HTMLElement {
	const span = toggle.closest('[data-task-row]')?.querySelector<HTMLElement>('[data-task-text]');
	if (!span) throw new Error('task text span not found');
	return span;
}

/** Waits, flushing Svelte, until `check` stops throwing. */
async function until(check: () => void): Promise<void> {
	await vi.waitFor(() => {
		flushSync();
		check();
	});
}

describe('TasksView row clicks', () => {
	let component: Record<string, unknown> | null = null;
	let onOpenWikilink: ReturnType<typeof vi.fn<(target: string) => void>>;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		// Also clears the write overlay, which outlives a test.
		resetTasks();
		editorStore.reset();
		tasksStore.setSources([]);
		onOpenWikilink = vi.fn<(target: string) => void>();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		window.getSelection()?.removeAllRanges();
		document.body.innerHTML = '';
	});

	/** Mounts the view with one task on `lineNumber` (1-based), preceded by blank lines. */
	async function mountView(text: string, lineNumber = 1, status: TaskStatus = 'todo'): Promise<void> {
		vi.mocked(readTextFile).mockResolvedValue(`${'\n'.repeat(lineNumber - 1)}- [ ] ${text}\n`);
		mockTaskFetch([taskGroupV2(NOTE, [taskV2(text, { lineNumber, status })])]);
		({ component } = await mountTasksView({ onOpenWikilink }));
		await until(() => expect(rows()).toHaveLength(1));
	}

	it('opens the note at the task line when the text is clicked, without toggling', async () => {
		// Line 3 after two blank lines starts at offset 2, so a plain open
		// (no caret move) cannot pass.
		await mountView('Ship feature A', 3);
		const text = textOf(toggleOf('todo'));
		expect(text.textContent).toContain('Ship feature A');

		text.click();
		await vi.waitFor(() => expect(editorStore.activeTabPath).toBe(NOTE));
		await vi.waitFor(() => expect(editorStore.pendingScrollPosition).toBe(2));

		expect(toggleCalls()).toHaveLength(0);
	});

	it('toggles the task when the circle is clicked', async () => {
		await mountView('Ship feature A');

		toggleOf('todo').click();

		await vi.waitFor(() => expect(toggleCalls()).toHaveLength(1));
		expect(toggleCalls()[0][1]).toEqual({
			path: NOTE,
			lineNumber: 1,
			expectedText: 'Ship feature A',
			expectedStatus: 'todo',
			target: 'done',
		});
	});

	it('completes an important task on a circle click', async () => {
		tasksStore.setQuick({ show: 'all' });
		await mountView('call', 1, 'important');

		expect(toggleOf('important').getAttribute('aria-label')).toBe('Mark task as done: call (important)');

		toggleOf('important').click();
		await vi.waitFor(() => expect(toggleCalls()).toHaveLength(1));
		expect(toggleCalls()[0][1]).toMatchObject({ expectedStatus: 'important', target: 'done' });
	});

	it('does nothing when the click ends a text selection inside the text', async () => {
		await mountView('Ship feature A');
		const span = textOf(toggleOf('todo'));
		const range = document.createRange();
		range.selectNodeContents(span);
		// The row focused on mount leaves a collapsed range, and `addRange` is a no-op while one exists.
		window.getSelection()!.removeAllRanges();
		window.getSelection()!.addRange(range);

		span.click();
		await new Promise((r) => setTimeout(r, 0));
		flushSync();

		expect(editorStore.tabs).toHaveLength(0);
		expect(editorStore.activeTabPath).toBeNull();
		expect(toggleCalls()).toHaveLength(0);
	});

	it('opens a wikilink in the text without opening the note or toggling', async () => {
		await mountView('see [[Welcome]]');
		const link = Array.from(textOf(toggleOf('todo')).querySelectorAll('button')).find((b) => b.textContent === 'Welcome');
		if (!link) throw new Error('wikilink button not found');

		link.click();
		await new Promise((r) => setTimeout(r, 0));
		flushSync();

		expect(onOpenWikilink).toHaveBeenCalledWith('Welcome');
		expect(editorStore.tabs.some((t) => t.path === NOTE)).toBe(false);
		expect(toggleCalls()).toHaveLength(0);
	});
});

describe('TasksView: status glyphs and the open rule', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		// Also clears the write overlay, which outlives a test.
		resetTasks();
		editorStore.reset();
		tasksStore.setSources([]);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	/**
	 * The row text of the seven-status fixture's task in `status`: the raw text,
	 * except the todo task's, whose signifiers become chips.
	 */
	const fixtureText = (status: TaskStatus) =>
		status === 'todo' ? 'Send invoice' : sevenStatusGroup().tasks.find((t) => t.status === status)!.text;

	it('gives every status its glyph, label and title, and strikes through only closed tasks', async () => {
		tasksStore.setQuick({ show: 'all' });
		mockTaskFetch([sevenStatusGroup()]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(7));

		const expected: [TaskStatus, string, string][] = [
			['todo', 'Mark task as done', 'todo'],
			['in-progress', 'Mark task as done', 'in progress'],
			['question', 'Mark task as done', 'question'],
			['important', 'Mark task as done', 'important'],
			['forwarded', 'Mark task as done', 'forwarded'],
			['done', 'Mark task as not done', 'done'],
			['cancelled', 'Mark task as not done', 'cancelled'],
		];
		const toggles = rows().map((row) => row.querySelector<HTMLElement>('[data-task-toggle]')!);
		expect(toggles.map((t) => t.dataset.taskStatus)).toEqual(expected.map(([status]) => status));
		for (const [status, verb, word] of expected) {
			const toggle = toggleOf(status);
			expect(toggle.getAttribute('aria-label')).toBe(`${verb}: ${fixtureText(status)} (${word})`);
			expect(toggle.getAttribute('title')).toBe(word);
			expect(toggle.querySelector('svg')?.classList.contains(statusGlyph(status).tone)).toBe(true);
		}
		expect(toggleOf('todo').getAttribute('aria-label')).toBe('Mark task as done: Send invoice (todo)');
		expect(toggleOf('in-progress').getAttribute('aria-label')).toBe('Mark task as done: Draft plan (in progress)');
		expect(toggleOf('cancelled').getAttribute('aria-label')).toBe('Mark task as not done: Old idea (cancelled)');

		expect(textOf(toggleOf('done')).classList.contains('line-through')).toBe(true);
		expect(textOf(toggleOf('cancelled')).classList.contains('line-through')).toBe(true);
		expect(textOf(toggleOf('in-progress')).classList.contains('line-through')).toBe(false);
	});

	it('lists an in-progress task and hides a done one under Status: Open, the default', async () => {
		mockTaskFetch([sevenStatusGroup()]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(5));

		expect(rows().map((r) => r.querySelector<HTMLElement>('[data-task-toggle]')!.dataset.taskStatus)).toEqual([
			'todo',
			'in-progress',
			'question',
			'important',
			'forwarded',
		]);
		expect(document.querySelector('[data-task-toggle][data-task-status="done"]')).toBeNull();
	});

	it('counts open tasks and the listed notes in the toolbar, under Status: Open', async () => {
		tasksStore.setQuick({ show: 'open' });
		mockTaskFetch([
			taskGroupV2(NOTE, [taskV2('Ship', { lineNumber: 1 }), taskV2('Shipped', { status: 'done', lineNumber: 2 })]),
			taskGroupV2('/vault/Other.md', [taskV2('Draft plan', { status: 'in-progress' })]),
		]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(2));

		expect(countText()).toBe('2 open in 2 notes');
	});

	it('words one open task in one note in the singular', async () => {
		tasksStore.setQuick({ show: 'open' });
		mockTaskFetch([taskGroupV2(NOTE, [taskV2('Ship')])]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		expect(countText()).toBe('1 open in 1 note');
	});
});

describe('TasksView: the two-way sync is the only Todoist path', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		// Also clears the write overlay, which outlives a test.
		resetTasks();
		editorStore.reset();
		tasksStore.setSources([]);
		settingsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		settingsStore.updateTodoist({ apiToken: 'token' });
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		vaultStore.close();
		document.body.innerHTML = '';
	});

	/** Mounts the view with one open task in {@link NOTE}. */
	async function mountWith(text: string): Promise<void> {
		mockTaskFetch([taskGroupV2(NOTE, [taskV2(text)])]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));
	}

	it('shows no Send to Todoist action, no toolbar Sync button and no Todoist badge, with a token set', async () => {
		await mountWith('Ship feature A');

		expect(document.querySelector('[title="Send to Todoist"]')).toBeNull();
		expect(document.querySelector('[title="Sync task status from Todoist"]')).toBeNull();
		// The badges were links to the Todoist task; this row's text has no URL.
		expect(document.querySelector('[data-task-row] a')).toBeNull();
	});

	it('never reads todoist-sent.json', async () => {
		await mountWith('Ship feature A');
		await new Promise((r) => setTimeout(r, 0));

		const sentFile = '/vault/.kokobrain/todoist-sent.json';
		expect(vi.mocked(exists).mock.calls.some(([p]) => p === sentFile)).toBe(false);
		expect(vi.mocked(readTextFile).mock.calls.some(([p]) => p === sentFile)).toBe(false);
	});
});

/** A promise with its resolver, for an IPC the test settles by hand. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}

describe('TasksView: loading, the rule sentence and the empty state', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		// Also clears the write overlay, which outlives a test.
		resetTasks();
		editorStore.reset();
		tasksStore.setSources([]);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	async function mountView(): Promise<void> {
		({ component } = await mountTasksView());
	}

	/** One note with one todo task per text, on lines 1, 2, ... */
	const noteWith = (texts: string[], modifiedAtSec?: number) =>
		taskGroupV2(NOTE, texts.map((text, i) => taskV2(text, { lineNumber: i + 1 })), modifiedAtSec);

	const refreshing = () => document.querySelector('[role="status"][aria-label="Refreshing tasks"]');
	const pageText = () => document.body.textContent ?? '';
	const buttonsNamed = (name: string) =>
		Array.from(document.querySelectorAll('button')).filter((b) => b.textContent?.trim() === name);
	const paragraph = (text: string) => Array.from(document.querySelectorAll('p')).find((p) => p.textContent?.trim() === text);

	it('keeps the rows and their focus during a refetch, with a refreshing status', async () => {
		const data = [noteWith(['first', 'second'])];
		const next = deferred<FileTaskGroupV2[]>();
		let calls = 0;
		mockTaskFetch(async () => {
			calls++;
			return calls === 1 ? data : next.promise;
		});
		await mountView();
		await until(() => expect(rows()).toHaveLength(2));
		const circle = rows()[0].querySelector<HTMLButtonElement>('[data-task-toggle]');
		if (!circle) throw new Error('circle button not found');
		circle.focus();
		expect(document.activeElement).toBe(circle);
		expect(refreshing()).toBeNull();

		invalidateVaultEntries();
		const refetch = buildTaskIndex();
		flushSync();
		expect(rows()).toHaveLength(2);
		expect(document.activeElement).toBe(circle);
		expect(refreshing()).not.toBeNull();

		next.resolve(data);
		await refetch;
		flushSync();
		expect(rows()).toHaveLength(2);
		expect(document.activeElement).toBe(circle);
		expect(refreshing()).toBeNull();
	});

	it('offers no Clear when there is no source card, and still offers Edit', async () => {
		mockTaskFetch([noteWith(['Ship feature A'])]);
		await mountView();
		await until(() => expect(rows()).toHaveLength(1));
		expect(paragraph(`Open tasks from every note${EXCEPT}`)).toBeDefined();
		expect(buttonsNamed('Clear')).toHaveLength(0);
		expect(buttonsNamed('Edit')).toHaveLength(1);
	});

	it('names the tag card when nothing sits under it, with Edit sources, and Clear lists every task', async () => {
		tasksStore.setSources(headingSources(['#to-list']));
		mockTaskFetch([noteWith(['Ship feature A'])]);
		await mountView();
		await until(() => expect(paragraph('No task sits under a heading containing #to-list')).toBeDefined());
		expect(buttonsNamed('Edit sources')).toHaveLength(1);
		expect(buttonsNamed('Clear')).toHaveLength(1);

		buttonsNamed('Clear')[0].click();
		await until(() => expect(rows()).toHaveLength(1));
		expect(tasksStore.query.sources).toEqual([]);
		expect(pageText()).toContain('Ship feature A');
	});

	it('shows the loading text until the first fetch settles, then an empty vault\'s empty state, kept during a refetch', async () => {
		const first = deferred<FileTaskGroupV2[]>();
		const next = deferred<FileTaskGroupV2[]>();
		let calls = 0;
		mockTaskFetch(async () => {
			calls++;
			return calls === 1 ? first.promise : next.promise;
		});
		const mounting = mountTasksView();
		await until(() => expect(pageText()).toContain('Indexing tasks...'));
		expect(pageText()).not.toContain('Open tasks');
		expect(paragraph('No tasks in this vault yet')).toBeUndefined();

		first.resolve([]);
		({ component } = await mounting);
		await until(() => expect(paragraph('No tasks in this vault yet')).toBeDefined());

		invalidateVaultEntries();
		const refetch = buildTaskIndex();
		flushSync();
		expect(paragraph('No tasks in this vault yet')).toBeDefined();
		expect(pageText()).not.toContain('Indexing tasks...');

		next.resolve([]);
		await refetch;
	});

	it('says which tasks it lists, followed by Edit and Clear, and Clear changes the session only', async () => {
		settingsStore.reset();
		tasksStore.setSources(headingSources(['#to-list']));
		mockTaskFetch([], { entries: [noteUnder('Inbox #to-list', ['Ship feature A'])] });
		await mountView();
		await until(() => expect(rows()).toHaveLength(1));
		const sentence = paragraph(`Open tasks under headings containing #to-list${EXCEPT}`);
		expect(sentence).toBeDefined();
		const edit = sentence!.nextElementSibling;
		expect(edit?.tagName).toBe('BUTTON');
		expect(edit?.textContent?.trim()).toBe('Edit');
		expect(edit?.nextElementSibling?.textContent?.trim()).toBe('Clear');
		expect(sentence!.closest('.pane-toolbar')).toBeNull();
		expect(countText()).toBe('1 open in 1 note');

		buttonsNamed('Clear')[0].click();
		flushSync();

		expect(settingsStore.tasksView).toBeUndefined();
		expect(tasksStore.query.sources).toEqual([]);
	});

	it('offers Show all when every task is done', async () => {
		mockTaskFetch([taskGroupV2(NOTE, [taskV2('Draft RFC', { status: 'done' })])]);
		await mountView();
		await until(() => expect(paragraph('The only task is closed')).toBeDefined());
		expect(buttonsNamed('Show all')).toHaveLength(1);

		buttonsNamed('Show all')[0].click();
		await until(() => expect(rows()).toHaveLength(1));
		expect(tasksStore.quick).toEqual({ show: 'all' });
		expect(pageText()).toContain('Draft RFC');
	});

	it('offers Reset Due filter when every note with tasks is older than Note edited in the last 7 days', async () => {
		tasksStore.setQuick({ due: 'edited7' });
		const yearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
		mockTaskFetch([noteWith(['Old task'], yearAgo)]);
		await mountView();
		const message = 'No task matches the Due filter';
		await until(() => expect(paragraph(message)).toBeDefined());
		const action = paragraph(message)!.nextElementSibling as HTMLButtonElement | null;
		expect(action?.textContent?.trim()).toBe('Reset Due filter');

		action!.click();
		await until(() => expect(rows()).toHaveLength(1));
		expect(tasksStore.quick.due).toBeUndefined();
		expect(pageText()).toContain('Old task');
	});

	it('shows the previous rows at once when the view is mounted again', async () => {
		const data = [noteWith(['Ship feature A'])];
		const next = deferred<FileTaskGroupV2[]>();
		let calls = 0;
		mockTaskFetch(async () => {
			calls++;
			return calls === 1 ? data : next.promise;
		});
		await mountView();
		await until(() => expect(rows()).toHaveLength(1));
		unmount(component!);
		component = null;

		// The next snapshot read is still in flight when the view mounts again.
		invalidateVaultEntries();
		await mountView();
		expect(rows()).toHaveLength(1);
		expect(pageText()).not.toContain('Indexing tasks...');
		await new Promise((r) => setTimeout(r, 0));
		flushSync();
		expect(calls).toBe(2);
		expect(rows()).toHaveLength(1);
		expect(pageText()).not.toContain('Indexing tasks...');

		next.resolve(data);
		await until(() => expect(tasksStore.isLoading).toBe(false));
	});
});

describe('TasksView: keeps its place', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		// Also clears the write overlay, which outlives a test.
		resetTasks();
		editorStore.reset();
		settingsStore.reset();
		tasksStore.setSources([]);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		vi.useRealTimers();
		document.body.innerHTML = '';
	});

	const one = (path: string, text: string) => taskGroupV2(path, [taskV2(text)]);
	const rowTexts = () => rows().map((r) => r.querySelector('[data-task-text]')?.textContent?.trim());
	const viewport = () => {
		const el = document.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
		if (!el) throw new Error('scroll area viewport not found');
		return el;
	};

	it('lists notes by path and keeps a ticked note in its place', async () => {
		const A = one('/vault/A.md', 'task in A');
		const B = one('/vault/B.md', 'task in B');
		const C = one('/vault/C.md', 'task in C');
		let calls = 0;
		mockTaskFetch(
			async () => (++calls === 1 ? [C, B, A] : [B, C, A]),
			{
				toggle: () => ({
					updatedContent: '- [x] task in B\n',
					updateResult: { changed: true, affected: [], version: 2, upserted: [], removed: [], fullRescan: false },
					stale: false,
				}),
			},
		);
		// Every status shows, so the ticked task stays listed.
		tasksStore.setQuick({ show: 'all' });
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(3));
		expect(rowTexts()).toEqual(['task in A', 'task in B', 'task in C']);

		rows()[1].querySelector<HTMLButtonElement>('[data-task-toggle]')!.click();
		await until(() => expect(toggleCalls()).toHaveLength(1));
		await until(() => expect(tasksStore.isLoading).toBe(false));
		expect(rowTexts()).toEqual(['task in A', 'task in B', 'task in C']);

		// The next snapshot holds the notes in another order.
		invalidateVaultEntries();
		await buildTaskIndex();
		flushSync();
		expect(calls).toBe(2);
		expect(rowTexts()).toEqual(['task in A', 'task in B', 'task in C']);
	});

	it('restores the scroll offset when mounted again, and opens at the top after a reset', async () => {
		mockTaskFetch([one('/vault/A.md', 'task in A')]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		// jsdom has no layout: it keeps an assigned scrollTop and fires no scroll event.
		viewport().scrollTop = 120;
		expect(viewport().scrollTop).toBe(120);
		viewport().dispatchEvent(new Event('scroll'));
		expect(tasksStore.scrollOffset).toBe(120);

		unmount(component!);
		component = null;
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));
		expect(viewport().scrollTop).toBe(120);

		unmount(component!);
		component = null;
		tasksStore.reset();
		tasksStore.setSources([]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));
		expect(viewport().scrollTop).toBe(0);
	});

});

describe('TasksView: a failed refresh says so', () => {
	let component: Record<string, unknown> | null = null;
	const MESSAGE = 'Tasks could not be refreshed. The log has the details.';

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		// Also clears the write overlay, which outlives a test.
		resetTasks();
		editorStore.reset();
		tasksStore.setSources([]);
		// A rejected fetch goes through the real `error()`, which prints it.
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		vi.mocked(console.error).mockRestore();
		document.body.innerHTML = '';
	});

	const alert = () => document.querySelector<HTMLElement>('[role="alert"]');
	const alertText = () => alert()?.querySelector('p')?.textContent?.trim();
	const retry = () => {
		const button = Array.from(alert()?.querySelectorAll('button') ?? []).find((b) => b.textContent?.trim() === 'Retry');
		if (!button) throw new Error('Retry button not found');
		return button;
	};
	const paragraph = (text: string) => Array.from(document.querySelectorAll('p')).find((p) => p.textContent?.trim() === text);
	const noteWithTask = (text: string) => taskGroupV2(NOTE, [taskV2(text)]);

	it('shows the alert under the rule sentence and keeps the list; Retry clears it once a fetch succeeds', async () => {
		const retryFetch = deferred<FileTaskGroupV2[]>();
		let calls = 0;
		mockTaskFetch(async () => {
			calls++;
			if (calls === 1) return [noteWithTask('Ship feature A')];
			if (calls === 2) throw new Error('boom');
			return retryFetch.promise;
		});
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));
		expect(alert()).toBeNull();

		invalidateVaultEntries();
		await buildTaskIndex();
		flushSync();
		expect(alertText()).toBe(MESSAGE);
		expect(rows()).toHaveLength(1);
		const sentence = paragraph(`Open tasks from every note${EXCEPT}`);
		expect(sentence).toBeDefined();
		expect(sentence!.parentElement?.nextElementSibling).toBe(alert());
		expect(countText()).toBe('1 open in 1 note');
		expect(retry().disabled).toBe(false);

		retry().click();
		flushSync();
		expect(alert()).not.toBeNull();
		expect(retry().disabled).toBe(true);

		retryFetch.resolve([noteWithTask('Ship feature A')]);
		await until(() => expect(alert()).toBeNull());
		expect(rows()).toHaveLength(1);
	});

	it('takes the empty state\'s place when no list was loaded', async () => {
		mockTaskFetch(async () => {
			throw new Error('boom');
		});
		({ component } = await mountTasksView());

		expect(alertText()).toBe(MESSAGE);
		expect(paragraph(`Open tasks from every note${EXCEPT}`)).toBeDefined();
		expect(paragraph('No tasks in this vault yet')).toBeUndefined();
	});

	it('keeps the old rows under the new rule sentence when the fetch after a tag change fails', async () => {
		tasksStore.setSources(headingSources(['#a']));
		let calls = 0;
		mockTaskFetch(async () => {
			if (++calls > 1) throw new Error('boom');
			return [];
		}, { entries: [noteUnder('List #a', ['Ship feature A'])] });
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		// The snapshot read after the sources change fails: the memo was dropped in between.
		setTaskSources([]);
		invalidateVaultEntries();
		await buildTaskIndex();
		flushSync();

		expect(paragraph(`Open tasks from every note${EXCEPT}`)).toBeDefined();
		expect(alertText()).toBe(MESSAGE);
		expect(rows()).toHaveLength(1);
		expect(document.body.textContent).toContain('Ship feature A');
	});

	it('sits above the empty state when the loaded tasks are all hidden by the filters', async () => {
		let calls = 0;
		mockTaskFetch(async () => {
			calls++;
			if (calls === 1) return [taskGroupV2(NOTE, [taskV2('Draft RFC', { status: 'done' })])];
			throw new Error('boom');
		});
		({ component } = await mountTasksView());
		expect(tasksStore.quick).toEqual(DEFAULT_QUICK);
		await until(() => expect(paragraph('The only task is closed')).toBeDefined());
		expect(alert()).toBeNull();

		invalidateVaultEntries();
		await buildTaskIndex();
		flushSync();

		expect(alertText()).toBe(MESSAGE);
		const empty = alert()!.nextElementSibling;
		expect(empty?.querySelector('p')?.textContent?.trim()).toBe('The only task is closed');
		expect(empty?.querySelector('button')?.textContent?.trim()).toBe('Show all');
	});
});

describe('TasksView: the note header', () => {
	let component: Record<string, unknown> | null = null;
	const ACME = '/vault/Projects/Clients/ACME.md';
	const ROOT_NOTE = '/vault/Root.md';

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		// Also clears the write overlay, which outlives a test.
		resetTasks();
		editorStore.reset();
		fileIconsStore.reset();
		tasksStore.setSources([]);
		vaultStore._reset();
		vaultStore.open('/vault');
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		vi.useRealTimers();
		vaultStore.close();
		document.body.innerHTML = '';
	});

	/** The header wrapper of the note titled `title`. */
	function header(title: string): HTMLElement {
		const group = Array.from(document.querySelectorAll<HTMLElement>('[data-task-group]')).find(
			(g) => g.querySelector('[data-task-group-title]')?.textContent?.trim() === title,
		);
		if (!group) throw new Error(`no task group titled ${title}`);
		return group;
	}
	const part = (title: string, hook: string) => header(title).querySelector<HTMLElement>(`[data-task-group-${hook}]`);

	/** Two open tasks and one done task. */
	const acme = (modifiedAtSec?: number) =>
		taskGroupV2(
			ACME,
			[
				taskV2('Call Ana', { lineNumber: 1 }),
				taskV2('Send quote', { lineNumber: 2 }),
				taskV2('Sign NDA', { lineNumber: 3, status: 'done', checked: true }),
			],
			modifiedAtSec,
		);
	const rootNote = (modifiedAtSec?: number) => taskGroupV2(ROOT_NOTE, [taskV2('Water plants')], modifiedAtSec);

	/** Seconds for a mid-month noon UTC instant. */
	const sec = (iso: string) => Date.parse(iso) / 1000;

	it('shows the title, the folder and "N of M open" counted before the status filter', async () => {
		mockTaskFetch([acme(), rootNote()]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(3));
		expect(tasksStore.quick).toEqual(DEFAULT_QUICK);

		expect(part('ACME', 'title')?.textContent?.trim()).toBe('ACME');
		expect(part('ACME', 'subtitle')?.textContent?.trim()).toBe('Projects/Clients');
		expect(part('ACME', 'count')?.textContent).toBe('2 of 3 open');
		expect(part('Root', 'subtitle')).toBeNull();
		expect(part('Root', 'count')?.textContent).toBe('1 of 1 open');

		tasksStore.setQuick({ show: 'all' });
		await until(() => expect(rows()).toHaveLength(4));
		expect(part('ACME', 'subtitle')?.textContent?.trim()).toBe('Projects/Clients');
		expect(part('ACME', 'count')?.textContent).toBe('2 of 3 open');
		expect(part('Root', 'subtitle')).toBeNull();
	});

	it('shows the file icon fallback for a plain note, with a neutral title', async () => {
		mockTaskFetch([acme()]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(2));

		expect(header('ACME').querySelector('svg.lucide-file-text')).not.toBeNull();
		const title = part('ACME', 'title')!;
		expect(title.tagName).toBe('BUTTON');
		expect(title.classList.contains('text-foreground')).toBe(true);
		expect(title.querySelector('svg')).toBeNull();
	});

	it('shows the resolved icon in its color, outside the title, and never tints the title', async () => {
		await preloadPacks(['emoji']);
		fileIconsStore.updateFrontmatterIcon(ACME, { iconPack: 'emoji', iconName: '🚀', color: 'red', titleColor: 'red' });
		mockTaskFetch([acme()]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(2));

		const emoji = Array.from(header('ACME').querySelectorAll('span')).find((s) => s.childElementCount === 0 && s.textContent === '🚀');
		expect(emoji).toBeDefined();
		expect(emoji!.getAttribute('style')).toBe('color: var(--type-red);');
		expect(header('ACME').querySelector('svg.lucide-file-text')).toBeNull();
		const title = part('ACME', 'title')!;
		expect(title.textContent?.trim()).toBe('ACME');
		expect(title.hasAttribute('style')).toBe(false);
		expect(title.className).not.toMatch(/text-purple/);
	});

	it('puts the modification date in the title hover text, with the year only when it differs', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
		mockTaskFetch([
			taskGroupV2('/vault/A.md', [taskV2('One')], sec('2026-06-15T12:00:00Z')),
			taskGroupV2('/vault/B.md', [taskV2('Two')], sec('2025-06-15T12:00:00Z')),
			taskGroupV2('/vault/C.md', [taskV2('Three')], 0),
		]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(3));

		expect(part('A', 'title')?.getAttribute('title')).toBe('Jun 15');
		expect(part('B', 'title')?.getAttribute('title')).toBe('Jun 15, 2025');
		expect(part('C', 'title')?.hasAttribute('title')).toBe(false);
	});

	it('gives the circle a 24px hit area and the shared focus ring, keeping its size-4 icon', async () => {
		mockTaskFetch([rootNote()]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		const toggle = document.querySelector<HTMLElement>('[data-task-toggle]')!;
		for (const token of ['p-1', '-mx-1', '-mb-1', '-mt-0.5', 'rounded-full', 'outline-none', 'focus-visible:ring-[3px]', 'focus-visible:ring-ring/50']) {
			expect(toggle.classList.contains(token), token).toBe(true);
		}
		expect(toggle.classList.contains('mt-0.5')).toBe(false);
		expect(toggle.querySelector('svg')?.classList.contains('size-4')).toBe(true);
	});
});

describe('TasksView: clean row text and metadata chips', () => {
	let component: Record<string, unknown> | null = null;
	let onOpenWikilink: ReturnType<typeof vi.fn<(target: string) => void>>;

	const SEND_INVOICE = 'Send invoice 📅 2026-11-03 ⏫ #work';
	const sendInvoice = () =>
		taskV2(SEND_INVOICE, {
			metadata: { description: 'Send invoice', dueDate: '2026-11-03', priority: 'high', tags: ['work'] },
		});

	/** The chip of `kind` in `row`, or null. */
	const chip = (row: HTMLElement, kind: string) => row.querySelector<HTMLElement>(`[data-task-chip="${kind}"]`);

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		// Also clears the write overlay, which outlives a test.
		resetTasks();
		editorStore.reset();
		tasksStore.setSources([]);
		onOpenWikilink = vi.fn<(target: string) => void>();
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-11-05T12:00:00'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		vi.useRealTimers();
	});

	it('shows the description and chips for due, priority and tag, the overdue tone on the icon only', async () => {
		mockTaskFetch([taskGroupV2(NOTE, [sendInvoice()])]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));
		const row = rows()[0];

		expect(row.querySelector('[data-task-text]')?.textContent?.trim()).toBe('Send invoice');
		expect(row.textContent).not.toContain('📅');
		expect(row.textContent).not.toContain('⏫');

		const due = chip(row, 'due')!;
		expect(due.textContent?.trim()).toBe('Nov 3');
		expect(due.hasAttribute('data-overdue')).toBe(true);
		expect(due.getAttribute('title')).toBe('Overdue, due 2026-11-03');
		expect(due.querySelector('svg')?.classList.contains('text-destructive')).toBe(true);
		const label = Array.from(due.querySelectorAll('span')).find((s) => s.textContent?.trim() === 'Nov 3')!;
		expect(label.classList.contains('text-destructive')).toBe(false);
		expect(label.classList.contains('text-foreground')).toBe(true);
		expect(due.classList.contains('text-destructive')).toBe(false);

		expect(chip(row, 'priority')?.textContent?.trim()).toBe('high');
		expect(chip(row, 'tag')?.textContent?.trim()).toBe('#work');
		expect(toggleOf('todo').getAttribute('aria-label')).toBe('Mark task as done: Send invoice (todo)');
	});

	it('keeps the raw text of a wikilink heading, opens its note and shows no tag chip', async () => {
		mockTaskFetch([
			taskGroupV2(NOTE, [
				taskV2('read [[Book#Chapter 2]]', { metadata: { description: 'read [[Book 2]]', tags: ['Chapter'] } }),
			]),
		]);
		({ component } = await mountTasksView({ onOpenWikilink }));
		await until(() => expect(rows()).toHaveLength(1));
		const row = rows()[0];

		const link = Array.from(row.querySelectorAll('[data-task-text] button')).find(
			(b) => b.textContent === 'Book#Chapter 2',
		) as HTMLButtonElement | undefined;
		if (!link) throw new Error('wikilink button not found');
		link.click();
		expect(onOpenWikilink).toHaveBeenCalledWith('Book');
		expect(chip(row, 'tag')).toBeNull();
	});

	it('does not mark a done task with a past due date overdue', async () => {
		tasksStore.setQuick({ show: 'all' });
		mockTaskFetch([
			taskGroupV2(NOTE, [
				taskV2('Paid rent 📅 2026-11-03', { status: 'done', metadata: { description: 'Paid rent', dueDate: '2026-11-03', tags: [] } }),
			]),
		]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		const due = chip(rows()[0], 'due')!;
		expect(due.textContent?.trim()).toBe('Nov 3');
		expect(due.hasAttribute('data-overdue')).toBe(false);
		expect(due.getAttribute('title')).toBe('Due 2026-11-03');
	});

	it('sends the raw text and status on a circle click, not the display text', async () => {
		vi.mocked(readTextFile).mockResolvedValue(`- [ ] ${SEND_INVOICE}\n`);
		mockTaskFetch([taskGroupV2(NOTE, [sendInvoice()])]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		toggleOf('todo').click();
		await vi.waitFor(() => expect(toggleCalls()).toHaveLength(1));
		expect(toggleCalls()[0][1]).toMatchObject({ expectedText: SEND_INVOICE, expectedStatus: 'todo' });
	});

	it('opens the note when the row space beside the text or a chip is clicked', async () => {
		vi.mocked(readTextFile).mockResolvedValue(`- [ ] ${SEND_INVOICE}\n`);
		mockTaskFetch([taskGroupV2(NOTE, [sendInvoice()])]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		const area = rows()[0].querySelector<HTMLElement>('[data-task-text]')!.parentElement!;
		area.click();
		await vi.waitFor(() => expect(editorStore.activeTabPath).toBe(NOTE));

		editorStore.reset();
		chip(rows()[0], 'priority')!.click();
		await vi.waitFor(() => expect(editorStore.activeTabPath).toBe(NOTE));
		expect(toggleCalls()).toHaveLength(0);
	});
});

describe('TasksView: sources and excludes', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		// Also clears the write overlay, which outlives a test.
		resetTasks();
		editorStore.reset();
		settingsStore.reset();
		tasksStore.setSources([]);
		// Rows get their vault-relative folder only inside an open vault.
		vaultStore.open('/vault');
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		vaultStore.close();
		vaultStore.markIndexReady();
		settingsStore.reset();
		document.body.innerHTML = '';
	});

	const rowTexts = () => rows().map((r) => r.querySelector('[data-task-text]')?.textContent?.trim());
	const paragraph = (text: string) => Array.from(document.querySelectorAll('p')).find((p) => p.textContent?.trim() === text);
	const pageText = () => document.body.textContent ?? '';
	const one = (path: string, text: string) => taskGroupV2(path, [taskV2(text)]);

	it('leaves a template task out by default, and lists it once the templates switch is off', async () => {
		// A system folder that does not hold the templates folder, so only the templates switch covers it.
		settingsStore.updateTemplates({ systemFolder: 'System' });
		mockTaskFetch([one('/vault/_system/templates/T.md', 'template task'), one('/vault/Notes/A.md', 'real task')]);
		({ component } = await mountTasksView());
		await until(() => expect(rowTexts()).toEqual(['real task']));

		tasksStore.setGlobalExcludes({ ...defaultTaskExcludes(), templatesFolder: false });
		flushSync();

		expect(rowTexts()).toEqual(['template task', 'real task']);
		expect(entryReads()).toBe(1);
	});

	it('lists only the tasks of a folder card, and names it in the sentence', async () => {
		mockTaskFetch([one('/vault/Projects/ACME/P.md', 'project task'), one('/vault/Home/H.md', 'home task')]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(2));

		tasksStore.setSources([{ clauses: [{ kind: 'folder', path: 'Projects' }] }]);
		flushSync();

		expect(rowTexts()).toEqual(['project task']);
		expect(paragraph(`Open tasks from notes in folder Projects${EXCEPT}`)).toBeDefined();
	});

	it('limits the list to a #work heading card built in the panel, with no new fetch', async () => {
		mockTaskFetch([one('/vault/A.md', 'task in A')], { entries: [noteUnder('Job #work', ['work task'], '/vault/W.md')] });
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(2));
		const reads = entryReads();
		const button = (name: string) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === name)!;

		button('Edit').click();
		flushSync();
		button('Add card').click();
		flushSync();
		await openMenu(button('Add clause'));
		Array.from(document.querySelectorAll<HTMLElement>('[role="menu"][data-state="open"] [role="menuitem"]'))
			.find((el) => el.textContent?.trim() === 'Heading')!
			.click();
		flushSync();
		const input = document.querySelector<HTMLInputElement>('input[aria-label="Heading"]')!;
		input.value = '#work';
		input.dispatchEvent(new Event('input', { bubbles: true }));

		await until(() => expect(rowTexts()).toEqual(['work task']));
		expect(entryReads()).toBe(reads);
		expect(tasksStore.isLoading).toBe(false);
	});

	it('shows Indexing tasks... and no empty state while the vault index is not ready and no row is held', async () => {
		mockTaskFetch([]);
		({ component } = await mountTasksView());
		await until(() => expect(paragraph('No tasks in this vault yet')).toBeDefined());

		vaultStore.resetIndexReady();
		flushSync();

		expect(pageText()).toContain('Indexing tasks...');
		expect(paragraph('No tasks in this vault yet')).toBeUndefined();

		vaultStore.markIndexReady();
		flushSync();
		expect(paragraph('No tasks in this vault yet')).toBeDefined();
	});
});
