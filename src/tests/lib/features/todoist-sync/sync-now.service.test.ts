// "Todoist: Sync now" over the real sync service, writers and stores: the
// fake Todoist /sync behind the plugin-http fetch, and an in-memory vault
// behind invoke.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';
import { createFakeTodoist, type FakeTodoist } from '../../../fixtures/todoist-sync.fake';
import { createFakeVault, type FakeVault } from '../../../fixtures/todoist-vault.fake';

setupLocalStorage();

const { fake, toast } = vi.hoisted(() => ({
	fake: { current: null as { fetch(url: string, init?: RequestInit): Promise<Response> } | null },
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tauri-apps/plugin-http', () => ({
	fetch: (url: string, init?: RequestInit) => fake.current!.fetch(url, init),
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn(), writeTextFile: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast }));
vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn(async (_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

import { invoke } from '@tauri-apps/api/core';
import { error } from '#lib/utils/debug.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { resetEditor } from '#lib/core/editor/editor.service.js';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { todoistSyncStore } from '#lib/features/todoist-sync/todoist-sync.store.svelte.js';
import { syncNow, syncNowFromUi } from '#lib/features/todoist-sync/sync-now.service.js';

let server: FakeTodoist;
let vault: FakeVault;

/** A Work tree, a Personal tree and the Inbox, with open and closed tasks. */
function seedAccount() {
	server.addProject({ id: 'inbox', name: 'Inbox', inbox_project: true });
	server.addProject({ id: 'work', name: 'Work', child_order: 1 });
	server.addProject({ id: 'acme', name: 'Acme', parent_id: 'work' });
	server.addProject({ id: 'q4', name: 'Q4', parent_id: 'acme' });
	server.addProject({ id: 'personal', name: 'Personal', child_order: 2 });
	server.addItem({ id: 'w1', project_id: 'work', content: 'Plan', priority: 4, labels: ['deep', 'Work'], child_order: 1 });
	server.addItem({
		id: 'w2',
		project_id: 'work',
		content: 'Report',
		child_order: 2,
		due: { is_recurring: true, string: 'every week', date: '2026-11-13', lang: 'en' },
	});
	server.addItem({ id: 'q1', project_id: 'q4', content: 'Ship' });
	server.addItem({ id: 'a1', project_id: 'acme', content: 'Done', checked: true });
	server.addItem({ id: 'p1', project_id: 'personal', content: 'Groceries' });
	server.addItem({ id: 'i1', project_id: 'inbox', content: 'Triage' });
}

/** Opens `v` as the vault the app and Rust see, index ready. */
function openVault(v: FakeVault) {
	vault = v;
	vaultStore.open(v.root);
	vaultStore.markIndexReady();
}

const WORK_NOTE = '---\ntodoist_project: work\n---\n- [ ] Plan 🔺 #deep 🆔 td-w1\n- [ ] Report 📅 2026-11-13 🔁 every week 🆔 td-w2\n';

beforeEach(() => {
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
	seedAccount();
	vi.mocked(invoke).mockImplementation((cmd, args) => vault.invoke(cmd, args as Record<string, unknown> | undefined));
	openVault(createFakeVault('/work-vault'));
	settingsStore.updateTodoist({ apiToken: server.token, syncEnabled: true, syncRootProjectId: 'work' });
});

afterEach(() => {
	resetEditor();
	resetHooks();
	vaultStore.close();
});

describe('syncNow: first run', () => {
	it('creates one note per tree project and writes each open task as an anchored line', async () => {
		const outcome = await syncNow();

		expect(outcome).toEqual({ ok: true, message: 'Todoist sync done: 3 notes created, 3 tasks added.' });
		expect(Object.fromEntries(vault.files)).toEqual({
			'Todoist/Work.md': WORK_NOTE,
			'Todoist/Acme.md': '---\ntodoist_project: acme\n---\n',
			'Todoist/Q4.md': '---\ntodoist_project: q4\n---\n- [ ] Ship 🆔 td-q1\n',
		});
		expect(todoistSyncStore.status).toBe('idle');
		expect(todoistSyncStore.lastResult).toMatchObject({ kind: 'pull', mode: 'normal', notesCreated: 3, tasksInserted: 3, linksPaired: 0 });
	});

	it('sends nothing to Todoist: one full /sync with no commands', async () => {
		await syncNow();

		expect(server.requests).toEqual([{ sync_token: '*', resource_types: ['projects', 'items'] }]);
	});

	it('commits the bases of every inserted line together with the sync token', async () => {
		await syncNow();

		expect(vault.commits).toHaveLength(1);
		const [commit] = vault.commits;
		expect(commit.kv).toEqual([{ key: 'sync_token', value: `v${server.version}` }]);
		expect(commit.upsertLinks.map((l) => [l.anchor, l.todoistId, l.noteRelPath])).toEqual([
			['td-w1', 'w1', 'Todoist/Work.md'],
			['td-w2', 'w2', 'Todoist/Work.md'],
			['td-q1', 'q1', 'Todoist/Q4.md'],
		]);
		const w1 = commit.upsertLinks[0];
		expect(JSON.parse(w1.localBase!)).toEqual({ description: 'Plan', status: ' ', dueDate: null, priority: 'highest', tags: ['deep'] });
		expect(JSON.parse(w1.remoteBase!)).toMatchObject({ content: 'Plan', priority: 4, labels: ['deep', 'Work'], unmappedLabels: ['Work'] });
	});

	it('normalizes the sync folder before use', async () => {
		settingsStore.updateTodoist({ syncFolder: '  Areas/Todoist/ ' });

		await syncNow();

		expect([...vault.files.keys()]).toEqual(['Areas/Todoist/Work.md', 'Areas/Todoist/Acme.md', 'Areas/Todoist/Q4.md']);
	});

	it('logs content that does not survive a parse back, and still writes it', async () => {
		server.addItem({ id: 'h1', project_id: 'work', content: 'Fix #12', child_order: 3 });

		await syncNow();

		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Fix #12 🆔 td-h1');
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'content-roundtrip', anchor: 'td-h1' })]);
		const h1 = vault.links.get('td-h1')!;
		expect(JSON.parse(h1.remoteBase!).contentProblem).toBe('hash');
	});
});

