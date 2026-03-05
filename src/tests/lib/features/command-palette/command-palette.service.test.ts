import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// Must set up localStorage BEFORE any store imports (stores read localStorage at top-level)
setupLocalStorage();

// Mock side-effect services (Tauri API calls, etc.) — OK per CLAUDE.md
vi.mock('$lib/core/editor/editor.service', () => ({
	saveCurrentFile: vi.fn(),
	closeActiveTab: vi.fn(),
	switchToNextTab: vi.fn(),
	switchToPreviousTab: vi.fn(),
	togglePinActiveTab: vi.fn(),
}));

vi.mock('$lib/core/filesystem/fs.service', () => ({
	createFile: vi.fn(),
	createFolder: vi.fn(),
}));

vi.mock('$lib/plugins/graph-view/graph-view.service', () => ({
	toggleGraphTab: vi.fn(),
}));

vi.mock('$lib/features/tasks/tasks.service', () => ({
	toggleTasksTab: vi.fn(),
}));

vi.mock('$lib/core/settings/settings.service', () => ({
	saveSettings: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/plugins/periodic-notes/periodic-notes.service', () => ({
	openOrCreateDailyNote: vi.fn(),
}));

vi.mock('$lib/plugins/templates/templates.service', () => ({
	openTemplatePicker: vi.fn(),
}));

vi.mock('$lib/features/copy-block-link/copy-block-link.service', () => ({
	copyBlockLinkToClipboard: vi.fn(),
	copyBlockEmbedToClipboard: vi.fn(),
}));

vi.mock('$lib/plugins/quick-note/quick-note.service', () => ({
	createQuickNote: vi.fn(),
}));

vi.mock('$lib/plugins/one-on-one/one-on-one.service', () => ({
	openOneOnOnePicker: vi.fn(),
}));

vi.mock('$lib/plugins/terminal/terminal.service', () => ({
	toggleTerminal: vi.fn(),
}));

vi.mock('$lib/features/canvas/canvas.service', () => ({
	createCanvasFile: vi.fn(),
}));

vi.mock('$lib/features/file-history/file-history.service', () => ({
	openFileHistory: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn() },
}));

// No mocks for stores or logic files — use real implementations per CLAUDE.md

import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { searchStore } from '$lib/features/search/search.store.svelte';
import { settingsDialogStore } from '$lib/core/settings/settings-dialog.store.svelte';
import { getBuiltInCommands } from '$lib/features/command-palette/command-palette.service';

