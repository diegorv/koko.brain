// @vitest-environment jsdom
/**
 * Model test of the Calendar write queue, the pending overlay and its
 * tombstones. Seeded op sequences run against the in-memory vault of
 * `calendar-vault.fixture.ts`; ops are fired without awaiting each one, and
 * held writes / renames decide when they land, so writes, undos, outside path
 * changes and index bumps interleave. After each sequence everything settles,
 * the queue drains, the index bumps, and the invariants are checked against
 * the vault Map. A failure prints its seed (or sequence name) and op list;
 * `MODEL_SEED=<n> pnpm vitest run <this file>` replays one seed alone.
 *
 * The calendar's own renames use the fixture's `renameItem`: a move on the
 * disk that returns at once, or after a held tail (`holdRenameTail`); a named
 * sequence can switch them to the real one (`realRenames`). Outside
 * renames and every delete and restore run the real path-change owner, whose
 * tail `holdScan` can hold. The random runs start one path change (a rename,
 * create, delete, restore, or an undo / redo that may run one) only once the
 * previous one has settled, except an outside rename while only calendar
 * deletes are in flight and an outside delete while only calendar deletes or
 * restores (an undo or redo that restores included) are, and while one other than a calendar edit, create or duplicate
 * runs, a field write targets only a note the store showed before it began;
 * an outside rename targets only a note with no calendar field write in
 * flight (the limitation `followPathChange` documents). An outside delete may
 * target a note with one in flight: the write is refused (Issue 59).
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';
setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
	readDir: vi.fn(),
	mkdir: vi.fn(),
	rename: vi.fn(),
	remove: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), dismiss: vi.fn() }),
}));

vi.mock('#lib/core/filesystem/fs.service.js', async () => {
	const actual = await vi.importActual<typeof import('#lib/core/filesystem/fs.service.js')>('#lib/core/filesystem/fs.service.js');
	return { ...actual, renameItem: vi.fn(), deleteItem: vi.fn(actual.deleteItem), createFile: vi.fn(actual.createFile) };
});

import { invoke } from '@tauri-apps/api/core';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { getFileName } from '#lib/core/filesystem/fs.logic.js';
import { deleteItem, renameItem } from '#lib/core/filesystem/fs.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { trashStore } from '#lib/core/trash/trash.store.svelte.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { switchVault } from '#lib/core/vault/vault.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { eventState, eventsFromEntries, mergePending, prunePending } from '#lib/features/event-calendar/event-calendar-event.logic.js';
import {
	createEvent,
	deleteEvent,
	drainEventCalendarWrites,
	duplicateEvent,
	editEvent,
	findCalendarEvent,
	moveEvent,
	moveEventToDay,
	redoEventChange,
	registerEventCalendarPathChangeConsumer,
	resetEventCalendar,
	resizeEvent,
	restoreDeletedEvent,
	undoEventChange,
	type EventChangeResult,
} from '#lib/features/event-calendar/event-calendar.service.js';
import { eventCalendarStore } from '#lib/features/event-calendar/event-calendar.store.svelte.js';
import type { EventNote } from '#lib/features/event-calendar/event-calendar.types.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { createCalendarVault, eventFile } from '../../../fixtures/calendar-vault.fixture';
import { registerAppPorts } from '#lib/app/boot.js';

// The app shell registers the calendar write barrier switchVault drains.
registerAppPorts();

const VAULT = '/vault';
const OTHER_VAULT = '/other';
const P = (name: string) => `${VAULT}/${name}.md`;
/** Filename base of a note path. */
const baseOf = (path: string) => getFileName(path).replace(/\.md$/, '');

/** Titles the generator draws from, so creates, renames and restores collide. */
const TITLES = ['Standup', 'Retro', 'Planning', 'Daily sync'];
const DATES = ['2026-11-10', '2026-11-11', '2026-11-12'];

/** One step of a sequence. Note names are filename bases in the vault root. */
type Op =
	| { op: 'move'; name: string; date: string; start: number; end: number }
	| { op: 'moveToDay'; name: string; date: string }
	| { op: 'resize'; name: string; end: number }
	| { op: 'edit'; name: string; title?: string; start?: number; end?: number; location?: string }
	| { op: 'create'; title: string; date: string; start: number; end: number }
	| { op: 'duplicate'; name: string }
	| { op: 'delete'; name: string }
	| { op: 'restore'; name: string }
	| { op: 'undo' }
	| { op: 'redo' }
	| { op: 'outsideRename'; name: string; to: string }
	| { op: 'outsideDelete'; name: string }
	| { op: 'outsideCreate'; name: string; start: string }
	| { op: 'bump' }
	| { op: 'drain' }
	| { op: 'hold' }
	| { op: 'holdRename' }
	| { op: 'holdRenameTail' }
	| { op: 'holdScan' }
	| { op: 'release' }
	| { op: 'flush'; n: number }
	// Named sequences only:
	| { op: 'settle' }
	| { op: 'refresh' }
	| { op: 'freeze' }
	| { op: 'thaw' }
	| { op: 'staleBump' }
	| { op: 'lookup'; name: string; bumpDuringRead?: boolean }
	| { op: 'switchVault' }
	| { op: 'reopen' }
	| { op: 'realRenames' }
	| { op: 'failWrite' }
	| { op: 'check' };

/** Seeded PRNG (mulberry32): the same seed gives the same sequence. */
function prng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const vault = createCalendarVault();

/** Inputs of `eventsFromEntries` as the service builds them. */
function projectionOptions() {
	const s = settingsStore.eventCalendar;
	return {
		defaults: { defaultDurationMinutes: s.defaultDurationMinutes, defaultColor: s.defaultColor },
		typeName: s.eventTypeName,
		vaultPath: vaultStore.path,
		systemFolder: settingsStore.templates.systemFolder,
	};
}

/** Events projected from `entries`, sorted by path. */
function project(entries: NoteEntryV2[]): EventNote[] {
	return eventsFromEntries(entries, projectionOptions()).events.sort((a, b) => (a.path < b.path ? -1 : 1));
}

