// "Todoist: Sync now" over the real sync service, writers and stores: the
// fake Todoist /sync behind the plugin-http fetch, and an in-memory vault
// behind invoke.
import { describe, it, expect, expectTypeOf, vi, beforeEach, afterEach } from 'vitest';
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
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn(), writeTextFile: vi.fn(), exists: vi.fn(), rename: vi.fn() }));
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
import { exists, readTextFile, rename, writeTextFile } from '@tauri-apps/plugin-fs';
import { debug, error } from '#lib/utils/debug.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { resetEditor } from '#lib/core/editor/editor.service.js';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { todoistSyncStore } from '#lib/features/todoist-sync/todoist-sync.store.svelte.js';
import { parseCycle, type CycleTrigger } from '#lib/features/todoist-sync/cycle-log.logic.js';
import { syncNow, type SyncMode } from '#lib/features/todoist-sync/sync-now.service.js';

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
	const rel = (path: string | URL) => String(path).slice(vault.root.length + 1);
	vi.mocked(writeTextFile).mockImplementation(async (path, data) => {
		vault.files.set(rel(path), String(data));
	});
	vi.mocked(exists).mockImplementation(async (path) => vault.files.has(rel(path)));
	vi.mocked(rename).mockImplementation(async (from, to) => {
		vault.files.set(rel(to), vault.files.get(rel(from))!);
		vault.files.delete(rel(from));
	});
	openVault(createFakeVault('/work-vault'));
	settingsStore.updateTodoist({ apiToken: server.token, syncEnabled: true, syncRootProjectId: 'work' });
});

afterEach(() => {
	resetEditor();
	resetHooks();
	vaultStore.close();
});

describe('syncNow: mode', () => {
	it('takes the mode as a required argument, so no caller runs a manual cycle by default', () => {
		// Checked by `pnpm check`: an optional `mode?` would make the tuple `[mode?: SyncMode, ...]`.
		expectTypeOf(syncNow).parameters.toEqualTypeOf<[mode: SyncMode, trigger?: CycleTrigger]>();
	});
});

describe('syncNow: first run', () => {
	it('creates one note per tree project and writes each open task as an anchored line', async () => {
		const outcome = await syncNow('manual');

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
		await syncNow('manual');

		expect(server.requests).toEqual([{ sync_token: '*', resource_types: ['projects', 'sections', 'items'] }]);
	});

	it('commits the bases of every inserted line and project together with the sync token and first_run_done', async () => {
		await syncNow('manual');

		expect(vault.commits).toHaveLength(1);
		const [commit] = vault.commits;
		expect(commit.kv).toEqual([
			{ key: 'sync_token', value: `v${server.version}` },
			{ key: 'first_run_done', value: '1' },
			{ key: 'projects', value: expect.any(String) },
		]);
		expect(JSON.parse(commit.kv[2].value)).toEqual({
			bases: {
				work: { name: 'Work', relPath: 'Todoist/Work.md' },
				acme: { name: 'Acme', relPath: 'Todoist/Acme.md' },
				q4: { name: 'Q4', relPath: 'Todoist/Q4.md' },
			},
			pending: [],
			refused: [],
		});
		expect(commit.upsertLinks.map((l) => [l.anchor, l.todoistId, l.noteRelPath])).toEqual([
			['td-w1', 'w1', 'Todoist/Work.md'],
			['td-w2', 'w2', 'Todoist/Work.md'],
			['td-q1', 'q1', 'Todoist/Q4.md'],
		]);
		const w1 = commit.upsertLinks[0];
		expect(JSON.parse(w1.localBase!)).toEqual({
			description: 'Plan',
			status: ' ',
			dueDate: null,
			priority: 'highest',
			tags: ['deep'],
			location: { projectId: 'work', sectionId: null },
		});
		expect(JSON.parse(w1.remoteBase!)).toMatchObject({ content: 'Plan', priority: 4, labels: ['deep', 'Work'], unmappedLabels: ['Work'] });
	});

	it('normalizes the sync folder before use', async () => {
		settingsStore.updateTodoist({ syncFolder: '  Areas/Todoist/ ' });

		await syncNow('manual');

		expect([...vault.files.keys()]).toEqual(['Areas/Todoist/Work.md', 'Areas/Todoist/Acme.md', 'Areas/Todoist/Q4.md']);
	});

	it('logs content that does not survive a parse back, and still writes it', async () => {
		server.addItem({ id: 'h1', project_id: 'work', content: 'Fix #12', child_order: 3 });

		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Fix #12 🆔 td-h1');
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'content-roundtrip', anchor: 'td-h1' })]);
		const h1 = vault.links.get('td-h1')!;
		expect(JSON.parse(h1.remoteBase!).contentProblem).toBe('hash');
	});
});

describe('syncNow: tree filter', () => {
	it('gives two vaults on one account only their own tree, and the Inbox only to the vault that includes it', async () => {
		const work = vault;
		await syncNow('manual');

		const personal = createFakeVault('/personal-vault');
		openVault(personal);
		settingsStore.reset();
		settingsStore.updateTodoist({ apiToken: server.token, syncEnabled: true, syncRootProjectId: 'personal', syncIncludeInbox: true });
		await syncNow('manual');

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
		await syncNow('manual');
		const files = new Map(vault.files);
		const writes = vault.writes.length;

		const outcome = await syncNow('manual');

		expect(outcome).toEqual({ ok: true, message: 'Todoist sync done: nothing new.' });
		expect(vault.files).toEqual(files);
		expect(vault.writes).toHaveLength(writes);
		expect(vault.commits[1].upsertLinks).toEqual([]);
	});

	it('finds an existing project note by its frontmatter id after a rename', async () => {
		await syncNow('manual');
		vault.files.set('Areas/My job.md', vault.files.get('Todoist/Work.md')!);
		vault.files.delete('Todoist/Work.md');
		server.addItem({ id: 'w3', project_id: 'work', content: 'Hire', child_order: 3 });

		await syncNow('manual');

		expect(vault.files.has('Todoist/Work.md')).toBe(false);
		expect(vault.files.get('Areas/My job.md')).toBe(`${WORK_NOTE}- [ ] Hire 🆔 td-w3\n`);
	});

	it('reads open-tab content and freezes a link whose anchor was duplicated there', async () => {
		await syncNow('manual');
		const path = '/work-vault/Notes/Day.md';
		const unsaved = '- [ ] Plan 🔺 #deep 🆔 td-w1\n';
		vault.files.set('Notes/Day.md', '');
		editorStore.addTab({ path, name: 'Day.md', content: unsaved, savedContent: '' });

		await syncNow('manual');

		expect(vault.links.get('td-w1')!.frozen).toBe(true);
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'frozen', anchor: 'td-w1' })]);
	});

	it('inserts into a project note open in a tab through the tab, not the disk', async () => {
		await syncNow('manual');
		const path = '/work-vault/Todoist/Work.md';
		editorStore.addTab({ path, name: 'Work.md', content: `${WORK_NOTE}typed, unsaved\n`, savedContent: WORK_NOTE });
		server.addItem({ id: 'w3', project_id: 'work', content: 'Hire', child_order: 3 });

		await syncNow('manual');

		expect(editorStore.tabs[0].content).toBe(`${WORK_NOTE}typed, unsaved\n- [ ] Hire 🆔 td-w3\n`);
		expect(vault.files.get('Todoist/Work.md')).toBe(WORK_NOTE);
		expect(vault.links.has('td-w3')).toBe(true);
	});

	it('ignores anchored lines in excluded folders', async () => {
		await syncNow('manual');
		vault.files.set('_system/templates/Task.md', '- [ ] Plan 🆔 td-w1\n');

		await syncNow('manual');

		expect(vault.links.get('td-w1')!.frozen).toBe(false);
	});
});

describe('syncNow: rebuild mode', () => {
	it('pairs anchored lines with an empty link table, creates nothing and logs the unmatched', async () => {
		await syncNow('manual');
		vault.links.clear();
		server.addItem({ id: 'w3', project_id: 'work', content: 'New in Todoist', child_order: 3 });
		const files = new Map(vault.files);

		const outcome = await syncNow('manual');

		expect(outcome).toEqual({ ok: true, message: 'Todoist sync rebuilt 3 links from the vault; nothing was created.' });
		expect(vault.files).toEqual(files);
		expect([...vault.links.keys()].sort()).toEqual(['td-q1', 'td-w1', 'td-w2']);
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'unmatched', anchor: 'td-w3' })]);
		expect(todoistSyncStore.lastResult).toMatchObject({ mode: 'rebuild', linksPaired: 3 });
	});

	it('says why nothing comes in when a rebuild pairs no line', async () => {
		vault.files.set('Notes/Old.md', '- [ ] Old 🆔 td-gone\n');

		const outcome = await syncNow('manual');

		expect(outcome.message).toBe(
			'Todoist sync rebuilt 0 links from the vault; nothing was created. 1 anchored line has no open Todoist task: ' +
				'new Todoist tasks come in only after a line pairs or those 🆔 anchors are removed.',
		);
		expect(todoistSyncStore.lastResult).toMatchObject({ mode: 'rebuild', linksPaired: 0, linesUnmatched: 1 });
	});
});

describe('syncNow: stale insert', () => {
	it('keeps the sync token out of the commit when an insert went stale', async () => {
		await syncNow('manual');
		// The scan skips code fences but the writer still sees this anchor, so the insert goes stale.
		vault.files.set('Todoist/Work.md', `${WORK_NOTE}\`\`\`\n- [ ] Hire 🆔 td-w3\n\`\`\`\n`);
		server.addItem({ id: 'w3', project_id: 'work', content: 'Hire', child_order: 3 });

		await syncNow('manual');

		expect(vault.commits[1].kv).toEqual([]);
		expect(vault.links.has('td-w3')).toBe(false);
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'stale' })]);
	});
});

describe('syncNow: refusals and safety', () => {
	it('refuses before the vault index is ready, without calling Todoist', async () => {
		vaultStore.resetIndexReady();

		expect(await syncNow('manual')).toEqual({ ok: false, message: 'The vault is still indexing. Try again when it finishes.' });
		expect(server.requests).toEqual([]);
		expect(vault.writes).toEqual([]);
	});

	it('refuses while sync is off, without a token or without a root project', async () => {
		settingsStore.updateTodoist({ syncEnabled: false });
		expect(await syncNow('manual')).toEqual({ ok: false, message: 'Turn on Todoist sync in Settings > Todoist first.' });

		settingsStore.updateTodoist({ syncEnabled: true, apiToken: '' });
		expect(await syncNow('manual')).toEqual({ ok: false, message: 'Add your Todoist API token in Settings > Todoist first.' });

		settingsStore.updateTodoist({ apiToken: server.token, syncRootProjectId: '' });
		expect(await syncNow('manual')).toEqual({ ok: false, message: 'Choose a sync root project in Settings > Todoist first.' });
		expect(server.requests).toEqual([]);
	});

	it('refuses an absolute or .. sync folder', async () => {
		const message = 'The Todoist sync folder must be a folder inside the vault. Fix it in Settings > Todoist.';
		for (const syncFolder of ['/Users/me/Todoist', '../Todoist', 'a/../b']) {
			settingsStore.updateTodoist({ syncFolder });
			expect(await syncNow('manual')).toEqual({ ok: false, message });
		}
		expect(server.requests).toEqual([]);
		expect(vault.writes).toEqual([]);
	});

	it('refuses while another run is in progress', async () => {
		todoistSyncStore.start();

		expect(await syncNow('manual')).toEqual({ ok: false, message: 'A Todoist sync is already running.' });
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

		const outcome = await syncNow('manual');

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
		todoistSyncStore.succeed({ kind: 'pull', mode: 'normal', notesCreated: 0, tasksInserted: 0, linksPaired: 0, linesUnmatched: 0, linesUpdated: 0, headingsWritten: 0, todoistUpdated: 0, todoistCreated: 0, projectsCreated: 0, sectionsCreated: 0, projectsRenamed: 0, finishedAt: 1 });
		fake.current = {
			async fetch(url, init) {
				const response = await server.fetch(url, init);
				openVault(createFakeVault('/other-vault'));
				todoistSyncStore.reset();
				return response;
			},
		};

		await syncNow('manual');

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

		const outcome = await syncNow('manual');

		expect(outcome).toMatchObject({ ok: false, message: 'The vault changed during the Todoist sync; nothing more was written.' });
		expect(first.writes).toEqual(['Todoist/Work.md']);
		expect(second.writes).toEqual([]);
		expect(first.commits).toEqual([]);
		expect(second.commits).toEqual([]);
	});

	it('maps a Todoist failure to its fixed message and logs the raw error', async () => {
		server.failNext({ kind: 'unauthorized' });

		const outcome = await syncNow('manual');

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
		expect((await syncNow('manual')).failure).toEqual({ kind: 'rate-limit', retryAfter: 42 });

		server.failNext({ kind: 'server-error' });
		expect((await syncNow('manual')).failure).toEqual({ kind: 'unreachable' });
	});

	it('reports an unexpected error as the generic failure kind', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd, args) => {
			if (cmd === 'todoist_read_links') throw new Error('db locked');
			return vault.invoke(cmd, args as Record<string, unknown> | undefined);
		});

		expect(await syncNow('manual')).toEqual({ ok: false, message: 'Todoist sync failed. Details are in the log.', failure: { kind: 'error' } });
	});

	it('gives a refusal no failure kind', async () => {
		settingsStore.updateTodoist({ syncEnabled: false });

		expect((await syncNow('manual')).failure).toBeUndefined();
	});

	it('reports a root project that is gone from Todoist', async () => {
		settingsStore.updateTodoist({ syncRootProjectId: 'gone' });

		const outcome = await syncNow('manual');

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
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		const before = server.requests.length;

		const outcome = await syncNow('manual');

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
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		await syncNow('manual');
		const files = new Map(vault.files);

		const outcome = await syncNow('manual');

		expect(outcome.message).toBe('Todoist sync done: nothing new.');
		expect(commandRequests()).toHaveLength(1);
		expect(vault.files).toEqual(files);
	});

	it('reopens a task unchecked in the brain with item_uncomplete', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		await syncNow('manual');
		edit('Todoist/Work.md', W1_DONE, W1_OPEN);

		await syncNow('manual');

		expect(commandRequests().at(-1)!.commands).toEqual([expect.objectContaining({ type: 'item_uncomplete', args: { id: 'w1' } })]);
		expect(server.item('w1')).toMatchObject({ checked: false });
		expect(remoteBase('td-w1').checked).toBe(false);
		expect(localBase('td-w1').status).toBe(' ');
	});

	it('treats [-] as closed and [/] as open', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, '- [/] Plan 🔺 #deep 🆔 td-w1');
		await syncNow('manual');
		expect(commandRequests()).toEqual([]);

		edit('Todoist/Work.md', '- [/] Plan', '- [-] Plan');
		await syncNow('manual');
		expect(server.item('w1')).toMatchObject({ checked: true });
		expect(vault.files.get('Todoist/Work.md')).toContain('- [-] Plan 🔺 #deep 🆔 td-w1');
	});

	it('rolls a recurring task closed in the brain: the line reopens with the next 📅', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W2_OPEN, W2_DONE);

		const outcome = await syncNow('manual');

		expect(commandRequests()[0].commands).toEqual([expect.objectContaining({ type: 'item_close', args: { id: 'w2' } })]);
		expect(server.item('w2')).toMatchObject({ checked: false, due: { date: '2026-11-20' } });
		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Report 📅 2026-11-20 🔁 every week 🆔 td-w2');
		expect(localBase('td-w2')).toMatchObject({ status: ' ', dueDate: '2026-11-20' });
		expect(remoteBase('td-w2').due).toMatchObject({ date: '2026-11-20', string: 'every week' });
		expect(outcome.message).toBe('Todoist sync done: 1 line updated, 1 task updated in Todoist.');

		await syncNow('manual');
		expect(commandRequests()).toHaveLength(1);
	});

	it('rewrites a recurring line through its open tab after the ack', async () => {
		await syncNow('manual');
		const path = '/work-vault/Todoist/Work.md';
		const unsaved = WORK_NOTE.replace(W2_OPEN, W2_DONE);
		editorStore.addTab({ path, name: 'Work.md', content: unsaved, savedContent: WORK_NOTE });

		await syncNow('manual');

		expect(server.item('w2')).toMatchObject({ checked: false, due: { date: '2026-11-20' } });
		expect(editorStore.tabs[0].content).toContain('- [ ] Report 📅 2026-11-20 🔁 every week 🆔 td-w2');
		expect(vault.files.get('Todoist/Work.md')).toBe(WORK_NOTE);
	});

	it('logs a recurring task that a close completed for good (a starting <date> rule)', async () => {
		server.updateItem('w2', { due: { ...WEEKLY, string: 'every week starting 13 Nov 2026' } });
		await syncNow('manual');
		edit('Todoist/Work.md', '- [ ] Report', '- [x] Report');

		await syncNow('manual');

		expect(server.item('w2')).toMatchObject({ checked: true, due: null });
		expect(vault.files.get('Todoist/Work.md')).toContain('- [x] Report 📅 2026-11-13');
		expect(vault.log).toContainEqual(expect.objectContaining({ kind: 'recurring-completed', anchor: 'td-w2' }));
	});
});

