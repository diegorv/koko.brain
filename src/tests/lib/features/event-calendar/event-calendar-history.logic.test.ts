import { describe, expect, it } from 'vitest';

import {
	createEventHistory,
	dropPath,
	followRename,
	pushOp,
	refuseOp,
	remapPath,
	removeOp,
	takeRedo,
	takeUndo,
	type EventHistory,
} from '$lib/features/event-calendar/event-calendar-history.logic';
import type { EventState, HistoryOp } from '$lib/features/event-calendar/event-calendar.types';

const VAULT = '/vault';

/** Builds an event state with the given overrides. */
function state(overrides: Partial<EventState> = {}): EventState {
	return {
		title: 'Standup',
		date: '2026-11-08',
		start: 540,
		end: 570,
		allDay: false,
		color: 'blue',
		location: '',
		...overrides,
	};
}

/** Builds an update op on `path` from 09:00 to `start`. */
function move(path: string, start = 780, label: 'Move event' | 'Resize event' = 'Move event'): HistoryOp {
	return {
		kind: 'update',
		label,
		path,
		before: state(),
		after: state({ start, end: start + 30 }),
	};
}

/** Builds a create op on `path`. */
function create(path: string, label: 'Create event' | 'Duplicate event' = 'Create event'): HistoryOp {
	return { kind: 'create', label, path, state: state() };
}

/** Builds a delete op on `path`. */
function del(path: string): HistoryOp {
	return { kind: 'delete', label: 'Delete event', path, state: state(), trashId: 'trash-1' };
}

/** Pushes every op in order. */
function pushAll(h: EventHistory, ops: HistoryOp[]): EventHistory {
	return ops.reduce(pushOp, h);
}

describe('createEventHistory', () => {
	it('starts empty with the default cap of 100', () => {
		expect(createEventHistory()).toEqual({ undo: [], redo: [], max: 100 });
	});

	it('keeps a given cap', () => {
		expect(createEventHistory(5).max).toBe(5);
	});
});

describe('pushOp', () => {
	it('records an op on the undo stack without mutating the input', () => {
		const h = createEventHistory();
		const op = move(`${VAULT}/a.md`);
		const next = pushOp(h, op);
		expect(next.undo).toEqual([op]);
		expect(h.undo).toEqual([]);
	});

	it('does not record an update whose before equals its after', () => {
		const h = pushOp(createEventHistory(), move(`${VAULT}/a.md`));
		const undone = takeUndo(h)!.history;
		const noop: HistoryOp = {
			kind: 'update',
			label: 'Edit event',
			path: `${VAULT}/a.md`,
			before: state(),
			after: state(),
		};
		const next = pushOp(undone, noop);
		expect(next).toBe(undone);
		expect(next.undo).toEqual([]);
		expect(next.redo).toHaveLength(1);
	});

	it('records an update that changes any single field', () => {
		const changes: Partial<EventState>[] = [
			{ title: 'x' },
			{ date: '2026-11-09' },
			{ start: 541 },
			{ end: 571 },
			{ allDay: true },
			{ color: 'pink' },
			{ location: 'y' },
		];
		expect(changes.map((c) => Object.keys(c)[0]).sort()).toEqual(Object.keys(state()).sort());
		for (const change of changes) {
			const op: HistoryOp = { kind: 'update', label: 'Edit event', path: `${VAULT}/a.md`, before: state(), after: state(change) };
			expect(pushOp(createEventHistory(), op).undo).toEqual([op]);
		}
	});

	it('records an update that changes only the title', () => {
		const op: HistoryOp = {
			kind: 'update',
			label: 'Edit event',
			path: `${VAULT}/a.md`,
			before: state(),
			after: state({ title: 'Daily standup' }),
		};
		expect(pushOp(createEventHistory(), op).undo).toEqual([op]);
	});

	it('clears the redo stack on a new op', () => {
		let h = pushAll(createEventHistory(), [move(`${VAULT}/a.md`), move(`${VAULT}/b.md`)]);
		h = takeUndo(h)!.history;
		expect(h.redo).toHaveLength(1);
		h = pushOp(h, create(`${VAULT}/c.md`));
		expect(h.redo).toEqual([]);
		expect(takeRedo(h)).toBeNull();
	});

	it('caps the undo stack at max, dropping the oldest op', () => {
		const ops = [1, 2, 3, 4].map((n) => move(`${VAULT}/${n}.md`));
		const h = pushAll(createEventHistory(3), ops);
		expect(h.undo).toEqual(ops.slice(1));
	});
});

