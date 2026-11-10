import { describe, it, expect } from 'vitest';
import type { TodoistSyncLogEntry } from '#lib/contracts/index.js';
import {
	cycleLogEntry,
	filterLogEntries,
	formatCycleSummary,
	logEntryText,
	newestCycle,
	parseCycle,
	type CycleCounts,
	type CycleRun,
} from '#lib/features/todoist-sync/cycle-log.logic.js';

const ZERO: CycleCounts = {
	mode: 'normal',
	notesCreated: 0,
	tasksInserted: 0,
	linksPaired: 0,
	linesUnmatched: 0,
	linesUpdated: 0,
	headingsWritten: 0,
	todoistUpdated: 0,
	todoistCreated: 0,
	projectsCreated: 0,
	sectionsCreated: 0,
	projectsRenamed: 0,
	detached: 0,
};

const NO_SKIPS = { pushes: 0, detaches: 0, fieldPushes: 0, creates: 0 };

function run(over: Partial<CycleRun> = {}): CycleRun {
	return {
		mode: 'auto',
		trigger: 'interval',
		startedAt: new Date(2026, 10, 10, 3, 0).getTime(),
		durationMs: 812,
		outcome: 'ok',
		counts: ZERO,
		skipped: NO_SKIPS,
		commands: {},
		tokenAdvanced: false,
		...over,
	};
}

/** A stored row as `todoist_read_log` returns it. */
function row(id: number, kind: string, message: string): TodoistSyncLogEntry {
	return { id, createdAt: 0, kind, anchor: null, message };
}

describe('cycleLogEntry', () => {
	it('stores the whole run as JSON in a cycle row, counted once', () => {
		const entry = cycleLogEntry(run({ commands: { item_close: 2 }, tokenAdvanced: true }), null);

		expect(entry).toEqual({ kind: 'cycle', anchor: null, message: expect.any(String) });
		expect(parseCycle(entry.message)).toEqual({ ...run({ commands: { item_close: 2 }, tokenAdvanced: true }), repeats: 1, firstStartedAt: run().startedAt });
	});

	it('replaces the newest row when both it and this run are quiet automatic cycles with the same outcome', () => {
		const first = cycleLogEntry(run(), null);
		const later = run({ startedAt: run().startedAt + 300_000, trigger: 'focus', tokenAdvanced: true });

		const entry = cycleLogEntry(later, row(7, 'cycle', first.message));

		expect(entry.replaceId).toBe(7);
		expect(parseCycle(entry.message)).toEqual({ ...later, repeats: 2, firstStartedAt: run().startedAt });
		const third = cycleLogEntry(run({ startedAt: later.startedAt + 300_000 }), row(7, 'cycle', entry.message));
		expect(parseCycle(third.message)).toMatchObject({ repeats: 3, firstStartedAt: run().startedAt });
	});

	it('collapses repeated quiet failures, which have no counts', () => {
		const failed = run({ outcome: 'unreachable', counts: null, skipped: null });

		const entry = cycleLogEntry(failed, row(3, 'cycle', cycleLogEntry(failed, null).message));

		expect(entry.replaceId).toBe(3);
		expect(parseCycle(entry.message)?.repeats).toBe(2);
	});

	it('appends a new row for a run that changed something, sent a command, was manual, or differs in outcome or skips', () => {
		const quiet = row(1, 'cycle', cycleLogEntry(run(), null).message);
		const appended = [
			run({ counts: { ...ZERO, linesUpdated: 1 } }),
			run({ commands: { item_update: 1 } }),
			run({ mode: 'manual', trigger: 'manual' }),
			run({ outcome: 'unreachable', counts: null, skipped: null }),
			run({ skipped: { ...NO_SKIPS, creates: 30 } }),
		];
		for (const r of appended) {
			const entry = cycleLogEntry(r, quiet);
			expect(entry.replaceId).toBeUndefined();
			expect(parseCycle(entry.message)?.repeats).toBe(1);
		}
	});

	it('appends after a busy cycle row, an event row, or a row that is not a cycle record', () => {
		const busy = cycleLogEntry(run({ counts: { ...ZERO, tasksInserted: 2 } }), null).message;
		for (const newest of [row(1, 'cycle', busy), row(1, 'detach', cycleLogEntry(run(), null).message), row(1, 'cycle', 'not json')]) {
			expect(cycleLogEntry(run(), newest).replaceId).toBeUndefined();
		}
	});
});