describe('getBuiltInCommands', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		editorStore.reset();
		settingsStore.reset();
		fsStore.reset();
		searchStore.reset();
		settingsDialogStore.reset();
	});

	it('returns 27 built-in commands', () => {
		const commands = getBuiltInCommands();

		expect(commands).toHaveLength(27);
	});

	it('every command has required fields', () => {
		const commands = getBuiltInCommands();

		for (const cmd of commands) {
			expect(cmd.id).toBeTruthy();
			expect(cmd.label).toBeTruthy();
			expect(cmd.category).toBeTruthy();
			expect(typeof cmd.action).toBe('function');
		}
	});

	it('all command IDs are unique', () => {
		const commands = getBuiltInCommands();
		const ids = commands.map((c) => c.id);
		const uniqueIds = new Set(ids);

		expect(uniqueIds.size).toBe(ids.length);
	});

	it('includes save file command with Cmd+S shortcut', () => {
		const commands = getBuiltInCommands();
		const save = commands.find((c) => c.id === 'editor:save-file');

		expect(save).toBeDefined();
		expect(save!.label).toBe('Save File');
		expect(save!.shortcut).toEqual({ meta: true, key: 's' });
	});

	it('includes close tab command with Cmd+W shortcut', () => {
		const commands = getBuiltInCommands();
		const close = commands.find((c) => c.id === 'editor:close-tab');

		expect(close).toBeDefined();
		expect(close!.shortcut).toEqual({ meta: true, key: 'w' });
	});

	it('includes next/previous tab commands with bracket shortcuts', () => {
		const commands = getBuiltInCommands();
		const next = commands.find((c) => c.id === 'editor:next-tab');
		const prev = commands.find((c) => c.id === 'editor:previous-tab');

		expect(next).toBeDefined();
		expect(next!.shortcut).toEqual({ meta: true, shift: true, code: 'BracketRight' });
		expect(prev).toBeDefined();
		expect(prev!.shortcut).toEqual({ meta: true, shift: true, code: 'BracketLeft' });
	});

	it('includes quick switcher command with Cmd+O shortcut', () => {
		const commands = getBuiltInCommands();
		const qs = commands.find((c) => c.id === 'quick-switcher:open');

		expect(qs).toBeDefined();
		expect(qs!.shortcut).toEqual({ meta: true, key: 'o' });
	});

	it('includes search command with Cmd+Shift+F shortcut', () => {
		const commands = getBuiltInCommands();
		const search = commands.find((c) => c.id === 'search:toggle');

		expect(search).toBeDefined();
		expect(search!.shortcut).toEqual({ meta: true, shift: true, key: 'f' });
	});

	it('includes graph view command with Cmd+G shortcut', () => {
		const commands = getBuiltInCommands();
		const graph = commands.find((c) => c.id === 'graph-view:toggle');

		expect(graph).toBeDefined();
		expect(graph!.shortcut).toEqual({ meta: true, key: 'g' });
	});

	it('includes new file and new folder commands without shortcuts', () => {
		const commands = getBuiltInCommands();
		const newFile = commands.find((c) => c.id === 'file-explorer:new-file');
		const newFolder = commands.find((c) => c.id === 'file-explorer:new-folder');

		expect(newFile).toBeDefined();
		expect(newFile!.shortcut).toBeUndefined();
		expect(newFolder).toBeDefined();
		expect(newFolder!.shortcut).toBeUndefined();
	});

	it('includes daily notes command', () => {
		const commands = getBuiltInCommands();
		const daily = commands.find((c) => c.id === 'daily-notes:open');

		expect(daily).toBeDefined();
		expect(daily!.label).toBe('Open Daily Note');
		expect(daily!.category).toBe('Daily Notes');
	});

	it('includes quick note command with Cmd+N shortcut', () => {
		const commands = getBuiltInCommands();
		const cmd = commands.find((c) => c.id === 'quick-note:create');

		expect(cmd).toBeDefined();
		expect(cmd!.label).toBe('Create Quick Note');
		expect(cmd!.category).toBe('Quick Note');
		expect(cmd!.shortcut).toEqual({ meta: true, key: 'n' });
	});

	it('includes copy block link command with Cmd+Shift+L shortcut', () => {
		const commands = getBuiltInCommands();
		const cmd = commands.find((c) => c.id === 'editor:copy-block-link');

		expect(cmd).toBeDefined();
		expect(cmd!.label).toBe('Copy Link to Block');
		expect(cmd!.category).toBe('Editor');
		expect(cmd!.shortcut).toEqual({ meta: true, shift: true, key: 'l' });
	});

	it('includes copy block embed command', () => {
		const commands = getBuiltInCommands();
		const cmd = commands.find((c) => c.id === 'editor:copy-block-embed');

		expect(cmd).toBeDefined();
		expect(cmd!.label).toBe('Copy Block Embed');
		expect(cmd!.category).toBe('Editor');
	});

	it('includes 1:1 note command with Cmd+Shift+N shortcut', () => {
		const commands = getBuiltInCommands();
		const cmd = commands.find((c) => c.id === 'one-on-one:create');

		expect(cmd).toBeDefined();
		expect(cmd!.label).toBe('Create 1:1 Note');
		expect(cmd!.category).toBe('1:1 Notes');
		expect(cmd!.shortcut).toEqual({ meta: true, shift: true, key: 'n' });
	});

	it('toggle right sidebar action updates settingsStore layout', async () => {
		vaultStore.open('/vault');
		const commands = getBuiltInCommands();
		const toggle = commands.find((c) => c.id === 'layout:toggle-right-sidebar');

		expect(toggle).toBeDefined();
		// Default layout has rightSidebarVisible: false
		expect(settingsStore.layout.rightSidebarVisible).toBe(false);

		toggle!.action();

		// After toggling, rightSidebarVisible should be true
		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
	});

	it('search toggle action toggles searchStore.isOpen', () => {
		const commands = getBuiltInCommands();
		const search = commands.find((c) => c.id === 'search:toggle');

		expect(searchStore.isOpen).toBe(false);
		search!.action();
		expect(searchStore.isOpen).toBe(true);
	});

	it('settings open action opens settingsDialogStore', () => {
		const commands = getBuiltInCommands();
		const settings = commands.find((c) => c.id === 'settings:open');

		expect(settingsDialogStore.isOpen).toBe(false);
		settings!.action();
		expect(settingsDialogStore.isOpen).toBe(true);
	});

	it('includes show recovery key command that opens security settings', () => {
		const commands = getBuiltInCommands();
		const cmd = commands.find((c) => c.id === 'encryption:show-recovery-key');

		expect(cmd).toBeDefined();
		expect(cmd!.label).toBe('Show Encryption Recovery Key');
		expect(cmd!.category).toBe('Security');

		settingsDialogStore.close();
		cmd!.action();
		expect(settingsDialogStore.isOpen).toBe(true);
		expect(settingsDialogStore.activeSection).toBe('security');
	});

	it('includes restore from recovery key command that opens security settings', () => {
		const commands = getBuiltInCommands();
		const cmd = commands.find((c) => c.id === 'encryption:restore-from-recovery-key');

		expect(cmd).toBeDefined();
		expect(cmd!.label).toBe('Restore Encryption from Recovery Key');
		expect(cmd!.category).toBe('Security');

		settingsDialogStore.close();
		cmd!.action();
		expect(settingsDialogStore.isOpen).toBe(true);
		expect(settingsDialogStore.activeSection).toBe('security');
	});
});
