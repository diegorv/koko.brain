import { beforeEach, describe, expect, it } from 'vitest';

import { eventCalendarStore } from '$lib/features/event-calendar/event-calendar.store.svelte';
import { createEventHistory, pushOp } from '$lib/features/event-calendar/event-calendar-history.logic';
import type {
	EventIssue,
	EventIssueReason,
	EventNote,
	EventProjection,
	EventState,
	HistoryOp,
} from '$lib/features/event-calendar/event-calendar.types';

const P = (name: string) => `/vault/${name}.md`;

function note(name: string, overrides: Partial<EventNote> = {}): EventNote {
	return {
		path: P(name),
		title: name,
		date: '2026-10-28',
		start: 540,
		end: 600,
		allDay: false,
		color: 'blue',
		location: '',
		snippet: `${name} body`,
		readOnly: false,
		...overrides,
	};
}

function stateOf(event: EventNote, overrides: Partial<EventState> = {}): EventState {
	const { title, date, start, end, allDay, color, location } = event;
	return { title, date, start, end, allDay, color, location, ...overrides };
}

function issue(name: string, reason: EventIssueReason): EventIssue {
	return { path: P(name), title: name, reason };
}

function projection(events: EventNote[], issues: EventIssue[] = [], archivedCount = 0): EventProjection {
	return { events, issues, archivedCount };
}

function updateOp(event: EventNote): HistoryOp {
	return { kind: 'update', label: 'Move event', path: event.path, before: stateOf(event), after: stateOf(event, { start: 600, end: 660 }) };
}

const store = eventCalendarStore;