/** `event` without the overlay flag. */
function plain(event: EventNote & { pending?: boolean }): EventNote {
	const { pending: _pending, ...rest } = event;
	return rest;
}

/** The events the store shows, without the overlay flag, sorted by path. */
function shownEvents(): EventNote[] {
	return eventCalendarStore.events.map(plain).sort((a, b) => (a.path < b.path ? -1 : 1));
}

/** State of one sequence run. */
interface Run {
	/** Ops executed so far, in order. */
	log: Op[];
	/** Every op promise fired, settled or not. */
	inFlight: Promise<unknown>[];
	/** Held writes and renames, oldest first. */
	gates: { resolve: () => void }[];
	/** Calendar ops and outside changes fired and not settled yet. */
	changing: number;
	/** Ops that may move, create or delete a note (`movesPaths`) fired and not settled yet. */
	movingPaths: number;
	/** Calendar deletes fired and not settled yet. */
	deleting: number;
	/** Calendar restores fired and not settled yet, an undo or redo that restores included (`restores`). */
	restoring: number;
	/**
	 * Notes the store showed when the path changes in flight began, or null
	 * while the one in flight is a calendar edit, create or duplicate (each
	 * holds the write queue of the path it lands on until it shows the note
	 * there, so a write may target the new name).
	 */
	shownBefore: Set<string> | null;
	/** Field writes fired and not settled yet, per note name. */
	writing: Map<string, number>;
	/** Undo and redo outcomes, with the index of their op in `log`. */
	changes: { at: number; result: EventChangeResult }[];
	/** Invariant breaches found while running (lookups). */
	violations: string[];
}

/** Lets `n` microtask turns run. */
async function flush(n: number): Promise<void> {
	for (let i = 0; i < n; i++) await Promise.resolve();
}

/** Whether `op` may move, create or delete a note: a rename, a delete, a restore, a create, or an undo / redo of one. */
function movesPaths(op: Op): boolean {
	switch (op.op) {
		case 'create':
		case 'duplicate':
		case 'delete':
		case 'restore':
		case 'undo':
		case 'redo':
		case 'outsideRename':
		case 'outsideDelete':
		case 'outsideCreate':
			return true;
		case 'edit':
			return op.title !== undefined;
		default:
			return false;
	}
}

/**
 * Whether `op`, about to be fired, restores a note from the Trash: a restore,
 * or an undo of a delete or redo of a create. An undo or redo counts only with
 * no field write in flight, which could record an op above the one it would take.
 */
function restores(run: Run, op: Op): boolean {
	if (op.op === 'restore') return true;
	if (op.op !== 'undo' && op.op !== 'redo') return false;
	if ([...run.writing.values()].some((n) => n > 0)) return false;
	const { undo, redo } = eventCalendarStore.history;
	return op.op === 'undo' ? undo.at(-1)?.kind === 'delete' : redo.at(-1)?.kind === 'create';
}

/**
 * Keeps `promise`, the outcome of the latest op in `run.log`, in the run; a
 * rejection is an outcome, not a failure. `changesNotes` counts it toward
 * `run.changing` (and toward `run.movingPaths` per `movesPaths`, and toward
 * `run.restoring` when `restoring`) until it settles.
 */
function fire(run: Run, promise: Promise<unknown>, changesNotes = true, restoring = false): void {
	const op = run.log[run.log.length - 1];
	const moving = changesNotes && movesPaths(op);
	const written = changesNotes && !moving && 'name' in op ? op.name : null;
	if (moving && run.movingPaths === 0) run.shownBefore = op.op === 'edit' || op.op === 'create' || op.op === 'duplicate' ? null : new Set(eventCalendarStore.events.map((event) => baseOf(event.path)));
	if (changesNotes) run.changing += 1;
	if (moving) run.movingPaths += 1;
	if (changesNotes && op.op === 'delete') run.deleting += 1;
	if (restoring) run.restoring += 1;
	if (written !== null) run.writing.set(written, (run.writing.get(written) ?? 0) + 1);
	const settle = () => {
		if (changesNotes) run.changing -= 1;
		if (moving) run.movingPaths -= 1;
		if (changesNotes && op.op === 'delete') run.deleting -= 1;
		if (restoring) run.restoring -= 1;
		if (written !== null) run.writing.set(written, run.writing.get(written)! - 1);
	};
	run.inFlight.push(promise.then(settle, settle));
}

/** The lookup oracle: what a reload at version `version` over `entries` would show at `path`. */
function expectedLookup(path: string, entries: NoteEntryV2[], version: number): EventNote | null {
	const events = eventsFromEntries(entries, projectionOptions()).events;
	const write = eventCalendarStore.pendingWrite(path);
	const kept = write ? prunePending([write], events, version) : [];
	const found = mergePending(events, kept).find((event) => event.path === path);
	return found ? plain(found) : null;
}

