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
import { error } from '#lib/utils/debug.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { resetEditor } from '#lib/core/editor/editor.service.js';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { todoistSyncStore } from '#lib/features/todoist-sync/todoist-sync.store.svelte.js';
import { syncNow } from '#lib/features/todoist-sync/sync-now.service.js';

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
	vi.mocked(readTextFile).mockImplementation(async (path) => {
		const content = vault.files.get(String(path).slice(vault.root.length + 1));
		if (content === undefined) throw new Error(`No such file: ${String(path)}`);
		return content;
	});
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

		expect(outcome).toEqual({
			ok: false,
			message: 'The vault changed during the Todoist sync; nothing more was written.',
			failure: { kind: 'vault-switched' },
		});
		expect(first.writes).toEqual([]);
		expect(second.writes).toEqual([]);
		expect(first.commits).toEqual([]);
		expect(second.commits).toEqual([]);
		// The store is left to the vault teardown, which resets it.
		expect(todoistSyncStore.status).toBe('syncing');
		expect(todoistSyncStore.lastError).toBeNull();
	});

	it('leaves the store reset by the vault teardown alone when the old run stops', async () => {
		todoistSyncStore.succeed({ kind: 'pull', mode: 'normal', notesCreated: 0, tasksInserted: 0, linksPaired: 0, linesUnmatched: 0, linesUpdated: 0, todoistUpdated: 0, finishedAt: 1 });
		fake.current = {
			async fetch(url, init) {
				const response = await server.fetch(url, init);
				openVault(createFakeVault('/other-vault'));
				todoistSyncStore.reset();
				return response;
			},
		};

		await syncNow();

		expect(todoistSyncStore.status).toBe('idle');
		expect(todoistSyncStore.lastError).toBeNull();
		expect(todoistSyncStore.lastSyncedAt).toBeNull();
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

		expect(outcome).toMatchObject({ ok: false, message: 'The vault changed during the Todoist sync; nothing more was written.' });
		expect(first.writes).toEqual(['Todoist/Work.md']);
		expect(second.writes).toEqual([]);
		expect(first.commits).toEqual([]);
		expect(second.commits).toEqual([]);
	});

	it('maps a Todoist failure to its fixed message and logs the raw error', async () => {
		server.failNext({ kind: 'unauthorized' });

		const outcome = await syncNow();

		expect(outcome).toEqual({
			ok: false,
			message: 'Todoist rejected the API token. Check it in Settings > Todoist.',
			failure: { kind: 'invalid-token' },
		});
		expect(vi.mocked(error)).toHaveBeenCalledWith('TODOIST', 'sync failed:', expect.objectContaining({ httpStatusCode: 401 }));
		expect(vault.writes).toEqual([]);
	});

	it('reports a 429 with its retry_after, and an unreachable server, as failure kinds', async () => {
		server.failNext({ kind: 'rate-limit', retryAfter: 42 });
		expect((await syncNow()).failure).toEqual({ kind: 'rate-limit', retryAfter: 42 });

		server.failNext({ kind: 'server-error' });
		expect((await syncNow()).failure).toEqual({ kind: 'unreachable' });
	});

	it('reports an unexpected error as the generic failure kind', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd, args) => {
			if (cmd === 'todoist_read_links') throw new Error('db locked');
			return vault.invoke(cmd, args as Record<string, unknown> | undefined);
		});

		expect(await syncNow()).toEqual({ ok: false, message: 'Todoist sync failed. Details are in the log.', failure: { kind: 'error' } });
	});

	it('gives a refusal no failure kind', async () => {
		settingsStore.updateTodoist({ syncEnabled: false });

		expect((await syncNow()).failure).toBeUndefined();
	});

	it('reports a root project that is gone from Todoist', async () => {
		settingsStore.updateTodoist({ syncRootProjectId: 'gone' });

		const outcome = await syncNow();

		expect(outcome).toEqual({
			ok: false,
			message: 'The sync root project was not found in Todoist. Choose it again in Settings > Todoist.',
			failure: { kind: 'root-missing' },
		});
		expect(vault.writes).toEqual([]);
	});
});

/** Replaces `from` with `to` in a vault note, as an edit in the brain. */
function edit(relPath: string, from: string, to: string) {
	const content = vault.files.get(relPath)!;
	expect(content).toContain(from);
	vault.files.set(relPath, content.replace(from, to));
}

const W1_OPEN = '- [ ] Plan 🔺 #deep 🆔 td-w1';
const W1_DONE = '- [x] Plan 🔺 #deep 🆔 td-w1';
const W2_OPEN = '- [ ] Report 📅 2026-11-13 🔁 every week 🆔 td-w2';
const W2_DONE = '- [x] Report 📅 2026-11-13 🔁 every week 🆔 td-w2';
const WEEKLY = { is_recurring: true, string: 'every week', date: '2026-11-13', lang: 'en' };

const commandRequests = () => server.requests.filter((r) => r.commands);
const localBase = (anchor: string) => JSON.parse(vault.links.get(anchor)!.localBase!);
const remoteBase = (anchor: string) => JSON.parse(vault.links.get(anchor)!.remoteBase!);

