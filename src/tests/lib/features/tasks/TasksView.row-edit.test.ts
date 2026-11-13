// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// `vaultStore.open` persists the recent-vaults list.
setupLocalStorage();

// Tauri IPC, the disk and the toasts are mocked; tasksStore, editorStore and
// vaultStore stay real (CLAUDE.md rule 1).
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())), emit: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn(), writeTextFile: vi.fn(), exists: vi.fn(async () => false) }));
vi.mock('svelte-sonner', () => ({
	toast: Object.assign(vi.fn(() => 'undo-1'), { error: vi.fn(), info: vi.fn(), dismiss: vi.fn() }),
}));

import { unmount, flushSync, tick } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { resetTasks } from '#lib/features/tasks/tasks.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { TaskPriority } from '#lib/features/tasks/task-metadata.types.js';
import type { TaskTextWriteResult } from '#lib/contracts/index.js';
import type { TaskV2 } from '#lib/types/vault-v2.types.js';
import { mockTaskFetch, mountTasksView, openMenu, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';

const NOTE = '/vault/Projects/Alpha.md';
const PRIORITY_OF: Record<string, TaskPriority> = { '🔺': 'highest', '⏫': 'high', '🔼': 'medium', '🔽': 'low', '⏬': 'lowest' };

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]'));
const rowText = (row: Element | null | undefined) => row?.querySelector('[data-task-text]')?.textContent?.trim();
const rowNamed = (text: string) => rows().find((r) => rowText(r) === text)!;
const actionsButton = (row: HTMLElement) => row.querySelector<HTMLButtonElement>('[data-task-actions]')!;
const chip = (row: HTMLElement, kind: string) => row.querySelector(`[data-task-chip="${kind}"]`)?.textContent?.trim() ?? null;
const writeCalls = () =>
	vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'write_task_text').map(([, args]) => args as Record<string, unknown>);

/** Every open menu; a submenu opens after its parent. */
const openMenus = () => Array.from(document.querySelectorAll<HTMLElement>('[role="menu"][data-state="open"]'));

/** The item labels of the `n`th open menu, separators left out. */
const menuLabels = (n = 0) =>
	Array.from(openMenus()[n]?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])
		.filter((el) => el.closest('[role="menu"]') === openMenus()[n])
		.map((el) => el.textContent?.trim());

function menuItem(label: string, menu: HTMLElement | undefined = openMenus().at(-1)): HTMLElement {
	const item = Array.from(menu?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []).find(
		(el) => el.textContent?.trim() === label,
	);
	if (!item) throw new Error(`no open menu item labelled ${label}`);
	return item;
}

/** The label of the last open menu's checked radio item, or null. */
const checkedItem = () =>
	openMenus().at(-1)?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]')?.textContent?.trim() ?? null;

async function settle(): Promise<void> {
	for (let i = 0; i < 4; i++) {
		await tick();
		flushSync();
	}
}

/** bits-ui unmounts a closed menu or dialog one animation frame later. */
async function settleUnmount(): Promise<void> {
	await settle();
	await new Promise((r) => requestAnimationFrame(() => r(undefined)));
	flushSync();
}

async function until(check: () => void): Promise<void> {
	await vi.waitFor(() => {
		flushSync();
		check();
	});
}

/**
 * Opens the submenu of the sub-trigger labelled `label` in the open row
 * menu: jsdom drives a bits-ui submenu by keyboard, so ArrowRight on the
 * focused sub-trigger.
 */
async function openSub(label: string): Promise<void> {
	const trigger = menuItem(label, openMenus()[0]);
	trigger.focus();
	trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
	await settle();
	await until(() => expect(openMenus()).toHaveLength(2));
}

async function rightClick(el: Element): Promise<void> {
	el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
	await settle();
}

/** The due date, priority and description Rust parses from a task text: what these tests read. */
function parsed(text: string): TaskV2['metadata'] {
	const due = /📅 (\d{4}-\d{2}-\d{2})/u.exec(text)?.[1];
	const priority = /[🔺⏫🔼🔽⏬]/u.exec(text)?.[0];
	const description = text.replace(/📅 \d{4}-\d{2}-\d{2}|[🔺⏫🔼🔽⏬]/gu, '').replace(/\s+/gu, ' ').trim();
	return { description, tags: [], ...(due ? { dueDate: due } : {}), ...(priority ? { priority: PRIORITY_OF[priority] } : {}) };
}

/** Closes every open menu with Escape, from the innermost out. */
async function closeMenus(): Promise<void> {
	while (openMenus().length > 0) {
		openMenus().at(-1)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
		await settleUnmount();
	}
}

/**
 * Serves one note whose task texts change as `write_task_text` writes them,
 * so a fresh snapshot read sees each write. Each answer carries the
 * re-parsed task, as Rust does.
 */
