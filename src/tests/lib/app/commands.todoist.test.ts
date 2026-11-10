// @vitest-environment jsdom
// The palette's Todoist commands over the real sync services and stores,
// against the fake Todoist /sync behind the plugin-http fetch (and, for
// "Sync now", the in-memory vault behind invoke).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';
import { createFakeTodoist, type FakeTodoist } from '../../fixtures/todoist-sync.fake';
import { createFakeVault } from '../../fixtures/todoist-vault.fake';

setupLocalStorage();

const { fake } = vi.hoisted(() => ({ fake: { current: null as FakeTodoist | null } }));

vi.mock('@tauri-apps/plugin-http', () => ({
	fetch: (url: string, init?: RequestInit) => fake.current!.fetch(url, init),
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));
vi.mock('svelte-sonner', () => ({
	toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

import { toast } from 'svelte-sonner';
import { invoke } from '@tauri-apps/api/core';
import { getBuiltInCommands } from '#lib/app/commands.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { todoistSyncStore } from '#lib/features/todoist-sync/todoist-sync.store.svelte.js';

const ID = 'todoist:check-sync-connection';

function command() {
	return getBuiltInCommands().find((c) => c.id === ID);
}

describe('palette "Todoist: Check sync connection"', () => {
	let server: FakeTodoist;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		todoistSyncStore.reset();
		server = createFakeTodoist();
		fake.current = server;
		server.addProject({ id: 'work', name: 'Work' });
		server.addProject({ id: 'ops', name: 'Ops', parent_id: 'work' });
		server.addItem({ id: 'a', project_id: 'ops', content: 'Rotate keys' });
		settingsStore.updateTodoist({ apiToken: server.token, syncRootProjectId: 'work' });
	});

	it('is listed under its label in the Todoist category', () => {
		expect(command()).toMatchObject({ label: 'Todoist: Check sync connection', category: 'Todoist' });
	});

	it('reports the tree counts in a success toast', async () => {
		vaultStore.open('/vault');
		vaultStore.markIndexReady();

		await command()!.action();

		expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Todoist connection OK: 2 projects, 1 open task.');
		expect(todoistSyncStore.lastResult).toMatchObject({ projects: 2, openTasks: 1 });
	});

	it('refuses with an error toast before the vault index is ready', async () => {
		vaultStore.open('/vault');

		await command()!.action();

		expect(vi.mocked(toast.error)).toHaveBeenCalledWith('The vault is still indexing. Try again when it finishes.');
		expect(server.requests).toEqual([]);
	});
});

describe('palette "Todoist: Sync now"', () => {
	let server: FakeTodoist;
	const syncNowCommand = () => getBuiltInCommands().find((c) => c.id === 'todoist:sync-now');

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		todoistSyncStore.reset();
		server = createFakeTodoist();
		fake.current = server;
		server.addProject({ id: 'work', name: 'Work' });
		server.addItem({ id: 'a', project_id: 'work', content: 'Rotate keys' });
		settingsStore.updateTodoist({ apiToken: server.token, syncEnabled: true, syncRootProjectId: 'work' });
	});

	it('is listed under its label in the Todoist category', () => {
		expect(syncNowCommand()).toMatchObject({ label: 'Todoist: Sync now', category: 'Todoist' });
	});

	it('pulls the tree into project notes and reports it in a success toast', async () => {
		const vault = createFakeVault('/vault');
		vi.mocked(invoke).mockImplementation((cmd, args) => vault.invoke(cmd, args as Record<string, unknown> | undefined));
		vaultStore.open('/vault');
		vaultStore.markIndexReady();

		await syncNowCommand()!.action();

		expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Todoist sync done: 1 note created, 1 task added.');
		expect(vault.files.get('Todoist/Work.md')).toBe('---\ntodoist_project: work\n---\n- [ ] Rotate keys 🆔 td-a\n');
	});

	it('refuses with an error toast while sync is off', async () => {
		settingsStore.updateTodoist({ syncEnabled: false });
		vaultStore.open('/vault');
		vaultStore.markIndexReady();

		await syncNowCommand()!.action();

		expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Turn on Todoist sync in Settings > Todoist first.');
		expect(server.requests).toEqual([]);
	});
});
