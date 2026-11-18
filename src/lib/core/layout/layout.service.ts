import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import type { LayoutSettings } from '#lib/core/settings/settings.types.js';
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

/** Whether the Claude panel shows now: the feature is on, its flag is set and the right sidebar is open. */
function claudePanelOpen(): boolean {
	const { claudeVisible, rightSidebarVisible } = settingsStore.layout;
	return settingsStore.claudeCode.enabled && claudeVisible && rightSidebarVisible;
}

/**
 * Shows the Claude panel, opening the right sidebar it fills. No-op while
 * Claude Code is off.
 */
export function showClaudePanel(): void {
	if (!settingsStore.claudeCode.enabled) return;
	settingsStore.updateLayout({ claudeVisible: true, rightSidebarVisible: true });
}

/**
 * Shows the Claude panel, or hides it when it shows, which brings back the
 * other right sidebar panels. Shared by its command and keybinding. No-op
 * while Claude Code is off, and on the tabs `hidesRightSidebar` covers, like
 * `toggleRightSidebar`.
 */
export function toggleClaudePanel(): void {
	if (!settingsStore.claudeCode.enabled || hidesRightSidebar(editorStore.activeTabPath)) return;
	if (claudePanelOpen()) settingsStore.updateLayout({ claudeVisible: false });
	else showClaudePanel();
}

/** A right sidebar panel with its own `<panel>Visible` layout flag. */
export type RightPanel = 'properties' | 'backlinks' | 'outgoingLinks' | 'tableOfContents';

/**
 * Shows or hides one right sidebar panel. Showing it also shows a hidden
 * sidebar, so the panel turned on is on screen, except on the tabs
 * `hidesRightSidebar` covers, where the sidebar never shows. Hiding it leaves
 * the sidebar alone.
 * @param panel - the panel whose layout flag is written
 * @param visible - the panel's new visibility
 */
export function setRightPanelVisible(panel: RightPanel, visible: boolean): void {
	const patch: Partial<LayoutSettings> = {};
	patch[`${panel}Visible`] = visible;
	if (visible && !hidesRightSidebar(editorStore.activeTabPath)) patch.rightSidebarVisible = true;
	settingsStore.updateLayout(patch);
}

/**
 * Flips one right sidebar panel through `setRightPanelVisible`. Shared by the
 * "Toggle <panel>" palette commands.
 * @param panel - the panel to flip
 */
export function toggleRightPanel(panel: RightPanel): void {
	setRightPanelVisible(panel, !settingsStore.layout[`${panel}Visible`]);
}
