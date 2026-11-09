import { describe, it, expect } from 'vitest';
import {
	applyListSort,
	sortLensNotes,
} from '#lib/features/rail-shell/list-sort-compare.logic.js';
import type { LensNote, ResolvedLens } from '#lib/features/rail-shell/rail-shell.types.js';
import type { ListSortConfig, ListSortOption } from '#lib/features/rail-shell/list-toolbar.types.js';

function note(overrides: Partial<LensNote> & { path: string }): LensNote {
	return {
		title: overrides.path.replace(/\.md$/, ''),
		favorite: false,
		modifiedAt: 0,
		createdAt: 0,
		frontmatter: {},
		isA: null,
		subtitle: '',
		italic: false,
		archived: false,
		kind: 'markdown',
		...overrides,
	};
}

function cfg(option: ListSortOption, direction: 'asc' | 'desc'): ListSortConfig {
	return { option, direction };
}

function paths(notes: readonly LensNote[]): string[] {
	return notes.map((n) => n.path);
}

describe('sortLensNotes', () => {
	it('returns an empty array for an empty input', () => {
		expect(sortLensNotes([], cfg('modified', 'desc'))).toEqual([]);
	});

	it('returns a new array and leaves the input order untouched', () => {
		const input = [
			note({ path: 'b.md', modifiedAt: 1 }),
			note({ path: 'a.md', modifiedAt: 2 }),
		];
		const snapshot = [...input];

		const result = sortLensNotes(input, cfg('modified', 'asc'));

		expect(result).not.toBe(input);
		expect(input).toEqual(snapshot);
		expect(paths(result)).toEqual(['b.md', 'a.md']);
	});

	it('orders by modifiedAt in both directions', () => {
		const input = [
			note({ path: 'mid.md', modifiedAt: 20 }),
			note({ path: 'old.md', modifiedAt: 10 }),
			note({ path: 'new.md', modifiedAt: 30 }),
		];
		expect(paths(sortLensNotes(input, cfg('modified', 'asc')))).toEqual([
			'old.md',
			'mid.md',
			'new.md',
		]);
		expect(paths(sortLensNotes(input, cfg('modified', 'desc')))).toEqual([
			'new.md',
			'mid.md',
			'old.md',
		]);
	});

	it('orders by createdAt, not modifiedAt, for the created option', () => {
		const input = [
			note({ path: 'a.md', modifiedAt: 1, createdAt: 300 }),
			note({ path: 'b.md', modifiedAt: 3, createdAt: 100 }),
			note({ path: 'c.md', modifiedAt: 2, createdAt: 200 }),
		];
		expect(paths(sortLensNotes(input, cfg('created', 'asc')))).toEqual([
			'b.md',
			'c.md',
			'a.md',
		]);
	});

	it('orders by title with natural comparison, so "Note 2" comes before "Note 10"', () => {
		const input = [
			note({ path: 'Note 10.md', title: 'Note 10' }),
			note({ path: 'Note 2.md', title: 'Note 2' }),
			note({ path: 'Alpha.md', title: 'Alpha' }),
		];
		expect(paths(sortLensNotes(input, cfg('title', 'asc')))).toEqual([
			'Alpha.md',
			'Note 2.md',
			'Note 10.md',
		]);
		expect(paths(sortLensNotes(input, cfg('title', 'desc')))).toEqual([
			'Note 10.md',
			'Note 2.md',
			'Alpha.md',
		]);
	});

	it('orders by frontmatter.status for the status option', () => {
		const input = [
			note({ path: 'doing.md', frontmatter: { status: 'doing' } }),
			note({ path: 'backlog.md', frontmatter: { status: 'backlog' } }),
		];
		expect(paths(sortLensNotes(input, cfg('status', 'asc')))).toEqual([
			'backlog.md',
			'doing.md',
		]);
	});

	it('reads the frontmatter key named after property: for a property option', () => {
		const input = [
			note({ path: 'late.md', frontmatter: { _due: '2026-03-01' } }),
			note({ path: 'early.md', frontmatter: { _due: '2026-01-01' } }),
		];
		expect(paths(sortLensNotes(input, cfg('property:_due', 'asc')))).toEqual([
			'early.md',
			'late.md',
		]);
	});

	describe('missing values', () => {
		it('sort last in ascending order', () => {
			const input = [
				note({ path: 'no-status.md' }),
				note({ path: 'empty-status.md', frontmatter: { status: '' } }),
				note({ path: 'null-status.md', frontmatter: { status: null } }),
				note({ path: 'empty-array.md', frontmatter: { status: [] } }),
				note({ path: 'done.md', frontmatter: { status: 'done' } }),
				note({ path: 'todo.md', frontmatter: { status: 'todo' } }),
			];
			const result = paths(sortLensNotes(input, cfg('status', 'asc')));
			expect(result.slice(0, 2)).toEqual(['done.md', 'todo.md']);
			expect(result.slice(2).sort()).toEqual(
				['empty-array.md', 'empty-status.md', 'no-status.md', 'null-status.md'],
			);
		});

		it('sort last in descending order too', () => {
			const input = [
				note({ path: 'no-status.md' }),
				note({ path: 'done.md', frontmatter: { status: 'done' } }),
				note({ path: 'todo.md', frontmatter: { status: 'todo' } }),
			];
			expect(paths(sortLensNotes(input, cfg('status', 'desc')))).toEqual([
				'todo.md',
				'done.md',
				'no-status.md',
			]);
		});

		it('treat a zero time as missing in both directions', () => {
			const input = [
				note({ path: 'unknown.md', modifiedAt: 0 }),
				note({ path: 'old.md', modifiedAt: 5 }),
				note({ path: 'new.md', modifiedAt: 9 }),
			];
			expect(paths(sortLensNotes(input, cfg('modified', 'asc')))).toEqual([
				'old.md',
				'new.md',
				'unknown.md',
			]);
			expect(paths(sortLensNotes(input, cfg('modified', 'desc')))).toEqual([
				'new.md',
				'old.md',
				'unknown.md',
			]);
		});

		it('treat a zero createdAt as missing', () => {
			const input = [
				note({ path: 'unknown.md', createdAt: 0 }),
				note({ path: 'known.md', createdAt: 7 }),
			];
			expect(paths(sortLensNotes(input, cfg('created', 'desc')))).toEqual([
				'known.md',
				'unknown.md',
			]);
		});

		it('keep a numeric zero property as a real value', () => {
			const input = [
				note({ path: 'none.md' }),
				note({ path: 'zero.md', frontmatter: { _count: 0 } }),
				note({ path: 'one.md', frontmatter: { _count: 1 } }),
			];
			expect(paths(sortLensNotes(input, cfg('property:_count', 'asc')))).toEqual([
				'zero.md',
				'one.md',
				'none.md',
			]);
		});
	});

	describe('ties', () => {
		it('break by title ascending when sorting ascending', () => {
			const input = [
				note({ path: 'z.md', title: 'Zeta', modifiedAt: 5 }),
				note({ path: 'a.md', title: 'Alpha', modifiedAt: 5 }),
			];
			expect(paths(sortLensNotes(input, cfg('modified', 'asc')))).toEqual([
				'a.md',
				'z.md',
			]);
		});

		it('break by title ascending when sorting descending', () => {
			const input = [
				note({ path: 'z.md', title: 'Zeta', modifiedAt: 5 }),
				note({ path: 'a.md', title: 'Alpha', modifiedAt: 5 }),
			];
			expect(paths(sortLensNotes(input, cfg('modified', 'desc')))).toEqual([
				'a.md',
				'z.md',
			]);
		});

		it('break equal titles by path ascending in both directions', () => {
			const input = [
				note({ path: 'folder-b/Same.md', title: 'Same' }),
				note({ path: 'folder-a/Same.md', title: 'Same' }),
			];
			expect(paths(sortLensNotes(input, cfg('title', 'asc')))).toEqual([
				'folder-a/Same.md',
				'folder-b/Same.md',
			]);
			expect(paths(sortLensNotes(input, cfg('title', 'desc')))).toEqual([
				'folder-a/Same.md',
				'folder-b/Same.md',
			]);
		});

		it('break a tie between two missing values by title', () => {
			const input = [
				note({ path: 'z.md', title: 'Zeta' }),
				note({ path: 'a.md', title: 'Alpha' }),
			];
			expect(paths(sortLensNotes(input, cfg('property:_due', 'desc')))).toEqual([
				'a.md',
				'z.md',
			]);
		});
	});

	describe('value kinds', () => {
		it('compares numbers numerically, so 2 comes before 10', () => {
			const input = [
				note({ path: 'ten.md', frontmatter: { _n: 10 } }),
				note({ path: 'two.md', frontmatter: { _n: 2 } }),
				note({ path: 'one-half.md', frontmatter: { _n: 0.5 } }),
			];
			expect(paths(sortLensNotes(input, cfg('property:_n', 'asc')))).toEqual([
				'one-half.md',
				'two.md',
				'ten.md',
			]);
			expect(paths(sortLensNotes(input, cfg('property:_n', 'desc')))).toEqual([
				'ten.md',
				'two.md',
				'one-half.md',
			]);
		});

		it('compares strings with digit runs numerically', () => {
			const input = [
				note({ path: 'item-10.md', frontmatter: { _label: 'item 10' } }),
				note({ path: 'item-2.md', frontmatter: { _label: 'item 2' } }),
			];
			expect(paths(sortLensNotes(input, cfg('property:_label', 'asc')))).toEqual([
				'item-2.md',
				'item-10.md',
			]);
		});

		it('puts false before true in ascending order', () => {
			const input = [
				note({ path: 't.md', frontmatter: { _done: true } }),
				note({ path: 'f.md', frontmatter: { _done: false } }),
			];
			expect(paths(sortLensNotes(input, cfg('property:_done', 'asc')))).toEqual([
				'f.md',
				't.md',
			]);
			expect(paths(sortLensNotes(input, cfg('property:_done', 'desc')))).toEqual([
				't.md',
				'f.md',
			]);
		});

		it('compares date strings by time, not by text', () => {
			// Text order says 10:00 is after 09:00, but 09:00Z is later than 08:00+02:00 by time.
			const input = [
				note({ path: 'later.md', frontmatter: { _when: '2026-01-05T09:00:00Z' } }),
				note({ path: 'earlier.md', frontmatter: { _when: '2026-01-05T10:00:00+02:00' } }),
			];
			expect(paths(sortLensNotes(input, cfg('property:_when', 'asc')))).toEqual([
				'earlier.md',
				'later.md',
			]);
		});

		it('compares plain YYYY-MM-DD dates by day', () => {
			const input = [
				note({ path: 'oct.md', frontmatter: { _due: '2026-10-01' } }),
				note({ path: 'sep.md', frontmatter: { _due: '2026-09-30' } }),
			];
			expect(paths(sortLensNotes(input, cfg('property:_due', 'asc')))).toEqual([
				'sep.md',
				'oct.md',
			]);
		});

		it('compares an array by its items joined with ", "', () => {
			const input = [
				note({ path: 'beta.md', frontmatter: { _tags: ['beta'] } }),
				note({ path: 'alpha.md', frontmatter: { _tags: ['alpha', 'zed'] } }),
			];
			expect(paths(sortLensNotes(input, cfg('property:_tags', 'asc')))).toEqual([
				'alpha.md',
				'beta.md',
			]);
		});

		it('orders mixed kinds by kind: numbers, booleans, dates, then text', () => {
			const input = [
				note({ path: 'word.md', frontmatter: { _v: 'abc' } }),
				note({ path: 'date.md', frontmatter: { _v: '2026-01-02' } }),
				note({ path: 'flag.md', frontmatter: { _v: true } }),
				note({ path: 'number.md', frontmatter: { _v: 5 } }),
			];
			expect(paths(sortLensNotes(input, cfg('property:_v', 'asc')))).toEqual(['number.md', 'flag.md', 'date.md', 'word.md']);
		});

		it.each([
			[[1.25, 1.5, '1.7 days']],
			[[-2, -1, '-1x']],
			[['2026-01-03', '2026-01-02T23:00:00-05:00', '2026-01-02zzz']],
		])('gives one order for mixed values %j whatever the input order', (values) => {
			const notes = values.map((v, i) => note({ path: `${i}.md`, frontmatter: { _v: v } }));
			const [a, b, c] = notes;
			const orders = [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]].map((input) =>
				paths(sortLensNotes(input, cfg('property:_v', 'asc'))).join(),
			);
			expect(new Set(orders).size).toBe(1);
		});

		it('reads a bare date as local midnight, so it orders with a local date-time in every zone', () => {
			const input = [
				note({ path: 'jan.md', frontmatter: { _v: '2026-01-01' } }),
				note({ path: 'dec.md', frontmatter: { _v: '2025-12-31T22:00:00' } }),
			];
			expect(paths(sortLensNotes(input, cfg('property:_v', 'asc')))).toEqual(['dec.md', 'jan.md']);
		});

		it('orders a title as text even when it reads like a date', () => {
			const input = ['Inbox', '2026-Q2', '2026-05-01', '2025-Q4'].map((title) => note({ path: `${title}.md`, title }));
			expect(sortLensNotes(input, cfg('title', 'asc')).map((n) => n.title)).toEqual(['2025-Q4', '2026-05-01', '2026-Q2', 'Inbox']);
		});

		it('orders accented titles with their base letter and ignores case', () => {
			const input = ['Zebra', 'Éclair', 'apple', 'Água'].map((title) => note({ path: `${title}.md`, title }));
			expect(sortLensNotes(input, cfg('title', 'asc')).map((n) => n.title)).toEqual(['Água', 'apple', 'Éclair', 'Zebra']);
		});
	});
});

