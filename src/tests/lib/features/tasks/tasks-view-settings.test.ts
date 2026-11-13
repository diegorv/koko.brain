// @vitest-environment jsdom
// jsdom mirrors settings-persistence.test.ts: the persistence effect runs
// outside a mounted component tree, and the panel case mounts TasksView.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Only the boundaries docs/TESTING.md allows: the disk, IPC, the toast, the
// theme DOM service, and the log. The settings and tasks stores, loadSettings,
// persistence, loadSavedTasksView and the saved view operations all run for real.
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
vi.mock('#lib/utils/debug.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/utils/debug.js')>()),
	error: vi.fn(),
}));

import { flushSync, unmount } from 'svelte';
import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { error } from '#lib/utils/debug.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { loadSettings } from '#lib/core/settings/settings.service.js';
import { startSettingsPersistence, stopSettingsPersistence } from '#lib/core/settings/settings-persistence.svelte.js';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import {
	deleteTaskView,
	duplicateTaskView,
	loadSavedTasksView,
	renameTaskView,
	saveTaskView,
	selectTaskList,
	setTaskExcludes,
	setTaskSources,
} from '#lib/features/tasks/tasks.service.js';
import { defaultTaskExcludes, emptyTaskExcludes, headingSources } from '#lib/features/tasks/task-query.logic.js';
import { ALL_OPEN_ID, TO_LIST_ID, toListView } from '#lib/features/tasks/task-views.logic.js';
import { mockTaskFetch, mountTasksView } from '../../../fixtures/tasks.fixture';

const INVALID_TOAST = 'The saved Tasks views could not be read, so the defaults are used.';

/** Path of a vault's settings.json */
const settingsPath = (vault: string) => `${vault}/.kokobrain/settings.json`;

/** Every settings payload written to `vault`, parsed, in write order */
function payloads(vault = '/vault'): Record<string, unknown>[] {
	return vi
		.mocked(writeTextFile)
		.mock.calls.filter(([path]) => path === settingsPath(vault))
		.map(([, content]) => JSON.parse(content as string));
}

/** The `tasksView` of the last payload written to `vault` */
const lastTasksView = (vault = '/vault') => payloads(vault).at(-1)!.tasksView as Record<string, unknown>;

/** Lets the Svelte effect flush (microtask), then runs out the persistence debounce */
async function settle(ms = 500): Promise<void> {
	await vi.advanceTimersByTimeAsync(0);
	await vi.advanceTimersByTimeAsync(ms);
}

/**
 * Opens `vault` the way `initializeVault` does: load settings.json (holding
 * `file`, or failing to read when `file` is 'unreadable'), load the saved
 * Tasks view, then start persistence with the load's outcome.
 */
async function openVault(vault: string, file: Record<string, unknown> | 'unreadable'): Promise<void> {
	if (file === 'unreadable') vi.mocked(readTextFile).mockRejectedValueOnce(new Error('EACCES'));
	else vi.mocked(readTextFile).mockResolvedValueOnce(JSON.stringify(file));
	const outcome = await loadSettings(vault);
	loadSavedTasksView();
	startSettingsPersistence(vault, outcome);
}

/** Calls of the mocked `error` logged under the Tasks tag */
const tasksErrors = () => vi.mocked(error).mock.calls.filter(([tag]) => tag === 'TASKS');

/** The saved views as [id, name] pairs */
const viewNames = () => tasksStore.savedViews.map((v) => [v.id, v.name]);