describe('parseCycle', () => {
	it('is null for text that is not a cycle record', () => {
		expect(parseCycle('')).toBeNull();
		expect(parseCycle('{"a":1}')).toBeNull();
		expect(parseCycle('null')).toBeNull();
		expect(parseCycle('Todoist/Work.md changed')).toBeNull();
	});
});

describe('formatCycleSummary', () => {
	it('names mode, trigger, outcome, duration, the counts that moved, the commands and the token', () => {
		const record = parseCycle(
			cycleLogEntry(
				run({
					mode: 'manual',
					trigger: 'manual',
					counts: { ...ZERO, tasksInserted: 3, linesUpdated: 1, todoistUpdated: 1, detached: 2 },
					commands: { item_close: 1, item_update: 2 },
					tokenAdvanced: true,
				}),
				null,
			).message,
		)!;

		expect(formatCycleSummary(record)).toBe(
			'Manual (manual) ok in 812 ms; 3 tasks inserted, 1 line updated, 1 Todoist update, 2 detached; sent item_close 1, item_update 2; sync_token advanced',
		);
	});

	it('says nothing changed, lists the cap skips, and counts repeats', () => {
		const first = cycleLogEntry(run({ skipped: { ...NO_SKIPS, creates: 30, detaches: 11 } }), null);
		const record = parseCycle(cycleLogEntry(run({ skipped: { ...NO_SKIPS, creates: 30, detaches: 11 } }), row(1, 'cycle', first.message)).message)!;

		expect(formatCycleSummary(record)).toBe(
			'Automatic (interval) ok in 812 ms; nothing changed; skipped over cap: 11 detaches, 30 creates; sync_token kept; 2 cycles since 2026-11-10 03:00',
		);
	});

	it('names a failure kind and a cancel, and leaves out counts a stopped cycle never reached', () => {
		expect(formatCycleSummary({ ...run({ outcome: 'unreachable', counts: null, skipped: null }), repeats: 1, firstStartedAt: 0 })).toBe(
			'Automatic (interval) failed (unreachable) in 812 ms; sync_token kept',
		);
		expect(formatCycleSummary({ ...run({ mode: 'manual', trigger: 'manual', outcome: 'cancelled', counts: null, skipped: null }), repeats: 1, firstStartedAt: 0 })).toBe(
			'Manual (manual) cancelled in 812 ms; sync_token kept',
		);
	});

	it('marks a rebuild', () => {
		expect(formatCycleSummary({ ...run({ counts: { ...ZERO, mode: 'rebuild', linksPaired: 4 } }), repeats: 1, firstStartedAt: 0 })).toBe(
			'Automatic (interval) ok in 812 ms; rebuild; 4 links paired; sync_token kept',
		);
	});
});

describe('logEntryText', () => {
	it("is a cycle row's summary, and any other row's message as stored", () => {
		expect(logEntryText(row(1, 'cycle', cycleLogEntry(run(), null).message))).toBe('Automatic (interval) ok in 812 ms; nothing changed; sync_token kept');
		expect(logEntryText(row(1, 'cycle', 'not json'))).toBe('not json');
		expect(logEntryText(row(1, 'stale', cycleLogEntry(run(), null).message))).toBe(cycleLogEntry(run(), null).message);
		expect(logEntryText(row(1, 'detach', ''))).toBe('');
	});
});

describe('filterLogEntries and newestCycle', () => {
	const entries = [row(4, 'detach', 'd'), row(3, 'cycle', 'c2'), row(2, 'stale', 's'), row(1, 'cycle', 'c1')];

	it('keeps every row, only the cycle rows, or only the event rows, in order', () => {
		expect(filterLogEntries(entries, 'all').map((e) => e.id)).toEqual([4, 3, 2, 1]);
		expect(filterLogEntries(entries, 'cycles').map((e) => e.id)).toEqual([3, 1]);
		expect(filterLogEntries(entries, 'events').map((e) => e.id)).toEqual([4, 2]);
		expect(filterLogEntries([], 'cycles')).toEqual([]);
	});

	it('finds the newest cycle row, or null', () => {
		expect(newestCycle(entries)?.id).toBe(3);
		expect(newestCycle([row(1, 'detach', 'd')])).toBeNull();
		expect(newestCycle([])).toBeNull();
	});
});