/** Runs one op. Calendar ops and outside changes are fired, not awaited. */
async function runOp(run: Run, op: Op): Promise<void> {
	run.log.push(op);
	const at = run.log.length - 1;
	switch (op.op) {
		case 'move':
			return fire(run, moveEvent(P(op.name), { date: op.date, start: op.start, end: op.end }));
		case 'moveToDay':
			return fire(run, moveEventToDay(P(op.name), op.date));
		case 'resize':
			return fire(run, resizeEvent(P(op.name), op.end));
		case 'edit': {
			const { op: _op, name, ...patch } = op;
			return fire(run, editEvent(P(name), patch));
		}
		case 'create':
			return fire(run, createEvent({ title: op.title, date: op.date, start: op.start, end: op.end, allDay: false, color: 'blue', location: '', notes: '' }));
		case 'duplicate':
			return fire(run, duplicateEvent(P(op.name)));
		case 'delete':
			return fire(run, deleteEvent(P(op.name)));
		case 'restore':
			return fire(run, restoreDeletedEvent(P(op.name)), true, true);
		case 'undo':
		case 'redo': {
			const restoring = restores(run, op);
			return fire(
				run,
				(op.op === 'undo' ? undoEventChange() : redoEventChange()).then((result) => {
					run.changes.push({ at, result });
				}),
				true,
				restoring,
			);
		}
		case 'outsideRename':
			return fire(run, outsideRenameItem(P(op.name), `${op.to}.md`));
		case 'outsideDelete':
			return fire(run, deleteItem(P(op.name)));
		case 'outsideCreate':
			vault.disk.set(P(op.name), eventFile({ start: op.start }));
			return;
		case 'bump':
			return fire(run, vault.refresh(), false);
		case 'drain':
			return fire(run, drainEventCalendarWrites(), false);
		case 'hold':
			run.gates.push(vault.holdNextWrite());
			return;
		case 'holdRename':
			run.gates.push(vault.holdNextRename());
			return;
		case 'holdRenameTail':
			run.gates.push(vault.holdNextRenameTail());
			return;
		case 'holdScan':
			run.gates.push(vault.holdNextScan());
			return;
		case 'release':
			run.gates.shift()?.resolve();
			return;
		case 'flush':
			return flush(op.n);
		case 'settle':
			await Promise.all(run.inFlight);
			return;
		case 'refresh':
			return vault.refresh();
		case 'freeze':
			return vault.freezeIndex();
		case 'thaw':
			return vault.thawIndex();
		case 'staleBump':
			return vault.staleBump();
		case 'lookup': {
			const path = P(op.name);
			const expected = expectedLookup(path, vault.servedEntries(), vaultStore.vaultIndexVersion);
			if (op.bumpDuringRead) vault.bumpOnNextRead();
			return fire(
				run,
				findCalendarEvent(path).then((found) => {
					if (JSON.stringify(found) !== JSON.stringify(expected)) {
						run.violations.push(`lookup #${at} of ${path}: got ${JSON.stringify(found)}, a reload at the version it read shows ${JSON.stringify(expected)}`);
					}
				}),
				false,
			);
		}
		case 'switchVault':
			return fire(run, switchVault(OTHER_VAULT), false);
		case 'reopen':
			// What teardown and initializeVault do around a switch, back to the first vault.
			resetEventCalendar();
			vaultStore.open(VAULT);
			return;
		case 'realRenames':
			// The calendar's own renames run the path-change owner too, so the
			// consumer sees them and must take the own-change mark.
			vi.mocked(renameItem).mockImplementation(outsideRenameItem);
			return;
		case 'failWrite':
			// The next note write rejects and leaves the disk as it was.
			vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
			return;
		case 'check': {
			// Mid-run the overlay stands in for the index, so only the event states count (an overlay has no snippet).
			const states = (events: EventNote[]) => events.map((event) => ({ path: event.path, ...eventState(event) }));
			expect(states(shownEvents()), `the store shows the vault after op #${at}`).toEqual(states(project(vault.diskEntries())));
			return;
		}
	}
}

/** Settles the run, drains, bumps the index (`endBumps` times, when given) and checks every invariant. */
async function finish(run: Run, endBumps?: number): Promise<void> {
	while (run.gates.length > 0) {
		run.gates.shift()!.resolve();
		await flush(5);
	}
	await Promise.all(run.inFlight);
	await drainEventCalendarWrites();
	vault.thawIndex();
	// A settled overlay that the index has not matched goes once
	// `version >= settledAtVersion + 2` (`prunePending`), whatever its state, so
	// a second bump would hide an overlay the index never caught up with. One
	// bump, then; a run with an outside change gets two, because some of those
	// runs still leave a clocked overlay that one bump does not prune.
	const bumps = endBumps ?? (run.log.some((op) => op.op.startsWith('outside')) ? 2 : 1);
	await vault.refresh(bumps);

	expect(run.violations, run.violations.join('\n')).toEqual([]);
	// No ghost events, no hidden events.
	const projected = project(vault.diskEntries());
	const pendingWrites = [...eventCalendarStore.pendingPaths].map((path) => {
		const { kind, settled, settledAtVersion } = eventCalendarStore.pendingWrite(path)!;
		return { path, kind, settled, settledAtVersion };
	});
	expect(pendingWrites, `no pending write outlives the drain and ${bumps} bump(s) (at version ${vaultStore.vaultIndexVersion}: ${JSON.stringify(pendingWrites)})`).toEqual([]);
	expect(shownEvents().map((e) => e.path), 'the store shows the paths of the vault').toEqual(projected.map((e) => e.path));
	expect(shownEvents(), 'the store shows the vault').toEqual(projected);
	// The model has no outside field edit, so an undo or redo finds the state it
	// expects, whatever is in flight when it is issued (it waits for the writes
	// fired before it, Issue 48) and whatever is fired after it (f98118d3): none
	// is refused for a changed note. A `not-in-trash` refusal is legitimate: a
	// restore took the Trash entry.
	const refused = run.changes.filter(({ result }) => result.status === 'refused' && result.reason === undefined);
	expect(refused.map(({ at, result }) => `#${at} ${run.log[at].op} ${result.label}`), 'no undo or redo is refused').toEqual([]);
	// Every note write is followed by its own index update in the vault it was
	// written in: each write takes the first later, unclaimed update of its path.
	const claimed = new Set<number>();
	const unindexed = vault.writes.filter((write) => {
		const match = vault.indexed.find((entry) => entry.path === write.path && entry.vault === VAULT && entry.seq > write.seq && !claimed.has(entry.seq));
		if (match) claimed.add(match.seq);
		return !match;
	});
	expect(unindexed, `every write is followed by an update_note_in_index in ${VAULT}`).toEqual([]);
}

