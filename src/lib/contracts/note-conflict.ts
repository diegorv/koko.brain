/**
 * A note save refused because the note changed on disk since the version the
 * editor tab is based on (the Mac host's checked write, `remote::write`).
 * Defined in `contracts/` so `core/editor` can tell it apart and `app/remote`
 * can raise it (ADR-0003).
 */

/** What the editor shows when a save is refused as a conflict. */
export const NOTE_CONFLICT_MESSAGE =
	'This note changed on the Mac. Your text is kept; reload the note to see the Mac version';

/** Thrown by a note write that the host refused as stale. */
export class NoteConflictError extends Error {
	/** Absolute path of the note. */
	readonly path: string;

	constructor(path: string, cause?: unknown) {
		super(`${NOTE_CONFLICT_MESSAGE} (${path})`, { cause });
		this.name = 'NoteConflictError';
		this.path = path;
	}
}