describe('syncNow: completion from Todoist', () => {
	it('checks the line of a task completed in Todoist, and unchecks it when reopened there', async () => {
		await syncNow('manual');
		server.updateItem('w1', { checked: true, completed_at: '2026-11-09T10:00:00Z' });

		expect((await syncNow('manual')).message).toBe('Todoist sync done: 1 line updated.');
		expect(vault.files.get('Todoist/Work.md')).toContain(W1_DONE);
		expect(localBase('td-w1').status).toBe('x');
		expect(commandRequests()).toEqual([]);

		server.updateItem('w1', { checked: false, completed_at: null });
		await syncNow('manual');
		expect(vault.files.get('Todoist/Work.md')).toContain(W1_OPEN);
		expect(commandRequests()).toEqual([]);
	});

	it('keeps an open status other than a space when Todoist reopens, and - when it closes', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, '- [/] Plan 🔺 #deep 🆔 td-w1');
		await syncNow('manual');
		server.updateItem('w1', { checked: true });
		await syncNow('manual');
		expect(vault.files.get('Todoist/Work.md')).toContain(W1_DONE);

		edit('Todoist/Work.md', W1_DONE, '- [-] Plan 🔺 #deep 🆔 td-w1');
		await syncNow('manual');
		expect(commandRequests()).toEqual([]);
		server.updateItem('w1', { checked: false });
		await syncNow('manual');
		expect(vault.files.get('Todoist/Work.md')).toContain(W1_OPEN);
	});

	it('moves the 📅 of a recurring task Todoist rolled forward, leaving the line open', async () => {
		await syncNow('manual');
		server.updateItem('w2', { due: { ...WEEKLY, date: '2026-11-20' } });

		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Report 📅 2026-11-20 🔁 every week 🆔 td-w2');
		expect(commandRequests()).toEqual([]);
	});

	it('reaches a line in a closed note and one in an open tab', async () => {
		await syncNow('manual');
		const path = '/work-vault/Todoist/Q4.md';
		editorStore.addTab({ path, name: 'Q4.md', content: vault.files.get('Todoist/Q4.md')!, savedContent: vault.files.get('Todoist/Q4.md')! });
		server.updateItem('w1', { checked: true });
		server.updateItem('q1', { checked: true });

		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toContain(W1_DONE);
		expect(editorStore.tabs[0].content).toContain('- [x] Ship 🆔 td-q1');
	});
});

describe('syncNow: completion on both sides', () => {
	it('only moves the bases when both sides closed the task', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		server.updateItem('w1', { checked: true });

		await syncNow('manual');

		expect(commandRequests()).toEqual([]);
		expect(localBase('td-w1').status).toBe('x');
		expect(remoteBase('td-w1').checked).toBe(true);
	});

	it('drops a brain close when Todoist rolled the recurring task meanwhile: the line takes the new date, logged', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W2_OPEN, W2_DONE);
		server.updateItem('w2', { due: { ...WEEKLY, date: '2026-11-20' } });

		await syncNow('manual');

		expect(commandRequests()).toEqual([]);
		expect(server.item('w2')!.due!.date).toBe('2026-11-20');
		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Report 📅 2026-11-20 🔁 every week 🆔 td-w2');
		expect(vault.log).toContainEqual(expect.objectContaining({ kind: 'close-dropped', anchor: 'td-w2' }));
	});

	it('closes a non-recurring task rescheduled in Todoist and checked in the brain; the line keeps [x]', async () => {
		server.updateItem('w1', { due: { is_recurring: false, string: 'Nov 13', date: '2026-11-13', lang: 'en' } });
		await syncNow('manual');
		const open = '- [ ] Plan 🔺 📅 2026-11-13 #deep 🆔 td-w1';
		edit('Todoist/Work.md', open, open.replace('[ ]', '[x]'));
		server.updateItem('w1', { due: { is_recurring: false, string: 'Nov 20', date: '2026-11-20', lang: 'en' } });

		await syncNow('manual');

		expect(commandRequests()[0].commands).toEqual([expect.objectContaining({ type: 'item_close', args: { id: 'w1' } })]);
		expect(server.item('w1')).toMatchObject({ checked: true });
		expect(vault.files.get('Todoist/Work.md')).toContain('- [x] Plan 🔺');
		expect(vault.log).not.toContainEqual(expect.objectContaining({ kind: 'close-dropped' }));
	});
});

describe('syncNow: edits from Todoist', () => {
	it('writes a content change into the description and keeps the rest of the line', async () => {
		await syncNow('manual');
		server.updateItem('w1', { content: 'Plan the launch' });

		const outcome = await syncNow('manual');

		expect(outcome.message).toBe('Todoist sync done: 1 line updated.');
		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Plan the launch 🔺 #deep 🆔 td-w1');
		expect(localBase('td-w1').description).toBe('Plan the launch');
		expect(remoteBase('td-w1').content).toBe('Plan the launch');
		expect(commandRequests()).toEqual([]);
	});

	it('writes due, priority and label changes as token patches', async () => {
		await syncNow('manual');
		server.updateItem('w1', { priority: 2, labels: ['next', 'Work'], due: { is_recurring: false, string: 'Nov 20', date: '2026-11-20', lang: 'en' } });

		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Plan 🔼 📅 2026-11-20 #next 🆔 td-w1');
		expect(localBase('td-w1')).toMatchObject({ priority: 'medium', dueDate: '2026-11-20', tags: ['next'] });
		expect(remoteBase('td-w1')).toMatchObject({ priority: 2, labels: ['next', 'Work'], unmappedLabels: ['Work'], due: { date: '2026-11-20' } });
	});

	it('writes nothing on a second cycle with no change', async () => {
		await syncNow('manual');
		server.updateItem('w1', { content: 'Plan more', priority: 3, labels: ['Work'], due: { is_recurring: false, string: 'Nov 20', date: '2026-11-20', lang: 'en' } });
		await syncNow('manual');
		const writes = vault.writes.length;
		const files = new Map(vault.files);

		const outcome = await syncNow('manual');

		expect(outcome.message).toBe('Todoist sync done: nothing new.');
		expect(vault.writes).toHaveLength(writes);
		expect(vault.files).toEqual(files);
	});

	it('writes nothing to the line when the webhook only adds Work', async () => {
		await syncNow('manual');
		const writes = vault.writes.length;
		server.updateItem('q1', { labels: ['Work'] });

		await syncNow('manual');

		expect(vault.writes).toHaveLength(writes);
		expect(vault.files.get('Todoist/Q4.md')).toContain('- [ ] Ship 🆔 td-q1');
		expect(remoteBase('td-q1')).toMatchObject({ labels: ['Work'], unmappedLabels: ['Work'] });
	});

	it('keeps a leading #todoist when the content changes', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, '- [ ] #todoist Plan 🔺 #deep 🆔 td-w1');
		server.updateItem('w1', { content: 'Plan more' });

		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] #todoist Plan more 🔺 #deep 🆔 td-w1');
	});

	it('leaves a line with a tag inside its text alone, and logs the Todoist text', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, '- [ ] Plan #deep it 🔺 🆔 td-w1');
		await syncNow('manual');
		server.updateItem('w1', { content: 'Plan it all' });

		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Plan #deep it 🔺 🆔 td-w1');
		expect(vault.log).toContainEqual(expect.objectContaining({ kind: 'description-conflict', anchor: 'td-w1', message: expect.stringContaining('Plan it all') }));
	});

	it('does not write content that fails the round trip, and logs it', async () => {
		await syncNow('manual');
		server.updateItem('w1', { content: 'Fix #42' });

		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toContain(W1_OPEN);
		expect(vault.log).toContainEqual(expect.objectContaining({ kind: 'content-roundtrip', anchor: 'td-w1' }));
	});

	it('never rewrites the 🔁 text of a recurring task when Todoist changes its rule', async () => {
		await syncNow('manual');
		server.updateItem('w2', { due: { ...WEEKLY, string: 'every 2 weeks', date: '2026-11-27' } });

		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Report 📅 2026-11-27 🔁 every week 🆔 td-w2');
		expect(remoteBase('td-w2').due).toMatchObject({ string: 'every 2 weeks' });
	});

	it('keeps a trailing block id last when the content changes; the next cycle is quiet', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, `${W1_OPEN} ^abc`);
		server.updateItem('w1', { content: 'Plan the launch' });

		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Plan the launch 🔺 #deep 🆔 td-w1 ^abc\n');
		expect(commandRequests()).toEqual([]);
		expect(vault.log).toEqual([]);
		expect((await syncNow('manual')).message).toBe('Todoist sync done: nothing new.');
		expect(commandRequests()).toEqual([]);
	});

	it('writes a content change and a completion of the same task as one patch', async () => {
		await syncNow('manual');
		server.updateItem('w1', { content: 'Planned', checked: true });

		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toContain('- [x] Planned 🔺 #deep 🆔 td-w1');
		expect(localBase('td-w1')).toMatchObject({ status: 'x', description: 'Planned' });
	});
});

describe('syncNow: labels that are no task tag', () => {
	const pushedContents = () => commandRequests().flatMap((r) => r.commands!.map((c) => (c.args as { content?: string }).content ?? ''));

	it('never writes a digit-first label as a tag, and keeps it in Todoist across cycles', async () => {
		server.addItem({ id: 'y1', project_id: 'work', content: 'Year plan', labels: ['2026', 'deep'], child_order: 3 });

		await syncNow('manual');
		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Year plan #deep 🆔 td-y1');
		expect(vault.files.get('Todoist/Work.md')).not.toContain('#2026');
		expect(server.item('y1')).toMatchObject({ content: 'Year plan', labels: ['2026', 'deep'] });
		expect(remoteBase('td-y1')).toMatchObject({ labels: ['2026', 'deep'], unmappedLabels: ['2026'] });
		expect(pushedContents().filter((c) => c.includes('#2026'))).toEqual([]);
		expect(commandRequests()).toEqual([]);
	});

	it('leaves the line alone when Todoist adds a digit-first label to a linked task', async () => {
		await syncNow('manual');
		server.updateItem('w1', { labels: ['deep', 'Work', '2026'] });

		await syncNow('manual');
		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toContain(W1_OPEN);
		expect(server.item('w1')).toMatchObject({ labels: ['deep', 'Work', '2026'] });
		expect(commandRequests()).toEqual([]);
	});

	it('writes a label with a non-ASCII first letter as a tag', async () => {
		server.addItem({ id: 'u1', project_id: 'work', content: 'Read', labels: ['über'], child_order: 3 });

		await syncNow('manual');
		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Read #über 🆔 td-u1');
		expect(localBase('td-u1')).toMatchObject({ tags: ['über'] });
		expect(commandRequests()).toEqual([]);
	});
});

const W1_EDITED = '- [ ] Plan the launch ⏫ 📅 2026-11-20 #next 🆔 td-w1';

