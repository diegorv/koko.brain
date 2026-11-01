import { describe, it, expect } from 'vitest';
import {
	INITIAL_VIEW_SEED,
	stepViewSeed,
	type ViewSeedEvent,
	type ViewSeedState,
} from '#lib/features/rail-shell/view-lens-seed.logic.js';

const A = '/vault/A.view';
const B = '/vault/B.view';

const seeded = (path: string, hash: string | undefined, selfUpdatePath: string | null = null): ViewSeedState => ({
	seededPath: path,
	seededHash: hash,
	selfUpdatePath,
});

/** Feeds the events in order and returns the final state plus the reseed flag of each step */
function run(events: ViewSeedEvent[], start: ViewSeedState = INITIAL_VIEW_SEED) {
	let state = start;
	const reseeds: boolean[] = [];
	for (const event of events) {
		const step = stepViewSeed(state, event);
		state = step.next;
		reseeds.push(step.reseed);
	}
	return { state, reseeds };
}

describe('stepViewSeed', () => {
	it.each<[string, ViewSeedState, ViewSeedEvent, ViewSeedState, boolean]>([
		['first load seeds', INITIAL_VIEW_SEED, { kind: 'loaded', path: A, hash: 'h1' }, seeded(A, 'h1'), true],
		['same path and hash does not re-seed', seeded(A, 'h1'), { kind: 'loaded', path: A, hash: 'h1' }, seeded(A, 'h1'), false],
		['a content-hash change re-seeds', seeded(A, 'h1'), { kind: 'loaded', path: A, hash: 'h2' }, seeded(A, 'h2'), true],
		['another view re-seeds', seeded(A, 'h1'), { kind: 'loaded', path: B, hash: 'h1' }, seeded(B, 'h1'), true],
		['own latch adopts the new hash without re-seeding', seeded(A, 'h1', A), { kind: 'loaded', path: A, hash: 'h2' }, seeded(A, 'h2'), false],
		['a foreign latch is cleared by the re-seed', seeded(A, 'h1', A), { kind: 'loaded', path: B, hash: 'hb' }, seeded(B, 'hb'), true],
		['a parse failure or rejected read clears the seed', seeded(A, 'h1'), { kind: 'load-failed' }, { seededPath: null, seededHash: undefined, selfUpdatePath: null }, false],
		['a load failure keeps the latch', seeded(A, 'h1', A), { kind: 'load-failed' }, { seededPath: null, seededHash: undefined, selfUpdatePath: A }, false],
		['leaving the view lens clears the seed', seeded(A, 'h1', A), { kind: 'no-view' }, { seededPath: null, seededHash: undefined, selfUpdatePath: A }, false],
		['a save sets the latch to its view', seeded(A, 'h1'), { kind: 'save-started', path: A }, seeded(A, 'h1', A), false],
		['a failed save clears the latch and the hash', seeded(A, 'h1', A), { kind: 'save-failed' }, seeded(A, undefined), false],
	])('%s', (_name, prev, event, next, reseed) => {
		expect(stepViewSeed(prev, event)).toEqual({ next, reseed });
	});

	it("a view switch during the previous view's save does not consume its latch (b48787e4)", () => {
		const { state, reseeds } = run([
			{ kind: 'loaded', path: A, hash: 'ha' },
			{ kind: 'save-started', path: A },
			// The lens moves to B while A's write is in flight: B seeds from its own file.
			{ kind: 'loaded', path: B, hash: 'hb' },
			// A's write lands; the lens is back on A with A's new hash: A seeds from its file.
			{ kind: 'loaded', path: A, hash: 'ha2' },
		]);
		expect(reseeds).toEqual([true, false, true, true]);
		expect(state).toEqual(seeded(A, 'ha2'));
	});

	it('a re-seed after a parse failure re-seeds even with the old hash', () => {
		const { reseeds } = run([
			{ kind: 'loaded', path: A, hash: 'h1' },
			{ kind: 'load-failed' },
			{ kind: 'loaded', path: A, hash: 'h1' },
		]);
		expect(reseeds).toEqual([true, false, true]);
	});

	it('a failed save re-seeds on the next load of the same content', () => {
		const { reseeds } = run([
			{ kind: 'loaded', path: A, hash: 'h1' },
			{ kind: 'save-started', path: A },
			{ kind: 'save-failed' },
			{ kind: 'loaded', path: A, hash: 'h1' },
		]);
		expect(reseeds).toEqual([true, false, false, true]);
	});
});