describe('Tasks view state saved in settings.json', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(mkdir).mockResolvedValue(undefined);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(invoke).mockResolvedValue([]);
		settingsStore.reset();
		tasksStore.reset();
		clearLocalStorage();
	});

	afterEach(async () => {
		// A session left running keeps writing into later tests in this file.
		await stopSettingsPersistence();
		vi.useRealTimers();
		document.body.innerHTML = '';
	});

	/**
	 * A restart: stops persistence, puts both stores in a state unlike the
	 * defaults and loads `saved` as the next start does.
	 */
	async function reload(saved: Record<string, unknown>): Promise<void> {
		await stopSettingsPersistence();
		settingsStore.reset();
		tasksStore.reset();
		tasksStore.setSources([]);
		tasksStore.setSavedViews([]);
		tasksStore.setActiveList('stale');
		tasksStore.setGlobalExcludes({ ...defaultTaskExcludes(), folders: ['stale'] });
		vi.mocked(readTextFile).mockResolvedValueOnce(JSON.stringify(saved));
		await loadSettings('/vault');
		loadSavedTasksView();
	}

	describe('the "To list" seed', () => {
		it.each([
			['no tasksView', {}],
			['an empty sectionTag', { tasksView: { version: 1, sectionTag: '' } }],
			['notes that hold no #to-list heading', { tasksView: { version: 1 } }],
		])('seeds the #to-list card for %s, quietly, and opens on it', async (_label, file) => {
			await openVault('/vault', file);

			expect(tasksStore.savedViews).toEqual([toListView('')]);
			expect(tasksStore.activeList).toBe(TO_LIST_ID);
			expect(tasksStore.query.sources).toEqual(headingSources(['#to-list']));
			expect(tasksErrors()).toHaveLength(0);
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('seeds both heading cards from a saved sectionTag "#to-list #work"', async () => {
			await openVault('/vault', { tasksView: { version: 1, sectionTag: '#to-list #work' } });

			expect(tasksStore.savedViews).toHaveLength(1);
			expect(tasksStore.savedViews[0]).toMatchObject({ id: TO_LIST_ID, name: 'To list' });
			expect(tasksStore.query.sources).toEqual(headingSources(['#to-list', '#work']));
			expect(tasksStore.activeList).toBe(TO_LIST_ID);
		});

		it('writes nothing at load: the legacy key stays on disk until the first write', async () => {
			await openVault('/vault', { tasksView: { version: 1, sectionTag: '#a' } });
			await settle();

			for (const payload of payloads()) expect(payload.tasksView).toEqual({ version: 1, sectionTag: '#a' });

			await reload({ tasksView: { version: 1, sectionTag: '#a' } });

			expect(viewNames()).toEqual([[TO_LIST_ID, 'To list']]);
			expect(tasksStore.query.sources).toEqual(headingSources(['#a']));
		});

		it('after a write and a reload holds exactly one "To list"', async () => {
			await openVault('/vault', { tasksView: { version: 1, sectionTag: '#a' } });
			selectTaskList(TO_LIST_ID);
			await settle();

			await reload(payloads().at(-1)!);

			expect(viewNames()).toEqual([[TO_LIST_ID, 'To list']]);
			expect(tasksStore.query.sources).toEqual(headingSources(['#a']));
		});

		it('the migrating write drops sectionTag, headingTags and query and keeps an unknown key', async () => {
			await openVault('/vault', {
				tasksView: { version: 1, sectionTag: '#a', headingTags: ['#a'], query: { sources: [] }, extra: { x: 1 } },
			});

			selectTaskList(TO_LIST_ID);
			await settle();

			expect(lastTasksView()).toEqual({
				version: 1,
				extra: { x: 1 },
				activeList: TO_LIST_ID,
				globalExcludes: defaultTaskExcludes(),
				savedViews: [toListView('#a')],
			});
		});

		it('a hand-edited savedViews: [] does not seed and opens "All open"', async () => {
			await openVault('/vault', { tasksView: { version: 1, savedViews: [], sectionTag: '#a' } });

			expect(tasksStore.savedViews).toEqual([]);
			expect(tasksStore.activeList).toBe(ALL_OPEN_ID);
			expect(tasksStore.query.sources).toEqual([]);
		});

		it('an unknown activeList opens the first saved view', async () => {
			const first = { ...toListView('#first'), id: 'first', name: 'First' };
			await openVault('/vault', { tasksView: { version: 1, activeList: 'gone', savedViews: [first, toListView('')] } });

			expect(tasksStore.activeList).toBe('first');
			expect(tasksStore.query.sources).toEqual(headingSources(['#first']));
		});
	});

	describe('saved view operations round-trip through settings.json', () => {
		it('save, rename, duplicate and delete each survive a reload', async () => {
			await openVault('/vault', {});

			setTaskSources([{ clauses: [{ kind: 'folder', path: 'Projects' }] }]);
			tasksStore.setGroupBy('due');
			const id = saveTaskView('Projects')!;
			await settle();
			const afterSave = { names: viewNames(), views: tasksStore.savedViews, active: tasksStore.activeList };

			await reload(payloads().at(-1)!);
			expect(tasksStore.savedViews).toEqual(afterSave.views);
			expect(tasksStore.activeList).toBe(id);
			expect(tasksStore.query.sources).toEqual([{ clauses: [{ kind: 'folder', path: 'Projects' }] }]);
			expect(tasksStore.groupBy).toBe('due');

			startSettingsPersistence('/vault', 'loaded');
			renameTaskView(id, 'Work');
			await settle();
			await reload(payloads().at(-1)!);
			expect(viewNames()).toEqual([[TO_LIST_ID, 'To list'], [id, 'Work']]);

			startSettingsPersistence('/vault', 'loaded');
			const copy = duplicateTaskView(TO_LIST_ID)!;
			await settle();
			await reload(payloads().at(-1)!);
			expect(viewNames()).toEqual([[TO_LIST_ID, 'To list'], [copy, 'To list copy'], [id, 'Work']]);

			startSettingsPersistence('/vault', 'loaded');
			expect(deleteTaskView(id)).toBe(true);
			await settle();
			await reload(payloads().at(-1)!);
			expect(viewNames()).toEqual([[TO_LIST_ID, 'To list'], [copy, 'To list copy']]);
			expect(tasksStore.activeList).toBe(TO_LIST_ID);

			for (const payload of payloads()) {
				const tasksView = payload.tasksView as Record<string, unknown> | undefined;
				if (tasksView === undefined) continue;
				expect('sectionTag' in tasksView || 'headingTags' in tasksView || 'query' in tasksView).toBe(false);
			}
		});

		it('deleting the last saved view returns false and leaves savedViews unchanged', async () => {
			await openVault('/vault', {});
			const before = tasksStore.savedViews;

			expect(deleteTaskView(TO_LIST_ID)).toBe(false);
			await settle();

			expect(tasksStore.savedViews).toBe(before);
			for (const payload of payloads()) expect('tasksView' in payload).toBe(false);
		});

		it('saveTaskView stores no search on disk', async () => {
			await openVault('/vault', {});
			tasksStore.setQuick({ show: 'all', search: 'milk' });

			saveTaskView('Everything');
			await settle();

			const views = lastTasksView().savedViews as { query: { quick: Record<string, unknown> } }[];
			expect(views[1].query.quick).toEqual({ show: 'all' });
		});

		it('switching from an edited list to another and back restores the saved query, and the saved view is unchanged on disk', async () => {
			await openVault('/vault', { tasksView: { version: 1, sectionTag: '#a' } });
			selectTaskList(TO_LIST_ID);
			await settle();
			const savedBefore = lastTasksView().savedViews;

			setTaskSources([]);
			tasksStore.setQuick({ show: 'all' });
			selectTaskList(ALL_OPEN_ID);
			selectTaskList(TO_LIST_ID);
			await settle();

			expect(tasksStore.query.sources).toEqual(headingSources(['#a']));
			expect(tasksStore.quick).toEqual({ show: 'open' });
			expect(lastTasksView().savedViews).toEqual(savedBefore);
		});

		it('a folder card, a quick filter and a grouping change leave settingsStore.tasksView unchanged', async () => {
			await openVault('/vault', { tasksView: { version: 1, sectionTag: '#a' } });
			const before = settingsStore.tasksView;

			setTaskSources([...headingSources(['#a']), { clauses: [{ kind: 'folder', path: 'Projects' }] }]);
			tasksStore.setQuick({ due: 'overdue' });
			tasksStore.setGroupBy('priority');
			await settle();

			expect(settingsStore.tasksView).toBe(before);
			for (const payload of payloads()) expect(payload.tasksView).toEqual({ version: 1, sectionTag: '#a' });
		});

		it('a restart reopens the last selected list', async () => {
			await openVault('/vault', {});
			selectTaskList(ALL_OPEN_ID);
			await settle();

			await reload(payloads().at(-1)!);

			expect(tasksStore.activeList).toBe(ALL_OPEN_ID);
			expect(tasksStore.query.sources).toEqual([]);
		});
	});

	describe('global excludes', () => {
		it('setTaskExcludes with the templates switch off is written, keeps an unknown key, has no sectionTag, and a fresh load restores it', async () => {
			await openVault('/vault', { tasksView: { version: 1, sectionTag: '#a', extra: 1 } });

			setTaskExcludes({ ...defaultTaskExcludes(), templatesFolder: false });
			await settle();

			const tasksView = lastTasksView();
			expect((tasksView.globalExcludes as { templatesFolder: boolean }).templatesFolder).toBe(false);
			expect(tasksView.extra).toBe(1);
			expect('sectionTag' in tasksView).toBe(false);

			await reload(payloads().at(-1)!);

			expect(tasksStore.globalExcludes).toEqual({ ...defaultTaskExcludes(), templatesFolder: false });
			expect(tasksStore.query.sources).toEqual(headingSources(['#a']));
		});

		it('the Sources panel\'s Templates folder switch writes the global excludes', async () => {
			await openVault('/vault', {});
			mockTaskFetch([]);
			const { component } = await mountTasksView();
			const named = (selector: string, name: string) =>
				Array.from(document.querySelectorAll<HTMLElement>(selector)).find((el) => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === name)!;

			named('button', 'Edit').click();
			flushSync();
			named('[role="switch"]', 'Templates folder').click();
			flushSync();
			await settle();
			unmount(component);

			expect(tasksStore.globalExcludes.templatesFolder).toBe(false);
			expect(tasksStore.query.exclude).toEqual(emptyTaskExcludes());
			expect((lastTasksView().globalExcludes as { templatesFolder: boolean }).templatesFolder).toBe(false);
		});

		it('a field of the wrong type inside globalExcludes falls back to its default, with no toast', async () => {
			await openVault('/vault', { tasksView: { version: 1, globalExcludes: { archived: 'x', systemFolder: false } } });

			expect(tasksStore.globalExcludes).toEqual({ ...defaultTaskExcludes(), systemFolder: false });
			expect(tasksStore.globalExcludes.archived).toBe(true);
			expect(toast.error).not.toHaveBeenCalled();
			expect(tasksErrors()).toHaveLength(0);
		});
	});

	it.each([[42], [{ version: 1, globalExcludes: 5 }]])(
		'an invalid tasksView %j loads the defaults plus the seed, logs and toasts once, and keeps its bytes until the next write',
		async (value) => {
			await openVault('/vault', { tasksView: value });

			expect(tasksStore.globalExcludes).toEqual(defaultTaskExcludes());
			expect(tasksStore.savedViews).toEqual([toListView('')]);
			expect(tasksStore.activeList).toBe(TO_LIST_ID);
			expect(tasksErrors()).toEqual([['TASKS', 'Invalid tasksView in settings.json:', value]]);
			expect(toast.error).toHaveBeenCalledTimes(1);
			expect(toast.error).toHaveBeenCalledWith(INVALID_TOAST);

			settingsStore.updateLayout({ railPanelsVisible: false });
			await settle();

			const before = payloads();
			expect(before.some((p) => (p.layout as { railPanelsVisible: boolean }).railPanelsVisible === false)).toBe(true);
			for (const payload of before) expect(payload.tasksView).toEqual(value);

			setTaskExcludes(defaultTaskExcludes());
			await settle();

			expect(lastTasksView()).toMatchObject({ version: 1, globalExcludes: defaultTaskExcludes(), savedViews: [toListView('')] });
		},
	);

	it('loads each vault its own state, and the double-switch path to a vault with none gives the defaults and the seed', async () => {
		await openVault('/va', { tasksView: { version: 1, sectionTag: '#a' } });
		expect(tasksStore.query.sources).toEqual(headingSources(['#a']));

		await stopSettingsPersistence();
		const viewB = { ...toListView('#b'), id: 'b', name: 'B' };
		await openVault('/vb', {
			tasksView: { version: 1, activeList: 'b', savedViews: [viewB], globalExcludes: { ...defaultTaskExcludes(), folders: ['X'] } },
		});
		expect(tasksStore.activeList).toBe('b');
		expect(tasksStore.globalExcludes.folders).toEqual(['X']);

		// The double-switch path: no resetTasks() between B and C.
		await stopSettingsPersistence();
		await openVault('/vc', {});
		expect(tasksStore.globalExcludes).toEqual(defaultTaskExcludes());
		expect(tasksStore.savedViews).toEqual([toListView('')]);
		expect(tasksStore.activeList).toBe(TO_LIST_ID);
		expect(tasksStore.query.sources).toEqual(headingSources(['#to-list']));

		setTaskExcludes({ ...defaultTaskExcludes(), archived: false });
		await settle();

		expect(payloads('/vc').at(-1)!.tasksView).toMatchObject({ globalExcludes: { archived: false } });
		for (const payload of payloads('/va')) expect(payload.tasksView).toEqual({ version: 1, sectionTag: '#a' });
		for (const payload of payloads('/vb')) expect((payload.tasksView as { activeList: string }).activeList).toBe('b');
	});

	it('never writes settings.json of a session whose file could not be read', async () => {
		await openVault('/vault', 'unreadable');

		setTaskExcludes({ ...defaultTaskExcludes(), templatesFolder: false });
		saveTaskView('Mine');
		await settle();
		await stopSettingsPersistence();

		expect(tasksStore.globalExcludes.templatesFolder).toBe(false);
		expect(viewNames().map(([, name]) => name)).toEqual(['To list', 'Mine']);
		expect(payloads()).toHaveLength(0);
	});
});
