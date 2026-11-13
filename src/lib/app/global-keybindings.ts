import { registerKeybinding, type KeyBinding, type KeyCombo } from '#lib/utils/keybindings.js';
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

/** A global binding, optionally tied to the palette command it is the shortcut of. */
interface GlobalKeybinding extends KeyBinding {
	/** Id of the palette command (`commands.ts`) whose label shows this shortcut. */
	command?: string;
}

/**
 * Every app-wide shortcut. The command palette reads its shortcut labels from
 * here through `shortcutFor`, so a shortcut is declared once.
 */
const GLOBAL_KEYBINDINGS: readonly GlobalKeybinding[] = [
	{
		key: 'p',
		meta: true,
		handler: () => commandPaletteStore.toggle(),
	},
	{
		command: 'quick-switcher:open',
		key: 'o',
		meta: true,
		handler: () => quickSwitcherStore.toggle(),
	},
	{
		command: 'editor:save-file',
		key: 's',
		meta: true,
		handler: () => saveCurrentFile(),
	},
	{
		command: 'editor:close-tab',
		key: 'w',
		meta: true,
		handler: () => closeActiveTab(),
	},
	{
		command: 'editor:previous-tab',
		code: 'BracketLeft',
		meta: true,
		shift: true,
		handler: () => switchToPreviousTab(),
	},
	{
		command: 'editor:next-tab',
		code: 'BracketRight',
		meta: true,
		shift: true,
		handler: () => switchToNextTab(),
	},
	{
		command: 'search:toggle',
		key: 'f',
		meta: true,
		shift: true,
		handler: () => openSearch(),
	},
	{
		command: 'graph-view:toggle',
		key: 'g',
		meta: true,
		handler: () => {
			toggleGraphTab();
		},
	},
	{
		command: 'tasks:toggle',
		key: 't',
		meta: true,
		shift: true,
		handler: () => {
			toggleTasksTab();
		},
	},
	{
		command: 'event-calendar:toggle',
		key: 'c',
		meta: true,
		shift: true,
		handler: () => {
			toggleEventCalendarTab();
		},
	},
	{
		command: 'layout:toggle-left-sidebar',
		key: 'b',
		meta: true,
		shift: true,
		handler: toggleLeftSidebar,
	},
	{ command: 'layout:hide-rail-panels', key: '1', meta: true, handler: hideRailPanels },
	{ command: 'layout:show-rail-panels', key: '2', meta: true, handler: showRailPanels },
	{
		command: 'layout:toggle-right-sidebar',
		key: 'b',
		meta: true,
		handler: toggleRightSidebar,
	},
	{
		command: 'quick-capture:create-note',
		key: 'n',
		meta: true,
		handler: () => { createNoteComposer().catch((err) => error('KEYBINDINGS', 'createNoteComposer failed:', err)); },
	},
	{
		command: 'one-on-one:create',
		key: 'n',
		meta: true,
		shift: true,
		handler: () => { openOneOnOnePicker().catch((err) => error('KEYBINDINGS', 'openOneOnOnePicker failed:', err)); },
	},
	{
		command: 'settings:open',
		code: 'Comma',
		meta: true,
		handler: () => { settingsPanelStore.toggle(); },
	},
	{
		command: 'file-history:open',
		key: 'h',
		meta: true,
		shift: true,
		handler: () => {
			const path = editorStore.activeTabPath;
			if (path) openFileHistory(path);
		},
	},
	// Zoom: Cmd+= or Cmd+Shift+= (Cmd++)
	{ key: '=', meta: true, handler: () => { zoomIn().catch((err) => error('KEYBINDINGS', 'zoomIn failed:', err)); } },
	{ key: '+', meta: true, shift: true, handler: () => { zoomIn().catch((err) => error('KEYBINDINGS', 'zoomIn failed:', err)); } },
	{ key: '-', meta: true, handler: () => { zoomOut().catch((err) => error('KEYBINDINGS', 'zoomOut failed:', err)); } },
	{ key: '0', meta: true, handler: () => { resetZoom().catch((err) => error('KEYBINDINGS', 'resetZoom failed:', err)); } },
	// Raw (source mode): matched by code so Cmd+\ works on layouts that
	// print another character for that key.
	{
		code: 'Backslash',
		meta: true,
		handler: () => toggleSourceMode(),
	},
	// Cmd+D reaches here from inside the editor because Mod-d is filtered
	// out of CodeMirror's search keymap (editor-extensions.ts).
	{
		command: 'note:toggle-favorite',
		key: 'd',
		meta: true,
		handler: () => { toggleActiveNoteFavorite().catch((err) => error('KEYBINDINGS', 'toggleActiveNoteFavorite failed:', err)); },
	},
	{
		command: 'note:toggle-organized',
		key: 'e',
		meta: true,
		handler: () => { toggleActiveNoteOrganized().catch((err) => error('KEYBINDINGS', 'toggleActiveNoteOrganized failed:', err)); },
	},
];

/**
 * Returns the key combo bound to a palette command, for its shortcut label.
 * Throws when no binding names the command. The throw happens when the command
 * list is built, and the tests build it, so a typo fails loudly instead of
 * dropping the label.
 */
export function shortcutFor(command: string): KeyCombo {
	const binding = GLOBAL_KEYBINDINGS.find((b) => b.command === command);
	if (!binding) throw new Error(`No global keybinding for command "${command}"`);
	const { handler: _handler, command: _command, ...combo } = binding;
	return combo;
}

/**
 * Registers all app-wide keyboard shortcuts.
 * Returns a cleanup function that unregisters every binding.
 */
export function registerGlobalKeybindings(): () => void {
	const cleanups = [
		...GLOBAL_KEYBINDINGS.map(({ command: _command, ...binding }) => registerKeybinding(binding)),
		registerSlashSearchKeybinding(),
	];

	return () => cleanups.forEach((cleanup) => cleanup());
}
