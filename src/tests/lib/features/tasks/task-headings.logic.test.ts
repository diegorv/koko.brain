import { describe, it, expect } from 'vitest';
import { headingChains, matchesHeading } from '#lib/features/tasks/task-headings.logic.js';
import type { TaskHeadingV2 } from '#lib/types/vault-v2.types.js';
import parity from '../../../fixtures/task-headings-parity.fixture.json';

/** Headings from `[level, text]` pairs, with line numbers in order. */
function headings(...items: [number, string][]): TaskHeadingV2[] {
	return items.map(([level, text], i) => ({ level, text, line: i + 1 }));
}

const ONE_TAG = ['#to-list'];
const TWO_TAGS = ['#to-list', '#work'];

describe('headingChains', () => {
	it('nests a deeper heading under the nearest shallower one', () => {
		expect(headingChains(headings([2, 'A'], [3, 'B'], [3, 'C']))).toEqual([['A'], ['A', 'B'], ['A', 'C']]);
	});

	it('takes the nearest strictly lower level across a skipped level', () => {
		expect(headingChains(headings([1, 'A'], [3, 'B'], [2, 'C']))).toEqual([['A'], ['A', 'B'], ['A', 'C']]);
	});

	it('starts a new chain at a level-1 heading after them', () => {
		expect(headingChains(headings([1, 'A'], [2, 'B'], [1, 'D'], [2, 'E']))).toEqual([['A'], ['A', 'B'], ['D'], ['D', 'E']]);
	});

	it('gives [] for no headings, including an absent or null field', () => {
		expect(headingChains([])).toEqual([]);
		expect(headingChains(undefined)).toEqual([]);
		expect(headingChains(null)).toEqual([]);
	});

	it('leaves the input array unchanged', () => {
		const input = headings([2, 'A'], [3, 'B'], [2, 'C']);
		const copy = structuredClone(input);
		headingChains(input);
		expect(input).toEqual(copy);
	});

	it('returns a separate array per chain', () => {
		const chains = headingChains(headings([2, 'A'], [3, 'B']));
		chains[0].push('mutated');
		expect(chains[1]).toEqual(['A', 'B']);
	});
});

describe("matchesHeading in 'tag' mode", () => {
	describe.each([
		['one tag', ONE_TAG],
		['two tags', TWO_TAGS],
	])('with %s', (_label, tags) => {
		it.each(['Inbox #to-list', 'Inbox #To-List', 'Inbox #to-list.', 'Inbox #to-list/today'])('%s matches', (heading) => {
			expect(matchesHeading([heading], tags, 'tag')).toBe(true);
		});

		it.each(['Inbox #to-listing', 'Inbox (#to-list)', 'x#to-list'])('%s does not match', (heading) => {
			expect(matchesHeading([heading], tags, 'tag')).toBe(false);
		});

		it('never matches a task with no headings', () => {
			expect(matchesHeading([], tags, 'tag')).toBe(false);
		});

		it('matches when any heading of the chain carries the tag', () => {
			expect(matchesHeading(['Top', 'Inbox #to-list', 'Sub'], tags, 'tag')).toBe(true);
		});
	});

	it('matches a tag typed without # like one with it', () => {
		for (const heading of ['Inbox #to-list', 'Inbox #to-list/today', 'Inbox #to-listing', 'x#to-list']) {
			expect(matchesHeading([heading], ['to-list'], 'tag')).toBe(matchesHeading([heading], ['#to-list'], 'tag'));
		}
		expect(matchesHeading(['Inbox #to-list'], ['  to-list  '], 'tag')).toBe(true);
	});

	it.each([[[]], [['']], [['#']], [['  ', ' # ']]])('keeps every chain with no active tag: %j', (tags) => {
		expect(matchesHeading(['Inbox'], tags, 'tag')).toBe(true);
		expect(matchesHeading([], tags, 'tag')).toBe(true);
	});

	it('ignores an inactive tag next to an active one', () => {
		expect(matchesHeading(['Inbox'], ['', '#to-list'], 'tag')).toBe(false);
		expect(matchesHeading(['Inbox #to-list'], ['#', '#to-list'], 'tag')).toBe(true);
	});

	it('reads a tag typed with a trailing slash like one without it', () => {
		expect(matchesHeading(['Inbox #to-list'], ['#to-list/'], 'tag')).toBe(true);
		expect(matchesHeading(['Inbox #to-list/today'], ['#to-list/'], 'tag')).toBe(true);
		expect(matchesHeading(['Inbox #to-listing'], ['#to-list/'], 'tag')).toBe(false);
		expect(matchesHeading(['Inbox'], ['#/'], 'tag')).toBe(true);
	});

	it('with two tags, a chain holding only #work matches', () => {
		expect(matchesHeading(['Projects #work'], TWO_TAGS, 'tag')).toBe(true);
		expect(matchesHeading(['Projects #work'], ONE_TAG, 'tag')).toBe(false);
	});
});