describe('syncNow: edits from the brain', () => {
	it('pushes text, 📅, priority and tag edits as one item_update; the echo next cycle sends and writes nothing', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, W1_EDITED);

		const outcome = await syncNow('manual');

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

		expect((await syncNow('manual')).message).toBe('Todoist sync done: nothing new.');
		expect(commandRequests()).toHaveLength(1);
		expect(vault.files).toEqual(files);
		expect(vault.writes).toHaveLength(writes);
		expect(vault.log).toEqual([]);
	});

	it('pushes a text edit on a line ending in a block id without it; the next cycle is quiet', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, `${W1_OPEN} ^abc`);
		expect((await syncNow('manual')).message).toBe('Todoist sync done: nothing new.');
		edit('Todoist/Work.md', `${W1_OPEN} ^abc`, '- [ ] Plan more 🔺 #deep 🆔 td-w1 ^abc');

		await syncNow('manual');

		expect(commandRequests().flatMap((r) => r.commands!)).toEqual([expect.objectContaining({ type: 'item_update', args: { id: 'w1', content: 'Plan more' } })]);
		expect(server.item('w1')).toMatchObject({ content: 'Plan more' });
		const files = new Map(vault.files);
		expect((await syncNow('manual')).message).toBe('Todoist sync done: nothing new.');
		expect(commandRequests()).toHaveLength(1);
		expect(vault.files).toEqual(files);
		expect(vault.log).toEqual([]);
	});

	it('moves the date of a recurring task and keeps its rule in Todoist', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W2_OPEN, '- [ ] Report 📅 2026-11-16 🔁 every week 🆔 td-w2');

		await syncNow('manual');

		expect(commandRequests()[0].commands![0].args).toEqual({ id: 'w2', due: { date: '2026-11-16', string: 'every week', lang: 'en' } });
		expect(server.item('w2')!.due).toMatchObject({ date: '2026-11-16', string: 'every week', is_recurring: true });
		await syncNow('manual');
		expect(commandRequests()).toHaveLength(1);
	});

	it('lets Todoist win a field changed on both sides: the line takes the Todoist value, the brain value is logged', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, '- [ ] Plan ⏫ #deep 🆔 td-w1');
		server.updateItem('w1', { priority: 2 });

		await syncNow('manual');
		await syncNow('manual');

		expect(commandRequests()).toEqual([]);
		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Plan 🔼 #deep 🆔 td-w1');
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'conflict', anchor: 'td-w1', message: expect.stringContaining('"high"') })]);
	});

	it('does not send text over 500 characters, and logs it once', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, `- [ ] ${'x'.repeat(501)} 🔺 #deep 🆔 td-w1`);

		await syncNow('manual');
		await syncNow('manual');

		expect(commandRequests()).toEqual([]);
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'content-not-pushed', anchor: 'td-w1' })]);
	});

	it('never pushes a line inserted from content that failed the round trip', async () => {
		server.addItem({ id: 'h1', project_id: 'work', content: 'Fix #12', child_order: 3 });
		await syncNow('manual');
		edit('Todoist/Work.md', '- [ ] Fix #12 🆔 td-h1', '- [ ] Fix #12 ⏫ 🆔 td-h1');

		await syncNow('manual');

		expect(commandRequests()).toEqual([]);
		expect(server.item('h1')!.priority).toBe(1);
	});

	it('treats a refused item_update as terminal: logged, the line kept, not retried', async () => {
		await syncNow('manual');
		server.refuseCommandsFor('w1');
		edit('Todoist/Work.md', W1_OPEN, '- [ ] Plan ⏫ #deep 🆔 td-w1');

		expect((await syncNow('manual')).ok).toBe(true);

		expect(vault.log).toContainEqual(expect.objectContaining({ kind: 'command-error', anchor: 'td-w1', message: expect.stringContaining('item_update') }));
		expect(localBase('td-w1').priority).toBe('high');
		expect(remoteBase('td-w1').priority).toBe(4);
		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Plan ⏫ #deep 🆔 td-w1');
		await syncNow('manual');
		expect(commandRequests()).toHaveLength(1);
	});

	it('keeps the bases when the push does not reach Todoist, and sends it again next cycle', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, '- [ ] Plan ⏫ #deep 🆔 td-w1');
		let offline = true;
		fake.current = {
			fetch(url, init) {
				if (offline && String(init?.body).includes('"commands"')) return Promise.reject(new TypeError('Network request failed'));
				return server.fetch(url, init);
			},
		};

		expect((await syncNow('manual')).ok).toBe(false);
		expect(localBase('td-w1').priority).toBe('highest');

		offline = false;
		await syncNow('manual');

		expect(server.item('w1')!.priority).toBe(3);
		expect(localBase('td-w1').priority).toBe('high');
	});

	it('sends no push for a line whose Todoist patch went stale, and keeps the token', async () => {
		await syncNow('manual');
		const token = vault.kv.get('sync_token');
		edit('Todoist/Work.md', W1_OPEN, '- [ ] Plan more 🔺 #deep 🆔 td-w1');
		server.updateItem('w1', { priority: 3 });
		vi.mocked(invoke).mockImplementation(async (cmd, args) => {
			const out = await vault.invoke(cmd, args as Record<string, unknown> | undefined);
			// Typed after the scan, before the write.
			if (cmd === 'get_all_tasks_v2') edit('Todoist/Work.md', 'Plan more', 'Plan more now');
			return out;
		});

		await syncNow('manual');

		expect(commandRequests()).toEqual([]);
		expect(vault.kv.get('sync_token')).toBe(token);
		expect(localBase('td-w1').description).toBe('Plan');
	});

	it('withholds the sync token when a refused close hides a Todoist edit of the same task, so the next cycle still writes it', async () => {
		await syncNow('manual');
		const token = vault.kv.get('sync_token');
		server.refuseCommandsFor('w1');
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		server.updateItem('w1', { content: 'Plan more' });

		await syncNow('manual');

		expect(vault.log).toContainEqual(expect.objectContaining({ kind: 'command-error', anchor: 'td-w1' }));
		expect(vault.kv.get('sync_token')).toBe(token);

		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toContain('- [x] Plan more 🔺 #deep 🆔 td-w1');
		expect(vault.kv.get('sync_token')).not.toBe(token);
	});
});

describe('syncNow: field push cap', () => {
	/** Adds `n` open tasks to Work, syncs them in, and gives each one a priority in the brain. */
	async function editMany(n: number) {
		for (let i = 1; i <= n; i++) server.addItem({ id: `e${i}`, project_id: 'work', content: `Chore ${i}`, child_order: 10 + i });
		await syncNow('manual');
		vault.files.set('Todoist/Work.md', vault.files.get('Todoist/Work.md')!.replace(/- \[ \] Chore \d+/gu, '$& ⏫'));
	}

	it('asks before more than 50 field pushes; Cancel changes nothing', async () => {
		await editMany(51);
		vi.mocked(ask).mockResolvedValue(false);
		const files = new Map(vault.files);
		const commits = vault.commits.length;

		const outcome = await syncNow('manual');

		expect(vi.mocked(ask)).toHaveBeenCalledWith(expect.stringContaining('51 tasks'), expect.objectContaining({ title: 'Todoist sync' }));
		expect(outcome).toEqual({ ok: false, message: 'Todoist sync cancelled; nothing was changed.', failure: { kind: 'error' } });
		expect(commandRequests()).toEqual([]);
		expect(vault.files).toEqual(files);
		expect(vault.commits).toHaveLength(commits);
	});

	it('runs uncapped on Sync, at most 100 commands per request', async () => {
		await editMany(101);
		vi.mocked(ask).mockResolvedValue(true);

		await syncNow('manual');

		expect(commandRequests().map((r) => r.commands!.length)).toEqual([100, 1]);
		expect(server.item('e101')!.priority).toBe(3);
	});

	it('does not ask at 50', async () => {
		await editMany(50);

		await syncNow('manual');

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
		expect(await syncNow('manual')).not.toHaveProperty('skippedFieldPushes');
		expect(commandRequests().map((r) => r.commands!.length)).toEqual([51]);
		expect(server.item('e1')!.priority).toBe(3);
	});
});

describe('syncNow: completion commands', () => {
	it('keeps the pending uuid when the command request fails, and resends the same uuid next run', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		let offline = true;
		fake.current = {
			fetch(url, init) {
				if (offline && String(init?.body).includes('"commands"')) return Promise.reject(new TypeError('Network request failed'));
				return server.fetch(url, init);
			},
		};

		const failed = await syncNow('manual');

		expect(failed).toEqual({ ok: false, message: 'Could not reach Todoist. Check your connection and try again.', failure: { kind: 'unreachable' } });
		const pending = JSON.parse(vault.links.get('td-w1')!.pendingCmd!);
		expect(pending.type).toBe('item_close');
		expect(server.item('w1')!.checked).toBe(false);

		offline = false;
		await syncNow('manual');

		expect(server.requests.filter((r) => r.commands).map((r) => r.commands![0].uuid)).toEqual([pending.uuid]);
		expect(server.item('w1')!.checked).toBe(true);
		expect(vault.links.get('td-w1')!.pendingCmd).toBeNull();
	});

	it('treats a 400 sync_status as terminal: pending cleared, logged, not retried', async () => {
		await syncNow('manual');
		server.refuseCommandsFor('w1');
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);

		const outcome = await syncNow('manual');

		expect(outcome.ok).toBe(true);
		expect(vault.links.get('td-w1')!.pendingCmd).toBeNull();
		expect(vault.log).toContainEqual(expect.objectContaining({ kind: 'command-error', anchor: 'td-w1' }));
		expect(localBase('td-w1').status).toBe('x');

		await syncNow('manual');
		expect(commandRequests()).toHaveLength(1);
	});

	it('fills a null local base from the line on the first run after a rebuild, then pushes the next change', async () => {
		await syncNow('manual');
		vault.links.clear();
		await syncNow('manual');
		expect(vault.links.get('td-w1')!.localBase).toBeNull();

		await syncNow('manual');
		expect(localBase('td-w1')).toMatchObject({ status: ' ', description: 'Plan' });
		expect(commandRequests()).toEqual([]);

		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		await syncNow('manual');
		expect(server.item('w1')!.checked).toBe(true);
	});

	it('does not push for a duplicated anchor', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, `${W1_DONE}\n${W1_DONE}`);

		await syncNow('manual');

		expect(commandRequests()).toEqual([]);
		expect(vault.links.get('td-w1')!.frozen).toBe(true);
	});

	it('writes no Todoist edit into a duplicated anchor and keeps its bases', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, `${W1_OPEN}\n${W1_OPEN}`);
		server.updateItem('w1', { content: 'Plan the launch', priority: 1 });
		const files = new Map(vault.files);

		await syncNow('manual');

		expect(vault.files).toEqual(files);
		expect(vault.links.get('td-w1')!.frozen).toBe(true);
		expect(remoteBase('td-w1')).toMatchObject({ content: 'Plan', priority: 4 });
	});
});

describe('syncNow: close/reopen cap', () => {
	/** Adds `n` open tasks to Work, syncs them in, and checks every one in the brain. */
	async function checkMany(n: number) {
		for (let i = 1; i <= n; i++) server.addItem({ id: `c${i}`, project_id: 'work', content: `Chore ${i}`, child_order: 10 + i });
		await syncNow('manual');
		vault.files.set('Todoist/Work.md', vault.files.get('Todoist/Work.md')!.replace(/- \[ \] Chore/gu, '- [x] Chore'));
	}

	it('asks before more than 25 close/reopen pushes; Cancel changes nothing', async () => {
		await checkMany(26);
		vi.mocked(ask).mockResolvedValue(false);
		const files = new Map(vault.files);
		const commits = vault.commits.length;

		const outcome = await syncNow('manual');

		expect(vi.mocked(ask)).toHaveBeenCalledWith(expect.stringContaining('26 tasks'), expect.objectContaining({ title: 'Todoist sync' }));
		expect(outcome).toEqual({ ok: false, message: 'Todoist sync cancelled; nothing was changed.', failure: { kind: 'error' } });
		expect(commandRequests()).toEqual([]);
		expect(vault.files).toEqual(files);
		expect(vault.commits).toHaveLength(commits);
	});

	it('runs uncapped on Sync, at most 100 commands per request', async () => {
		await checkMany(101);
		vi.mocked(ask).mockResolvedValue(true);

		await syncNow('manual');

		expect(commandRequests().map((r) => r.commands!.length)).toEqual([100, 1]);
		expect(server.item('c101')!.checked).toBe(true);
	});

	it('does not ask at 25', async () => {
		await checkMany(25);

		await syncNow('manual');

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
		expect(await syncNow('manual')).not.toHaveProperty('skippedPushes');
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
		await syncNow('manual');

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
		await syncNow('manual');
		server.updateItem('w1', { is_deleted: true });
		const files = new Map(vault.files);

		const outcome = await syncNow('manual');

		expect(outcome).toEqual({ ok: true, message: 'Todoist sync done: nothing new.' });
		expect(vault.files).toEqual(files);
		expect(vault.links.get('td-w1')).toMatchObject({ todoistId: 'w1', missCount: 3, pendingCmd: null });
		expect(detachLog('td-w1')).toEqual([expect.objectContaining({ message: expect.stringContaining('deleted in Todoist') })]);
	});

	it('never syncs the detached line again: no command, no create, no second log', async () => {
		await syncNow('manual');
		server.updateItem('w1', { is_deleted: true });
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);

		await syncNow('manual');
		await syncNow('manual');

		expect(commandRequests()).toEqual([]);
		expect(server.item('w1')).toMatchObject({ is_deleted: true, checked: false });
		expect(vault.files.get('Todoist/Work.md')).toContain(W1_DONE);
		expect(detachLog('td-w1')).toHaveLength(1);
	});

	it('drops a close checked in the brain while Todoist deleted the task', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		server.updateItem('w1', { is_deleted: true });

		await syncNow('manual');

		expect(commandRequests()).toEqual([]);
		expect(missCount('td-w1')).toBe(3);
	});

	it('writes no Todoist edit made together with the deletion', async () => {
		await syncNow('manual');
		server.updateItem('w1', { content: 'Plan the launch', priority: 1, is_deleted: true });
		const files = new Map(vault.files);

		await syncNow('manual');

		expect(vault.files).toEqual(files);
		expect(missCount('td-w1')).toBe(3);
		expect(remoteBase('td-w1')).toMatchObject({ content: 'Plan', priority: 4 });
	});
});

