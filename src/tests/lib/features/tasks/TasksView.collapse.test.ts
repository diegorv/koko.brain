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
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { collapseKey } from '#lib/features/tasks/task-query.logic.js';
import { buildTaskIndex, resetTasks } from '#lib/features/tasks/tasks.service.js';
import type { FileTaskGroupV2, TaskV2, ToggleTaskResultV2 } from '#lib/types/vault-v2.types.js';
import { mockTaskFetch, mountTasksView, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';

const NOTE_A = '/vault/A.md';
const NOTE_B = '/vault/B.md';
const NOTE_C = '/vault/C.md';

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]'));
const rowText = (row: Element | null | undefined) => row?.querySelector('[data-task-text]')?.textContent?.trim();
const rowTexts = () => rows().map(rowText);
const rowByText = (text: string) => rows().find((r) => rowText(r) === text);
const activeRowText = () => rowText((document.activeElement as HTMLElement | null)?.closest('[data-task-row]'));
const chevron = (verb: 'Collapse' | 'Expand', label: string) =>
	document.querySelector<HTMLButtonElement>(`button[aria-label="${verb} ${label}"]`);
const showMoreButton = () =>
	Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) => /^Show \d+ more$/.test(b.textContent?.trim() ?? ''));
/** The texts of the rows that hold `tabindex="0"`. */
const tabStops = () => rows().filter((r) => r.getAttribute('tabindex') === '0').map(rowText);

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

/** Clicks `el` and flushes; a jsdom click does not focus it, as WebKit does not. */
function click(el: HTMLElement | null | undefined): void {
	el!.click();
	flushSync();
}

/** One task per text, on lines 1, 2, ... */
const tasksOf = (...texts: string[]): TaskV2[] => texts.map((text, i) => taskV2(text, { lineNumber: i + 1 }));

/** `count` tasks named `Task 1` to `Task <count>`, on lines 1 to `count`. */
const manyTasks = (count: number): TaskV2[] =>
	Array.from({ length: count }, (_, i) => taskV2(`Task ${i + 1}`, { lineNumber: i + 1 }));

/** Notes A (a1), B (b1, b2) and C (c1), in that order. */
const threeNotes = (): FileTaskGroupV2[] => [
	taskGroupV2(NOTE_A, tasksOf('a1')),
	taskGroupV2(NOTE_B, tasksOf('b1', 'b2')),
	taskGroupV2(NOTE_C, tasksOf('c1')),
];