function statefulTasks(tasks: TaskV2[]): void {
	for (const t of tasks) t.metadata = parsed(t.text);
	mockTaskFetch(async () => [taskGroupV2(NOTE, tasks.map((t) => ({ ...t })))], {
		writeText: (args): TaskTextWriteResult => {
			const i = tasks.findIndex((t) => t.lineNumber === args.lineNumber);
			const text = args.newText as string;
			tasks[i] = { ...tasks[i], text, metadata: parsed(text) };
			return {
				updatedContent: '',
				updateResult: { changed: true, affected: [], version: 2, upserted: [], removed: [], fullRescan: false },
				stale: false,
				task: tasks[i],
			};
		},
	});
}

/** The `n`th (0-based) toast's Undo action. */
function undoAction(n = 0): { label: string; onClick: () => void } {
	return (vi.mocked(toast).mock.calls[n][1] as { action: { label: string; onClick: () => void } }).action;
}

/** jsdom has no layout; one client rect per element makes the controls tabbable, as in the app. */
function giveElementsLayout(): void {
	vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(() => [new DOMRect(0, 0, 10, 10)] as unknown as DOMRectList);
}

describe('TasksView: Due and Priority in the row menu', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		giveElementsLayout();
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(2026, 10, 5, 12));
		clearLocalStorage();
		resetTasks();
		editorStore.reset();
		tasksStore.setSources([]);
		tasksStore.setQuick({ show: 'all' });
		vaultStore._reset();
		vaultStore.open('/vault');
		(document.activeElement as HTMLElement | null)?.blur();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('lists Due and Priority after the statuses', async () => {
		statefulTasks([taskV2('Call Ana', { lineNumber: 1 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		await openMenu(actionsButton(rows()[0]));

		expect(menuLabels()).toEqual(['Open at line', 'Copy task text', 'Todo', 'In progress', 'Done', 'Cancelled', 'Due', 'Priority']);
	});

	it('checks None on a row with no priority; High writes the high signifier and the chip reads high', async () => {
		statefulTasks([taskV2('Call Ana ^abc', { lineNumber: 3 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		await openMenu(actionsButton(rows()[0]));
		await openSub('Priority');
		expect(menuLabels(1)).toEqual(['Highest', 'High', 'Medium', 'None', 'Low', 'Lowest']);
		expect(checkedItem()).toBe('None');

		menuItem('High').click();
		await until(() => expect(writeCalls()).toHaveLength(1));
		expect(writeCalls()[0]).toEqual({
			vaultRoot: '/vault',
			relPath: 'Projects/Alpha.md',
			lineNumber: 3,
			expectedText: 'Call Ana ^abc',
			expectedStatus: 'todo',
			newText: 'Call Ana ⏫ ^abc',
		});
		await until(() => expect(chip(rows()[0], 'priority')).toBe('high'));
		expect(vi.mocked(toast).mock.calls[0][0]).toBe('Priority set to High');
	});

	it('writes nothing when the checked priority is picked', async () => {
		statefulTasks([taskV2('Call Ana 🔼', { lineNumber: 1 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		await openMenu(actionsButton(rows()[0]));
		await openSub('Priority');
		expect(checkedItem()).toBe('Medium');
		menuItem('Medium').click();
		await settle();

		expect(writeCalls()).toHaveLength(0);
		expect(toast).not.toHaveBeenCalled();
	});

	it("Due > Tomorrow writes tomorrow's date by the faked clock", async () => {
		statefulTasks([taskV2('Call Ana', { lineNumber: 1 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		await openMenu(actionsButton(rows()[0]));
		await openSub('Due');
		menuItem('Tomorrow').click();

		await until(() => expect(writeCalls()).toHaveLength(1));
		expect(writeCalls()[0]).toMatchObject({ expectedText: 'Call Ana', newText: 'Call Ana 📅 2026-11-06' });
		await until(() => expect(chip(rows()[0], 'due')).toBe('Nov 6'));
		expect(vi.mocked(toast).mock.calls[0][0]).toBe('Due set to 2026-11-06');
	});

	it('offers Clear only on a row with a due date, and Clear removes it', async () => {
		statefulTasks([taskV2('No date', { lineNumber: 1 }), taskV2('Dated 📅 2026-11-09', { lineNumber: 2 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(2));

		await openMenu(actionsButton(rowNamed('No date')));
		await openSub('Due');
		expect(menuLabels(1)).toEqual(['Today', 'Tomorrow', 'In a week', 'Pick a date']);
		await closeMenus();

		await openMenu(actionsButton(rowNamed('Dated')));
		await openSub('Due');
		expect(menuLabels(1)).toEqual(['Today', 'Tomorrow', 'In a week', 'Pick a date', 'Clear']);
		menuItem('Clear').click();

		await until(() => expect(writeCalls()).toHaveLength(1));
		expect(writeCalls()[0]).toMatchObject({ expectedText: 'Dated 📅 2026-11-09', newText: 'Dated' });
		await until(() => expect(chip(rowNamed('Dated'), 'due')).toBeNull());
		expect(vi.mocked(toast).mock.calls[0][0]).toBe('Due cleared');
	});

	it('Pick a date opens a dialog prefilled with the due date; Save writes the picked date and focus returns to the row', async () => {
		statefulTasks([taskV2('Task A', { lineNumber: 1 }), taskV2('Task B 📅 2026-11-09', { lineNumber: 2 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(2));

		await openMenu(actionsButton(rowNamed('Task B')));
		await openSub('Due');
		menuItem('Pick a date').click();
		await settleUnmount();

		const input = await vi.waitFor(() => {
			flushSync();
			const el = document.querySelector<HTMLInputElement>('[role="dialog"] input[type="date"]');
			if (!el) throw new Error('no dialog');
			return el;
		});
		expect(openMenus()).toHaveLength(0);
		expect(input.value).toBe('2026-11-09');
		input.value = '2026-12-01';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find((b) => b.textContent?.trim() === 'Save')!.click();

		await until(() => expect(writeCalls()).toHaveLength(1));
		expect(writeCalls()[0]).toMatchObject({ lineNumber: 2, newText: 'Task B 📅 2026-12-01' });
		await settleUnmount();
		await until(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
		await new Promise((r) => requestAnimationFrame(() => r(undefined)));
		expect(document.activeElement).toBe(rowNamed('Task B'));
	});

	it('Cancel in the date dialog writes nothing and returns focus to the row', async () => {
		statefulTasks([taskV2('Task A', { lineNumber: 1 }), taskV2('Task B', { lineNumber: 2 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(2));

		await openMenu(actionsButton(rowNamed('Task B')));
		await openSub('Due');
		menuItem('Pick a date').click();
		await settleUnmount();
		const input = await vi.waitFor(() => {
			flushSync();
			const el = document.querySelector<HTMLInputElement>('[role="dialog"] input[type="date"]');
			if (!el) throw new Error('no dialog');
			return el;
		});
		expect(input.value).toBe('');
		input.value = '2026-12-01';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find((b) => b.textContent?.trim() === 'Cancel')!.click();

		await settleUnmount();
		await until(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
		await new Promise((r) => requestAnimationFrame(() => r(undefined)));
		expect(writeCalls()).toHaveLength(0);
		expect(document.activeElement).toBe(rowNamed('Task B'));
	});

	it('right click shows the same Due and Priority items, and Undo from the toast restores the previous chip', async () => {
		statefulTasks([taskV2('Call Ana 🔽', { lineNumber: 1 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));
		expect(chip(rows()[0], 'priority')).toBe('low');

		await rightClick(rows()[0].querySelector('[data-task-text]')!);
		expect(menuLabels()).toEqual(['Open at line', 'Copy task text', 'Todo', 'In progress', 'Done', 'Cancelled', 'Due', 'Priority']);
		await openSub('Due');
		expect(menuLabels(1)).toEqual(['Today', 'Tomorrow', 'In a week', 'Pick a date']);
		menuItem('Priority', openMenus()[0]).focus();
		await settle();
		await openSub('Priority');
		expect(checkedItem()).toBe('Low');
		menuItem('Highest').click();
		await until(() => expect(chip(rows()[0], 'priority')).toBe('highest'));

		undoAction().onClick();
		await until(() => expect(writeCalls()).toHaveLength(2));
		expect(writeCalls()[1]).toMatchObject({ expectedText: 'Call Ana 🔺', newText: 'Call Ana 🔽' });
		await until(() => expect(chip(rows()[0], 'priority')).toBe('low'));
		expect(toast).toHaveBeenCalledTimes(1);
	});

	it('under the Open filter and Due Today, Due > Tomorrow on the middle row removes it and focuses the next row', async () => {
		tasksStore.setQuick({ show: 'open', due: 'today' });
		statefulTasks([
			taskV2('Task A 📅 2026-11-05', { lineNumber: 1 }),
			taskV2('Task B 📅 2026-11-05', { lineNumber: 2 }),
			taskV2('Task C 📅 2026-11-05', { lineNumber: 3 }),
		]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(3));

		await openMenu(actionsButton(rowNamed('Task B')));
		await openSub('Due');
		menuItem('Tomorrow').click();
		await until(() => expect(rows().map(rowText)).toEqual(['Task A', 'Task C']));
		await settleUnmount();
		await until(() => expect(openMenus()).toHaveLength(0));

		expect(document.activeElement).toBe(rowNamed('Task C'));
		expect(rowNamed('Task C').getAttribute('tabindex')).toBe('0');
	});
});
