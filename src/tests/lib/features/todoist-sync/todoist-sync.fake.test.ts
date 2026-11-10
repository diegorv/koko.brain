import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCommand, TodoistRequestError, TodoistSyncError } from '@doist/todoist-sdk';
import { createFakeTodoist, type FakeTodoist } from '../../../fixtures/todoist-sync.fake';

const { fake } = vi.hoisted(() => ({ fake: { current: null as FakeTodoist | null } }));

vi.mock('@tauri-apps/plugin-http', () => ({
	fetch: (url: string, init?: RequestInit) => fake.current!.fetch(url, init),
}));

import { createTodoistClient } from '#lib/features/todoist-sync/todoist-client.js';

/**
 * The shared fake `/sync` through the real SDK and the real plugin-http
 * adapter: what later engine tickets rely on when they extend the fake.
 */
describe('fake Todoist /sync', () => {
	let server: FakeTodoist;
	const client = () => createTodoistClient(server.token);

	beforeEach(() => {
		server = createFakeTodoist();
		fake.current = server;
	});

	it('answers a full sync with every live resource and a token', async () => {
		server.addProject({ id: 'p1', name: 'Work' });
		server.addSection({ id: 's1', project_id: 'p1', name: 'Next' });
		server.addItem({ id: 'i1', project_id: 'p1', content: 'Write spec', labels: ['Work'] });
		server.addItem({ id: 'i2', project_id: 'p1', content: 'Gone', is_deleted: true });

		const res = await client().sync({ syncToken: '*', resourceTypes: ['projects', 'sections', 'items'] });

		expect(res.fullSync).toBe(true);
		expect(res.syncToken).toBe(`v${server.version}`);
		expect(res.projects?.map((p) => p.name)).toEqual(['Work']);
		expect(res.sections?.map((s) => s.name)).toEqual(['Next']);
		expect(res.items?.map((i) => [i.id, i.content, i.labels])).toEqual([['i1', 'Write spec', ['Work']]]);
	});

	it('leaves checked items out of a full sync but sends them incrementally', async () => {
		server.addProject({ id: 'p1', name: 'Work' });
		server.addItem({ id: 'open', project_id: 'p1', content: 'Open' });
		server.addItem({ id: 'done', project_id: 'p1', content: 'Done', checked: true });
		const first = await client().sync({ syncToken: '*', resourceTypes: ['items'] });

		server.updateItem('open', { checked: true });
		const next = await client().sync({ syncToken: first.syncToken!, resourceTypes: ['items'] });

		expect(first.items?.map((i) => i.id)).toEqual(['open']);
		expect(next.items?.map((i) => [i.id, i.checked])).toEqual([['open', true]]);
	});

	it('returns only the resource types asked for', async () => {
		server.addProject({ id: 'p1', name: 'Work' });
		server.addItem({ id: 'i1', project_id: 'p1', content: 'A' });

		const res = await client().sync({ syncToken: '*', resourceTypes: ['projects'] });

		expect(res.projects).toHaveLength(1);
		expect(res.items).toBeUndefined();
	});

	it('answers an incremental sync with changes after the token, deletions included', async () => {
		server.addProject({ id: 'p1', name: 'Work' });
		server.addItem({ id: 'i1', project_id: 'p1', content: 'A' });
		server.addItem({ id: 'i2', project_id: 'p1', content: 'B' });
		const first = await client().sync({ syncToken: '*', resourceTypes: ['items'] });

		server.updateItem('i1', { content: 'A2' });
		server.updateItem('i2', { is_deleted: true });
		const next = await client().sync({ syncToken: first.syncToken!, resourceTypes: ['items', 'projects'] });

		expect(next.fullSync).toBe(false);
		expect(next.projects).toEqual([]);
		expect(next.items?.map((i) => [i.id, i.content, i.isDeleted])).toEqual([
			['i1', 'A2', false],
			['i2', 'B', true],
		]);

		const idle = await client().sync({ syncToken: next.syncToken!, resourceTypes: ['items'] });
		expect(idle.items).toEqual([]);
	});

	it('applies commands and answers sync_status and temp_id_mapping', async () => {
		server.addProject({ id: 'p1', name: 'Work' });
		server.addItem({ id: 'i1', project_id: 'p1', content: 'A' });
		const add = createCommand('item_add', { content: 'New', projectId: 'p1', description: 'kokobrain:td-abc' }, 'tmp-1');
		const update = createCommand('item_update', { id: 'i1', content: 'A2' });

		const res = await client().sync({ commands: [add, update] });

		expect(res.syncStatus).toEqual({ [add.uuid]: 'ok', [update.uuid]: 'ok' });
		const newId = res.tempIdMapping!['tmp-1'];
		expect(server.item(newId)).toMatchObject({ content: 'New', project_id: 'p1', description: 'kokobrain:td-abc' });
		expect(server.item('i1')?.content).toBe('A2');
	});

	it('updates a due like live-check 7: a bare date drops the recurrence, date + string + lang keeps it, null removes it', async () => {
		server.addProject({ id: 'p1', name: 'Work' });
		const weekly = { is_recurring: true, string: 'every week', date: '2026-11-13', lang: 'en' };
		for (const id of ['bare', 'kept', 'gone']) server.addItem({ id, project_id: 'p1', content: id, due: weekly });
		server.addItem({ id: 'timed', project_id: 'p1', content: 'T' });

		await client().sync({
			commands: [
				createCommand('item_update', { id: 'bare', due: { date: '2026-11-20' } }),
				createCommand('item_update', { id: 'kept', due: { date: '2026-11-20', string: 'every week', lang: 'en' } }),
				createCommand('item_update', { id: 'gone', due: null }),
				createCommand('item_update', { id: 'timed', due: { date: '2026-11-20T09:00:00' } }),
			],
		});

		expect(server.item('bare')!.due).toEqual({ date: '2026-11-20', string: '2026-11-20', is_recurring: false, datetime: null, timezone: null, lang: 'en' });
		expect(server.item('kept')!.due).toEqual({ date: '2026-11-20', string: 'every week', is_recurring: true, datetime: null, timezone: null, lang: 'en' });
		expect(server.item('gone')!.due).toBeNull();
		expect(server.item('timed')!.due).toEqual({ date: '2026-11-20T09:00:00', string: '2026-11-20T09:00:00', is_recurring: false, datetime: '2026-11-20T09:00:00', timezone: null, lang: null });
	});

	it('closes and reopens through hand-built commands', async () => {
		server.addProject({ id: 'p1', name: 'Work' });
		server.addItem({ id: 'i1', project_id: 'p1', content: 'A' });
		const close = { type: 'item_close', uuid: 'u-close', args: { id: 'i1' } };

		await client().sync({ commands: [close as never] });
		expect(server.item('i1')?.checked).toBe(true);

		await client().sync({ commands: [{ type: 'item_uncomplete', uuid: 'u-open', args: { id: 'i1' } } as never] });
		expect(server.item('i1')?.checked).toBe(false);
	});

	it('rolls a recurring item forward on item_close, and completes a starting <date> rule for good', async () => {
		server.addProject({ id: 'p1', name: 'Work' });
		server.addItem({ id: 'd', project_id: 'p1', content: 'D', due: { is_recurring: true, string: 'every day', date: '2026-11-10', lang: 'en' } });
		server.addItem({ id: 'w', project_id: 'p1', content: 'W', due: { is_recurring: true, string: 'every week', date: '2026-11-13T09:00:00', lang: 'en' } });
		server.addItem({ id: 's', project_id: 'p1', content: 'S', due: { is_recurring: true, string: 'every week starting 16 Nov 2026', date: '2026-11-16', lang: 'en' } });

		await client().sync({ commands: ['d', 'w', 's'].map((id) => ({ type: 'item_close', uuid: `u-${id}`, args: { id } }) as never) });

		expect(server.item('d')).toMatchObject({ checked: false, due: { date: '2026-11-11', is_recurring: true } });
		expect(server.item('w')).toMatchObject({ checked: false, due: { date: '2026-11-20T09:00:00' } });
		expect(server.item('s')).toMatchObject({ checked: true, due: null });
	});

	it('replays a uuid without applying it twice', async () => {
		server.addProject({ id: 'p1', name: 'Work' });
		const add = createCommand('item_add', { content: 'Once', projectId: 'p1' }, 'tmp-1');

		const first = await client().sync({ commands: [add] });
		const again = await client().sync({ commands: [add] });

		expect(again.tempIdMapping).toEqual(first.tempIdMapping);
		const all = await client().sync({ syncToken: '*', resourceTypes: ['items'] });
		expect(all.items?.map((i) => i.content)).toEqual(['Once']);
	});

	it('reports a failed command through TodoistSyncError, keeping the applied ones', async () => {
		server.addProject({ id: 'p1', name: 'Work' });
		const ok = createCommand('item_add', { content: 'Kept', projectId: 'p1' }, 'tmp-1');
		const bad = createCommand('item_update', { id: 'missing', content: 'x' });

		const err = await client().sync({ commands: [ok, bad] }).catch((e: unknown) => e);

		expect(err).toBeInstanceOf(TodoistSyncError);
		const syncErr = err as TodoistSyncError;
		expect(syncErr.syncStatus[ok.uuid]).toBe('ok');
		expect(syncErr.syncStatus[bad.uuid]).toMatchObject({ httpCode: 404 });
		expect(syncErr.tempIdMapping['tmp-1']).toBeDefined();
	});

	it('refuses every command on an item marked with refuseCommandsFor, applying nothing', async () => {
		server.addProject({ id: 'p1', name: 'Work' });
		server.addItem({ id: 'i1', project_id: 'p1', content: 'A' });
		server.refuseCommandsFor('i1');

		const err = await client().sync({ commands: [{ type: 'item_close', uuid: 'u1', args: { id: 'i1' } } as never] }).catch((e: unknown) => e);

		expect((err as TodoistSyncError).syncStatus.u1).toMatchObject({ httpCode: 400 });
		expect(server.item('i1')?.checked).toBe(false);
	});

	it('answers 429 with error_extra.retry_after in the response data', async () => {
		server.failNext({ kind: 'rate-limit', retryAfter: 42 });

		const err = await client().sync({ syncToken: '*', resourceTypes: ['projects'] }).catch((e: unknown) => e);

		expect(err).toBeInstanceOf(TodoistRequestError);
		const reqErr = err as TodoistRequestError;
		expect(reqErr.httpStatusCode).toBe(429);
		expect((reqErr.responseData as { error_extra: { retry_after: number } }).error_extra.retry_after).toBe(42);
	});

	it('answers 401 for a wrong token and for a queued unauthorized failure', async () => {
		const wrong = await createTodoistClient('wrong').sync({ syncToken: '*', resourceTypes: ['projects'] }).catch((e: unknown) => e);
		expect((wrong as TodoistRequestError).httpStatusCode).toBe(401);
		expect((wrong as TodoistRequestError).isAuthenticationError()).toBe(true);

		server.failNext({ kind: 'unauthorized' });
		const queued = await client().sync({ syncToken: '*', resourceTypes: ['projects'] }).catch((e: unknown) => e);
		expect((queued as TodoistRequestError).httpStatusCode).toBe(401);
	});

	it('a dropped response applies the command once; the SDK retry gets the replayed outcome', async () => {
		server.addProject({ id: 'p1', name: 'Work' });
		server.failNext({ kind: 'dropped' });
		const add = createCommand('item_add', { content: 'Lost reply', projectId: 'p1' }, 'tmp-1');

		const res = await client().sync({ commands: [add] });

		expect(server.requests).toHaveLength(2);
		expect(res.tempIdMapping!['tmp-1']).toBeDefined();
		const all = await client().sync({ syncToken: '*', resourceTypes: ['items'] });
		expect(all.items?.map((i) => i.content)).toEqual(['Lost reply']);
	});

	it('an unreachable server fails after the SDK retries', async () => {
		server.failNext({ kind: 'offline' }, 4);

		const err = await client().sync({ syncToken: '*', resourceTypes: ['projects'] }).catch((e: unknown) => e);

		expect(err).toBeInstanceOf(TodoistRequestError);
		expect((err as TodoistRequestError).httpStatusCode).toBeUndefined();
		expect(server.requests).toHaveLength(4);
	});
});