describe('applyListSort', () => {
	it('sorts a flat list and keeps the label, rule and status', () => {
		const resolved: ResolvedLens = {
			label: 'Inbox',
			rule: 'Not organized',
			notes: [
				note({ path: 'b.md', modifiedAt: 1 }),
				note({ path: 'a.md', modifiedAt: 2 }),
			],
			status: { kind: 'loading' },
		};
		const snapshot = structuredClone(resolved);

		const result = applyListSort(resolved, cfg('modified', 'asc'));

		expect(paths(result.notes)).toEqual(['b.md', 'a.md']);
		expect(result.label).toBe('Inbox');
		expect(result.rule).toBe('Not organized');
		expect(result.status).toEqual({ kind: 'loading' });
		expect(result.groups).toBeUndefined();
		expect(resolved).toEqual(snapshot);
	});

	it('returns an empty list unchanged in shape', () => {
		const result = applyListSort(
			{ label: 'Empty', rule: '', notes: [] },
			cfg('title', 'asc'),
		);
		expect(result.notes).toEqual([]);
		expect(result.groups).toBeUndefined();
	});

	it('sorts each group and lists a note shown in two groups once, in group order', () => {
		const shared = note({ path: 'shared.md', title: 'Shared', modifiedAt: 5 });
		const resolved: ResolvedLens = {
			label: 'Neighbourhood',
			rule: '',
			notes: [],
			groups: [
				{
					id: 'first',
					label: 'First',
					notes: [
						note({ path: 'old.md', title: 'Old', modifiedAt: 1 }),
						shared,
					],
				},
				{
					id: 'second',
					label: 'Second',
					notes: [
						note({ path: 'new.md', title: 'New', modifiedAt: 9 }),
						shared,
					],
				},
			],
		};

		const result = applyListSort(resolved, cfg('modified', 'desc'));

		expect(result.groups?.map((g) => g.id)).toEqual(['first', 'second']);
		expect(paths(result.groups?.[0].notes ?? [])).toEqual(['shared.md', 'old.md']);
		expect(paths(result.groups?.[1].notes ?? [])).toEqual(['new.md', 'shared.md']);
		expect(paths(result.notes)).toEqual(['shared.md', 'old.md', 'new.md']);
	});

	it('keeps group headers and does not mutate the input groups', () => {
		const groupNotes = [
			note({ path: 'b.md', title: 'B' }),
			note({ path: 'a.md', title: 'A' }),
		];
		const resolved: ResolvedLens = {
			label: 'Today',
			rule: '',
			notes: [],
			groups: [{ id: 'today', label: "Today's notes", notes: groupNotes }],
		};

		const result = applyListSort(resolved, cfg('title', 'asc'));

		expect(result.groups?.[0].label).toBe("Today's notes");
		expect(paths(result.groups?.[0].notes ?? [])).toEqual(['a.md', 'b.md']);
		expect(paths(groupNotes)).toEqual(['b.md', 'a.md']);
		expect(resolved.groups?.[0].notes).toBe(groupNotes);
	});
});
