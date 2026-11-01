import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { hidesRightSidebar, nextSidebarMode } from './layout.logic';

/**
 * Advances the left sidebar to the next view (files -> types -> calendar ->
 * files) and reveals the sidebar if it is hidden. Shared by the Cmd+Shift+E
 * keybinding and the "Cycle Sidebar View" command-palette command.
 */
export function cycleSidebarMode(): void {
	const next = nextSidebarMode(settingsStore.layout.sidebarMode);
	settingsStore.updateLayout({ sidebarMode: next, leftSidebarVisible: true });
}

/**
 * Toggles the left side. Shared by the AppShell toggle button, the Cmd+Shift+B
 * keybinding and the "Toggle Left Sidebar" command. The classic shell flips
 * the left sidebar; the rail shell flips the panels between the rail and the
 * editor instead. Each shell keeps its own flag, so switching shells never
 * carries one shell's hidden state into the other.
 */
export function toggleLeftSidebar(): void {
	if (settingsStore.layout.shell === 'rail') {
		settingsStore.updateLayout({ railPanelsVisible: !settingsStore.layout.railPanelsVisible });
		return;
	}
	const current = settingsStore.layout.leftSidebarVisible;
	settingsStore.updateLayout({ leftSidebarVisible: !current });
}

/**
 * Hides the rail shell's panels between the rail and the editor (Cmd+1). The
 * rail itself never hides. Does nothing in the classic shell.
 */
export function hideRailPanels(): void {
	if (settingsStore.layout.shell !== 'rail') return;
	settingsStore.updateLayout({ railPanelsVisible: false });
}

/**
 * Shows the rail shell's panels between the rail and the editor (Cmd+2).
 * Does nothing in the classic shell.
 */
export function showRailPanels(): void {
	if (settingsStore.layout.shell !== 'rail') return;
	settingsStore.updateLayout({ railPanelsVisible: true });
}

/**
 * Toggles the right sidebar visibility. Shared by the AppShell toggle button,
 * the Cmd+B keybinding and the "Toggle Right Sidebar" command. Does nothing
 * while the Calendar or Tasks tab is active: the sidebar is always hidden there, so a
 * toggle would only flip the saved setting out of sight.
 */
export function toggleRightSidebar(): void {
	if (hidesRightSidebar(editorStore.activeTabPath)) return;
	const current = settingsStore.layout.rightSidebarVisible;
	settingsStore.updateLayout({ rightSidebarVisible: !current });
}
