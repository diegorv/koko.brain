// @vitest-environment jsdom
// Convert to view on a `.collection` row of the shared note row menu, through
// the real renameItem and path-change owner with the real fs and editor
// stores. Only the Tauri boundary (plugin-fs, invoke, dialog), the editor
// service and the toast are mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

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
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
	closeTabsForDeletedPath: vi.fn(() => []),
	saveFileByPath: vi.fn(async () => true),
	syncExternalContentToEditor: vi.fn(),
}));
vi.mock('#lib/core/trash/trash.service.js', () => ({ moveToTrash: vi.fn() }));
vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import { exists, rename, writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import NoteRowMenuHarness from '../../../fixtures/NoteRowMenuHarness.svelte';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { collectViewFiles } from '#lib/features/type-definitions/type-sidebar.logic.js';
import type { NoteRowNote } from '#lib/features/note-list/note-row.types.js';

const WORK = '/vault/Work';
const BOARD = `${WORK}/board.collection`;
const BOARD_VIEW = `${WORK}/board.view`;
const CONTENT = 'views:\n  - type: table\n    name: Board\n';

const notes: NoteRowNote[] = [{ path: BOARD, title: 'board', favorite: false, modifiedAt: 0, frontmatter: {} }];

async function settle(rounds = 6) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

describe('NoteRowMenu: Convert to view', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	async function convert() {
		component = mount(NoteRowMenuHarness, { target, props: { notes } });
		flushSync();
		const row = target.querySelector('[data-note-row]')!;
		row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
		await settle();
		const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) => el.textContent?.trim() === 'Convert to view')!;
		item.click();
		await settle();
	}

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'error').mockImplementation(() => {});
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		fsStore.reset();
		editorStore.reset();
		fileIconsStore.reset();
		fsStore.setFileTree([
			{ name: 'Work', path: WORK, isDirectory: true, children: [{ name: 'board.collection', path: BOARD, isDirectory: false }] },
		]);
		editorStore.addTab({ path: BOARD, name: 'board.collection', content: CONTENT, savedContent: CONTENT, fileType: 'collection' });
		vi.mocked(invoke).mockResolvedValue([]);
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it('renames x.collection to x.view without rewriting it, and the tab and the Views list follow', async () => {
		await convert();

		expect(rename).toHaveBeenCalledWith(BOARD, BOARD_VIEW);
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(editorStore.tabs.map((t) => t.path)).toEqual([BOARD_VIEW]);
		expect(editorStore.tabs[0].content).toBe(CONTENT);
		expect(collectViewFiles(fsStore.fileTree).map((v) => v.path)).toEqual([BOARD_VIEW]);
		expect(vaultStore.takePromptIndexRefresh()).toBe(true);
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('refuses with a toast and changes nothing when x.view already exists', async () => {
		vi.mocked(exists).mockImplementation(async (p) => String(p) === BOARD_VIEW);

		await convert();

		expect(toast.error).toHaveBeenCalledWith('Could not convert "board.collection" to a view: "board.view" already exists in this folder');
		expect(rename).not.toHaveBeenCalled();
		expect(editorStore.tabs.map((t) => t.path)).toEqual([BOARD]);
		expect(collectViewFiles(fsStore.fileTree)).toEqual([]);
		expect(vaultStore.takePromptIndexRefresh()).toBe(false);
	});
});
