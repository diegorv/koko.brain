import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { openSearch } from '#lib/features/search/open-search.service.js';
import { SEARCH_RAIL_ITEM, TYPES_RAIL_ITEM, VIEW_LENS_KIND } from '#lib/features/rail-shell/lens.logic.js';
import {
	GRAPH_TAB_RAIL_ITEM,
	TAGS_TAB_RAIL_ITEM,
	TASKS_TAB_RAIL_ITEM,
	type RailItem,
} from '#lib/features/rail-shell/rail-items.logic.js';
import { openTagsTab } from '#lib/features/tags/tags.service.js';
import { openTasksTab } from '#lib/features/tasks/tasks.service.js';
import { openGraphTab } from '#lib/plugins/graph-view/graph-view.service.js';

/**
 * What a click on a rail item does, and the only place that decides it: the
 * rail hands every click here (with the pin, for a pinned item), and so do the
 * palette's Go to commands. Search goes through `openSearch()`; a Tabs item
 * opens or focuses its tab, never closes it, and leaves the layout as it is
 * (the Graph opener is a plugin's, which the rail shell may not import); a
 * pinned view with `_open_in_editor` opens in the editor and leaves the layout
 * as it is; every other item is picked and shows the panels Cmd+1 may have
 * hidden.
 */
export function selectRailItem(item: Pick<RailItem, 'key' | 'pin'>): void {
	switch (item.key) {
		case SEARCH_RAIL_ITEM:
			openSearch();
			return;
		case TASKS_TAB_RAIL_ITEM:
			openTasksTab();
			return;
		case GRAPH_TAB_RAIL_ITEM:
			openGraphTab();
			return;
		case TAGS_TAB_RAIL_ITEM:
			openTagsTab();
			return;
	}
	if (item.pin?.opensInEditor) {
		void openFileInEditor(item.pin.path);
		return;
	}
	settingsStore.updateLayout({ railItem: item.key, railPanelsVisible: true });
}

/**
 * Does what a click on the view's Views row does, for the palette's Open view
 * commands: a view with `_open_in_editor` opens in the editor and leaves the
 * layout as it is; any other view is picked in the Types navigator, which is
 * shown with the panels.
 */
export function openRailView(path: string, opensInEditor: boolean): void {
	if (opensInEditor) {
		void openFileInEditor(path);
		return;
	}
	settingsStore.updateLayout({ railItem: TYPES_RAIL_ITEM, railTypesLens: { kind: VIEW_LENS_KIND, target: path }, railPanelsVisible: true });
}
