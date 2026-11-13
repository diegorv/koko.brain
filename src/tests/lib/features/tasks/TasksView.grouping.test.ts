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

import { unmount, flushSync, tick } from 'svelte';
import { resetTasks } from '#lib/features/tasks/tasks.service.js';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { NoteEntryV2, TaskV2, ToggleTaskResultV2 } from '#lib/types/vault-v2.types.js';
import { mockTaskFetch, mountTasksView, openMenu, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const NOTE_A = '/vault/Projects/Alpha.md';
const NOTE_B = '/vault/Projects/Beta.md';

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]'));
const rowText = (row: Element | null | undefined) => row?.querySelector('[data-task-text]')?.textContent?.trim();
const activeRowText = () => rowText((document.activeElement as HTMLElement | null)?.closest('[data-task-row]'));
const groupEls = () => Array.from(document.querySelectorAll<HTMLElement>('[data-task-group]'));
const groupEl = (key: string) => groupEls().find((g) => g.dataset.taskGroupKey === key) ?? null;
const labels = () => groupEls().map((g) => g.querySelector('[data-task-group-label]')?.textContent?.trim());
const counts = () => groupEls().map((g) => g.querySelector('[data-task-group-count]')?.textContent?.trim());
const groupRowTexts = (g: Element) => Array.from(g.querySelectorAll('[data-task-row]')).map(rowText);

/** The open menu: jsdom never ends the exit animation, so a closed one stays with data-state="closed". */
const openMenuEl = () => document.querySelector<HTMLElement>('[role="menu"][data-state="open"]');

function displayTrigger(): HTMLButtonElement {
	const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
		(b) => b.textContent?.trim() === 'Display',
	);
	if (!button) throw new Error('Display trigger not found');
	return button;
}

/** Picks Display > `label`. */
async function groupBy(label: string): Promise<void> {
	await openMenu(displayTrigger());
	const item = Array.from(openMenuEl()?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []).find(
		(el) => el.textContent?.trim() === label,
	);
	if (!item) throw new Error(`no Display item ${label}`);
	item.click();
	await settle();
}

async function settle(): Promise<void> {
	for (let i = 0; i < 4; i++) {
		await tick();
		flushSync();
	}
}

/** Dispatches a keydown on `el` the way the browser does. */
function press(el: Element, key: string): void {
	el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
	flushSync();
}

/** Waits, flushing Svelte, until `check` stops throwing. */
async function until(check: () => void): Promise<void> {
	await vi.waitFor(() => {
		flushSync();
		check();
	});
}

/** A task due on `dueDate` when given. */
const due = (text: string, lineNumber: number, dueDate?: string, overrides: Partial<TaskV2> = {}) =>
	taskV2(text, { lineNumber, metadata: { description: text, tags: [], ...(dueDate ? { dueDate } : {}) }, ...overrides });

/**
 * Alpha: Call bank (overdue), Plan trip (no date), Book venue (done, today).
 * Beta: Pay rent (overdue), File taxes (today). In note order Plan trip
 * follows Call bank; on screen under Due date, File taxes does.
 */
function initialTasks(): Record<string, TaskV2[]> {
	return {
		[NOTE_A]: [
			due('Call bank', 1, '2026-11-04'),
			due('Plan trip', 2),
			due('Book venue', 3, '2026-11-05', { status: 'done' }),
		],
		[NOTE_B]: [due('Pay rent', 1, '2026-11-03'), due('File taxes', 2, '2026-11-05')],
	};
}