describe('parity with the section scan, through headingChains', () => {
	/** The chain of the task sitting under heading `index`. */
	function chainOf(items: [number, string][], index: number): string[] {
		return headingChains(headings(...items))[index] ?? [];
	}

	it('keeps ### C under ## A #to-list after a tagged ### B sibling', () => {
		// Today's Rust scan drops C: it re-anchors the section at `### B` (level 3), so `### C` ends it.
		const items: [number, string][] = [
			[2, 'A #to-list'],
			[3, 'B #to-list'],
			[3, 'C'],
		];
		expect(matchesHeading(chainOf(items, 2), ONE_TAG, 'tag')).toBe(true);
	});

	it('keeps a deeper untagged sub-heading inside its tagged parent', () => {
		const items: [number, string][] = [
			[2, 'A #to-list'],
			[3, 'Sub'],
			[4, 'Deeper'],
		];
		expect(matchesHeading(chainOf(items, 1), ONE_TAG, 'tag')).toBe(true);
		expect(matchesHeading(chainOf(items, 2), ONE_TAG, 'tag')).toBe(true);
	});

	it('ends the section at a sibling heading', () => {
		const items: [number, string][] = [
			[2, 'A #to-list'],
			[2, 'Other'],
		];
		expect(matchesHeading(chainOf(items, 1), ONE_TAG, 'tag')).toBe(false);
	});

	it('ends the section at a higher heading', () => {
		const items: [number, string][] = [
			[2, 'A #to-list'],
			[1, 'Top'],
		];
		expect(matchesHeading(chainOf(items, 1), ONE_TAG, 'tag')).toBe(false);
	});
});

/** The fixture fields this test reads: the wire `taskHeadings` and each task's `heading`. */
interface ParityCase {
	name: string;
	expected: { taskHeadings?: TaskHeadingV2[]; tasks: { heading?: number }[] };
}

describe('cross-check with the Rust parity fixture', () => {
	const cases = parity.cases as ParityCase[];

	/** Each expected task's chain, looked up through its `heading` index. */
	function taskChains(name: string): string[][] {
		const fixtureCase = cases.find((c) => c.name === name);
		if (!fixtureCase) throw new Error(`fixture case not found: ${name}`);
		const chains = headingChains(fixtureCase.expected.taskHeadings);
		return fixtureCase.expected.tasks.map((t) => (t.heading === undefined ? [] : (chains[t.heading] ?? [])));
	}

	it('chains and matches the A, B and C tasks', () => {
		const chains = taskChains('frontmatter comment and fenced lines are not headings');
		expect(chains).toEqual([['A #to-list'], ['A #to-list', 'B'], ['C']]);
		expect(chains.map((chain) => matchesHeading(chain, ONE_TAG, 'tag'))).toEqual([true, true, false]);
	});

	it('gives a task before the first heading no chain', () => {
		expect(taskChains('a task before the first heading has no heading')).toEqual([[], ['Spaced title']]);
	});
});

describe("matchesHeading in 'substring' mode", () => {
	it('matches the tag anywhere in the heading, case-insensitive', () => {
		expect(matchesHeading(['Inbox #to-listing'], ONE_TAG, 'substring')).toBe(true);
		expect(matchesHeading(['Inbox #TO-LIST'], ONE_TAG, 'substring')).toBe(true);
		expect(matchesHeading(['x#to-list'], ONE_TAG, 'substring')).toBe(true);
	});

	it('searches for #to-list when the tag is typed without #', () => {
		expect(matchesHeading(['Inbox #to-list'], ['to-list'], 'substring')).toBe(true);
		expect(matchesHeading(['Inbox to-list'], ['to-list'], 'substring')).toBe(false);
	});

	it('does not match a heading without the tag', () => {
		expect(matchesHeading(['Inbox'], ONE_TAG, 'substring')).toBe(false);
		expect(matchesHeading([], ONE_TAG, 'substring')).toBe(false);
	});

	it('keeps every chain with no active tag', () => {
		expect(matchesHeading(['Inbox'], ['', '#'], 'substring')).toBe(true);
	});
});
