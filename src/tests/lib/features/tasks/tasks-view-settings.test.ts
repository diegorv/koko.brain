// @vitest-environment jsdom
// jsdom mirrors settings-persistence.test.ts: the persistence effect runs
// outside a mounted component tree, and the textbox case mounts TasksView.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Only the boundaries docs/TESTING.md allows: the disk, IPC, the toast, the
// theme DOM service, and the log. The settings and tasks stores, loadSettings,
// persistence, loadSavedTasksView and updateSectionTagFilter all run for real.
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

import { unmount } from 'svelte';
import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { error } from '#lib/utils/debug.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { loadSettings } from '#lib/core/settings/settings.service.js';
import { startSettingsPersistence, stopSettingsPersistence } from '#lib/core/settings/settings-persistence.svelte.js';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { loadSavedTasksView, updateSectionTagFilter } from '#lib/features/tasks/tasks.service.js';
import { mockTaskFetch, mountTasksView } from '../../../fixtures/tasks.fixture';

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

	it('saves a section tag change and restores it at the next load', async () => {
		await openVault('/vault', {});

		await updateSectionTagFilter('#to-list #work');
		await settle();

		const saved = payloads().at(-1)!;
		expect(saved.tasksView).toEqual({ version: 1, sectionTag: '#to-list #work' });

		await stopSettingsPersistence();
		settingsStore.reset();
		tasksStore.reset();
		vi.mocked(readTextFile).mockResolvedValueOnce(JSON.stringify(saved));
		await loadSettings('/vault');
		loadSavedTasksView();

		expect(tasksStore.sectionTag).toBe('#to-list #work');
	});

	it('saves a tag typed in the textbox', async () => {
		await openVault('/vault', {});
		mockTaskFetch([]);
		const { component } = await mountTasksView();
		const input = document.querySelector<HTMLInputElement>('input[aria-label="Section tag"]')!;

		input.value = '#work';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await vi.advanceTimersByTimeAsync(400);
		await settle();
		unmount(component);

		expect(tasksStore.sectionTag).toBe('#work');
		expect(payloads().at(-1)!.tasksView).toEqual({ version: 1, sectionTag: '#work' });
	});

	it('loads #to-list when the file has no tasksView, quietly, and writes none back', async () => {
		tasksStore.setSectionTag('#stale');

		await openVault('/vault', { debugMode: false });

		expect(tasksStore.sectionTag).toBe('#to-list');
		expect(tasksErrors()).toHaveLength(0);
		expect(toast.error).not.toHaveBeenCalled();
		const writeBack = payloads();
		expect(writeBack).toHaveLength(1);
		expect('tasksView' in writeBack[0]).toBe(false);
	});

	it.each([[''], [' , ']])('loads #to-list for a saved %j, which holds no tag', async (sectionTag) => {
		tasksStore.setSectionTag('#stale');

		await openVault('/vault', { tasksView: { version: 1, sectionTag } });

		expect(tasksStore.sectionTag).toBe('#to-list');
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('restores a saved text as typed, untrimmed', async () => {
		await openVault('/vault', { tasksView: { version: 1, sectionTag: ' #a, b ' } });

		expect(tasksStore.sectionTag).toBe(' #a, b ');
	});

	it.each([[42], [null], [[]], ['x'], [{ sectionTag: 5 }]])(
		'an invalid %j loads #to-list, says so, and keeps its bytes until the next tag change',
		async (value) => {
			tasksStore.setSectionTag('#stale');

			await openVault('/vault', { tasksView: value });

			expect(tasksStore.sectionTag).toBe('#to-list');
			expect(tasksErrors()).toEqual([['TASKS', 'Invalid tasksView in settings.json:', value]]);
			expect(toast.error).toHaveBeenCalledTimes(1);
			expect(toast.error).toHaveBeenCalledWith(INVALID_TOAST);

			settingsStore.updateLayout({ railPanelsVisible: false });
			await settle();

			const before = payloads();
			expect(before.some((p) => (p.layout as { railPanelsVisible: boolean }).railPanelsVisible === false)).toBe(true);
			for (const payload of before) expect(payload.tasksView).toEqual(value);

			await updateSectionTagFilter('#work');
			await settle();

			expect(payloads().at(-1)!.tasksView).toEqual({ version: 1, sectionTag: '#work' });
		},
	);

	it('keeps unknown keys inside tasksView across a save', async () => {
		await openVault('/vault', { tasksView: { version: 1, sectionTag: '#a', extra: { x: 1 } } });

		await updateSectionTagFilter('#b');
		await settle();

		expect(payloads().at(-1)!.tasksView).toEqual({ version: 1, sectionTag: '#b', extra: { x: 1 } });
	});

	it('loads each vault its own tags, and writes a change only to the open vault', async () => {
		await openVault('/va', { tasksView: { version: 1, sectionTag: '#a' } });
		expect(tasksStore.sectionTag).toBe('#a');

		await stopSettingsPersistence();
		await openVault('/vb', { tasksView: { version: 1, sectionTag: '#b' } });
		expect(tasksStore.sectionTag).toBe('#b');

		// The double-switch path: no resetTasks() between B and C.
		await stopSettingsPersistence();
		await openVault('/vc', {});
		expect(tasksStore.sectionTag).toBe('#to-list');

		await stopSettingsPersistence();
		await openVault('/vb', { tasksView: { version: 1, sectionTag: '#b' } });
		const writesBefore = vi.mocked(writeTextFile).mock.calls.length;
		await updateSectionTagFilter('#b #more');
		await settle();

		const changeWrites = vi.mocked(writeTextFile).mock.calls.slice(writesBefore);
		expect(changeWrites.length).toBeGreaterThan(0);
		expect(changeWrites.every(([path]) => path === settingsPath('/vb'))).toBe(true);
		expect(payloads('/vb').at(-1)!.tasksView).toEqual({ version: 1, sectionTag: '#b #more' });
		for (const payload of payloads('/va')) expect(payload.tasksView).toEqual({ version: 1, sectionTag: '#a' });
	});

	it('never writes settings.json of a session whose file could not be read', async () => {
		await openVault('/vault', 'unreadable');

		await updateSectionTagFilter('#work');
		await settle();
		await stopSettingsPersistence();

		expect(tasksStore.sectionTag).toBe('#work');
		expect(payloads()).toHaveLength(0);
	});
});
