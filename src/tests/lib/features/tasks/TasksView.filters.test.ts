// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// `vaultStore.open` persists the recent-vaults list.
setupLocalStorage();

// Tauri IPC and the disk are mocked; tasksStore and vaultStore stay real
// (CLAUDE.md rule 1).
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())), emit: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn(), writeTextFile: vi.fn(), exists: vi.fn(async () => false) }));

import { unmount, flushSync, tick } from 'svelte';
import { resetTasks } from '#lib/features/tasks/tasks.service.js';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { TaskPriority } from '#lib/features/tasks/task-metadata.types.js';
import { mockTaskFetch, mountTasksView, openMenu, sevenStatusGroup, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';

const NOTE = '/vault/Projects/2026-Q2.md';

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]'));
const rowTexts = () => rows().map((r) => r.querySelector('[data-task-text]')?.textContent?.trim());
const countText = () => document.querySelector('[data-task-count]')?.textContent?.trim();
const paragraphStarting = (text: string) =>
	Array.from(document.querySelectorAll('p')).find((p) => p.textContent?.trim().startsWith(text));
const buttonNamed = (name: string) =>
	Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === name);

/** A filter menu trigger, found by its visible text's prefix. */
function triggerStarting(prefix: string): HTMLButtonElement {
	const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
		b.textContent?.trim().startsWith(prefix),
	);
	if (!button) throw new Error(`${prefix} trigger not found`);
	return button;
}

const statusTrigger = () => triggerStarting('Status:');
const dueTrigger = () => triggerStarting('Due:');

/** A task due on `dueDate`. */
const dueTaskV2 = (text: string, dueDate: string, lineNumber: number) =>
	taskV2(text, { lineNumber, metadata: { description: text, tags: [], dueDate } });

/** The open menu: jsdom never ends the exit animation, so a closed one stays with data-state="closed". */
const openMenuEl = () => document.querySelector<HTMLElement>('[role="menu"][data-state="open"]');

/** An item of the open menu, by role and label. */
function menuItem(role: 'menuitemradio' | 'menuitemcheckbox', label: string): HTMLElement {
	const item = Array.from(openMenuEl()?.querySelectorAll<HTMLElement>(`[role="${role}"]`) ?? []).find(
		(el) => el.textContent?.trim() === label,
	);
	if (!item) throw new Error(`no open ${role} labelled ${label}`);
	return item;
}

async function settle(): Promise<void> {
	for (let i = 0; i < 4; i++) {
		await tick();
		flushSync();
	}
}

/** Waits, flushing Svelte, until `check` stops throwing. */
async function until(check: () => void): Promise<void> {
	await vi.waitFor(() => {
		flushSync();
		check();
	});
}

