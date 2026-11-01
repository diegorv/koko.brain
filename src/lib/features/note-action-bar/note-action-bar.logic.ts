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