describe('TasksView: collapsing groups and the row cap', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		// Also clears the write overlay, which outlives a test.
		resetTasks();
		editorStore.reset();
		tasksStore.setSectionTag('');
		vaultStore._reset();
		vaultStore.open('/vault');
		(document.activeElement as HTMLElement | null)?.blur();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	/** Unmounts the view, as a tab switch does, and mounts it again with nothing focused. */
	async function remount(): Promise<void> {
		unmount(component!);
		component = null;
		document.body.innerHTML = '';
		(document.activeElement as HTMLElement | null)?.blur();
		({ component } = await mountTasksView());
	}

	it('collapsing a note group removes its rows and keeps it collapsed across a remount', async () => {
		mockTaskFetch(threeNotes());
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(4));

		const toggle = chevron('Collapse', 'B')!;
		expect(toggle.getAttribute('aria-expanded')).toBe('true');
		click(toggle);

		expect(rowTexts()).toEqual(['a1', 'c1']);
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
		expect(toggle.getAttribute('aria-label')).toBe('Expand B');
		expect(tasksStore.collapsedGroups.has(collapseKey('note', NOTE_B))).toBe(true);
		const groupB = document.querySelector(`[data-task-group-key="${NOTE_B}"]`)!;
		expect(groupB.querySelector('[data-task-group-title]')?.textContent?.trim()).toBe('B');
		expect(groupB.querySelector('[data-task-group-count]')?.textContent?.trim()).toBe('2 of 2 open');

		await remount();
		await until(() => expect(rowTexts()).toEqual(['a1', 'c1']));
		expect(chevron('Expand', 'B')?.getAttribute('aria-expanded')).toBe('false');
		expect(chevron('Collapse', 'A')?.getAttribute('aria-expanded')).toBe('true');
	});

	it('moves with ArrowDown and ArrowUp across a collapsed group', async () => {
		mockTaskFetch(threeNotes());
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(4));
		click(chevron('Collapse', 'B'));

		rowByText('a1')!.focus();
		press(rowByText('a1')!, 'ArrowDown');
		expect(activeRowText()).toBe('c1');
		press(rowByText('c1')!, 'ArrowUp');
		expect(activeRowText()).toBe('a1');
	});

	it('a collapse is not a removal: focus stays on the chevron and the current row is kept', async () => {
		mockTaskFetch(threeNotes());
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(4));

		rowByText('b1')!.focus();
		expect(tasksStore.currentRow).toEqual({ filePath: NOTE_B, lineNumber: 1 });
		const toggle = chevron('Collapse', 'B')!;
		toggle.focus();
		click(toggle);

		expect(document.activeElement).toBe(toggle);
		expect(tasksStore.currentRow).toEqual({ filePath: NOTE_B, lineNumber: 1 });
		expect(tabStops()).toEqual(['c1']);

		// Keys on the chevron are its own: Enter keeps its native click.
		expect(press(toggle, 'Enter').defaultPrevented).toBe(false);

		click(chevron('Expand', 'B'));
		expect(tabStops()).toEqual(['b1']);
		expect(document.activeElement).toBe(toggle);
	});

	it('a refetch with the same rows after a mouse collapse moves no focus and keeps the current row', async () => {
		mockTaskFetch(threeNotes());
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(4));

		rowByText('b1')!.focus();
		(document.activeElement as HTMLElement).blur();
		click(chevron('Collapse', 'B'));
		expect(document.activeElement).toBe(document.body);

		await buildTaskIndex();
		flushSync();
		expect(document.activeElement).toBe(document.body);
		expect(tasksStore.currentRow).toEqual({ filePath: NOTE_B, lineNumber: 1 });
	});

	describe('the tab stop after a remount', () => {
		it('(a) is the first row after the collapsed group that holds the current row', async () => {
			mockTaskFetch(threeNotes());
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(4));
			rowByText('b1')!.focus();
			click(chevron('Collapse', 'B'));

			await remount();
			await until(() => expect(activeRowText()).toBe('c1'));
			expect(tabStops()).toEqual(['c1']);
			expect(rowByText('a1')!.getAttribute('tabindex')).toBe('-1');
		});

		it('(b) is the last rendered row when the collapsed group comes last', async () => {
			// The view sorts notes by path: `Z/B.md` puts B after C, still labelled B.
			const lastB = '/vault/Z/B.md';
			mockTaskFetch([
				taskGroupV2(NOTE_A, tasksOf('a1')),
				taskGroupV2(NOTE_C, tasksOf('c1')),
				taskGroupV2(lastB, tasksOf('b1', 'b2')),
			]);
			({ component } = await mountTasksView());
			await until(() => expect(rowTexts()).toEqual(['a1', 'c1', 'b1', 'b2']));
			rowByText('b1')!.focus();
			expect(tasksStore.currentRow).toEqual({ filePath: lastB, lineNumber: 1 });
			click(chevron('Collapse', 'B'));

			await remount();
			await until(() => expect(activeRowText()).toBe('c1'));
			expect(tabStops()).toEqual(['c1']);
		});

		it('(c) is the next note\'s first row when the current row fell past the cap, else row 50', async () => {
			mockTaskFetch([taskGroupV2(NOTE_A, manyTasks(60)), taskGroupV2(NOTE_B, tasksOf('b1'))]);
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(51));
			click(showMoreButton());
			expect(rows()).toHaveLength(61);
			rowByText('Task 55')!.focus();

			await remount();
			await until(() => expect(activeRowText()).toBe('b1'));
			expect(rows()).toHaveLength(51);
			expect(tabStops()).toEqual(['b1']);
		});

		it('(c) with no note after it, is row 50', async () => {
			mockTaskFetch([taskGroupV2(NOTE_A, manyTasks(60))]);
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(50));
			click(showMoreButton());
			rowByText('Task 55')!.focus();

			await remount();
			await until(() => expect(activeRowText()).toBe('Task 50'));
			expect(tabStops()).toEqual(['Task 50']);
		});

		it('(d) is no row when nothing is rendered, and focus goes to the first chevron', async () => {
			mockTaskFetch([taskGroupV2(NOTE_A, tasksOf('a1'))]);
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(1));
			rowByText('a1')!.focus();
			click(chevron('Collapse', 'A'));

			await remount();
			await until(() => expect(document.activeElement).toBe(chevron('Expand', 'A')));
			expect(rows()).toHaveLength(0);
			expect(document.querySelectorAll('[data-task-row][tabindex="0"]')).toHaveLength(0);
		});
	});

	it('under the Open filter, completing the row above a collapsed group moves focus past it', async () => {
		const notes: Record<string, TaskV2[]> = {
			[NOTE_A]: tasksOf('a1'),
			[NOTE_B]: tasksOf('b1'),
			[NOTE_C]: tasksOf('c1'),
		};
		mockTaskFetch(async () => Object.entries(notes).map(([path, tasks]) => taskGroupV2(path, tasks.map((t) => ({ ...t })))), {
			toggle: (args): ToggleTaskResultV2 => {
				const tasks = notes[args.path as string];
				const i = tasks.findIndex((t) => t.lineNumber === args.lineNumber);
				tasks[i] = taskV2(tasks[i].text, { lineNumber: tasks[i].lineNumber, status: 'done' });
				return {
					updatedContent: tasks.map((t) => `- [${t.status === 'done' ? 'x' : ' '}] ${t.text}`).join('\n'),
					updateResult: { changed: true, affected: [], version: 2, upserted: [], removed: [], fullRescan: false },
					stale: false,
				};
			},
		});
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(3));
		click(chevron('Collapse', 'B'));

		rowByText('a1')!.focus();
		press(rowByText('a1')!, ' ');
		await until(() => expect(rowTexts()).toEqual(['c1']));
		await until(() => expect(activeRowText()).toBe('c1'));
		expect(document.activeElement).not.toBe(document.body);
	});

	describe('the row cap', () => {
		it('shows the first 50 rows of a 60-task note, then Show 10 more outside the list, which reveals the rest and focuses row 51', async () => {
			mockTaskFetch([taskGroupV2(NOTE_A, manyTasks(60))]);
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(50));

			expect(rowTexts()).toEqual(Array.from({ length: 50 }, (_, i) => `Task ${i + 1}`));
			expect(document.querySelector('[data-task-group-count]')?.textContent?.trim()).toBe('60 of 60 open');
			const more = showMoreButton()!;
			expect(more.textContent?.trim()).toBe('Show 10 more');
			expect(more.closest('[role="list"]')).toBeNull();
			expect(more.hasAttribute('data-task-row')).toBe(false);

			click(more);
			expect(rows()).toHaveLength(60);
			expect(showMoreButton()).toBeUndefined();
			expect(more.isConnected).toBe(false);
			expect(activeRowText()).toBe('Task 51');
			expect(tasksStore.currentRow).toEqual({ filePath: NOTE_A, lineNumber: 51 });

			await remount();
			await until(() => expect(rows()).toHaveLength(50));
			expect(showMoreButton()?.textContent?.trim()).toBe('Show 10 more');
		});

		it('shows no button for 50 tasks and Show 1 more for 51', async () => {
			mockTaskFetch([taskGroupV2(NOTE_A, manyTasks(50)), taskGroupV2(NOTE_B, manyTasks(51))]);
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(100));

			const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).filter((b) =>
				/^Show \d+ more$/.test(b.textContent?.trim() ?? ''),
			);
			expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Show 1 more']);
			expect(document.querySelector(`[data-task-group-key="${NOTE_A}"]`)?.contains(buttons[0])).toBe(false);
		});
	});
});
