import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';
import { createFakeTodoist, type FakeTodoist } from '../../../fixtures/todoist-sync.fake';

setupLocalStorage();

const { fake, toast } = vi.hoisted(() => ({
	fake: { current: null as FakeTodoist | null },
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tauri-apps/plugin-http', () => ({
	fetch: (url: string, init?: RequestInit) => fake.current!.fetch(url, init),
}));
vi.mock('svelte-sonner', () => ({ toast }));
vi.mock('#lib/utils/debug.js', () => ({ debug: vi.fn(), error: vi.fn() }));

import { error } from '#lib/utils/debug.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { todoistSyncStore } from '#lib/features/todoist-sync/todoist-sync.store.svelte.js';
import {
	checkSyncConnection,
	checkSyncConnectionFromUi,
	fetchRootProjectChoices,
} from '#lib/features/todoist-sync/todoist-sync.service.js';

let server: FakeTodoist;

/** The owner's shape: a Work tree, a Personal tree and the Inbox. */
function seedAccount() {
	server.addProject({ id: 'inbox', name: 'Inbox', inbox_project: true });
	server.addProject({ id: 'work', name: 'Work', child_order: 1 });
	server.addProject({ id: 'acme', name: 'Acme', parent_id: 'work' });
	server.addProject({ id: 'q4', name: 'Q4', parent_id: 'acme' });
	server.addProject({ id: 'personal', name: 'Personal', child_order: 2 });
	server.addItem({ id: 'w1', project_id: 'work', content: 'Plan' });
	server.addItem({ id: 'w2', project_id: 'q4', content: 'Ship' });
	server.addItem({ id: 'w3', project_id: 'acme', content: 'Done', checked: true });
	server.addItem({ id: 'p1', project_id: 'personal', content: 'Groceries' });
	server.addItem({ id: 'i1', project_id: 'inbox', content: 'Triage' });
}

function readyVault() {
	vaultStore.open('/vault');
	vaultStore.markIndexReady();
}

beforeEach(() => {
	vi.clearAllMocks();
	clearLocalStorage();
	vaultStore._reset();
	settingsStore.reset();
	todoistSyncStore.reset();
	server = createFakeTodoist();
	fake.current = server;
	seedAccount();
	settingsStore.updateTodoist({ apiToken: server.token, syncRootProjectId: 'work' });
});

