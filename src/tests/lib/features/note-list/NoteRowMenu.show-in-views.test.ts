// @vitest-environment jsdom
// Show in Views on a hidden `.view` row of the shared note row menu, through
// the real `rewriteViewFile` and note-change owner with the real fs, editor
// and type definitions stores. Only the Tauri boundary (plugin-fs, invoke,
// dialog), the editor service and the toast are mocked.
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
	waitForTabSave: vi.fn(async () => {}),
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
import { parse as parseYaml } from 'yaml';
import { invoke } from '@tauri-apps/api/core';
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import NoteRowMenuHarness from '../../../fixtures/NoteRowMenuHarness.svelte';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { viewNavigatorRows } from '#lib/features/rail-shell/lens.logic.js';
import type { NoteRowNote } from '#lib/features/note-list/note-row.types.js';
import type { FrontmatterValue } from '#lib/types/vault-v2.types.js';

const WORK = '/vault/Work';
const TABLE = `${WORK}/Untitled.view`;
const SHOWN = `${WORK}/Shown.view`;
const NOTE = `${WORK}/note.md`;
const HIDDEN_BODY = '_visible: false\n_open_in_editor: true\nviews:\n  - type: table\n    name: All\n';

const row = (path: string, title: string): NoteRowNote => ({ path, title, favorite: false, modifiedAt: 0, frontmatter: {} });
const notes: NoteRowNote[] = [row(TABLE, 'Untitled'), row(SHOWN, 'Shown'), row(NOTE, 'note')];

/** Sets the entry snapshot Views reads, as the index refresh does. */
function setEntries(tableFrontmatter: Record<string, FrontmatterValue>) {
	typeDefinitionsStore.setEntries([
		entryV2(TABLE, { frontmatter: tableFrontmatter }),
		entryV2(SHOWN, { frontmatter: { views: null } }),
		entryV2(NOTE),
	]);
}

const viewsPaths = () => viewNavigatorRows(fsStore.fileTree, typeDefinitionsStore.entriesByPath).map((r) => r.lens.target);

async function settle(rounds = 6) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

describe('NoteRowMenu: Show in Views', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	/** Right-clicks the row of `path` and returns the items of the open menu (jsdom keeps closed ones in the DOM). */
	async function openMenu(path: string): Promise<HTMLElement[]> {
		component ??= mount(NoteRowMenuHarness, { target, props: { notes } });
		flushSync();
		const el = [...target.querySelectorAll('[data-note-row]')][notes.findIndex((n) => n.path === path)];
		el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
		await settle();
		return [...document.querySelectorAll<HTMLElement>('[role="menu"][data-state="open"] [role="menuitem"]')];
	}

	const labels = (items: HTMLElement[]) => items.map((el) => el.textContent?.trim());

	async function showInViews() {
		const item = (await openMenu(TABLE)).find((el) => el.textContent?.trim() === 'Show in Views')!;
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
		typeDefinitionsStore.reset();
		fsStore.setFileTree([
			{
				name: 'Work',
				path: WORK,
				isDirectory: true,
				children: [
					{ name: 'Untitled.view', path: TABLE, isDirectory: false },
					{ name: 'Shown.view', path: SHOWN, isDirectory: false },
					{ name: 'note.md', path: NOTE, isDirectory: false },
				],
			},
		]);
		setEntries({ _visible: false, _open_in_editor: true, views: null });
		vi.mocked(invoke).mockResolvedValue({ changed: true, affected: [], version: 1, upserted: [], removed: [], fullRescan: false });
		vi.mocked(readTextFile).mockResolvedValue(HIDDEN_BODY);
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it('is offered after Duplicate on a hidden .view only, not on a shown view or a note', async () => {
		const onTable = labels(await openMenu(TABLE));
		expect(onTable[onTable.indexOf('Duplicate') + 1]).toBe('Show in Views');
		expect(labels(await openMenu(SHOWN))).not.toContain('Show in Views');
		expect(labels(await openMenu(NOTE))).not.toContain('Show in Views');
	});

	it('removes both keys from the file, and the row is in Views once the index has the written YAML', async () => {
		expect(viewsPaths()).toEqual([SHOWN]);

		await showInViews();

		expect(writeTextFile).toHaveBeenCalledTimes(1);
		const [path, written, options] = vi.mocked(writeTextFile).mock.calls[0];
		expect(path).toBe(TABLE);
		expect(options).toEqual({ create: false });
		const yaml = parseYaml(written as string) as Record<string, FrontmatterValue>;
		expect(yaml).toEqual({ views: [{ type: 'table', name: 'All' }] });
		expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path: TABLE, content: written });
		expect(vaultStore.takePromptIndexRefresh()).toBe(true);
		expect(toast.error).not.toHaveBeenCalled();

		// Rust parses a `.view` as bare YAML (`update_note_in_index_inner`), with nested values as null.
		setEntries({ ...yaml, views: null });
		expect(viewsPaths()).toEqual([SHOWN, TABLE]);
	});

	it('toasts a failed write and leaves the row hidden', async () => {
		vi.mocked(writeTextFile).mockRejectedValue(new Error('EACCES'));

		await showInViews();

		expect(toast.error).toHaveBeenCalledWith('Could not show "Untitled.view" in Views: EACCES');
		expect(invoke).not.toHaveBeenCalledWith('update_note_in_index', expect.anything());
		expect(viewsPaths()).toEqual([SHOWN]);
	});
});
