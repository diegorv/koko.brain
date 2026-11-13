import { describe, it, expect } from 'vitest';
import type { LensGroup, LensNote, ResolvedLens } from '#lib/features/rail-shell/rail-shell.types.js';
import {
	filterResolvedLens,
	noteMatchesListQuery,
	normalizeListQuery,
} from '#lib/features/rail-shell/list-search.logic.js';

/** Builds a listed note; every test fixture goes through here so new LensNote fields land in one place. */
function makeNote(overrides: Partial<LensNote> = {}): LensNote {
	return {
		path: '/vault/note.md',
		title: 'Note',
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

/** Builds a resolved lens around the given notes and optional groups. */
function makeResolved(notes: LensNote[], groups?: LensGroup[]): ResolvedLens {
	return { label: 'Test', rule: 'rule', notes, ...(groups ? { groups } : {}) };
}

describe('normalizeListQuery', () => {
	it('trims and lower-cases the query', () => {
		expect(normalizeListQuery('  Alice Smith  ')).toBe('alice smith');
	});

	it('returns an empty string for a blank or whitespace-only query', () => {
		expect(normalizeListQuery('')).toBe('');
		expect(normalizeListQuery('   ')).toBe('');
	});
});

describe('noteMatchesListQuery', () => {
	it('matches every note on an empty query', () => {
		expect(noteMatchesListQuery(makeNote({ title: 'Anything' }), '', [])).toBe(true);
	});

	it('matches a case-insensitive substring of the title', () => {
		const note = makeNote({ title: 'Quarterly Review' });
		expect(noteMatchesListQuery(note, 'review', [])).toBe(true);
		expect(noteMatchesListQuery(note, 'budget', [])).toBe(false);
	});

	it('matches the display text of a wikilink pill, not its target path', () => {
		const note = makeNote({
			title: 'Meeting',
			frontmatter: { attendee: '[[people/alice-smith|Alice Smith]]' },
		});
		expect(noteMatchesListQuery(note, 'alice', ['attendee'])).toBe(true);
		expect(noteMatchesListQuery(note, 'people', ['attendee'])).toBe(false);
	});

	it('matches a plain text pill of a property', () => {
		const note = makeNote({ title: 'Task', frontmatter: { status: 'In progress' } });
		expect(noteMatchesListQuery(note, 'progress', ['status'])).toBe(true);
	});

	it('matches an element of an array property', () => {
		const note = makeNote({
			title: 'Trip',
			frontmatter: { tags: ['travel', '[[places/lisbon|Lisbon]]'] },
		});
		expect(noteMatchesListQuery(note, 'lisbon', ['tags'])).toBe(true);
		expect(noteMatchesListQuery(note, 'travel', ['tags'])).toBe(true);
		expect(noteMatchesListQuery(note, 'paris', ['tags'])).toBe(false);
	});

	it('ignores properties the list does not show as pills', () => {
		const note = makeNote({ title: 'Note', frontmatter: { secret: 'hidden value' } });
		expect(noteMatchesListQuery(note, 'hidden', [])).toBe(false);
		expect(noteMatchesListQuery(note, 'hidden', ['other'])).toBe(false);
	});

	it('handles a missing or null property value without matching', () => {
		const note = makeNote({ title: 'Note', frontmatter: { owner: null } });
		expect(noteMatchesListQuery(note, 'x', ['owner', 'absent'])).toBe(false);
	});

	it('does not match on the subtitle, which holds relative times', () => {
		const note = makeNote({ title: 'Note', subtitle: 'Person · 3 days ago' });
		expect(noteMatchesListQuery(note, 'person', [])).toBe(false);
	});

	it('matches a note whose path is in the full-text hits even when its title does not match', () => {
		const note = makeNote({ path: '/vault/journal/2026-11-01.md', title: '2026-11-01' });
		const fullTextPaths = new Set(['/vault/journal/2026-11-01.md']);
		expect(noteMatchesListQuery(note, 'kickoff', [], fullTextPaths)).toBe(true);
	});

	it('does not match a note absent from the full-text hits when neither title nor pills match', () => {
		const note = makeNote({ path: '/vault/a.md', title: 'Alpha' });
		const fullTextPaths = new Set(['/vault/b.md']);
		expect(noteMatchesListQuery(note, 'kickoff', [], fullTextPaths)).toBe(false);
	});
});

describe('filterResolvedLens', () => {
	it('returns the same resolved lens object on an empty query', () => {
		const resolved = makeResolved([makeNote({ title: 'A' })]);
		expect(filterResolvedLens(resolved, '', () => [])).toBe(resolved);
	});

	it('returns the same resolved lens object on a whitespace-only query', () => {
		const resolved = makeResolved([makeNote({ title: 'A' })]);
		expect(filterResolvedLens(resolved, '   ', () => [])).toBe(resolved);
	});

	it('keeps only the notes that match and leaves the other lens fields alone', () => {
		const match = makeNote({ path: '/vault/a.md', title: 'Budget plan' });
		const miss = makeNote({ path: '/vault/b.md', title: 'Lunch' });
		const resolved = makeResolved([match, miss]);

		const result = filterResolvedLens(resolved, 'budget', () => []);

		expect(result.notes).toEqual([match]);
		expect(result.label).toBe('Test');
		expect(result.rule).toBe('rule');
	});

	it('uses the properties returned for each note', () => {
		const note = makeNote({
			path: '/vault/a.md',
			title: 'Untitled',
			frontmatter: { owner: 'Priya' },
		});
		const seenFor: string[] = [];
		const listPropertiesFor = (n: LensNote): string[] => {
			seenFor.push(n.path);
			return ['owner'];
		};

		const result = filterResolvedLens(makeResolved([note]), 'priya', listPropertiesFor);

		expect(result.notes).toEqual([note]);
		expect(seenFor).toEqual(['/vault/a.md']);
	});

	it('filters each group and keeps groups that end up empty', () => {
		const today = makeNote({ path: '/vault/t.md', title: 'Standup' });
		const later = makeNote({ path: '/vault/l.md', title: 'Dentist' });
		const groups: LensGroup[] = [
			{ id: 'today', label: 'Today', notes: [today] },
			{ id: 'later', label: 'Later', notes: [later] },
		];
		const resolved = makeResolved([today, later], groups);

		const result = filterResolvedLens(resolved, 'standup', () => []);

		expect(result.groups).toEqual([
			{ id: 'today', label: 'Today', notes: [today] },
			{ id: 'later', label: 'Later', notes: [] },
		]);
		expect(result.notes).toEqual([today]);
	});

	it('returns an empty note list when nothing matches', () => {
		const resolved = makeResolved([makeNote({ title: 'Alpha' })]);
		const result = filterResolvedLens(resolved, 'zzz', () => []);
		expect(result.notes).toEqual([]);
	});

	it('returns an empty list for an empty lens without throwing', () => {
		const result = filterResolvedLens(makeResolved([]), 'anything', () => []);
		expect(result.notes).toEqual([]);
	});

	it('includes a full-text hit whose title does not match', () => {
		const hit = makeNote({ path: '/vault/meeting.md', title: 'Weekly sync' });
		const miss = makeNote({ path: '/vault/other.md', title: 'Recipes' });
		const fullTextPaths = new Set(['/vault/meeting.md']);

		const result = filterResolvedLens(makeResolved([hit, miss]), 'roadmap', () => [], fullTextPaths);

		expect(result.notes).toEqual([hit]);
	});
});
