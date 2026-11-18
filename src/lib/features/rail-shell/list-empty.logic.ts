import type { ArchivedFilter } from '#lib/features/type-definitions/type-sidebar.logic.js';
import {
	ARCHIVE_LENS,
	FAVORITES_LENS,
	FOLDER_LENS_KIND,
	INBOX_LENS,
	NEIGHBOURHOOD_LENS_KIND,
	TYPES_LENS,
	UNTYPED_LENS,
	VIEW_LENS_KIND,
} from '#lib/features/rail-shell/lens.logic.js';

/** What an empty list's action does: every one changes local state only and writes no file. */
export type EmptyListAction = 'clear-search' | 'edit-filters' | 'show-active' | 'show-archived';

/** Which empty state the list shows; each has its own `data-note-list-*` hook. */
export type EmptyListState = 'searching' | 'no-matches' | 'empty';

/** An icon key, mapped to a component by the list (this file has no framework import). */
export type EmptyListIcon = 'search' | 'star' | 'inbox' | 'archive' | 'filter' | 'type' | 'folder' | 'view' | 'gone' | 'list';

/** Why a list is empty, as the list shows it. */
export interface EmptyListExplanation {
	/** Which empty state, and so which hook and layout */
	state: EmptyListState;
	/** The icon key */
	icon: EmptyListIcon;
	/** The one-line cause */
	title: string;
	/** The next step, when there is one */
	hint?: string;
	/** The button under the hint, when the list can undo the cause itself */
	action?: EmptyListAction;
}

/** What `explainEmptyList` reads about an empty list. */
export interface EmptyListInput {
	/** The lens kind (`Lens.kind`) */
	kind: string;
	/** True when the lens has no list: its target is gone, or no resolver knows its kind */
	resolvedIsNull: boolean;
	/** The name the type copy uses: the type's name for a type lens, "Untyped" for Untyped */
	label: string;
	/** The view's filter rows; 0 for any other lens */
	filterCount: number;
	/** A type or Untyped list's archived filter; null for a lens with a fixed lifecycle rule */
	archivedFilter: ArchivedFilter | null;
	/** Notes "Hide archived" leaves out of an empty type or Untyped list; 0 when not counted */
	hiddenArchivedCount: number;
	/** The search query, trimmed; empty when not searching */
	query: string;
	/** True while the full-text search for `query` has not answered */
	fullTextLoading: boolean;
}

/** Singular at 1, else plural with an "s". */
function plural(n: number, word: string): string {
	return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * Every string an empty rail list shows, in one table so a copy change
 * touches one entry. Also the view statuses (Loading, Missing, Error).
 */
export const LIST_EMPTY_COPY = {
	searching: 'Searching note contents...',
	noMatches: (query: string) => `No notes match "${query}"`,
	noMatchesHint: 'Search covers titles and content of this list.',
	gone: {
		types: 'No types yet',
		folder: 'This folder no longer exists',
		neighbourhood: 'This note is no longer in the vault',
	},
	viewEmpty: 'No notes in this view',
	viewFiltered: (count: number) => `No notes match ${plural(count, 'filter')}`,
	onlyArchived: (label: string) => `No archived ${label} notes`,
	allArchived: (count: number, label: string) => `All ${count} ${label} notes are archived`,
	favorites: { title: 'No favorites yet', hint: 'Star a note with ⌘D, the star above the note, or its row menu.' },
	inbox: { title: 'Inbox zero', hint: 'Notes not marked organized show here. Mark one with ⌘E.' },
	archive: { title: 'Nothing archived', hint: 'Archive a note from the ... menu above it. Archived notes leave Inbox and Today.' },
	untyped: 'Every note has a type.',
	type: { title: (label: string) => `No ${label} notes yet`, hint: 'Use + to create one.' },
	folder: 'This folder is empty.',
	generic: 'Nothing to show here',
	actions: {
		'clear-search': 'Clear search',
		'edit-filters': 'Edit filters',
		'show-active': 'Show active',
		'show-archived': 'Show archived',
	} satisfies Record<EmptyListAction, string>,
	loading: 'Loading notes',
	missing: { title: 'This view no longer exists', hint: 'Its .view file was moved or deleted.' },
	error: { title: 'This view cannot be shown', hint: 'Fix the .view file and the list reloads.' },
};

/** An `empty` state, with the hint and the action only when given. */
function empty(icon: EmptyListIcon, title: string, hint?: string, action?: EmptyListAction): EmptyListExplanation {
	return { state: 'empty', icon, title, ...(hint ? { hint } : {}), ...(action ? { action } : {}) };
}

/**
 * Names why an empty rail list is empty, in this order: a search with no
 * match (or still running), a lens with no list, a view's filters, the
 * archived filter, the lens's own copy, then a generic line. Plugin lens
 * kinds (the Calendar day) are not known here (`features/` cannot import
 * `plugins/`) and get the generic line.
 */
export function explainEmptyList(input: EmptyListInput): EmptyListExplanation {
	const copy = LIST_EMPTY_COPY;
	if (input.query) {
		if (input.fullTextLoading) return { state: 'searching', icon: 'search', title: copy.searching };
		return { state: 'no-matches', icon: 'search', title: copy.noMatches(input.query), hint: copy.noMatchesHint, action: 'clear-search' };
	}
	if (input.resolvedIsNull) {
		if (input.kind === TYPES_LENS.kind) return empty('type', copy.gone.types);
		if (input.kind === FOLDER_LENS_KIND) return empty('gone', copy.gone.folder);
		if (input.kind === NEIGHBOURHOOD_LENS_KIND) return empty('gone', copy.gone.neighbourhood);
		return empty('list', copy.generic);
	}
	if (input.kind === VIEW_LENS_KIND) {
		return input.filterCount > 0
			? empty('filter', copy.viewFiltered(input.filterCount), undefined, 'edit-filters')
			: empty('view', copy.viewEmpty);
	}
	if (input.archivedFilter === 'archived') return empty('archive', copy.onlyArchived(input.label), undefined, 'show-active');
	if (input.archivedFilter === 'active' && input.hiddenArchivedCount > 0) {
		return empty('archive', copy.allArchived(input.hiddenArchivedCount, input.label), undefined, 'show-archived');
	}
	switch (input.kind) {
		case FAVORITES_LENS.kind:
			return empty('star', copy.favorites.title, copy.favorites.hint);
		case INBOX_LENS.kind:
			return empty('inbox', copy.inbox.title, copy.inbox.hint);
		case ARCHIVE_LENS.kind:
			return empty('archive', copy.archive.title, copy.archive.hint);
		case UNTYPED_LENS.kind:
			return empty('type', copy.untyped);
		case TYPES_LENS.kind:
			return empty('type', copy.type.title(input.label), copy.type.hint);
		case FOLDER_LENS_KIND:
			return empty('folder', copy.folder);
		default:
			return empty('list', copy.generic);
	}
}
