// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// ScrollArea (bits-ui) observes its viewport size.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// Tauri IPC and the disk are mocked; tasksStore and editorStore stay real
// (CLAUDE.md rule 1).
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())), emit: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn(), writeTextFile: vi.fn(), exists: vi.fn(async () => false) }));

import { mount, unmount, flushSync } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import { exists, readTextFile } from '@tauri-apps/plugin-fs';
import TasksView from '#lib/features/tasks/TasksView.svelte';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { buildTaskIndex } from '#lib/features/tasks/tasks.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { FileTaskGroupV2 } from '#lib/types/vault-v2.types.js';
import type { TaskStatus } from '#lib/features/tasks/task-metadata.types.js';

const NOTE = '/vault/Projects/2026-Q2.md';

function group(text: string, lineNumber: number, status: TaskStatus = 'todo', tags: string[] = []): FileTaskGroupV2 {
	return {
		filePath: NOTE,
		fileName: '2026-Q2',
		modifiedAt: 1_700_000_000,
		tasks: [{
			text,
			checked: status !== 'todo',
			indent: 0,
			lineNumber,
			status,
			metadata: { description: text, tags },
		}],
	};
}

function toggleCalls() {
	return vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'toggle_task_status');
}

describe('TasksView row clicks', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let onOpenWikilink: ReturnType<typeof vi.fn<(target: string) => void>>;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		tasksStore.reset();
		editorStore.reset();
		tasksStore.setSectionTag('');
		onOpenWikilink = vi.fn<(target: string) => void>();
		target = document.body.appendChild(document.createElement('div'));
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
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'get_all_tasks_v2') return [group(text, lineNumber, status)];
			if (cmd === 'toggle_task_status') {
				return { updatedContent: '', updateResult: { changed: false, version: 1, upserted: [], removed: [], fullRescan: false }, stale: false };
			}
			return undefined;
		});
		component = mount(TasksView, { target, props: { onOpenWikilink } });
		flushSync();
		await vi.waitFor(() => {
			flushSync();
			if (!document.querySelector('[data-task-row]')) throw new Error('task row not rendered');
		});
	}

	/** The span holding the task's text inside its row. */
	function textSpan(): HTMLElement {
		const span = document.querySelector<HTMLElement>('[data-task-row] span');
		if (!span) throw new Error('task text span not found');
		return span;
	}

	it('opens the note at the task line when the text is clicked, without toggling', async () => {
		// Line 3 after two blank lines starts at offset 2, so a plain open
		// (no caret move) cannot pass.
		await mountView('Ship feature A', 3);
		expect(textSpan().textContent).toContain('Ship feature A');

		textSpan().click();
		await vi.waitFor(() => expect(editorStore.activeTabPath).toBe(NOTE));
		await vi.waitFor(() => expect(editorStore.pendingScrollPosition).toBe(2));

		expect(toggleCalls()).toHaveLength(0);
	});

	it('toggles the task when the circle is clicked', async () => {
		await mountView('Ship feature A');

		const circle = document.querySelector<HTMLButtonElement>('[data-task-row] button[aria-label="Mark task as done"]');
		if (!circle) throw new Error('circle button not found');
		circle.click();

		await vi.waitFor(() => expect(toggleCalls()).toHaveLength(1));
		expect(toggleCalls()[0][1]).toEqual({
			path: NOTE,
			lineNumber: 1,
			expectedText: 'Ship feature A',
			expectedStatus: 'todo',
			target: 'done',
		});
	});

	/** The circle button of the only row. */
	function circleButton(): HTMLButtonElement {
		const button = document.querySelector<HTMLButtonElement>('[data-task-row] button');
		if (!button) throw new Error('circle button not found');
		return button;
	}

	it('shows the open circle and "Mark task as done" for an important task, which a click completes', async () => {
		// "Hide completed" hides every checked row, `[!]` included.
		tasksStore.setHideCompleted(false);
		await mountView('call', 1, 'important');

		// The open `Circle` icon draws a <circle>; `CircleCheckBig` draws paths only.
		expect(circleButton().getAttribute('aria-label')).toBe('Mark task as done');
		expect(circleButton().querySelector('svg circle')).not.toBeNull();

		circleButton().click();
		await vi.waitFor(() => expect(toggleCalls()).toHaveLength(1));
		expect(toggleCalls()[0][1]).toMatchObject({ expectedStatus: 'important', target: 'done' });
	});

	it('shows the ticked circle and "Mark task as not done" for a done task', async () => {
		tasksStore.setHideCompleted(false);
		await mountView('call', 1, 'done');

		expect(circleButton().getAttribute('aria-label')).toBe('Mark task as not done');
		expect(circleButton().querySelector('svg circle')).toBeNull();
	});

	it('does nothing when the click ends a text selection inside the text', async () => {
		await mountView('Ship feature A');
		const span = textSpan();
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
		const link = Array.from(textSpan().querySelectorAll('button')).find((b) => b.textContent === 'Welcome');
		if (!link) throw new Error('wikilink button not found');

		link.click();
		await new Promise((r) => setTimeout(r, 0));
		flushSync();

		expect(onOpenWikilink).toHaveBeenCalledWith('Welcome');
		expect(editorStore.tabs.some((t) => t.path === NOTE)).toBe(false);
		expect(toggleCalls()).toHaveLength(0);
	});
});

