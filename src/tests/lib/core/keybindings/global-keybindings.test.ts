// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/utils/keybindings', () => ({
	registerKeybinding: vi.fn(() => vi.fn()),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	saveCurrentFile: vi.fn(),
	closeActiveTab: vi.fn(),
	switchToNextTab: vi.fn(),
	switchToPreviousTab: vi.fn(),
}));

vi.mock('$lib/features/quick-switcher/quick-switcher.store.svelte', () => ({
	quickSwitcherStore: { toggle: vi.fn() },
}));

vi.mock('$lib/features/search/search.store.svelte', () => ({
	searchStore: { toggle: vi.fn() },
}));

vi.mock('$lib/plugins/graph-view/graph-view.service', () => ({
	toggleGraphTab: vi.fn(),
}));

vi.mock('$lib/features/tasks/tasks.service', () => ({
	toggleTasksTab: vi.fn(),
}));

vi.mock('$lib/features/command-palette/command-palette.store.svelte', () => ({
	commandPaletteStore: { toggle: vi.fn() },
}));

vi.mock('$lib/core/settings/settings.store.svelte', () => ({
	settingsStore: {
		layout: { rightSidebarVisible: true },
		updateLayout: vi.fn(),
	},
}));

vi.mock('$lib/core/settings/settings-dialog.store.svelte', () => ({
	settingsDialogStore: { toggle: vi.fn() },
}));

vi.mock('$lib/core/settings/settings.service', () => ({
	saveSettings: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/core/vault/vault.store.svelte', () => ({
	vaultStore: { path: '/vault' },
}));

vi.mock('$lib/plugins/quick-note/quick-note.service', () => ({
	createQuickNote: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/plugins/one-on-one/one-on-one.service', () => ({
	openOneOnOnePicker: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/plugins/terminal/terminal.service', () => ({
	toggleTerminal: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/core/editor/editor.store.svelte', () => ({
	editorStore: { activeTabPath: '/vault/note.md' },
}));

vi.mock('$lib/features/file-history/file-history.service', () => ({
	openFileHistory: vi.fn(),
}));

vi.mock('$lib/core/zoom/zoom.service', () => ({
	zoomIn: vi.fn(() => Promise.resolve()),
	zoomOut: vi.fn(() => Promise.resolve()),
	resetZoom: vi.fn(() => Promise.resolve()),
}));

import { registerKeybinding } from '$lib/utils/keybindings';
import { registerGlobalKeybindings } from '$lib/core/keybindings/global-keybindings';
import { saveCurrentFile, closeActiveTab, switchToNextTab, switchToPreviousTab } from '$lib/core/editor/editor.service';
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

/** Finds the handler registered with a specific key combo. */
function findHandler(match: Partial<{ key: string; code: string; meta: boolean; shift: boolean }>): () => void {
	const calls = vi.mocked(registerKeybinding).mock.calls;
	const found = calls.find(([binding]) => {
		if (match.key !== undefined && binding.key !== match.key) return false;
		if (match.code !== undefined && binding.code !== match.code) return false;
		if (match.meta !== undefined && binding.meta !== match.meta) return false;
		if (match.shift !== undefined && binding.shift !== match.shift) return false;
		return true;
	});
	if (!found) throw new Error(`No handler found for ${JSON.stringify(match)}`);
	return found[0].handler;
}

