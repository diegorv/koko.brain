import { registerKeybinding } from '#lib/utils/keybindings.js';
import {
	saveCurrentFile,
	closeActiveTab,
	switchToNextTab,
	switchToPreviousTab,
	toggleSourceMode,
} from '#lib/core/editor/editor.service.js';
import { quickSwitcherStore } from '#lib/features/quick-switcher/quick-switcher.store.svelte.js';
import { openSearch } from '#lib/features/search/open-search.service.js';
import { isTypingTarget } from '#lib/features/event-calendar/event-calendar-keys.logic.js';
import { toggleGraphTab } from '#lib/plugins/graph-view/graph-view.service.js';
import { toggleTasksTab } from '#lib/features/tasks/tasks.service.js';
import { toggleEventCalendarTab } from '#lib/features/event-calendar/event-calendar.service.js';
import { commandPaletteStore } from '#lib/features/command-palette/command-palette.store.svelte.js';
import { settingsPanelStore } from '#lib/core/settings/settings-panel.store.svelte.js';
import { createNoteComposer } from '#lib/plugins/quick-capture/note-composer.service.js';
import { openOneOnOnePicker } from '#lib/plugins/one-on-one/one-on-one.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { openFileHistory } from '#lib/features/file-history/file-history.service.js';
import {
	hideRailPanels,
	showRailPanels,
	toggleLeftSidebar,
	toggleRightSidebar,
} from '#lib/core/layout/layout.service.js';
import { zoomIn, zoomOut, resetZoom } from '#lib/core/zoom/zoom.service.js';
import { toggleActiveNoteFavorite, toggleActiveNoteOrganized } from '#lib/features/properties/lifecycle.service.js';
import { error } from '#lib/utils/debug.js';

/**
 * Registers "/": opens rail Search and focuses its input.
 * A dedicated listener rather than `registerKeybinding`, which would swallow
 * the character everywhere: "/" typed in an input, a textarea or the editor
 * (contenteditable) is left alone, and so is "/" inside a dialog, where it
 * would change the rail item behind the modal. Shift is not checked, so
 * layouts that need it for "/" still match on `e.key`.
 * Returns a cleanup function that removes the listener.
 */
function registerSlashSearchKeybinding(): () => void {
	function onKeyDown(e: KeyboardEvent) {
		if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
		if (isTypingTarget(e.target)) return;
		if (e.target instanceof Element && e.target.closest('[role="dialog"]')) return;
		e.preventDefault();
		openSearch();
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
			handler: () => openSearch(),
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
		registerKeybinding({
			key: 'c',
			meta: true,
			shift: true,
			handler: () => {
				toggleEventCalendarTab();
			},
		}),
		registerKeybinding({
			key: 'b',
			meta: true,
			shift: true,
			handler: toggleLeftSidebar,
		}),
		registerKeybinding({ key: '1', meta: true, handler: hideRailPanels }),
		registerKeybinding({ key: '2', meta: true, handler: showRailPanels }),
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
		// Raw (source mode): matched by code so Cmd+\ works on layouts that
		// print another character for that key.
		registerKeybinding({
			code: 'Backslash',
			meta: true,
			handler: () => toggleSourceMode(),
		}),
		// Cmd+D reaches here from inside the editor because Mod-d is filtered
		// out of CodeMirror's search keymap (editor-extensions.ts).
		registerKeybinding({
			key: 'd',
			meta: true,
			handler: () => { toggleActiveNoteFavorite().catch((err) => error('KEYBINDINGS', 'toggleActiveNoteFavorite failed:', err)); },
		}),
		registerKeybinding({
			key: 'e',
			meta: true,
			handler: () => { toggleActiveNoteOrganized().catch((err) => error('KEYBINDINGS', 'toggleActiveNoteOrganized failed:', err)); },
		}),
		registerSlashSearchKeybinding(),
	];

	return () => cleanups.forEach((cleanup) => cleanup());
}
