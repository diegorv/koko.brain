/**
 * Note-creating actions plugins register into the note action bar.
 *
 * `features/` must not import `plugins/`, so a plugin (New 1:1 in
 * `plugins/one-on-one`) registers here at vault open and the bar renders
 * whatever is registered.
 */
import type { NoteHubAction } from './note-action-bar.logic';

/** The registered actions, in registration order. */
let actions = $state.raw<readonly NoteHubAction[]>([]);

export const noteActionBarActionsStore = {
	/** The registered actions, in registration order. */
	get actions(): readonly NoteHubAction[] {
		return actions;
	},

	/**
	 * Registers `action`. The returned function removes this registration and
	 * is a no-op once it already ran or the store was reset.
	 */
	register(action: NoteHubAction): () => void {
		actions = [...actions, action];
		return () => {
			actions = actions.filter((a) => a !== action);
		};
	},

	/** Drops every registration. */
	reset(): void {
		actions = [];
	},
};