/** Runs `step` until it returns null, then finishes (see `finish`); a failure carries `label` and the op list. */
async function runModel(label: string, step: (run: Run) => Op[] | null, endBumps?: number): Promise<void> {
	const run: Run = { log: [], inFlight: [], gates: [], changing: 0, movingPaths: 0, deleting: 0, restoring: 0, shownBefore: new Set(), writing: new Map(), changes: [], violations: [] };
	try {
		for (let ops = step(run); ops !== null; ops = step(run)) {
			for (const op of ops) await runOp(run, op);
		}
		await finish(run, endBumps);
	} catch (err) {
		// Held writes would wedge the queue for the next test.
		for (const gate of run.gates) gate.resolve();
		const message = err instanceof Error ? err.message : String(err);
		// The message alone truncates a deep-equal diff; spell out both sides.
		const diff = err instanceof Error && 'actual' in err ? `\nactual: ${JSON.stringify(err.actual)}\nexpected: ${JSON.stringify((err as { expected?: unknown }).expected)}` : '';
		throw new Error(`model run ${label} failed: ${message}${diff}\nops:\n${run.log.map((op, i) => `  #${i} ${JSON.stringify(op)}`).join('\n')}`, { cause: err });
	}
}

/** Runs a fixed op list. */
function runSequence(name: string, ops: Op[]): Promise<void> {
	let done = false;
	return runModel(`"${name}"`, () => {
		if (done) return null;
		done = true;
		return ops;
	});
}

/** Number of random steps per seed. */
const STEPS = 40;
/** Number of fixed seeds the random run covers. */
const SEEDS = 300;
/** The seeds to run: `MODEL_SEED` alone when set, else 1..SEEDS. */
const seeds = process.env.MODEL_SEED ? [Number(process.env.MODEL_SEED)] : Array.from({ length: SEEDS }, (_, i) => i + 1);
/**
 * Seeds per test. One test for all seeds takes about 1 s alone but passed the
 * 5 s per-test timeout in a loaded full run; chunks keep the timeout's headroom.
 */
const SEEDS_PER_TEST = 30;
/** `seeds` split into the runs of one test each. */
const seedChunks = Array.from({ length: Math.ceil(seeds.length / SEEDS_PER_TEST) }, (_, i) => seeds.slice(i * SEEDS_PER_TEST, (i + 1) * SEEDS_PER_TEST));

/** One random step from the current store, disk and Trash, followed by a random flush. */
function randomStep(rnd: () => number, run: Run): Op[] {
	const pick = <T>(items: readonly T[]): T => items[Math.floor(rnd() * items.length)];
	const shown = eventCalendarStore.events.map((event) => baseOf(event.path));
	const onDisk = [...vault.disk.keys()].filter((p) => p.startsWith(`${VAULT}/`) && !p.includes('/.')).map(baseOf);
	const trashed = trashStore.items.map((item) => item.originalPath.replace(/\.md$/, ''));
	const free = TITLES.filter((title) => !onDisk.includes(title));
	const start = 480 + 30 * Math.floor(rnd() * 16);
	// Path changes run one at a time, except an outside change while only
	// calendar deletes run (or restores, for an outside delete); a field write during one other than a calendar
	// edit, create or duplicate targets a note shown before it began, and an outside rename targets a note
	// with no field write in flight (see the file header). Field writes, bumps,
	// drains and held writes interleave with everything else.
	const one = run.movingPaths === 0;
	const outsideOk = run.movingPaths === run.deleting;
	const outsideDeleteOk = run.movingPaths === run.deleting + run.restoring;
	const shownBefore = run.shownBefore;
	const writable = one || shownBefore === null ? shown : shown.filter((name) => shownBefore.has(name));
	const idleNotes = onDisk.filter((name) => !run.writing.get(name));
	const options: [number, () => Op | null][] = [
		[10, () => (writable.length ? { op: 'move', name: pick(writable), date: pick(DATES), start, end: start + 30 } : null)],
		[4, () => (writable.length ? { op: 'moveToDay', name: pick(writable), date: pick(DATES) } : null)],
		// Every start the model writes is before 16:00, so a resize to 16:00 or later keeps
		// the end after the start even when a move lands first.
		[6, () => (writable.length ? { op: 'resize', name: pick(writable), end: 960 + 30 * Math.floor(rnd() * 4) } : null)],
		[8, () => (writable.length ? { op: 'edit', name: pick(writable), ...(one && rnd() < 0.6 ? { title: pick(TITLES) } : {}), ...(rnd() < 0.5 ? { start, end: start + 30 } : { location: pick(['', 'Room 1']) }) } : null)],
		[5, () => (one ? { op: 'create', title: pick(TITLES), date: pick(DATES), start, end: start + 30 } : null)],
		[4, () => (one && shown.length ? { op: 'duplicate', name: pick(shown) } : null)],
		[5, () => (one && shown.length ? { op: 'delete', name: pick(shown) } : null)],
		[4, () => (one && trashed.length ? { op: 'restore', name: pick(trashed) } : null)],
		[10, () => (one ? { op: 'undo' } : null)],
		[6, () => (one ? { op: 'redo' } : null)],
		[3, () => (outsideOk && idleNotes.length && free.length ? { op: 'outsideRename', name: pick(idleNotes), to: pick(free) } : null)],
		// Heavier while a restore runs, so the random runs reach its tail (Issue 49).
		// An outside delete may target a note with a field write in flight (Issue 59).
		[run.restoring > 0 ? 12 : 2, () => (outsideDeleteOk && onDisk.length ? { op: 'outsideDelete', name: pick(onDisk) } : null)],
		[2, () => (one && free.length ? { op: 'outsideCreate', name: pick(free), start: '14:00' } : null)],
		[8, () => ({ op: 'bump' })],
		[2, () => ({ op: 'drain' })],
		[4, () => (run.gates.length < 3 ? { op: 'hold' } : null)],
		[1, () => (run.gates.length < 3 ? { op: 'holdRename' } : null)],
		[2, () => (run.gates.length < 3 ? { op: 'holdRenameTail' } : null)],
		[2, () => (run.gates.length < 3 ? { op: 'holdScan' } : null)],
		[6, () => (run.gates.length > 0 ? { op: 'release' } : null)],
	];
	const total = options.reduce((sum, [weight]) => sum + weight, 0);
	for (;;) {
		let roll = rnd() * total;
		for (const [weight, make] of options) {
			roll -= weight;
			if (roll >= 0) continue;
			const op = make();
			if (op) return [op, { op: 'flush', n: Math.floor(rnd() * 12) }];
			break;
		}
	}
}

let unregister: () => void;
/** The real `renameItem`, for renames made outside the calendar. */
let outsideRenameItem: (from: string, newName: string) => Promise<string>;

/** A fresh vault with Standup and Retro, fresh stores and the path-change consumer registered. */
async function setUp(): Promise<void> {
	clearLocalStorage();
	settingsStore.reset();
	editorStore.reset();
	invalidateVaultEntries();
	vaultStore._reset();
	vaultStore.open(VAULT);
	resetEventCalendar();
	vault.install();
	// An outside rename runs the real path-change owner, which is what reaches
	// the calendar's consumer. The calendar's own rename stays the fixture's
	// move on the disk (see the file header).
	outsideRenameItem = (await vi.importActual<typeof import('#lib/core/filesystem/fs.service.js')>('#lib/core/filesystem/fs.service.js')).renameItem;
	// The link rewrite of a rename reads the note's backlinks; none here.
	const served = vi.mocked(invoke).getMockImplementation()!;
	vi.mocked(invoke).mockImplementation(async (cmd, args) => (cmd === 'get_backlinks_v2' ? [] : served(cmd, args)));
	unregister = registerEventCalendarPathChangeConsumer();
	vault.disk.set(P('Standup'), eventFile());
	vault.disk.set(P('Retro'), eventFile({ date: '2026-11-11', start: '11:00', end: '12:00' }));
	await vault.refresh();
}

/** Unregisters the consumer, drains and resets the mocks. */
async function tearDown(): Promise<void> {
	unregister();
	await vault.teardown();
}

// The rename, delete and restore paths import these lazily. A first import
// loads the module asynchronously, which would make the first seed's
// interleaving depend on load time; loading them up front keeps every seed
// reproducible whichever tests run before it.
beforeAll(async () => {
	await Promise.all([
		import('#lib/core/filesystem/fs.store.svelte.js'),
		import('#lib/core/filesystem/file-entries.logic.js'),
		import('#lib/core/filesystem/wikilink-resolution.logic.js'),
		import('#lib/core/trash/trash.service.js'),
		import('#lib/features/backlinks/backlinks.logic.js'),
		import('#lib/features/quick-switcher/quick-switcher.store.svelte.js'),
	]);
});

beforeEach(async () => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	await setUp();
});

