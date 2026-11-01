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
 * The calendar's own renames use the fixture's `renameItem` (a move on the
 * disk that returns at once); outside renames and every delete and restore
 * run the real path-change owner. The random runs start one path change (a
 * rename, create, delete, restore, or an undo / redo that may run one) only
 * once the previous one has settled, and while one runs a field write targets
 * only a note the store showed before it began; an outside rename or delete
 * targets only a note with no calendar field write in flight (the limitation
 * `followPathChange` documents). Without these limits the runs reach races
 * this test does not pin, each filed as an Issue under
 * `.scratch/architecture-stability/issues/`: a write or bump during the
 * calendar's own rename tail (45), an outside rename onto a path the
 * calendar's own delete is still in the tail of (46), a write on a created
 * note before `createEvent` shows it (47), an undo while a drag's write is in
 * flight (48), and an outside delete racing a calendar restore (49). Lift the
 * matching limit when one is fixed.
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
	return { ...actual, renameItem: vi.fn() };
});

import { invoke } from '@tauri-apps/api/core';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { getFileName } from '#lib/core/filesystem/fs.logic.js';
import { deleteItem } from '#lib/core/filesystem/fs.service.js';
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
	/** Notes the store showed when the path changes in flight began. */
	shownBefore: Set<string>;
	/** Field writes fired and not settled yet, per note name. */
	writing: Map<string, number>;
	/**
	 * Undo and redo outcomes, with the index of their op in `log` and whether
	 * every op fired before them had settled when they were issued.
	 */
	changes: { at: number; result: EventChangeResult; idle: boolean }[];
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
 * Keeps `promise`, the outcome of the latest op in `run.log`, in the run; a
 * rejection is an outcome, not a failure. `changesNotes` counts it toward
 * `run.changing` (and toward `run.movingPaths` per `movesPaths`) until it settles.
 */
function fire(run: Run, promise: Promise<unknown>, changesNotes = true): void {
	const op = run.log[run.log.length - 1];
	const moving = changesNotes && movesPaths(op);
	const written = changesNotes && !moving && 'name' in op ? op.name : null;
	if (moving && run.movingPaths === 0) run.shownBefore = new Set(eventCalendarStore.events.map((event) => baseOf(event.path)));
	if (changesNotes) run.changing += 1;
	if (moving) run.movingPaths += 1;
	if (written !== null) run.writing.set(written, (run.writing.get(written) ?? 0) + 1);
	const settle = () => {
		if (changesNotes) run.changing -= 1;
		if (moving) run.movingPaths -= 1;
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
			return fire(run, restoreDeletedEvent(P(op.name)));
		case 'undo':
		case 'redo': {
			const idle = run.changing === 0;
			return fire(
				run,
				(op.op === 'undo' ? undoEventChange() : redoEventChange()).then((result) => {
					run.changes.push({ at, result, idle });
				}),
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
		case 'check': {
			// Mid-run the overlay stands in for the index, so only the event states count (an overlay has no snippet).
			const states = (events: EventNote[]) => events.map((event) => ({ path: event.path, ...eventState(event) }));
			expect(states(shownEvents()), `the store shows the vault after op #${at}`).toEqual(states(project(vault.diskEntries())));
			return;
		}
	}
}

/** Settles the run, drains, bumps the index and checks every invariant. */
async function finish(run: Run): Promise<void> {
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
	// bump, then; only an outside change racing a calendar write can
	// legitimately leave a clocked overlay that long (Issue 49).
	const bumps = run.log.some((op) => op.op.startsWith('outside')) ? 2 : 1;
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
	// The model has no outside field edit, so an undo or redo issued once every
	// earlier op settled finds the state it expects, whatever is fired after it:
	// none is refused for a changed note (f98118d3). A `not-in-trash` refusal is
	// legitimate: a restore took the Trash entry.
	const refused = run.changes.filter(({ result, idle }) => idle && result.status === 'refused' && result.reason === undefined);
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

/** Runs `step` until it returns null, then finishes; a failure carries `label` and the op list. */
async function runModel(label: string, step: (run: Run) => Op[] | null): Promise<void> {
	const run: Run = { log: [], inFlight: [], gates: [], changing: 0, movingPaths: 0, shownBefore: new Set(), writing: new Map(), changes: [], violations: [] };
	try {
		for (let ops = step(run); ops !== null; ops = step(run)) {
			for (const op of ops) await runOp(run, op);
		}
		await finish(run);
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
	// Path changes run one at a time, a field write during one targets a note
	// shown before it began, and an outside change targets a note with no field
	// write in flight (see the file header). Field writes, bumps, drains and
	// held writes interleave with everything else.
	const one = run.movingPaths === 0;
	const writable = one ? shown : shown.filter((name) => run.shownBefore.has(name));
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
		[3, () => (one && idleNotes.length && free.length ? { op: 'outsideRename', name: pick(idleNotes), to: pick(free) } : null)],
		[2, () => (one && idleNotes.length ? { op: 'outsideDelete', name: pick(idleNotes) } : null)],
		[2, () => (one && free.length ? { op: 'outsideCreate', name: pick(free), start: '14:00' } : null)],
		[8, () => ({ op: 'bump' })],
		[2, () => ({ op: 'drain' })],
		[4, () => (run.gates.length < 3 ? { op: 'hold' } : null)],
		[1, () => (run.gates.length < 3 ? { op: 'holdRename' } : null)],
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
		import('#lib/core/trash/trash.service.js'),
		import('#lib/features/backlinks/backlinks.logic.js'),
		import('#lib/features/quick-switcher/quick-switcher.logic.js'),
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
