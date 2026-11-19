/** A note action shared by the note-list row menu and the note's More menu. */
export type NoteActionId = 'archive' | 'organize' | 'history' | 'trash';

/** One entry of the note-actions group; each menu maps `id` to its icon and handler. */
export interface NoteAction {
	/** Which action this is */
	id: NoteActionId;
	/** Menu label, following the note's state */
	label: string;
	/** Destructive: drawn red */
	danger: boolean;
}

/** The lifecycle flags the labels follow. */
export interface NoteActionsState {
	/** Whether the note is organized */
	organized: boolean;
	/** Whether the note carries `_archived: true` */
	archived: boolean;
}

const TRASH: NoteAction = { id: 'trash', label: 'Move to Trash', danger: true };

/**
 * The note-actions group, in menu order: Archive or Restore, Mark organized or
 * Mark not organized, History, then Move to Trash last. A file that is not a
 * markdown note has no frontmatter to write and no history, so it gets Move to
 * Trash only.
 * @param kind - the file's kind: `'markdown'` for a note, anything else (`'canvas'`, `'view'`, `'pdf'`...) for another file
 * @param state - the note's lifecycle flags
 */
export function noteActions(kind: string, state: NoteActionsState): NoteAction[] {
	if (kind !== 'markdown') return [TRASH];
	return [
		{ id: 'archive', label: state.archived ? 'Restore' : 'Archive', danger: false },
		{ id: 'organize', label: state.organized ? 'Mark not organized' : 'Mark organized', danger: false },
		{ id: 'history', label: 'History', danger: false },
		TRASH,
	];
}
