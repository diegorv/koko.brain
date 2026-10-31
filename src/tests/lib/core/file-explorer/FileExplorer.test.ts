// @vitest-environment jsdom
// Failure paths of the file explorer context menu and root drop: create,
// duplicate, delete and move must toast what failed and why. The real
// fs.service runs; only the Tauri boundary (plugin-fs, invoke, dialog,
// trash) is mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// The ScrollArea observes its viewport size; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	remove: vi.fn(),
	rename: vi.fn(),
	exists: vi.fn(),
	copyFile: vi.fn(),
	readDir: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-opener', () => ({ revealItemInDir: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
vi.mock('#lib/core/trash/trash.service.js', () => ({ moveToTrash: vi.fn() }));
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
	closeTabsForDeletedPath: vi.fn(),
}));
vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import { toast } from 'svelte-sonner';
import { invoke } from '@tauri-apps/api/core';
import { exists, readDir, rename, copyFile } from '@tauri-apps/plugin-fs';
import { ask } from '@tauri-apps/plugin-dialog';
import { moveToTrash } from '#lib/core/trash/trash.service.js';
import FileExplorer from '#lib/core/file-explorer/FileExplorer.svelte';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';

let target: HTMLElement;
let component: ReturnType<typeof mount> | null = null;

function render() {
	component = mount(FileExplorer, { target });
	flushSync();
}

/** Right-clicks `el` and clicks the context menu item labelled `label`. */
async function chooseMenuItem(el: Element, label: string) {
	el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
	await tick();
	const item = await vi.waitFor(() => {
		const found = [...document.querySelectorAll('[role="menuitem"]')].find(
			(node) => node.textContent?.trim().startsWith(label),
		);
		if (!found) throw new Error(`menu item "${label}" not rendered`);
		return found as HTMLElement;
	});
	item.click();
}

function row(name: string): Element {
	const found = [...target.querySelectorAll('[role="treeitem"]')].find((r) => r.textContent?.includes(name));
	if (!found) throw new Error(`row "${name}" not rendered`);
	return found;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vaultStore.open('/vault');
	fsStore.setFileTree([
		{ name: 'Projects', path: '/vault/Projects', isDirectory: true, children: [] },
		{ name: 'a.md', path: '/vault/Projects/a.md', isDirectory: false },
	]);
	vi.mocked(readDir).mockResolvedValue([]);
	target = document.body.appendChild(document.createElement('div'));
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	target.remove();
	document.body.replaceChildren();
	fsStore.reset();
	vaultStore.close();
	vi.restoreAllMocks();
});

describe('FileExplorer failure toasts', () => {
	it('toasts when creating a file fails', async () => {
		vi.mocked(invoke).mockRejectedValue('No space left on device (os error 28)');
		render();

		await chooseMenuItem(row('a.md'), 'New File');

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith('Could not create "Untitled.md": No space left on device (os error 28)'),
		);
		expect(fsStore.renamingPath).toBeNull();
	});

	it('toasts when creating a folder fails', async () => {
		vi.mocked(invoke).mockRejectedValue('Permission denied (os error 13)');
		render();

		await chooseMenuItem(row('a.md'), 'New Folder');

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith('Could not create "Untitled": Permission denied (os error 13)'),
		);
	});

	it.each([
		['New Canvas', 'Untitled.canvas'],
		['New Kanban Board', 'Untitled.kanban'],
		['New Collection', 'Untitled.collection'],
	])('toasts when "%s" fails', async (label, fileName) => {
		vi.mocked(invoke).mockRejectedValue('Permission denied (os error 13)');
		render();

		await chooseMenuItem(row('a.md'), label);

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(`Could not create "${fileName}": Permission denied (os error 13)`),
		);
		expect(fsStore.renamingPath).toBeNull();
	});

	it('toasts when duplicating fails', async () => {
		vi.mocked(copyFile).mockRejectedValue('Permission denied (os error 13)');
		render();

		await chooseMenuItem(row('a.md'), 'Duplicate');

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith('Could not duplicate "a.md": Permission denied (os error 13)'),
		);
	});

	it('toasts when moving to trash fails', async () => {
		vi.mocked(ask).mockResolvedValue(true);
		vi.mocked(moveToTrash).mockRejectedValue(new Error('trash is not writable'));
		render();

		await chooseMenuItem(row('a.md'), 'Move to Trash');

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith('Could not move "a.md" to the Trash: trash is not writable'),
		);
	});

	it('does not toast when the delete confirmation is declined', async () => {
		vi.mocked(ask).mockResolvedValue(false);
		render();

		await chooseMenuItem(row('a.md'), 'Move to Trash');
		await vi.waitFor(() => expect(ask).toHaveBeenCalled());
		await tick();

		expect(moveToTrash).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('toasts when a drop on the vault root collides with an existing name', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		render();
		const tree = target.querySelector('[role="tree"]')!;
		const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
		Object.defineProperty(event, 'dataTransfer', { value: { getData: () => '/vault/Projects/a.md' } });

		tree.dispatchEvent(event);

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith('Could not move "a.md": "a.md" already exists in this folder'),
		);
		expect(rename).not.toHaveBeenCalled();
	});
});
