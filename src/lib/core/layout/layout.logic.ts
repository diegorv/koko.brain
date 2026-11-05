import {
	EVENT_CALENDAR_VIRTUAL_PATH,
	getFileName,
	GRAPH_VIRTUAL_PATH,
	TAGS_VIRTUAL_PATH,
	TASKS_VIRTUAL_PATH,
} from '#lib/core/editor/editor.logic.js';
import {
	isCanvasFile,
	isCollectionFile,
	isKanbanFile,
	isViewFile,
} from '#lib/core/filesystem/fs.logic.js';

/** Virtual tabs where the right sidebar (properties, outline, backlinks) has nothing to show. */
const NO_RIGHT_SIDEBAR_PATHS: ReadonlySet<string> = new Set([
	EVENT_CALENDAR_VIRTUAL_PATH,
	TASKS_VIRTUAL_PATH,
	TAGS_VIRTUAL_PATH,
	GRAPH_VIRTUAL_PATH,
]);

/** Whether the tab at `activeTabPath` always hides the right sidebar: every panel in it covers notes only. */
export function hidesRightSidebar(activeTabPath: string | null): boolean {
	if (activeTabPath === null) return false;
	if (NO_RIGHT_SIDEBAR_PATHS.has(activeTabPath)) return true;
	const name = getFileName(activeTabPath);
	return isCanvasFile(name) || isCollectionFile(name) || isViewFile(name) || isKanbanFile(name);
}

/**
 * Whether the right sidebar renders. The tabs `hidesRightSidebar` covers hide it without touching
 * the persisted setting, so a note tab shows it again as the user left it.
 * @param visible - the persisted `layout.rightSidebarVisible` setting
 * @param activeTabPath - path of the active editor tab, or `null` when none is open
 */
export function isRightSidebarShown(visible: boolean, activeTabPath: string | null): boolean {
	return visible && !hidesRightSidebar(activeTabPath);
}
