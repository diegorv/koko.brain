import type { SidebarMode } from '#lib/core/settings/settings.types.js';
import { EVENT_CALENDAR_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';

/** Cycle order for the left-sidebar views. */
const SIDEBAR_MODE_CYCLE: SidebarMode[] = ['files', 'types', 'calendar'];

/**
 * Returns the next sidebar mode in the files -> types -> calendar cycle.
 * Unknown modes fall back to 'files' (indexOf -1 + 1 = 0).
 */
export function nextSidebarMode(mode: SidebarMode): SidebarMode {
	const index = SIDEBAR_MODE_CYCLE.indexOf(mode);
	return SIDEBAR_MODE_CYCLE[(index + 1) % SIDEBAR_MODE_CYCLE.length];
}

/**
 * Whether the right sidebar renders. The Calendar tab hides it without touching
 * the persisted setting, so a note tab shows it again as the user left it.
 * @param visible - the persisted `layout.rightSidebarVisible` setting
 * @param activeTabPath - path of the active editor tab, or `null` when none is open
 */
export function isRightSidebarShown(visible: boolean, activeTabPath: string | null): boolean {
	return visible && activeTabPath !== EVENT_CALENDAR_VIRTUAL_PATH;
}
