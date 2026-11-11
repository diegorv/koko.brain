import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
	ADR,
	FEATURE_BASELINE,
	checkFeatureCycles,
	featurePairs,
	scanLib,
	stronglyConnected,
} from '../../../../scripts/import-graph.mjs';

/**
 * Ratchet for feature -> feature cycles (ADR-0003: feature imports are allowed
 * while acyclic). `featureCycleEdges` lists the pairs inside today's cycle and
 * only shrinks. `featurePairs` records every directed feature pair: this test
 * rewrites it when the graph changes and does not fail, so a new acyclic pair
 * shows up in the diff for review.
 */

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, FEATURE_BASELINE);

interface FeatureBaseline {
	/** Pairs inside a feature cycle; shrink-only, never written by this test. */
	featureCycleEdges: string[];
	/** Every directed feature pair, kept in sync by this test. */
	featurePairs: string[];
}

/**
 * Exact size of `featureCycleEdges`. Lower it in the same change that deletes
 * stale lines, so a later change cannot swap deleted pairs for new ones.
 */
const FEATURE_CYCLE_EDGES_SIZE = 0;

const pairs: string[] = featurePairs(scanLib(ROOT).edges);
const baseline: FeatureBaseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));

if (JSON.stringify(baseline.featurePairs) !== JSON.stringify(pairs)) {
	baseline.featurePairs = pairs;
	writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, '\t')}\n`);
}

/** The feature names a pair list touches, sorted. */
function members(list: string[]) {
	return [...new Set(list.flatMap((p) => p.split(' -> ')))].sort();
}

/**
 * The features inside any cycle, sorted. Compared as a flat set so the
 * check still holds once the cycle splits in two or is fully broken.
 */
function cycleMembers(list: string[]) {
	return stronglyConnected(list).flat().sort();
}

describe('feature cycle ratchet', () => {
	const { unlisted, stale } = checkFeatureCycles(pairs, baseline.featureCycleEdges);

	it('note-row menu contracts do not depend on their rail-shell consumer', () => {
		expect(pairs).toContain('rail-shell -> note-list');
		expect(pairs).not.toContain('note-list -> rail-shell');
	});

	it('every pair inside a feature cycle is in featureCycleEdges', () => {
		expect(unlisted, unlisted.join('\n\n')).toEqual([]);
	});

	it('every featureCycleEdges entry is still inside a feature cycle', () => {
		expect(stale, stale.join('\n\n')).toEqual([]);
	});

	it('the features inside a cycle are exactly the ones featureCycleEdges names', () => {
		expect(cycleMembers(pairs)).toEqual(members(baseline.featureCycleEdges));
	});

	it('featureCycleEdges is sorted, unique and never grows', () => {
		const cycle = baseline.featureCycleEdges;
		expect(cycle).toEqual([...new Set(cycle)].sort());
		expect(
			cycle.length,
			'featureCycleEdges only shrinks: lower FEATURE_CYCLE_EDGES_SIZE to match after deleting lines, never raise it',
		).toBe(FEATURE_CYCLE_EDGES_SIZE);
	});

	// Not a drift check: the module-level sync above already rewrote the file.
	// featurePairs drift never fails (a new acyclic pair is reviewed in the diff).
	it('the featurePairs sync round-trips and leaves featureCycleEdges untouched', () => {
		const onDisk: FeatureBaseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
		expect(onDisk.featurePairs).toEqual(pairs);
		expect(onDisk.featureCycleEdges).toEqual(baseline.featureCycleEdges);
	});
});

describe('feature cycle failures (synthetic pairs)', () => {
	const cycle = baseline.featureCycleEdges;

	it('a feature joining the cycle fails with the cycle path and both fixes', () => {
		expect(pairs).toContain('deep-link -> search');
		const { unlisted } = checkFeatureCycles([...pairs, 'search -> deep-link'], cycle);
		const message = unlisted.find((m: string) => m.startsWith('features/search -> features/deep-link'));
		expect(message).toContain('search -> deep-link -> search');
		expect(message).toContain(ADR);
		expect(message).toContain('1. Invert the dependency with a registration API');
		expect(message).toContain('2. Move the shared piece down into core/ or utils/');
		expect(unlisted.some((m: string) => m.startsWith('features/deep-link -> features/search'))).toBe(true);
	});

	// Synthetic cycle, so the check keeps its subject once the real one is gone.
	it('a new pair inside the cycle that is not baselined fails', () => {
		const ring = ['a -> b', 'b -> c', 'c -> a'];
		const { unlisted, stale } = checkFeatureCycles([...ring, 'a -> c'].sort(), ring);
		expect(stale).toEqual([]);
		expect(unlisted).toHaveLength(1);
		expect(unlisted[0]).toMatch(/^features\/a -> features\/c is inside a feature cycle: a -> c -> a /);
	});

	it('a new cycle outside the existing one fails', () => {
		const { unlisted } = checkFeatureCycles([...pairs, 'auto-organize -> dock-badge', 'dock-badge -> auto-organize'], cycle);
		expect(unlisted.map((m: string) => m.split(' is inside')[0])).toEqual([
			'features/auto-organize -> features/dock-badge',
			'features/dock-badge -> features/auto-organize',
		]);
	});

	it('a new acyclic pair does not fail', () => {
		expect(checkFeatureCycles([...pairs, 'dock-badge -> tasks'].sort(), cycle)).toEqual({ unlisted: [], stale: [] });
	});

	it('a removed baselined pair fails with the delete instruction', () => {
		// Every pair both ways: dropping one leaves the rest inside the cycle.
		const ring = ['a -> b', 'a -> c', 'b -> a', 'b -> c', 'c -> a', 'c -> b'];
		const removed = 'b -> a';
		const { stale } = checkFeatureCycles(
			ring.filter((p) => p !== removed),
			ring,
		);
		expect(stale).toHaveLength(1);
		expect(stale[0]).toContain(`Delete the line containing this entry from featureCycleEdges in ${FEATURE_BASELINE}`);
		expect(stale[0]).toContain('lower FEATURE_CYCLE_EDGES_SIZE');
		expect(stale[0]).toContain(`\t"${removed}"`);
	});

	it('a fully broken cycle with an emptied baseline passes', () => {
		const acyclic = ['a -> b', 'b -> c'];
		expect(checkFeatureCycles(acyclic, [])).toEqual({ unlisted: [], stale: [] });
		expect(cycleMembers(acyclic)).toEqual(members([]));
	});

	it('a cycle split in two with every pair baselined passes', () => {
		const split = ['a -> b', 'b -> a', 'c -> d', 'd -> c'];
		expect(stronglyConnected(split)).toHaveLength(2);
		expect(checkFeatureCycles(split, split)).toEqual({ unlisted: [], stale: [] });
		expect(cycleMembers(split)).toEqual(members(split));
	});
});