describe('TasksView: the two-way sync is the only Todoist path', () => {
	let target: HTMLElement;
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
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		vaultStore.close();
		document.body.innerHTML = '';
	});

	/** Mounts the view with one open task in {@link NOTE}. */
	async function mountWith(text: string): Promise<void> {
		vi.mocked(invoke).mockImplementation(async (cmd: string) => (cmd === 'get_all_tasks_v2' ? [group(text, 1)] : undefined));
		component = mount(TasksView, { target, props: { onOpenWikilink: vi.fn() } });
		flushSync();
		await vi.waitFor(() => {
			flushSync();
			if (!document.querySelector('[data-task-row]')) throw new Error('task row not rendered');
		});
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

/** A note holding several tasks; `modifiedAt` is in seconds, as Rust sends it. */
function note(tasks: { text: string; lineNumber: number; status?: TaskStatus }[], modifiedAt = 1_700_000_000): FileTaskGroupV2 {
	return {
		filePath: NOTE,
		fileName: '2026-Q2',
		modifiedAt,
		tasks: tasks.map(({ text, lineNumber, status = 'todo' }) => ({
			text,
			checked: status !== 'todo',
			indent: 0,
			lineNumber,
			status,
			metadata: { description: text, tags: [] },
		})),
	};
}

/** A promise with its resolver, for an IPC the test settles by hand. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}

describe('TasksView: loading, the rule sentence and the empty state', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		tasksStore.reset();
		editorStore.reset();
		tasksStore.setSectionTag('');
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function mountView(): void {
		component = mount(TasksView, { target, props: { onOpenWikilink: vi.fn() } });
		flushSync();
	}

	const rows = () => document.querySelectorAll('[data-task-row]');
	const refreshing = () => document.querySelector('[role="status"][aria-label="Refreshing tasks"]');
	const pageText = () => target.textContent ?? '';
	const tagInput = () => {
		const input = document.querySelector<HTMLInputElement>('input[aria-label="Section tag"]');
		if (!input) throw new Error('section tag textbox not found');
		return input;
	};
	const buttonsNamed = (name: string) =>
		Array.from(document.querySelectorAll('button')).filter((b) => b.textContent?.trim() === name);
	const paragraph = (text: string) => Array.from(document.querySelectorAll('p')).find((p) => p.textContent?.trim() === text);

	/** Waits, flushing Svelte, until `check` stops throwing. */
	async function until(check: () => void): Promise<void> {
		await vi.waitFor(() => {
			flushSync();
			check();
		});
	}

	it('keeps the rows and their focus during a refetch, with a refreshing status', async () => {
		const data = [note([{ text: 'first', lineNumber: 1 }, { text: 'second', lineNumber: 2 }])];
		const next = deferred<FileTaskGroupV2[]>();
		let calls = 0;
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd !== 'get_all_tasks_v2') return undefined;
			calls++;
			return calls === 1 ? data : next.promise;
		});
		mountView();
		await until(() => expect(rows()).toHaveLength(2));
		const circle = document.querySelector<HTMLButtonElement>('[data-task-row] button');
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

	it('names the section tag when nothing sits under it, and Clear tag lists every task', async () => {
		tasksStore.setSectionTag('#to-list');
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'get_tasks_in_section_v2') return [];
			if (cmd === 'get_all_tasks_v2') return [note([{ text: 'Ship feature A', lineNumber: 1 }])];
			return undefined;
		});
		mountView();
		await until(() => expect(paragraph('No task sits under a heading containing #to-list')).toBeDefined());
		expect(buttonsNamed('Clear tag')).toHaveLength(1);
		expect(tagInput().value).toBe('#to-list');

		buttonsNamed('Clear tag')[0].click();
		await until(() => expect(rows()).toHaveLength(1));
		expect(tagInput().value).toBe('');
		expect(tasksStore.sectionTag).toBe('');
		expect(pageText()).toContain('Ship feature A');
	});

	it('keeps an empty vault\'s empty state during a refetch instead of the loading text', async () => {
		const next = deferred<FileTaskGroupV2[]>();
		let calls = 0;
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd !== 'get_all_tasks_v2') return undefined;
			calls++;
			return calls === 1 ? [] : next.promise;
		});
		mountView();
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
		const first = deferred<FileTaskGroupV2[]>();
		let sectionCalls = 0;
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'get_tasks_in_section_v2') {
				sectionCalls++;
				return sectionCalls === 1 ? first.promise : [];
			}
			if (cmd === 'get_all_tasks_v2') return [];
			return undefined;
		});
		mountView();
		expect(pageText()).toContain('Indexing tasks...');
		expect(pageText()).not.toContain('Open tasks');

		first.resolve([note([{ text: 'Ship feature A', lineNumber: 1 }])]);
		await until(() => expect(rows()).toHaveLength(1));
		const sentence = paragraph('Open tasks under headings containing #to-list');
		expect(sentence).toBeDefined();
		expect(sentence!.nextElementSibling?.tagName).toBe('BUTTON');
		expect(sentence!.nextElementSibling?.textContent?.trim()).toBe('Clear tag');
		expect(buttonsNamed('Clear tag')).toHaveLength(1);
		expect(sentence!.parentElement?.nextElementSibling?.textContent).toContain('1 task in 1 file');

		const input = tagInput();
		input.value = '#x';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		buttonsNamed('Clear tag')[0].click();
		await new Promise((r) => setTimeout(r, 450));
		flushSync();

		const xCalls = vi.mocked(invoke).mock.calls.filter(
			([cmd, args]) => cmd === 'get_tasks_in_section_v2' && (args as { sectionTag?: string } | undefined)?.sectionTag === '#x',
		);
		expect(xCalls).toHaveLength(0);
		expect(tagInput().value).toBe('');
		expect(tasksStore.sectionTag).toBe('');
	});

	it('offers Show completed when every task is done', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd: string) =>
			cmd === 'get_all_tasks_v2' ? [note([{ text: 'Draft RFC', lineNumber: 1, status: 'done' }])] : undefined,
		);
		mountView();
		await until(() => expect(paragraph('The only task is completed')).toBeDefined());
		expect(buttonsNamed('Show completed')).toHaveLength(1);

		buttonsNamed('Show completed')[0].click();
		await until(() => expect(rows()).toHaveLength(1));
		expect(tasksStore.hideCompleted).toBe(false);
		expect(pageText()).toContain('Draft RFC');
	});

	it('offers All time when every note with tasks is older than the date filter', async () => {
		tasksStore.setDateFilter('last7days');
		const yearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
		vi.mocked(invoke).mockImplementation(async (cmd: string) =>
			cmd === 'get_all_tasks_v2' ? [note([{ text: 'Old task', lineNumber: 1 }], yearAgo)] : undefined,
		);
		mountView();
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
		const data = [note([{ text: 'Ship feature A', lineNumber: 1 }])];
		const next = deferred<FileTaskGroupV2[]>();
		let calls = 0;
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd !== 'get_all_tasks_v2') return undefined;
			calls++;
			return calls === 1 ? data : next.promise;
		});
		mountView();
		await until(() => expect(rows()).toHaveLength(1));
		unmount(component!);
		component = null;

		mountView();
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
