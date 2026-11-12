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
import { loadSavedTasksView, resetTasks } from '#lib/features/tasks/tasks.service.js';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { ALL_OPEN_ID, TO_LIST_ID, findTaskView } from '#lib/features/tasks/task-views.logic.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { mockTaskFetch, mountTasksView, openMenu, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const SETTINGS = '/vault/.kokobrain/settings.json';

/** The `tasksView` of the last settings.json written. */
function lastTasksView(): { activeList: string; savedViews: { id: string; name: string }[] } {
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

	it('lists "All open" then "To list", with "To list" active, and clicking "All open" lists every open task', () => {
		expect(columnLists()).toEqual([
			['All open', false],
			['To list', true],
		]);
		expect(rowTexts()).toEqual(['inbox task']);

		listButton('All open').click();
		flushSync();

		expect(tasksStore.activeList).toBe(ALL_OPEN_ID);
		expect(columnLists()).toEqual([
			['All open', true],
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
			['Inbox', true],
		]);

		await openMenu(byName(column(), 'button', 'List actions: Inbox'));
		menuItem('Duplicate').click();
		flushSync();
		expect(columnLists()).toEqual([
			['All open', false],
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
});
