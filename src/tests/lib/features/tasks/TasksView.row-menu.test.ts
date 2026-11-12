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
import { readTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { buildTaskIndex, resetTasks } from '#lib/features/tasks/tasks.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { TaskStatus } from '#lib/features/tasks/task-metadata.types.js';
import type { TaskV2, ToggleTaskResultV2 } from '#lib/types/vault-v2.types.js';
import { mockTaskFetch, mountTasksView, openMenu, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';

const NOTE = '/vault/Projects/Alpha.md';

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]'));
const rowText = (row: Element | null | undefined) => row?.querySelector('[data-task-text]')?.textContent?.trim();
const rowNamed = (text: string) => rows().find((r) => rowText(r) === text)!;
const actionsButton = (row: HTMLElement) => row.querySelector<HTMLButtonElement>('[data-task-actions]')!;
const toggleCalls = () => vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'toggle_task_status');

/** The open menu: menus elsewhere in the view (Status, Display) also render radio items such as Done. */
const openMenuEl = () => document.querySelector<HTMLElement>('[role="menu"][data-state="open"]');

/** The open menu's item labels in order, separators left out. */
const menuLabels = () =>
	Array.from(openMenuEl()?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []).map((el) => el.textContent?.trim());

/** The label of the open menu's checked radio item, or null when none is checked. */
const checkedStatus = () =>
	openMenuEl()?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]')?.textContent?.trim() ?? null;

function menuItem(label: string): HTMLElement {
	const item = Array.from(openMenuEl()?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []).find(
		(el) => el.textContent?.trim() === label,
	);
	if (!item) throw new Error(`no open menu item labelled ${label}`);
	return item;
}

async function settle(): Promise<void> {
	for (let i = 0; i < 4; i++) {
		await tick();
		flushSync();
	}
}

/** bits-ui unmounts a closed menu one animation frame later. */
async function settleUnmount(): Promise<void> {
	await settle();
	await new Promise((r) => requestAnimationFrame(() => r(undefined)));
	flushSync();
}

/** Waits, flushing Svelte, until `check` stops throwing. */
async function until(check: () => void): Promise<void> {
	await vi.waitFor(() => {
		flushSync();
		check();
	});
}

function keydown(el: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
	el.dispatchEvent(event);
	flushSync();
	return event;
}

async function rightClick(el: Element): Promise<MouseEvent> {
	const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 });
	el.dispatchEvent(event);
	await settle();
	return event;
}

/**
 * Serves one note whose tasks change status as `toggle_task_status` writes
 * them, so a fresh snapshot read sees each write.
 */
function statefulTasks(tasks: TaskV2[]): void {
	mockTaskFetch(async () => [taskGroupV2(NOTE, tasks.map((t) => ({ ...t })))], {
		toggle: (args): ToggleTaskResultV2 => {
			const i = tasks.findIndex((t) => t.lineNumber === args.lineNumber);
			tasks[i] = taskV2(tasks[i].text, { lineNumber: tasks[i].lineNumber, status: args.target as TaskStatus });
			return {
				updatedContent: '',
				updateResult: { changed: true, affected: [], version: 2, upserted: [], removed: [], fullRescan: false },
				stale: false,
			};
		},
	});
}

/** The `n`th (0-based) toast's Undo action. */
function undoAction(n = 0): { label: string; onClick: () => void } {
	return (vi.mocked(toast).mock.calls[n][1] as { action: { label: string; onClick: () => void } }).action;
}

/**
 * jsdom has no layout, so `tabbable` calls every element hidden and bits-ui's
 * own close focus skips the trigger as untabbable. One client rect per
 * element makes the actions buttons tabbable, as they are in the app.
 */
function giveElementsLayout(): void {
	vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(() => [new DOMRect(0, 0, 10, 10)] as unknown as DOMRectList);
}