describe('syncNow: tree filter', () => {
	it('gives two vaults on one account only their own tree, and the Inbox only to the vault that includes it', async () => {
		const work = vault;
		await syncNow();

		const personal = createFakeVault('/personal-vault');
		openVault(personal);
		settingsStore.reset();
		settingsStore.updateTodoist({ apiToken: server.token, syncEnabled: true, syncRootProjectId: 'personal', syncIncludeInbox: true });
		await syncNow();

		expect([...work.files.keys()].sort()).toEqual(['Todoist/Acme.md', 'Todoist/Q4.md', 'Todoist/Work.md']);
		expect([...work.links.keys()].sort()).toEqual(['td-q1', 'td-w1', 'td-w2']);
		expect(Object.fromEntries(personal.files)).toEqual({
			'Todoist/Inbox.md': '---\ntodoist_project: inbox\n---\n- [ ] Triage 🆔 td-i1\n',
			'Todoist/Personal.md': '---\ntodoist_project: personal\n---\n- [ ] Groceries 🆔 td-p1\n',
		});
		expect([...personal.links.keys()].sort()).toEqual(['td-i1', 'td-p1']);
	});
});

describe('syncNow: re-run', () => {
	it('inserts nothing and rewrites nothing unchanged', async () => {
		await syncNow();
		const files = new Map(vault.files);
		const writes = vault.writes.length;

		const outcome = await syncNow();

		expect(outcome).toEqual({ ok: true, message: 'Todoist sync done: nothing new.' });
		expect(vault.files).toEqual(files);
		expect(vault.writes).toHaveLength(writes);
		expect(vault.commits[1].upsertLinks).toEqual([]);
	});

	it('finds an existing project note by its frontmatter id after a rename', async () => {
		await syncNow();
		vault.files.set('Areas/My job.md', vault.files.get('Todoist/Work.md')!);
		vault.files.delete('Todoist/Work.md');
		server.addItem({ id: 'w3', project_id: 'work', content: 'Hire', child_order: 3 });

		await syncNow();

		expect(vault.files.has('Todoist/Work.md')).toBe(false);
		expect(vault.files.get('Areas/My job.md')).toBe(`${WORK_NOTE}- [ ] Hire 🆔 td-w3\n`);
	});

	it('reads open-tab content and freezes a link whose anchor was duplicated there', async () => {
		await syncNow();
		const path = '/work-vault/Notes/Day.md';
		const unsaved = '- [ ] Plan 🔺 #deep 🆔 td-w1\n';
		vault.files.set('Notes/Day.md', '');
		editorStore.addTab({ path, name: 'Day.md', content: unsaved, savedContent: '' });

		await syncNow();

		expect(vault.links.get('td-w1')!.frozen).toBe(true);
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'frozen', anchor: 'td-w1' })]);
	});

	it('inserts into a project note open in a tab through the tab, not the disk', async () => {
		await syncNow();
		const path = '/work-vault/Todoist/Work.md';
		editorStore.addTab({ path, name: 'Work.md', content: `${WORK_NOTE}typed, unsaved\n`, savedContent: WORK_NOTE });
		server.addItem({ id: 'w3', project_id: 'work', content: 'Hire', child_order: 3 });

		await syncNow();

		expect(editorStore.tabs[0].content).toBe(`${WORK_NOTE}typed, unsaved\n- [ ] Hire 🆔 td-w3\n`);
		expect(vault.files.get('Todoist/Work.md')).toBe(WORK_NOTE);
		expect(vault.links.has('td-w3')).toBe(true);
	});

	it('ignores anchored lines in excluded folders', async () => {
		await syncNow();
		vault.files.set('_system/templates/Task.md', '- [ ] Plan 🆔 td-w1\n');

		await syncNow();

		expect(vault.links.get('td-w1')!.frozen).toBe(false);
	});
});

