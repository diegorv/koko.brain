// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// `vaultStore.open` persists the recent-vaults list.
setupLocalStorage();

// Only the boundaries docs/TESTING.md allows: the disk, IPC, the toast, the
// theme DOM service and the log. The settings and tasks stores, loadSettings,
// persistence and the saved view operations run for real.
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(() => Promise.resolve()),
	mkdir: vi.fn(() => Promise.resolve()),
	exists: vi.fn(() => Promise.resolve(true)),
	copyFile: vi.fn(() => Promise.resolve()),
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())), emit: vi.fn() }));
vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));
vi.mock('#lib/core/settings/theme.service.js', () => ({
	applyActiveTheme: vi.fn(),
}));

import { flushSync, unmount } from 'svelte';
import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { loadSettings } from '#lib/core/settings/settings.service.js';
import { startSettingsPersistence, stopSettingsPersistence } from '#lib/core/settings/settings-persistence.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { buildTaskIndex, loadSavedTasksView, resetTasks } from '#lib/features/tasks/tasks.service.js';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { ALL_OPEN_ID, NO_DATE_ID, TO_LIST_ID, findTaskView } from '#lib/features/tasks/task-views.logic.js';
import type { TaskViewQuery } from '#lib/features/tasks/task-views.logic.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { mockTaskFetch, mountTasksView, openMenu, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const SETTINGS = '/vault/.kokobrain/settings.json';

/** The `tasksView` of the last settings.json written. */
function lastTasksView(): { activeList: string; savedViews: { id: string; name: string; query: TaskViewQuery }[] } {
	const calls = vi.mocked(writeTextFile).mock.calls.filter(([path]) => path === SETTINGS);
	return JSON.parse(calls.at(-1)![1] as string).tasksView;
}

/** Lets the Svelte effect flush (microtask), then runs out the persistence debounce. */
async function settle(): Promise<void> {
	await vi.advanceTimersByTimeAsync(0);
	await vi.advanceTimersByTimeAsync(500);
}

/** A note whose tasks sit under `## Inbox #to-list`. */
function underToList(path: string, texts: string[], overrides: Partial<NoteEntryV2> = {}): NoteEntryV2 {
	return entryV2(path, {
		taskHeadings: [{ level: 2, text: 'Inbox #to-list', line: 1 }],
		tasks: texts.map((text, i) => taskV2(text, { lineNumber: i + 2, heading: 0 })),
		...overrides,
	});
}

const rowTexts = () =>
	Array.from(document.querySelectorAll('[data-task-row] [data-task-text]'))
		.map((el) => el.textContent?.trim() ?? '')
		.sort();

const column = () => document.querySelector<HTMLElement>('[data-task-lists="column"]')!;

/** The column's list buttons, as [name, active] pairs. */
const columnLists = () =>
	Array.from(column().querySelectorAll<HTMLElement>('[data-task-list]')).map((el) => [
		el.textContent?.trim(),
		el.getAttribute('aria-current') === 'true',
	]);

/** The column's button for the list named `name`. */
function listButton(name: string): HTMLElement {
	const found = Array.from(column().querySelectorAll<HTMLElement>('[data-task-list]')).find((el) => el.textContent?.trim() === name);
	if (!found) throw new Error(`no list ${name} in the column`);
	return found;
}

/** The element whose aria-label or text is `name`, inside `root`. */
function byName(root: ParentNode, selector: string, name: string): HTMLElement {
	const found = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
		(el) => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === name,
	);
	if (found.length !== 1) throw new Error(`${found.length} ${selector} named ${name}`);
	return found[0];
}

/** The open menu's item reading `text`. */
function menuItem(text: string, role = 'menuitem'): HTMLElement {
	return byName(document, `[role="menu"][data-state="open"] [role="${role}"]`, text);
}

/** Types `value` into the name input, then presses `key` in it. */
function typeName(value: string, key: 'Enter' | 'Escape'): void {
	const input = byName(document, 'input', 'View name') as HTMLInputElement;
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
	flushSync();
}

/** The count the column shows beside the list `id`. */
const columnCount = (id: string) => column().querySelector(`[data-task-list-count="${id}"]`)?.textContent?.trim();

