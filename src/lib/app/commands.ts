import { toast } from 'svelte-sonner';
import type { AppCommand } from '#lib/features/command-palette/command-palette.types.js';
import {
	saveCurrentFile,
	closeActiveTab,
	switchToNextTab,
	switchToPreviousTab,
	togglePinActiveTab,
	openFileInEditor,
} from '#lib/core/editor/editor.service.js';
import { createFile, createFolder } from '#lib/core/filesystem/fs.service.js';
import { applyExplicitOrganization } from '#lib/core/note-creator/explicit-organization.logic.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { quickSwitcherStore } from '#lib/features/quick-switcher/quick-switcher.store.svelte.js';
import { openSearch } from '#lib/features/search/open-search.service.js';
import { FILES_RAIL_ITEM, pinnedRailItems } from '#lib/features/rail-shell/lens.logic.js';
import { parseRailHidden, parseRailOrder, railItems } from '#lib/features/rail-shell/rail-items.logic.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { collectViewFiles, getViewLabel, getViewOpensInEditor, getViewVisible } from '#lib/features/type-definitions/type-sidebar.logic.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { toggleGraphTab } from '#lib/plugins/graph-view/graph-view.service.js';
import { createCanvasFile } from '#lib/features/canvas/canvas.service.js';
import { createKanbanFile } from '#lib/plugins/kanban/kanban.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { openOrCreateDailyNote } from '#lib/plugins/periodic-notes/periodic-notes.service.js';
import { openTemplatePicker } from '#lib/plugins/templates/templates.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { COPY_BLOCK_LINK_SHORTCUT } from '#lib/core/markdown-editor/setup/editor-extensions.js';
import { copyBlockLinkToClipboard, copyBlockEmbedToClipboard } from '#lib/features/copy-block-link/copy-block-link.service.js';
import { settingsPanelStore } from '#lib/core/settings/settings-panel.store.svelte.js';
import { toggleTasksTab } from '#lib/features/tasks/tasks.service.js';
import {
	openEventCalendarTab,
	openNewEventDialog,
	redoEventChangeFromUi,
	toggleEventCalendarTab,
	undoEventChangeFromUi,
} from '#lib/features/event-calendar/event-calendar.service.js';
import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
import { toggleTagsTab } from '#lib/features/tags/tags.service.js';
import { syncNowFromUi } from '#lib/features/todoist-sync/sync-now.service.js';
import { checkSyncConnectionFromUi } from '#lib/features/todoist-sync/todoist-sync.service.js';
import { createNoteComposer } from '#lib/plugins/quick-capture/note-composer.service.js';
import { openOneOnOnePicker } from '#lib/plugins/one-on-one/one-on-one.service.js';
import { modCommandsStore } from '#lib/plugins/mods/mod-commands.store.svelte.js';
import { openFileHistory } from '#lib/features/file-history/file-history.service.js';
import { hideRailPanels, showRailPanels, toggleLeftSidebar, toggleRightSidebar } from '#lib/core/layout/layout.service.js';
import { toggleActiveNoteFavorite, toggleActiveNoteOrganized } from '#lib/features/properties/lifecycle.service.js';
import { shortcutFor } from '#lib/app/global-keybindings.js';
import { openRailView, selectRailItem } from '#lib/app/rail-navigation.js';

/**
 * A "Go to <item>" command per rail item, from the same list as the rail, so a
 * hidden item has none. The stores are read here, while the list is built, so
 * the palette's prop expression re-runs when a navigator registers, a pin is
 * added or Settings > Layout hides or moves an item.
 */
function railGoToCommands(): AppCommand[] {
	void typeDefinitionsStore.entriesVersion;
	const pins = pinnedRailItems(typeDefinitionsStore.entries, typeDefinitionsStore.typeMetadataMap);
	const { railHidden, railOrder } = settingsStore.layout;
	return railItems(railRegistryStore.navigators, pins, parseRailHidden(railHidden), parseRailOrder(railOrder)).map((item) => ({
		id: `rail:go-to:${item.key}`,
		label: `Go to ${item.label}`,
		category: 'Navigation',
		action: () => selectRailItem(item),
	}));
}

/**
 * An "Open view" command per `.view` in the tree, except one `_visible: false`
 * hides from Views. A view with no entry yet counts as visible. Built from the
 * tree, read while the list is built, like the Go to commands.
 */
