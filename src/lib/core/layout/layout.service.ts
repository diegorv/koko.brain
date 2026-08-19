import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { nextSidebarMode } from './layout.logic';

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
 * Toggles the left sidebar visibility. Shared by the AppShell toggle button
 * so the button persists the layout exactly like the Cmd+Shift+B keybinding.
 */
export function toggleLeftSidebar(): void {
	const current = settingsStore.layout.leftSidebarVisible;
	settingsStore.updateLayout({ leftSidebarVisible: !current });
}

/**
 * Toggles the right sidebar visibility. Shared by the AppShell toggle button
 * so the button persists the layout exactly like the Cmd+B keybinding.
 */
export function toggleRightSidebar(): void {
	const current = settingsStore.layout.rightSidebarVisible;
	settingsStore.updateLayout({ rightSidebarVisible: !current });
}