describe('syncNow: a task moved out of the vault tree', () => {
	it('detaches a task moved to a project outside the tree, line kept, logged', async () => {
		await syncNow('manual');
		server.updateItem('w1', { project_id: 'personal' });
		const files = new Map(vault.files);

		await syncNow('manual');

		expect(vault.files).toEqual(files);
		expect(missCount('td-w1')).toBe(3);
		expect(detachLog('td-w1')).toEqual([expect.objectContaining({ message: expect.stringContaining('outside') })]);
	});

	it('detaches a task moved to the Inbox when the vault does not include it', async () => {
		await syncNow('manual');
		server.updateItem('w1', { project_id: 'inbox' });

		await syncNow('manual');

		expect(missCount('td-w1')).toBe(3);
		expect(detachLog('td-w1')).toHaveLength(1);
	});

	it('keeps a task moved to the Inbox when the vault includes it, or within the tree', async () => {
		settingsStore.updateTodoist({ syncIncludeInbox: true });
		await syncNow('manual');
		server.updateItem('w1', { project_id: 'inbox' });
		server.updateItem('w2', { project_id: 'q4' });

		await syncNow('manual');

		expect(missCount('td-w1')).toBe(0);
		expect(missCount('td-w2')).toBe(0);
		expect(vault.log.filter((e) => e.kind === 'detach')).toEqual([]);
	});

	it('never patches a detached line, even when its task moves back into the tree and is edited there', async () => {
		await syncNow('manual');
		server.updateItem('w1', { project_id: 'personal' });
		await syncNow('manual');
		const detached = vault.links.get('td-w1')!;
		server.updateItem('w1', { project_id: 'work', content: 'Plan the launch', priority: 1, labels: ['next'] });
		const files = new Map(vault.files);

		await syncNow('manual');

		expect(vault.files).toEqual(files);
		expect(vault.links.get('td-w1')).toEqual(detached);
		expect(commandRequests()).toEqual([]);
	});
});

describe('syncNow: a synced line deleted in the vault', () => {
	it('detaches after 3 cycles in a row without the line; the Todoist task stays open and is not inserted again', async () => {
		await syncNow('manual');
		removeW1();

		await syncNow('manual');
		expect(missCount('td-w1')).toBe(1);
		await syncNow('manual');
		expect(missCount('td-w1')).toBe(2);
		expect(detachLog('td-w1')).toEqual([]);
		await syncNow('manual');

		expect(missCount('td-w1')).toBe(3);
		expect(detachLog('td-w1')).toEqual([expect.objectContaining({ message: expect.stringContaining('not found in the vault') })]);
		expect(server.item('w1')).toMatchObject({ checked: false, is_deleted: false });
		await syncNow('manual');
		expect(vault.files.get('Todoist/Work.md')).not.toContain('td-w1');
		expect(commandRequests()).toEqual([]);
	});

	it('resets the count when the line reappears', async () => {
		await syncNow('manual');
		removeW1();
		await syncNow('manual');
		await syncNow('manual');
		vault.files.set('Todoist/Work.md', WORK_NOTE);

		await syncNow('manual');
		expect(missCount('td-w1')).toBe(0);

		removeW1();
		await syncNow('manual');
		await syncNow('manual');
		expect(missCount('td-w1')).toBe(2);
		expect(detachLog('td-w1')).toEqual([]);
	});

	it('counts no miss in a cycle refused before the index is ready', async () => {
		await syncNow('manual');
		removeW1();
		await syncNow('manual');
		await syncNow('manual');
		vaultStore.resetIndexReady();

		await syncNow('manual');

		expect(missCount('td-w1')).toBe(2);
	});

	it('never counts a task absent from the incremental pulls, or a closed one gone from the full sync, as deleted', async () => {
		await syncNow('manual');
		server.updateItem('w2', { checked: true });
		for (let i = 0; i < 4; i++) await syncNow('manual');

		expect([...vault.links.values()].map((l) => l.missCount)).toEqual([0, 0, 0]);
		expect(vault.log.filter((e) => e.kind === 'detach')).toEqual([]);
	});
});

describe('syncNow: the line brake', () => {
	const BRAKE = 'Todoist sync stopped: fewer than half of the synced task lines were found in the vault. Nothing was changed.';

	/** Syncs Work in, then empties its note: 1 of the 3 synced lines (Q4's) is left. */
	async function underBrake() {
		await syncNow('manual');
		vault.files.set('Todoist/Work.md', '---\ntodoist_project: work\n---\n');
	}

	it('asks on a manual cycle, naming the missing lines; No aborts before any write, detach or push', async () => {
		await underBrake();
		edit('Todoist/Q4.md', '- [ ] Ship', '- [x] Ship');
		server.addItem({ id: 'w3', project_id: 'work', content: 'New' });
		vi.mocked(ask).mockResolvedValue(false);
		const files = new Map(vault.files);
		const commits = vault.commits.length;
		const logged = vault.log.length;

		const outcome = await syncNow('manual');

		expect(vi.mocked(ask)).toHaveBeenCalledTimes(1);
		expect(vi.mocked(ask)).toHaveBeenCalledWith(expect.stringContaining('Synced task lines missing from the vault: 2 of 3.'), expect.objectContaining({ title: 'Todoist sync' }));
		expect(outcome).toEqual({ ok: false, message: BRAKE, failure: { kind: 'lines-missing' } });
		expect(vault.files).toEqual(files);
		expect(vault.commits).toHaveLength(commits);
		expect(vault.log).toHaveLength(logged);
		expect(commandRequests()).toEqual([]);
		expect([...vault.links.values()].map((l) => l.missCount)).toEqual([0, 0, 0]);
		expect(todoistSyncStore.status).toBe('error');
	});

	it('aborts when no synced line is found at all and No is chosen', async () => {
		await syncNow('manual');
		vault.files.clear();
		vi.mocked(ask).mockResolvedValue(false);

		expect(await syncNow('manual')).toEqual({ ok: false, message: BRAKE, failure: { kind: 'lines-missing' } });
		expect(vi.mocked(ask)).toHaveBeenCalledWith(expect.stringContaining('Synced task lines missing from the vault: 3 of 3.'), expect.anything());
		expect(vault.files.size).toBe(0);
	});

	it('never asks on an automatic cycle: it aborts with nothing counted', async () => {
		await underBrake();
		vi.mocked(ask).mockResolvedValue(true);
		const commits = vault.commits.length;

		expect(await syncNow('auto')).toEqual({ ok: false, message: BRAKE, failure: { kind: 'lines-missing' } });
		expect(vi.mocked(ask)).not.toHaveBeenCalled();
		expect(vault.commits).toHaveLength(commits);
		expect([...vault.links.values()].map((l) => l.missCount)).toEqual([0, 0, 0]);
	});

	it('runs the cycle on Yes and counts the misses', async () => {
		await underBrake();
		vi.mocked(ask).mockResolvedValue(true);

		expect((await syncNow('manual')).ok).toBe(true);
		expect(missCount('td-w1')).toBe(1);
		expect(missCount('td-w2')).toBe(1);
		expect(missCount('td-q1')).toBe(0);
		expect(vault.files.get('Todoist/Work.md')).toBe('---\ntodoist_project: work\n---\n');
	});

	it('detaches the missing links after 3 manual cycles past it; the next cycle, manual or automatic, runs without asking', async () => {
		await underBrake();
		vi.mocked(ask).mockResolvedValue(true);
		for (let i = 0; i < 3; i++) expect((await syncNow('manual')).ok).toBe(true);

		expect(vi.mocked(ask)).toHaveBeenCalledTimes(3);
		expect(missCount('td-w1')).toBe(3);
		expect(missCount('td-w2')).toBe(3);
		expect(vault.log.filter((e) => e.kind === 'detach').map((e) => e.anchor)).toEqual(['td-w1', 'td-w2']);
		expect(server.item('w1')).toMatchObject({ checked: false, is_deleted: false });

		vi.mocked(ask).mockClear();
		expect((await syncNow('auto')).ok).toBe(true);
		expect((await syncNow('manual')).ok).toBe(true);
		expect(vi.mocked(ask)).not.toHaveBeenCalled();
		expect(vault.files.get('Todoist/Work.md')).toBe('---\ntodoist_project: work\n---\n');
	});

	it('runs at exactly half, counting the misses', async () => {
		server.addItem({ id: 'w3', project_id: 'work', content: 'Extra', child_order: 3 });
		await syncNow('manual');
		edit('Todoist/Work.md', `${W1_OPEN}\n`, '');
		edit('Todoist/Work.md', '- [ ] Extra 🆔 td-w3\n', '');

		expect((await syncNow('manual')).ok).toBe(true);
		expect(missCount('td-w1')).toBe(1);
	});
});

describe('syncNow: detach cap', () => {
	/** Adds `n` open tasks to Work, syncs them in, and deletes every one in Todoist. */
	async function deleteMany(n: number) {
		for (let i = 1; i <= n; i++) server.addItem({ id: `d${i}`, project_id: 'work', content: `Old ${i}`, child_order: 10 + i });
		await syncNow('manual');
		for (let i = 1; i <= n; i++) server.updateItem(`d${i}`, { is_deleted: true });
	}

	it('asks before more than 10 detaches; Cancel changes nothing', async () => {
		await deleteMany(11);
		vi.mocked(ask).mockResolvedValue(false);
		const commits = vault.commits.length;

		const outcome = await syncNow('manual');

		expect(vi.mocked(ask)).toHaveBeenCalledWith(expect.stringContaining('detach 11 tasks'), expect.objectContaining({ title: 'Todoist sync' }));
		expect(outcome).toEqual({ ok: false, message: 'Todoist sync cancelled; nothing was changed.', failure: { kind: 'error' } });
		expect(vault.commits).toHaveLength(commits);
		expect(missCount('td-d1')).toBe(0);
	});

	it('detaches them all on Sync', async () => {
		await deleteMany(11);
		vi.mocked(ask).mockResolvedValue(true);

		await syncNow('manual');

		expect(missCount('td-d1')).toBe(3);
		expect(missCount('td-d11')).toBe(3);
		expect(vault.log.filter((e) => e.kind === 'detach')).toHaveLength(11);
	});

	it('does not ask at 10', async () => {
		await deleteMany(10);

		await syncNow('manual');

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
		expect(await syncNow('manual')).not.toHaveProperty('skippedDetaches');
		expect(missCount('td-d1')).toBe(3);
	});
});

/** The `item_add` commands Todoist received, in order. */
const adds = () => commandRequests().flatMap((r) => r.commands!.filter((c) => c.type === 'item_add'));
/** The brain-born anchor the line starting with `prefix` got in `relPath`. */
function bornAnchor(relPath: string, prefix: string): string {
	const line = vault.files.get(relPath)!.split('\n').find((l) => l.startsWith(prefix));
	const anchor = /🆔 (td-[0-9a-z]{8})$/u.exec(line ?? '')?.[1];
	if (!anchor) throw new Error(`No brain-born anchor on ${JSON.stringify(line)}`);
	return anchor;
}
/** Todoist items whose content is `content`. */
const itemsNamed = (content: string) => server.items().filter((i) => i.content === content);
/** Appends `line` to the Work project note, as an edit in the brain. */
const addToWork = (line: string) => vault.files.set('Todoist/Work.md', `${vault.files.get('Todoist/Work.md')!}${line}\n`);

