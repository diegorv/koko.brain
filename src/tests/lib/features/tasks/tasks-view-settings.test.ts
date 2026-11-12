// @vitest-environment jsdom
// jsdom mirrors settings-persistence.test.ts: the persistence effect runs
// outside a mounted component tree, and the panel case mounts TasksView.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Only the boundaries docs/TESTING.md allows: the disk, IPC, the toast, the
// theme DOM service, and the log. The settings and tasks stores, loadSettings,
// persistence, loadSavedTasksView and setTaskSources all run for real.
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
import { loadSavedTasksView, setTaskSources } from '#lib/features/tasks/tasks.service.js';
import { headingSources } from '#lib/features/tasks/task-query.logic.js';
import { mockTaskFetch, mountTasksView, openMenu } from '../../../fixtures/tasks.fixture';

const INVALID_TOAST = 'The saved Tasks section tags could not be read, so #to-list is used.';

/** Path of a vault's settings.json */
const settingsPath = (vault: string) => `${vault}/.kokobrain/settings.json`;

/** Every settings payload written to `vault`, parsed, in write order */
function payloads(vault = '/vault'): Record<string, unknown>[] {
	return vi
		.mocked(writeTextFile)
		.mock.calls.filter(([path]) => path === settingsPath(vault))
		.map(([, content]) => JSON.parse(content as string));
}

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

