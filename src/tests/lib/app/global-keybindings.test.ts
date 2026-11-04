// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

// vaultStore persists recent vaults via localStorage; Node's built-in
// localStorage (no backing file) shadows jsdom's, so stub it explicitly.
setupLocalStorage();

vi.mock('#lib/utils/keybindings.js', () => ({
	registerKeybinding: vi.fn(() => vi.fn()),
}));

vi.mock('#lib/core/editor/editor.service.js', () => ({
	saveCurrentFile: vi.fn(),
	closeActiveTab: vi.fn(),
	switchToNextTab: vi.fn(),
	switchToPreviousTab: vi.fn(),
	toggleSourceMode: vi.fn(),
}));

vi.mock('#lib/plugins/graph-view/graph-view.service.js', () => ({
	toggleGraphTab: vi.fn(),
}));

vi.mock('#lib/features/tasks/tasks.service.js', () => ({
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

vi.mock('#lib/plugins/quick-capture/note-composer.service.js', () => ({
	createNoteComposer: vi.fn(() => Promise.resolve()),
}));

vi.mock('#lib/plugins/one-on-one/one-on-one.service.js', () => ({
	openOneOnOnePicker: vi.fn(() => Promise.resolve()),
}));

vi.mock('#lib/features/file-history/file-history.service.js', () => ({
	openFileHistory: vi.fn(),
}));

// Side-effect service (frontmatter writes to disk); its behavior is covered
// by lifecycle.service.test.ts against the real editor and stores.
vi.mock('#lib/features/properties/lifecycle.service.js', () => ({
	toggleActiveNoteFavorite: vi.fn(() => Promise.resolve()),
	toggleActiveNoteOrganized: vi.fn(() => Promise.resolve()),
}));

vi.mock('#lib/core/zoom/zoom.service.js', () => ({
	zoomIn: vi.fn(() => Promise.resolve()),
	zoomOut: vi.fn(() => Promise.resolve()),
	resetZoom: vi.fn(() => Promise.resolve()),
}));

import { registerKeybinding } from '#lib/utils/keybindings.js';
import { registerGlobalKeybindings, shortcutFor } from '#lib/app/global-keybindings.js';
import { getBuiltInCommands } from '#lib/app/commands.js';
import { COPY_BLOCK_LINK_SHORTCUT } from '#lib/core/markdown-editor/setup/editor-extensions.js';
import type { KeyCombo } from '#lib/utils/keybindings.js';
import { saveCurrentFile, closeActiveTab, switchToNextTab, switchToPreviousTab, toggleSourceMode } from '#lib/core/editor/editor.service.js';
import { quickSwitcherStore } from '#lib/features/quick-switcher/quick-switcher.store.svelte.js';
import { searchStore } from '#lib/features/search/search.store.svelte.js';
import { toggleGraphTab } from '#lib/plugins/graph-view/graph-view.service.js';
import { toggleTasksTab } from '#lib/features/tasks/tasks.service.js';
import { commandPaletteStore } from '#lib/features/command-palette/command-palette.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { settingsPanelStore } from '#lib/core/settings/settings-panel.store.svelte.js';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import {
	startSettingsPersistence,
	stopSettingsPersistence,
} from '#lib/core/settings/settings-persistence.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { createNoteComposer } from '#lib/plugins/quick-capture/note-composer.service.js';
import { openOneOnOnePicker } from '#lib/plugins/one-on-one/one-on-one.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { EVENT_CALENDAR_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import { openFileHistory } from '#lib/features/file-history/file-history.service.js';
import { zoomIn, zoomOut, resetZoom } from '#lib/core/zoom/zoom.service.js';
import { toggleActiveNoteFavorite, toggleActiveNoteOrganized } from '#lib/features/properties/lifecycle.service.js';

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

	it('registers all 25 fixed global keybindings via registerKeybinding', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledTimes(25);
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

	it('registers Cmd+Shift+C for the Calendar tab', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'c', meta: true, shift: true }),
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

	it('registers Cmd+\\ (by key code) for the Raw / source-mode toggle', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ code: 'Backslash', meta: true }),
		);
	});

	it('leaves Cmd+K unbound', () => {
		registerGlobalKeybindings();

		const onK = vi.mocked(registerKeybinding).mock.calls.filter(([b]) => b.key?.toLowerCase() === 'k' || b.code === 'KeyK');
		expect(onK).toEqual([]);
	});

	it('leaves Cmd+Shift+E unbound: no fixed binding, and the "/" listener ignores it', () => {
		const addSpy = vi.spyOn(document, 'addEventListener');
		const cleanup = registerGlobalKeybindings();

		const onShiftE = vi.mocked(registerKeybinding).mock.calls.filter(([b]) => b.key?.toLowerCase() === 'e' && b.shift);
		expect(onShiftE).toEqual([]);
		const keydownListeners = addSpy.mock.calls.filter(([type]) => type === 'keydown').map(([, l]) => l as (e: KeyboardEvent) => void);
		expect(keydownListeners).toHaveLength(1);
		const before = JSON.stringify(settingsStore.layout);
		const e = new KeyboardEvent('keydown', { key: 'e', metaKey: true, shiftKey: true, cancelable: true });
		keydownListeners[0](e);
		expect(e.defaultPrevented).toBe(false);
		expect(JSON.stringify(settingsStore.layout)).toBe(before);

		cleanup();
		addSpy.mockRestore();
	});

	it('registers Cmd+D for Toggle Favorite and Cmd+E for Toggle Organized', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'd', meta: true }),
		);
		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'e', meta: true }),
		);
	});

	it('registers Cmd+1 and Cmd+2 for the rail panels', () => {
		registerGlobalKeybindings();

		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: '1', meta: true }),
		);
		expect(registerKeybinding).toHaveBeenCalledWith(
			expect.objectContaining({ key: '2', meta: true }),
		);
	});

	it('ties Cmd+1 and Cmd+2 to the hide and show rail panels commands', () => {
		expect(shortcutFor('layout:hide-rail-panels')).toEqual({ key: '1', meta: true });
		expect(shortcutFor('layout:show-rail-panels')).toEqual({ key: '2', meta: true });
	});

	it('returns a cleanup function that calls all individual cleanups', () => {
		const cleanupFns = Array.from({ length: 25 }, () => vi.fn());
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
		it('Cmd+D toggles favorite and Cmd+E toggles organized on the active note', () => {
			registerGlobalKeybindings();

			findHandler({ key: 'd', meta: true, shift: false })();
			expect(toggleActiveNoteFavorite).toHaveBeenCalledTimes(1);
			expect(toggleActiveNoteOrganized).not.toHaveBeenCalled();

			findHandler({ key: 'e', meta: true, shift: false })();
			expect(toggleActiveNoteOrganized).toHaveBeenCalledTimes(1);
		});

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

		it('Cmd+Shift+F handler opens rail Search, and a second press keeps it there', () => {
			settingsStore.updateLayout({ railItem: 'inbox', railPanelsVisible: false });
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'f', meta: true, shift: true });

			handler();
			expect(settingsStore.layout.railItem).toBe('search');
			expect(settingsStore.layout.railPanelsVisible).toBe(true);
			handler();
			expect(settingsStore.layout.railItem).toBe('search');
			expect(searchStore.focusRequest).toBe(2);
		});

		describe('"/" listener', () => {
			let slashListener: (e: KeyboardEvent) => void;

			/**
			 * Calls the "/" listener with a real keydown aimed at `el`. Called directly:
			 * earlier tests leave their document listeners registered, so a dispatched
			 * event would reach every one of them.
			 */
			function pressSlash(el: Element, init: KeyboardEventInit = {}): KeyboardEvent {
				const e = new KeyboardEvent('keydown', { key: '/', cancelable: true, ...init });
				Object.defineProperty(e, 'target', { value: el });
				slashListener(e);
				return e;
			}

			/** Registers the bindings and keeps the last keydown listener added: the "/" one. */
			function register(): () => void {
				const addSpy = vi.spyOn(document, 'addEventListener');
				const cleanup = registerGlobalKeybindings();
				const calls = addSpy.mock.calls.filter(([type]) => type === 'keydown');
				slashListener = calls[calls.length - 1][1] as (e: KeyboardEvent) => void;
				addSpy.mockRestore();
				return cleanup;
			}

			beforeEach(() => {
				document.body.innerHTML = '';
				settingsStore.updateLayout({ railItem: 'inbox' });
			});

			it('opens rail Search and asks for focus when focus is on the page', () => {
				register();
				const e = pressSlash(document.body);
				expect(settingsStore.layout.railItem).toBe('search');
				expect(searchStore.focusRequest).toBe(1);
				expect(e.defaultPrevented).toBe(true);
			});

			it('opens rail Search from a focused button (not a text input)', () => {
				const button = document.body.appendChild(document.createElement('button'));
				register();
				pressSlash(button);
				expect(settingsStore.layout.railItem).toBe('search');
			});

			it('matches "/" typed with Shift (layouts that need it)', () => {
				register();
				pressSlash(document.body, { shiftKey: true });
				expect(settingsStore.layout.railItem).toBe('search');
			});

			it('types the character in an input, a textarea or the editor (contenteditable)', () => {
				const input = document.body.appendChild(document.createElement('input'));
				const textarea = document.body.appendChild(document.createElement('textarea'));
				const editor = document.body.appendChild(document.createElement('div'));
				editor.contentEditable = 'true';
				// jsdom does not implement isContentEditable.
				Object.defineProperty(editor, 'isContentEditable', { value: true });
				register();
				for (const el of [input, textarea, editor]) {
					const e = pressSlash(el);
					expect(e.defaultPrevented).toBe(false);
				}
				expect(settingsStore.layout.railItem).toBe('inbox');
				expect(searchStore.focusRequest).toBe(0);
			});

			it('ignores "/" with a modifier held, and other keys', () => {
				register();
				pressSlash(document.body, { metaKey: true });
				pressSlash(document.body, { ctrlKey: true });
				pressSlash(document.body, { altKey: true });
				pressSlash(document.body, { key: '?' });
				expect(settingsStore.layout.railItem).toBe('inbox');
				expect(searchStore.focusRequest).toBe(0);
			});

			it('ignores "/" from inside a dialog (a Settings switch), leaving the rail item behind it', () => {
				const dialog = document.body.appendChild(document.createElement('div'));
				dialog.setAttribute('role', 'dialog');
				const toggle = dialog.appendChild(document.createElement('button'));
				register();
				const e = pressSlash(toggle);
				expect(e.defaultPrevented).toBe(false);
				expect(settingsStore.layout.railItem).toBe('inbox');
				expect(searchStore.focusRequest).toBe(0);
			});

			it('is removed by the cleanup function', () => {
				const removeSpy = vi.spyOn(document, 'removeEventListener');
				const cleanup = register();
				cleanup();
				expect(removeSpy).toHaveBeenCalledWith('keydown', slashListener);
				removeSpy.mockRestore();
			});
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

		it('Cmd+Shift+C handler opens the Calendar tab, and a second press closes it', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'c', meta: true, shift: true });

			handler();

			expect(editorStore.activeTab?.path).toBe(EVENT_CALENDAR_VIRTUAL_PATH);
			expect(editorStore.activeTab?.fileType).toBe('event-calendar');

			handler();

			expect(editorStore.tabs.some((t) => t.path === EVENT_CALENDAR_VIRTUAL_PATH)).toBe(false);
			expect(editorStore.activeTab?.path).toBe('/vault/note.md');
		});

		it('Cmd+Shift+B handler toggles the rail panels and persists it', async () => {
			// Real default: railPanelsVisible = true.
			expect(settingsStore.layout.railPanelsVisible).toBe(true);
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'b', meta: true, shift: true });

			const written = await persistedAfter(handler);

			expect(settingsStore.layout.railPanelsVisible).toBe(false);
			expect(written.layout.railPanelsVisible).toBe(false);

			handler();
			expect(settingsStore.layout.railPanelsVisible).toBe(true);
		});

		it('Cmd+1 hides and Cmd+2 shows the rail panels, and both persist', async () => {
			registerGlobalKeybindings();

			const hidden = await persistedAfter(findHandler({ key: '1', meta: true, shift: false }));
			expect(settingsStore.layout.railPanelsVisible).toBe(false);
			expect(hidden.layout.railPanelsVisible).toBe(false);

			const shown = await persistedAfter(findHandler({ key: '2', meta: true, shift: false }));
			expect(settingsStore.layout.railPanelsVisible).toBe(true);
			expect(shown.layout.railPanelsVisible).toBe(true);
		});

		it('Cmd+Shift+B handler toggles layout but persists nothing when no vault is open', () => {
			vaultStore._reset(); // path -> null, so persistence was never started
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'b', meta: true, shift: true });

			handler();

			expect(settingsStore.layout.railPanelsVisible).toBe(false);
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

		it('Cmd+B handler does nothing while the Calendar tab is active', () => {
			editorStore.addTab({ path: EVENT_CALENDAR_VIRTUAL_PATH, name: 'Calendar', content: '', savedContent: '', fileType: 'event-calendar' });
			registerGlobalKeybindings();
			const handler = findHandler({ key: 'b', meta: true, shift: false });

			handler();

			expect(settingsStore.layout.rightSidebarVisible).toBe(false);
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

		it('Cmd+\\ handler calls toggleSourceMode', () => {
			registerGlobalKeybindings();
			const handler = findHandler({ code: 'Backslash', meta: true });

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

/** One string per combo, so a `{ meta: true, key: 's' }` equals `{ key: 's', meta: true, shift: false }`. */
function comboId(combo: KeyCombo): string {
	return JSON.stringify([combo.key?.toLowerCase() ?? null, combo.code ?? null, !!combo.meta, !!combo.shift, !!combo.alt, !!combo.ctrl]);
}

describe('palette shortcut labels', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('every shortcut the palette shows is bound by a registration', () => {
		registerGlobalKeybindings();
		const bound = new Set(vi.mocked(registerKeybinding).mock.calls.map(([binding]) => comboId(binding)));
		// Bound in the editor keymap, not globally (editor-extensions.test.ts runs it).
		bound.add(comboId(COPY_BLOCK_LINK_SHORTCUT));

		const shown = getBuiltInCommands().filter((c) => c.shortcut);
		expect(shown.length).toBeGreaterThan(0);
		for (const command of shown) {
			expect(bound.has(comboId(command.shortcut!)), `${command.id} shows a shortcut no registration binds`).toBe(true);
		}
	});

	it('shortcutFor returns the combo of the binding that names the command, without its handler', () => {
		expect(shortcutFor('one-on-one:create')).toEqual({ key: 'n', meta: true, shift: true });
		expect(shortcutFor('settings:open')).toEqual({ code: 'Comma', meta: true });
	});

	it('shortcutFor throws for a command no binding names', () => {
		expect(() => shortcutFor('no-such:command')).toThrow('No global keybinding for command "no-such:command"');
	});
});