describe('syncNow: completion from the brain', () => {
	it('closes a task checked in the brain with item_close, sent alone after the pulls, and moves the bases on the ack', async () => {
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		const before = server.requests.length;

		const outcome = await syncNow();

		expect(outcome).toEqual({ ok: true, message: 'Todoist sync done: 1 task updated in Todoist.' });
		expect(server.item('w1')).toMatchObject({ checked: true });
		const sent = server.requests.slice(before);
		expect(sent.map((r) => (r.commands ? 'commands' : r.sync_token === '*' ? 'full' : 'incremental'))).toEqual(['full', 'incremental', 'commands', 'incremental']);
		const [cmd] = sent[2].commands!;
		expect(cmd).toMatchObject({ type: 'item_close', args: { id: 'w1' } });
		expect(sent[2].sync_token).toBeUndefined();
		// The uuid was stored before the request went out, and cleared after the ack.
		expect(JSON.parse(vault.commits[1].upsertLinks.find((l) => l.anchor === 'td-w1')!.pendingCmd!)).toEqual({ uuid: cmd.uuid, type: 'item_close' });
		expect(vault.links.get('td-w1')!.pendingCmd).toBeNull();
		expect(localBase('td-w1').status).toBe('x');
		expect(remoteBase('td-w1').checked).toBe(true);
		expect(vault.files.get('Todoist/Work.md')).toContain(W1_DONE);
	});

	it('sends nothing on the next run once the close is acknowledged', async () => {
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		await syncNow();
		const files = new Map(vault.files);

		const outcome = await syncNow();

		expect(outcome.message).toBe('Todoist sync done: nothing new.');
		expect(commandRequests()).toHaveLength(1);
		expect(vault.files).toEqual(files);
	});

	it('reopens a task unchecked in the brain with item_uncomplete', async () => {
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		await syncNow();
		edit('Todoist/Work.md', W1_DONE, W1_OPEN);

		await syncNow();

		expect(commandRequests().at(-1)!.commands).toEqual([expect.objectContaining({ type: 'item_uncomplete', args: { id: 'w1' } })]);
		expect(server.item('w1')).toMatchObject({ checked: false });
		expect(remoteBase('td-w1').checked).toBe(false);
		expect(localBase('td-w1').status).toBe(' ');
	});

	it('treats [-] as closed and [/] as open', async () => {
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, '- [/] Plan 🔺 #deep 🆔 td-w1');
		await syncNow();
		expect(commandRequests()).toEqual([]);

		edit('Todoist/Work.md', '- [/] Plan', '- [-] Plan');
		await syncNow();
		expect(server.item('w1')).toMatchObject({ checked: true });
		expect(vault.files.get('Todoist/Work.md')).toContain('- [-] Plan 🔺 #deep 🆔 td-w1');
	});

	it('rolls a recurring task closed in the brain: the line reopens with the next 📅', async () => {
		await syncNow();
		edit('Todoist/Work.md', W2_OPEN, W2_DONE);

		const outcome = await syncNow();

		expect(commandRequests()[0].commands).toEqual([expect.objectContaining({ type: 'item_close', args: { id: 'w2' } })]);
		expect(server.item('w2')).toMatchObject({ checked: false, due: { date: '2026-11-20' } });
		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Report 📅 2026-11-20 🔁 every week 🆔 td-w2');
		expect(localBase('td-w2')).toMatchObject({ status: ' ', dueDate: '2026-11-20' });
		expect(remoteBase('td-w2').due).toMatchObject({ date: '2026-11-20', string: 'every week' });
		expect(outcome.message).toBe('Todoist sync done: 1 line updated, 1 task updated in Todoist.');

		await syncNow();
		expect(commandRequests()).toHaveLength(1);
	});

	it('rewrites a recurring line through its open tab after the ack', async () => {
		await syncNow();
		const path = '/work-vault/Todoist/Work.md';
		const unsaved = WORK_NOTE.replace(W2_OPEN, W2_DONE);
		editorStore.addTab({ path, name: 'Work.md', content: unsaved, savedContent: WORK_NOTE });

		await syncNow();

		expect(server.item('w2')).toMatchObject({ checked: false, due: { date: '2026-11-20' } });
		expect(editorStore.tabs[0].content).toContain('- [ ] Report 📅 2026-11-20 🔁 every week 🆔 td-w2');
		expect(vault.files.get('Todoist/Work.md')).toBe(WORK_NOTE);
	});

	it('logs a recurring task that a close completed for good (a starting <date> rule)', async () => {
		server.updateItem('w2', { due: { ...WEEKLY, string: 'every week starting 13 Nov 2026' } });
		await syncNow();
		edit('Todoist/Work.md', '- [ ] Report', '- [x] Report');

		await syncNow();

		expect(server.item('w2')).toMatchObject({ checked: true, due: null });
		expect(vault.files.get('Todoist/Work.md')).toContain('- [x] Report 📅 2026-11-13');
		expect(vault.log).toContainEqual(expect.objectContaining({ kind: 'recurring-completed', anchor: 'td-w2' }));
	});
});

describe('syncNow: completion from Todoist', () => {
	it('checks the line of a task completed in Todoist, and unchecks it when reopened there', async () => {
		await syncNow();
		server.updateItem('w1', { checked: true, completed_at: '2026-11-09T10:00:00Z' });

		expect((await syncNow()).message).toBe('Todoist sync done: 1 line updated.');
		expect(vault.files.get('Todoist/Work.md')).toContain(W1_DONE);
		expect(localBase('td-w1').status).toBe('x');
		expect(commandRequests()).toEqual([]);

		server.updateItem('w1', { checked: false, completed_at: null });
		await syncNow();
		expect(vault.files.get('Todoist/Work.md')).toContain(W1_OPEN);
		expect(commandRequests()).toEqual([]);
	});

	it('keeps an open status other than a space when Todoist reopens, and - when it closes', async () => {
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, '- [/] Plan 🔺 #deep 🆔 td-w1');
		await syncNow();
		server.updateItem('w1', { checked: true });
		await syncNow();
		expect(vault.files.get('Todoist/Work.md')).toContain(W1_DONE);

		edit('Todoist/Work.md', W1_DONE, '- [-] Plan 🔺 #deep 🆔 td-w1');
		await syncNow();
		expect(commandRequests()).toEqual([]);
		server.updateItem('w1', { checked: false });
		await syncNow();
		expect(vault.files.get('Todoist/Work.md')).toContain(W1_OPEN);
	});

	it('moves the 📅 of a recurring task Todoist rolled forward, leaving the line open', async () => {
		await syncNow();
		server.updateItem('w2', { due: { ...WEEKLY, date: '2026-11-20' } });

		await syncNow();

		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Report 📅 2026-11-20 🔁 every week 🆔 td-w2');
		expect(commandRequests()).toEqual([]);
	});

	it('reaches a line in a closed note and one in an open tab', async () => {
		await syncNow();
		const path = '/work-vault/Todoist/Q4.md';
		editorStore.addTab({ path, name: 'Q4.md', content: vault.files.get('Todoist/Q4.md')!, savedContent: vault.files.get('Todoist/Q4.md')! });
		server.updateItem('w1', { checked: true });
		server.updateItem('q1', { checked: true });

		await syncNow();

		expect(vault.files.get('Todoist/Work.md')).toContain(W1_DONE);
		expect(editorStore.tabs[0].content).toContain('- [x] Ship 🆔 td-q1');
	});
});

