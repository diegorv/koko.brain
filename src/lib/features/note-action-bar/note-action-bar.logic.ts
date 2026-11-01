import { basename } from '#lib/utils/path.js';
import { parseFrontmatterProperties } from '#lib/features/properties/properties.logic.js';
import { getLifecycleState, isFavorite, isOrganized } from '#lib/features/properties/lifecycle.logic.js';
import { normalizeTypeCasing } from '#lib/features/type-definitions/type-definitions.logic.js';

/** What the note action bar shows for one note. */
export interface ActionBarState {
	/** The note's `_type` (first letter uppercased, as Rust's `is_a`), or "Note". */
	typeLabel: string;
	/** The file name, extension included. */
	fileName: string;
	/** `_favorite` is true. */
	favorite: boolean;
	/** `_organized` is true. */
	organized: boolean;
	/** `_archived` is true. */
	archived: boolean;
}

/**
 * Reads the action bar's state from a note's own content (never the
 * Properties panel's store, which is empty while the right sidebar is hidden).
 * @param path - the note's absolute path
 * @param content - the note's current content (the tab's, unsaved edits included)
 */
export function getActionBarState(path: string, content: string): ActionBarState {
	const props = parseFrontmatterProperties(content);
	const type = props.find((p) => p.key === '_type')?.value;
	return {
		// A blank `_type` reads as "Note" in the bar, though Rust keeps it as `is_a`.
		typeLabel: typeof type === 'string' && type.trim() ? normalizeTypeCasing(type) : 'Note',
		fileName: basename(path),
		favorite: isFavorite(props),
		organized: isOrganized(props),
		archived: getLifecycleState(props) === 'archived',
	};
}

/** A bar action that moves into More when the bar runs out of width. */
export type FoldableAction = 'width' | 'toc' | 'reveal' | 'copy-path';

/** The foldable actions in the order the bar shows them. */
export const FOLDABLE_ACTIONS: readonly FoldableAction[] = ['width', 'toc', 'reveal', 'copy-path'];

/**
 * The order the foldable actions move into More, first to fold first: the
 * rightmost go first. The rail shell's Neighbourhood action joins as one more
 * entry here and in `FOLDABLE_ACTIONS`, but the bar renders every inline
 * foldable after Raw, while Neighbourhood sits before Raw: `NoteActionBar`
 * must then render it as its own group ahead of the Raw button.
 */
export const FOLD_ORDER: readonly FoldableAction[] = ['copy-path', 'reveal', 'toc', 'width'];

/** Width one icon button takes in the bar (28 px button + 4 px gap). */
export const ACTION_SLOT_WIDTH = 32;

/**
 * Width the bar keeps for what never folds: padding, a minimum for the type
 * and file name, the Favorite / Organized / Raw / More / right-sidebar
 * buttons and the divider.
 */
export const BAR_RESERVED_WIDTH = 360;

/**
 * Splits the foldable actions between the bar and the More menu for a bar of
 * `barWidth` px. Both lists keep bar order. A width of 0 means the bar was not
 * measured yet (or the environment has no layout) and folds nothing.
 */
export function foldActions(barWidth: number): { inline: FoldableAction[]; folded: FoldableAction[] } {
	if (barWidth <= 0) return { inline: [...FOLDABLE_ACTIONS], folded: [] };
	const slots = Math.max(0, Math.floor((barWidth - BAR_RESERVED_WIDTH) / ACTION_SLOT_WIDTH));
	const foldCount = Math.max(0, FOLDABLE_ACTIONS.length - slots);
	const folding = new Set(FOLD_ORDER.slice(0, foldCount));
	return {
		inline: FOLDABLE_ACTIONS.filter((a) => !folding.has(a)),
		folded: FOLDABLE_ACTIONS.filter((a) => folding.has(a)),
	};
}
