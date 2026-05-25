import { describe, it, expectTypeOf, expect } from 'vitest';
import type {
	FrontmatterValue,
	NoteEntryV2,
	UpdateResultV2,
	WikiLinkV2,
} from '$lib/types/vault-v2.types';

describe('vault-v2.types', () => {
	describe('FrontmatterValue', () => {
		it('accepts every JSON-shaped value (null, bool, number, string)', () => {
			const a: FrontmatterValue = null;
			const b: FrontmatterValue = true;
			const c: FrontmatterValue = 42;
			const d: FrontmatterValue = 'hello';
			expect([a, b, c, d]).toEqual([null, true, 42, 'hello']);
		});

		it('is recursive for arrays', () => {
			const v: FrontmatterValue = ['a', 1, true, null, ['nested', 2]];
			expect(v).toEqual(['a', 1, true, null, ['nested', 2]]);
		});

		it('is recursive for objects', () => {
			const v: FrontmatterValue = {
				key: 'value',
				count: 3,
				nested: { deep: ['arr', null] },
			};
			expect((v as { count: number }).count).toBe(3);
		});
	});

	describe('WikiLinkV2', () => {
		it('requires the four wire fields with the right types', () => {
			const link: WikiLinkV2 = {
				target: 'Note',
				alias: null,
				heading: null,
				position: 0,
			};
			expectTypeOf(link.target).toBeString();
			expectTypeOf(link.alias).toEqualTypeOf<string | null>();
			expectTypeOf(link.heading).toEqualTypeOf<string | null>();
			expectTypeOf(link.position).toBeNumber();
		});

		it('allows alias and heading to be present strings', () => {
			const link: WikiLinkV2 = {
				target: 'Note',
				alias: 'short',
				heading: 'section',
				position: 12,
			};
			expect(link).toEqual({
				target: 'Note',
				alias: 'short',
				heading: 'section',
				position: 12,
			});
		});
	});

	describe('NoteEntryV2', () => {
		it('matches the Rust NoteEntry camelCase wire shape', () => {
			const entry: NoteEntryV2 = {
				path: '/abs/note.md',
				title: 'note',
				frontmatter: {
					title: 'Hello',
					tags: ['a', 'b'],
					rating: 4.5,
					featured: true,
					nested: null,
				},
				outgoingLinks: [
					{ target: 'Other', alias: null, heading: null, position: 7 },
				],
				tags: ['a', 'b'],
				modifiedAt: 1714305600,
				createdAt: 1714000000,
				size: 1024,
				wordCount: 5,
				snippet: 'Hello world',
				tasks: [],
				isA: null,
				organized: false,
				archived: false,
				favorite: false,
			};

			// Type-level checks lock the field names + types so a Rust-side
			// rename without an accompanying TS update fails the build.
			expectTypeOf(entry.path).toBeString();
			expectTypeOf(entry.title).toBeString();
			expectTypeOf(entry.frontmatter).toEqualTypeOf<Record<string, FrontmatterValue>>();
			expectTypeOf(entry.outgoingLinks).toEqualTypeOf<WikiLinkV2[]>();
			expectTypeOf(entry.tags).toEqualTypeOf<string[]>();
			expectTypeOf(entry.modifiedAt).toBeNumber();
			expectTypeOf(entry.createdAt).toBeNumber();
			expectTypeOf(entry.size).toBeNumber();
			expectTypeOf(entry.wordCount).toBeNumber();
			expectTypeOf(entry.snippet).toBeString();

			// Runtime sanity-check that the keys exist (no rogue snake_case).
			const keys = Object.keys(entry).sort();
			expect(keys).toEqual([
				'createdAt',
				'frontmatter',
				'modifiedAt',
				'outgoingLinks',
				'path',
				'size',
				'snippet',
				'tags',
				'tasks',
				'title',
				'wordCount',
			]);
		});
	});

	describe('UpdateResultV2', () => {
		it('locks the changed/affected/version shape', () => {
			const result: UpdateResultV2 = {
				changed: true,
				affected: ['/abs/a.md', '/abs/b.md'],
				version: 17,
			};
			expectTypeOf(result.changed).toBeBoolean();
			expectTypeOf(result.affected).toEqualTypeOf<string[]>();
			expectTypeOf(result.version).toBeNumber();
		});
	});
});
