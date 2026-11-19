import { describe, it, expect } from 'vitest';
import { explainEmptyList, LIST_EMPTY_COPY, type EmptyListInput } from '#lib/features/rail-shell/list-empty.logic.js';

/** An empty, resolved, unsearched list of `kind`; each case overrides what it is about. */
function input(kind: string, overrides: Partial<EmptyListInput> = {}): EmptyListInput {
	return {
		kind,
		resolvedIsNull: false,
		label: '',
		filterCount: 0,
		archivedFilter: null,
		hiddenArchivedCount: 0,
		query: '',
		fullTextLoading: false,
		...overrides,
	};
}

describe('explainEmptyList', () => {
	describe('per-lens copy', () => {
		it('Favorites names the three ways to star a note', () => {
			expect(explainEmptyList(input('favorites'))).toEqual({
				state: 'empty',
				icon: 'star',
				title: 'No favorites yet',
				hint: 'Star a note with ⌘D, the star above the note, or its row menu.',
			});
		});

		it('Inbox says what lands there and how to mark one organized', () => {
			expect(explainEmptyList(input('inbox'))).toEqual({
				state: 'empty',
				icon: 'inbox',
				title: 'Inbox zero',
				hint: 'Notes not marked organized show here. Mark one with ⌘E, the check on its row or its right-click menu.',
			});
		});

		it('Archive says where to archive from and what archiving does', () => {
			expect(explainEmptyList(input('archive'))).toEqual({
				state: 'empty',
				icon: 'archive',
				title: 'Nothing archived',
				hint: 'Archive a note from its right-click menu in a list or the ... menu above it. Archived notes leave Inbox and Today.',
			});
		});

		it('Untyped says every note has a type, with no hint', () => {
			const result = explainEmptyList(input('untyped', { label: 'Untyped', archivedFilter: 'active' }));
			expect(result.title).toBe('Every note has a type.');
			expect(result.hint).toBeUndefined();
			expect(result.action).toBeUndefined();
		});

		it('a type names itself and points at +', () => {
			const result = explainEmptyList(input('type', { label: 'Project', archivedFilter: 'active' }));
			expect(result.title).toBe('No Project notes yet');
			expect(result.hint).toBe('Use + to create one.');
			expect(result.action).toBeUndefined();
		});

		it('a type shown with its archived notes too still says it has none', () => {
			expect(explainEmptyList(input('type', { label: 'Project', archivedFilter: 'all' })).title).toBe('No Project notes yet');
		});

		it('a folder says it is empty', () => {
			const result = explainEmptyList(input('folder'));
			expect(result.title).toBe('This folder is empty.');
			expect(result.action).toBeUndefined();
		});

		it('Today, a provider lens or an unknown kind gets the generic title and no hint', () => {
			for (const kind of ['today', 'day', 'nope']) {
				const result = explainEmptyList(input(kind));
				expect(result.title).toBe('Nothing to show here');
				expect(result.hint).toBeUndefined();
				expect(result.action).toBeUndefined();
			}
		});
	});

	describe('a view', () => {
		it('with no filters says the view is empty, with no action', () => {
			const result = explainEmptyList(input('view'));
			expect(result.title).toBe('No notes in this view');
			expect(result.action).toBeUndefined();
		});

		it('with 1 filter is singular and offers Edit filters', () => {
			const result = explainEmptyList(input('view', { filterCount: 1 }));
			expect(result.title).toBe('No notes match 1 filter');
			expect(result.action).toBe('edit-filters');
		});

		it('with 3 filters is plural and offers Edit filters', () => {
			const result = explainEmptyList(input('view', { filterCount: 3 }));
			expect(result.title).toBe('No notes match 3 filters');
			expect(result.action).toBe('edit-filters');
		});
	});

	describe('the archived filter', () => {
		it('"Only archived" with nothing archived offers Show active', () => {
			const result = explainEmptyList(input('type', { label: 'Project', archivedFilter: 'archived' }));
			expect(result.title).toBe('No archived Project notes');
			expect(result.action).toBe('show-active');
		});

		it('"Hide archived" with 4 hidden says they are all archived and offers Show archived', () => {
			const result = explainEmptyList(input('type', { label: 'Project', archivedFilter: 'active', hiddenArchivedCount: 4 }));
			expect(result.title).toBe('All 4 Project notes are archived');
			expect(result.action).toBe('show-archived');
		});

		it('applies to Untyped too', () => {
			const result = explainEmptyList(input('untyped', { label: 'Untyped', archivedFilter: 'archived' }));
			expect(result.title).toBe('No archived Untyped notes');
			expect(result.action).toBe('show-active');
		});
	});

	describe('a lens with no list (null)', () => {
		it('bare Types says there are no types yet', () => {
			expect(explainEmptyList(input('type', { resolvedIsNull: true })).title).toBe('No types yet');
		});

		it('a folder says it no longer exists', () => {
			expect(explainEmptyList(input('folder', { resolvedIsNull: true })).title).toBe('This folder no longer exists');
		});

		it('a neighbourhood says its note is no longer in the vault', () => {
			expect(explainEmptyList(input('neighbourhood', { resolvedIsNull: true })).title).toBe('This note is no longer in the vault');
		});

		it('an unknown kind says there is nothing to show, with no hint', () => {
			const result = explainEmptyList(input('nope', { resolvedIsNull: true }));
			expect(result.title).toBe('Nothing to show here');
			expect(result.hint).toBeUndefined();
			expect(result.action).toBeUndefined();
		});

		it('wins over the per-lens copy', () => {
			expect(explainEmptyList(input('folder', { resolvedIsNull: true })).title).not.toBe('This folder is empty.');
		});
	});

	describe('search', () => {
		it('names the query and offers Clear search', () => {
			expect(explainEmptyList(input('folder', { query: 'roadmp' }))).toEqual({
				state: 'no-matches',
				icon: 'search',
				title: 'No notes match "roadmp"',
				hint: 'Search covers titles and content of this list.',
				action: 'clear-search',
			});
		});

		it('beats every lens case', () => {
			const cases: Partial<EmptyListInput>[] = [
				{ kind: 'favorites' },
				{ kind: 'inbox' },
				{ kind: 'archive' },
				{ kind: 'view', filterCount: 2 },
				{ kind: 'type', label: 'Project', archivedFilter: 'archived' },
				{ kind: 'type', label: 'Project', archivedFilter: 'active', hiddenArchivedCount: 3 },
				{ kind: 'folder', resolvedIsNull: true },
				{ kind: 'today' },
			];
			for (const overrides of cases) {
				const result = explainEmptyList(input(overrides.kind!, { ...overrides, query: 'zzzz' }));
				expect(result.state).toBe('no-matches');
				expect(result.title).toBe('No notes match "zzzz"');
				expect(result.action).toBe('clear-search');
			}
		});

		it('while the full-text search runs with no local match, gives the searching line instead', () => {
			const result = explainEmptyList(input('inbox', { query: 'zzzz', fullTextLoading: true }));
			expect(result).toEqual({ state: 'searching', icon: 'search', title: 'Searching note contents...' });
		});

		it('ignores a full-text search still running for a cleared query', () => {
			expect(explainEmptyList(input('inbox', { fullTextLoading: true })).title).toBe('Inbox zero');
		});
	});

	it('labels every action', () => {
		expect(LIST_EMPTY_COPY.actions).toEqual({
			'clear-search': 'Clear search',
			'edit-filters': 'Edit filters',
			'show-active': 'Show active',
			'show-archived': 'Show archived',
		});
	});
});
