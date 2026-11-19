// @vitest-environment jsdom
// The row menu's note actions end to end: only the Tauri boundaries, the
// dialog and the toast are mocked, so a click runs the real lifecycle writers,
// the real frontmatter writer, the real editor service and the real History
// opener, and is checked on the in-memory disk and the real stores.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// The icon picker's ScrollArea observes its size; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import NoteRowMenuHarness from '../../../fixtures/NoteRowMenuHarness.svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { resetEditor } from '#lib/core/editor/editor.service.js';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { fileHistoryStore } from '#lib/features/file-history/file-history.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import type { NoteRowNote } from '#lib/features/note-list/note-row.types.js';

const ALPHA = '/vault/notes/alpha.md';
const BETA = '/vault/notes/beta.md';
const ALPHA_DISK = '---\n_organized: false\n---\n\n# Alpha\n';
const BETA_DISK = '---\n_organized: false\n---\n\n# Beta\n';

const row = (path: string, title: string): NoteRowNote => ({
	path,
	title,
	favorite: false,
	organized: false,
	archived: false,
	modifiedAt: 0,
	frontmatter: {},
});
const notes: NoteRowNote[] = [row(ALPHA, 'Alpha'), row(BETA, 'Beta')];

const disk = new Map<string, string>();

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

describe('NoteRowMenu note actions', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	async function choose(title: string, label: string) {
		const el = [...target.querySelectorAll<HTMLElement>('[data-note-row]')].find(
			(r) => r.querySelector('.truncate')?.textContent?.trim() === title,
		)!;
		el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
		await settle();
		const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
			(m) => m.querySelector('span')?.textContent?.trim() === label,
		);
		if (!item) throw new Error(`No menu item "${label}"`);
		item.click();
		for (let i = 0; i < 20; i++) await settle(1);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		disk.clear();
		vaultStore._reset();
		vaultStore.open('/vault');
		editorStore.reset();
		settingsStore.reset();
		fileHistoryStore.reset();
		resetHooks();
		clearAllIndexed();
		disk.set(ALPHA, ALPHA_DISK);
		disk.set(BETA, BETA_DISK);
		vi.mocked(exists).mockImplementation(async (p) => disk.has(String(p)));
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			const content = disk.get(String(p));
			if (content === undefined) throw new Error(`ENOENT ${String(p)}`);
			return content;
		});
		vi.mocked(writeTextFile).mockImplementation(async (p, data) => {
			disk.set(String(p), String(data));
		});
		vi.mocked(invoke).mockImplementation(async (cmd: string) => (cmd === 'get_file_history' ? [] : undefined));
		// Beta is the active tab; the row actions run on Alpha's row.
		editorStore.addTab({ path: BETA, name: 'beta.md', content: BETA_DISK, savedContent: BETA_DISK });
		target = document.body.appendChild(document.createElement('div'));
		component = mount(NoteRowMenuHarness, { target, props: { notes, activePath: BETA } });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		resetEditor();
		fileHistoryStore.reset();
		vaultStore._reset();
		resetHooks();
		clearLocalStorage();
	});

	it("Mark organized writes the row's note, not the active tab", async () => {
		await choose('Alpha', 'Mark organized');

		expect(disk.get(ALPHA)).toBe('---\n_organized: true\n---\n\n# Alpha\n');
		expect(disk.get(BETA)).toBe(BETA_DISK);
		expect(editorStore.activeTab?.path).toBe(BETA);
		expect(editorStore.activeTab?.content).toBe(BETA_DISK);
		expect(toast.error).not.toHaveBeenCalled();
	});

	it("Archive writes the row's note and leaves its organized flag and the active tab alone", async () => {
		await choose('Alpha', 'Archive');

		expect(disk.get(ALPHA)).toBe('---\n_organized: false\n_archived: true\n---\n\n# Alpha\n');
		expect(disk.get(BETA)).toBe(BETA_DISK);
		expect(editorStore.activeTab?.content).toBe(BETA_DISK);
	});

	it('History activates the row\'s note first, so the dialog opens on the active tab', async () => {
		await choose('Alpha', 'History');

		expect(editorStore.activeTab?.path).toBe(ALPHA);
		expect(fileHistoryStore.filePath).toBe(ALPHA);
		expect(fileHistoryStore.isOpen).toBe(true);
		expect(invoke).toHaveBeenCalledWith('get_file_history', { filePath: 'notes/alpha.md' });
		expect(editorStore.tabs.map((t) => t.path)).toEqual([BETA, ALPHA]);
	});
});