describe('syncNow: brain-born tasks', () => {
	it('creates a new line of a project note in its project: anchor and pending link stored before item_add is sent', async () => {
		await syncNow('manual');
		addToWork('- [ ] Call Bob ⏫ 📅 2026-11-16 #deep');
		let seenAtSend: { line: string | undefined; link: unknown } | null = null;
		fake.current = {
			fetch(url, init) {
				if (String(init?.body).includes('"item_add"')) {
					const line = vault.files.get('Todoist/Work.md')!.split('\n').find((l) => l.startsWith('- [ ] Call Bob'));
					const anchor = /🆔 (\S+)/u.exec(line ?? '')?.[1];
					seenAtSend = { line, link: anchor ? vault.links.get(anchor) : undefined };
				}
				return server.fetch(url, init);
			},
		};

		const outcome = await syncNow('manual');

		const anchor = bornAnchor('Todoist/Work.md', '- [ ] Call Bob');
		expect(vault.files.get('Todoist/Work.md')).toContain(`- [ ] Call Bob ⏫ 📅 2026-11-16 #deep 🆔 ${anchor}`);
		expect(seenAtSend!.line).toContain(anchor);
		expect(seenAtSend!.link).toMatchObject({ todoistId: null, pendingUuid: expect.any(String) });
		expect(adds()).toEqual([
			{
				type: 'item_add',
				uuid: (seenAtSend!.link as { pendingUuid: string }).pendingUuid,
				temp_id: anchor,
				args: {
					content: 'Call Bob',
					description: `kokobrain:${anchor}`,
					project_id: 'work',
					priority: 3,
					labels: ['deep'],
					due: { date: '2026-11-16' },
					auto_parse_labels: false,
				},
			},
		]);
		const [created] = itemsNamed('Call Bob');
		expect(created).toMatchObject({ project_id: 'work', description: `kokobrain:${anchor}`, labels: ['deep'], priority: 3 });
		expect(vault.links.get(anchor)).toMatchObject({ todoistId: created.id, pendingUuid: null, pendingCmd: null, noteRelPath: 'Todoist/Work.md' });
		expect(remoteBase(anchor)).toMatchObject({ content: 'Call Bob', projectId: 'work', priority: 3, labels: ['deep'] });
		expect(outcome).toEqual({ ok: true, message: 'Todoist sync done: 1 task created in Todoist.' });
	});

	it('creates nothing more on the next cycles, and a later edit of the line is pushed as an item_update', async () => {
		await syncNow('manual');
		addToWork('- [ ] Call Bob');
		await syncNow('manual');
		const anchor = bornAnchor('Todoist/Work.md', '- [ ] Call Bob');
		server.updateItem(itemsNamed('Call Bob')[0].id, { labels: ['Work'] });

		const quiet = await syncNow('manual');
		edit('Todoist/Work.md', `Call Bob 🆔 ${anchor}`, `Call Bob 🔼 🆔 ${anchor}`);
		await syncNow('manual');

		expect(quiet).toEqual({ ok: true, message: 'Todoist sync done: nothing new.' });
		expect(adds()).toHaveLength(1);
		expect(itemsNamed('Call Bob')).toHaveLength(1);
		expect(itemsNamed('Call Bob')[0]).toMatchObject({ priority: 2, labels: ['Work'] });
		expect(vault.files.get('Todoist/Work.md')!.match(/Call Bob/gu)).toHaveLength(1);
	});

	it('creates a #todoist line outside the project notes in the root project; the line stays in its note', async () => {
		await syncNow('manual');
		vault.files.set('Notes/Day.md', '# Day\n- [ ] Call Bob #todoist\n');

		await syncNow('manual');

		const anchor = bornAnchor('Notes/Day.md', '- [ ] Call Bob');
		expect(vault.files.get('Notes/Day.md')).toBe(`# Day\n- [ ] Call Bob #todoist 🆔 ${anchor}\n`);
		expect(itemsNamed('Call Bob')[0]).toMatchObject({ project_id: 'work', labels: [] });
		expect(vault.files.get('Todoist/Work.md')).not.toContain('Call Bob');
	});

	it('creates a line of a project note open in a tab through the tab', async () => {
		await syncNow('manual');
		addToWork('- [ ] Call Bob');
		const path = '/work-vault/Todoist/Work.md';
		const content = vault.files.get('Todoist/Work.md')!;
		editorStore.addTab({ path, name: 'Work.md', content, savedContent: content });

		await syncNow('manual');

		const tab = editorStore.tabs[0].content;
		expect(tab).toMatch(/- \[ \] Call Bob 🆔 td-[0-9a-z]{8}\n$/u);
		expect(vault.files.get('Todoist/Work.md')).toBe(content);
		expect(itemsNamed('Call Bob')).toHaveLength(1);
	});

	it('creates nothing for closed lines, subtasks, other notes, excluded folders and lines with a user 🆔; logs the 🆔 and long text', async () => {
		await syncNow('manual');
		addToWork('- [x] Done already');
		addToWork('\t- [ ] A subtask');
		addToWork('- [ ] Mine 🆔 abc');
		addToWork(`- [ ] ${'x'.repeat(501)}`);
		vault.files.set('Notes/Day.md', '- [ ] Not synced\n');
		vault.files.set('_system/templates/Task.md', '- [ ] Template #todoist\n');
		const files = new Map(vault.files);

		await syncNow('manual');

		expect(adds()).toEqual([]);
		expect(vault.files).toEqual(files);
		expect(vault.log).toEqual([
			expect.objectContaining({ kind: 'create-skipped', message: expect.stringContaining('🆔') }),
			expect.objectContaining({ kind: 'create-skipped', message: expect.stringContaining('over 500 characters') }),
		]);
	});

	it('logs skipped lines only on a manual cycle, so automatic cycles do not fill the sync log', async () => {
		await syncNow('manual');
		addToWork('- [ ] Mine 🆔 abc');

		await syncNow('auto');
		await syncNow('auto');

		expect(vault.log).toEqual([]);
		await syncNow('manual');
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'create-skipped' })]);
	});

	it('writes the anchor before a trailing block id and leaves the block id out of the Todoist content', async () => {
		await syncNow('manual');
		addToWork('- [ ] Call Bob ^blk-1');

		await syncNow('manual');
		const quiet = await syncNow('manual');

		const line = vault.files.get('Todoist/Work.md')!.split('\n').find((l) => l.startsWith('- [ ] Call Bob'));
		const anchor = /🆔 (td-[0-9a-z]{8}) \^blk-1$/u.exec(line ?? '')?.[1];
		expect(anchor).toBeDefined();
		expect(adds().map((c) => c.args.content)).toEqual(['Call Bob']);
		expect(itemsNamed('Call Bob')).toHaveLength(1);
		expect(vault.links.get(anchor!)!.todoistId).toBe(itemsNamed('Call Bob')[0].id);
		expect(quiet).toEqual({ ok: true, message: 'Todoist sync done: nothing new.' });
	});

	it('sends a recurring line as date + rule, and one without a 📅 as the rule alone; that line gets Todoist first date', async () => {
		await syncNow('manual');
		addToWork('- [ ] Pay 📅 2026-11-16 🔁 every week');
		addToWork('- [ ] Rent 🔁 every month');

		await syncNow('manual');
		await syncNow('manual');

		expect(adds().map((c) => c.args.due)).toEqual([{ date: '2026-11-16', string: 'every week', lang: 'en' }, { string: 'every month' }]);
		expect(itemsNamed('Pay')[0].due).toMatchObject({ is_recurring: true, string: 'every week', date: '2026-11-16' });
		const rent = bornAnchor('Todoist/Work.md', '- [ ] Rent');
		expect(vault.files.get('Todoist/Work.md')).toContain(`- [ ] Rent 🔁 every month 📅 2026-12-01 🆔 ${rent}`);
		expect(adds()).toHaveLength(2);
	});

	it('adds the personal label in a personal vault, and no context label in a work vault', async () => {
		await syncNow('manual');
		addToWork('- [ ] Work thing #deep');
		await syncNow('manual');
		settingsStore.updateTodoist({ syncContext: 'personal' });
		addToWork('- [ ] Home thing #deep');
		await syncNow('manual');

		expect(adds().map((c) => c.args.labels)).toEqual([['deep'], ['deep', 'personal']]);
	});
});

describe('syncNow: a create whose response is lost', () => {
	/** Applies every command request, then loses its response (the SDK retries replay the uuid). */
	function loseCommandResponses(): () => void {
		let losing = true;
		fake.current = {
			async fetch(url, init) {
				const response = await server.fetch(url, init);
				if (losing && String(init?.body).includes('"commands"')) throw new TypeError('Network request failed');
				return response;
			},
		};
		return () => (losing = false);
	}

	it('pairs the task the next pull brings by its kokobrain: line: no second task, no second line', async () => {
		await syncNow('manual');
		addToWork('- [ ] Call Bob');
		const restore = loseCommandResponses();
		expect((await syncNow('manual')).ok).toBe(false);
		const anchor = bornAnchor('Todoist/Work.md', '- [ ] Call Bob');
		expect(vault.links.get(anchor)).toMatchObject({ todoistId: null, pendingUuid: expect.any(String) });
		expect(itemsNamed('Call Bob')).toHaveLength(1);
		restore();
		const sentBefore = adds().length;

		await syncNow('manual');
		await syncNow('manual');

		expect(adds()).toHaveLength(sentBefore);
		expect(itemsNamed('Call Bob')).toHaveLength(1);
		expect(vault.links.get(anchor)).toMatchObject({ todoistId: itemsNamed('Call Bob')[0].id, pendingUuid: null, pendingCmd: null });
		expect(vault.files.get('Todoist/Work.md')!.match(/Call Bob/gu)).toHaveLength(1);
	});

	it('pairs by content and project when the kokobrain: line was removed in Todoist', async () => {
		await syncNow('manual');
		addToWork('- [ ] Call Bob');
		const restore = loseCommandResponses();
		await syncNow('manual');
		restore();
		server.updateItem(itemsNamed('Call Bob')[0].id, { description: 'notes typed in Todoist' });

		await syncNow('manual');

		const anchor = bornAnchor('Todoist/Work.md', '- [ ] Call Bob');
		expect(itemsNamed('Call Bob')).toHaveLength(1);
		expect(vault.links.get(anchor)!.todoistId).toBe(itemsNamed('Call Bob')[0].id);
		expect(vault.files.get('Todoist/Work.md')!.match(/Call Bob/gu)).toHaveLength(1);
	});

	it('resends the same uuid when the request never reached Todoist, creating the task once', async () => {
		await syncNow('manual');
		addToWork('- [ ] Call Bob');
		let offline = true;
		fake.current = {
			fetch(url, init) {
				if (offline && String(init?.body).includes('"commands"')) return Promise.reject(new TypeError('Network request failed'));
				return server.fetch(url, init);
			},
		};
		expect((await syncNow('manual')).ok).toBe(false);
		const anchor = bornAnchor('Todoist/Work.md', '- [ ] Call Bob');
		const uuid = vault.links.get(anchor)!.pendingUuid;
		offline = false;

		await syncNow('manual');

		expect(new Set(adds().map((c) => c.uuid))).toEqual(new Set([uuid]));
		expect(itemsNamed('Call Bob')).toHaveLength(1);
		expect(vault.links.get(anchor)!.todoistId).toBe(itemsNamed('Call Bob')[0].id);
	});

	it('detaches a pending add whose line was deleted after 3 missing scans, and never sends it', async () => {
		await syncNow('manual');
		addToWork('- [ ] Call Bob');
		fake.current = {
			fetch(url, init) {
				if (String(init?.body).includes('"commands"')) return Promise.reject(new TypeError('Network request failed'));
				return server.fetch(url, init);
			},
		};
		expect((await syncNow('manual')).ok).toBe(false);
		const anchor = bornAnchor('Todoist/Work.md', '- [ ] Call Bob');
		edit('Todoist/Work.md', `- [ ] Call Bob 🆔 ${anchor}\n`, '');
		fake.current = server;

		await syncNow('manual');
		await syncNow('manual');
		expect(missCount(anchor)).toBe(2);
		expect(detachLog(anchor)).toEqual([]);
		await syncNow('manual');

		expect(vault.links.get(anchor)).toMatchObject({ todoistId: null, pendingCmd: null, missCount: 3 });
		expect(detachLog(anchor)).toEqual([expect.objectContaining({ message: expect.stringContaining('not found in the vault') })]);
		addToWork(`- [ ] Call Bob 🆔 ${anchor}`);
		await syncNow('manual');
		expect(adds()).toEqual([]);
		expect(itemsNamed('Call Bob')).toEqual([]);
	});

	it('pairs brain-born tasks by their kokobrain: line in rebuild mode after the sync state is lost', async () => {
		await syncNow('manual');
		addToWork('- [ ] Call Bob');
		await syncNow('manual');
		const anchor = bornAnchor('Todoist/Work.md', '- [ ] Call Bob');
		vault.links.clear();
		vault.kv.clear();
		const files = new Map(vault.files);

		const rebuilt = await syncNow('manual');
		await syncNow('manual');

		expect(rebuilt.message).toBe('Todoist sync rebuilt 4 links from the vault; nothing was created.');
		expect(adds()).toHaveLength(1);
		expect(itemsNamed('Call Bob')).toHaveLength(1);
		expect(vault.files).toEqual(files);
		expect(vault.links.get(anchor)!.todoistId).toBe(itemsNamed('Call Bob')[0].id);
	});
});

describe('syncNow: creates that never happen', () => {
	it('never sends item_add for a detached line that comes back, or an anchored line without a link row', async () => {
		await syncNow('manual');
		server.updateItem('w1', { is_deleted: true });
		await syncNow('manual');
		removeW1();
		await syncNow('manual');
		addToWork(W1_OPEN);
		addToWork('- [ ] Orphan 🆔 td-zzzzzzzz');

		await syncNow('manual');
		await syncNow('manual');

		expect(adds()).toEqual([]);
		expect(vault.links.get('td-w1')!.missCount).toBe(3);
	});

	it('logs a brain-born anchor with no link and no task on manual cycles only, and never creates it', async () => {
		await syncNow('manual');
		addToWork('- [ ] Orphan 🆔 td-zzzzzzzz');
		const orphanLog = () => vault.log.filter((e) => e.kind === 'orphan-anchor');

		await syncNow('auto');
		await syncNow('auto');
		expect(orphanLog()).toEqual([]);
		await syncNow('manual');

		expect(orphanLog()).toEqual([expect.objectContaining({ anchor: 'td-zzzzzzzz', message: expect.stringContaining('remove its 🆔') })]);
		expect(adds()).toEqual([]);
		expect(vault.links.has('td-zzzzzzzz')).toBe(false);
	});

	it('treats a refused item_add as terminal: logged, the line detached and kept, never resent', async () => {
		await syncNow('manual');
		server.refuseAddsIn('work');
		addToWork('- [ ] Call Bob');

		await syncNow('manual');
		await syncNow('manual');

		const anchor = bornAnchor('Todoist/Work.md', '- [ ] Call Bob');
		expect(adds()).toHaveLength(1);
		expect(vault.links.get(anchor)).toMatchObject({ todoistId: null, pendingUuid: null, pendingCmd: null, missCount: 3 });
		expect(vault.log).toContainEqual(expect.objectContaining({ kind: 'command-error', anchor, message: expect.stringContaining('item_add') }));
	});

	it('creates nothing in rebuild mode, and leaves first_run_done for the normal cycle that previews', async () => {
		vault.files.set('Notes/Old.md', '- [ ] Old 🆔 td-gone\n- [ ] Call Bob #todoist\n');

		await syncNow('manual');

		expect(adds()).toEqual([]);
		expect(vault.files.get('Notes/Old.md')).toBe('- [ ] Old 🆔 td-gone\n- [ ] Call Bob #todoist\n');
		expect(vault.kv.has('first_run_done')).toBe(false);
	});
});

describe('syncNow: the first run is a preview', () => {
	beforeEach(() => {
		vault.files.set('Todoist/Work.md', '---\ntodoist_project: work\n---\n- [ ] Call Bob\n- [ ] Write spec\n');
	});

	it('asks with the count before sending anything; Cancel sends nothing and leaves first_run_done unset', async () => {
		vi.mocked(ask).mockResolvedValue(false);
		const files = new Map(vault.files);

		const outcome = await syncNow('manual');

		expect(vi.mocked(ask)).toHaveBeenCalledWith(expect.stringContaining('create 2 tasks in Todoist'), expect.objectContaining({ title: 'Todoist sync' }));
		expect(outcome).toEqual({ ok: false, message: 'Todoist sync cancelled; nothing was changed.', failure: { kind: 'error' } });
		expect(commandRequests()).toEqual([]);
		expect(vault.files).toEqual(files);
		expect(vault.kv.has('first_run_done')).toBe(false);
	});

	it('creates them once confirmed, and sets first_run_done with the state', async () => {
		vi.mocked(ask).mockResolvedValue(true);

		const outcome = await syncNow('manual');

		expect(adds().map((c) => c.args.content)).toEqual(['Call Bob', 'Write spec']);
		expect(vault.kv.get('first_run_done')).toBe('1');
		expect(outcome.message).toBe('Todoist sync done: 2 notes created, 3 tasks added, 2 tasks created in Todoist.');
	});

	it('sets first_run_done without asking when the first run creates nothing', async () => {
		vault.files.set('Todoist/Work.md', '---\ntodoist_project: work\n---\n');

		await syncNow('manual');

		expect(vi.mocked(ask)).not.toHaveBeenCalled();
		expect(vault.kv.get('first_run_done')).toBe('1');
	});

	it('never creates, asks or sets first_run_done in an automatic cycle before the first run', async () => {
		const outcome = await syncNow('auto');

		expect(vi.mocked(ask)).not.toHaveBeenCalled();
		expect(adds()).toEqual([]);
		expect(outcome).toMatchObject({ ok: true, skippedCreates: 2 });
		expect(vault.kv.has('first_run_done')).toBe(false);
		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] Call Bob\n');
	});
});

