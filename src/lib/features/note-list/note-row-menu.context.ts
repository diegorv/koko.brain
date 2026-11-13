import { getContext, setContext } from 'svelte';
import type { NoteRowNote } from './note-row.types';

/** The key that renames the focused row; the menu's Rename item shows it as its hint. */
export const RENAME_SHORTCUT = { key: 'F2' } as const;

/** Inline rename input state, owned by the menu so it survives a row remount while scrolling. */
export interface NoteRowRenameState {
	/** Current text of the rename input */
	value: string;
	/** The mounted rename input, focused and selected when rename starts */
	input: HTMLInputElement | undefined;
}

/** Actions NoteRowMenu exposes to the NoteRow components rendered inside it. */
export interface NoteRowMenuContext {
	/** Sets the note the context menu acts on */
	setContextTarget: (note: NoteRowNote) => void;
	/** Puts `note` into inline rename mode */
	startRename: (note: NoteRowNote) => void;
	/** Shared rename input state */
	rename: NoteRowRenameState;
	/** Applies the rename (bound to the input's blur) */
	commitRename: () => void;
	/** Enter confirms the rename, Escape cancels it */
	onRenameKeydown: (e: KeyboardEvent) => void;
}

const KEY = Symbol('note-row-menu-context');

/** Called once by NoteRowMenu to expose its actions to the rows it wraps. */
export function setNoteRowMenuContext(ctx: NoteRowMenuContext): void {
	setContext(KEY, ctx);
}

/** Called by NoteRow to reach the enclosing NoteRowMenu. */
export function useNoteRowMenuContext(): NoteRowMenuContext {
	return getContext<NoteRowMenuContext>(KEY);
}
