// @vitest-environment jsdom
// The automatic Todoist sync over the real scheduler, sync service, writers
// and stores, with fake timers: the fake Todoist /sync behind the plugin-http
// fetch, and an in-memory vault behind invoke.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';
import { createFakeTodoist, type FakeTodoist } from '../../../fixtures/todoist-sync.fake';
import { createFakeVault, type FakeVault } from '../../../fixtures/todoist-vault.fake';

setupLocalStorage();

const { fake, toast } = vi.hoisted(() => ({
	fake: { current: null as { fetch(url: string, init?: RequestInit): Promise<Response> } | null },
	toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), dismiss: vi.fn() },
}));

vi.mock('@tauri-apps/plugin-http', () => ({
	fetch: (url: string, init?: RequestInit) => fake.current!.fetch(url, init),
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn(), writeTextFile: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast }));
vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn(async (_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { resetEditor } from '#lib/core/editor/editor.service.js';
import { notifyAfterSave, resetHooks } from '#lib/core/editor/editor.hooks.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { todoistSyncStore } from '#lib/features/todoist-sync/todoist-sync.store.svelte.js';
import { startAutoSync, stopAutoSync, syncNowFromUi } from '#lib/features/todoist-sync/sync-scheduler.service.js';

const MINUTE = 60_000;
const ROOT = '/work-vault';
const ANCHORED = '- [ ] Plan 🆔 td-w1\n';

let server: FakeTodoist;
let vault: FakeVault;

/** Lets every pending promise and real I/O callback run (timers stay fake). */
async function settle(): Promise<void> {
	for (let i = 0; i < 30; i++) await new Promise((resolve) => setImmediate(resolve));
}

/** Moves the fake clock forward, settling the cycles that start on the way. */
async function advance(ms: number): Promise<void> {
	await vi.advanceTimersByTimeAsync(ms);
	await settle();
}

/**
 * Number of cycles that reached Todoist: each one starts with exactly one
 * full sync (`sync_token: '*'`); later requests of the same cycle (the
 * incremental pull, command batches) are not counted.
 */
const cycles = () => server.requests.filter((r) => r.sync_token === '*').length;

/** Holds every /sync request until `release()`; returns the release. */
function holdRequests(): () => void {
	let open = false;
	const waiting: (() => void)[] = [];
	fake.current = {
		async fetch(url, init) {
			if (!open) await new Promise<void>((resolve) => waiting.push(resolve));
			return server.fetch(url, init);
		},
	};
	return () => {
		open = true;
		for (const resolve of waiting.splice(0)) resolve();
	};
}

function focusWindow() {
	window.dispatchEvent(new Event('focus'));
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
	vi.clearAllMocks();
	clearLocalStorage();
	vaultStore._reset();
	settingsStore.reset();
	todoistSyncStore.reset();
	editorStore.reset();
	fsStore.reset();
	resetHooks();
	server = createFakeTodoist();
	fake.current = server;
	server.addProject({ id: 'work', name: 'Work' });
	server.addItem({ id: 'w1', project_id: 'work', content: 'Plan' });
	vault = createFakeVault(ROOT);
	vault.kv.set('first_run_done', '1');
	vi.mocked(invoke).mockImplementation((cmd, args) => vault.invoke(cmd, args as Record<string, unknown> | undefined));
	vi.mocked(readTextFile).mockImplementation(async (path) => {
		const content = vault.files.get(String(path).slice(vault.root.length + 1));
		if (content === undefined) throw new Error(`No such file: ${String(path)}`);
		return content;
	});
	vaultStore.open(ROOT);
	vaultStore.markIndexReady();
	settingsStore.updateTodoist({ apiToken: server.token, syncEnabled: true, syncRootProjectId: 'work', syncIntervalMinutes: 5 });
});

afterEach(() => {
	stopAutoSync();
	resetEditor();
	resetHooks();
	vaultStore.close();
	vi.useRealTimers();
});

describe('automatic triggers', () => {
	it('runs a cycle when started on an open vault with its index ready', async () => {
		startAutoSync(ROOT);
		await settle();

		expect(cycles()).toBe(1);
		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Plan 🆔 td-w1');
		expect(todoistSyncStore.lastSyncedAt).toBe(Date.now());
	});

	it('runs again every syncIntervalMinutes, reading the setting each period', async () => {
		startAutoSync(ROOT);
		await settle();

		await advance(5 * MINUTE - 1);
		expect(cycles()).toBe(1);
		await advance(1);
		expect(cycles()).toBe(2);

		settingsStore.updateTodoist({ syncIntervalMinutes: 10 });
		await advance(5 * MINUTE);
		expect(cycles()).toBe(3);
		await advance(5 * MINUTE);
		expect(cycles()).toBe(3);
		await advance(5 * MINUTE);
		expect(cycles()).toBe(4);
	});

	it('runs when the window regains focus', async () => {
		startAutoSync(ROOT);
		await settle();
		await advance(MINUTE);

		focusWindow();
		await settle();

		expect(cycles()).toBe(2);
	});

	it('runs 5 s after saving a note of the vault that holds an anchored line', async () => {
		startAutoSync(ROOT);
		await settle();
		await advance(MINUTE);

		notifyAfterSave(`${ROOT}/Notes/Day.md`, ANCHORED);
		await advance(4999);
		expect(cycles()).toBe(1);
		await advance(1);
		expect(cycles()).toBe(2);
	});

	it('ignores a save without an anchored line, or of a note outside the vault', async () => {
		startAutoSync(ROOT);
		await settle();
		await advance(MINUTE);

		notifyAfterSave(`${ROOT}/Notes/Day.md`, '- [ ] No anchor\n');
		notifyAfterSave('/other-vault/Day.md', ANCHORED);
		await advance(10_000);

		expect(cycles()).toBe(1);
	});

	it('waits 30 s after the last cycle before an automatic one', async () => {
		startAutoSync(ROOT);
		await settle();

		focusWindow();
		await advance(29_999);
		expect(cycles()).toBe(1);
		await advance(1);
		expect(cycles()).toBe(2);
	});

	it('never runs an automatic cycle before first_run_done, and asks nothing', async () => {
		vault.kv.delete('first_run_done');
		startAutoSync(ROOT);
		await settle();
		await advance(5 * MINUTE);
		focusWindow();
		await settle();

		expect(cycles()).toBe(0);
		expect(vault.writes).toEqual([]);
		expect(todoistSyncStore.status).toBe('idle');
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('stays silent and runs nothing while sync is off', async () => {
		settingsStore.updateTodoist({ syncEnabled: false });
		startAutoSync(ROOT);
		await settle();
		await advance(5 * MINUTE);

		expect(cycles()).toBe(0);
		expect(toast.error).not.toHaveBeenCalled();
		expect(todoistSyncStore.status).toBe('idle');
	});

	it('schedules nothing for a save made while sync is off', async () => {
		settingsStore.updateTodoist({ syncEnabled: false });
		startAutoSync(ROOT);
		await settle();

		notifyAfterSave(`${ROOT}/Notes/Day.md`, ANCHORED);
		settingsStore.updateTodoist({ syncEnabled: true });
		await advance(10_000);

		expect(cycles()).toBe(0);
	});
});

describe('one cycle at a time', () => {
	it('queues a single follow-up for any number of triggers during a cycle', async () => {
		const release = holdRequests();
		startAutoSync(ROOT);
		await settle();
		expect(cycles()).toBe(0);

		focusWindow();
		focusWindow();
		notifyAfterSave(`${ROOT}/Notes/Day.md`, ANCHORED);
		await advance(5000);
		release();
		await settle();
		expect(cycles()).toBe(1);

		await advance(30_000);
		expect(cycles()).toBe(2);
		await advance(MINUTE);
		expect(cycles()).toBe(2);
	});

	it('runs "Sync now" pressed during a cycle right after it, and toasts its result', async () => {
		const release = holdRequests();
		startAutoSync(ROOT);
		await settle();

		const pressed = syncNowFromUi();
		release();
		await settle();
		await pressed;

		expect(cycles()).toBe(2);
		expect(toast.success).toHaveBeenCalledWith('Todoist sync done: nothing new.');
	});
});

describe('over the close/reopen cap', () => {
	const OVER_CAP = 'Todoist automatic sync skipped closing or reopening 26 tasks: more than 25 in one sync. Run "Todoist: Sync now" to confirm them.';

	/** Syncs 26 more Work tasks in automatically, then checks each one in the brain. */
	async function checkMany() {
		for (let i = 1; i <= 26; i++) server.addItem({ id: `c${i}`, project_id: 'work', content: `Chore ${i}`, child_order: 10 + i });
		startAutoSync(ROOT);
		await settle();
		vault.files.set('Todoist/Work.md', vault.files.get('Todoist/Work.md')!.replace(/- \[ \] Chore/gu, '- [x] Chore'));
	}

	const commandRequests = () => server.requests.filter((r) => r.commands);

	it('never asks in an automatic cycle: it sends no close/reopen and toasts once', async () => {
		await checkMany();

		await advance(30_000);
		focusWindow();
		await settle();
		await advance(5 * MINUTE);

		expect(cycles()).toBe(3);
		expect(vi.mocked(ask)).not.toHaveBeenCalled();
		expect(commandRequests()).toEqual([]);
		expect(server.item('c1')!.checked).toBe(false);
		expect(toast.error).not.toHaveBeenCalled();
		expect(toast.warning).toHaveBeenCalledTimes(1);
		expect(toast.warning).toHaveBeenCalledWith(OVER_CAP, { id: 'todoist-sync-over-cap', duration: Infinity, closeButton: true });
	});

	it('"Sync now" still asks, and once the pushes ran the toast is dismissed', async () => {
		await checkMany();
		await advance(30_000);
		focusWindow();
		await settle();
		expect(toast.warning).toHaveBeenCalledTimes(1);

		vi.mocked(ask).mockResolvedValue(true);
		await syncNowFromUi();

		expect(vi.mocked(ask)).toHaveBeenCalledTimes(1);
		expect(commandRequests().map((r) => r.commands!.length)).toEqual([26]);
		expect(server.item('c1')!.checked).toBe(true);
		expect(toast.dismiss).toHaveBeenCalledWith('todoist-sync-over-cap');
	});
});

describe('over the detach cap', () => {
	const DETACH_CAP = 'Todoist automatic sync skipped detaching 11 deleted or moved tasks: more than 10 in one sync. Run "Todoist: Sync now" to confirm them.';

	/** Syncs 11 more Work tasks in automatically, then deletes each one in Todoist. */
	async function deleteMany() {
		for (let i = 1; i <= 11; i++) server.addItem({ id: `d${i}`, project_id: 'work', content: `Old ${i}`, child_order: 10 + i });
		startAutoSync(ROOT);
		await settle();
		for (let i = 1; i <= 11; i++) server.updateItem(`d${i}`, { is_deleted: true });
	}

	it('never asks in an automatic cycle: it detaches nothing and toasts once', async () => {
		await deleteMany();

		await advance(30_000);
		focusWindow();
		await settle();
		await advance(5 * MINUTE);

		expect(cycles()).toBe(3);
		expect(vi.mocked(ask)).not.toHaveBeenCalled();
		expect(vault.links.get('td-d1')!.missCount).toBe(0);
		expect(toast.error).not.toHaveBeenCalled();
		expect(toast.warning).toHaveBeenCalledTimes(1);
		expect(toast.warning).toHaveBeenCalledWith(DETACH_CAP, { id: 'todoist-sync-detach-cap', duration: Infinity, closeButton: true });
	});

	it('"Sync now" still asks, and once the detaches ran the toast is dismissed', async () => {
		await deleteMany();
		await advance(30_000);
		focusWindow();
		await settle();
		expect(toast.warning).toHaveBeenCalledTimes(1);

		vi.mocked(ask).mockResolvedValue(true);
		await syncNowFromUi();

		expect(vi.mocked(ask)).toHaveBeenCalledTimes(1);
		expect(vault.links.get('td-d1')!.missCount).toBe(3);
		expect(toast.dismiss).toHaveBeenCalledWith('todoist-sync-detach-cap');
	});
});

describe('the line brake', () => {
	it('stops an automatic cycle that finds too few synced lines, with a persistent toast, and "Sync now" with an error toast', async () => {
		startAutoSync(ROOT);
		await settle();
		vault.files.set('Todoist/Work.md', '---\ntodoist_project: work\n---\n');

		await advance(30_000);
		focusWindow();
		await settle();

		expect(cycles()).toBe(2);
		expect(toast.error).toHaveBeenCalledWith(
			'Todoist automatic sync stopped: fewer than half of the synced task lines were found in the vault. Nothing was changed.',
			{ id: 'todoist-sync-lines-missing', duration: Infinity, closeButton: true },
		);
		expect(vault.links.get('td-w1')!.missCount).toBe(0);

		await syncNowFromUi();
		expect(toast.error).toHaveBeenLastCalledWith('Todoist sync stopped: fewer than half of the synced task lines were found in the vault. Nothing was changed.');
		expect(vault.files.get('Todoist/Work.md')).toBe('---\ntodoist_project: work\n---\n');
	});
});

describe('Todoist failures', () => {
	it('waits retry_after seconds after a 429 before the next cycle', async () => {
		server.failNext({ kind: 'rate-limit', retryAfter: 90 });
		startAutoSync(ROOT);
		await settle();
		expect(todoistSyncStore.status).toBe('error');

		await advance(45_000);
		focusWindow();
		await advance(44_999);
		expect(cycles()).toBe(1);
		await advance(1);
		expect(cycles()).toBe(2);
		expect(todoistSyncStore.status).toBe('idle');
	});

	it('waits 60 s after a 429 without retry_after', async () => {
		server.failNext({ kind: 'rate-limit' });
		startAutoSync(ROOT);
		await settle();

		focusWindow();
		await advance(59_999);
		expect(cycles()).toBe(1);
		await advance(1);
		expect(cycles()).toBe(2);
	});

	it('refuses "Sync now" during the 429 wait without calling Todoist', async () => {
		server.failNext({ kind: 'rate-limit', retryAfter: 90 });
		startAutoSync(ROOT);
		await settle();
		await advance(30_000);

		await syncNowFromUi();

		expect(cycles()).toBe(1);
		expect(toast.error).toHaveBeenCalledWith('Todoist rate limit reached. Try again in 60 seconds.');
	});

	it('refuses a "Sync now" queued during the cycle that gets a 429, without calling Todoist', async () => {
		server.failNext({ kind: 'rate-limit', retryAfter: 90 });
		const release = holdRequests();
		startAutoSync(ROOT);
		await settle();

		const pressed = syncNowFromUi();
		release();
		await settle();
		await pressed;

		expect(cycles()).toBe(1);
		expect(toast.error).toHaveBeenCalledWith('Todoist rate limit reached. Try again in 90 seconds.');
		expect(toast.success).not.toHaveBeenCalled();
	});

	it('stops automatic cycles after a 401 until the token changes, with a token toast', async () => {
		server.failNext({ kind: 'unauthorized' });
		startAutoSync(ROOT);
		await settle();

		expect(toast.error).toHaveBeenCalledWith(
			'Todoist automatic sync stopped: the API token is invalid. Update it in Settings > Todoist.',
			{ id: 'todoist-sync-invalid-token', duration: Infinity, closeButton: true },
		);
		await advance(15 * MINUTE);
		focusWindow();
		await settle();
		expect(cycles()).toBe(1);

		settingsStore.updateTodoist({ apiToken: 'new-token' });
		server.token = 'new-token';
		focusWindow();
		await settle();
		expect(cycles()).toBe(2);
	});

	it('shows the persistent toast once per kind until a cycle succeeds, then dismisses it', async () => {
		server.failNext({ kind: 'server-error' }, 2);
		startAutoSync(ROOT);
		await settle();
		await advance(5 * MINUTE);
		expect(cycles()).toBe(2);
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(toast.error).toHaveBeenCalledWith('Could not reach Todoist. Automatic sync will retry later.', {
			id: 'todoist-sync-unreachable',
			duration: Infinity,
			closeButton: true,
		});

		await advance(5 * MINUTE);
		expect(toast.dismiss).toHaveBeenCalledWith('todoist-sync-unreachable');

		server.failNext({ kind: 'server-error' });
		await advance(5 * MINUTE);
		expect(toast.error).toHaveBeenCalledTimes(2);
	});

	it('shows a fixed toast for a root project gone from Todoist', async () => {
		settingsStore.updateTodoist({ syncRootProjectId: 'gone' });
		startAutoSync(ROOT);
		await settle();

		expect(toast.error).toHaveBeenCalledWith(
			'The sync root project was not found in Todoist. Choose it again in Settings > Todoist.',
			expect.objectContaining({ id: 'todoist-sync-root-missing' }),
		);
	});
});

describe('stop and vault switch', () => {
	it('runs nothing more after stopAutoSync', async () => {
		startAutoSync(ROOT);
		await settle();

		stopAutoSync();
		focusWindow();
		notifyAfterSave(`${ROOT}/Notes/Day.md`, ANCHORED);
		await advance(15 * MINUTE);

		expect(cycles()).toBe(1);
	});

	it('drops the follow-up queued during a cycle when stopped', async () => {
		const release = holdRequests();
		startAutoSync(ROOT);
		await settle();
		focusWindow();

		stopAutoSync();
		release();
		await advance(MINUTE);

		expect(cycles()).toBe(1);
	});

	it('never starts a cycle for another vault than the one it was started on', async () => {
		startAutoSync(ROOT);
		await settle();
		const other = createFakeVault('/other-vault');
		other.kv.set('first_run_done', '1');
		vault = other;
		vaultStore.open('/other-vault');
		vaultStore.markIndexReady();

		await advance(5 * MINUTE);
		focusWindow();
		await settle();

		expect(cycles()).toBe(1);
		expect(other.writes).toEqual([]);
	});

	it('skips a cycle whose vault switches while its first_run_done is read', async () => {
		let releaseKv: () => void = () => {};
		const kvHeld = new Promise<void>((resolve) => (releaseKv = resolve));
		vi.mocked(invoke).mockImplementation(async (cmd, args) => {
			// The vault the call was made against answers it, after the switch too.
			const target = vault;
			if (cmd === 'todoist_read_kv') await kvHeld;
			return target.invoke(cmd, args as Record<string, unknown> | undefined);
		});
		startAutoSync(ROOT);
		await settle();
		const other = createFakeVault('/other-vault');
		vault = other;
		vaultStore.open('/other-vault');
		vaultStore.markIndexReady();

		releaseKv();
		await settle();

		expect(cycles()).toBe(0);
		expect(other.writes).toEqual([]);
	});
});

describe('syncNowFromUi', () => {
	it('shows the result in a success toast', async () => {
		await syncNowFromUi();
		expect(toast.success).toHaveBeenCalledWith('Todoist sync done: 1 note created, 1 task added.');
	});

	it('runs without first_run_done: only automatic cycles wait for it', async () => {
		vault.kv.delete('first_run_done');
		await syncNowFromUi();
		expect(cycles()).toBe(1);
	});

	it('shows a refused sync folder in an error toast', async () => {
		settingsStore.updateTodoist({ syncFolder: '../x' });
		await syncNowFromUi();
		expect(toast.error).toHaveBeenCalledWith('The Todoist sync folder must be a folder inside the vault. Fix it in Settings > Todoist.');
		expect(toast.success).not.toHaveBeenCalled();
	});
});