describe('syncNow: create cap', () => {
	/** After the first run, adds `n` new lines to the Work note. */
	async function writeMany(n: number) {
		await syncNow('manual');
		for (let i = 1; i <= n; i++) addToWork(`- [ ] New ${i}`);
	}

	it('asks before more than 25 creates; Cancel changes nothing', async () => {
		await writeMany(26);
		vi.mocked(ask).mockResolvedValue(false);
		const files = new Map(vault.files);

		const outcome = await syncNow('manual');

		expect(vi.mocked(ask)).toHaveBeenCalledWith(expect.stringContaining('create 26 tasks'), expect.objectContaining({ title: 'Todoist sync' }));
		expect(outcome.ok).toBe(false);
		expect(commandRequests()).toEqual([]);
		expect(vault.files).toEqual(files);
	});

	it('creates them all on Sync, and does not ask at 25', async () => {
		await writeMany(25);
		await syncNow('manual');
		expect(vi.mocked(ask)).not.toHaveBeenCalled();
		for (let i = 26; i <= 52; i++) addToWork(`- [ ] New ${i}`);
		vi.mocked(ask).mockResolvedValue(true);

		await syncNow('manual');

		expect(adds()).toHaveLength(52);
	});

	it('never asks in an automatic cycle: it skips the creates and runs the rest', async () => {
		await writeMany(26);
		server.updateItem('w1', { checked: true });

		const outcome = await syncNow('auto');

		expect(vi.mocked(ask)).not.toHaveBeenCalled();
		expect(outcome).toEqual({ ok: true, message: 'Todoist sync done: 1 line updated.', skippedCreates: 26 });
		expect(adds()).toEqual([]);
		expect(vault.files.get('Todoist/Work.md')).toContain('- [ ] New 1\n');
		expect(vault.files.get('Todoist/Work.md')).toContain(W1_DONE);
	});
});

/** The stored project state (`todoist_kv` row `projects`). */
const projectState = () => JSON.parse(vault.kv.get('projects')!) as { bases: Record<string, { name: string; relPath: string; detached?: boolean }>; pending: unknown[]; refused: string[] };
/** Every command Todoist received, in order. */
const sentCommands = () => commandRequests().flatMap((r) => r.commands!);
const projectsNamed = (name: string) => server.projects().filter((p) => p.name === name);
/** The `todoist_project` id written to a note's frontmatter. */
const noteProjectId = (relPath: string) => /^---\ntodoist_project: (\S+)\n---\n/u.exec(vault.files.get(relPath) ?? '')?.[1];

describe('syncNow: a note becomes a Todoist project', () => {
	it('sends project_add under the root and its tasks with the temp id in one request, then writes the id to the note', async () => {
		await syncNow('manual');
		vault.files.set('Todoist/Launch.md', '- [ ] Outline\n- [ ] Rehearse\n');

		const outcome = await syncNow('manual');

		const [request] = commandRequests();
		expect(request.commands!.map((c) => c.type)).toEqual(['project_add', 'item_add', 'item_add']);
		const [projectAdd, ...itemAdds] = request.commands!;
		expect(projectAdd).toMatchObject({ args: { name: 'Launch', parent_id: 'work' }, temp_id: expect.any(String), uuid: expect.any(String) });
		expect(itemAdds.map((c) => c.args.project_id)).toEqual([projectAdd.temp_id, projectAdd.temp_id]);
		const [launch] = projectsNamed('Launch');
		expect(launch.parent_id).toBe('work');
		expect(itemsNamed('Outline')[0].project_id).toBe(launch.id);
		expect(noteProjectId('Todoist/Launch.md')).toBe(launch.id);
		const plan = bornAnchor('Todoist/Launch.md', '- [ ] Outline');
		expect(remoteBase(plan).projectId).toBe(launch.id);
		expect(projectState().bases[launch.id]).toMatchObject({ name: 'Launch', relPath: 'Todoist/Launch.md' });
		expect(projectState().pending).toEqual([]);
		expect(outcome).toEqual({ ok: true, message: 'Todoist sync done: 2 tasks created in Todoist, 1 project created in Todoist.' });
	});

	it('writes the id to the tab of an open note without saving it: the file stays as it was', async () => {
		await syncNow('manual');
		const content = '- [ ] Outline\n';
		vault.files.set('Todoist/Launch.md', content);
		const path = '/work-vault/Todoist/Launch.md';
		editorStore.addTab({ path, name: 'Launch.md', content, savedContent: content });

		await syncNow('manual');

		const [launch] = projectsNamed('Launch');
		const tab = editorStore.tabs.find((t) => t.path === path)!;
		expect(tab.content).toMatch(new RegExp(`^---\\ntodoist_project: ${launch.id}\\n---\\n- \\[ \\] Outline 🆔 td-`, 'u'));
		expect(tab.savedContent).toBe(content);
		expect(vault.files.get('Todoist/Launch.md')).toBe(content);
		expect(projectState().bases[launch.id]).toMatchObject({ name: 'Launch', relPath: 'Todoist/Launch.md' });
	});

	it('sends a line with the real project id when its project_add went out in an earlier request of the cycle', async () => {
		await syncNow('manual');
		for (let i = 1; i <= 100; i++) addToWork(`- [ ] New ${i}`);
		vault.files.set('Todoist/Zed.md', '- [ ] Outline\n');
		vi.mocked(ask).mockResolvedValue(true);

		await syncNow('manual');

		const [first, second] = commandRequests();
		const [zed] = projectsNamed('Zed');
		const projectAdd = first.commands!.find((c) => c.type === 'project_add')!;
		const outline = second.commands!.find((c) => c.args.content === 'Outline')!;
		expect(outline.args.project_id).toBe(zed.id);
		expect(outline.args.project_id).not.toBe(projectAdd.temp_id);
		expect(itemsNamed('Outline')[0].project_id).toBe(zed.id);
		expect(vault.links.get(bornAnchor('Todoist/Zed.md', '- [ ] Outline'))).toMatchObject({ todoistId: itemsNamed('Outline')[0].id, missCount: 0 });
	});

	it('resends a line with the real project id after its project was acknowledged in an earlier cycle', async () => {
		await syncNow('manual');
		vault.files.set('Todoist/Launch.md', '- [ ] Outline\n');
		let failLines = true;
		fake.current = {
			async fetch(url, init) {
				const body = JSON.parse(String(init?.body ?? '{}')) as { commands?: { type: string; uuid: string }[] };
				if (!failLines || !body.commands?.some((c) => c.type === 'project_add')) return server.fetch(url, init);
				failLines = false;
				// The project is created; its lines get a non-terminal failure and are resent next cycle.
				const held = body.commands.filter((c) => c.type === 'item_add');
				const response = await server.fetch(url, { ...init, body: JSON.stringify({ ...body, commands: body.commands.filter((c) => c.type !== 'item_add') }) });
				const json = (await response.json()) as { sync_status: Record<string, unknown> };
				for (const c of held) json.sync_status[c.uuid] = { error: 'Service unavailable', error_code: 0, error_extra: {}, error_tag: 'SERVICE_UNAVAILABLE', http_code: 503 };
				return new Response(JSON.stringify(json), { status: 200, headers: { 'content-type': 'application/json' } });
			},
		};
		await syncNow('manual');
		const [launch] = projectsNamed('Launch');
		expect(noteProjectId('Todoist/Launch.md')).toBe(launch.id);
		expect(itemsNamed('Outline')).toEqual([]);

		await syncNow('manual');

		const resend = adds().at(-1)!;
		expect(resend.args.project_id).toBe(launch.id);
		expect(itemsNamed('Outline')).toHaveLength(1);
		expect(itemsNamed('Outline')[0].project_id).toBe(launch.id);
		expect(vault.links.get(bornAnchor('Todoist/Launch.md', '- [ ] Outline'))).toMatchObject({ todoistId: itemsNamed('Outline')[0].id, missCount: 0, pendingCmd: null });
	});

	it('stores the pending project_add before sending it', async () => {
		await syncNow('manual');
		vault.files.set('Todoist/Launch.md', '- [ ] Outline\n');
		let pendingAtSend: unknown[] | null = null;
		fake.current = {
			fetch(url, init) {
				if (String(init?.body).includes('"project_add"')) pendingAtSend = projectState().pending;
				return server.fetch(url, init);
			},
		};

		await syncNow('manual');

		expect(pendingAtSend).toEqual([expect.objectContaining({ relPath: 'Todoist/Launch.md', args: { name: 'Launch', parentId: 'work' } })]);
	});

	it('creates nothing more on the next cycles: no second project, no second note', async () => {
		await syncNow('manual');
		vault.files.set('Todoist/Launch.md', '- [ ] Outline\n');
		await syncNow('manual');
		const files = new Map(vault.files);
		const sent = sentCommands().length;

		const quiet = await syncNow('manual');

		expect(quiet).toEqual({ ok: true, message: 'Todoist sync done: nothing new.' });
		expect(sentCommands()).toHaveLength(sent);
		expect(vault.files).toEqual(files);
		expect(projectsNamed('Launch')).toHaveLength(1);
	});

	it('resolves a lost project_add response by the resend: one project, one note, its tasks paired', async () => {
		await syncNow('manual');
		vault.files.set('Todoist/Launch.md', '- [ ] Outline\n');
		let losing = true;
		fake.current = {
			async fetch(url, init) {
				const response = await server.fetch(url, init);
				if (losing && String(init?.body).includes('"commands"')) throw new TypeError('Network request failed');
				return response;
			},
		};
		expect((await syncNow('manual')).ok).toBe(false);
		losing = false;

		await syncNow('manual');
		await syncNow('manual');

		const [launch] = projectsNamed('Launch');
		expect(projectsNamed('Launch')).toHaveLength(1);
		expect(itemsNamed('Outline')).toHaveLength(1);
		expect([...vault.files.keys()].filter((p) => p.startsWith('Todoist/Launch'))).toEqual(['Todoist/Launch.md']);
		expect(noteProjectId('Todoist/Launch.md')).toBe(launch.id);
		const plan = bornAnchor('Todoist/Launch.md', '- [ ] Outline');
		expect(vault.links.get(plan)).toMatchObject({ todoistId: itemsNamed('Outline')[0].id, pendingCmd: null });
		expect(remoteBase(plan).projectId).toBe(launch.id);
	});

	it('creates no project for a note in a subfolder, outside the sync folder, or one that names a project already', async () => {
		await syncNow('manual');
		vault.files.set('Todoist/Sub/Deep.md', '- [ ] Deep\n');
		vault.files.set('Notes/Day.md', '- [ ] Elsewhere\n');
		vault.files.set('Todoist/Other.md', '---\ntodoist_project: personal\n---\n- [ ] Other\n');

		await syncNow('manual');

		expect(sentCommands()).toEqual([]);
		expect(server.projects()).toHaveLength(5);
	});

	it('refuses a note Todoist refuses for good: logged, its lines detached, never sent again', async () => {
		await syncNow('manual');
		server.refuseProjectCommands();
		vault.files.set('Todoist/Launch.md', '- [ ] Outline\n');

		await syncNow('manual');
		const sent = sentCommands().length;
		await syncNow('manual');

		expect(sentCommands()).toHaveLength(sent);
		expect(projectState().refused).toEqual(['Todoist/Launch.md']);
		expect(missCount(bornAnchor('Todoist/Launch.md', '- [ ] Outline'))).toBe(3);
		expect(vault.log.filter((e) => e.kind === 'command-error').map((e) => e.message)).toEqual([
			expect.stringContaining('project_add for Todoist/Launch.md'),
			expect.stringContaining('item_add'),
		]);
	});

	it('leaves a new project out of an automatic cycle over the cap, counted as skipped creates', async () => {
		await syncNow('manual');
		for (let i = 1; i <= 26; i++) vault.files.set(`Todoist/New ${i}.md`, '');

		const outcome = await syncNow('auto');

		expect(outcome.skippedCreates).toBe(26);
		expect(sentCommands()).toEqual([]);
		expect(projectState().pending).toEqual([]);
	});
});

describe('syncNow: project renames', () => {
	it('renames the note through the path-change service after a Todoist rename', async () => {
		await syncNow('manual');
		const content = vault.files.get('Todoist/Q4.md');
		server.updateProject('q4', { name: 'Q4: Launch' });

		const outcome = await syncNow('manual');

		expect(vault.files.has('Todoist/Q4.md')).toBe(false);
		expect(vault.files.get('Todoist/Q4- Launch.md')).toBe(content);
		expect(invoke).toHaveBeenCalledWith('rename_note', { from: '/work-vault/Todoist/Q4.md', to: '/work-vault/Todoist/Q4- Launch.md' });
		expect(projectState().bases.q4).toEqual({ name: 'Q4: Launch', relPath: 'Todoist/Q4- Launch.md' });
		expect(outcome).toEqual({ ok: true, message: 'Todoist sync done: 1 project renamed.' });
		expect(await syncNow('manual')).toEqual({ ok: true, message: 'Todoist sync done: nothing new.' });
		expect(sentCommands()).toEqual([]);
	});

	it('keeps syncing the renamed note: a later Todoist edit reaches its line', async () => {
		await syncNow('manual');
		server.updateProject('q4', { name: 'Quarter' });
		await syncNow('manual');
		server.updateItem('q1', { content: 'Ship it' });

		await syncNow('manual');

		expect(vault.files.get('Todoist/Quarter.md')).toContain('- [ ] Ship it 🆔 td-q1');
	});

	it('sends project_update with the new file name after a note rename, once', async () => {
		await syncNow('manual');
		vault.files.set('Todoist/Q4 Plan.md', vault.files.get('Todoist/Q4.md')!);
		vault.files.delete('Todoist/Q4.md');

		const outcome = await syncNow('manual');
		await syncNow('manual');

		expect(sentCommands().map((c) => [c.type, c.args])).toEqual([['project_update', { id: 'q4', name: 'Q4 Plan' }]]);
		expect(server.project('q4')!.name).toBe('Q4 Plan');
		expect(projectState().bases.q4).toEqual({ name: 'Q4 Plan', relPath: 'Todoist/Q4 Plan.md' });
		expect(outcome).toEqual({ ok: true, message: 'Todoist sync done: 1 project renamed.' });
	});

	it('lets Todoist win when both sides renamed, logging the note name', async () => {
		await syncNow('manual');
		vault.files.set('Todoist/Mine.md', vault.files.get('Todoist/Q4.md')!);
		vault.files.delete('Todoist/Q4.md');
		server.updateProject('q4', { name: 'Theirs' });

		await syncNow('manual');

		expect(vault.files.has('Todoist/Theirs.md')).toBe(true);
		expect(vault.files.has('Todoist/Mine.md')).toBe(false);
		expect(server.project('q4')!.name).toBe('Theirs');
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'conflict', message: expect.stringContaining('Mine') })]);
	});
});

