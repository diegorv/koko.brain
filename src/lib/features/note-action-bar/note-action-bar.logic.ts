import { basename } from '#lib/utils/path.js';
import { normalizeTypeCasing, parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import { getLifecycleState, isFavorite, isOrganized } from '#lib/features/properties/lifecycle.logic.js';

/** What the note action bar shows for one note. */
export interface ActionBarState {
	/** The note's `_type` (first letter uppercased, as Rust's `is_a`), or "Note". */
	typeLabel: string;
	/** The note's type name as `typeLabel` writes it, or null for a note without one. */
	typeName: string | null;
	/** The file name, extension included. */
	fileName: string;
	/** `_favorite` is true. */
	favorite: boolean;
	/** The note is organized: `_organized` is not the boolean `false` (a missing key reads as organized). */
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
	// A blank `_type` reads as "Note" in the bar, though Rust keeps it as `is_a`.
	const typeName = typeof type === 'string' && type.trim() ? normalizeTypeCasing(type) : null;
	return {
		typeLabel: typeName ?? 'Note',
		typeName,
		fileName: basename(path),
		favorite: isFavorite(props),
		organized: isOrganized(props),
		archived: getLifecycleState(props) === 'archived',
	};
}

/** A note-creating action a plugin registers into the bar for notes of one type. */
export interface NoteHubAction {
	/** Stable id, rendered as the button's `data-hub-action`. */
	id: string;
	/** Button text, e.g. "New 1:1". */
	label: string;
	/** The type (as `ActionBarState.typeName`) whose notes show the action. */
	typeName: string;
	/** Runs the action for the note at `path`; it reports its own failures. */
	run: (path: string) => Promise<void>;
}

/** The note-creating button the bar shows: a registered action, or the bar's own New linked note. */
export type HubAction = { kind: 'registered'; action: NoteHubAction } | { kind: 'linked-note' };

/**
 * Picks the bar's note-creating button for a note: an action registered for
 * its type wins (Person gets New 1:1, hub or not); otherwise a hub type gets
 * New linked note; any other note gets none.
 * @param typeName - `ActionBarState.typeName`
 * @param isHub - the type definition sets `_hub: true`
 * @param registered - the actions plugins registered
 */
export function resolveHubAction(
	typeName: string | null,
	isHub: boolean,
	registered: readonly NoteHubAction[],
): HubAction | null {
	if (typeName === null) return null;
	const action = registered.find((a) => a.typeName === typeName);
	if (action) return { kind: 'registered', action };
	return isHub ? { kind: 'linked-note' } : null;
}

/** A bar action that moves into More when the bar runs out of width. */
export type FoldableAction = 'neighbourhood' | 'width' | 'toc' | 'reveal' | 'copy-path';

/**
 * The foldable actions in the order the bar shows them. Neighbourhood (rail
 * shell only) sits before Raw and the rest after it, so `NoteActionBar`
 * renders it ahead of the Raw button.
 */
export const FOLDABLE_ACTIONS: readonly FoldableAction[] = ['neighbourhood', 'width', 'toc', 'reveal', 'copy-path'];

/** The order the foldable actions move into More, first to fold first: the rightmost go first. */
export const FOLD_ORDER: readonly FoldableAction[] = ['copy-path', 'reveal', 'toc', 'width', 'neighbourhood'];

/** Width one icon button takes in the bar (28 px button + 4 px gap). */
export const ACTION_SLOT_WIDTH = 32;

/**
 * Width the bar keeps before any foldable action comes back inline. Far more
 * than what never folds (padding, the type and file name, Favorite /
 * Organized / Raw / More and the dividers) so the foldable actions start in
 * More on a typical editor pane and return only on a wide one.
 */
export const BAR_RESERVED_WIDTH = 960;

/**
 * Width the New 1:1 / New linked note button takes from the foldable actions
 * when it shows (label, icon, padding and margin). Sized for the wider
 * "New linked note" label (estimated, not measured).
 */
export const HUB_ACTION_WIDTH = 136;

/**
 * Splits the foldable actions between the bar and the More menu for a bar of
 * `barWidth` px. Both lists keep bar order. A width of 0 means the bar was not
 * measured yet (or the environment has no layout) and folds everything.
 */
export function foldActions(barWidth: number): { inline: FoldableAction[]; folded: FoldableAction[] } {
	if (barWidth <= 0) return { inline: [], folded: [...FOLDABLE_ACTIONS] };
	const slots = Math.max(0, Math.floor((barWidth - BAR_RESERVED_WIDTH) / ACTION_SLOT_WIDTH));
	const foldCount = Math.max(0, FOLDABLE_ACTIONS.length - slots);
	const folding = new Set(FOLD_ORDER.slice(0, foldCount));
	return {
		inline: FOLDABLE_ACTIONS.filter((a) => !folding.has(a)),
		folded: FOLDABLE_ACTIONS.filter((a) => folding.has(a)),
	};
}
