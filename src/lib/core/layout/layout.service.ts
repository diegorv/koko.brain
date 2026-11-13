import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { hidesRightSidebar } from './layout.logic';

/**
 * Toggles the panels between the rail and the editor (navigator, note list);
 * the rail itself never hides. Shared by the Cmd+Shift+B keybinding and the
 * "Toggle Rail Panels" command.
 */
export function toggleLeftSidebar(): void {
	settingsStore.updateLayout({ railPanelsVisible: !settingsStore.layout.railPanelsVisible });
}

/** Hides the panels between the rail and the editor (Cmd+1, "Hide Rail Panels"). The rail itself never hides. */
export function hideRailPanels(): void {
	settingsStore.updateLayout({ railPanelsVisible: false });
}

/** Shows the panels between the rail and the editor (Cmd+2, "Show Rail Panels"). */
export function showRailPanels(): void {
	settingsStore.updateLayout({ railPanelsVisible: true });
}

/**
 * Toggles the right sidebar visibility. Shared by the AppShell toggle button,
 * the Cmd+B keybinding and the "Toggle Right Sidebar" command. Does nothing
 * while the active tab is one `hidesRightSidebar` covers: the sidebar is always hidden there, so a
 * toggle would only flip the saved setting out of sight.
 */
export function toggleRightSidebar(): void {
	if (hidesRightSidebar(editorStore.activeTabPath)) return;
	const current = settingsStore.layout.rightSidebarVisible;
	settingsStore.updateLayout({ rightSidebarVisible: !current });
}