describe('TasksView: the filter row', () => {
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
	});

	afterEach(async () => {
		if (component) unmount(component);
		component = null;
		vi.useRealTimers();
		vaultStore.close();
		await settle();
		document.body.innerHTML = '';
	});

	it('Status > Closed lists only the closed row, and Status > Open brings the open one back', async () => {
		mockTaskFetch([taskGroupV2(NOTE, [taskV2('Ship', { lineNumber: 1 }), taskV2('Shipped', { status: 'done', lineNumber: 2 })])]);
		({ component } = await mountTasksView());
		await until(() => expect(rowTexts()).toEqual(['Ship']));
		expect(statusTrigger().textContent?.trim()).toBe('Status: open');

		await openMenu(statusTrigger());
		menuItem('menuitemradio', 'Closed').click();
		await until(() => expect(rowTexts()).toEqual(['Shipped']));
		expect(tasksStore.quick).toEqual({ show: 'closed' });
		expect(paragraphStarting('Closed tasks')).toBeDefined();
		expect(countText()).toBe('1 task in 1 note');
		expect(statusTrigger().textContent?.trim()).toBe('Status: closed');

		await openMenu(statusTrigger());
		menuItem('menuitemradio', 'Open').click();
		await until(() => expect(rowTexts()).toEqual(['Ship']));
		expect(countText()).toBe('1 open in 1 note');
	});

	it('names every closed task and lists them on its Show all', async () => {
		mockTaskFetch([
			taskGroupV2(NOTE, [taskV2('Shipped', { status: 'done', lineNumber: 1 }), taskV2('Old idea', { status: 'cancelled', lineNumber: 2 })]),
		]);
		({ component } = await mountTasksView());
		await until(() => expect(paragraphStarting('All 2 tasks are closed')).toBeDefined());
		expect(countText()).toBe('0 open in 0 notes');

		buttonNamed('Show all')!.click();
		await until(() => expect(rowTexts()).toEqual(['Shipped', 'Old idea']));
		expect(tasksStore.quick.show).toBe('all');
		expect(tasksStore.quick.statuses).toBeUndefined();
	});

	it('picks several statuses in one go, in TASK_STATUSES order, and the Open radio clears them', async () => {
		mockTaskFetch([sevenStatusGroup(NOTE)]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(5));

		await openMenu(statusTrigger());
		menuItem('menuitemcheckbox', 'done').click();
		await settle();
		expect(openMenuEl()).not.toBeNull();
		expect(tasksStore.quick.statuses).toEqual(['done']);
		menuItem('menuitemcheckbox', 'in progress').click();
		await settle();

		expect(openMenuEl()).not.toBeNull();
		expect(tasksStore.quick.statuses).toEqual(['in-progress', 'done']);
		expect(menuItem('menuitemcheckbox', 'done').getAttribute('aria-checked')).toBe('true');
		expect(openMenuEl()!.querySelectorAll('[role="menuitemradio"][aria-checked="true"]')).toHaveLength(0);
		await until(() => expect(statusTrigger().textContent?.trim()).toBe('Status: in progress, done'));
		expect(paragraphStarting('Tasks that are in progress or done')).toBeDefined();
		expect(rows().map((r) => r.querySelector<HTMLElement>('[data-task-toggle]')!.dataset.taskStatus)).toEqual(['in-progress', 'done']);
		expect(countText()).toBe('2 tasks in 1 note');

		menuItem('menuitemradio', 'Open').click();
		await settle();
		expect(tasksStore.quick.statuses).toBeUndefined();
		expect(tasksStore.quick.show).toBe('open');
		expect(statusTrigger().textContent?.trim()).toBe('Status: open');
	});

	it('clears the chosen statuses when the radio already showing is picked again', async () => {
		tasksStore.setQuick({ show: 'closed', statuses: ['todo'] });
		mockTaskFetch([sevenStatusGroup(NOTE)]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(1));

		await openMenu(statusTrigger());
		menuItem('menuitemradio', 'Closed').click();
		await settle();

		expect(tasksStore.quick).toEqual({ show: 'closed' });
		await until(() => expect(rows()).toHaveLength(2));
	});

	it('dims a done parent kept for its open child, which keeps its toggle', async () => {
		mockTaskFetch([
			taskGroupV2(NOTE, [
				taskV2('Parent', { status: 'done', indent: 0, lineNumber: 1 }),
				taskV2('Child', { indent: 1, lineNumber: 2 }),
			]),
		]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(2));

		const [parent, child] = rows();
		expect(parent.classList.contains('opacity-60')).toBe(true);
		expect(parent.querySelector('[data-task-toggle]')).not.toBeNull();
		expect(parent.querySelector('[data-task-text]')!.classList.contains('line-through')).toBe(true);
		expect(child.classList.contains('opacity-60')).toBe(false);
		expect(child.querySelector('[data-task-text]')!.classList.contains('line-through')).toBe(false);
		expect(countText()).toBe('1 open in 1 note');
	});

	it('keeps the note header "N of M open" under Status > Closed', async () => {
		mockTaskFetch([
			taskGroupV2('/vault/Projects/Clients/ACME.md', [
				taskV2('Call Ana', { lineNumber: 1 }),
				taskV2('Send quote', { lineNumber: 2 }),
				taskV2('Sign NDA', { status: 'done', lineNumber: 3 }),
			]),
		]);
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(2));

		await openMenu(statusTrigger());
		menuItem('menuitemradio', 'Closed').click();
		await until(() => expect(rowTexts()).toEqual(['Sign NDA']));

		expect(document.querySelector('[data-task-group-count]')?.textContent).toBe('2 of 3 open');
		expect(document.querySelector('[data-task-group-subtitle]')?.textContent?.trim()).toBe('Projects/Clients');
	});

	it('drops the row of a note edited 10 days ago under Due > Note edited in the last 7 days', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		const now = new Date('2026-11-12T12:00:00Z');
		vi.setSystemTime(now);
		const daysAgo = (days: number) => Math.floor(now.getTime() / 1000) - days * 24 * 60 * 60;
		mockTaskFetch([
			taskGroupV2('/vault/Recent.md', [taskV2('Fresh')], daysAgo(1)),
			taskGroupV2('/vault/Stale.md', [taskV2('Old')], daysAgo(10)),
		]);
		({ component } = await mountTasksView());
		await until(() => expect(rowTexts()).toEqual(['Fresh', 'Old']));

		await openMenu(dueTrigger());
		menuItem('menuitemradio', 'Note edited in the last 7 days').click();
		await until(() => expect(rowTexts()).toEqual(['Fresh']));
		expect(countText()).toBe('1 open in 1 note');
		expect(dueTrigger().textContent?.trim()).toBe('Due: note edited 7 days');
	});

	it('Due > Overdue lists only the overdue row', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(2026, 10, 5, 12));
		mockTaskFetch([
			taskGroupV2(NOTE, [dueTaskV2('Late', '2026-11-04', 1), dueTaskV2('Later', '2026-11-20', 2), taskV2('Someday', { lineNumber: 3 })]),
		]);
		({ component } = await mountTasksView());
		await until(() => expect(rowTexts()).toEqual(['Late', 'Later', 'Someday']));
		expect(dueTrigger().textContent?.trim()).toBe('Due: any');

		await openMenu(dueTrigger());
		menuItem('menuitemradio', 'Overdue').click();
		await until(() => expect(rowTexts()).toEqual(['Late']));
		expect(tasksStore.quick.due).toBe('overdue');
		expect(paragraphStarting('Open tasks from every note')?.textContent?.trim().endsWith(', overdue')).toBe(true);
		expect(dueTrigger().textContent?.trim()).toBe('Due: overdue');
	});

	it('holds the seven Due options in one radio group, Any checked, the edited ones after a separator', async () => {
		mockTaskFetch([taskGroupV2(NOTE, [taskV2('Ship', { lineNumber: 1 })])]);
		({ component } = await mountTasksView());
		await until(() => expect(rowTexts()).toEqual(['Ship']));

		await openMenu(dueTrigger());
		const group = openMenuEl()!.querySelector('[role="group"]')!;
		expect(Array.from(group.querySelectorAll('[role="menuitemradio"]')).map((el) => el.textContent?.trim())).toEqual([
			'Any',
			'Overdue',
			'Today',
			'Next 7 days',
			'No date',
			'Note edited in the last 7 days',
			'Note edited in the last 30 days',
		]);
		expect(group.querySelectorAll('[role="separator"]')).toHaveLength(1);
		expect(group.querySelectorAll('[role="menuitemradio"][aria-checked="true"]')).toHaveLength(1);
		expect(menuItem('menuitemradio', 'Any').getAttribute('aria-checked')).toBe('true');
	});

	it('picking Any stores no due value', async () => {
		tasksStore.setQuick({ due: 'today' });
		mockTaskFetch([taskGroupV2(NOTE, [taskV2('Ship', { lineNumber: 1 })])]);
		({ component } = await mountTasksView());
		await until(() => expect(paragraphStarting('No task matches the Due filter')).toBeDefined());

		await openMenu(dueTrigger());
		menuItem('menuitemradio', 'Any').click();
		await until(() => expect(rowTexts()).toEqual(['Ship']));
		expect(tasksStore.quick.due).toBeUndefined();
		expect(dueTrigger().textContent?.trim()).toBe('Due: any');
	});

	it('Reset Due filter resets only Due, keeping Status at All', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(2026, 10, 5, 12));
		mockTaskFetch([taskGroupV2(NOTE, [dueTaskV2('Later', '2026-11-20', 1), taskV2('Shipped', { status: 'done', lineNumber: 2 })])]);
		({ component } = await mountTasksView());
		await until(() => expect(rowTexts()).toEqual(['Later']));

		await openMenu(statusTrigger());
		menuItem('menuitemradio', 'All').click();
		await until(() => expect(rowTexts()).toEqual(['Later', 'Shipped']));
		await openMenu(dueTrigger());
		menuItem('menuitemradio', 'Overdue').click();
		await until(() => expect(paragraphStarting('No task matches the Due filter')).toBeDefined());

		const resets = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).filter(
			(b) => b.textContent?.trim() === 'Reset Due filter',
		);
		expect(resets).toHaveLength(1);
		resets[0].click();
		await until(() => expect(rowTexts()).toEqual(['Later', 'Shipped']));
		expect(dueTrigger().textContent?.trim()).toBe('Due: any');
		expect(statusTrigger().textContent?.trim()).toBe('Status: all');
	});

	describe('Priority, Tag, Search and Reset filters', () => {
		/** A task with a priority (absent when undefined, as Rust sends it) and tags. */
		const metaTaskV2 = (text: string, lineNumber: number, priority: TaskPriority | undefined, tags: string[]) =>
			taskV2(text, { lineNumber, metadata: { description: text, tags, ...(priority ? { priority } : {}) } });
		const metaGroup = () =>
			taskGroupV2(NOTE, [
				metaTaskV2('Bill ACME', 1, 'high', ['work']),
				metaTaskV2('Call client', 2, 'low', ['work/client']),
				metaTaskV2('Plan workshop', 3, undefined, ['workshop']),
				metaTaskV2('Water plants', 4, 'medium', []),
			]);
		const ALL_TEXTS = ['Bill ACME', 'Call client', 'Plan workshop', 'Water plants'];

		const searchBox = () => document.querySelector<HTMLInputElement>('input[aria-label="Search tasks"]')!;
		const priorityTrigger = () => triggerStarting('Priority');
		const tagTrigger = () => triggerStarting('Tag');
		const filtersTrigger = () => triggerStarting('Filters');

		/** Closes the open menu with Escape: a checkbox pick leaves it open. */
		async function closeOpenMenu() {
			openMenuEl()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
			await until(() => expect(openMenuEl()).toBeNull());
		}

		function typeSearch(value: string) {
			const box = searchBox();
			box.value = value;
			box.dispatchEvent(new Event('input', { bubbles: true }));
		}

		it('narrows the rows as the search is typed', async () => {
			mockTaskFetch([metaGroup()]);
			({ component } = await mountTasksView());
			await until(() => expect(rowTexts()).toEqual(ALL_TEXTS));
			expect(searchBox().type).toBe('search');
			expect(document.querySelector('.pane-toolbar')!.contains(searchBox())).toBe(true);

			typeSearch('CL');
			await until(() => expect(rowTexts()).toEqual(['Call client']));
			expect(tasksStore.quick.search).toBe('CL');
			typeSearch('');
			await until(() => expect(rowTexts()).toEqual(ALL_TEXTS));
			expect(tasksStore.quick.search).toBeUndefined();
		});

		it('Tag > #work lists work and work/client rows and stays open for a second pick', async () => {
			mockTaskFetch([metaGroup()]);
			({ component } = await mountTasksView());
			await until(() => expect(rowTexts()).toEqual(ALL_TEXTS));
			expect(tagTrigger().textContent?.trim()).toBe('Tag');

			await openMenu(tagTrigger());
			expect(Array.from(openMenuEl()!.querySelectorAll('[role="menuitemcheckbox"]')).map((el) => el.textContent?.trim())).toEqual([
				'#work',
				'#work/client',
				'#workshop',
			]);
			menuItem('menuitemcheckbox', '#work').click();
			await until(() => expect(rowTexts()).toEqual(['Bill ACME', 'Call client']));
			expect(tasksStore.quick.tags).toEqual(['work']);
			expect(tagTrigger().textContent?.trim()).toBe('Tag: #work');
			expect(openMenuEl()).not.toBeNull();

			menuItem('menuitemcheckbox', '#workshop').click();
			await until(() => expect(rowTexts()).toEqual(['Bill ACME', 'Call client', 'Plan workshop']));
			expect(tagTrigger().textContent?.trim()).toBe('Tag: #work, #workshop');
		});

		it('Tag holds one disabled item when no task has a tag', async () => {
			mockTaskFetch([taskGroupV2(NOTE, [taskV2('Ship', { lineNumber: 1 })])]);
			({ component } = await mountTasksView());
			await until(() => expect(rowTexts()).toEqual(['Ship']));

			await openMenu(tagTrigger());
			const items = Array.from(openMenuEl()!.querySelectorAll<HTMLElement>('[role="menuitem"]'));
			expect(items.map((el) => el.textContent?.trim())).toEqual(['No tags in these tasks']);
			expect(items[0].hasAttribute('data-disabled')).toBe(true);
		});

		it('Priority lists the six levels in order and reads its picks in that order, staying open', async () => {
			mockTaskFetch([metaGroup()]);
			({ component } = await mountTasksView());
			await until(() => expect(rowTexts()).toEqual(ALL_TEXTS));
			expect(priorityTrigger().textContent?.trim()).toBe('Priority');

			await openMenu(priorityTrigger());
			expect(Array.from(openMenuEl()!.querySelectorAll('[role="menuitemcheckbox"]')).map((el) => el.textContent?.trim())).toEqual([
				'highest',
				'high',
				'medium',
				'no priority',
				'low',
				'lowest',
			]);
			menuItem('menuitemcheckbox', 'no priority').click();
			await until(() => expect(rowTexts()).toEqual(['Plan workshop']));
			expect(openMenuEl()).not.toBeNull();
			menuItem('menuitemcheckbox', 'high').click();
			await until(() => expect(rowTexts()).toEqual(['Bill ACME', 'Plan workshop']));
			expect(tasksStore.quick.priorities).toEqual(['high', 'none']);
			expect(priorityTrigger().textContent?.trim()).toBe('Priority: high, no priority');
		});

		it('shows Reset filters only off the defaults, and a typed then deleted letter leaves no trace', async () => {
			mockTaskFetch([metaGroup()]);
			({ component } = await mountTasksView());
			await until(() => expect(rowTexts()).toEqual(ALL_TEXTS));
			expect(buttonNamed('Reset filters')).toBeUndefined();

			typeSearch('b');
			await until(() => expect(buttonNamed('Reset filters')).toBeDefined());
			typeSearch('');
			await until(() => expect(buttonNamed('Reset filters')).toBeUndefined());

			await openMenu(priorityTrigger());
			menuItem('menuitemcheckbox', 'high').click();
			await until(() => expect(buttonNamed('Reset filters')).toBeDefined());
		});

		it('Reset filters restores Status, Due, Priority, Tag and the search box', async () => {
			mockTaskFetch([metaGroup()]);
			({ component } = await mountTasksView());
			await until(() => expect(rowTexts()).toEqual(ALL_TEXTS));

			await openMenu(statusTrigger());
			menuItem('menuitemradio', 'All').click();
			await settle();
			await openMenu(dueTrigger());
			menuItem('menuitemradio', 'No date').click();
			await settle();
			await openMenu(priorityTrigger());
			menuItem('menuitemcheckbox', 'high').click();
			await closeOpenMenu();
			await openMenu(tagTrigger());
			menuItem('menuitemcheckbox', '#work').click();
			await closeOpenMenu();
			typeSearch('bill');
			await until(() => expect(rowTexts()).toEqual(['Bill ACME']));
			expect(filtersTrigger().textContent?.trim()).toBe('Filters (4)');

			buttonNamed('Reset filters')!.click();
			await until(() => expect(rowTexts()).toEqual(ALL_TEXTS));
			expect(tasksStore.quick).toEqual({ show: 'open' });
			expect(searchBox().value).toBe('');
			expect(statusTrigger().textContent?.trim()).toBe('Status: open');
			expect(dueTrigger().textContent?.trim()).toBe('Due: any');
			expect(priorityTrigger().textContent?.trim()).toBe('Priority');
			expect(tagTrigger().textContent?.trim()).toBe('Tag');
			expect(buttonNamed('Reset filters')).toBeUndefined();

			await openMenu(tagTrigger());
			expect(menuItem('menuitemcheckbox', '#work').getAttribute('aria-checked')).toBe('false');
		});

		it('counts the folded menus off their default in Filters (n), not the search', async () => {
			mockTaskFetch([metaGroup()]);
			({ component } = await mountTasksView());
			await until(() => expect(rowTexts()).toEqual(ALL_TEXTS));
			expect(filtersTrigger().textContent?.trim()).toBe('Filters (0)');

			await openMenu(statusTrigger());
			menuItem('menuitemradio', 'All').click();
			await until(() => expect(filtersTrigger().textContent?.trim()).toBe('Filters (1)'));
			typeSearch('bill');
			await until(() => expect(rowTexts()).toEqual(['Bill ACME']));
			expect(filtersTrigger().textContent?.trim()).toBe('Filters (1)');
		});

		it('the Filters menu holds the four groups flat, each under a label and a separator', async () => {
			mockTaskFetch([metaGroup()]);
			({ component } = await mountTasksView());
			await until(() => expect(rowTexts()).toEqual(ALL_TEXTS));

			await openMenu(filtersTrigger());
			const menu = openMenuEl()!;
			expect(Array.from(menu.querySelectorAll('[data-slot="dropdown-menu-label"]')).map((el) => el.textContent?.trim())).toEqual([
				'Status',
				'Due',
				'Priority',
				'Tag',
			]);
			expect(menu.querySelector('[role="menu"] [role="menu"]')).toBeNull();
			expect(menu.querySelectorAll('[role="menuitemcheckbox"]')).toHaveLength(7 + 6 + 3);

			menuItem('menuitemcheckbox', '#work').click();
			await until(() => expect(rowTexts()).toEqual(['Bill ACME', 'Call client']));
			expect(filtersTrigger().textContent?.trim()).toBe('Filters (1)');
		});
	});

	it('keeps the title, count and spinner in the toolbar and the filters in their own row', async () => {
		mockTaskFetch([taskGroupV2(NOTE, [taskV2('Ship', { lineNumber: 1 })])]);
		({ component } = await mountTasksView());
		await until(() => expect(rowTexts()).toEqual(['Ship']));

		const toolbar = document.querySelector<HTMLElement>('.pane-toolbar')!;
		const filters = document.querySelector<HTMLElement>('[data-task-filters]')!;
		expect(toolbar.querySelector('.text-title')?.textContent?.trim()).toBe('Tasks');
		expect(toolbar.querySelector('[data-task-count]')?.textContent?.trim()).toBe('1 open in 1 note');
		expect(filters.querySelector('[data-task-count]')).toBeNull();
		expect(filters.contains(statusTrigger())).toBe(true);
		expect(toolbar.contains(statusTrigger())).toBe(false);
		expect(filters.contains(dueTrigger())).toBe(true);
		expect(statusTrigger().compareDocumentPosition(dueTrigger()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(filters.querySelector('input[aria-label="Section tag"]')).not.toBeNull();

		tasksStore.setLoading(true);
		await settle();
		expect(toolbar.querySelector('[role="status"]')).not.toBeNull();
		expect(filters.querySelector('[role="status"]')).toBeNull();
		tasksStore.setLoading(false);
	});

	it('shows no count before the first load', async () => {
		let release: (() => void) | undefined;
		mockTaskFetch(() => new Promise((r) => (release = () => r([]))));
		const mounting = mountTasksView();
		await until(() => expect(release).toBeDefined());
		expect(document.body.textContent).toContain('Indexing tasks...');
		expect(document.querySelector('[data-task-count]')).toBeNull();

		release!();
		({ component } = await mounting);
		expect(countText()).toBe('0 open in 0 notes');
	});
});
