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
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { mockTaskFetch, mountTasksView, openMenu, sevenStatusGroup, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';

const NOTE = '/vault/Projects/2026-Q2.md';

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]'));
const rowTexts = () => rows().map((r) => r.querySelector('[data-task-text]')?.textContent?.trim());
const countText = () => document.querySelector('[data-task-count]')?.textContent?.trim();
const paragraphStarting = (text: string) =>
	Array.from(document.querySelectorAll('p')).find((p) => p.textContent?.trim().startsWith(text));
const buttonNamed = (name: string) =>
	Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === name);

/** The Status menu trigger, found by its visible text. */
function statusTrigger(): HTMLButtonElement {
	const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
		b.textContent?.trim().startsWith('Status:'),
	);
	if (!button) throw new Error('Status trigger not found');
	return button;
}

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
		tasksStore.reset();
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

	it('drops the row of a note edited 10 days ago under Last 7 days', async () => {
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

		buttonNamed('Last 7 days')!.click();
		await until(() => expect(rowTexts()).toEqual(['Fresh']));
		expect(countText()).toBe('1 open in 1 note');
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
		expect(filters.contains(buttonNamed('Last 7 days')!)).toBe(true);
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