describe('syncNow: completion on both sides', () => {
	it('only moves the bases when both sides closed the task', async () => {
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		server.updateItem('w1', { checked: true });

		await syncNow();

		expect(commandRequests()).toEqual([]);
		expect(localBase('td-w1').status).toBe('x');
		expect(remoteBase('td-w1').checked).toBe(true);
	});

	it('drops a brain close when Todoist rolled the recurring task meanwhile: the line takes the new date, logged', async () => {
		await syncNow();
		edit('Todoist/Work.md', W2_OPEN, W2_DONE);
		server.updateItem('w2', { due: { ...WEEKLY, date: '2026-11-20' } });

		await syncNow();

		expect(commandRequests()).toEqual([]);
		expect(server.item('w2')!.due!.date).toBe('2026-11-20');
		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Report 📅 2026-11-20 🔁 every week 🆔 td-w2');
		expect(vault.log).toContainEqual(expect.objectContaining({ kind: 'close-dropped', anchor: 'td-w2' }));
	});

	it('closes a non-recurring task rescheduled in Todoist and checked in the brain; the line keeps [x]', async () => {
		server.updateItem('w1', { due: { is_recurring: false, string: 'Nov 13', date: '2026-11-13', lang: 'en' } });
		await syncNow();
		const open = '- [ ] Plan 🔺 📅 2026-11-13 #deep 🆔 td-w1';
		edit('Todoist/Work.md', open, open.replace('[ ]', '[x]'));
		server.updateItem('w1', { due: { is_recurring: false, string: 'Nov 20', date: '2026-11-20', lang: 'en' } });

		await syncNow();

		expect(commandRequests()[0].commands).toEqual([expect.objectContaining({ type: 'item_close', args: { id: 'w1' } })]);
		expect(server.item('w1')).toMatchObject({ checked: true });
		expect(vault.files.get('Todoist/Work.md')).toContain('- [x] Plan 🔺');
		expect(vault.log).not.toContainEqual(expect.objectContaining({ kind: 'close-dropped' }));
	});
});

describe('syncNow: edits from Todoist', () => {
	it('writes a content change into the description and keeps the rest of the line', async () => {
		await syncNow();
		server.updateItem('w1', { content: 'Plan the launch' });

		const outcome = await syncNow();

		expect(outcome.message).toBe('Todoist sync done: 1 line updated.');
		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Plan the launch 🔺 #deep 🆔 td-w1');
		expect(localBase('td-w1').description).toBe('Plan the launch');
		expect(remoteBase('td-w1').content).toBe('Plan the launch');
		expect(commandRequests()).toEqual([]);
	});

	it('writes due, priority and label changes as token patches', async () => {
		await syncNow();
		server.updateItem('w1', { priority: 2, labels: ['next', 'Work'], due: { is_recurring: false, string: 'Nov 20', date: '2026-11-20', lang: 'en' } });

		await syncNow();

		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Plan 🔼 📅 2026-11-20 #next 🆔 td-w1');
		expect(localBase('td-w1')).toMatchObject({ priority: 'medium', dueDate: '2026-11-20', tags: ['next'] });
		expect(remoteBase('td-w1')).toMatchObject({ priority: 2, labels: ['next', 'Work'], unmappedLabels: ['Work'], due: { date: '2026-11-20' } });
	});

	it('writes nothing on a second cycle with no change', async () => {
		await syncNow();
		server.updateItem('w1', { content: 'Plan more', priority: 3, labels: ['Work'], due: { is_recurring: false, string: 'Nov 20', date: '2026-11-20', lang: 'en' } });
		await syncNow();
		const writes = vault.writes.length;
		const files = new Map(vault.files);

		const outcome = await syncNow();

		expect(outcome.message).toBe('Todoist sync done: nothing new.');
		expect(vault.writes).toHaveLength(writes);
		expect(vault.files).toEqual(files);
	});

	it('writes nothing to the line when the webhook only adds Work', async () => {
		await syncNow();
		const writes = vault.writes.length;
		server.updateItem('q1', { labels: ['Work'] });

		await syncNow();

		expect(vault.writes).toHaveLength(writes);
		expect(vault.files.get('Todoist/Q4.md')).toContain('- [ ] Ship 🆔 td-q1');
		expect(remoteBase('td-q1')).toMatchObject({ labels: ['Work'], unmappedLabels: ['Work'] });
	});

	it('keeps a leading #todoist when the content changes', async () => {
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, '- [ ] #todoist Plan 🔺 #deep 🆔 td-w1');
		server.updateItem('w1', { content: 'Plan more' });

		await syncNow();

		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] #todoist Plan more 🔺 #deep 🆔 td-w1');
	});

	it('leaves a line with a tag inside its text alone, and logs the Todoist text', async () => {
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, '- [ ] Plan #deep it 🔺 🆔 td-w1');
		await syncNow();
		server.updateItem('w1', { content: 'Plan it all' });

		await syncNow();

		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Plan #deep it 🔺 🆔 td-w1');
		expect(vault.log).toContainEqual(expect.objectContaining({ kind: 'description-conflict', anchor: 'td-w1', message: expect.stringContaining('Plan it all') }));
	});

	it('does not write content that fails the round trip, and logs it', async () => {
		await syncNow();
		server.updateItem('w1', { content: 'Fix #42' });

		await syncNow();

		expect(vault.files.get('Todoist/Work.md')).toContain(W1_OPEN);
		expect(vault.log).toContainEqual(expect.objectContaining({ kind: 'content-roundtrip', anchor: 'td-w1' }));
	});

	it('never rewrites the 🔁 text of a recurring task when Todoist changes its rule', async () => {
		await syncNow();
		server.updateItem('w2', { due: { ...WEEKLY, string: 'every 2 weeks', date: '2026-11-27' } });

		await syncNow();

		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Report 📅 2026-11-27 🔁 every week 🆔 td-w2');
		expect(remoteBase('td-w2').due).toMatchObject({ string: 'every 2 weeks' });
	});

	it('writes a content change and a completion of the same task as one patch', async () => {
		await syncNow();
		server.updateItem('w1', { content: 'Planned', checked: true });

		await syncNow();

		expect(vault.files.get('Todoist/Work.md')).toContain('- [x] Planned 🔺 #deep 🆔 td-w1');
		expect(localBase('td-w1')).toMatchObject({ status: 'x', description: 'Planned' });
	});
});

