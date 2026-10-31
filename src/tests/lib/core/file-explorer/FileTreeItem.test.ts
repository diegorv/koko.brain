// @vitest-environment jsdom
// Failure paths of the file tree row: an inline rename or a drop that fails
// must toast what failed and why, and leave the row as it was. The real
// fs.service runs; only the Tauri plugin boundary is mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

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

import { mount, unmount, flushSync } from 'svelte';
import { toast } from 'svelte-sonner';
import { invoke } from '@tauri-apps/api/core';
import { exists, rename } from '@tauri-apps/plugin-fs';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import FileTreeItem from '#lib/core/file-explorer/FileTreeItem.svelte';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';

const NOTE: FileTreeNode = { name: 'a.md', path: '/vault/a.md', isDirectory: false };
const FOLDER: FileTreeNode = { name: 'Projects', path: '/vault/Projects', isDirectory: true, children: [] };

let target: HTMLElement;
let component: ReturnType<typeof mount> | null = null;

function render(node: FileTreeNode) {
	component = mount(FileTreeItem, { target, props: { node } });
	flushSync();
}

/** Puts the row in rename mode, types `value` and presses Enter. */
async function renameTo(node: FileTreeNode, value: string) {
	fsStore.setRenamingPath(node.path);
	render(node);
	const input = target.querySelector('input')!;
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
	await vi.waitFor(() => expect(fsStore.renamingPath).toBeNull());
	flushSync();
}

/** Drops `sourcePath` onto the given folder row. */
function dropOnto(folder: FileTreeNode, sourcePath: string) {
	render(folder);
	const row = target.querySelector('[role="treeitem"]')!;
	const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
	Object.defineProperty(event, 'dataTransfer', { value: { getData: () => sourcePath } });
	row.dispatchEvent(event);
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vaultStore.open('/vault');
	target = document.body.appendChild(document.createElement('div'));
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	target.remove();
	fsStore.reset();
	vaultStore.close();
	vi.restoreAllMocks();
});

describe('FileTreeItem rename failures', () => {
	it('toasts when the new name is taken and keeps the old name', async () => {
		vi.mocked(exists).mockResolvedValue(true);

		await renameTo(NOTE, 'b.md');

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith('Could not rename "a.md": "b.md" already exists in this folder'),
		);
		expect(rename).not.toHaveBeenCalled();
		expect(target.querySelector('[role="treeitem"]')?.textContent).toContain('a.md');
	});

	it('toasts the disk error when the rename itself fails', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(rename).mockRejectedValue('Permission denied (os error 13)');

		await renameTo(NOTE, 'b.md');

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith('Could not rename "a.md": Permission denied (os error 13)'),
		);
	});

	it.each([
		['a:b.md', 'Name cannot contain ":"'],
		['a/b.md', 'Name cannot contain "/"'],
		['what?.md', 'Name cannot contain "?"'],
		['.hidden.md', 'Name cannot start with "."'],
	])('refuses the invalid name %s with a message naming the rule', async (value, rule) => {
		await renameTo(NOTE, value);

		expect(toast.error).toHaveBeenCalledWith(`Could not rename "a.md": ${rule}`);
		expect(exists).not.toHaveBeenCalled();
		expect(rename).not.toHaveBeenCalled();
	});

	it('renames once and does not toast when Enter is followed by the blur of the removed input', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		vi.mocked(invoke).mockResolvedValue([]);
		fsStore.setRenamingPath(NOTE.path);
		render(NOTE);
		const input = target.querySelector('input')!;
		input.value = 'b.md';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		// A browser fires blur when the focused input is removed on rename exit.
		input.dispatchEvent(new FocusEvent('blur'));

		await vi.waitFor(() => expect(rename).toHaveBeenCalledTimes(1));
		await new Promise((r) => setTimeout(r, 0));
		expect(rename).toHaveBeenCalledTimes(1);
		expect(rename).toHaveBeenCalledWith('/vault/a.md', '/vault/b.md');
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('opens a newly created file once when Enter is followed by the blur of the removed input', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		vi.mocked(invoke).mockResolvedValue([]);
		fsStore.setPendingCreationPath(NOTE.path);
		fsStore.setRenamingPath(NOTE.path);
		render(NOTE);
		const input = target.querySelector('input')!;
		input.value = 'b.md';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		input.dispatchEvent(new FocusEvent('blur'));

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledTimes(1));
		await new Promise((r) => setTimeout(r, 0));
		expect(openFileInEditor).toHaveBeenCalledTimes(1);
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/b.md');
		expect(rename).toHaveBeenCalledTimes(1);
		expect(fsStore.pendingCreationPath).toBeNull();
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('does not toast when the name is unchanged or emptied (a cancel)', async () => {
		await renameTo(NOTE, 'a.md');
		component && unmount(component);
		component = null;
		await renameTo(NOTE, '   ');

		expect(toast.error).not.toHaveBeenCalled();
		expect(rename).not.toHaveBeenCalled();
	});
});

describe('FileTreeItem move failures', () => {
	it('toasts when the target folder already holds the same name', async () => {
		vi.mocked(exists).mockResolvedValue(true);

		dropOnto(FOLDER, '/vault/a.md');

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith('Could not move "a.md": "a.md" already exists in this folder'),
		);
		expect(rename).not.toHaveBeenCalled();
	});
});
