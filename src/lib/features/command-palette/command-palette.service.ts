import { toast } from 'svelte-sonner';
import type { AppCommand } from './command-palette.types';
import { commandPaletteStore } from './command-palette.store.svelte';
import {
	saveCurrentFile,
	closeActiveTab,
	switchToNextTab,
	switchToPreviousTab,
	togglePinActiveTab,
} from '$lib/core/editor/editor.service';
import { createFile, createFolder } from '$lib/core/filesystem/fs.service';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { quickSwitcherStore } from '$lib/features/quick-switcher/quick-switcher.store.svelte';
import { searchStore } from '$lib/features/search/search.store.svelte';
import { toggleGraphTab } from '$lib/plugins/graph-view/graph-view.service';
import { createCanvasFile } from '$lib/features/canvas/canvas.service';
import { createKanbanFile } from '$lib/plugins/kanban/kanban.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { saveSettings } from '$lib/core/settings/settings.service';
import { openOrCreateDailyNote } from '$lib/plugins/periodic-notes/periodic-notes.service';
import { openTemplatePicker } from '$lib/plugins/templates/templates.service';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { copyBlockLinkToClipboard, copyBlockEmbedToClipboard } from '$lib/features/copy-block-link/copy-block-link.service';
import { settingsDialogStore } from '$lib/core/settings/settings-dialog.store.svelte';
import { toggleTasksTab } from '$lib/features/tasks/tasks.service';
import { createQuickNote } from '$lib/plugins/quick-note/quick-note.service';
import { openOneOnOnePicker } from '$lib/plugins/one-on-one/one-on-one.service';
import { toggleTerminal } from '$lib/plugins/terminal/terminal.service';
import { openFileHistory } from '$lib/features/file-history/file-history.service';

export function getBuiltInCommands(): AppCommand[] {
	return [
		{
			id: 'editor:save-file',
			label: 'Save File',
			category: 'Editor',
			shortcut: { meta: true, key: 's' },
			action: () => saveCurrentFile(),
		},
		{
			id: 'editor:close-tab',
			label: 'Close Tab',
			category: 'Editor',
			shortcut: { meta: true, key: 'w' },
			action: () => closeActiveTab(),
		},
		{
			id: 'editor:next-tab',
			label: 'Next Tab',
			category: 'Editor',
			shortcut: { meta: true, shift: true, code: 'BracketRight' },
			action: () => switchToNextTab(),
		},
		{
			id: 'editor:previous-tab',
			label: 'Previous Tab',
			category: 'Editor',
			shortcut: { meta: true, shift: true, code: 'BracketLeft' },
			action: () => switchToPreviousTab(),
		},
		{
			id: 'file-explorer:new-file',
			label: 'New File',
			category: 'File Explorer',
			action: async () => {
				const path = vaultStore.path;
				if (!path) return;
				const filePath = await createFile(path, 'Untitled.md');
				if (filePath) {
					fsStore.setPendingCreationPath(filePath);
					fsStore.setRenamingPath(filePath);
				}
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
				if (folderPath) {
					fsStore.setRenamingPath(folderPath);
				}
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
				if (filePath) {
					fsStore.setRenamingPath(filePath);
				}
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
				if (filePath) {
					fsStore.setRenamingPath(filePath);
				}
			},
		},
		{
			id: 'quick-switcher:open',
			label: 'Open Quick Switcher',
			category: 'Navigation',
			shortcut: { meta: true, key: 'o' },
			action: () => quickSwitcherStore.toggle(),
		},
		{
			id: 'search:toggle',
			label: 'Search in Vault',
			category: 'Navigation',
			shortcut: { meta: true, shift: true, key: 'f' },
			action: () => searchStore.toggle(),
		},
		{
			id: 'graph-view:toggle',
			label: 'Toggle Graph View',
			category: 'Navigation',
			shortcut: { meta: true, key: 'g' },
			action: () => {
				toggleGraphTab();
			},
		},
		{
			id: 'tasks:toggle',
			label: 'Toggle Tasks View',
			category: 'Navigation',
			shortcut: { meta: true, shift: true, key: 't' },
			action: () => {
				toggleTasksTab();
			},
		},
		{
			id: 'layout:toggle-right-sidebar',
			label: 'Toggle Right Sidebar',
			category: 'Layout',
			shortcut: { meta: true, key: 'b' },
			action: () => {
				const current = settingsStore.layout.rightSidebarVisible;
				settingsStore.updateLayout({ rightSidebarVisible: !current });
				if (vaultStore.path) saveSettings(vaultStore.path).catch(() => {});
			},
		},
		{
			id: 'layout:toggle-terminal',
			label: 'Toggle Terminal',
			category: 'Layout',
			shortcut: { meta: true, code: 'Backquote' },
			action: () => toggleTerminal(),
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
			id: 'quick-note:create',
			label: 'Create Quick Note',
			category: 'Quick Note',
			shortcut: { meta: true, key: 'n' },
			action: () => createQuickNote(),
		},
		{
			id: 'one-on-one:create',
			label: 'Create 1:1 Note',
			category: '1:1 Notes',
			shortcut: { meta: true, shift: true, key: 'n' },
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
			label: 'Copy Link to Block',
			category: 'Editor',
			shortcut: { meta: true, shift: true, key: 'l' },
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
			shortcut: { meta: true, code: 'Comma' },
			action: () => settingsDialogStore.open(),
		},
		{
			id: 'file-history:open',
			label: 'View File History',
			category: 'Editor',
			shortcut: { meta: true, shift: true, key: 'h' },
			action: () => {
				const path = editorStore.activeTabPath;
				if (!path) { toast.error('No file is open.'); return; }
				openFileHistory(path);
			},
		},
		{
			id: 'encrypted-notes:toggle',
			label: 'Toggle Note Encryption',
			category: 'Encrypted Notes',
			action: async () => {
				const tab = editorStore.activeTab;
				if (!tab) return;
				if (tab.encrypted) {
					const { decryptCurrentFile } = await import('$lib/plugins/encrypted-notes/encrypted-notes.service');
					await decryptCurrentFile();
				} else {
					const { encryptCurrentFile } = await import('$lib/plugins/encrypted-notes/encrypted-notes.service');
					await encryptCurrentFile();
				}
			},
		},
		{
			id: 'encrypted-notes:lock',
			label: 'Lock Encrypted Notes',
			category: 'Encrypted Notes',
			action: async () => {
				const { lockEncryption } = await import('$lib/plugins/encrypted-notes/encrypted-notes.service');
				await lockEncryption();
			},
		},
		{
			id: 'encryption:show-recovery-key',
			label: 'Show Encryption Recovery Key',
			category: 'Security',
			action: () => settingsDialogStore.open('security'),
		},
		{
			id: 'encryption:restore-from-recovery-key',
			label: 'Restore Encryption from Recovery Key',
			category: 'Security',
			action: () => settingsDialogStore.open('security'),
		},
	];
}

/** Resets the command palette store to its initial state. Used during vault teardown. */
export function resetCommandPalette(): void {
	commandPaletteStore.reset();
}