describe('registerGlobalKeybindings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('registers all 19 global keybindings', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledTimes(19);
	});

	it('registers Cmd+P for command palette', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'p', meta: true }),
		);
	});

	it('registers Cmd+O for quick switcher', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'o', meta: true }),
		);
	});

	it('registers Cmd+S for save', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: 's', meta: true }),
		);
	});

	it('registers Cmd+W for close tab', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'w', meta: true }),
		);
	});

	it('registers Cmd+Shift+[ for previous tab', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ code: 'BracketLeft', meta: true, shift: true }),
		);
	});

	it('registers Cmd+Shift+] for next tab', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ code: 'BracketRight', meta: true, shift: true }),
		);
	});

	it('registers Cmd+Shift+F for search', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'f', meta: true, shift: true }),
		);
	});

	it('registers Cmd+G for graph view', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'g', meta: true }),
		);
	});

	it('registers Cmd+Shift+T for tasks', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: 't', meta: true, shift: true }),
		);
	});

	it('registers Cmd+B for right sidebar toggle', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'b', meta: true }),
		);
	});

	it('registers Cmd+N for quick note', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'n', meta: true }),
		);
	});

	it('registers Cmd+Shift+N for 1:1 note picker', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'n', meta: true, shift: true }),
		);
	});

	it('registers Cmd+, for settings', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ code: 'Comma', meta: true }),
		);
	});

	it('registers Cmd+` for terminal', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ code: 'Backquote', meta: true }),
		);
	});

	it('registers Cmd+Shift+H for file history', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'h', meta: true, shift: true }),
		);
	});

	it('returns a cleanup function that calls all individual cleanups', () => {
		const cleanupFns = Array.from({ length: 19 }, () => vi.fn());
		cleanupFns.forEach((fn) => {
			vi.mocked(registerKeybinding).mockReturnValueOnce(fn);
		});

		const cleanup = registerGlobalKeybindings();
		cleanup();

		for (const fn of cleanupFns) {
			expect(fn).toHaveBeenCalledTimes(1);
		}
	});

	describe('handler behavior', () => {
		it('Cmd+P handler calls commandPaletteStore.toggle', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'p', meta: true });

			handler();

			expect(commandPaletteStore.toggle).toHaveBeenCalledTimes(1);
		});

		it('Cmd+O handler calls quickSwitcherStore.toggle', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'o', meta: true });

			handler();

			expect(quickSwitcherStore.toggle).toHaveBeenCalledTimes(1);
		});

		it('Cmd+S handler calls saveCurrentFile', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 's', meta: true });

			handler();

			expect(saveCurrentFile).toHaveBeenCalledTimes(1);
		});

		it('Cmd+W handler calls closeActiveTab', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'w', meta: true });

			handler();

			expect(closeActiveTab).toHaveBeenCalledTimes(1);
		});

		it('Cmd+Shift+[ handler calls switchToPreviousTab', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ code: 'BracketLeft', meta: true, shift: true });

			handler();

			expect(switchToPreviousTab).toHaveBeenCalledTimes(1);
		});

		it('Cmd+Shift+] handler calls switchToNextTab', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ code: 'BracketRight', meta: true, shift: true });

			handler();

			expect(switchToNextTab).toHaveBeenCalledTimes(1);
		});

		it('Cmd+Shift+F handler calls searchStore.toggle', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'f', meta: true, shift: true });

			handler();

			expect(searchStore.toggle).toHaveBeenCalledTimes(1);
		});

		it('Cmd+G handler calls toggleGraphTab', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'g', meta: true });

			handler();

			expect(toggleGraphTab).toHaveBeenCalledTimes(1);
		});

		it('Cmd+Shift+T handler calls toggleTasksTab', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 't', meta: true, shift: true });

			handler();

			expect(toggleTasksTab).toHaveBeenCalledTimes(1);
		});

		it('Cmd+B handler toggles right sidebar and saves settings', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'b', meta: true });

			handler();

			expect(settingsStore.updateLayout).toHaveBeenCalledWith({ rightSidebarVisible: false });
			expect(saveSettings).toHaveBeenCalledWith('/vault');
		});

		it('Cmd+B handler does not save settings when vault path is null', () => {
			(vaultStore as any).path = null;
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'b', meta: true });

			handler();

			expect(settingsStore.updateLayout).toHaveBeenCalledTimes(1);
			expect(saveSettings).not.toHaveBeenCalled();

			(vaultStore as any).path = '/vault';
		});

		it('Cmd+N handler calls createQuickNote', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'n', meta: true, shift: undefined });

			handler();

			expect(createQuickNote).toHaveBeenCalledTimes(1);
		});

		it('Cmd+Shift+N handler calls openOneOnOnePicker', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'n', meta: true, shift: true });

			handler();

			expect(openOneOnOnePicker).toHaveBeenCalledTimes(1);
		});

		it('Cmd+, handler calls settingsDialogStore.toggle', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ code: 'Comma', meta: true });

			handler();

			expect(settingsDialogStore.toggle).toHaveBeenCalledTimes(1);
		});

		it('Cmd+` handler calls toggleTerminal', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ code: 'Backquote', meta: true });

			handler();

			expect(toggleTerminal).toHaveBeenCalledTimes(1);
		});

		it('Cmd+Shift+H handler calls openFileHistory with active tab path', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'h', meta: true, shift: true });

			handler();

			expect(openFileHistory).toHaveBeenCalledWith('/vault/note.md');
		});

		it('Cmd+Shift+H handler does nothing when no active tab', () => {
			(editorStore as any).activeTabPath = null;
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'h', meta: true, shift: true });

			handler();

			expect(openFileHistory).not.toHaveBeenCalled();

			(editorStore as any).activeTabPath = '/vault/note.md';
		});

		it('Cmd+= handler calls zoomIn', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: '=', meta: true });

			handler();

			expect(zoomIn).toHaveBeenCalledTimes(1);
		});

		it('Cmd+Shift+= (Cmd++) handler calls zoomIn', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: '+', meta: true, shift: true });

			handler();

			expect(zoomIn).toHaveBeenCalledTimes(1);
		});

		it('Cmd+- handler calls zoomOut', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: '-', meta: true });

			handler();

			expect(zoomOut).toHaveBeenCalledTimes(1);
		});

		it('Cmd+0 handler calls resetZoom', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: '0', meta: true });

			handler();

			expect(resetZoom).toHaveBeenCalledTimes(1);
		});
	});
});