describe('takeUndo / takeRedo', () => {
	it('return null on an empty stack', () => {
		expect(takeUndo(createEventHistory())).toBeNull();
		expect(takeRedo(createEventHistory())).toBeNull();
	});

	it('step back and forward, carrying each label', () => {
		const a = move(`${VAULT}/a.md`);
		const b = move(`${VAULT}/b.md`, 600, 'Resize event');
		let h = pushAll(createEventHistory(), [a, b]);

		const first = takeUndo(h)!;
		expect(first.op).toBe(b);
		expect(first.op.label).toBe('Resize event');
		h = first.history;
		expect(h.undo).toEqual([a]);
		expect(h.redo).toEqual([b]);

		const second = takeUndo(h)!;
		expect(second.op.label).toBe('Move event');
		h = second.history;
		expect(h.undo).toEqual([]);
		expect(h.redo).toEqual([b, a]);

		const again = takeRedo(h)!;
		expect(again.op).toBe(a);
		expect(again.history.undo).toEqual([a]);
		expect(again.history.redo).toEqual([b]);
	});

	it('round-trips a create through undo and redo', () => {
		const op = create(`${VAULT}/new.md`, 'Duplicate event');
		const undone = takeUndo(pushOp(createEventHistory(), op))!;
		expect(undone.op).toEqual(op);
		expect(undone.op.label).toBe('Duplicate event');
		const redone = takeRedo(undone.history)!;
		expect(redone.op).toEqual(op);
		expect(redone.history.undo).toEqual([op]);
		expect(redone.history.redo).toEqual([]);
	});

	it('round-trips a delete through undo and redo, keeping its trash id', () => {
		const op = del(`${VAULT}/gone.md`);
		const undone = takeUndo(pushOp(createEventHistory(), op))!;
		expect(undone.op).toEqual(op);
		expect(undone.op.kind === 'delete' && undone.op.trashId).toBe('trash-1');
		const redone = takeRedo(undone.history)!;
		expect(redone.op).toEqual(op);
		expect(redone.history.undo).toEqual([op]);
	});

	it('does not mutate the history it takes from', () => {
		const h = pushOp(createEventHistory(), move(`${VAULT}/a.md`));
		takeUndo(h);
		expect(h.undo).toHaveLength(1);
		expect(h.redo).toEqual([]);
	});
});

describe('refuseOp', () => {
	it('removes an op that failed its precondition after it was taken', () => {
		const a = move(`${VAULT}/a.md`);
		const b = move(`${VAULT}/b.md`);
		const taken = takeUndo(pushAll(createEventHistory(), [a, b]))!;
		const h = refuseOp(taken.history, taken.op);
		expect(h.undo).toEqual([a]);
		expect(h.redo).toEqual([]);
	});

	it('removes only that op, not an equal-looking one', () => {
		const a = move(`${VAULT}/a.md`);
		const twin = move(`${VAULT}/a.md`);
		const h = refuseOp(pushAll(createEventHistory(), [a, twin]), twin);
		expect(h.undo).toHaveLength(1);
		expect(h.undo[0]).toBe(a);
	});

	it('returns an unchanged history for an unknown op', () => {
		const h = pushOp(createEventHistory(), move(`${VAULT}/a.md`));
		expect(refuseOp(h, move(`${VAULT}/a.md`)).undo).toEqual(h.undo);
	});
});

describe('removeOp', () => {
	it('retires the delete op the toast Undo handled', () => {
		const a = move(`${VAULT}/a.md`);
		const d = del(`${VAULT}/gone.md`);
		const h = removeOp(pushAll(createEventHistory(), [a, d]), (op) => op.kind === 'delete' && op.path === `${VAULT}/gone.md`);
		expect(h.undo).toEqual([a]);
		expect(takeUndo(h)!.op).toBe(a);
	});

	it('removes a matching op from the redo stack too', () => {
		const d = del(`${VAULT}/gone.md`);
		const h = takeUndo(pushOp(createEventHistory(), d))!.history;
		expect(removeOp(h, (op) => op.kind === 'delete').redo).toEqual([]);
	});

	it('leaves the history alone when nothing matches', () => {
		const h = pushOp(createEventHistory(), move(`${VAULT}/a.md`));
		expect(removeOp(h, () => false)).toEqual(h);
	});
});