describe('syncNow: archived and deleted projects', () => {
	it('writes no Todoist edit to the note of an archived project, links kept, and resumes on unarchive', async () => {
		await syncNow('manual');
		server.updateProject('q4', { is_archived: true });
		server.updateItem('q1', { priority: 4 });
		const files = new Map(vault.files);

		await syncNow('manual');

		expect(vault.files).toEqual(files);
		expect(missCount('td-q1')).toBe(0);
		expect(vault.log.filter((e) => e.kind === 'detach')).toEqual([]);

		server.updateProject('q4', { is_archived: false });
		await syncNow('manual');

		expect(vault.files.get('Todoist/Q4.md')).toContain('- [ ] Ship 🔺 🆔 td-q1');
	});

	it('sends no brain edit of an archived project, and sends it on unarchive', async () => {
		await syncNow('manual');
		server.updateProject('q4', { is_archived: true });
		edit('Todoist/Q4.md', '- [ ] Ship', '- [x] Ship');

		await syncNow('manual');
		expect(sentCommands()).toEqual([]);
		expect(projectState().bases.q4).toEqual({ name: 'Q4', relPath: 'Todoist/Q4.md' });

		server.updateProject('q4', { is_archived: false });
		await syncNow('manual');

		expect(sentCommands().map((c) => [c.type, c.args.id])).toEqual([['item_close', 'q1']]);
	});

	it('detaches the note and the links of a deleted project, deleting nothing, logged', async () => {
		await syncNow('manual');
		server.updateProject('q4', { is_deleted: true });
		const files = new Map(vault.files);

		await syncNow('manual');

		expect(vault.files).toEqual(files);
		expect(missCount('td-q1')).toBe(3);
		expect(projectState().bases.q4).toMatchObject({ detached: true });
		expect(vault.log.filter((e) => e.kind === 'detach').map((e) => [e.anchor, e.message.includes('deleted')])).toEqual([
			[null, true],
			['td-q1', true],
		]);
	});

	it('detaches the note of a project deleted between the two pulls of one cycle', async () => {
		await syncNow('manual');
		let deleteAfterFullPull = true;
		fake.current = {
			async fetch(url, init) {
				const response = await server.fetch(url, init);
				if (deleteAfterFullPull && String(init?.body).includes('"sync_token":"*"')) {
					deleteAfterFullPull = false;
					server.updateProject('q4', { is_deleted: true });
				}
				return response;
			},
		};

		await syncNow('manual');

		expect(missCount('td-q1')).toBe(3);
		expect(projectState().bases.q4).toMatchObject({ detached: true });
	});
});

describe('syncNow: two notes naming one project', () => {
	it('freezes the project: nothing of it syncs either way, logged', async () => {
		await syncNow('manual');
		vault.files.set('Notes/Copy.md', '---\ntodoist_project: work\n---\n');
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		server.updateItem('w2', { content: 'Report v2' });
		const files = new Map(vault.files);

		await syncNow('manual');

		expect(vault.files).toEqual(files);
		expect(sentCommands()).toEqual([]);
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'duplicate-project-note' })]);
	});
});

describe('syncNow: projects moving across the tree', () => {
	it('detaches the note and links of a project moved out of the tree, deleting nothing, logged', async () => {
		await syncNow('manual');
		server.updateProject('q4', { parent_id: 'personal' });
		const files = new Map(vault.files);

		await syncNow('manual');

		expect(vault.files).toEqual(files);
		expect(missCount('td-q1')).toBe(3);
		expect(projectState().bases.q4).toMatchObject({ detached: true });
		expect(vault.log.filter((e) => e.kind === 'detach').map((e) => e.anchor)).toEqual([null, 'td-q1']);
		expect(vault.log.find((e) => e.anchor === null)!.message).toContain('outside');
	});

	it('gives a project moved into the tree a note with its tasks', async () => {
		server.addProject({ id: 'side', name: 'Side', parent_id: 'personal' });
		server.addItem({ id: 's1', project_id: 'side', content: 'Side task' });
		await syncNow('manual');
		expect(vault.files.has('Todoist/Side.md')).toBe(false);
		server.updateProject('side', { parent_id: 'work' });

		await syncNow('manual');

		expect(vault.files.get('Todoist/Side.md')).toBe('---\ntodoist_project: side\n---\n- [ ] Side task 🆔 td-s1\n');
	});

	it('ignores projects outside the tree: created, renamed or deleted there', async () => {
		await syncNow('manual');
		const files = new Map(vault.files);
		const state = vault.kv.get('projects');
		server.addProject({ id: 'side', name: 'Side', parent_id: 'personal' });
		server.updateProject('personal', { name: 'Home' });
		server.updateProject('inbox', { is_deleted: true });

		const outcome = await syncNow('manual');

		expect(outcome).toEqual({ ok: true, message: 'Todoist sync done: nothing new.' });
		expect(vault.files).toEqual(files);
		expect(vault.kv.get('projects')).toBe(state);
		expect(vault.log).toEqual([]);
	});
});

/** A section `sn` named Next in the Work project, holding `w3` (Hire). */
function seedNextSection() {
	server.addSection({ id: 'sn', project_id: 'work', name: 'Next' });
	server.addItem({ id: 'w3', project_id: 'work', section_id: 'sn', content: 'Hire', child_order: 3 });
}

const HIRE = '- [ ] Hire 🆔 td-w3';
const sectionsNamed = (name: string) => server.sections().filter((s) => s.name === name);

describe('syncNow: sections from Todoist', () => {
	it('writes a section as a ## heading with its tasks under it, the tasks of no section above the sections', async () => {
		seedNextSection();

		const outcome = await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toBe(`${WORK_NOTE}\n## Next\n${HIRE}\n`);
		expect([...vault.sections.values()]).toEqual([{ todoistSectionId: 'sn', projectId: 'work', heading: 'Next' }]);
		expect(localBase('td-w3').location).toEqual({ projectId: 'work', sectionId: 'sn' });
		expect(localBase('td-w1').location).toEqual({ projectId: 'work', sectionId: null });
		expect(outcome.message).toBe('Todoist sync done: 3 notes created, 4 tasks added, 1 heading written.');
		expect(await syncNow('manual')).toEqual({ ok: true, message: 'Todoist sync done: nothing new.' });
	});

	it('appends a section added later at the end of the note, and a new task of no section above the sections', async () => {
		await syncNow('manual');
		server.addSection({ id: 'sl', project_id: 'work', name: 'Later' });
		server.addItem({ id: 'w3', project_id: 'work', section_id: 'sl', content: 'Hire', child_order: 3 });
		server.addItem({ id: 'w4', project_id: 'work', content: 'Call', child_order: 4 });

		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toBe(`${WORK_NOTE}- [ ] Call 🆔 td-w4\n\n## Later\n${HIRE}\n`);
		expect(vault.sections.get('sl')).toEqual({ todoistSectionId: 'sl', projectId: 'work', heading: 'Later' });
	});

	it('renames the heading of a section renamed in Todoist, its tasks staying under it', async () => {
		seedNextSection();
		await syncNow('manual');
		server.updateSection('sn', { name: 'Now' });

		const outcome = await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toBe(`${WORK_NOTE}\n## Now\n${HIRE}\n`);
		expect(vault.sections.get('sn')).toEqual({ todoistSectionId: 'sn', projectId: 'work', heading: 'Now' });
		expect(outcome.message).toBe('Todoist sync done: 1 heading written.');
		expect(await syncNow('manual')).toEqual({ ok: true, message: 'Todoist sync done: nothing new.' });
		expect(sentCommands()).toEqual([]);
	});

	it('pairs a section with a heading of the same text instead of writing a second one', async () => {
		await syncNow('manual');
		vault.files.set('Todoist/Work.md', `${WORK_NOTE}\n## Next\n`);
		seedNextSection();

		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toBe(`${WORK_NOTE}\n## Next\n${HIRE}\n`);
		expect(vault.sections.get('sn')?.heading).toBe('Next');
		expect(sentCommands()).toEqual([]);
	});

	it('writes the ## heading of a section whose name a ### heading of the note has, and keeps writing the note', async () => {
		await syncNow('manual');
		addToWork('### Next');
		seedNextSection();

		await syncNow('manual');
		server.addItem({ id: 'w4', project_id: 'work', content: 'Call', child_order: 4 });
		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toBe(`${WORK_NOTE}### Next\n- [ ] Call 🆔 td-w4\n\n## Next\n${HIRE}\n`);
		expect(vault.log.filter((e) => e.kind === 'stale')).toEqual([]);
	});

	it('writes no heading in rebuild mode, but pairs one that is there', async () => {
		seedNextSection();
		await syncNow('manual');
		server.addSection({ id: 'sl', project_id: 'work', name: 'Later' });
		vault.links.clear();
		vault.sections.clear();
		const files = new Map(vault.files);

		await syncNow('manual');

		expect(vault.files).toEqual(files);
		expect([...vault.sections.keys()]).toEqual(['sn']);
	});
});

describe('syncNow: task moves from Todoist', () => {
	it('moves the line of a task moved into a section under its heading, same anchor, in one write', async () => {
		seedNextSection();
		await syncNow('manual');
		const writes = vault.writes.length;
		server.updateItem('w1', { section_id: 'sn' });

		const outcome = await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toBe(`---\ntodoist_project: work\n---\n${W2_OPEN}\n\n## Next\n${HIRE}\n${W1_OPEN}\n`);
		expect(vault.writes.slice(writes)).toEqual(['Todoist/Work.md']);
		expect(localBase('td-w1').location).toEqual({ projectId: 'work', sectionId: 'sn' });
		expect(remoteBase('td-w1')).toMatchObject({ projectId: 'work', sectionId: 'sn' });
		expect(outcome.message).toBe('Todoist sync done: 1 line updated.');
		expect(await syncNow('manual')).toEqual({ ok: true, message: 'Todoist sync done: nothing new.' });
		expect(sentCommands()).toEqual([]);
	});

	it('moves the line of a task taken out of its section above the sections', async () => {
		seedNextSection();
		await syncNow('manual');
		server.updateItem('w3', { section_id: null });

		await syncNow('manual');

		expect(vault.files.get('Todoist/Work.md')).toBe(`${WORK_NOTE}${HIRE}\n\n## Next\n`);
		expect(sentCommands()).toEqual([]);
	});

	it('moves the line of a task moved to another project into its note: inserted there first, then removed here', async () => {
		await syncNow('manual');
		const writes = vault.writes.length;
		server.updateItem('w1', { project_id: 'acme' });

		await syncNow('manual');

		expect(vault.files.get('Todoist/Acme.md')).toBe(`---\ntodoist_project: acme\n---\n${W1_OPEN}\n`);
		expect(vault.files.get('Todoist/Work.md')).toBe(`---\ntodoist_project: work\n---\n${W2_OPEN}\n`);
		expect(vault.writes.slice(writes)).toEqual(['Todoist/Acme.md', 'Todoist/Work.md']);
		expect(vault.links.get('td-w1')).toMatchObject({ noteRelPath: 'Todoist/Acme.md', missCount: 0, frozen: false });
		expect(sentCommands()).toEqual([]);
		expect(await syncNow('manual')).toEqual({ ok: true, message: 'Todoist sync done: nothing new.' });
	});

	it('lets Todoist win a task moved on both sides, logging the brain place', async () => {
		seedNextSection();
		await syncNow('manual');
		edit('Todoist/Work.md', `${W1_OPEN}\n`, '');
		addToWork(W1_OPEN);
		server.updateItem('w1', { project_id: 'acme' });

		await syncNow('manual');

		expect(vault.files.get('Todoist/Acme.md')).toBe(`---\ntodoist_project: acme\n---\n${W1_OPEN}\n`);
		expect(vault.files.get('Todoist/Work.md')).not.toContain('td-w1');
		expect(sentCommands()).toEqual([]);
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'conflict', anchor: 'td-w1' })]);
	});
});