describe('checkSyncConnection', () => {
	it('counts the root tree projects and open tasks from one full /sync', async () => {
		readyVault();

		const outcome = await checkSyncConnection();

		expect(outcome).toEqual({ ok: true, message: 'Todoist connection OK: 3 projects, 2 open tasks.' });
		expect(server.requests).toEqual([{ sync_token: '*', resource_types: ['projects', 'items'] }]);
		expect(todoistSyncStore.status).toBe('idle');
		expect(todoistSyncStore.lastResult).toMatchObject({ kind: 'check', projects: 3, openTasks: 2, inboxIncluded: false });
	});

	it('adds the Inbox when the vault includes it', async () => {
		readyVault();
		settingsStore.updateTodoist({ syncRootProjectId: 'personal', syncIncludeInbox: true });

		const outcome = await checkSyncConnection();

		expect(outcome).toEqual({ ok: true, message: 'Todoist connection OK: 2 projects, 2 open tasks (Inbox included).' });
		expect(todoistSyncStore.lastResult).toMatchObject({ projects: 2, openTasks: 2, inboxIncluded: true });
	});

	it('refuses before the vault index is ready, without calling Todoist', async () => {
		vaultStore.open('/vault');

		const outcome = await checkSyncConnection();

		expect(outcome).toEqual({ ok: false, message: 'The vault is still indexing. Try again when it finishes.' });
		expect(server.requests).toEqual([]);
		expect(todoistSyncStore.status).toBe('idle');
	});

	it('refuses without a token or a root project', async () => {
		readyVault();
		settingsStore.updateTodoist({ apiToken: '' });
		expect(await checkSyncConnection()).toEqual({ ok: false, message: 'Add your Todoist API token in Settings > Todoist first.' });

		settingsStore.updateTodoist({ apiToken: server.token, syncRootProjectId: '' });
		expect(await checkSyncConnection()).toEqual({ ok: false, message: 'Choose a sync root project in Settings > Todoist first.' });
		expect(server.requests).toEqual([]);
	});

	it('refuses while another run is in progress', async () => {
		readyVault();
		todoistSyncStore.start();

		expect(await checkSyncConnection()).toEqual({ ok: false, message: 'A Todoist sync is already running.' });
		expect(server.requests).toEqual([]);
		expect(todoistSyncStore.status).toBe('syncing');
	});

	it('reports a root project that is gone from Todoist', async () => {
		readyVault();
		settingsStore.updateTodoist({ syncRootProjectId: 'deleted-root' });

		const outcome = await checkSyncConnection();

		const message = 'The sync root project was not found in Todoist. Choose it again in Settings > Todoist.';
		expect(outcome).toEqual({ ok: false, message });
		expect(todoistSyncStore.status).toBe('error');
		expect(todoistSyncStore.lastError).toBe(message);
	});

	it('maps a rejected token to the fixed message and logs the raw error', async () => {
		readyVault();
		settingsStore.updateTodoist({ apiToken: 'wrong' });

		const outcome = await checkSyncConnection();

		expect(outcome).toEqual({ ok: false, message: 'Todoist rejected the API token. Check it in Settings > Todoist.' });
		expect(todoistSyncStore.status).toBe('error');
		expect(todoistSyncStore.lastError).toBe(outcome.message);
		expect(vi.mocked(error)).toHaveBeenCalledWith('TODOIST', 'sync connection check failed:', expect.objectContaining({ httpStatusCode: 401 }));
	});

	it('maps a 429 to the rate-limit message with retry_after', async () => {
		readyVault();
		server.failNext({ kind: 'rate-limit', retryAfter: 12 });

		const outcome = await checkSyncConnection();

		expect(outcome).toEqual({ ok: false, message: 'Todoist rate limit reached. Try again in 12 seconds.' });
		expect(vi.mocked(error)).toHaveBeenCalledWith('TODOIST', 'sync connection check failed:', expect.objectContaining({ httpStatusCode: 429 }));
	});

	it('maps a server error and a lost connection to the unreachable message', async () => {
		readyVault();
		server.failNext({ kind: 'server-error' });
		expect((await checkSyncConnection()).message).toBe('Could not reach Todoist. Check your connection and try again.');

		server.failNext({ kind: 'offline' }, 4);
		expect((await checkSyncConnection()).message).toBe('Could not reach Todoist. Check your connection and try again.');
		expect(todoistSyncStore.status).toBe('error');
	});

	it('keeps the last good result when a later check fails', async () => {
		readyVault();
		await checkSyncConnection();
		server.failNext({ kind: 'server-error' });

		await checkSyncConnection();

		expect(todoistSyncStore.lastResult).toMatchObject({ projects: 3, openTasks: 2 });
	});
});

describe('checkSyncConnectionFromUi', () => {
	it('shows the counts in a success toast', async () => {
		readyVault();
		await checkSyncConnectionFromUi();
		expect(toast.success).toHaveBeenCalledWith('Todoist connection OK: 3 projects, 2 open tasks.');
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('shows a refusal or failure in an error toast', async () => {
		await checkSyncConnectionFromUi();
		expect(toast.error).toHaveBeenCalledWith('The vault is still indexing. Try again when it finishes.');

		readyVault();
		settingsStore.updateTodoist({ apiToken: 'wrong' });
		await checkSyncConnectionFromUi();
		expect(toast.error).toHaveBeenLastCalledWith('Todoist rejected the API token. Check it in Settings > Todoist.');
		expect(toast.success).not.toHaveBeenCalled();
	});
});

describe('fetchRootProjectChoices', () => {
	it('lists the live non-Inbox projects with their paths from a projects-only full /sync', async () => {
		const choices = await fetchRootProjectChoices();

		expect(choices).toEqual([
			{ id: 'work', label: 'Work' },
			{ id: 'acme', label: 'Work / Acme' },
			{ id: 'q4', label: 'Work / Acme / Q4' },
			{ id: 'personal', label: 'Personal' },
		]);
		expect(server.requests).toEqual([{ sync_token: '*', resource_types: ['projects'] }]);
	});

	it('throws without a token, before calling Todoist', async () => {
		settingsStore.updateTodoist({ apiToken: '' });
		await expect(fetchRootProjectChoices()).rejects.toThrow('Todoist API token not configured');
		expect(server.requests).toEqual([]);
	});

	it('propagates a Todoist failure', async () => {
		server.failNext({ kind: 'unauthorized' });
		await expect(fetchRootProjectChoices()).rejects.toMatchObject({ httpStatusCode: 401 });
	});
});
