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

/**
 * Every `EventState` key, checked at compile time: a field added to
 * `EventFields` fails here until it is listed, so `sameState` never misses it.
 */
const STATE_KEY_SET = {
	title: true,
	date: true,
	start: true,
	end: true,
	allDay: true,
	color: true,
	location: true,
} satisfies Record<keyof EventState, true>;

const STATE_KEYS = Object.keys(STATE_KEY_SET) as (keyof EventState)[];

/**
 * Whether two event states hold the same value in every field.
 * Follow-up: switch to ticket 07's `sameEventState` once it is on main.
 */
function sameState(a: EventState, b: EventState): boolean {
	return STATE_KEYS.every((key) => a[key] === b[key]);
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
	if (op.kind === 'update' && sameState(op.before, op.after)) return h;
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

/** Removes every op on `path` from both stacks (a note that is gone). */
export function dropPath(h: EventHistory, path: string): EventHistory {
	return removeOp(h, (op) => op.path === path);
}
