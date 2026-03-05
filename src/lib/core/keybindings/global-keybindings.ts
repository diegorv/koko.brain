import { registerKeybinding } from '$lib/utils/keybindings';
import {
	saveCurrentFile,
	closeActiveTab,
	switchToNextTab,
	switchToPreviousTab,
} from '$lib/core/editor/editor.service';
import { quickSwitcherStore } from '$lib/features/quick-switcher/quick-switcher.store.svelte';
import { searchStore } from '$lib/features/search/search.store.svelte';
import { toggleGraphTab } from '$lib/plugins/graph-view/graph-view.service';
import { toggleTasksTab } from '$lib/features/tasks/tasks.service';
import { commandPaletteStore } from '$lib/features/command-palette/command-palette.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { settingsDialogStore } from '$lib/core/settings/settings-dialog.store.svelte';
import { saveSettings } from '$lib/core/settings/settings.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { createQuickNote } from '$lib/plugins/quick-note/quick-note.service';
import { openOneOnOnePicker } from '$lib/plugins/one-on-one/one-on-one.service';
import { toggleTerminal } from '$lib/plugins/terminal/terminal.service';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { openFileHistory } from '$lib/features/file-history/file-history.service';
import { zoomIn, zoomOut, resetZoom } from '$lib/core/zoom/zoom.service';
import { error } from '$lib/utils/debug';

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
		registerKeybinding({
			key: 'b',
			meta: true,
			handler: () => {
				const current = settingsStore.layout.rightSidebarVisible;
				settingsStore.updateLayout({ rightSidebarVisible: !current });
				if (vaultStore.path) saveSettings(vaultStore.path).catch(err => error('SETTINGS', 'Failed to save settings:', err));
			},
		}),
		registerKeybinding({
			key: 'n',
			meta: true,
			handler: () => { createQuickNote().catch(console.error); },
		}),
		registerKeybinding({
			key: 'n',
			meta: true,
			shift: true,
			handler: () => { openOneOnOnePicker().catch(console.error); },
		}),
		registerKeybinding({
			code: 'Comma',
			meta: true,
			handler: () => settingsDialogStore.toggle(),
		}),
		registerKeybinding({
			code: 'Backquote',
			meta: true,
			handler: () => { toggleTerminal().catch(console.error); },
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
		registerKeybinding({ key: '=', meta: true, handler: () => { zoomIn().catch(console.error); } }),
		registerKeybinding({ key: '+', meta: true, shift: true, handler: () => { zoomIn().catch(console.error); } }),
		registerKeybinding({ key: '-', meta: true, handler: () => { zoomOut().catch(console.error); } }),
		registerKeybinding({ key: '0', meta: true, handler: () => { resetZoom().catch(console.error); } }),
	];

	return () => cleanups.forEach((cleanup) => cleanup());
}
