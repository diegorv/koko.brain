/**
 * Field-level undo / redo history of the event calendar. Pure: every
 * function returns a new history and leaves its input untouched, so the
 * data store can replace its state field with the result.
 *
 * Ops record what changed on one note (`HistoryOp`), not a snapshot of the
 * whole calendar, so the write services can check a precondition before
 * applying an op and the history can follow a renamed note (`remapPath`)
 * or forget a removed one (`dropPath`).
 */

import { sameEventState } from './event-calendar-event.logic';
import type { EventState, HistoryOp } from './event-calendar.types';

/** Undo and redo stacks of the calendar, newest op last. */
export interface EventHistory {
	/** Ops that can be undone, newest last. */
	undo: HistoryOp[];
	/** Ops that can be redone, newest last. */
	redo: HistoryOp[];
	/** Most ops the undo stack keeps; the oldest is dropped past it. */
	max: number;
}

/** An op taken off one stack, plus the history with it on the other stack. */
export interface TakenOp {
	/** The op to apply (undo it, or redo it). */
	op: HistoryOp;
	/** History with the op moved to the opposite stack. */
	history: EventHistory;
}

/** Creates an empty history that keeps at most `max` undo ops. */
export function createEventHistory(max = 100): EventHistory {
	return { undo: [], redo: [], max };
}

/**
 * Records a new op. An `update` whose before equals its after is not a
 * change and returns `h` itself. Otherwise the op goes on the undo stack,
 * the oldest op is dropped past `max`, and the redo stack is cleared.
 */
export function pushOp(h: EventHistory, op: HistoryOp): EventHistory {
	if (op.kind === 'update' && sameEventState(op.before, op.after)) return h;
	const undo = [...h.undo, op];
	return { undo: undo.length > h.max ? undo.slice(undo.length - h.max) : undo, redo: [], max: h.max };
}

/** Takes the newest undo op and moves it to the redo stack; null when there is none. */
export function takeUndo(h: EventHistory): TakenOp | null {
	const op = h.undo.at(-1);
	if (!op) return null;
	return { op, history: { undo: h.undo.slice(0, -1), redo: [...h.redo, op], max: h.max } };
}

/** Takes the newest redo op and moves it to the undo stack; null when there is none. */
export function takeRedo(h: EventHistory): TakenOp | null {
	const op = h.redo.at(-1);
	if (!op) return null;
	return { op, history: { undo: [...h.undo, op], redo: h.redo.slice(0, -1), max: h.max } };
}

/** Removes every op matching `predicate` from both stacks. */
export function removeOp(h: EventHistory, predicate: (op: HistoryOp) => boolean): EventHistory {
	return { undo: h.undo.filter((op) => !predicate(op)), redo: h.redo.filter((op) => !predicate(op)), max: h.max };
}

/**
 * Removes `op` itself (by reference) from both stacks. The service calls it
 * when an op it took fails its precondition, so it is not offered again.
 * Call it before any `remapPath` of the op's path: a remap replaces the op
 * object, and the old reference then matches nothing.
 */
export function refuseOp(h: EventHistory, op: HistoryOp): EventHistory {
	return removeOp(h, (candidate) => candidate === op);
}

/** Points every op on `from` at `to`, on both stacks (a renamed or moved note). */
export function remapPath(h: EventHistory, from: string, to: string): EventHistory {
	const remap = (op: HistoryOp): HistoryOp => (op.path === from ? { ...op, path: to } : op);
	return { undo: h.undo.map(remap), redo: h.redo.map(remap), max: h.max };
}

/**
 * Follows a note renamed or moved outside the calendar: `remapPath`, and a
 * recorded title equal to `fromBase` becomes `toBase`. An untitled note shows
 * its filename as its title, so without the swap every op on it would fail
 * its state precondition once the calendar reads the new name. A note whose
 * `event_title` equals its old filename base is misread as untitled.
 * @param fromBase - filename base of `from`, without `.md`
 * @param toBase - filename base of `to`, without `.md`
 */
export function followRename(h: EventHistory, from: string, to: string, fromBase: string, toBase: string): EventHistory {
	const title = (state: EventState): EventState => (state.title === fromBase ? { ...state, title: toBase } : state);
	const follow = (op: HistoryOp): HistoryOp => {
		if (op.path !== from) return op;
		return op.kind === 'update' ? { ...op, path: to, before: title(op.before), after: title(op.after) } : { ...op, path: to, state: title(op.state) };
	};
	return { undo: h.undo.map(follow), redo: h.redo.map(follow), max: h.max };
}

/** Removes every op on `path` from both stacks (a note that is gone). */
export function dropPath(h: EventHistory, path: string): EventHistory {
	return removeOp(h, (op) => op.path === path);
}
