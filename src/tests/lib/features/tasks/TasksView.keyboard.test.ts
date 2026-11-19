// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// `vaultStore.open` persists the recent-vaults list.
setupLocalStorage();

// Tauri IPC and the disk are mocked; tasksStore, editorStore and vaultStore
// stay real (CLAUDE.md rule 1).
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())), emit: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn(), writeTextFile: vi.fn(), exists: vi.fn(async () => false) }));

import { unmount, flushSync } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { resetTasks } from '#lib/features/tasks/tasks.service.js';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { registerKeybinding } from '#lib/utils/keybindings.js';
import type { FileTaskGroupV2, TaskV2, ToggleTaskResultV2 } from '#lib/types/vault-v2.types.js';
import { mockTaskFetch, mountTasksView, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';

const NOTE_A = '/vault/Projects/Alpha.md';
const NOTE_B = '/vault/Projects/Beta.md';

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]'));
const rowText = (row: Element | null | undefined) => row?.querySelector('[data-task-text]')?.textContent?.trim();
const activeRowText = () => rowText((document.activeElement as HTMLElement | null)?.closest('[data-task-row]'));
const toggleCalls = () => vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'toggle_task_status');

/** Dispatches a keydown on `el` the way the browser does, and returns it so `defaultPrevented` can be read. */
function press(el: Element, key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
	el.dispatchEvent(event);
	flushSync();
	return event;
}

/** Waits, flushing Svelte, until `check` stops throwing. */
async function until(check: () => void): Promise<void> {
	await vi.waitFor(() => {
		flushSync();
		check();
	});
}

/** A promise and the function that resolves it. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

/** Two notes: Alpha has one task with a wikilink and a URL, Beta has two plain tasks. */
function twoNotes(): FileTaskGroupV2[] {
	return [
		taskGroupV2(NOTE_A, [taskV2('Read [[Spec]] and [the doc](https://example.com/doc)', { lineNumber: 2 })]),
		taskGroupV2(NOTE_B, [
			taskV2('Call [[Ana]] about [the plan](https://example.com/plan)', { lineNumber: 4 }),
			taskV2('Pay rent', { lineNumber: 7 }),
		]),
	];
}

