/**
 * Whether the mobile sidebar drawer (file explorer / search) is open. Not
 * persisted on purpose: the vault's `layout.leftSidebarVisible` setting is
 * shared with desktop through sync and describes the desktop pane, while the
 * drawer is transient UI that should always start closed on launch.
 */
let drawerOpen = $state(false);

/**
 * Reactive state for the touch layout used on iOS / iPadOS: a full-width
 * editor with the sidebar sliding in as an overlay drawer.
 */
export const mobileLayoutStore = {
	/** True while the sidebar drawer covers the editor. */
	get drawerOpen() { return drawerOpen; },

	/** Shows the sidebar drawer. */
	openDrawer() {
		drawerOpen = true;
	},

	/** Hides the sidebar drawer (no-op when already closed). */
	closeDrawer() {
		drawerOpen = false;
	},

	/** Flips the drawer between open and closed. */
	toggleDrawer() {
		drawerOpen = !drawerOpen;
	},

	/** @internal Resets to the launch state (for testing only). */
	_reset() {
		drawerOpen = false;
	},
};
