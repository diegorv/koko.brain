import { describe, it, expect, beforeEach, vi } from 'vitest';

import { MAX_RUN_LOG_LINES, modsRunsStore } from '#lib/plugins/mods/mods-runs.store.svelte.js';

const KEY = 'mod:hello:main';

/** Starts a run of the hello mod's button and returns its id */
function startRun(buttonKey = KEY, stop = vi.fn()): number {
	return modsRunsStore.start({ modId: 'hello', buttonKey, title: 'Slow job', stop });
}

describe('modsRunsStore', () => {
	beforeEach(() => {
		modsRunsStore.reset();
	});

	it('starts with no runs, nothing busy and no reload pending', () => {
		expect(modsRunsStore.runs).toEqual([]);
		expect(modsRunsStore.runFor(KEY)).toBeNull();
		expect(modsRunsStore.isBusy(KEY)).toBe(false);
		expect(modsRunsStore.isReloadPending('hello')).toBe(false);
	});

	it('start adds a running run with an empty log and no progress', () => {
		const id = startRun();

		expect(modsRunsStore.runFor(KEY)).toMatchObject({
			id,
			modId: 'hello',
			buttonKey: KEY,
			title: 'Slow job',
			status: 'running',
			lines: [],
			progress: null,
			error: null,
		});
		expect(modsRunsStore.isBusy(KEY)).toBe(true);
		expect(modsRunsStore.runs.map((r) => r.id)).toEqual([id]);
	});

	it('runFor and isBusy only see the button asked for', () => {
		startRun();

		expect(modsRunsStore.runFor('mod:hello:other')).toBeNull();
		expect(modsRunsStore.isBusy('mod:hello:other')).toBe(false);
	});

	it('a new run of a button replaces its ended run and keeps other buttons', () => {
		const first = startRun();
		modsRunsStore.finish(first);
		const other = startRun('mod:hello:other');

		const second = startRun();

		expect(modsRunsStore.runs.map((r) => r.id)).toEqual([other, second]);
		expect(modsRunsStore.runFor(KEY)?.id).toBe(second);
	});

	it('log appends lines in order', () => {
		const id = startRun();

		modsRunsStore.log(id, 'one');
		modsRunsStore.log(id, 'two');

		expect(modsRunsStore.runFor(KEY)?.lines).toEqual(['one', 'two']);
	});

	it(`log keeps only the last ${MAX_RUN_LOG_LINES} lines`, () => {
		const id = startRun();

		for (let i = 1; i <= MAX_RUN_LOG_LINES + 2; i++) modsRunsStore.log(id, `line ${i}`);

		const lines = modsRunsStore.runFor(KEY)!.lines;
		expect(lines).toHaveLength(MAX_RUN_LOG_LINES);
		expect(lines[0]).toBe('line 3');
		expect(lines.at(-1)).toBe(`line ${MAX_RUN_LOG_LINES + 2}`);
	});

	it('progress sets done, total and label, and a later call replaces it', () => {
		const id = startRun();

		modsRunsStore.progress(id, { done: 1, total: 4, label: 'Reading notes' });
		expect(modsRunsStore.runFor(KEY)?.progress).toEqual({ done: 1, total: 4, label: 'Reading notes' });

		modsRunsStore.progress(id, { done: 2, total: 4 });
		expect(modsRunsStore.runFor(KEY)?.progress).toEqual({ done: 2, total: 4 });
	});

	it('finish ends the run done and frees the button, keeping the log', () => {
		const id = startRun();
		modsRunsStore.log(id, 'step');

		modsRunsStore.finish(id);

		expect(modsRunsStore.runFor(KEY)).toMatchObject({ status: 'done', lines: ['step'] });
		expect(modsRunsStore.isBusy(KEY)).toBe(false);
	});

	it('fail ends the run failed with the message and stack', () => {
		const id = startRun();

		modsRunsStore.fail(id, { message: 'kaboom', stack: 'Error: kaboom\n    at main.js:3' });

		expect(modsRunsStore.runFor(KEY)).toMatchObject({
			status: 'failed',
			error: { message: 'kaboom', stack: 'Error: kaboom\n    at main.js:3' },
		});
		expect(modsRunsStore.isBusy(KEY)).toBe(false);
	});

	it('cancel ends the run cancelled', () => {
		const id = startRun();

		modsRunsStore.cancel(id);

		expect(modsRunsStore.runFor(KEY)?.status).toBe('cancelled');
		expect(modsRunsStore.isBusy(KEY)).toBe(false);
	});

	it('an ended run ignores later log, progress and end calls', () => {
		const id = startRun();
		modsRunsStore.cancel(id);

		modsRunsStore.log(id, 'late');
		modsRunsStore.progress(id, { done: 1, total: 1 });
		modsRunsStore.finish(id);
		modsRunsStore.fail(id, { message: 'late' });

		expect(modsRunsStore.runFor(KEY)).toMatchObject({ status: 'cancelled', lines: [], progress: null, error: null });
	});

	it('calls on an unknown run id change nothing', () => {
		startRun();
		const before = modsRunsStore.runs;

		modsRunsStore.log(999, 'x');
		modsRunsStore.finish(999);

		expect(modsRunsStore.runs).toBe(before);
	});

	it('setReloadPending marks and clears a mod', () => {
		modsRunsStore.setReloadPending('hello', true);
		expect(modsRunsStore.isReloadPending('hello')).toBe(true);
		expect(modsRunsStore.isReloadPending('other')).toBe(false);

		modsRunsStore.setReloadPending('hello', true);
		modsRunsStore.setReloadPending('hello', false);
		expect(modsRunsStore.isReloadPending('hello')).toBe(false);
	});

	it('reset stops every live run, not an ended one, and empties the store', () => {
		const liveStop = vi.fn();
		const endedStop = vi.fn();
		startRun(KEY, liveStop);
		const ended = startRun('mod:hello:other', endedStop);
		modsRunsStore.finish(ended);
		modsRunsStore.setReloadPending('hello', true);

		modsRunsStore.reset();

		expect(liveStop).toHaveBeenCalledOnce();
		expect(endedStop).not.toHaveBeenCalled();
		expect(modsRunsStore.runs).toEqual([]);
		expect(modsRunsStore.isReloadPending('hello')).toBe(false);
	});

	it('reset with no runs changes nothing', () => {
		expect(() => modsRunsStore.reset()).not.toThrow();
		expect(modsRunsStore.runs).toEqual([]);
	});
});