const W1_EDITED = '- [ ] Plan the launch ⏫ 📅 2026-11-20 #next 🆔 td-w1';

describe('syncNow: edits from the brain', () => {
	it('pushes text, 📅, priority and tag edits as one item_update; the echo next cycle sends and writes nothing', async () => {
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, W1_EDITED);

		const outcome = await syncNow();

		expect(outcome.message).toBe('Todoist sync done: 1 task updated in Todoist.');
		expect(commandRequests()).toHaveLength(1);
		expect(commandRequests()[0].commands).toEqual([
			expect.objectContaining({ type: 'item_update', args: { id: 'w1', content: 'Plan the launch', priority: 3, due: { date: '2026-11-20' }, labels: ['Work', 'next'] } }),
		]);
		expect(server.item('w1')).toMatchObject({ content: 'Plan the launch', priority: 3, labels: ['Work', 'next'], due: { date: '2026-11-20', is_recurring: false } });
		expect(localBase('td-w1')).toMatchObject({ description: 'Plan the launch', priority: 'high', dueDate: '2026-11-20', tags: ['next'] });
		expect(remoteBase('td-w1')).toMatchObject({ content: 'Plan the launch', priority: 3, labels: ['Work', 'next'], unmappedLabels: ['Work'] });
		const files = new Map(vault.files);
		const writes = vault.writes.length;

		expect((await syncNow()).message).toBe('Todoist sync done: nothing new.');
		expect(commandRequests()).toHaveLength(1);
		expect(vault.files).toEqual(files);
		expect(vault.writes).toHaveLength(writes);
		expect(vault.log).toEqual([]);
	});

	it('moves the date of a recurring task and keeps its rule in Todoist', async () => {
		await syncNow();
		edit('Todoist/Work.md', W2_OPEN, '- [ ] Report 📅 2026-11-16 🔁 every week 🆔 td-w2');

		await syncNow();

		expect(commandRequests()[0].commands![0].args).toEqual({ id: 'w2', due: { date: '2026-11-16', string: 'every week', lang: 'en' } });
		expect(server.item('w2')!.due).toMatchObject({ date: '2026-11-16', string: 'every week', is_recurring: true });
		await syncNow();
		expect(commandRequests()).toHaveLength(1);
	});

	it('lets Todoist win a field changed on both sides: the line takes the Todoist value, the brain value is logged', async () => {
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, '- [ ] Plan ⏫ #deep 🆔 td-w1');
		server.updateItem('w1', { priority: 2 });

		await syncNow();
		await syncNow();

		expect(commandRequests()).toEqual([]);
		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Plan 🔼 #deep 🆔 td-w1');
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'conflict', anchor: 'td-w1', message: expect.stringContaining('"high"') })]);
	});

	it('does not send text over 500 characters, and logs it once', async () => {
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, `- [ ] ${'x'.repeat(501)} 🔺 #deep 🆔 td-w1`);

		await syncNow();
		await syncNow();

		expect(commandRequests()).toEqual([]);
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'content-not-pushed', anchor: 'td-w1' })]);
	});

	it('never pushes a line inserted from content that failed the round trip', async () => {
		server.addItem({ id: 'h1', project_id: 'work', content: 'Fix #12', child_order: 3 });
		await syncNow();
		edit('Todoist/Work.md', '- [ ] Fix #12 🆔 td-h1', '- [ ] Fix #12 ⏫ 🆔 td-h1');

		await syncNow();

		expect(commandRequests()).toEqual([]);
		expect(server.item('h1')!.priority).toBe(1);
	});

	it('treats a refused item_update as terminal: logged, the line kept, not retried', async () => {
		await syncNow();
		server.refuseCommandsFor('w1');
		edit('Todoist/Work.md', W1_OPEN, '- [ ] Plan ⏫ #deep 🆔 td-w1');

		expect((await syncNow()).ok).toBe(true);

		expect(vault.log).toContainEqual(expect.objectContaining({ kind: 'command-error', anchor: 'td-w1', message: expect.stringContaining('item_update') }));
		expect(localBase('td-w1').priority).toBe('high');
		expect(remoteBase('td-w1').priority).toBe(4);
		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Plan ⏫ #deep 🆔 td-w1');
		await syncNow();
		expect(commandRequests()).toHaveLength(1);
	});

	it('keeps the bases when the push does not reach Todoist, and sends it again next cycle', async () => {
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, '- [ ] Plan ⏫ #deep 🆔 td-w1');
		let offline = true;
		fake.current = {
			fetch(url, init) {
				if (offline && String(init?.body).includes('"commands"')) return Promise.reject(new TypeError('Network request failed'));
				return server.fetch(url, init);
			},
		};

		expect((await syncNow()).ok).toBe(false);
		expect(localBase('td-w1').priority).toBe('highest');

		offline = false;
		await syncNow();

		expect(server.item('w1')!.priority).toBe(3);
		expect(localBase('td-w1').priority).toBe('high');
	});

	it('sends no push for a line whose Todoist patch went stale, and keeps the token', async () => {
		await syncNow();
		const token = vault.kv.get('sync_token');
		edit('Todoist/Work.md', W1_OPEN, '- [ ] Plan more 🔺 #deep 🆔 td-w1');
		server.updateItem('w1', { priority: 3 });
		vi.mocked(invoke).mockImplementation(async (cmd, args) => {
			const out = await vault.invoke(cmd, args as Record<string, unknown> | undefined);
			// Typed after the scan, before the write.
			if (cmd === 'get_all_tasks_v2') edit('Todoist/Work.md', 'Plan more', 'Plan more now');
			return out;
		});

		await syncNow();

		expect(commandRequests()).toEqual([]);
		expect(vault.kv.get('sync_token')).toBe(token);
		expect(localBase('td-w1').description).toBe('Plan');
	});

	it('withholds the sync token when a refused close hides a Todoist edit of the same task, so the next cycle still writes it', async () => {
		await syncNow();
		const token = vault.kv.get('sync_token');
		server.refuseCommandsFor('w1');
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		server.updateItem('w1', { content: 'Plan more' });

		await syncNow();

		expect(vault.log).toContainEqual(expect.objectContaining({ kind: 'command-error', anchor: 'td-w1' }));
		expect(vault.kv.get('sync_token')).toBe(token);

		await syncNow();

		expect(vault.files.get('Todoist/Work.md')).toContain('- [x] Plan more 🔺 #deep 🆔 td-w1');
		expect(vault.kv.get('sync_token')).not.toBe(token);
	});
});