afterEach(async () => {
	await tearDown();
	vi.restoreAllMocks();
});

describe('Calendar write queue model', () => {
	describe('named sequences, one per past bug', () => {
		it('two back-to-back undos where the newer one renames (4e07625f)', async () => {
			await runSequence('back-to-back undos', [
				{ op: 'move', name: 'Standup', date: '2026-11-11', start: 600, end: 660 },
				{ op: 'settle' },
				{ op: 'edit', name: 'Standup', title: 'Daily sync' },
				{ op: 'settle' },
				{ op: 'refresh' },
				{ op: 'refresh' },
				{ op: 'settle' },
				{ op: 'undo' },
				{ op: 'undo' },
			]);
		});

		it('an undo issued before a drag on the same event (f98118d3)', async () => {
			await runSequence('undo then drag', [
				{ op: 'move', name: 'Standup', date: '2026-11-11', start: 600, end: 660 },
				{ op: 'settle' },
				{ op: 'undo' },
				{ op: 'move', name: 'Standup', date: '2026-11-12', start: 720, end: 780 },
				{ op: 'undo' },
				{ op: 'edit', name: 'Standup', title: 'Daily sync' },
			]);
		});

		it('an outside rename A->B->A before a bump (83c7896a)', async () => {
			await runSequence('rename and rename back', [
				{ op: 'outsideRename', name: 'Standup', to: 'Planning' },
				{ op: 'settle' },
				{ op: 'outsideRename', name: 'Planning', to: 'Standup' },
				{ op: 'settle' },
				{ op: 'check' },
			]);
		});

		it('a rename then a delete before a bump (90f794cc)', async () => {
			await runSequence('rename then delete', [
				{ op: 'move', name: 'Standup', date: '2026-11-11', start: 600, end: 660 },
				{ op: 'settle' },
				{ op: 'outsideRename', name: 'Standup', to: 'Planning' },
				{ op: 'settle' },
				{ op: 'outsideDelete', name: 'Planning' },
				{ op: 'settle' },
				{ op: 'check' },
			]);
		});

		it('an index bump between the rename and the field write (abeec4ee)', async () => {
			await runSequence('bump between rename and field write', [
				{ op: 'hold' },
				{ op: 'edit', name: 'Standup', title: 'Daily sync', start: 600, end: 660 },
				{ op: 'flush', n: 40 },
				// Rust has indexed the rename; the field write is still on its way.
				{ op: 'refresh' },
				{ op: 'freeze' },
				{ op: 'release' },
				{ op: 'settle' },
				// The next refresh still serves the renamed note with its old fields.
				{ op: 'refresh' },
				{ op: 'check' },
			]);
		});

		it('a restore onto a suffixed path while the delete tombstone stands (606978d4, 471978db)', async () => {
			await runSequence('suffixed restore over a tombstone', [
				{ op: 'delete', name: 'Standup' },
				{ op: 'settle' },
				{ op: 'outsideCreate', name: 'Standup', start: '14:00' },
				// The index lists the new note; the delete tombstone still hides it.
				{ op: 'refresh' },
				{ op: 'restore', name: 'Standup' },
				{ op: 'settle' },
				{ op: 'check' },
			]);
		});

		it('a suffixed restore leaves the later create on the old path its own (40a3b8a1)', async () => {
			await runSequence('suffixed restore after a create', [
				{ op: 'delete', name: 'Standup' },
				{ op: 'settle' },
				{ op: 'refresh' },
				{ op: 'refresh' },
				{ op: 'create', title: 'Standup', date: '2026-11-10', start: 570, end: 600 },
				{ op: 'settle' },
				{ op: 'refresh' },
				{ op: 'refresh' },
				{ op: 'restore', name: 'Standup' },
				{ op: 'settle' },
				{ op: 'refresh' },
				{ op: 'refresh' },
				{ op: 'undo' },
				{ op: 'undo' },
			]);
		});

		it('a duplicate while a redo restores the copy (9b8f4aa6)', async () => {
			await runSequence('duplicate during a redo restore', [
				{ op: 'duplicate', name: 'Standup' },
				{ op: 'settle' },
				{ op: 'refresh' },
				{ op: 'refresh' },
				{ op: 'undo' },
				{ op: 'settle' },
				{ op: 'refresh' },
				{ op: 'refresh' },
				{ op: 'settle' },
				{ op: 'holdRename' },
				{ op: 'redo' },
				{ op: 'duplicate', name: 'Standup' },
				{ op: 'flush', n: 40 },
				{ op: 'release' },
				{ op: 'settle' },
				{ op: 'undo' },
				{ op: 'undo' },
			]);
		});

		it('a write on the new path during the calendar rename tail (Issue 45)', async () => {
			await runSequence('write during the rename tail', [
				{ op: 'holdRenameTail' },
				{ op: 'edit', name: 'Standup', title: 'Daily sync', start: 600, end: 660 },
				{ op: 'flush', n: 40 },
				// The note is at its new path on disk; the rename has not returned.
				{ op: 'refresh' },
				{ op: 'move', name: 'Daily sync', date: '2026-11-12', start: 720, end: 780 },
				{ op: 'flush', n: 40 },
				{ op: 'release' },
				{ op: 'settle' },
			]);
			// The move, fired after the edit, lands after it on disk.
			expect(project(vault.diskEntries()).map(eventState)).toEqual([
				expect.objectContaining({ title: 'Daily sync', date: '2026-11-12', start: 720, end: 780 }),
				expect.objectContaining({ title: 'Retro' }),
			]);
		});

		it('a calendar rename onto a path with writes still queued for the note that left it (Issue 45)', async () => {
			await runSequence('rename onto a path with queued writes', [
				{ op: 'hold' },
				{ op: 'edit', name: 'Standup', title: 'Planning', start: 600, end: 660 },
				{ op: 'flush', n: 40 },
				// Queued behind the rename; Standup has left the path when it runs.
				{ op: 'move', name: 'Standup', date: '2026-11-12', start: 720, end: 780 },
				{ op: 'flush', n: 40 },
				{ op: 'hold' },
				{ op: 'edit', name: 'Retro', title: 'Standup', start: 780, end: 810 },
				{ op: 'flush', n: 40 },
				{ op: 'release' },
				{ op: 'flush', n: 40 },
				{ op: 'release' },
				{ op: 'settle' },
			]);
		});

		it('a move on a created note that the index shows before the create returns (Issue 47)', async () => {
			await runSequence('move before the create returns', [
				{ op: 'holdScan' },
				{ op: 'create', title: 'Planning', date: '2026-11-10', start: 570, end: 600 },
				{ op: 'flush', n: 40 },
				// The note is on disk; `createFile` has not returned.
				{ op: 'refresh' },
				{ op: 'move', name: 'Planning', date: '2026-11-12', start: 720, end: 780 },
				{ op: 'flush', n: 40 },
				{ op: 'release' },
				{ op: 'settle' },
				{ op: 'check' },
				{ op: 'undo' },
				{ op: 'settle' },
				{ op: 'check' },
			]);
			// The first undo reverted the move; the create is next.
			expect(project(vault.diskEntries()).map(eventState)).toEqual([
				expect.objectContaining({ title: 'Planning', date: '2026-11-10', start: 570, end: 600 }),
				expect.objectContaining({ title: 'Retro' }),
				expect.objectContaining({ title: 'Standup' }),
			]);
			expect(eventCalendarStore.history.undo.map((op) => op.label)).toEqual(['Create event']);
			expect(eventCalendarStore.history.redo.map((op) => op.label)).toEqual(['Move event']);
		});

		it('an outside rename while the calendar\'s own rename runs through the path-change owner (Issue 47)', async () => {
			await runSequence('outside rename during an own rename', [
				{ op: 'realRenames' },
				{ op: 'move', name: 'Standup', date: '2026-11-11', start: 600, end: 660 },
				{ op: 'settle' },
				{ op: 'holdScan' },
				{ op: 'edit', name: 'Standup', title: 'Daily sync' },
				{ op: 'flush', n: 40 },
				// The consumer has seen the own rename; its tree rescan is held.
				{ op: 'outsideRename', name: 'Retro', to: 'Planning' },
				{ op: 'flush', n: 40 },
				{ op: 'release' },
				{ op: 'settle' },
				{ op: 'check' },
				{ op: 'refresh' },
				{ op: 'refresh' },
				// Each undo and redo of the edit renames through the owner.
				{ op: 'undo' },
				{ op: 'settle' },
				{ op: 'check' },
				{ op: 'refresh' },
				{ op: 'refresh' },
				{ op: 'redo' },
				{ op: 'settle' },
				{ op: 'check' },
			]);
			// Taken as an outside rename, the undo's rename back would turn the
			// redo's title into the old filename, and the redo would rename nothing.
			expect(project(vault.diskEntries()).map(eventState)).toEqual([
				expect.objectContaining({ title: 'Daily sync', date: '2026-11-11', start: 600, end: 660 }),
				expect.objectContaining({ title: 'Planning', date: '2026-11-11', start: 660, end: 720 }),
			]);
		});

		it('an undo issued while a drag\'s write is in flight (Issue 48)', async () => {
			await runSequence('undo during an in-flight drag', [
				{ op: 'move', name: 'Standup', date: '2026-11-11', start: 600, end: 660 },
				{ op: 'settle' },
				{ op: 'hold' },
				{ op: 'move', name: 'Standup', date: '2026-11-12', start: 720, end: 780 },
				{ op: 'flush', n: 40 },
				// The second drag's write is held: its op is not recorded yet.
				{ op: 'undo' },
				{ op: 'flush', n: 40 },
				{ op: 'release' },
				{ op: 'settle' },
				{ op: 'check' },
			]);
			// The undo reverted the drag in flight; the move before it is still undoable.
			expect(project(vault.diskEntries()).map(eventState)).toEqual([
				expect.objectContaining({ title: 'Retro' }),
				expect.objectContaining({ title: 'Standup', date: '2026-11-11', start: 600, end: 660 }),
			]);
			expect(eventCalendarStore.history.undo.map((op) => op.label)).toEqual(['Move event']);
			expect(eventCalendarStore.history.redo.map((op) => op.label)).toEqual(['Move event']);
			expect(await undoEventChange()).toEqual({ status: 'done', label: 'Move event' });
			expect(project(vault.diskEntries()).map(eventState)).toEqual([
				expect.objectContaining({ title: 'Retro' }),
				expect.objectContaining({ title: 'Standup', date: '2026-11-10', start: 570, end: 600 }),
			]);
		});

		it('a failed drag after a settled move on the same note (Issue 56)', async () => {
			await runSequence('failed drag after a settled move', [
				{ op: 'move', name: 'Standup', date: '2026-11-11', start: 600, end: 660 },
				{ op: 'settle' },
				{ op: 'failWrite' },
				{ op: 'move', name: 'Standup', date: '2026-11-12', start: 720, end: 780 },
				{ op: 'settle' },
				// The index has not bumped: the earlier move's overlay still shows the disk.
				{ op: 'check' },
				{ op: 'undo' },
				{ op: 'settle' },
				{ op: 'check' },
			]);
			expect(project(vault.diskEntries()).map(eventState)).toEqual([
				expect.objectContaining({ title: 'Retro' }),
				expect.objectContaining({ title: 'Standup', date: '2026-11-10', start: 570, end: 600 }),
			]);
			expect(eventCalendarStore.history.undo).toEqual([]);
			expect(eventCalendarStore.history.redo.map((op) => op.label)).toEqual(['Move event']);
		});

		it('outside renames onto and off a path while the calendar delete of it is in its tail (Issue 46)', async () => {
			await runSequence('outside renames during the delete tail', [
				{ op: 'move', name: 'Retro', date: '2026-11-12', start: 600, end: 660 },
				{ op: 'settle' },
				{ op: 'holdScan' },
				{ op: 'delete', name: 'Standup' },
				{ op: 'flush', n: 40 },
				// Standup is in the Trash; the delete has not returned.
				{ op: 'outsideRename', name: 'Retro', to: 'Standup' },
				{ op: 'flush', n: 40 },
				{ op: 'outsideRename', name: 'Standup', to: 'Planning' },
				{ op: 'flush', n: 40 },
				{ op: 'release' },
				{ op: 'settle' },
				// Restores Standup, then undoes the move of the note now at Planning.
				{ op: 'undo' },
				{ op: 'settle' },
				{ op: 'undo' },
			]);
		});

		it('an outside rename onto a path while the calendar delete of it is in its tail (Issue 58)', async () => {
			await runSequence('outside rename onto the path during the delete tail', [
				{ op: 'holdScan' },
				{ op: 'delete', name: 'Standup' },
				{ op: 'flush', n: 40 },
				// Standup is in the Trash; the delete has not returned.
				{ op: 'outsideRename', name: 'Retro', to: 'Standup' },
				{ op: 'flush', n: 40 },
				{ op: 'release' },
				{ op: 'settle' },
				// One bump: the store shows the renamed-in note at Standup.
				{ op: 'refresh' },
				{ op: 'check' },
			]);
		});

		it('an outside create on the path a calendar rename left (Issue 60)', async () => {
			await runSequence('outside create on a rename tombstone', [
				{ op: 'edit', name: 'Standup', title: 'Planning' },
				{ op: 'settle' },
				// Standup holds the rename's settled `delete` tombstone.
				{ op: 'outsideCreate', name: 'Standup', start: '14:00' },
				// One bump: the store shows the new note at Standup.
				{ op: 'refresh' },
				{ op: 'check' },
			]);
		});

		it('an outside rename of a duplicate whose written title equals its filename base (Issue 61)', async () => {
			await runSequence('outside rename of a titled duplicate', [
				// Retro is taken, so Standup becomes "Retro 1" with `event_title: Retro`.
				{ op: 'edit', name: 'Standup', title: 'Retro' },
				{ op: 'settle' },
				{ op: 'refresh' },
				// The copy is "Retro (copy).md" with `event_title: Retro (copy)`.
				{ op: 'duplicate', name: 'Retro 1' },
				{ op: 'settle' },
				{ op: 'outsideRename', name: 'Retro (copy)', to: 'Planning' },
				{ op: 'settle' },
				// One bump: the store shows the copy at Planning with its written title.
				{ op: 'refresh' },
				{ op: 'check' },
			]);
		});

		it('an outside rename of a note whose calendar rename removed its written title (Issue 61)', async () => {
			await runSequence('outside rename after a title edit drops event_title', [
				// Retro is taken, so Standup becomes "Retro 1" with `event_title: Retro`.
				{ op: 'edit', name: 'Standup', title: 'Retro' },
				{ op: 'settle' },
				{ op: 'refresh' },
				// "Planning" is free: the note becomes Planning.md with no `event_title`.
				{ op: 'edit', name: 'Retro 1', title: 'Planning' },
				{ op: 'settle' },
				{ op: 'outsideRename', name: 'Planning', to: 'Foo' },
				{ op: 'settle' },
				// One bump: the store shows the note at Foo with its new filename as its title.
				{ op: 'refresh' },
				{ op: 'check' },
			]);
		});

		it('an outside delete of the path while a calendar restore of it is in flight (Issue 49)', async () => {
			await runSequence('outside delete during a restore', [
				{ op: 'delete', name: 'Standup' },
				{ op: 'settle' },
				{ op: 'refresh' },
				{ op: 'holdRename' },
				{ op: 'restore', name: 'Standup' },
				{ op: 'flush', n: 40 },
				// The restore's move out of the Trash is held; the outside delete
				// lands once it is back, before `restoreItem` returns.
				{ op: 'outsideDelete', name: 'Standup' },
				{ op: 'release' },
				{ op: 'settle' },
				// One bump: the store shows the vault, without the note.
				{ op: 'refresh' },
				{ op: 'check' },
			]);
			expect(eventCalendarStore.pendingPaths.size).toBe(0);
		});

		it('an outside delete of another note at the path, recorded while a calendar restore of it is in flight (Issue 49)', async () => {
			await runSequence('outside delete of another note during a restore', [
				{ op: 'delete', name: 'Standup' },
				{ op: 'settle' },
				{ op: 'refresh' },
				{ op: 'outsideCreate', name: 'Standup', start: '14:00' },
				{ op: 'refresh' },
				// The outside delete moves the new note to the Trash, then its
				// manifest write is held, so its consumer call lands only later.
				{ op: 'hold' },
				{ op: 'outsideDelete', name: 'Standup' },
				{ op: 'flush', n: 60 },
				// The restore finds the path free and moves the note back to it.
				{ op: 'holdRename' },
				{ op: 'restore', name: 'Standup' },
				{ op: 'flush', n: 60 },
				{ op: 'release' },
				{ op: 'flush', n: 60 },
				{ op: 'release' },
				{ op: 'settle' },
				// One bump: the restored note is on disk, and the store shows it.
				{ op: 'refresh' },
				{ op: 'check' },
			]);
		});

		it('a field write that lands after an outside delete of its note (Issue 59)', async () => {
			await runSequence('field write after an outside delete', [
				{ op: 'hold' },
				{ op: 'move', name: 'Standup', date: '2026-11-11', start: 600, end: 660 },
				{ op: 'flush', n: 40 },
				// The write passed its `exists` check and is held; the note goes to the Trash.
				{ op: 'outsideDelete', name: 'Standup' },
				{ op: 'flush', n: 40 },
				{ op: 'release' },
				{ op: 'settle' },
				// The write was refused: the store still hides the note.
				{ op: 'check' },
				// One bump: the store shows the vault, without the note.
				{ op: 'refresh' },
				{ op: 'check' },
			]);
			expect(vault.disk.has(P('Standup'))).toBe(false);
			expect(eventCalendarStore.history.undo).toEqual([]);
		});

		it('a write enqueued during a vault-switch drain (d57c0ff9)', async () => {
			await runSequence('write during a vault-switch drain', [
				{ op: 'hold' },
				{ op: 'hold' },
				{ op: 'move', name: 'Standup', date: '2026-11-11', start: 600, end: 660 },
				{ op: 'flush', n: 20 },
				{ op: 'switchVault' },
				{ op: 'flush', n: 20 },
				{ op: 'move', name: 'Retro', date: '2026-11-12', start: 600, end: 660 },
				{ op: 'flush', n: 20 },
				{ op: 'release' },
				{ op: 'flush', n: 20 },
				{ op: 'release' },
				{ op: 'settle' },
				{ op: 'reopen' },
			]);
		});

		it('a lookup in a stale store while the index bumps mid-read (b9c9eb90)', async () => {
			await runSequence('lookup during a bump', [
				// The index has not dropped the note the calendar deletes.
				{ op: 'freeze' },
				{ op: 'delete', name: 'Standup' },
				{ op: 'settle' },
				{ op: 'staleBump' },
				{ op: 'lookup', name: 'Standup', bumpDuringRead: true },
				{ op: 'settle' },
				{ op: 'thaw' },
			]);
		});
	});

	// Seed 40 hits this case only under the current `randomStep`; the named
	// sequence "an outside rename onto a path while the calendar delete of it
	// is in its tail" is the guard that lasts a generator change.
	it('seed 40, an outside rename onto a path in the calendar delete tail, with one end bump (Issue 58)', async () => {
		const rnd = prng(40);
		let steps = 0;
		await runModel('seed 40', (run) => (steps++ < STEPS ? randomStep(rnd, run) : null), 1);
	});

	// Which case a seed hits depends on `randomStep`; the named sequence "an
	// outside create on the path a calendar rename left" is the lasting guard.
	it('seed 252, an outside create on a calendar rename tombstone, with one end bump (Issue 60)', async () => {
		const rnd = prng(252);
		let steps = 0;
		await runModel('seed 252', (run) => (steps++ < STEPS ? randomStep(rnd, run) : null), 1);
	});

	// Which case a seed hits depends on `randomStep`; the named sequence "an
	// outside rename of a duplicate whose written title equals its filename
	// base" is the lasting guard.
	it('seed 166, an outside rename of a titled duplicate, with one end bump (Issue 61)', async () => {
		const rnd = prng(166);
		let steps = 0;
		await runModel('seed 166', (run) => (steps++ < STEPS ? randomStep(rnd, run) : null), 1);
	});

	// Which case a seed hits depends on `randomStep`; the named sequence "a
	// field write that lands after an outside delete of its note" is the
	// lasting guard.
	it('seed 127, a field write landing after an outside delete, with one end bump (Issue 59)', async () => {
		const rnd = prng(127);
		let steps = 0;
		await runModel('seed 127', (run) => (steps++ < STEPS ? randomStep(rnd, run) : null), 1);
	});

	it.each(seedChunks.map((chunk) => ({ first: chunk[0], last: chunk[chunk.length - 1], chunk })))('random interleavings keep the store equal to the vault (seeds $first-$last)', async ({ chunk }) => {
		for (const seed of chunk) {
			const rnd = prng(seed);
			let steps = 0;
			await runModel(`seed ${seed}`, (run) => (steps++ < STEPS ? randomStep(rnd, run) : null));
			await tearDown();
			await setUp();
		}
	});
});