describe('syncNow: rebuild mode', () => {
	it('pairs anchored lines with an empty link table, creates nothing and logs the unmatched', async () => {
		await syncNow();
		vault.links.clear();
		server.addItem({ id: 'w3', project_id: 'work', content: 'New in Todoist', child_order: 3 });
		const files = new Map(vault.files);

		const outcome = await syncNow();

		expect(outcome).toEqual({ ok: true, message: 'Todoist sync rebuilt 3 links from the vault; nothing was created.' });
		expect(vault.files).toEqual(files);
		expect([...vault.links.keys()].sort()).toEqual(['td-q1', 'td-w1', 'td-w2']);
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'unmatched', anchor: 'td-w3' })]);
		expect(todoistSyncStore.lastResult).toMatchObject({ mode: 'rebuild', linksPaired: 3 });
	});

	it('says why nothing comes in when a rebuild pairs no line', async () => {
		vault.files.set('Notes/Old.md', '- [ ] Old 🆔 td-gone\n');

		const outcome = await syncNow();

		expect(outcome.message).toBe(
			'Todoist sync rebuilt 0 links from the vault; nothing was created. 1 anchored line has no open Todoist task: ' +
				'new Todoist tasks come in only after a line pairs or those 🆔 anchors are removed.',
		);
		expect(todoistSyncStore.lastResult).toMatchObject({ mode: 'rebuild', linksPaired: 0, linesUnmatched: 1 });
	});
});

describe('syncNow: stale insert', () => {
	it('keeps the sync token out of the commit when an insert went stale', async () => {
		await syncNow();
		// The scan skips code fences but the writer still sees this anchor, so the insert goes stale.
		vault.files.set('Todoist/Work.md', `${WORK_NOTE}\`\`\`\n- [ ] Hire 🆔 td-w3\n\`\`\`\n`);
		server.addItem({ id: 'w3', project_id: 'work', content: 'Hire', child_order: 3 });

		await syncNow();

		expect(vault.commits[1].kv).toEqual([]);
		expect(vault.links.has('td-w3')).toBe(false);
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'stale' })]);
	});
});