describe('syncNow: field push cap', () => {
	/** Adds `n` open tasks to Work, syncs them in, and gives each one a priority in the brain. */
	async function editMany(n: number) {
		for (let i = 1; i <= n; i++) server.addItem({ id: `e${i}`, project_id: 'work', content: `Chore ${i}`, child_order: 10 + i });
		await syncNow();
		vault.files.set('Todoist/Work.md', vault.files.get('Todoist/Work.md')!.replace(/- \[ \] Chore \d+/gu, '$& ⏫'));
	}

	it('asks before more than 50 field pushes; Cancel changes nothing', async () => {
		await editMany(51);
		vi.mocked(ask).mockResolvedValue(false);
		const files = new Map(vault.files);
		const commits = vault.commits.length;

		const outcome = await syncNow();

		expect(vi.mocked(ask)).toHaveBeenCalledWith(expect.stringContaining('51 tasks'), expect.objectContaining({ title: 'Todoist sync' }));
		expect(outcome).toEqual({ ok: false, message: 'Todoist sync cancelled; nothing was changed.', failure: { kind: 'error' } });
		expect(commandRequests()).toEqual([]);
		expect(vault.files).toEqual(files);
		expect(vault.commits).toHaveLength(commits);
	});

	it('runs uncapped on Sync, at most 100 commands per request', async () => {
		await editMany(101);
		vi.mocked(ask).mockResolvedValue(true);

		await syncNow();

		expect(commandRequests().map((r) => r.commands!.length)).toEqual([100, 1]);
		expect(server.item('e101')!.priority).toBe(3);
	});

	it('does not ask at 50', async () => {
		await editMany(50);

		await syncNow();

		expect(vi.mocked(ask)).not.toHaveBeenCalled();
		expect(commandRequests()[0].commands).toHaveLength(50);
	});

	it('never asks in an automatic cycle: it skips the field pushes and runs the rest', async () => {
		await editMany(51);
		server.updateItem('w1', { checked: true });

		const outcome = await syncNow('auto');

		expect(vi.mocked(ask)).not.toHaveBeenCalled();
		expect(outcome).toEqual({ ok: true, message: 'Todoist sync done: 1 line updated.', skippedFieldPushes: 51 });
		expect(commandRequests()).toEqual([]);
		expect(localBase('td-e1').priority).toBeNull();
		expect(vault.files.get('Todoist/Work.md')).toContain(W1_DONE);

		vi.mocked(ask).mockResolvedValue(true);
		expect(await syncNow()).not.toHaveProperty('skippedFieldPushes');
		expect(commandRequests().map((r) => r.commands!.length)).toEqual([51]);
		expect(server.item('e1')!.priority).toBe(3);
	});
});

