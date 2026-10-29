import { registerKeybinding } from '#lib/utils/keybindings.js';
import {
	saveCurrentFile,
	closeActiveTab,
	switchToNextTab,
	switchToPreviousTab,
	toggleSourceMode,
} from '#lib/core/editor/editor.service.js';
import { quickSwitcherStore } from '#lib/features/quick-switcher/quick-switcher.store.svelte.js';
import { searchStore } from '#lib/features/search/search.store.svelte.js';
import { toggleGraphTab } from '#lib/plugins/graph-view/graph-view.service.js';
import { toggleTasksTab } from '#lib/features/tasks/tasks.service.js';
import { toggleEventCalendarTab } from '#lib/features/event-calendar/event-calendar.service.js';
import { commandPaletteStore } from '#lib/features/command-palette/command-palette.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { settingsPanelStore } from '#lib/core/settings/settings-panel.store.svelte.js';
import { createNoteComposer } from '#lib/plugins/quick-capture/note-composer.service.js';
import { openOneOnOnePicker } from '#lib/plugins/one-on-one/one-on-one.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { openFileHistory } from '#lib/features/file-history/file-history.service.js';
import { cycleSidebarMode, toggleRightSidebar } from '#lib/core/layout/layout.service.js';
import { keybindingsEqual, matchesKeybinding, TOGGLE_CALENDAR_KEYBINDING } from '#lib/core/keybindings/keybindings.logic.js';
import { zoomIn, zoomOut, resetZoom } from '#lib/core/zoom/zoom.service.js';
import { error } from '#lib/utils/debug.js';

/**
 * Registers the customizable "cycle sidebar view" shortcut as a dedicated
 * listener that reads its binding from settings on every keypress. This makes
 * edits in the Keybindings settings section take effect immediately, without
 * re-registering the binding or restarting the app.
 * Returns a cleanup function that removes the listener.
 */
function registerCycleSidebarKeybinding(): () => void {
	function onKeyDown(e: KeyboardEvent) {
		if (matchesKeybinding(e, settingsStore.keybindings.cycleSidebarView)) {
			e.preventDefault();
			cycleSidebarMode();
		}
	}
	document.addEventListener('keydown', onKeyDown);
	return () => document.removeEventListener('keydown', onKeyDown);
}

/**
 * Registers all app-wide keyboard shortcuts.
 * Returns a cleanup function that unregisters every binding.
 */
export function registerGlobalKeybindings(): () => void {
	const cleanups = [
		registerKeybinding({
			key: 'p',
			meta: true,
			handler: () => commandPaletteStore.toggle(),
		}),
		registerKeybinding({
			key: 'o',
			meta: true,
			handler: () => quickSwitcherStore.toggle(),
		}),
		registerKeybinding({
			key: 's',
			meta: true,
			handler: () => saveCurrentFile(),
		}),
		registerKeybinding({
			key: 'w',
			meta: true,
			handler: () => closeActiveTab(),
		}),
		registerKeybinding({
			code: 'BracketLeft',
			meta: true,
			shift: true,
			handler: () => switchToPreviousTab(),
		}),
		registerKeybinding({
			code: 'BracketRight',
			meta: true,
			shift: true,
			handler: () => switchToNextTab(),
		}),
		registerKeybinding({
			key: 'f',
			meta: true,
			shift: true,
			handler: () => searchStore.toggle(),
		}),
		registerKeybinding({
			key: 'g',
			meta: true,
			handler: () => {
				toggleGraphTab();
			},
		}),
		registerKeybinding({
			key: 't',
			meta: true,
			shift: true,
			handler: () => {
				toggleTasksTab();
			},
		}),
		// Calendar tab. A user's cycleSidebarView binding on the same combo wins:
		// the settings recorder saves conflicting combos, and its dynamic
		// listener below handles the key too. registerKeybinding has already
		// matched Cmd+Shift+C exactly, so comparing the configs is the same
		// test as matchesKeybinding(e, cycleSidebarView).
		registerKeybinding({
			key: TOGGLE_CALENDAR_KEYBINDING.key,
			meta: true,
			shift: true,
			handler: () => {
				if (keybindingsEqual(settingsStore.keybindings.cycleSidebarView, TOGGLE_CALENDAR_KEYBINDING)) return;
				toggleEventCalendarTab();
			},
		}),
		registerKeybinding({
			key: 'b',
			meta: true,
			shift: true,
			handler: () => {
				const current = settingsStore.layout.leftSidebarVisible;
				settingsStore.updateLayout({ leftSidebarVisible: !current });
			},
		}),
		registerKeybinding({
			key: 'b',
			meta: true,
			handler: toggleRightSidebar,
		}),
		registerKeybinding({
			key: 'n',
			meta: true,
			handler: () => { createNoteComposer().catch((err) => error('KEYBINDINGS', 'createNoteComposer failed:', err)); },
		}),
		registerKeybinding({
			key: 'n',
			meta: true,
			shift: true,
			handler: () => { openOneOnOnePicker().catch((err) => error('KEYBINDINGS', 'openOneOnOnePicker failed:', err)); },
		}),
		registerKeybinding({
			code: 'Comma',
			meta: true,
			handler: () => { settingsPanelStore.toggle(); },
		}),
		registerKeybinding({
			key: 'h',
			meta: true,
			shift: true,
			handler: () => {
				const path = editorStore.activeTabPath;
				if (path) openFileHistory(path);
			},
		}),
		// Zoom: Cmd+= or Cmd+Shift+= (Cmd++)
		registerKeybinding({ key: '=', meta: true, handler: () => { zoomIn().catch((err) => error('KEYBINDINGS', 'zoomIn failed:', err)); } }),
		registerKeybinding({ key: '+', meta: true, shift: true, handler: () => { zoomIn().catch((err) => error('KEYBINDINGS', 'zoomIn failed:', err)); } }),
		registerKeybinding({ key: '-', meta: true, handler: () => { zoomOut().catch((err) => error('KEYBINDINGS', 'zoomOut failed:', err)); } }),
		registerKeybinding({ key: '0', meta: true, handler: () => { resetZoom().catch((err) => error('KEYBINDINGS', 'resetZoom failed:', err)); } }),
		registerKeybinding({
			key: 'k',
			meta: true,
			handler: () => toggleSourceMode(),
		}),
		// Cycle Sidebar View — user-customizable, registered as a dynamic
		// listener so settings changes apply live (default: Cmd+Shift+E).
		registerCycleSidebarKeybinding(),
	];

	return () => cleanups.forEach((cleanup) => cleanup());
}