describe('syncNow: sections and moves from the brain', () => {
	it('creates a new ## heading that has a task line as a section, and moves its new task into it next cycle', async () => {
		await syncNow('manual');
		addToWork('');
		addToWork('## Errands');
		addToWork('- [ ] Buy milk');
		addToWork('## Empty');

		const outcome = await syncNow('manual');

		const [errands] = sectionsNamed('Errands');
		expect(errands).toMatchObject({ project_id: 'work' });
		expect(sectionsNamed('Empty')).toEqual([]);
		expect(vault.sections.get(errands.id)).toEqual({ todoistSectionId: errands.id, projectId: 'work', heading: 'Errands' });
		expect(itemsNamed('Buy milk')[0]).toMatchObject({ project_id: 'work', section_id: null });
		expect(outcome.message).toBe('Todoist sync done: 1 task created in Todoist, 1 section created in Todoist.');

		await syncNow('manual');

		expect(itemsNamed('Buy milk')[0]).toMatchObject({ project_id: 'work', section_id: errands.id });
		expect(sentCommands().map((c) => c.type)).toEqual(['item_add', 'section_add', 'item_move']);
		expect((await syncNow('manual')).message).toBe('Todoist sync done: nothing new.');
		expect(sentCommands()).toHaveLength(3);
	});

	it('creates a new line under a linked heading in its section', async () => {
		seedNextSection();
		await syncNow('manual');
		addToWork('- [ ] Interview');

		await syncNow('manual');

		expect(adds().map((c) => c.args)).toEqual([expect.objectContaining({ content: 'Interview', project_id: 'work', section_id: 'sn' })]);
		expect(itemsNamed('Interview')[0]).toMatchObject({ section_id: 'sn' });
		expect((await syncNow('manual')).message).toBe('Todoist sync done: nothing new.');
	});

	it('moves a task to the section its line moved under; the echo next cycle sends and writes nothing', async () => {
		seedNextSection();
		await syncNow('manual');
		edit('Todoist/Work.md', `${W1_OPEN}\n`, '');
		addToWork(W1_OPEN);

		const outcome = await syncNow('manual');

		expect(sentCommands().map((c) => [c.type, c.args])).toEqual([['item_move', { id: 'w1', section_id: 'sn' }]]);
		expect(server.item('w1')).toMatchObject({ project_id: 'work', section_id: 'sn' });
		expect(outcome.message).toBe('Todoist sync done: 1 task updated in Todoist.');
		const files = new Map(vault.files);
		expect((await syncNow('manual')).message).toBe('Todoist sync done: nothing new.');
		expect(sentCommands()).toHaveLength(1);
		expect(vault.files).toEqual(files);
	});

	it('moves a task out of its section when its line moves above the sections', async () => {
		seedNextSection();
		await syncNow('manual');
		vault.files.set('Todoist/Work.md', `${WORK_NOTE}${HIRE}\n\n## Next\n`);

		await syncNow('manual');

		expect(sentCommands().map((c) => [c.type, c.args])).toEqual([['item_move', { id: 'w3', project_id: 'work' }]]);
		expect(server.item('w3')).toMatchObject({ project_id: 'work', section_id: null });
	});

	it('moves a task to the project of the note its line moved into', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', `${W1_OPEN}\n`, '');
		vault.files.set('Todoist/Acme.md', `${vault.files.get('Todoist/Acme.md')!}${W1_OPEN}\n`);

		await syncNow('manual');

		expect(sentCommands().map((c) => [c.type, c.args])).toEqual([['item_move', { id: 'w1', project_id: 'acme' }]]);
		expect(server.item('w1')).toMatchObject({ project_id: 'acme' });
		expect(vault.links.get('td-w1')).toMatchObject({ noteRelPath: 'Todoist/Acme.md' });
		expect((await syncNow('manual')).message).toBe('Todoist sync done: nothing new.');
	});

	it('creates a renamed heading as a new section, keeps the old link (logged), and moves its tasks next cycle', async () => {
		seedNextSection();
		await syncNow('manual');
		edit('Todoist/Work.md', '## Next', '## Soon');

		await syncNow('manual');

		const [soon] = sectionsNamed('Soon');
		expect(soon).toMatchObject({ project_id: 'work' });
		expect(server.section('sn')).toMatchObject({ name: 'Next', is_deleted: false });
		expect(vault.sections.get('sn')).toMatchObject({ heading: 'Next' });
		expect(vault.log).toEqual([expect.objectContaining({ kind: 'section-renamed', message: expect.stringContaining('"Next"') })]);

		await syncNow('manual');

		expect(server.item('w3')).toMatchObject({ section_id: soon.id });
		expect(vault.files.get('Todoist/Work.md')).toBe(`${WORK_NOTE}\n## Soon\n${HIRE}\n`);
	});

	/** Moves `w1`'s line from the top of the Work note under a new `## Today` heading. */
	function moveW1UnderToday() {
		edit('Todoist/Work.md', `${W1_OPEN}\n`, '');
		addToWork('');
		addToWork('## Today');
		addToWork(W1_OPEN);
	}
	const TODAY_NOTE = `---\ntodoist_project: work\n---\n${W2_OPEN}\n\n## Today\n${W1_OPEN}\n`;

	it('moves a task whose link has no place yet into the section created for the heading its line sits under', async () => {
		await syncNow('manual');
		for (const [anchor, link] of vault.links) {
			const { location: _, ...local } = JSON.parse(link.localBase!);
			vault.links.set(anchor, { ...link, localBase: JSON.stringify(local) });
		}
		moveW1UnderToday();

		await syncNow('manual');
		await syncNow('manual');

		const [today] = sectionsNamed('Today');
		expect(server.item('w1')).toMatchObject({ project_id: 'work', section_id: today.id });
		expect(vault.files.get('Todoist/Work.md')).toBe(TODAY_NOTE);
		expect(sentCommands().map((c) => c.type)).toEqual(['section_add', 'item_move']);
		expect((await syncNow('manual')).message).toBe('Todoist sync done: nothing new.');
	});

	it('moves a task into the section of its new heading after a rebuild, then a normal cycle', async () => {
		await syncNow('manual');
		vault.links.clear();
		vault.sections.clear();
		moveW1UnderToday();

		await syncNow('manual');
		expect(sentCommands()).toEqual([]);
		await syncNow('manual');
		await syncNow('manual');

		const [today] = sectionsNamed('Today');
		expect(server.item('w1')).toMatchObject({ project_id: 'work', section_id: today.id });
		expect(vault.files.get('Todoist/Work.md')).toBe(TODAY_NOTE);
		expect(sentCommands().map((c) => c.type)).toEqual(['section_add', 'item_move']);
		expect((await syncNow('manual')).message).toBe('Todoist sync done: nothing new.');
	});

	it('logs a refused section_add on a manual cycle only, so automatic retries do not fill the sync log', async () => {
		await syncNow('manual');
		addToWork('## Errands');
		addToWork('- [ ] Buy milk');
		server.refuseSectionAdds();

		await syncNow('manual');
		await syncNow('auto');
		await syncNow('auto');

		expect(sentCommands().filter((c) => c.type === 'section_add')).toHaveLength(3);
		expect(vault.log.filter((e) => e.kind === 'command-error')).toEqual([expect.objectContaining({ message: expect.stringContaining('"Errands"') })]);
		expect(vault.sections.size).toBe(0);
	});

	it('logs a brain-renamed heading only once Todoist creates its section, so refused retries write no rename rows', async () => {
		seedNextSection();
		await syncNow('manual');
		edit('Todoist/Work.md', '## Next', '## Soon');
		server.refuseSectionAdds();

		await syncNow('manual');
		await syncNow('auto');
		await syncNow('auto');

		expect(sentCommands().filter((c) => c.type === 'section_add')).toHaveLength(3);
		expect(vault.log.map((e) => e.kind)).toEqual(['command-error']);
	});

	it('counts a new section as a create: an automatic cycle over the cap skips it', async () => {
		await syncNow('manual');
		for (let i = 1; i <= 26; i++) addToWork(`## S${i}\n- [ ] T${i} 🆔 td-x${i}`);

		const outcome = await syncNow('auto');

		expect(outcome.skippedCreates).toBe(26);
		expect(sentCommands()).toEqual([]);
	});
});

describe('syncNow: a line moved out of the sync scope', () => {
	it('detaches a line moved to a note that is no project note and has no #todoist; nothing moves in Todoist', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', `${W1_OPEN}\n`, '');
		vault.files.set('Notes/Day.md', `${W1_OPEN}\n`);

		await syncNow('manual');

		expect(missCount('td-w1')).toBe(3);
		expect(detachLog('td-w1')).toEqual([expect.objectContaining({ message: expect.stringContaining('scope') })]);
		expect(sentCommands()).toEqual([]);
		expect(server.item('w1')).toMatchObject({ project_id: 'work', section_id: null });
		expect(vault.files.get('Notes/Day.md')).toBe(`${W1_OPEN}\n`);
	});

	it('keeps a line moved to another note with #todoist linked, moving nothing either way', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', `${W1_OPEN}\n`, '');
		vault.files.set('Notes/Day.md', '- [ ] Plan 🔺 #deep #todoist 🆔 td-w1\n');
		server.updateItem('w1', { project_id: 'acme' });

		await syncNow('manual');

		expect(missCount('td-w1')).toBe(0);
		expect(sentCommands()).toEqual([]);
		expect(vault.files.get('Notes/Day.md')).toBe('- [ ] Plan 🔺 #deep #todoist 🆔 td-w1\n');
		expect(vault.files.get('Todoist/Acme.md')).not.toContain('td-w1');
		expect(remoteBase('td-w1')).toMatchObject({ projectId: 'acme' });
	});
});

describe('syncNow: every cycle leaves a record', () => {
	const record = (i = -1) => parseCycle(vault.cycles.at(i)!.message)!;
	/** Every `debug` line, as one string per call. */
	const debugLines = () => vi.mocked(debug).mock.calls.map((args) => args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));

	it('writes one cycle row for a manual cycle: mode, trigger, start, duration, counts, commands and the token', async () => {
		const before = Date.now();

		await syncNow('manual');

		expect(vault.cycles).toHaveLength(1);
		expect(vault.cycles[0]).toMatchObject({ kind: 'cycle', anchor: null });
		expect(record()).toMatchObject({
			mode: 'manual',
			trigger: 'manual',
			outcome: 'ok',
			counts: { mode: 'normal', notesCreated: 3, tasksInserted: 3, linesUpdated: 0, todoistUpdated: 0, todoistCreated: 0, detached: 0 },
			skipped: { pushes: 0, detaches: 0, fieldPushes: 0, creates: 0 },
			commands: {},
			tokenAdvanced: true,
			repeats: 1,
		});
		expect(record().startedAt).toBeGreaterThanOrEqual(before);
		expect(record().durationMs).toBeGreaterThanOrEqual(0);
	});

	it('counts the commands sent by type, and the trigger the scheduler names', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		edit('Todoist/Work.md', 'Report 📅', 'Report weekly 📅');

		await syncNow('auto', 'focus');

		expect(record()).toMatchObject({ mode: 'auto', trigger: 'focus', outcome: 'ok', commands: { item_close: 1, item_update: 1 }, counts: { todoistUpdated: 2 } });
	});

	it('writes a cycle row for a failed cycle, naming the failure kind', async () => {
		server.failNext({ kind: 'unauthorized' });

		await syncNow('manual');

		expect(vault.cycles).toHaveLength(1);
		expect(record()).toMatchObject({ outcome: 'invalid-token', counts: null, skipped: null, commands: {}, tokenAdvanced: false });
	});

	it('writes a cycle row for a cancelled cycle', async () => {
		vault.files.set('Todoist/Work.md', '---\ntodoist_project: work\n---\n- [ ] Call Bob\n');
		vi.mocked(ask).mockResolvedValue(false);

		await syncNow('manual');

		expect(record()).toMatchObject({ outcome: 'cancelled', counts: null, commands: {} });
	});

	it('writes nothing for a cycle refused before it starts, or stopped by a vault switch', async () => {
		vaultStore.resetIndexReady();
		await syncNow('manual');
		vaultStore.markIndexReady();
		settingsStore.updateTodoist({ syncEnabled: false });
		await syncNow('auto', 'interval');
		settingsStore.updateTodoist({ syncEnabled: true });
		todoistSyncStore.start();
		await syncNow('manual');
		todoistSyncStore.reset();
		expect(vault.cycles).toEqual([]);

		const first = vault;
		const second = createFakeVault('/other-vault');
		fake.current = {
			async fetch(url, init) {
				const response = await server.fetch(url, init);
				openVault(second);
				return response;
			},
		};
		await syncNow('manual');

		expect(first.cycles).toEqual([]);
		expect(second.cycles).toEqual([]);
	});

	it('keeps one row for a run of automatic cycles that changed nothing, and a new one once a cycle does', async () => {
		await syncNow('manual');
		for (let i = 0; i < 4; i++) await syncNow('auto', 'interval');

		expect(vault.cycles).toHaveLength(2);
		expect(record()).toMatchObject({ mode: 'auto', outcome: 'ok', repeats: 4 });

		server.updateItem('w1', { content: 'Plan more' });
		await syncNow('auto', 'interval');
		await syncNow('auto', 'interval');

		expect(vault.cycles.map((r) => parseCycle(r.message)!.repeats)).toEqual([1, 4, 1, 1]);
		expect(record(-2)).toMatchObject({ counts: { linesUpdated: 1 } });
	});

	it('does not fold a quiet cycle over an event logged after the last cycle row', async () => {
		await syncNow('manual');
		await syncNow('auto', 'interval');
		await vault.invoke('todoist_append_log', { vaultPath: vault.root, entries: [{ kind: 'stale', anchor: null, message: 'x' }] });

		await syncNow('auto', 'interval');

		expect(vault.cycles.map((r) => parseCycle(r.message)!.repeats)).toEqual([1, 1, 1]);
		expect(vault.log.map((e) => e.message)).toEqual(['x']);
	});

	it('logs each pull with its kind and item count, and each command batch and its statuses by anchor and uuid', async () => {
		await syncNow('manual');
		edit('Todoist/Work.md', W1_OPEN, W1_DONE);
		vi.mocked(debug).mockClear();

		await syncNow('manual');

		const lines = debugLines();
		const uuid = commandRequests().at(-1)!.commands![0].uuid;
		expect(lines).toContainEqual(expect.stringMatching(/^TODOIST pull full: \d+ items$/));
		expect(lines).toContainEqual(expect.stringMatching(/^TODOIST pull incremental: \d+ items$/));
		expect(lines).toContainEqual(`TODOIST send 1 command: item_close td-w1 ${uuid}`);
		expect(lines).toContainEqual(`TODOIST sync_status: ${uuid} "ok"`);
	});

	it('keeps task content and note text out of the debug lines and the cycle row', async () => {
		vault.files.set('Todoist/Work.md', '---\ntodoist_project: work\n---\n- [ ] Call Bob secretly\n');
		vi.mocked(ask).mockResolvedValue(true);

		await syncNow('manual');

		expect(adds().map((c) => c.args.content)).toEqual(['Call Bob secretly']);
		const anchor = [...vault.links.values()].find((l) => !['w1', 'w2', 'q1'].includes(l.todoistId!))!.anchor;
		const lines = debugLines();
		expect(lines).toContainEqual(expect.stringContaining(`item_add ${anchor} `));
		for (const text of [...lines, ...vault.cycles.map((r) => r.message)]) {
			for (const content of ['Call Bob', 'Plan', 'Report', 'Ship']) expect(text).not.toContain(content);
		}
	});
});