describe('syncNow: completion commands', () => {
	it('keeps the pending uuid when the command request fails, and resends the same uuid next run', async () => {
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		let offline = true;
		fake.current = {
			fetch(url, init) {
				if (offline && String(init?.body).includes('"commands"')) return Promise.reject(new TypeError('Network request failed'));
				return server.fetch(url, init);
			},
		};

		const failed = await syncNow();

		expect(failed).toEqual({ ok: false, message: 'Could not reach Todoist. Check your connection and try again.', failure: { kind: 'unreachable' } });
		const pending = JSON.parse(vault.links.get('td-w1')!.pendingCmd!);
		expect(pending.type).toBe('item_close');
		expect(server.item('w1')!.checked).toBe(false);

		offline = false;
		await syncNow();

		expect(server.requests.filter((r) => r.commands).map((r) => r.commands![0].uuid)).toEqual([pending.uuid]);
		expect(server.item('w1')!.checked).toBe(true);
		expect(vault.links.get('td-w1')!.pendingCmd).toBeNull();
	});

	it('treats a 400 sync_status as terminal: pending cleared, logged, not retried', async () => {
		await syncNow();
		server.refuseCommandsFor('w1');
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);

		const outcome = await syncNow();

		expect(outcome.ok).toBe(true);
		expect(vault.links.get('td-w1')!.pendingCmd).toBeNull();
		expect(vault.log).toContainEqual(expect.objectContaining({ kind: 'command-error', anchor: 'td-w1' }));
		expect(localBase('td-w1').status).toBe('x');

		await syncNow();
		expect(commandRequests()).toHaveLength(1);
	});

	it('fills a null local base from the line on the first run after a rebuild, then pushes the next change', async () => {
		await syncNow();
		vault.links.clear();
		await syncNow();
		expect(vault.links.get('td-w1')!.localBase).toBeNull();

		await syncNow();
		expect(localBase('td-w1')).toMatchObject({ status: ' ', description: 'Plan' });
		expect(commandRequests()).toEqual([]);

		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		await syncNow();
		expect(server.item('w1')!.checked).toBe(true);
	});

	it('does not push for a duplicated anchor', async () => {
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, `${W1_DONE}\n${W1_DONE}`);

		await syncNow();

		expect(commandRequests()).toEqual([]);
		expect(vault.links.get('td-w1')!.frozen).toBe(true);
	});

	it('writes no Todoist edit into a duplicated anchor and keeps its bases', async () => {
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, `${W1_OPEN}\n${W1_OPEN}`);
		server.updateItem('w1', { content: 'Plan the launch', priority: 1 });
		const files = new Map(vault.files);

		await syncNow();

		expect(vault.files).toEqual(files);
		expect(vault.links.get('td-w1')!.frozen).toBe(true);
		expect(remoteBase('td-w1')).toMatchObject({ content: 'Plan', priority: 4 });
	});
});

describe('syncNow: close/reopen cap', () => {
	/** Adds `n` open tasks to Work, syncs them in, and checks every one in the brain. */
	async function checkMany(n: number) {
		for (let i = 1; i <= n; i++) server.addItem({ id: `c${i}`, project_id: 'work', content: `Chore ${i}`, child_order: 10 + i });
		await syncNow();
		vault.files.set('Todoist/Work.md', vault.files.get('Todoist/Work.md')!.replace(/- \[ \] Chore/gu, '- [x] Chore'));
	}

	it('asks before more than 25 close/reopen pushes; Cancel changes nothing', async () => {
		await checkMany(26);
		vi.mocked(ask).mockResolvedValue(false);
		const files = new Map(vault.files);
		const commits = vault.commits.length;

		const outcome = await syncNow();

		expect(vi.mocked(ask)).toHaveBeenCalledWith(expect.stringContaining('26 tasks'), expect.objectContaining({ title: 'Todoist sync' }));
		expect(outcome).toEqual({ ok: false, message: 'Todoist sync cancelled; nothing was changed.', failure: { kind: 'error' } });
		expect(commandRequests()).toEqual([]);
		expect(vault.files).toEqual(files);
		expect(vault.commits).toHaveLength(commits);
	});

	it('runs uncapped on Sync, at most 100 commands per request', async () => {
		await checkMany(101);
		vi.mocked(ask).mockResolvedValue(true);

		await syncNow();

		expect(commandRequests().map((r) => r.commands!.length)).toEqual([100, 1]);
		expect(server.item('c101')!.checked).toBe(true);
	});

	it('does not ask at 25', async () => {
		await checkMany(25);

		await syncNow();

		expect(vi.mocked(ask)).not.toHaveBeenCalled();
		expect(commandRequests()[0].commands).toHaveLength(25);
	});

	it('never asks in an automatic cycle: it skips the close/reopen pushes and runs the rest', async () => {
		await checkMany(26);
		server.updateItem('w1', { checked: true });

		const outcome = await syncNow('auto');

		expect(vi.mocked(ask)).not.toHaveBeenCalled();
		expect(outcome).toEqual({ ok: true, message: 'Todoist sync done: 1 line updated.', skippedPushes: 26 });
		expect(commandRequests()).toEqual([]);
		expect(server.item('c1')!.checked).toBe(false);
		expect(vault.links.get('td-c1')!.pendingCmd).toBeNull();
		expect(localBase('td-c1').status).toBe(' ');
		expect(vault.files.get('Todoist/Work.md')).toContain(W1_DONE);
		expect(vault.files.get('Todoist/Work.md')).toContain('- [x] Chore 1 🆔 td-c1');
		expect(todoistSyncStore.status).toBe('idle');

		vi.mocked(ask).mockResolvedValue(true);
		expect(await syncNow()).not.toHaveProperty('skippedPushes');
		expect(commandRequests().map((r) => r.commands!.length)).toEqual([26]);
		expect(server.item('c1')!.checked).toBe(true);
	});

	it('keeps a skipped close when an automatic cycle writes a Todoist edit of that task: the next run still pushes it', async () => {
		await checkMany(26);
		server.updateItem('c1', { content: 'Chore one', priority: 4 });

		const outcome = await syncNow('auto');

		expect(outcome).toMatchObject({ ok: true, skippedPushes: 26 });
		expect(commandRequests()).toEqual([]);
		expect(vault.files.get('Todoist/Work.md')).toContain('- [x] Chore one 🔺 🆔 td-c1');
		expect(localBase('td-c1')).toMatchObject({ status: ' ', description: 'Chore one', priority: 'highest' });
		expect(remoteBase('td-c1')).toMatchObject({ checked: false, content: 'Chore one', priority: 4 });
		expect(vault.links.get('td-c1')!.pendingCmd).toBeNull();

		vi.mocked(ask).mockResolvedValue(true);
		await syncNow();

		expect(commandRequests().map((r) => r.commands!.length)).toEqual([26]);
		expect(commandRequests()[0].commands).toContainEqual(expect.objectContaining({ type: 'item_close', args: { id: 'c1' } }));
		expect(server.item('c1')).toMatchObject({ checked: true, content: 'Chore one' });
		expect(localBase('td-c1').status).toBe('x');
		expect(vault.files.get('Todoist/Work.md')).toContain('- [x] Chore one 🔺 🆔 td-c1');
	});

	it('does not skip at 25 in an automatic cycle', async () => {
		await checkMany(25);

		const outcome = await syncNow('auto');

		expect(outcome).not.toHaveProperty('skippedPushes');
		expect(commandRequests()[0].commands).toHaveLength(25);
	});
});