describe('eventCalendarStore', () => {
	beforeEach(() => {
		store.reset();
	});

	describe('initial state', () => {
		it('is empty and idle', () => {
			expect(store.events).toEqual([]);
			expect(store.eventByPath(P('a'))).toBeUndefined();
			expect(store.isPending(P('a'))).toBe(false);
			expect(store.pendingPaths.size).toBe(0);
			expect(store.issues).toEqual([]);
			expect(store.attentionIssues).toEqual([]);
			expect(store.unscheduledIssues).toEqual([]);
			expect(store.attentionCount).toBe(0);
			expect(store.archivedCount).toBe(0);
			expect(store.isLoading).toBe(false);
			expect(store.loadError).toBeNull();
			expect(store.snapshotVersion).toBe(0);
			expect(store.canUndo).toBe(false);
			expect(store.canRedo).toBe(false);
		});
	});

	describe('setSnapshot', () => {
		it('exposes events sorted by date, start, end, title and path', () => {
			const late = note('late', { start: 800, end: 860 });
			const nextDay = note('next', { date: '2026-10-29', start: 0, end: 60 });
			const early = note('early', { start: 480, end: 540 });
			const longer = note('longer', { start: 480, end: 600 });
			const twinB = note('b-twin', { start: 300, end: 360 });
			const twinA = note('a-twin', { start: 300, end: 360 });
			store.setSnapshot(projection([late, nextDay, longer, early, twinB, twinA]), 3);

			expect(store.events.map((e) => e.title)).toEqual(['a-twin', 'b-twin', 'early', 'longer', 'late', 'next']);
			expect(store.events.every((e) => e.pending === false)).toBe(true);
			expect(store.snapshotVersion).toBe(3);
		});

		it('maps every event by path', () => {
			const a = note('a');
			store.setSnapshot(projection([a]), 1);

			expect(store.eventByPath(a.path)).toEqual({ ...a, pending: false });
			expect(store.eventByPath(P('missing'))).toBeUndefined();
		});

		it('stores issues, splits them and counts archived events', () => {
			const issues = [issue('u', 'unscheduled'), issue('bad', 'invalid-time'), issue('md', 'end-before-start')];
			store.setSnapshot(projection([], issues, 4), 1);

			expect(store.issues).toEqual(issues);
			expect(store.attentionIssues.map((i) => i.reason)).toEqual(['invalid-time', 'end-before-start']);
			expect(store.unscheduledIssues.map((i) => i.reason)).toEqual(['unscheduled']);
			expect(store.attentionCount).toBe(2);
			expect(store.archivedCount).toBe(4);
		});

		it('counts 50 unscheduled plus 1 invalid-time as one attention issue', () => {
			const issues = Array.from({ length: 50 }, (_, i) => issue(`u${i}`, 'unscheduled'));
			issues.push(issue('bad', 'invalid-time'));
			store.setSnapshot(projection([], issues), 1);

			expect(store.attentionCount).toBe(1);
			expect(store.unscheduledIssues).toHaveLength(50);
			expect(store.issues).toHaveLength(51);
		});

		it('does not touch loading or loadError', () => {
			store.setLoading(true);
			store.setLoadError('boom');
			store.setSnapshot(projection([note('a')]), 1);

			expect(store.isLoading).toBe(true);
			expect(store.loadError).toBe('boom');
		});
	});

	describe('cached reads', () => {
		it('returns the same instances until the next mutation', () => {
			const a = note('a');
			store.setSnapshot(projection([a], [issue('u', 'unscheduled'), issue('bad', 'invalid-time')]), 1);
			store.putPending({ kind: 'update', path: a.path, state: stateOf(a, { start: 600 }), settled: false });

			const events = store.events;
			const event = store.eventByPath(a.path);
			const pendingPaths = store.pendingPaths;
			const attention = store.attentionIssues;
			const unscheduled = store.unscheduledIssues;
			const issues = store.issues;

			expect(store.events).toBe(events);
			expect(store.eventByPath(a.path)).toBe(event);
			expect(store.pendingPaths).toBe(pendingPaths);
			expect(store.attentionIssues).toBe(attention);
			expect(store.unscheduledIssues).toBe(unscheduled);
			expect(store.issues).toBe(issues);
			expect(event).toBe(events[0]);

			store.dropPending(a.path);

			expect(store.events).not.toBe(events);
			expect(store.pendingPaths).not.toBe(pendingPaths);
			expect(store.attentionIssues).not.toBe(attention);
			expect(store.unscheduledIssues).not.toBe(unscheduled);
		});

		it('does not rebuild on setLoading, setLoadError or setHistory', () => {
			store.setSnapshot(projection([note('a')]), 1);
			const events = store.events;

			store.setLoading(true);
			store.setLoadError('x');
			store.setHistory(createEventHistory());

			expect(store.events).toBe(events);
		});
	});

	describe('pending overlay', () => {
		it('putPending overlays an update and marks it pending', () => {
			const a = note('a');
			store.setSnapshot(projection([a]), 1);
			store.putPending({ kind: 'update', path: a.path, state: stateOf(a, { start: 700, end: 760 }), settled: false });

			expect(store.events).toHaveLength(1);
			expect(store.eventByPath(a.path)).toMatchObject({ start: 700, end: 760, pending: true, snippet: 'a body' });
			expect(store.isPending(a.path)).toBe(true);
			expect([...store.pendingPaths]).toEqual([a.path]);
		});

		it('putPending replaces the write already held for that path', () => {
			const a = note('a');
			store.setSnapshot(projection([a]), 1);
			store.putPending({ kind: 'update', path: a.path, state: stateOf(a, { start: 700 }), settled: false });
			store.putPending({ kind: 'update', path: a.path, state: stateOf(a, { start: 720 }), settled: false });

			expect(store.eventByPath(a.path)?.start).toBe(720);
			expect(store.pendingPaths.size).toBe(1);
		});

		it('putPending of a create adds a sorted event; a delete hides one', () => {
			const a = note('a', { start: 600, end: 660 });
			const b = note('b');
			const created = note('c', { start: 300, end: 360 });
			store.setSnapshot(projection([a, b]), 1);
			store.putPending({ kind: 'create', path: created.path, event: created, settled: false });
			store.putPending({ kind: 'delete', path: b.path, settled: false });

			expect(store.events.map((e) => e.title)).toEqual(['c', 'a']);
			expect(store.eventByPath(b.path)).toBeUndefined();
			expect(store.isPending(b.path)).toBe(true);
			expect(store.eventByPath(created.path)?.pending).toBe(true);
		});

		it('dropPending removes the overlay', () => {
			const a = note('a');
			store.setSnapshot(projection([a]), 1);
			store.putPending({ kind: 'update', path: a.path, state: stateOf(a, { start: 700 }), settled: false });
			store.dropPending(a.path);

			expect(store.eventByPath(a.path)).toEqual({ ...a, pending: false });
			expect(store.isPending(a.path)).toBe(false);
		});

		it('dropPending of an unknown path changes nothing visible', () => {
			const a = note('a');
			store.setSnapshot(projection([a]), 1);
			store.dropPending(P('nope'));

			expect(store.events).toEqual([{ ...a, pending: false }]);
		});

		it('settlePending records the version and keeps the overlay', () => {
			const a = note('a');
			store.setSnapshot(projection([a]), 5);
			store.putPending({ kind: 'update', path: a.path, state: stateOf(a, { start: 700 }), settled: false });
			store.settlePending(a.path, 5);

			expect(store.eventByPath(a.path)).toMatchObject({ start: 700, pending: true });
			// An unsettled write would never prune; a settled one does at +2.
			store.setSnapshot(projection([a]), 7);
			expect(store.isPending(a.path)).toBe(false);
		});

		it('settlePending of an already settled write keeps its version clock', () => {
			const created = note('c');
			store.setSnapshot(projection([]), 1);
			store.putPending({ kind: 'create', path: created.path, event: created, settled: true });
			store.settlePending(created.path, 1);
			store.setSnapshot(projection([]), 3);

			expect(store.isPending(created.path)).toBe(true);
			expect(store.eventByPath(created.path)).toMatchObject({ pending: true });
		});

		it('settlePending of an unknown path is a no-op', () => {
			store.settlePending(P('nope'), 3);

			expect(store.pendingPaths.size).toBe(0);
		});

		it('setSnapshot keeps unsettled writes', () => {
			const a = note('a');
			store.setSnapshot(projection([a]), 1);
			store.putPending({ kind: 'update', path: a.path, state: stateOf(a, { start: 700 }), settled: false });
			store.setSnapshot(projection([a]), 100);

			expect(store.eventByPath(a.path)?.start).toBe(700);
		});

		it('setSnapshot prunes a settled update once the snapshot matches it', () => {
			const a = note('a');
			const moved = note('a', { start: 700, end: 760 });
			store.setSnapshot(projection([a]), 1);
			store.putPending({ kind: 'update', path: a.path, state: stateOf(moved), settled: false });
			store.settlePending(a.path, 1);
			store.setSnapshot(projection([moved]), 2);

			expect(store.isPending(a.path)).toBe(false);
			expect(store.eventByPath(a.path)).toEqual({ ...moved, pending: false });
		});

		it('does not prune a settled write one version later ("+1 does not prune")', () => {
			const a = note('a');
			store.setSnapshot(projection([a]), 4);
			store.putPending({ kind: 'update', path: a.path, state: stateOf(a, { start: 700 }), settled: false });
			store.settlePending(a.path, 4);
			store.setSnapshot(projection([a]), 5);

			expect(store.isPending(a.path)).toBe(true);
			expect(store.eventByPath(a.path)?.start).toBe(700);

			store.setSnapshot(projection([a]), 6);
			expect(store.isPending(a.path)).toBe(false);
			expect(store.eventByPath(a.path)?.start).toBe(540);
		});

		it('setSnapshot prunes a settled create once its path is present and a settled delete once absent', () => {
			const a = note('a');
			const created = note('c');
			store.setSnapshot(projection([a]), 1);
			store.putPending({ kind: 'create', path: created.path, event: created, settled: true });
			store.putPending({ kind: 'delete', path: a.path, settled: true });
			store.setSnapshot(projection([created]), 2);

			expect(store.pendingPaths.size).toBe(0);
			expect(store.events).toEqual([{ ...created, pending: false }]);
		});
	});

	describe('remapPath', () => {
		it('shows exactly one event after a rename, before the snapshot updates', () => {
			const a = note('a');
			const to = P('renamed');
			store.setSnapshot(projection([a]), 1);
			store.remapPath(a.path, to);

			expect(store.events).toHaveLength(1);
			expect(store.eventByPath(a.path)).toBeUndefined();
			expect(store.eventByPath(to)).toMatchObject({ path: to, title: 'a', snippet: 'a body', pending: true });
			expect(store.isPending(a.path)).toBe(true);
			expect(store.isPending(to)).toBe(true);
		});

		it('moves an update to the new path', () => {
			const a = note('a');
			const to = P('renamed');
			store.setSnapshot(projection([a]), 1);
			store.putPending({ kind: 'update', path: a.path, state: stateOf(a, { start: 700, end: 760 }), settled: false });
			store.remapPath(a.path, to);

			expect(store.events).toHaveLength(1);
			expect(store.eventByPath(a.path)).toBeUndefined();
			expect(store.eventByPath(to)).toMatchObject({ path: to, start: 700, end: 760, pending: true });
		});

		it('moves a create, including its event path', () => {
			const created = note('c');
			const to = P('restored 1');
			store.setSnapshot(projection([]), 1);
			store.putPending({ kind: 'create', path: created.path, event: created, settled: false });
			store.remapPath(created.path, to);

			expect(store.events).toHaveLength(1);
			expect(store.eventByPath(created.path)).toBeUndefined();
			expect(store.eventByPath(to)).toMatchObject({ path: to, title: 'c', pending: true });
		});

		it('keeps a delete at the old path and does not hide the new one', () => {
			const a = note('a');
			const to = P('restored 1');
			store.setSnapshot(projection([a]), 1);
			store.putPending({ kind: 'delete', path: a.path, settled: true });
			store.remapPath(a.path, to);
			store.putPending({ kind: 'create', path: to, event: { ...a, path: to }, settled: true });

			expect(store.eventByPath(a.path)).toBeUndefined();
			expect(store.eventByPath(to)).toMatchObject({ path: to, pending: true });
			expect(store.events).toHaveLength(1);
		});

		it('prunes the tombstone only once the snapshot no longer contains the old path', () => {
			const a = note('a');
			const to = P('renamed');
			store.setSnapshot(projection([a]), 1);
			store.remapPath(a.path, to);

			store.setSnapshot(projection([a]), 10);
			expect(store.isPending(a.path)).toBe(true);
			expect(store.eventByPath(a.path)).toBeUndefined();

			const renamed = { ...a, path: to, title: 'renamed' };
			store.setSnapshot(projection([renamed]), 11);
			expect(store.pendingPaths.size).toBe(0);
			expect(store.events).toEqual([{ ...renamed, pending: false }]);
		});

		it('keeps a moved settled update through a snapshot that predates the rename', () => {
			const a = note('a', { readOnly: true });
			const to = P('renamed');
			store.setSnapshot(projection([a]), 5);
			store.putPending({ kind: 'update', path: a.path, state: stateOf(a, { start: 700, end: 760 }), settled: false });
			store.settlePending(a.path, 5);
			store.setSnapshot(projection([a]), 6);
			store.remapPath(a.path, to);

			const moved = { path: to, start: 700, end: 760, snippet: 'a body', readOnly: true, pending: true };
			expect(store.events).toHaveLength(1);
			expect(store.eventByPath(to)).toMatchObject(moved);

			store.setSnapshot(projection([a]), 7);
			expect(store.events).toHaveLength(1);
			expect(store.eventByPath(a.path)).toBeUndefined();
			expect(store.eventByPath(to)).toMatchObject(moved);

			const renamed = { ...a, path: to, start: 700, end: 760 };
			store.setSnapshot(projection([renamed]), 8);
			expect(store.pendingPaths.size).toBe(0);
			expect(store.events).toEqual([{ ...renamed, pending: false }]);
		});

		it('keeps a moved settled create through a snapshot that predates the rename', () => {
			const created = note('c');
			const to = P('restored 1');
			store.setSnapshot(projection([]), 5);
			store.putPending({ kind: 'create', path: created.path, event: created, settled: false });
			store.settlePending(created.path, 5);
			store.setSnapshot(projection([]), 6);
			store.remapPath(created.path, to);

			store.setSnapshot(projection([]), 7);
			expect(store.events).toHaveLength(1);
			expect(store.eventByPath(to)).toMatchObject({ path: to, title: 'c', snippet: 'c body', pending: true });
			expect(store.isPending(to)).toBe(true);
		});

		it('keeps the snippet and readOnly of a moved pending update', () => {
			const a = note('a', { readOnly: true });
			const to = P('renamed');
			store.setSnapshot(projection([a]), 1);
			store.putPending({ kind: 'update', path: a.path, state: stateOf(a, { start: 700 }), settled: false });
			store.remapPath(a.path, to);

			expect(store.eventByPath(to)).toMatchObject({ snippet: 'a body', readOnly: true, start: 700 });
		});

		it('ignores settlePending on the tombstone, so both paths never render', () => {
			const a = note('a');
			const to = P('renamed');
			store.setSnapshot(projection([a]), 5);
			store.remapPath(a.path, to);
			store.settlePending(a.path, 5);
			store.setSnapshot(projection([a]), 7);

			expect(store.isPending(a.path)).toBe(true);
			expect(store.events.map((e) => e.path)).toEqual([to]);
		});

		it('lets a write in flight at the rename be settled at the new path', () => {
			const a = note('a');
			const to = P('renamed');
			store.setSnapshot(projection([a]), 1);
			store.putPending({ kind: 'update', path: a.path, state: stateOf(a, { start: 700 }), settled: false });
			store.remapPath(a.path, to);
			// Unsettled: no snapshot prunes it.
			store.setSnapshot(projection([{ ...a, path: to }]), 2);
			expect(store.isPending(to)).toBe(true);

			store.settlePending(to, 2);
			store.setSnapshot(projection([{ ...a, path: to, start: 700 }]), 3);
			expect(store.pendingPaths.size).toBe(0);
			expect(store.events).toEqual([{ ...a, path: to, start: 700, pending: false }]);
		});

		it('keeps a write already held at the new path', () => {
			const a = note('a');
			const to = P('restored 1');
			const held = note('restored 1', { title: 'held' });
			store.setSnapshot(projection([a]), 1);
			store.putPending({ kind: 'create', path: to, event: held, settled: false });
			store.remapPath(a.path, to);

			expect(store.events).toHaveLength(1);
			expect(store.eventByPath(to)).toMatchObject({ title: 'held', pending: true });
			expect(store.eventByPath(a.path)).toBeUndefined();
		});

		it('moves the history to the new path', () => {
			const a = note('a');
			const other = note('o');
			const to = P('renamed');
			store.setSnapshot(projection([a, other]), 1);
			store.setHistory(pushOp(pushOp(createEventHistory(), updateOp(a)), updateOp(other)));
			store.remapPath(a.path, to);

			expect(store.history.undo.map((op) => op.path)).toEqual([to, other.path]);
		});

		it('is a no-op for the same path', () => {
			const a = note('a');
			store.setSnapshot(projection([a]), 1);
			const events = store.events;
			store.remapPath(a.path, a.path);

			expect(store.events).toBe(events);
			expect(store.pendingPaths.size).toBe(0);
		});

		it('leaves only a tombstone when the old path has no event', () => {
			const to = P('renamed');
			store.remapPath(P('ghost'), to);

			expect(store.events).toEqual([]);
			expect([...store.pendingPaths]).toEqual([P('ghost')]);
		});
	});

	describe('getters after each overlay mutator', () => {
		const a = note('a');
		const issues = [issue('u', 'unscheduled'), issue('bad', 'invalid-time')];
		const to = P('renamed');
		const cases: { name: string; run: () => void; pending: string[]; visible: string[] }[] = [
			{
				name: 'putPending',
				run: () => store.putPending({ kind: 'update', path: a.path, state: stateOf(a, { start: 700 }), settled: false }),
				pending: [a.path],
				visible: [a.path],
			},
			{
				name: 'settlePending',
				run: () => {
					store.putPending({ kind: 'update', path: a.path, state: stateOf(a, { start: 700 }), settled: false });
					store.settlePending(a.path, 3);
				},
				pending: [a.path],
				visible: [a.path],
			},
			{
				name: 'dropPending',
				run: () => {
					store.putPending({ kind: 'update', path: a.path, state: stateOf(a, { start: 700 }), settled: false });
					store.dropPending(a.path);
				},
				pending: [],
				visible: [a.path],
			},
			{ name: 'remapPath', run: () => store.remapPath(a.path, to), pending: [a.path, to], visible: [to] },
		];

		for (const c of cases) {
			it(`${c.name} changes only the overlay getters`, () => {
				store.setSnapshot(projection([a], issues, 2), 3);
				const before = {
					issues: store.issues,
					attention: store.attentionIssues.map((i) => i.path),
					unscheduled: store.unscheduledIssues.map((i) => i.path),
				};

				c.run();

				expect(store.issues).toBe(before.issues);
				expect(store.attentionIssues.map((i) => i.path)).toEqual(before.attention);
				expect(store.unscheduledIssues.map((i) => i.path)).toEqual(before.unscheduled);
				expect(store.attentionCount).toBe(1);
				expect(store.archivedCount).toBe(2);
				expect(store.snapshotVersion).toBe(3);
				expect(store.isLoading).toBe(false);
				expect(store.loadError).toBeNull();
				expect([...store.pendingPaths].sort()).toEqual([...c.pending].sort());
				for (const path of [a.path, to]) expect(store.isPending(path)).toBe(c.pending.includes(path));
				expect(store.events.map((e) => e.path)).toEqual(c.visible);
				for (const path of [a.path, to]) expect(store.eventByPath(path)?.path).toBe(c.visible.includes(path) ? path : undefined);
			});
		}
	});

	describe('loading, error and history', () => {
		it('setLoading toggles isLoading', () => {
			store.setLoading(true);
			expect(store.isLoading).toBe(true);
			store.setLoading(false);
			expect(store.isLoading).toBe(false);
		});

		it('setLoadError sets and clears loadError', () => {
			store.setLoadError('scan failed');
			expect(store.loadError).toBe('scan failed');
			store.setLoadError(null);
			expect(store.loadError).toBeNull();
		});

		it('setHistory drives canUndo and canRedo', () => {
			const a = note('a');
			const pushed = pushOp(createEventHistory(), updateOp(a));
			store.setHistory(pushed);

			expect(store.history).toBe(pushed);
			expect(store.canUndo).toBe(true);
			expect(store.canRedo).toBe(false);

			store.setHistory({ ...pushed, undo: [], redo: pushed.undo });
			expect(store.canUndo).toBe(false);
			expect(store.canRedo).toBe(true);
		});
	});

	describe('tasks', () => {
		it('starts empty', () => {
			expect(store.tasks).toEqual([]);
		});

		it('setTasks replaces the tasks without touching the events', () => {
			const a = note('a');
			store.setSnapshot(projection([a]), 1);
			const tasks = [{ path: '/vault/b.md', fileName: 'b', line: 3, description: 'Pay rent', checked: false, date: '2026-11-12' }];

			store.setTasks(tasks);

			expect(store.tasks).toBe(tasks);
			expect(store.events.map((e) => e.path)).toEqual([a.path]);
			store.setTasks([]);
			expect(store.tasks).toEqual([]);
		});
	});

	describe('reset', () => {
		it('returns every field to its initial value', () => {
			const a = note('a');
			store.setSnapshot(projection([a], [issue('bad', 'invalid-time'), issue('u', 'unscheduled')], 2), 9);
			store.putPending({ kind: 'update', path: a.path, state: stateOf(a, { start: 700 }), settled: false });
			store.setHistory(pushOp(createEventHistory(), updateOp(a)));
			store.setLoading(true);
			store.setLoadError('x');
			store.setTasks([{ path: '/vault/a.md', fileName: 'a', line: 1, description: 'Pay rent', checked: false, date: '2026-11-12' }]);

			store.reset();

			expect(store.events).toEqual([]);
			expect(store.eventByPath(a.path)).toBeUndefined();
			expect(store.isPending(a.path)).toBe(false);
			expect(store.pendingPaths.size).toBe(0);
			expect(store.issues).toEqual([]);
			expect(store.attentionIssues).toEqual([]);
			expect(store.unscheduledIssues).toEqual([]);
			expect(store.attentionCount).toBe(0);
			expect(store.archivedCount).toBe(0);
			expect(store.snapshotVersion).toBe(0);
			expect(store.isLoading).toBe(false);
			expect(store.loadError).toBeNull();
			expect(store.canUndo).toBe(false);
			expect(store.canRedo).toBe(false);
			expect(store.tasks).toEqual([]);
		});
	});
});