/** The "modified" marker under the sentence, or null when hidden. */
const marker = () => document.querySelector<HTMLElement>('[data-task-modified]');

/** The marker's button labels, in order. */
const markerButtons = () => Array.from(marker()?.querySelectorAll('button') ?? []).map((b) => b.textContent?.trim());

/** The page's only button reading `name`, or undefined. */
const buttonNamed = (name: string) =>
	Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === name);

describe('TasksView: the list column', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(async () => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(mkdir).mockResolvedValue(undefined);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		clearLocalStorage();
		resetTasks();
		settingsStore.reset();
		vaultStore.open('/vault');
		// Opens the vault the way initializeVault does, on a settings.json with no tasksView.
		vi.mocked(readTextFile).mockResolvedValueOnce('{}');
		const outcome = await loadSettings('/vault');
		loadSavedTasksView();
		startSettingsPersistence('/vault', outcome);
		mockTaskFetch([taskGroupV2('/vault/Home/H.md', [taskV2('home task')])], {
			entries: [
				underToList('/vault/Inbox.md', ['inbox task']),
				underToList('/vault/Old.md', ['archived task'], { archived: true }),
			],
		});
		({ component } = await mountTasksView());
	});

	afterEach(async () => {
		if (component) unmount(component);
		component = null;
		await stopSettingsPersistence();
		vaultStore.close();
		settingsStore.reset();
		vi.useRealTimers();
		document.body.innerHTML = '';
	});

	it('lists "All open", "No date" then "To list", with "To list" active, and clicking "All open" lists every open task', () => {
		expect(columnLists()).toEqual([
			['All open', false],
			['No date', false],
			['To list', true],
		]);
		expect(rowTexts()).toEqual(['inbox task']);

		listButton('All open').click();
		flushSync();

		expect(tasksStore.activeList).toBe(ALL_OPEN_ID);
		expect(columnLists()).toEqual([
			['All open', true],
			['No date', false],
			['To list', false],
		]);
		expect(rowTexts()).toEqual(['home task', 'inbox task']);
		expect(column().classList.contains('pane-toolbar')).toBe(false);
	});

	it('Save view names the session as a new active view and writes it to settings.json', async () => {
		listButton('All open').click();
		flushSync();
		byName(column(), 'button', 'Save view').click();
		flushSync();

		// A blank name keeps the input open; Escape closes it without saving.
		typeName('  ', 'Enter');
		expect(byName(document, 'input', 'View name')).toBeDefined();
		typeName('Ignored', 'Escape');
		expect(document.querySelectorAll('input[aria-label="View name"]')).toHaveLength(0);
		expect(tasksStore.savedViews).toHaveLength(1);
		// A cancelled save gives focus back to the button that opened it.
		expect(document.activeElement).toBe(byName(column(), 'button', 'Save view'));

		byName(column(), 'button', 'Save view').click();
		flushSync();
		typeName('Work', 'Enter');

		expect(columnLists()).toEqual([
			['All open', false],
			['No date', false],
			['To list', false],
			['Work', true],
		]);
		expect(rowTexts()).toEqual(['home task', 'inbox task']);
		await settle();
		const saved = lastTasksView();
		expect(saved.savedViews.map((v) => v.name)).toEqual(['To list', 'Work']);
		expect(saved.activeList).toBe(tasksStore.activeList);
	});

	it('Rename, Duplicate and Delete in the row menu change the column and the written savedViews', async () => {
		expect(column().querySelectorAll('[aria-label^="List actions"]')).toHaveLength(1);

		await openMenu(byName(column(), 'button', 'List actions: To list'));
		expect(menuItem('Delete').getAttribute('aria-disabled')).toBe('true');
		menuItem('Rename').click();
		flushSync();
		typeName('Inbox', 'Enter');
		expect(columnLists()).toEqual([
			['All open', false],
			['No date', false],
			['Inbox', true],
		]);

		await openMenu(byName(column(), 'button', 'List actions: Inbox'));
		menuItem('Duplicate').click();
		flushSync();
		expect(columnLists()).toEqual([
			['All open', false],
			['No date', false],
			['Inbox', true],
			['Inbox copy', false],
		]);
		await settle();
		expect(lastTasksView().savedViews.map((v) => v.name)).toEqual(['Inbox', 'Inbox copy']);

		await openMenu(byName(column(), 'button', 'List actions: Inbox'));
		expect(menuItem('Delete').getAttribute('aria-disabled')).not.toBe('true');
		menuItem('Delete').click();
		flushSync();

		expect(columnLists()).toEqual([
			['All open', false],
			['No date', false],
			['Inbox copy', true],
		]);
		// The deleted row's menu trigger is gone; focus moves to the list now active.
		expect(document.activeElement).toBe(listButton('Inbox copy'));
		await settle();
		expect(lastTasksView().savedViews.map((v) => v.name)).toEqual(['Inbox copy']);
	});

	it('a "Global" switch applies to every list; a "This list" exclude only to the active list, until a list switch', async () => {
		const section = (scope: 'global' | 'list') => document.querySelector<HTMLElement>(`[data-task-excludes="${scope}"]`)!;
		const listSwitches = () => Array.from(section('list').querySelectorAll('[role="switch"]')).map((s) => s.getAttribute('aria-checked'));
		listButton('All open').click();
		flushSync();
		byName(document, 'button', 'Edit').click();
		flushSync();
		// The archived note is excluded by the default global switch.
		expect(rowTexts()).toEqual(['home task', 'inbox task']);

		byName(section('global'), '[role="switch"]', 'Archived notes').click();
		flushSync();
		expect(tasksStore.globalExcludes.archived).toBe(false);
		expect(rowTexts()).toEqual(['archived task', 'home task', 'inbox task']);
		listButton('To list').click();
		flushSync();
		expect(rowTexts()).toEqual(['archived task', 'inbox task']);
		await settle();
		expect((lastTasksView() as unknown as { globalExcludes: { archived: boolean } }).globalExcludes.archived).toBe(false);

		// "This list" starts off and empty.
		expect(listSwitches()).toEqual(['false', 'false', 'false', 'false']);
		expect(section('list').querySelectorAll('[data-remove-entry]')).toHaveLength(0);
		byName(section('list'), '[role="switch"]', 'Archived notes on this list').click();
		flushSync();
		expect(tasksStore.query.exclude.archived).toBe(true);
		expect(tasksStore.globalExcludes.archived).toBe(false);
		expect(rowTexts()).toEqual(['inbox task']);

		listButton('All open').click();
		flushSync();
		expect(rowTexts()).toEqual(['archived task', 'home task', 'inbox task']);
		expect(listSwitches()).toEqual(['false', 'false', 'false', 'false']);

		const folder = byName(section('list'), 'input', 'Excluded folder on this list') as HTMLInputElement;
		folder.value = 'Home';
		folder.dispatchEvent(new Event('input', { bubbles: true }));
		byName(section('list'), 'button', 'Add excluded folder on this list').click();
		flushSync();
		expect(tasksStore.query.exclude.folders).toEqual(['Home']);
		expect(tasksStore.globalExcludes.folders).toEqual([]);
		expect(rowTexts()).toEqual(['archived task', 'inbox task']);

		listButton('To list').click();
		listButton('All open').click();
		flushSync();
		expect(tasksStore.query.exclude.folders).toEqual([]);
		expect(rowTexts()).toEqual(['archived task', 'home task', 'inbox task']);
	});

	it('the narrow dropdown, rendered beside the column, picks "All open"', async () => {
		const menu = document.querySelector<HTMLElement>('[data-task-lists="menu"]')!;
		expect(menu).not.toBeNull();
		expect(menu.classList.contains('pane-toolbar')).toBe(false);
		const trigger = byName(menu, 'button', 'List: To list');

		await openMenu(trigger);
		menuItem('All open', 'menuitemradio').click();
		flushSync();

		expect(tasksStore.activeList).toBe(ALL_OPEN_ID);
		expect(byName(menu, 'button', 'List: All open')).toBeDefined();
		expect(rowTexts()).toEqual(['home task', 'inbox task']);
	});

	it('Save view in the narrow dropdown opens the name input and saves the session as the active view', async () => {
		const menu = document.querySelector<HTMLElement>('[data-task-lists="menu"]')!;
		await openMenu(byName(menu, 'button', 'List: To list'));
		menuItem('Save view').click();
		flushSync();

		const input = byName(menu, 'input', 'View name') as HTMLInputElement;
		input.value = 'Work';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		flushSync();

		expect(menu.querySelectorAll('input[aria-label="View name"]')).toHaveLength(0);
		expect(findTaskView(tasksStore.activeList, tasksStore.savedViews)?.name).toBe('Work');
		expect(tasksStore.activeList).not.toBe(TO_LIST_ID);
		expect(byName(menu, 'button', 'List: Work')).toBeDefined();
	});

	it('removing a "This list" excluded folder focuses the next one in the same section', () => {
		const section = (scope: 'global' | 'list') => document.querySelector<HTMLElement>(`[data-task-excludes="${scope}"]`)!;
		byName(document, 'button', 'Edit').click();
		flushSync();
		for (const name of ['A', 'B']) {
			const folder = byName(section('list'), 'input', 'Excluded folder on this list') as HTMLInputElement;
			folder.value = name;
			folder.dispatchEvent(new Event('input', { bubbles: true }));
			byName(section('list'), 'button', 'Add excluded folder on this list').click();
			flushSync();
		}

		const first = byName(section('list'), 'button', 'Remove excluded folder on this list A');
		first.focus();
		first.click();
		flushSync();

		expect(tasksStore.query.exclude.folders).toEqual(['B']);
		expect(document.activeElement).toBe(byName(section('list'), 'button', 'Remove excluded folder on this list B'));
	});

	it('"No date" lists only the open tasks without a due date, and the column counts each list', async () => {
		mockTaskFetch(
			[
				taskGroupV2('/vault/Home/H.md', [
					taskV2('home task'),
					taskV2('dated task', { lineNumber: 2, metadata: { description: 'dated task', tags: [], dueDate: '2026-11-20' } }),
					taskV2('closed task', { lineNumber: 3, status: 'done' }),
				]),
			],
			{ entries: [underToList('/vault/Inbox.md', ['inbox task'])] },
		);
		await buildTaskIndex();
		flushSync();

		expect([columnCount(ALL_OPEN_ID), columnCount(NO_DATE_ID), columnCount(TO_LIST_ID)]).toEqual(['3', '2', '1']);
		const countEl = column().querySelector(`[data-task-list-count="${NO_DATE_ID}"]`)!;
		expect(listButton('No date').getAttribute('aria-describedby')).toBe(countEl.id);

		listButton('No date').click();
		flushSync();

		expect(tasksStore.activeList).toBe(NO_DATE_ID);
		expect(rowTexts()).toEqual(['home task', 'inbox task']);
		expect(columnCount(NO_DATE_ID)).toBe(String(rowTexts().length));
		expect(marker()).toBeNull();
		// Not written: a built-in list lives in code.
		await settle();
		expect(lastTasksView().activeList).toBe(NO_DATE_ID);
		expect(lastTasksView().savedViews.map((v) => v.id)).toEqual([TO_LIST_ID]);
	});

	it('"No date" with every open task dated says so', async () => {
		mockTaskFetch([taskGroupV2('/vault/H.md', [taskV2('dated', { metadata: { description: 'dated', tags: [], dueDate: '2026-11-20' } })])]);
		await buildTaskIndex();
		listButton('No date').click();
		flushSync();

		expect(document.body.textContent).toContain('Every open task has a due date');
		expect(columnCount(NO_DATE_ID)).toBe('0');
	});

	it('a date window over a vault with no dated task explains the due date signifier', () => {
		listButton('All open').click();
		tasksStore.setQuick({ due: 'today' });
		flushSync();

		const message = Array.from(document.querySelectorAll('p')).find((p) => p.textContent?.trim() === 'No task in this vault has a due date');
		expect(message).toBeDefined();
		expect(message!.nextElementSibling?.textContent).toContain('📅');
		expect(message!.nextElementSibling?.textContent).toContain('pick Due in a task\'s menu');
	});

	it('a grouping change on "All open" shows "modified" with Save as view and Reset, and Reset clears it', () => {
		listButton('All open').click();
		flushSync();
		expect(marker()).toBeNull();

		// A search is never saved, so it never marks a list modified.
		tasksStore.setQuick({ search: 'home' });
		flushSync();
		expect(marker()).toBeNull();

		tasksStore.setGroupBy('folder');
		flushSync();
		expect(marker()!.textContent).toContain('modified');
		expect(markerButtons()).toEqual(['Save as view', 'Reset']);

		buttonNamed('Reset')!.focus();
		buttonNamed('Reset')!.click();
		flushSync();

		expect(tasksStore.groupBy).toBe('note');
		expect(tasksStore.activeList).toBe(ALL_OPEN_ID);
		expect(marker()).toBeNull();
		// The marker left with the focused button; focus lands on the sentence's Edit.
		expect(document.activeElement).toBe(buttonNamed('Edit'));
	});

	it('picking another list closes the marker\'s Save as view input', () => {
		listButton('All open').click();
		tasksStore.setGroupBy('folder');
		flushSync();
		buttonNamed('Save as view')!.click();
		flushSync();
		expect(document.querySelector('input[aria-label="View name"]')).not.toBeNull();

		listButton('To list').click();
		flushSync();

		expect(document.querySelector('input[aria-label="View name"]')).toBeNull();
		expect(marker()).toBeNull();
	});

	it('Save as view on a modified built-in saves the session as a new active view', async () => {
		listButton('No date').click();
		tasksStore.setGroupBy('folder');
		flushSync();

		buttonNamed('Save as view')!.click();
		flushSync();
		typeName('Undated by folder', 'Escape');
		expect(document.activeElement).toBe(buttonNamed('Save as view'));
		buttonNamed('Save as view')!.click();
		flushSync();
		typeName('Undated by folder', 'Enter');

		expect(findTaskView(tasksStore.activeList, tasksStore.savedViews)?.name).toBe('Undated by folder');
		expect(marker()).toBeNull();
		expect(document.activeElement).toBe(buttonNamed('Edit'));
		await settle();
		const written = lastTasksView().savedViews.at(-1)!;
		expect(written.name).toBe('Undated by folder');
		expect(written.query).toMatchObject({ groupBy: 'folder', quick: { show: 'open', due: 'none' } });
	});

	it('on a saved view, Save writes the session query into settings.json and Revert restores the saved one', async () => {
		tasksStore.setGroupBy('priority');
		flushSync();
		expect(markerButtons()).toEqual(['Save', 'Revert']);

		buttonNamed('Save')!.focus();
		buttonNamed('Save')!.click();
		flushSync();
		expect(marker()).toBeNull();
		expect(document.activeElement).toBe(buttonNamed('Edit'));
		await settle();
		expect(lastTasksView().savedViews).toHaveLength(1);
		expect(lastTasksView().savedViews[0]).toMatchObject({ id: TO_LIST_ID, name: 'To list', query: { groupBy: 'priority' } });

		tasksStore.setGroupBy('due');
		tasksStore.setQuick({ show: 'all' });
		flushSync();
		expect(markerButtons()).toEqual(['Save', 'Revert']);

		buttonNamed('Revert')!.focus();
		buttonNamed('Revert')!.click();
		flushSync();

		expect(tasksStore.groupBy).toBe('priority');
		expect(tasksStore.quick).toEqual({ show: 'open' });
		expect(marker()).toBeNull();
		expect(document.activeElement).toBe(buttonNamed('Edit'));
	});

	it('Reset filters on a saved view brings back its saved quick filters, and shows only off them', () => {
		tasksStore.setQuick({ show: 'all', due: 'none' });
		flushSync();
		buttonNamed('Save')!.click();
		flushSync();
		// The quick filters equal the saved ones, though not the code defaults.
		expect(buttonNamed('Reset filters')).toBeUndefined();

		tasksStore.setQuick({ show: 'closed', due: undefined, search: 'x' });
		flushSync();
		buttonNamed('Reset filters')!.click();
		flushSync();

		expect(tasksStore.quick).toEqual({ show: 'all', due: 'none' });
		expect(buttonNamed('Reset filters')).toBeUndefined();

		tasksStore.setQuick({ search: 'inbox' });
		flushSync();
		expect(buttonNamed('Reset filters')).toBeDefined();
	});
});