const missCount = (anchor: string) => vault.links.get(anchor)!.missCount;
const detachLog = (anchor: string) => vault.log.filter((e) => e.kind === 'detach' && e.anchor === anchor);
/** Deletes the w1 line from the Work note, as an edit in the brain. */
const removeW1 = () => edit('Todoist/Work.md', `${W1_OPEN}\n`, '');

describe('syncNow: a task deleted in Todoist', () => {
	it('detaches the link: the line keeps its text and anchor, logged once', async () => {
		await syncNow();
		server.updateItem('w1', { is_deleted: true });
		const files = new Map(vault.files);

		const outcome = await syncNow();

		expect(outcome).toEqual({ ok: true, message: 'Todoist sync done: nothing new.' });
		expect(vault.files).toEqual(files);
		expect(vault.links.get('td-w1')).toMatchObject({ todoistId: 'w1', missCount: 3, pendingCmd: null });
		expect(detachLog('td-w1')).toEqual([expect.objectContaining({ message: expect.stringContaining('deleted in Todoist') })]);
	});

	it('never syncs the detached line again: no command, no create, no second log', async () => {
		await syncNow();
		server.updateItem('w1', { is_deleted: true });
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);

		await syncNow();
		await syncNow();

		expect(commandRequests()).toEqual([]);
		expect(server.item('w1')).toMatchObject({ is_deleted: true, checked: false });
		expect(vault.files.get('Todoist/Work.md')).toContain(W1_DONE);
		expect(detachLog('td-w1')).toHaveLength(1);
	});

	it('drops a close checked in the brain while Todoist deleted the task', async () => {
		await syncNow();
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		server.updateItem('w1', { is_deleted: true });

		await syncNow();

		expect(commandRequests()).toEqual([]);
		expect(missCount('td-w1')).toBe(3);
	});

	it('writes no Todoist edit made together with the deletion', async () => {
		await syncNow();
		server.updateItem('w1', { content: 'Plan the launch', priority: 1, is_deleted: true });
		const files = new Map(vault.files);

		await syncNow();

		expect(vault.files).toEqual(files);
		expect(missCount('td-w1')).toBe(3);
		expect(remoteBase('td-w1')).toMatchObject({ content: 'Plan', priority: 4 });
	});
});

describe('syncNow: a task moved out of the vault tree', () => {
	it('detaches a task moved to a project outside the tree, line kept, logged', async () => {
		await syncNow();
		server.updateItem('w1', { project_id: 'personal' });
		const files = new Map(vault.files);

		await syncNow();

		expect(vault.files).toEqual(files);
		expect(missCount('td-w1')).toBe(3);
		expect(detachLog('td-w1')).toEqual([expect.objectContaining({ message: expect.stringContaining('outside') })]);
	});

	it('detaches a task moved to the Inbox when the vault does not include it', async () => {
		await syncNow();
		server.updateItem('w1', { project_id: 'inbox' });

		await syncNow();

		expect(missCount('td-w1')).toBe(3);
		expect(detachLog('td-w1')).toHaveLength(1);
	});

	it('keeps a task moved to the Inbox when the vault includes it, or within the tree', async () => {
		settingsStore.updateTodoist({ syncIncludeInbox: true });
		await syncNow();
		server.updateItem('w1', { project_id: 'inbox' });
		server.updateItem('w2', { project_id: 'q4' });

		await syncNow();

		expect(missCount('td-w1')).toBe(0);
		expect(missCount('td-w2')).toBe(0);
		expect(vault.log.filter((e) => e.kind === 'detach')).toEqual([]);
	});

	it('never patches a detached line, even when its task moves back into the tree and is edited there', async () => {
		await syncNow();
		server.updateItem('w1', { project_id: 'personal' });
		await syncNow();
		const detached = vault.links.get('td-w1')!;
		server.updateItem('w1', { project_id: 'work', content: 'Plan the launch', priority: 1, labels: ['next'] });
		const files = new Map(vault.files);

		await syncNow();

		expect(vault.files).toEqual(files);
		expect(vault.links.get('td-w1')).toEqual(detached);
		expect(commandRequests()).toEqual([]);
	});
});