describe('TasksView: the row menu', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		giveElementsLayout();
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
		vi.restoreAllMocks();
	});

	it('opens from an always-visible Task actions button with the status checked; Cancelled shows Undo, and Undo writes todo back', async () => {
		statefulTasks([taskV2('Call Ana', { lineNumber: 3 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		const button = actionsButton(rows()[0]);
		expect(button.getAttribute('aria-label')).toBe('Task actions');
		expect(button.className).not.toMatch(/opacity-0|group-hover:opacity|hover:opacity/);
		await openMenu(button);
		expect(menuLabels()).toEqual(['Open at line', 'Copy task text', 'Todo', 'In progress', 'Done', 'Cancelled']);
		expect(checkedStatus()).toBe('Todo');

		menuItem('Cancelled').click();
		await until(() => expect(toast).toHaveBeenCalledTimes(1));
		expect(toggleCalls()[0][1]).toEqual({
			path: NOTE,
			lineNumber: 3,
			expectedText: 'Call Ana',
			expectedStatus: 'todo',
			target: 'cancelled',
		});
		expect(vi.mocked(toast).mock.calls[0][0]).toBe('Task marked Cancelled');
		expect(undoAction().label).toBe('Undo');

		undoAction().onClick();
		await until(() => expect(toggleCalls()).toHaveLength(2));
		expect(toggleCalls()[1][1]).toEqual({
			path: NOTE,
			lineNumber: 3,
			expectedText: 'Call Ana',
			expectedStatus: 'cancelled',
			target: 'todo',
		});
		await until(() => expect(rows()[0].querySelector('[data-task-toggle]')?.getAttribute('data-task-status')).toBe('todo'));
		expect(toast).toHaveBeenCalledTimes(1);
	});

	it('checks no status for a question task', async () => {
		statefulTasks([taskV2('Ask Ana', { status: 'question' })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		await openMenu(actionsButton(rows()[0]));

		expect(menuLabels()).toContain('In progress');
		expect(checkedStatus()).toBeNull();
	});

	it('dismisses the Undo toast on a circle click after a menu write', async () => {
		statefulTasks([taskV2('Task A', { lineNumber: 1 }), taskV2('Task B', { lineNumber: 2 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(2));

		await openMenu(actionsButton(rowNamed('Task A')));
		menuItem('In progress').click();
		await until(() => expect(toast).toHaveBeenCalledTimes(1));
		expect(toast.dismiss).not.toHaveBeenCalled();

		rowNamed('Task B').querySelector<HTMLButtonElement>('[data-task-toggle]')!.click();
		await until(() => expect(toggleCalls()).toHaveLength(2));
		expect(toast.dismiss).toHaveBeenCalledWith('undo-1');
		expect(toast).toHaveBeenCalledTimes(1);
	});

	it('sends no IPC and shows no toast when the checked status is picked', async () => {
		statefulTasks([taskV2('Draft plan', { status: 'in-progress' })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		await openMenu(actionsButton(rows()[0]));
		expect(checkedStatus()).toBe('In progress');
		menuItem('In progress').click();
		await settle();

		expect(toggleCalls()).toHaveLength(0);
		expect(toast).not.toHaveBeenCalled();
	});

	it('writes nothing on an Undo clicked after a vault switch', async () => {
		statefulTasks([taskV2('Call Ana', { lineNumber: 1 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		await openMenu(actionsButton(rows()[0]));
		menuItem('Done').click();
		await until(() => expect(toast).toHaveBeenCalledTimes(1));

		resetTasks();
		undoAction().onClick();
		await settle();

		expect(toggleCalls()).toHaveLength(1);
	});

	it('opens with Shift+F10 on a focused row, and Escape returns focus to the row, not its actions button', async () => {
		statefulTasks([taskV2('Task A', { lineNumber: 1 }), taskV2('Task B', { lineNumber: 2 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(2));
		const row = rowNamed('Task B');
		row.focus();

		const event = keydown(row, 'F10', { shiftKey: true });
		await settle();
		expect(event.defaultPrevented).toBe(true);
		expect(openMenuEl()).not.toBeNull();
		expect(checkedStatus()).toBe('Todo');

		keydown(openMenuEl()!, 'Escape');
		await settleUnmount();
		await until(() => expect(openMenuEl()).toBeNull());
		expect(document.activeElement).toBe(rowNamed('Task B'));
	});

	it('opens with the ContextMenu key on a focused row', async () => {
		statefulTasks([taskV2('Task A', { lineNumber: 1 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));
		rows()[0].focus();

		expect(keydown(rows()[0], 'ContextMenu').defaultPrevented).toBe(true);
		await settle();
		expect(menuLabels()).toEqual(['Open at line', 'Copy task text', 'Todo', 'In progress', 'Done', 'Cancelled']);
	});

	it("opens the same items on right click, with the right-clicked row's status checked; not on a group header", async () => {
		statefulTasks([taskV2('Task A', { lineNumber: 1 }), taskV2('Task B', { lineNumber: 2, status: 'done' })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(2));

		const header = document.querySelector<HTMLElement>('[data-task-group-title]')!;
		const onHeader = await rightClick(header);
		expect(onHeader.defaultPrevented).toBe(true);
		expect(openMenuEl()).toBeNull();

		await rightClick(rowNamed('Task B').querySelector('[data-task-text]')!);
		expect(menuLabels()).toEqual(['Open at line', 'Copy task text', 'Todo', 'In progress', 'Done', 'Cancelled']);
		expect(checkedStatus()).toBe('Done');

		keydown(openMenuEl()!, 'Escape');
		await settleUnmount();
		await until(() => expect(openMenuEl()).toBeNull());

		await rightClick(rowNamed('Task A'));
		expect(checkedStatus()).toBe('Todo');
		menuItem('In progress').click();
		await until(() => expect(toggleCalls()).toHaveLength(1));
		expect(toggleCalls()[0][1]).toMatchObject({ lineNumber: 1, expectedStatus: 'todo', target: 'in-progress' });
	});

	it('under the Open filter, focuses the next row after a menu write closes the middle one', async () => {
		tasksStore.setQuick({ show: 'open' });
		statefulTasks([
			taskV2('Task A', { lineNumber: 1 }),
			taskV2('Task B', { lineNumber: 2 }),
			taskV2('Task C', { lineNumber: 3 }),
		]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(3));

		await openMenu(actionsButton(rowNamed('Task B')));
		menuItem('Done').click();
		await until(() => expect(rows().map(rowText)).toEqual(['Task A', 'Task C']));
		await settleUnmount();
		await until(() => expect(openMenuEl()).toBeNull());

		expect(document.activeElement).toBe(rowNamed('Task C'));
		expect(rowNamed('Task C').getAttribute('tabindex')).toBe('0');
	});

	// A row's DropdownMenu unmounts with the row; the one ContextMenu around the list outlives it.
	it('focuses the tab-stop row when a refetch removed the row while its context menu was open', async () => {
		const tasks = [taskV2('Task A', { lineNumber: 1 }), taskV2('Task B', { lineNumber: 2 }), taskV2('Task C', { lineNumber: 3 })];
		statefulTasks(tasks);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(3));
		expect(rowText(document.activeElement)).toBe('Task A');

		await rightClick(rowNamed('Task B'));
		await until(() => expect(openMenuEl()?.contains(document.activeElement)).toBe(true));
		// Another window deletes Task B; the refetch of the next snapshot lands while the menu holds focus.
		tasks.splice(1, 1);
		invalidateVaultEntries();
		await buildTaskIndex();
		await until(() => expect(rows().map(rowText)).toEqual(['Task A', 'Task C']));
		expect(openMenuEl()?.contains(document.activeElement)).toBe(true);

		keydown(openMenuEl()!, 'Escape');
		await settleUnmount();
		await until(() => expect(openMenuEl()).toBeNull());

		expect(document.activeElement).toBe(rowNamed('Task C'));
	});

	it("focuses the next row when a refetch removes the row with its open actions menu", async () => {
		const tasks = [taskV2('Task A', { lineNumber: 1 }), taskV2('Task B', { lineNumber: 2 }), taskV2('Task C', { lineNumber: 3 })];
		statefulTasks(tasks);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(3));

		await openMenu(actionsButton(rowNamed('Task B')));
		await until(() => expect(openMenuEl()?.contains(document.activeElement)).toBe(true));
		tasks.splice(1, 1);
		invalidateVaultEntries();
		await buildTaskIndex();
		await until(() => expect(rows().map(rowText)).toEqual(['Task A', 'Task C']));
		await settleUnmount();

		expect(openMenuEl()).toBeNull();
		expect(document.activeElement).toBe(rowNamed('Task C'));
		expect(tasksStore.currentRow).toEqual({ filePath: NOTE, lineNumber: 3 });
	});

	it('leaves focus outside the view when the menu closes', async () => {
		statefulTasks([taskV2('Task A', { lineNumber: 1 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));
		const outside = document.body.appendChild(document.createElement('input'));

		await openMenu(actionsButton(rows()[0]));
		await until(() => expect(openMenuEl()?.contains(document.activeElement)).toBe(true));
		outside.focus();
		keydown(openMenuEl()!, 'Escape');
		await settleUnmount();
		await until(() => expect(openMenuEl()).toBeNull());

		expect(document.activeElement).toBe(outside);
	});

	it('copies the task text without its Todoist anchor and block id', async () => {
		const writeText = vi.fn(async (_text: string) => {});
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		statefulTasks([taskV2('Call Ana 🆔 td-123 ^abc', { lineNumber: 1 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		await openMenu(actionsButton(rows()[0]));
		menuItem('Copy task text').click();
		await settle();

		expect(writeText).toHaveBeenCalledWith('Call Ana');
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('shows an error toast when the clipboard refuses the text', async () => {
		const writeText = vi.fn(async () => {
			throw new Error('denied');
		});
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		statefulTasks([taskV2('Call Ana', { lineNumber: 1 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		await openMenu(actionsButton(rows()[0]));
		menuItem('Copy task text').click();
		await until(() => expect(toast.error).toHaveBeenCalledWith('Could not copy the task text.'));
	});

	it("opens the note at the task's line", async () => {
		vi.mocked(readTextFile).mockResolvedValue('# Alpha\n\n- [ ] Call Ana\n');
		statefulTasks([taskV2('Call Ana', { lineNumber: 3 })]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		await openMenu(actionsButton(rows()[0]));
		menuItem('Open at line').click();

		await until(() => expect(editorStore.activeTabPath).toBe(NOTE));
		await until(() => expect(editorStore.pendingScrollPosition).toBe('# Alpha\n\n'.length));
	});
});
