// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// vaultStore persists recent vaults via localStorage; Node's built-in
// localStorage (no backing file) shadows jsdom's, so stub it explicitly.
setupLocalStorage();

vi.mock('$lib/utils/keybindings', () => ({
	registerKeybinding: vi.fn(() => vi.fn()),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	saveCurrentFile: vi.fn(),
	closeActiveTab: vi.fn(),
	switchToNextTab: vi.fn(),
	switchToPreviousTab: vi.fn(),
	toggleSourceMode: vi.fn(),
}));

vi.mock('$lib/plugins/graph-view/graph-view.service', () => ({
	toggleGraphTab: vi.fn(),
}));

vi.mock('$lib/features/tasks/tasks.service', () => ({
	toggleTasksTab: vi.fn(),
}));

// Only the disk boundary is mocked: the persistence assertions below read the
// JSON the settings persistence owner hands to `writeTextFile`.
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(() => Promise.resolve()),
	mkdir: vi.fn(() => Promise.resolve()),
	exists: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('$lib/plugins/quick-capture/note-composer.service', () => ({
	createNoteComposer: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/plugins/one-on-one/one-on-one.service', () => ({
	openOneOnOnePicker: vi.fn(() => Promise.resolve()),
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
import { saveCurrentFile, closeActiveTab, switchToNextTab, switchToPreviousTab, toggleSourceMode } from '$lib/core/editor/editor.service';
import { quickSwitcherStore } from '$lib/features/quick-switcher/quick-switcher.store.svelte';
import { searchStore } from '$lib/features/search/search.store.svelte';
import { toggleGraphTab } from '$lib/plugins/graph-view/graph-view.service';
import { toggleTasksTab } from '$lib/features/tasks/tasks.service';
import { commandPaletteStore } from '$lib/features/command-palette/command-palette.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { settingsPanelStore } from '$lib/core/settings/settings-panel.store.svelte';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import {
	startSettingsPersistence,
	stopSettingsPersistence,
} from '$lib/core/settings/settings-persistence.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { createNoteComposer } from '$lib/plugins/quick-capture/note-composer.service';
import { openOneOnOnePicker } from '$lib/plugins/one-on-one/one-on-one.service';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { openFileHistory } from '$lib/features/file-history/file-history.service';
import { zoomIn, zoomOut, resetZoom } from '$lib/core/zoom/zoom.service';

/**
 * Runs `action` with the settings persistence owner live for `/vault` and
 * returns the settings JSON it wrote once the debounce window elapsed.
 */
async function persistedAfter(action: () => void): Promise<{ layout: Record<string, unknown> }> {
	vi.useFakeTimers();
	startSettingsPersistence('/vault');
	try {
		action();
		await vi.advanceTimersByTimeAsync(0);
		await vi.advanceTimersByTimeAsync(500);
	} finally {
		await stopSettingsPersistence();
		vi.useRealTimers();
	}
	const calls = vi.mocked(writeTextFile).mock.calls;
	expect(calls.length).toBeGreaterThan(0);
	const [path, content] = calls[calls.length - 1];
	expect(path).toBe('/vault/.kokobrain/settings.json');
	return JSON.parse(content as string);
}

/** Finds the handler registered with a specific key combo. */
function findHandler(match: Partial<{ key: string; code: string; meta: boolean; shift: boolean }>): () => void {
	const calls = vi.mocked(registerKeybinding).mock.calls;
	const found = calls.find(([binding]) => {
		if (match.key !== undefined && binding.key !== match.key) return false;
		if (match.code !== undefined && binding.code !== match.code) return false;
		if (match.meta !== undefined && binding.meta !== match.meta) return false;
		if (match.shift !== undefined && !!binding.shift !== !!match.shift) return false;
		return true;
	});
	if (!found) throw new Error(`No handler found for ${JSON.stringify(match)}`);
	return found[0].handler;
}

describe('registerGlobalKeybindings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		// Real stores (CLAUDE.md rule 1) — reset to a known baseline each test.
		quickSwitcherStore.reset();
		searchStore.reset();
		commandPaletteStore.reset();
		settingsStore.reset();
		settingsPanelStore._reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		editorStore.reset();
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
	});

	it('registers all 20 fixed global keybindings via registerKeybinding', () => {
		// The customizable Cycle Sidebar View shortcut is registered as a
		// separate dynamic listener (not through registerKeybinding), so the
		// fixed-binding count is 20.
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledTimes(20);
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

	it('registers Cmd+Shift+H for file history', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'h', meta: true, shift: true }),
		);
	});

	it('registers Cmd+K for source-mode toggle', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'k', meta: true }),
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
		it('Cmd+P handler opens the command palette', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'p', meta: true });

			expect(commandPaletteStore.isOpen).toBe(false);
			handler();
			expect(commandPaletteStore.isOpen).toBe(true);
		});

		it('Cmd+O handler opens the quick switcher', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'o', meta: true });

			expect(quickSwitcherStore.isOpen).toBe(false);
			handler();
			expect(quickSwitcherStore.isOpen).toBe(true);
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

		it('Cmd+Shift+F handler opens search', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'f', meta: true, shift: true });

			expect(searchStore.isOpen).toBe(false);
			handler();
			expect(searchStore.isOpen).toBe(true);
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

		it('Cmd+Shift+B handler toggles left sidebar and persists it', async () => {
			// Real default: leftSidebarVisible = true.
			expect(settingsStore.layout.leftSidebarVisible).toBe(true);
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'b', meta: true, shift: true });

			const written = await persistedAfter(handler);

			expect(settingsStore.layout.leftSidebarVisible).toBe(false);
			expect(written.layout.leftSidebarVisible).toBe(false);
		});

		it('cycle-sidebar dynamic listener cycles the view and reveals a hidden sidebar (default Cmd+Shift+E)', async () => {
			const addSpy = vi.spyOn(document, 'addEventListener');
			settingsStore.updateLayout({ sidebarMode: 'files', leftSidebarVisible: false });
			const cleanup = registerGlobalKeybindings();
			// registerKeybinding is mocked (no real listeners), so the only
			// keydown listener added is the dynamic cycle-sidebar one.
			const keydownCall = addSpy.mock.calls.find(([type]) => type === 'keydown');
			expect(keydownCall).toBeDefined();
			const listener = keydownCall![1] as (e: KeyboardEvent) => void;

			const written = await persistedAfter(() => listener({
				key: 'e',
				metaKey: true,
				shiftKey: true,
				altKey: false,
				ctrlKey: false,
				preventDefault: vi.fn(),
			} as unknown as KeyboardEvent));

			expect(settingsStore.layout.sidebarMode).toBe('types');
			expect(settingsStore.layout.leftSidebarVisible).toBe(true);
			expect(written.layout.sidebarMode).toBe('types');

			cleanup();
			addSpy.mockRestore();
		});

		it('cycle-sidebar dynamic listener respects a customized binding', () => {
			const addSpy = vi.spyOn(document, 'addEventListener');
			settingsStore.updateLayout({ sidebarMode: 'files' });
			settingsStore.updateKeybindings({
				cycleSidebarView: { key: 'l', meta: true, shift: false, alt: true, ctrl: false },
			});
			const cleanup = registerGlobalKeybindings();
			const listener = addSpy.mock.calls.find(([type]) => type === 'keydown')![1] as (e: KeyboardEvent) => void;

			// Old default combo no longer cycles.
			listener({ key: 'e', metaKey: true, shiftKey: true, altKey: false, ctrlKey: false, preventDefault: vi.fn() } as unknown as KeyboardEvent);
			expect(settingsStore.layout.sidebarMode).toBe('files');

			// New combo (Cmd+Alt+L) cycles.
			listener({ key: 'l', metaKey: true, shiftKey: false, altKey: true, ctrlKey: false, preventDefault: vi.fn() } as unknown as KeyboardEvent);
			expect(settingsStore.layout.sidebarMode).toBe('types');

			cleanup();
			addSpy.mockRestore();
		});

		it('Cmd+Shift+B handler toggles layout but persists nothing when no vault is open', () => {
			vaultStore._reset(); // path -> null, so persistence was never started
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'b', meta: true, shift: true });

			handler();

			expect(settingsStore.layout.leftSidebarVisible).toBe(false);
			expect(writeTextFile).not.toHaveBeenCalled();
		});

		it('Cmd+B handler toggles right sidebar and persists it', async () => {
			// Real default: rightSidebarVisible = false -> handler flips it to true.
			expect(settingsStore.layout.rightSidebarVisible).toBe(false);
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'b', meta: true, shift: false });

			const written = await persistedAfter(handler);

			expect(settingsStore.layout.rightSidebarVisible).toBe(true);
			expect(written.layout.rightSidebarVisible).toBe(true);
		});

		it('Cmd+B handler toggles layout but persists nothing when no vault is open', () => {
			vaultStore._reset(); // path -> null, so persistence was never started
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'b', meta: true, shift: false });

			handler();

			expect(settingsStore.layout.rightSidebarVisible).toBe(true);
			expect(writeTextFile).not.toHaveBeenCalled();
		});

		it('Cmd+N handler calls createNoteComposer', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'n', meta: true, shift: undefined });

			handler();

			expect(createNoteComposer).toHaveBeenCalledTimes(1);
		});

		it('Cmd+Shift+N handler calls openOneOnOnePicker', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'n', meta: true, shift: true });

			handler();

			expect(openOneOnOnePicker).toHaveBeenCalledTimes(1);
		});

		it('Cmd+, handler toggles settings panel', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ code: 'Comma', meta: true });

			expect(settingsPanelStore.isOpen).toBe(false);
			handler();
			expect(settingsPanelStore.isOpen).toBe(true);
		});

		it('Cmd+Shift+H handler calls openFileHistory with active tab path', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'h', meta: true, shift: true });

			handler();

			expect(openFileHistory).toHaveBeenCalledWith('/vault/note.md');
		});

		it('Cmd+Shift+H handler does nothing when no active tab', () => {
			editorStore.reset(); // no tabs -> activeTabPath is null
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'h', meta: true, shift: true });

			handler();

			expect(openFileHistory).not.toHaveBeenCalled();
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

		it('Cmd+K handler calls toggleSourceMode', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'k', meta: true });

			handler();

			expect(toggleSourceMode).toHaveBeenCalledTimes(1);
		});

		it('logs via the project logger when createNoteComposer rejects', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			vi.mocked(createNoteComposer).mockRejectedValueOnce(new Error('boom'));
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'n', meta: true, shift: undefined });

			handler();

			await vi.waitFor(() =>
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					expect.stringContaining('KEYBINDINGS'),
					'createNoteComposer failed:',
					expect.any(Error),
				),
			);
			consoleErrorSpy.mockRestore();
		});

		it('logs via the project logger when zoomIn rejects', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			vi.mocked(zoomIn).mockRejectedValueOnce(new Error('boom'));
			registerGlobalKeybindings();
			const handler = findHandler({ key: '=', meta: true });

			handler();

			await vi.waitFor(() =>
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					expect.stringContaining('KEYBINDINGS'),
					'zoomIn failed:',
					expect.any(Error),
				),
			);
			consoleErrorSpy.mockRestore();
		});
	});
});