describe('syncNow: refusals and safety', () => {
	it('refuses before the vault index is ready, without calling Todoist', async () => {
		vaultStore.resetIndexReady();

		expect(await syncNow()).toEqual({ ok: false, message: 'The vault is still indexing. Try again when it finishes.' });
		expect(server.requests).toEqual([]);
		expect(vault.writes).toEqual([]);
	});

	it('refuses while sync is off, without a token or without a root project', async () => {
		settingsStore.updateTodoist({ syncEnabled: false });
		expect(await syncNow()).toEqual({ ok: false, message: 'Turn on Todoist sync in Settings > Todoist first.' });

		settingsStore.updateTodoist({ syncEnabled: true, apiToken: '' });
		expect(await syncNow()).toEqual({ ok: false, message: 'Add your Todoist API token in Settings > Todoist first.' });

		settingsStore.updateTodoist({ apiToken: server.token, syncRootProjectId: '' });
		expect(await syncNow()).toEqual({ ok: false, message: 'Choose a sync root project in Settings > Todoist first.' });
		expect(server.requests).toEqual([]);
	});

	it('refuses an absolute or .. sync folder', async () => {
		const message = 'The Todoist sync folder must be a folder inside the vault. Fix it in Settings > Todoist.';
		for (const syncFolder of ['/Users/me/Todoist', '../Todoist', 'a/../b']) {
			settingsStore.updateTodoist({ syncFolder });
			expect(await syncNow()).toEqual({ ok: false, message });
		}
		expect(server.requests).toEqual([]);
		expect(vault.writes).toEqual([]);
	});

	it('refuses while another run is in progress', async () => {
		todoistSyncStore.start();

		expect(await syncNow()).toEqual({ ok: false, message: 'A Todoist sync is already running.' });
		expect(server.requests).toEqual([]);
	});

	it('writes nothing to either vault when the vault switches mid-cycle', async () => {
		const first = vault;
		const second = createFakeVault('/other-vault');
		fake.current = {
			async fetch(url, init) {
				const response = await server.fetch(url, init);
				openVault(second);
				return response;
			},
		};

		const outcome = await syncNow();

		expect(outcome).toEqual({ ok: false, message: 'The vault changed during the Todoist sync; nothing more was written.' });
		expect(first.writes).toEqual([]);
		expect(second.writes).toEqual([]);
		expect(first.commits).toEqual([]);
		expect(second.commits).toEqual([]);
		expect(todoistSyncStore.status).toBe('error');
	});

	it('stops after the first note when the vault switches between writes', async () => {
		const first = vault;
		const second = createFakeVault('/other-vault');
		vi.mocked(invoke).mockImplementation(async (cmd, args) => {
			const out = await vault.invoke(cmd, args as Record<string, unknown> | undefined);
			if (cmd === 'create_note') openVault(second);
			return out;
		});

		const outcome = await syncNow();

		expect(outcome).toEqual({ ok: false, message: 'The vault changed during the Todoist sync; nothing more was written.' });
		expect(first.writes).toEqual(['Todoist/Work.md']);
		expect(second.writes).toEqual([]);
		expect(first.commits).toEqual([]);
		expect(second.commits).toEqual([]);
	});

	it('maps a Todoist failure to its fixed message and logs the raw error', async () => {
		server.failNext({ kind: 'unauthorized' });

		const outcome = await syncNow();

		expect(outcome).toEqual({ ok: false, message: 'Todoist rejected the API token. Check it in Settings > Todoist.' });
		expect(vi.mocked(error)).toHaveBeenCalledWith('TODOIST', 'sync failed:', expect.objectContaining({ httpStatusCode: 401 }));
		expect(vault.writes).toEqual([]);
	});

	it('reports a root project that is gone from Todoist', async () => {
		settingsStore.updateTodoist({ syncRootProjectId: 'gone' });

		const outcome = await syncNow();

		expect(outcome).toEqual({ ok: false, message: 'The sync root project was not found in Todoist. Choose it again in Settings > Todoist.' });
		expect(vault.writes).toEqual([]);
	});
});

describe('syncNowFromUi', () => {
	it('shows the result in a success toast', async () => {
		await syncNowFromUi();
		expect(toast.success).toHaveBeenCalledWith('Todoist sync done: 3 notes created, 3 tasks added.');
	});

	it('shows a refused sync folder in an error toast', async () => {
		settingsStore.updateTodoist({ syncFolder: '../x' });
		await syncNowFromUi();
		expect(toast.error).toHaveBeenCalledWith('The Todoist sync folder must be a folder inside the vault. Fix it in Settings > Todoist.');
		expect(toast.success).not.toHaveBeenCalled();
	});
});