function openViewCommands(): AppCommand[] {
	const entries = typeDefinitionsStore.entriesByPath;
	return collectViewFiles(fsStore.fileTree).filter((view) => getViewVisible(entries.get(view.path))).map((view) => {
		const entry = entries.get(view.path);
		const opensInEditor = getViewOpensInEditor(entry);
		return {
			id: `rail:open-view:${view.path}`,
			label: `Open view: ${getViewLabel(entry, view.name)}`,
			category: 'Navigation',
			action: () => openRailView(view.path, opensInEditor),
		};
	});
}

/**
 * The command palette's built-in commands. Built here, in the composition
 * root, because they call into features and plugins alike. Shortcut labels
 * come from the registrations that bind them (`shortcutFor`, the editor
 * keymap's `COPY_BLOCK_LINK_SHORTCUT`), never from a literal.
 */
export function getBuiltInCommands(): AppCommand[] {
	return [
		{
			id: 'editor:save-file',
			label: 'Save File',
			category: 'Editor',
			shortcut: shortcutFor('editor:save-file'),
			action: () => saveCurrentFile(),
		},
		{
			id: 'editor:close-tab',
			label: 'Close Tab',
			category: 'Editor',
			shortcut: shortcutFor('editor:close-tab'),
			action: () => closeActiveTab(),
		},
		{
			id: 'editor:next-tab',
			label: 'Next Tab',
			category: 'Editor',
			shortcut: shortcutFor('editor:next-tab'),
			action: () => switchToNextTab(),
		},
		{
			id: 'editor:previous-tab',
			label: 'Previous Tab',
			category: 'Editor',
			shortcut: shortcutFor('editor:previous-tab'),
			action: () => switchToPreviousTab(),
		},
		{
			id: 'file-explorer:new-file',
			label: 'New File',
			category: 'File Explorer',
			action: async () => {
				const path = vaultStore.path;
				if (!path) return;
				const filePath = await createFile(path, 'Untitled.md', applyExplicitOrganization('', settingsStore.explicitOrganization));
				await openFileInEditor(filePath);
			},
		},
		{
			id: 'file-explorer:new-folder',
			label: 'New Folder',
			category: 'File Explorer',
			action: async () => {
				const path = vaultStore.path;
				if (!path) return;
				const folderPath = await createFolder(path, 'Untitled');
				settingsStore.updateLayout({ railItem: FILES_RAIL_ITEM, railFolder: folderPath, railPanelsVisible: true });
			},
		},
		{
			id: 'canvas:new',
			label: 'New Canvas',
			category: 'Canvas',
			action: async () => {
				const path = vaultStore.path;
				if (!path) return;
				const filePath = await createCanvasFile(path);
				await openFileInEditor(filePath);
			},
		},
		{
			id: 'kanban:new',
			label: 'New Kanban Board',
			category: 'Kanban',
			action: async () => {
				const path = vaultStore.path;
				if (!path) return;
				const filePath = await createKanbanFile(path);
				await openFileInEditor(filePath);
			},
		},
		{
			id: 'quick-switcher:open',
			label: 'Open Quick Switcher',
			category: 'Navigation',
			shortcut: shortcutFor('quick-switcher:open'),
			action: () => quickSwitcherStore.toggle(),
		},
		{
			id: 'search:toggle',
			label: 'Search in Vault',
			category: 'Navigation',
			shortcut: shortcutFor('search:toggle'),
			action: () => openSearch(),
		},
		{
			id: 'graph-view:toggle',
			label: 'Toggle Graph View',
			category: 'Navigation',
			shortcut: shortcutFor('graph-view:toggle'),
			action: () => {
				toggleGraphTab();
			},
		},
		{
			id: 'tasks:toggle',
			label: 'Toggle Tasks View',
			category: 'Navigation',
			shortcut: shortcutFor('tasks:toggle'),
			action: () => {
				toggleTasksTab();
			},
		},
		{
			id: 'event-calendar:toggle',
			label: 'Toggle Calendar View',
			category: 'Navigation',
			shortcut: shortcutFor('event-calendar:toggle'),
			action: () => {
				toggleEventCalendarTab();
			},
		},
		{
			id: 'event-calendar:new-event',
			label: 'New Calendar Event',
			category: 'Navigation',
			action: () => {
				openNewEventDialog();
			},
		},
		{
			id: 'event-calendar:today',
			label: 'Calendar: Go to Today',
			category: 'Navigation',
			action: () => {
				openEventCalendarTab();
				eventCalendarViewStore.goToToday();
			},
		},
		{
			id: 'event-calendar:undo',
			label: 'Calendar: Undo',
			category: 'Navigation',
			action: () => {
				void undoEventChangeFromUi();
			},
		},
		{
			id: 'event-calendar:redo',
			label: 'Calendar: Redo',
			category: 'Navigation',
			action: () => {
				void redoEventChangeFromUi();
			},
		},
		{
			id: 'todoist:check-sync-connection',
			label: 'Todoist: Check sync connection',
			category: 'Todoist',
			action: () => checkSyncConnectionFromUi(),
		},
		{
			id: 'todoist:sync-now',
			label: 'Todoist: Sync now',
			category: 'Todoist',
			action: () => syncNowFromUi(),
		},
		{
			id: 'tags:toggle',
			label: 'Toggle Tags View',
			category: 'Navigation',
			action: () => {
				toggleTagsTab();
			},
		},
		{
			id: 'layout:toggle-left-sidebar',
			label: 'Toggle Rail Panels',
			category: 'Layout',
			shortcut: shortcutFor('layout:toggle-left-sidebar'),
			action: toggleLeftSidebar,
		},
		{
			id: 'layout:hide-rail-panels',
			label: 'Hide Rail Panels',
			category: 'Layout',
			shortcut: shortcutFor('layout:hide-rail-panels'),
			action: hideRailPanels,
		},
		{
			id: 'layout:show-rail-panels',
			label: 'Show Rail Panels',
			category: 'Layout',
			shortcut: shortcutFor('layout:show-rail-panels'),
			action: showRailPanels,
		},
		{
			id: 'layout:toggle-right-sidebar',
			label: 'Toggle Right Sidebar',
			category: 'Layout',
			shortcut: shortcutFor('layout:toggle-right-sidebar'),
			action: () => toggleRightSidebar(),
		},
		{
			id: 'layout:toggle-table-of-contents',
			label: 'Toggle Table of Contents',
			category: 'Layout',
			action: () => {
				const current = settingsStore.layout.tableOfContentsVisible;
				settingsStore.updateLayout({ tableOfContentsVisible: !current });
			},
		},
		{
			id: 'note:toggle-favorite',
			label: 'Toggle Favorite',
			category: 'Note',
			shortcut: shortcutFor('note:toggle-favorite'),
			action: () => toggleActiveNoteFavorite(),
		},
		{
			id: 'note:toggle-organized',
			label: 'Toggle Organized',
			category: 'Note',
			shortcut: shortcutFor('note:toggle-organized'),
			action: () => toggleActiveNoteOrganized(),
		},
		{
			id: 'editor:toggle-pin-tab',
			label: 'Pin/Unpin Tab',
			category: 'Editor',
			action: () => togglePinActiveTab(),
		},
		{
			id: 'daily-notes:open',
			label: 'Open Daily Note',
			category: 'Daily Notes',
			action: () => openOrCreateDailyNote(),
		},
		{
			id: 'quick-capture:create-note',
			label: 'Create Quick Capture Note',
			category: 'Quick Capture',
			shortcut: shortcutFor('quick-capture:create-note'),
			action: () => createNoteComposer(),
		},
		{
			id: 'one-on-one:create',
			label: 'Create 1:1 Note',
			category: '1:1 Notes',
			shortcut: shortcutFor('one-on-one:create'),
			action: () => openOneOnOnePicker(),
		},
		{
			id: 'templates:new',
			label: 'New File from Template',
			category: 'Templates',
			action: () => openTemplatePicker(),
		},
		{
			id: 'editor:copy-block-link',
			label: 'Copy Block Link',
			category: 'Editor',
			shortcut: COPY_BLOCK_LINK_SHORTCUT,
			action: () => {
				const view = editorStore.editorView;
				if (!view) { toast.error('No file is open.'); return; }
				copyBlockLinkToClipboard(view);
			},
		},
		{
			id: 'editor:copy-block-embed',
			label: 'Copy Block Embed',
			category: 'Editor',
			action: () => {
				const view = editorStore.editorView;
				if (!view) { toast.error('No file is open.'); return; }
				copyBlockEmbedToClipboard(view);
			},
		},
		{
			id: 'settings:open',
			label: 'Open Settings',
			category: 'Settings',
			shortcut: shortcutFor('settings:open'),
			action: () => { settingsPanelStore.toggle(); },
		},
		{
			id: 'file-history:open',
			label: 'View File History',
			category: 'Editor',
			shortcut: shortcutFor('file-history:open'),
			action: () => {
				const path = editorStore.activeTabPath;
				if (!path) { toast.error('No file is open.'); return; }
				openFileHistory(path);
			},
		},
		...railGoToCommands(),
		...openViewCommands(),
		...modCommandsStore.list.filter((command) => command.palette).map((command) => ({
			id: command.id,
			label: command.label,
			category: 'Mod',
			action: command.run,
		})),
	];
}
