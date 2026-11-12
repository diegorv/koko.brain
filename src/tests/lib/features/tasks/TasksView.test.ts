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
import { buildTaskIndex } from '#lib/features/tasks/tasks.service.js';
import { statusGlyph } from '#lib/features/tasks/task-status.logic.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { FileTaskGroupV2 } from '#lib/types/vault-v2.types.js';
import type { TaskStatus } from '#lib/features/tasks/task-metadata.types.js';
import { mockTaskFetch, mountTasksView, sevenStatusGroup, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';

const NOTE = '/vault/Projects/2026-Q2.md';

function toggleCalls() {
	return vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'toggle_task_status');
}

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]'));

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
		tasksStore.reset();
		editorStore.reset();
		tasksStore.setSectionTag('');
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
		tasksStore.setHideCompleted(false);
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
		tasksStore.reset();
		editorStore.reset();
		tasksStore.setSectionTag('');
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	/** The text of the seven-status fixture's task in `status`. */
	const fixtureText = (status: TaskStatus) => sevenStatusGroup().tasks.find((t) => t.status === status)!.text;

	it('gives every status its glyph, label and title, and strikes through only closed tasks', async () => {
		tasksStore.setHideCompleted(false);
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
		expect(toggleOf('todo').getAttribute('aria-label')).toBe('Mark task as done: Send invoice 📅 2026-11-03 ⏫ #work (todo)');
		expect(toggleOf('in-progress').getAttribute('aria-label')).toBe('Mark task as done: Draft plan (in progress)');
		expect(toggleOf('cancelled').getAttribute('aria-label')).toBe('Mark task as not done: Old idea (cancelled)');

		expect(textOf(toggleOf('done')).classList.contains('line-through')).toBe(true);
		expect(textOf(toggleOf('cancelled')).classList.contains('line-through')).toBe(true);
		expect(textOf(toggleOf('in-progress')).classList.contains('line-through')).toBe(false);
	});

	it('lists an in-progress task and hides a done one with hide-closed on, the default', async () => {
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

	it('counts open tasks and the listed notes, with hide-closed off', async () => {
		tasksStore.setHideCompleted(false);
		mockTaskFetch([
			taskGroupV2(NOTE, [taskV2('Ship', { lineNumber: 1 }), taskV2('Shipped', { status: 'done', lineNumber: 2 })]),
			taskGroupV2('/vault/Other.md', [taskV2('Draft plan', { status: 'in-progress' })]),
		]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(3));

		expect(Array.from(document.querySelectorAll('p')).some((p) => p.textContent?.trim() === '2 open in 2 notes')).toBe(true);
	});

	it('words one open task in one note in the singular', async () => {
		tasksStore.setHideCompleted(false);
		mockTaskFetch([taskGroupV2(NOTE, [taskV2('Ship')])]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		expect(Array.from(document.querySelectorAll('p')).some((p) => p.textContent?.trim() === '1 open in 1 note')).toBe(true);
	});

	it('titles the hide toggle after closed tasks', async () => {
		mockTaskFetch([taskGroupV2(NOTE, [taskV2('Ship')])]);
		({ component } = await mountTasksView());

		const toggle = document.querySelector<HTMLButtonElement>('button[title="Show closed tasks"]');
		expect(toggle).not.toBeNull();
		toggle!.click();
		flushSync();
		expect(tasksStore.hideCompleted).toBe(false);
		expect(document.querySelector('button[title="Hide closed tasks"]')).not.toBeNull();
	});
});

describe('TasksView: the two-way sync is the only Todoist path', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		tasksStore.reset();
		editorStore.reset();
		tasksStore.setSectionTag('');
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
		tasksStore.reset();
		editorStore.reset();
		tasksStore.setSectionTag('');
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
	const tagInput = () => {
		const input = document.querySelector<HTMLInputElement>('input[aria-label="Section tag"]');
		if (!input) throw new Error('section tag textbox not found');
		return input;
	};
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

	it('names the section tag textbox and hints that it takes several tags', async () => {
		mockTaskFetch([]);
		await mountView();
		expect(tagInput().placeholder).toBe('#tag #tag');
	});

	it('offers no Clear tag when the section tag text holds no tag', async () => {
		tasksStore.setSectionTag(' , ');
		mockTaskFetch([noteWith(['Ship feature A'])]);
		await mountView();
		await until(() => expect(rows()).toHaveLength(1));
		expect(paragraph('Open tasks from every note')).toBeDefined();
		expect(buttonsNamed('Clear tag')).toHaveLength(0);
	});

	it('names the section tag when nothing sits under it, and Clear tag lists every task', async () => {
		tasksStore.setSectionTag('#to-list');
		mockTaskFetch([noteWith(['Ship feature A'])], { section: [] });
		await mountView();
		await until(() => expect(paragraph('No task sits under a heading containing #to-list')).toBeDefined());
		expect(buttonsNamed('Clear tag')).toHaveLength(1);
		expect(tagInput().value).toBe('#to-list');

		buttonsNamed('Clear tag')[0].click();
		await until(() => expect(rows()).toHaveLength(1));
		expect(tagInput().value).toBe('');
		expect(tasksStore.sectionTag).toBe('');
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

		const refetch = buildTaskIndex();
		flushSync();
		expect(paragraph('No tasks in this vault yet')).toBeDefined();
		expect(pageText()).not.toContain('Indexing tasks...');

		next.resolve([]);
		await refetch;
	});

	it('says which tasks it lists, and its Clear tag drops a pending tag edit', async () => {
		tasksStore.setSectionTag('#to-list');
		mockTaskFetch([], { section: [noteWith(['Ship feature A'])] });
		await mountView();
		await until(() => expect(rows()).toHaveLength(1));
		const sentence = paragraph('Open tasks under headings containing #to-list');
		expect(sentence).toBeDefined();
		expect(sentence!.nextElementSibling?.tagName).toBe('BUTTON');
		expect(sentence!.nextElementSibling?.textContent?.trim()).toBe('Clear tag');
		expect(buttonsNamed('Clear tag')).toHaveLength(1);
		expect(sentence!.parentElement?.nextElementSibling?.textContent?.trim()).toBe('1 open in 1 note');

		const input = tagInput();
		input.value = '#x';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		buttonsNamed('Clear tag')[0].click();
		await new Promise((r) => setTimeout(r, 450));
		flushSync();

		const xCalls = vi.mocked(invoke).mock.calls.filter(
			([cmd, args]) => cmd === 'get_tasks_in_section_v2' && (args as { sectionTags?: string[] } | undefined)?.sectionTags?.includes('#x'),
		);
		expect(xCalls).toHaveLength(0);
		expect(tagInput().value).toBe('');
		expect(tasksStore.sectionTag).toBe('');
	});

	it('offers Show closed when every task is done', async () => {
		mockTaskFetch([taskGroupV2(NOTE, [taskV2('Draft RFC', { status: 'done' })])]);
		await mountView();
		await until(() => expect(paragraph('The only task is closed')).toBeDefined());
		expect(buttonsNamed('Show closed')).toHaveLength(1);

		buttonsNamed('Show closed')[0].click();
		await until(() => expect(rows()).toHaveLength(1));
		expect(tasksStore.hideCompleted).toBe(false);
		expect(pageText()).toContain('Draft RFC');
	});

	it('offers All time when every note with tasks is older than the date filter', async () => {
		tasksStore.setDateFilter('last7days');
		const yearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
		mockTaskFetch([noteWith(['Old task'], yearAgo)]);
		await mountView();
		const message = 'No open task is in a note edited in the last 7 days';
		await until(() => expect(paragraph(message)).toBeDefined());
		const action = paragraph(message)!.nextElementSibling as HTMLButtonElement | null;
		expect(action?.textContent?.trim()).toBe('All time');

		action!.click();
		await until(() => expect(rows()).toHaveLength(1));
		expect(tasksStore.dateFilter).toBe('all');
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