describe('TasksView: keyboard and accessible rows', () => {
	let component: Record<string, unknown> | null = null;
	let outside: HTMLButtonElement | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		// Also clears the write overlay, which outlives a test.
		resetTasks();
		editorStore.reset();
		tasksStore.setSources([]);
		vaultStore._reset();
		vaultStore.open('/vault');
		(document.activeElement as HTMLElement | null)?.blur();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		outside?.remove();
		outside = null;
		document.body.innerHTML = '';
	});

	it('focuses the first row on mount and moves down across a note boundary with ArrowDown', async () => {
		mockTaskFetch(twoNotes());
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(3));

		expect(document.activeElement).toBe(rows()[0]);
		expect(tasksStore.currentRow).toEqual({ filePath: NOTE_A, lineNumber: 2 });

		const event = press(rows()[0], 'ArrowDown');
		expect(event.defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(rows()[1]);
		expect(rows()[1].dataset.taskKey).toBe(`${NOTE_B}:4`);
		expect(tasksStore.currentRow).toEqual({ filePath: NOTE_B, lineNumber: 4 });
	});

	it('clamps ArrowUp at the first row and still prevents the scroll; End and Home jump', async () => {
		mockTaskFetch(twoNotes());
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(3));

		expect(press(rows()[0], 'ArrowUp').defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(rows()[0]);
		press(rows()[0], 'End');
		expect(document.activeElement).toBe(rows()[2]);
		press(rows()[2], 'Home');
		expect(document.activeElement).toBe(rows()[0]);
	});

	it('toggles the focused row with Space', async () => {
		mockTaskFetch(twoNotes());
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(3));
		press(rows()[0], 'ArrowDown');

		const event = press(rows()[1], ' ');
		expect(event.defaultPrevented).toBe(true);
		await until(() => expect(toggleCalls()).toHaveLength(1));
		expect(toggleCalls()[0][1]).toMatchObject({ path: NOTE_B, lineNumber: 4 });
	});

	it("opens the focused row's note with Enter", async () => {
		mockTaskFetch(twoNotes());
		vi.mocked(readTextFile).mockResolvedValue('\n\n\n- [ ] Call Ana\n');
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(3));
		press(rows()[0], 'ArrowDown');

		expect(press(rows()[1], 'Enter').defaultPrevented).toBe(true);
		await until(() => expect(editorStore.activeTabPath).toBe(NOTE_B));
	});

	it('leaves a Space on the circle button to the button', async () => {
		mockTaskFetch(twoNotes());
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(3));

		const circle = rows()[0].querySelector<HTMLButtonElement>('[data-task-toggle]')!;
		const event = press(circle, ' ');
		expect(event.defaultPrevented).toBe(false);
		await Promise.resolve();
		expect(toggleCalls()).toHaveLength(0);
	});

	it('puts only the tab-stop row and its controls in the tab order, and moves them with focus', async () => {
		mockTaskFetch(twoNotes());
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(3));

		const tabindexes = (row: HTMLElement) => [
			row.getAttribute('tabindex'),
			...Array.from(row.querySelectorAll('button, a')).map((el) => el.getAttribute('tabindex')),
		];
		// Row 0: row, circle, wikilink, URL, Task actions. Row 1 (not current) has a wikilink and a URL too.
		expect(tabindexes(rows()[0])).toEqual(['0', '0', '0', '0', '0']);
		expect(tabindexes(rows()[1])).toEqual(['-1', '-1', '-1', '-1', '-1']);
		expect(tabindexes(rows()[2])).toEqual(['-1', '-1', '-1']);

		press(rows()[0], 'ArrowDown');
		expect(tabindexes(rows()[0])).toEqual(['-1', '-1', '-1', '-1', '-1']);
		expect(tabindexes(rows()[1])).toEqual(['0', '0', '0', '0', '0']);

		const headers = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-task-group-title]'));
		expect(headers).toHaveLength(2);
		for (const header of headers) expect(header.getAttribute('tabindex')).not.toBe('-1');
	});

	it('names each note group as a list and each row as a list item', async () => {
		mockTaskFetch(twoNotes());
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(3));

		const lists = Array.from(document.querySelectorAll('[role="list"]'));
		expect(lists.map((l) => l.getAttribute('aria-label'))).toEqual(['Alpha', 'Beta']);
		for (const row of rows()) expect(row.getAttribute('role')).toBe('listitem');
	});

	describe('the current row across refetches', () => {
		/** Tasks A, B, C in one note; `toggle_task_status` flips the task in place and reports a change. */
		function statefulTasks(): void {
			const tasks: TaskV2[] = [
				taskV2('Task A', { lineNumber: 1 }),
				taskV2('Task B', { lineNumber: 2 }),
				taskV2('Task C', { lineNumber: 3 }),
			];
			mockTaskFetch(async () => [taskGroupV2(NOTE_A, tasks.map((t) => ({ ...t })))], {
				toggle: (args): ToggleTaskResultV2 => {
					const i = tasks.findIndex((t) => t.lineNumber === args.lineNumber);
					tasks[i] = taskV2(tasks[i].text, { lineNumber: tasks[i].lineNumber, status: 'done' });
					return {
						updatedContent: tasks.map((t) => `- [${t.status === 'done' ? 'x' : ' '}] ${t.text}`).join('\n'),
						updateResult: { changed: true, affected: [], version: 2, upserted: [], removed: [], fullRescan: false },
						stale: false,
					};
				},
			});
		}

		it('moves focus to the next row when the focused one is completed, to the one before at the end, and back after a remount', async () => {
			statefulTasks();
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(3));
			expect(activeRowText()).toBe('Task A');

			press(rows()[0], ' ');
			await until(() => expect(rows().map(rowText)).toEqual(['Task B', 'Task C']));
			await until(() => expect(activeRowText()).toBe('Task B'));
			expect(tasksStore.currentRow).toEqual({ filePath: NOTE_A, lineNumber: 2 });

			press(rows()[0], 'ArrowDown');
			expect(activeRowText()).toBe('Task C');
			press(rows()[1], ' ');
			await until(() => expect(rows().map(rowText)).toEqual(['Task B']));
			await until(() => expect(activeRowText()).toBe('Task B'));

			unmount(component!);
			component = null;
			document.body.innerHTML = '';
			({ component } = await mountTasksView());
			await until(() => expect(activeRowText()).toBe('Task B'));
		});

		it('does not move focus out of the search box when a typed search removes the current row', async () => {
			statefulTasks();
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(3));

			const search = document.querySelector<HTMLInputElement>('input[aria-label="Search tasks"]')!;
			search.focus();
			search.value = 'Task B';
			search.dispatchEvent(new Event('input', { bubbles: true }));
			await until(() => expect(rows().map(rowText)).toEqual(['Task B']));

			expect(document.activeElement).toBe(search);
			expect(tasksStore.currentRow).toEqual({ filePath: NOTE_A, lineNumber: 2 });
		});
	});

	describe('focus on open', () => {
		it('leaves focus on a button outside the view when the first rows arrive', async () => {
			const fetch = deferred<FileTaskGroupV2[]>();
			mockTaskFetch(() => fetch.promise);
			outside = document.body.appendChild(document.createElement('button'));
			outside.focus();

			const mounted = mountTasksView();
			fetch.resolve(twoNotes());
			({ component } = await mounted);
			await until(() => expect(rows()).toHaveLength(3));

			expect(document.activeElement).toBe(outside);
		});

		it('focuses the first row when nothing is focused as the first rows arrive', async () => {
			const fetch = deferred<FileTaskGroupV2[]>();
			mockTaskFetch(() => fetch.promise);

			const mounted = mountTasksView();
			fetch.resolve(twoNotes());
			({ component } = await mounted);
			await until(() => expect(rows()).toHaveLength(3));

			expect(document.activeElement).toBe(rows()[0]);
		});

		it('leaves focus in the search box when the first rows arrive', async () => {
			const fetch = deferred<FileTaskGroupV2[]>();
			mockTaskFetch(() => fetch.promise);

			const mounted = mountTasksView();
			let search: HTMLInputElement | null = null;
			await until(() => {
				search = document.querySelector<HTMLInputElement>('input[aria-label="Search tasks"]');
				expect(search).not.toBeNull();
			});
			search!.focus();
			fetch.resolve(twoNotes());
			({ component } = await mounted);
			await until(() => expect(rows()).toHaveLength(3));

			expect(document.activeElement).toBe(search);
		});
	});

	describe('Cmd+F focuses the search box', () => {
		const searchInput = () => document.querySelector<HTMLInputElement>('input[aria-label="Search tasks"]')!;

		/** Dispatches Cmd+F (or Ctrl+F, or with Shift) on `el` and returns the event. */
		function pressFind(el: Element, mods: { meta?: boolean; ctrl?: boolean; shift?: boolean } = { meta: true }): KeyboardEvent {
			const event = new KeyboardEvent('keydown', {
				key: mods.shift ? 'F' : 'f',
				metaKey: !!mods.meta,
				ctrlKey: !!mods.ctrl,
				shiftKey: !!mods.shift,
				bubbles: true,
				cancelable: true,
			});
			el.dispatchEvent(event);
			flushSync();
			return event;
		}

		it('on a task row, focuses the search box and selects its text; Ctrl+F does the same', async () => {
			mockTaskFetch(twoNotes());
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(3));
			const search = searchInput();
			search.value = 'rent';
			search.dispatchEvent(new Event('input', { bubbles: true }));
			await until(() => expect(rows()).toHaveLength(1));

			rows()[0].focus();
			expect(pressFind(rows()[0]).defaultPrevented).toBe(true);
			expect(document.activeElement).toBe(search);
			expect([search.selectionStart, search.selectionEnd]).toEqual([0, 4]);

			rows()[0].focus();
			expect(pressFind(rows()[0], { ctrl: true }).defaultPrevented).toBe(true);
			expect(document.activeElement).toBe(search);
		});

		it('from <body>, focuses the search box', async () => {
			mockTaskFetch(twoNotes());
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(3));
			(document.activeElement as HTMLElement | null)?.blur();
			expect(document.activeElement).toBe(document.body);

			expect(pressFind(document.body).defaultPrevented).toBe(true);
			expect(document.activeElement).toBe(searchInput());
		});

		it('from a contenteditable outside the view, does nothing and leaves the event alone', async () => {
			mockTaskFetch(twoNotes());
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(3));
			const editable = document.body.appendChild(document.createElement('div'));
			editable.contentEditable = 'true';
			editable.tabIndex = 0;
			editable.focus();
			expect(document.activeElement).toBe(editable);

			expect(pressFind(editable).defaultPrevented).toBe(false);
			expect(document.activeElement).toBe(editable);
		});

		it('leaves Cmd+Shift+F to the global handler', async () => {
			mockTaskFetch(twoNotes());
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(3));
			const globalSearch = vi.fn();
			const unregister = registerKeybinding({ key: 'f', meta: true, shift: true, handler: globalSearch });
			try {
				rows()[0].focus();
				pressFind(rows()[0], { meta: true, shift: true });
				expect(globalSearch).toHaveBeenCalledTimes(1);
				expect(document.activeElement).toBe(rows()[0]);
			} finally {
				unregister();
			}
		});

		it('stops listening when the view unmounts', async () => {
			mockTaskFetch(twoNotes());
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(3));
			unmount(component!);
			component = null;

			expect(pressFind(document.body).defaultPrevented).toBe(false);
		});

		it('draws the search box with the full border and placeholder tokens', async () => {
			mockTaskFetch(twoNotes());
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(3));
			const classes = Array.from(searchInput().classList);
			expect(classes).toContain('border-input');
			expect(classes).not.toContain('border-border');
			expect(classes).toContain('placeholder:text-muted-foreground');
			expect(classes.filter((c) => c.endsWith('/50'))).toEqual([]);
		});
	});
});
