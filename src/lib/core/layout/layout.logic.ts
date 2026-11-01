import { EVENT_CALENDAR_VIRTUAL_PATH, TASKS_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';

/** Virtual tabs where the right sidebar (properties, outline, backlinks) has nothing to show. */
const NO_RIGHT_SIDEBAR_PATHS: ReadonlySet<string> = new Set([EVENT_CALENDAR_VIRTUAL_PATH, TASKS_VIRTUAL_PATH]);

/** Whether the tab at `activeTabPath` always hides the right sidebar. */
export function hidesRightSidebar(activeTabPath: string | null): boolean {
	return activeTabPath !== null && NO_RIGHT_SIDEBAR_PATHS.has(activeTabPath);
}

/**
 * Whether the right sidebar renders. The Calendar and Tasks tabs hide it without touching
 * the persisted setting, so a note tab shows it again as the user left it.
 * @param visible - the persisted `layout.rightSidebarVisible` setting
 * @param activeTabPath - path of the active editor tab, or `null` when none is open
 */
export function isRightSidebarShown(visible: boolean, activeTabPath: string | null): boolean {
	return visible && !hidesRightSidebar(activeTabPath);
}