/** Serves `tasks` on every fetch; `toggle_task_status` marks the task done and reports a change. */
function statefulTasks(tasks: Record<string, TaskV2[]> = initialTasks()): void {
	mockTaskFetch(async () => Object.entries(tasks).map(([path, list]) => taskGroupV2(path, list.map((t) => ({ ...t })))), {
		toggle: (args): ToggleTaskResultV2 => {
			const list = tasks[args.path as string];
			const i = list.findIndex((t) => t.lineNumber === args.lineNumber);
			list[i] = { ...list[i], status: 'done', checked: true };
			return {
				updatedContent: list.map((t) => `- [${t.status === 'done' ? 'x' : ' '}] ${t.text}`).join('\n'),
				updateResult: { changed: true, affected: [], version: 2, upserted: [], removed: [], fullRescan: false },
				stale: false,
			};
		},
	});
}

describe('TasksView: grouping', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		// Also clears the write overlay, which outlives a test.
		resetTasks();
		editorStore.reset();
		tasksStore.setSources([]);
		vaultStore._reset();
		vaultStore.open('/vault');
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-11-05T12:00:00'));
		(document.activeElement as HTMLElement | null)?.blur();
	});

	afterEach(async () => {
		if (component) unmount(component);
		component = null;
		vi.useRealTimers();
		vaultStore.close();
		await settle();
		document.body.innerHTML = '';
	});

	it('Display > Due date renders the buckets in order with exact counts, each row under its header, and no icon in a header', async () => {
		statefulTasks();
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(4));

		await groupBy('Due date');
		expect(tasksStore.groupBy).toBe('due');
		expect(labels()).toEqual(['Overdue', 'Today', 'No date']);
		expect(counts()).toEqual(['2', '1', '1']);
		expect(groupEls().map((g) => g.dataset.taskGroupKey)).toEqual(['overdue', 'today', 'none']);
		expect(groupRowTexts(groupEl('overdue')!)).toEqual(['Pay rent', 'Call bank']);
		expect(groupRowTexts(groupEl('today')!)).toEqual(['File taxes']);
		expect(groupRowTexts(groupEl('none')!)).toEqual(['Plan trip']);
		for (const g of groupEls()) {
			const header = g.querySelector('[data-task-group-label]')!.parentElement!;
			// No file icon: the header's only svg is the collapse chevron's.
			const svgs = Array.from(header.querySelectorAll('svg'));
			expect(svgs).toHaveLength(1);
			expect(svgs[0].closest('[data-task-group-toggle]')).not.toBeNull();
			expect(g.querySelector('[data-task-group-subtitle]')).toBeNull();
			expect(g.querySelector('[role="list"]')?.getAttribute('aria-label')).toBe(
				g.querySelector('[data-task-group-label]')?.textContent?.trim(),
			);
		}
	});

	it('shows the parent above a flat row, with no indent', async () => {
		statefulTasks({
			[NOTE_A]: [due('Plan trip', 1, '2026-11-04', { status: 'done' }), due('Book train', 2, '2026-11-05', { indent: 1 })],
		});
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(2));

		await groupBy('Due date');
		expect(labels()).toEqual(['Today']);
		const [row] = rows();
		expect(rowText(row)).toBe('Book train');
		expect(row.querySelector('[data-task-breadcrumb]')?.textContent?.trim()).toBe('Plan trip');
		expect(row.style.paddingLeft).toBe('');
	});

	it('Status > All with Display > Status shows the Done group with the done count and no "open"; Note keeps "N of M open"', async () => {
		statefulTasks();
		tasksStore.setQuick({ show: 'all' });
		({ component } = await mountTasksView());
		await until(() => expect(rows()).toHaveLength(5));

		await groupBy('Status');
		const done = groupEl('done');
		expect(done).not.toBeNull();
		expect(done!.querySelector('[data-task-group-count]')?.textContent).toBe('1');
		expect(done!.querySelector('[data-task-group-label]')?.textContent?.trim()).toBe('Done');
		expect(done!.querySelector('[data-task-group-label]')!.parentElement!.textContent).not.toContain('open');
		expect(groupRowTexts(done!)).toEqual(['Book venue']);

		await groupBy('Note');
		expect(groupEls().map((g) => g.dataset.taskGroupKey)).toEqual([NOTE_A, NOTE_B]);
		expect(counts()).toEqual(['2 of 3 open', '2 of 2 open']);
	});

	describe('note fields', () => {
		/** Every open menu; a submenu opens after its parent. */
		const openMenus = () => Array.from(document.querySelectorAll<HTMLElement>('[role="menu"][data-state="open"]'));
		/** The item labels of the `n`th open menu, its submenus' items left out. */
		const menuLabels = (n: number) =>
			Array.from(openMenus()[n]?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])
				.filter((el) => el.closest('[role="menu"]') === openMenus()[n])
				.map((el) => el.textContent?.trim());

		/** Opens Display > Property: jsdom drives a bits-ui submenu by keyboard, so ArrowRight on the sub-trigger. */
		async function openPropertyMenu(): Promise<void> {
			await openMenu(displayTrigger());
			const trigger = Array.from(openMenus()[0].querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
				(el) => el.textContent?.trim() === 'Property',
			);
			if (!trigger) throw new Error('no Property sub-trigger');
			trigger.focus();
			trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
			await settle();
			await until(() => expect(openMenus()).toHaveLength(2));
		}

		const note = (name: string, fields: Partial<NoteEntryV2>, ...texts: string[]) =>
			entryV2(`/vault/${name}.md`, { ...fields, tasks: texts.map((text, i) => taskV2(text, { lineNumber: i + 1 })) });

		it('Display lists Type, Property and Heading after Status', async () => {
			mockTaskFetch([], { entries: [note('A', {}, 'a task')] });
			({ component } = await mountTasksView());
			await openMenu(displayTrigger());
			expect(menuLabels(0)).toEqual(['Note', 'Folder', 'Due date', 'Priority', 'Status', 'Type', 'Property', 'Heading']);
		});

		it('Display > Property > area shows one header per area value with counts, (empty) last', async () => {
			mockTaskFetch([], {
				entries: [
					note('A', { frontmatter: { area: 'Work', status: 'x' } }, 'work 1', 'work 2'),
					note('B', { frontmatter: { area: 'Home' } }, 'home task'),
					note('C', {}, 'loose task'),
				],
			});
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(4));

			await openPropertyMenu();
			expect(menuLabels(1)).toEqual(['area', 'status']);
			Array.from(openMenus()[1].querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
				.find((el) => el.textContent?.trim() === 'area')!
				.click();
			await settle();

			expect(tasksStore.groupBy).toEqual({ property: 'area' });
			expect(labels()).toEqual(['Home', 'Work', '(empty)']);
			expect(counts()).toEqual(['1', '2', '1']);
			expect(groupRowTexts(groupEl('Work')!)).toEqual(['work 1', 'work 2']);
			expect(groupRowTexts(groupEl('')!)).toEqual(['loose task']);

			await openPropertyMenu();
			const checked = (n: number) =>
				Array.from(openMenus()[n].querySelectorAll<HTMLElement>('[role="menuitemradio"][aria-checked="true"]'))
					.filter((el) => el.closest('[role="menu"]') === openMenus()[n])
					.map((el) => el.textContent?.trim());
			expect(checked(0)).toEqual([]);
			expect(checked(1)).toEqual(['area']);
		});

		it('Display > Property says so when no note has frontmatter', async () => {
			mockTaskFetch([], { entries: [note('A', {}, 'a task')] });
			({ component } = await mountTasksView());
			await openPropertyMenu();
			expect(menuLabels(1)).toEqual(['No properties in these tasks']);
		});

		it('Display > Type groups by note type with No type last', async () => {
			mockTaskFetch([], {
				entries: [note('A', { isA: 'Project' }, 'project task'), note('B', {}, 'untyped task'), note('C', { isA: 'Area' }, 'area task')],
			});
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(3));

			await groupBy('Type');
			expect(tasksStore.groupBy).toBe('type');
			expect(labels()).toEqual(['Area', 'Project', 'No type']);
			expect(counts()).toEqual(['1', '1', '1']);
		});

		it('Display > Heading labels each group with its heading and note, keeping a dimmed parent indented above its child', async () => {
			mockTaskFetch([], {
				entries: [
					entryV2('/vault/Projects/ACME.md', {
						taskHeadings: [{ level: 2, text: 'Next steps', line: 2 }],
						tasks: [
							taskV2('intro', { lineNumber: 1 }),
							taskV2('parent', { lineNumber: 3, heading: 0, status: 'done' }),
							taskV2('child', { lineNumber: 4, heading: 0, indent: 1 }),
						],
					}),
				],
			});
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(3));

			await groupBy('Heading');
			expect(labels()).toEqual(['ACME', 'Next steps, Projects/ACME']);
			expect(counts()).toEqual(['1', '1']);
			const [, next] = groupEls();
			expect(groupRowTexts(next)).toEqual(['parent', 'child']);
			const [parent, child] = Array.from(next.querySelectorAll<HTMLElement>('[data-task-row]'));
			expect(parent.classList.contains('opacity-60')).toBe(true);
			expect(child.style.paddingLeft).toBe('1.5rem');
			expect(child.querySelector('[data-task-breadcrumb]')).toBeNull();
		});
	});

	describe('keyboard', () => {
		it('ArrowDown moves from the last row of one bucket to the first row of the next', async () => {
			statefulTasks();
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(4));
			await groupBy('Due date');

			const callBank = rows().find((r) => rowText(r) === 'Call bank')!;
			callBank.focus();
			press(callBank, 'ArrowDown');
			expect(activeRowText()).toBe('File taxes');
			expect(tasksStore.currentRow).toEqual({ filePath: NOTE_B, lineNumber: 2 });
		});

		it('Space on the last Overdue row moves focus, after the refetch, to the first Today row', async () => {
			statefulTasks();
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(4));
			await groupBy('Due date');

			const callBank = rows().find((r) => rowText(r) === 'Call bank')!;
			callBank.focus();
			press(callBank, ' ');
			await until(() => expect(rows().map(rowText)).toEqual(['Pay rent', 'File taxes', 'Plan trip']));
			await until(() => expect(activeRowText()).toBe('File taxes'));
			expect(tasksStore.currentRow).toEqual({ filePath: NOTE_B, lineNumber: 2 });
		});

		it('Space on a todo row under Display > Status and Status > All keeps focus on its new element in Done', async () => {
			statefulTasks();
			tasksStore.setQuick({ show: 'all' });
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(5));
			await groupBy('Status');

			const planTrip = groupEl('todo')!.querySelector<HTMLElement>(`[data-task-key="${NOTE_A}:2"]`)!;
			planTrip.focus();
			press(planTrip, ' ');
			await until(() => expect(groupRowTexts(groupEl('done')!)).toEqual(['Book venue', 'Plan trip']));
			await until(() => expect(activeRowText()).toBe('Plan trip'));
			expect(document.activeElement).not.toBe(document.body);
			expect(groupEl('done')!.contains(document.activeElement)).toBe(true);
			expect(tasksStore.currentRow).toEqual({ filePath: NOTE_A, lineNumber: 2 });
		});

		it('a recompute with the same rows leaves focus on <body>', async () => {
			statefulTasks();
			({ component } = await mountTasksView());
			await until(() => expect(rows()).toHaveLength(4));
			await groupBy('Due date');

			const callBank = rows().find((r) => rowText(r) === 'Call bank')!;
			callBank.focus();
			callBank.blur();
			expect(document.activeElement).toBe(document.body);

			tasksStore.setRows([...tasksStore.rows]);
			await settle();
			expect(document.activeElement).toBe(document.body);
			expect(tasksStore.currentRow).toEqual({ filePath: NOTE_A, lineNumber: 1 });
		});
	});
});