describe('Tasks view section tags saved in settings.json', () => {
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

	/** Stops persistence, resets both stores and loads `saved` as the next start does. */
	async function reload(saved: Record<string, unknown>): Promise<void> {
		await stopSettingsPersistence();
		settingsStore.reset();
		tasksStore.reset();
		tasksStore.setSources([]);
		vi.mocked(readTextFile).mockResolvedValueOnce(JSON.stringify(saved));
		await loadSettings('/vault');
		loadSavedTasksView();
	}

	it('saves a heading card added next to the default and builds both cards at the next load', async () => {
		await openVault('/vault', {});

		setTaskSources([...headingSources(['#to-list']), ...headingSources(['#work'])]);
		await settle();

		const saved = payloads().at(-1)!;
		expect(saved.tasksView).toEqual({ version: 1, sectionTag: '#to-list #work' });

		await reload(saved);

		expect(tasksStore.query.sources).toEqual(headingSources(['#to-list', '#work']));
	});

	it('saves a #work heading card built in the Sources panel', async () => {
		await openVault('/vault', {});
		mockTaskFetch([]);
		const { component } = await mountTasksView();
		const button = (name: string) =>
			Array.from(document.querySelectorAll<HTMLElement>('button')).filter((b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name);

		button('Edit')[0].click();
		flushSync();
		button('Add card')[0].click();
		flushSync();
		await openMenu(button('Add clause').at(-1)!);
		Array.from(document.querySelectorAll<HTMLElement>('[role="menu"][data-state="open"] [role="menuitem"]'))
			.find((el) => el.textContent?.trim() === 'Heading')!
			.click();
		flushSync();
		const inputs = document.querySelectorAll<HTMLInputElement>('input[aria-label="Heading"]');
		const input = inputs[inputs.length - 1];
		input.value = '#work';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
		unmount(component);

		expect(tasksStore.query.sources).toEqual(headingSources(['#to-list', '#work']));
		expect(payloads().at(-1)!.tasksView).toEqual({ version: 1, sectionTag: '#to-list #work' });
	});

	it('does not save a substring heading card or a folder-plus-heading card, and a reload restores the tag cards only', async () => {
		await openVault('/vault', { tasksView: { version: 1, sectionTag: '#a' } });
		const writesBefore = payloads().length;

		setTaskSources([
			...headingSources(['#a']),
			{ clauses: [{ kind: 'heading', text: 'Inbox', match: 'substring' }] },
			{ clauses: [{ kind: 'folder', path: 'Projects' }, { kind: 'heading', text: '#b', match: 'tag' }] },
		]);
		await settle();

		for (const payload of payloads().slice(writesBefore)) expect(payload.tasksView).toEqual({ version: 1, sectionTag: '#a' });
		expect(settingsStore.tasksView).toEqual({ version: 1, sectionTag: '#a' });

		await reload({ tasksView: settingsStore.tasksView });

		expect(tasksStore.query.sources).toEqual(headingSources(['#a']));
	});

	it('saves an empty text on Clear, and a reload gives the #to-list card', async () => {
		await openVault('/vault', { tasksView: { version: 1, sectionTag: '#a #b' } });

		setTaskSources([]);
		await settle();

		const saved = payloads().at(-1)!;
		expect(saved.tasksView).toEqual({ version: 1, sectionTag: '' });

		await reload(saved);

		expect(tasksStore.query.sources).toEqual(headingSources(['#to-list']));
	});

	it('loads the #to-list card when the file has no tasksView, quietly, and writes none back', async () => {
		tasksStore.setSources(headingSources(['#stale']));

		await openVault('/vault', { debugMode: false });

		expect(tasksStore.query.sources).toEqual(headingSources(['#to-list']));
		expect(tasksErrors()).toHaveLength(0);
		expect(toast.error).not.toHaveBeenCalled();
		const writeBack = payloads();
		expect(writeBack).toHaveLength(1);
		expect('tasksView' in writeBack[0]).toBe(false);
	});

	it.each([[''], [' , ']])('loads the #to-list card for a saved %j, which holds no tag', async (sectionTag) => {
		tasksStore.setSources(headingSources(['#stale']));

		await openVault('/vault', { tasksView: { version: 1, sectionTag } });

		expect(tasksStore.query.sources).toEqual(headingSources(['#to-list']));
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('builds one heading card per tag of a saved text', async () => {
		await openVault('/vault', { tasksView: { version: 1, sectionTag: ' #a, b ' } });

		expect(tasksStore.query.sources).toEqual(headingSources(['#a', '#b']));
	});

	it.each([[42], [null], [[]], ['x'], [{ sectionTag: 5 }]])(
		'an invalid %j loads the #to-list card, says so, and keeps its bytes until the next tag card change',
		async (value) => {
			tasksStore.setSources(headingSources(['#stale']));

			await openVault('/vault', { tasksView: value });

			expect(tasksStore.query.sources).toEqual(headingSources(['#to-list']));
			expect(tasksErrors()).toEqual([['TASKS', 'Invalid tasksView in settings.json:', value]]);
			expect(toast.error).toHaveBeenCalledTimes(1);
			expect(toast.error).toHaveBeenCalledWith(INVALID_TOAST);

			settingsStore.updateLayout({ railPanelsVisible: false });
			await settle();

			const before = payloads();
			expect(before.some((p) => (p.layout as { railPanelsVisible: boolean }).railPanelsVisible === false)).toBe(true);
			for (const payload of before) expect(payload.tasksView).toEqual(value);

			setTaskSources(headingSources(['#work']));
			await settle();

			expect(payloads().at(-1)!.tasksView).toEqual({ version: 1, sectionTag: '#work' });
		},
	);

	it('keeps unknown keys inside tasksView across a save', async () => {
		await openVault('/vault', { tasksView: { version: 1, sectionTag: '#a', extra: { x: 1 } } });

		setTaskSources(headingSources(['#b']));
		await settle();

		expect(payloads().at(-1)!.tasksView).toEqual({ version: 1, sectionTag: '#b', extra: { x: 1 } });
	});

	it('loads each vault its own tags, and writes a change only to the open vault', async () => {
		await openVault('/va', { tasksView: { version: 1, sectionTag: '#a' } });
		expect(tasksStore.query.sources).toEqual(headingSources(['#a']));

		await stopSettingsPersistence();
		await openVault('/vb', { tasksView: { version: 1, sectionTag: '#b' } });
		expect(tasksStore.query.sources).toEqual(headingSources(['#b']));

		// The double-switch path: no resetTasks() between B and C.
		await stopSettingsPersistence();
		await openVault('/vc', {});
		expect(tasksStore.query.sources).toEqual(headingSources(['#to-list']));

		await stopSettingsPersistence();
		await openVault('/vb', { tasksView: { version: 1, sectionTag: '#b' } });
		const writesBefore = vi.mocked(writeTextFile).mock.calls.length;
		setTaskSources(headingSources(['#b', '#more']));
		await settle();

		const changeWrites = vi.mocked(writeTextFile).mock.calls.slice(writesBefore);
		expect(changeWrites.length).toBeGreaterThan(0);
		expect(changeWrites.every(([path]) => path === settingsPath('/vb'))).toBe(true);
		expect(payloads('/vb').at(-1)!.tasksView).toEqual({ version: 1, sectionTag: '#b #more' });
		for (const payload of payloads('/va')) expect(payload.tasksView).toEqual({ version: 1, sectionTag: '#a' });
	});

	it('never writes settings.json of a session whose file could not be read', async () => {
		await openVault('/vault', 'unreadable');

		setTaskSources(headingSources(['#work']));
		await settle();
		await stopSettingsPersistence();

		expect(tasksStore.query.sources).toEqual(headingSources(['#work']));
		expect(payloads()).toHaveLength(0);
	});
});
