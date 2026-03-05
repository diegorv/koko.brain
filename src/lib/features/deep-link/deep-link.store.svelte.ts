import type { DeepLinkAction } from './deep-link.types';

/** Pending deep-link action waiting for vault initialization to complete */
let pendingAction = $state<DeepLinkAction | null>(null);

/**
 * Store for deep-link state.
 * Holds a pending action when a deep-link requires a vault switch —
 * the action is stored here and executed after initializeVault() completes.
 */
export const deepLinkStore = {
	/** The pending deep-link action, or null if none */
	get pendingAction() { return pendingAction; },
	/** Whether there is a pending action waiting to be executed */
	get hasPending() { return pendingAction !== null; },

	/** Stores an action to be executed after vault initialization */
	setPendingAction(action: DeepLinkAction) {
		pendingAction = action;
	},

	/**
	 * Returns and clears the pending action.
	 * Returns null if no action is pending.
	 */
	consumePendingAction(): DeepLinkAction | null {
		const action = pendingAction;
		pendingAction = null;
		return action;
	},

	/** Clears all deep-link state */
	reset() {
		pendingAction = null;
	},
};