describe('syncNow: a synced line deleted in the vault', () => {
	it('detaches after 3 cycles in a row without the line; the Todoist task stays open and is not inserted again', async () => {
		await syncNow();
		removeW1();

		await syncNow();
		expect(missCount('td-w1')).toBe(1);
		await syncNow();
		expect(missCount('td-w1')).toBe(2);
		expect(detachLog('td-w1')).toEqual([]);
		await syncNow();

		expect(missCount('td-w1')).toBe(3);
		expect(detachLog('td-w1')).toEqual([expect.objectContaining({ message: expect.stringContaining('not found in the vault') })]);
		expect(server.item('w1')).toMatchObject({ checked: false, is_deleted: false });
		await syncNow();
		expect(vault.files.get('Todoist/Work.md')).not.toContain('td-w1');
		expect(commandRequests()).toEqual([]);
	});

	it('resets the count when the line reappears', async () => {
		await syncNow();
		removeW1();
		await syncNow();
		await syncNow();
		vault.files.set('Todoist/Work.md', WORK_NOTE);

		await syncNow();
		expect(missCount('td-w1')).toBe(0);

		removeW1();
		await syncNow();
		await syncNow();
		expect(missCount('td-w1')).toBe(2);
		expect(detachLog('td-w1')).toEqual([]);
	});

	it('counts no miss in a cycle refused before the index is ready', async () => {
		await syncNow();
		removeW1();
		await syncNow();
		await syncNow();
		vaultStore.resetIndexReady();

		await syncNow();

		expect(missCount('td-w1')).toBe(2);
	});

	it('never counts a task absent from the incremental pulls, or a closed one gone from the full sync, as deleted', async () => {
		await syncNow();
		server.updateItem('w2', { checked: true });
		for (let i = 0; i < 4; i++) await syncNow();

		expect([...vault.links.values()].map((l) => l.missCount)).toEqual([0, 0, 0]);
		expect(vault.log.filter((e) => e.kind === 'detach')).toEqual([]);
	});
});

describe('syncNow: the line brake', () => {
	const BRAKE = 'Todoist sync stopped: fewer than half of the synced task lines were found in the vault. Nothing was changed.';

	it('aborts before any write, detach or push when fewer than half of the synced lines are found', async () => {
		await syncNow();
		vault.files.set('Todoist/Work.md', '---\ntodoist_project: work\n---\n');
		edit('Todoist/Q4.md', '- [ ] Ship', '- [x] Ship');
		server.addItem({ id: 'w3', project_id: 'work', content: 'New' });
		const files = new Map(vault.files);
		const commits = vault.commits.length;
		const logged = vault.log.length;

		const outcome = await syncNow();

		expect(outcome).toEqual({ ok: false, message: BRAKE, failure: { kind: 'lines-missing' } });
		expect(vault.files).toEqual(files);
		expect(vault.commits).toHaveLength(commits);
		expect(vault.log).toHaveLength(logged);
		expect(commandRequests()).toEqual([]);
		expect([...vault.links.values()].map((l) => l.missCount)).toEqual([0, 0, 0]);
		expect(todoistSyncStore.status).toBe('error');
	});

	it('aborts when no synced line is found at all', async () => {
		await syncNow();
		vault.files.clear();

		expect(await syncNow()).toEqual({ ok: false, message: BRAKE, failure: { kind: 'lines-missing' } });
		expect(vault.files.size).toBe(0);
	});

	it('runs at exactly half, counting the misses', async () => {
		server.addItem({ id: 'w3', project_id: 'work', content: 'Extra', child_order: 3 });
		await syncNow();
		edit('Todoist/Work.md', `${W1_OPEN}\n`, '');
		edit('Todoist/Work.md', '- [ ] Extra 🆔 td-w3\n', '');

		expect((await syncNow()).ok).toBe(true);
		expect(missCount('td-w1')).toBe(1);
	});
});

describe('syncNow: detach cap', () => {
	/** Adds `n` open tasks to Work, syncs them in, and deletes every one in Todoist. */
	async function deleteMany(n: number) {
		for (let i = 1; i <= n; i++) server.addItem({ id: `d${i}`, project_id: 'work', content: `Old ${i}`, child_order: 10 + i });
		await syncNow();
		for (let i = 1; i <= n; i++) server.updateItem(`d${i}`, { is_deleted: true });
	}

	it('asks before more than 10 detaches; Cancel changes nothing', async () => {
		await deleteMany(11);
		vi.mocked(ask).mockResolvedValue(false);
		const commits = vault.commits.length;

		const outcome = await syncNow();

		expect(vi.mocked(ask)).toHaveBeenCalledWith(expect.stringContaining('detach 11 tasks'), expect.objectContaining({ title: 'Todoist sync' }));
		expect(outcome).toEqual({ ok: false, message: 'Todoist sync cancelled; nothing was changed.', failure: { kind: 'error' } });
		expect(vault.commits).toHaveLength(commits);
		expect(missCount('td-d1')).toBe(0);
	});

	it('detaches them all on Sync', async () => {
		await deleteMany(11);
		vi.mocked(ask).mockResolvedValue(true);

		await syncNow();

		expect(missCount('td-d1')).toBe(3);
		expect(missCount('td-d11')).toBe(3);
		expect(vault.log.filter((e) => e.kind === 'detach')).toHaveLength(11);
	});

	it('does not ask at 10', async () => {
		await deleteMany(10);

		await syncNow();

		expect(vi.mocked(ask)).not.toHaveBeenCalled();
		expect(missCount('td-d10')).toBe(3);
	});

	it('never asks in an automatic cycle: it skips the detaches and runs the rest', async () => {
		await deleteMany(11);
		server.updateItem('w1', { checked: true });

		const outcome = await syncNow('auto');

		expect(vi.mocked(ask)).not.toHaveBeenCalled();
		expect(outcome).toEqual({ ok: true, message: 'Todoist sync done: 1 line updated.', skippedDetaches: 11 });
		expect(missCount('td-d1')).toBe(0);
		expect(vault.files.get('Todoist/Work.md')).toContain(W1_DONE);
		// Deletions come only from an incremental pull: the token stays where it was, so the next cycle sees them again.
		expect(vault.commits.at(-1)!.kv).toEqual([]);

		vi.mocked(ask).mockResolvedValue(true);
		expect(await syncNow()).not.toHaveProperty('skippedDetaches');
		expect(missCount('td-d1')).toBe(3);
	});
});