describe('remapPath / dropPath', () => {
	it('moves every op on the old path to the new one, on both stacks', () => {
		const from = `${VAULT}/Standup.md`;
		const to = `${VAULT}/Daily standup.md`;
		let h = pushAll(createEventHistory(), [create(from), move(from), move(`${VAULT}/other.md`)]);
		h = takeUndo(h)!.history;
		h = takeUndo(h)!.history;
		h = remapPath(h, from, to);
		expect(h.undo.map((op) => op.path)).toEqual([to]);
		expect(h.redo.map((op) => op.path)).toEqual([`${VAULT}/other.md`, to]);
		expect(h.undo[0]).toEqual({ ...create(from), path: to });
	});

	it('drops every op on a path, on both stacks', () => {
		const gone = `${VAULT}/gone.md`;
		let h = pushAll(createEventHistory(), [move(gone), move(`${VAULT}/keep.md`), move(gone)]);
		h = takeUndo(h)!.history;
		h = dropPath(h, gone);
		expect(h.undo.map((op) => op.path)).toEqual([`${VAULT}/keep.md`]);
		expect(h.redo).toEqual([]);
	});

	it('leave the input history untouched when they change something', () => {
		const path = `${VAULT}/a.md`;
		let h = pushAll(createEventHistory(), [move(path), move(`${VAULT}/b.md`), move(path)]);
		h = takeUndo(h)!.history;
		const undoBefore = [...h.undo];
		const redoBefore = [...h.redo];
		const snapshot = structuredClone(h);
		expect(remapPath(h, path, `${VAULT}/c.md`)).not.toEqual(h);
		expect(dropPath(h, path)).not.toEqual(h);
		expect(removeOp(h, (op) => op.path === `${VAULT}/b.md`)).not.toEqual(h);
		expect(refuseOp(h, h.redo[0])).not.toEqual(h);
		expect(h).toEqual(snapshot);
		expect(h.undo).toEqual(undoBefore);
		expect(h.redo).toEqual(redoBefore);
		h.undo.forEach((op, i) => expect(op).toBe(undoBefore[i]));
		h.redo.forEach((op, i) => expect(op).toBe(redoBefore[i]));
	});

	it('leave a history without that path unchanged', () => {
		const h = pushOp(createEventHistory(), move(`${VAULT}/a.md`));
		expect(remapPath(h, `${VAULT}/x.md`, `${VAULT}/y.md`)).toEqual(h);
		expect(dropPath(h, `${VAULT}/x.md`)).toEqual(h);
	});
});

describe('followRename', () => {
	const from = `${VAULT}/Standup.md`;
	const to = `${VAULT}/Archive/Retro.md`;

	it('moves every op on the old path, on both stacks, and swaps a filename title on each state', () => {
		let h = pushAll(createEventHistory(), [create(from), move(from), del(from), move(`${VAULT}/other.md`)]);
		h = takeUndo(h)!.history;
		h = takeUndo(h)!.history;
		h = followRename(h, from, to, 'Standup', 'Retro');

		expect(h.undo).toEqual([
			{ ...create(from), path: to, state: state({ title: 'Retro' }) },
			{ ...move(from), path: to, before: state({ title: 'Retro' }), after: state({ title: 'Retro', start: 780, end: 810 }) },
		]);
		expect(h.redo).toEqual([move(`${VAULT}/other.md`), { ...del(from), path: to, state: state({ title: 'Retro' }) }]);
	});

	it('keeps a title that is not the old filename base', () => {
		const titled: HistoryOp = { kind: 'update', label: 'Edit event', path: from, before: state({ title: 'Team sync' }), after: state({ title: 'Daily sync' }) };
		const h = followRename(pushOp(createEventHistory(), titled), from, to, 'Standup', 'Retro');

		expect(h.undo).toEqual([{ ...titled, path: to }]);
	});

	it('leaves the input untouched and a history without that path unchanged', () => {
		const h = pushAll(createEventHistory(), [move(from), move(`${VAULT}/b.md`)]);
		const snapshot = structuredClone(h);
		expect(followRename(h, from, to, 'Standup', 'Retro')).not.toEqual(h);
		expect(h).toEqual(snapshot);
		expect(followRename(h, `${VAULT}/x.md`, to, 'x', 'Retro')).toEqual(h);
	});
});
