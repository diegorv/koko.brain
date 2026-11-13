// @vitest-environment jsdom
// The row menu's Favorite item end to end: only the Tauri boundaries, the
// editor save and the toast are mocked, so the click runs the real favorite
// toggle and the real frontmatter writer.
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
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
	saveFileByPath: vi.fn(),
	syncExternalContentToEditor: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import NoteRowMenuHarness from '../../../fixtures/NoteRowMenuHarness.svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { NoteRowNote } from '#lib/features/note-list/note-row.types.js';

const ALPHA = '/vault/notes/alpha.md';

const notes: NoteRowNote[] = [
	{ path: ALPHA, title: 'Alpha', favorite: false, modifiedAt: 0, frontmatter: {} },
];

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

/** Resolves once the favorite write has settled: it calls `writeTextFile` or `toast.error` last. */
async function settleWrite() {
	for (let i = 0; i < 20; i++) await settle(1);
}

describe('NoteRowMenu favorite toggle', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	async function favorite(title: string) {
		const row = [...target.querySelectorAll<HTMLElement>('[data-note-row]')].find(
			(el) => el.querySelector('.truncate')?.textContent?.trim() === title,
		)!;
		row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
		await settle();
		const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) =>
			el.textContent?.trim().startsWith('Favorite'),
		)!;
		item.click();
		await settleWrite();
	}

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		editorStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		// The write runs `notifyAfterSave` -> `applyNoteChange`, which calls `invoke`.
		vi.mocked(invoke).mockResolvedValue(undefined as never);
		target = document.body.appendChild(document.createElement('div'));
		component = mount(NoteRowMenuHarness, { target, props: { notes } });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		vaultStore._reset();
		editorStore.reset();
		clearLocalStorage();
	});

	it('writes _favorite: true into the note on disk', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n_type: Project\n---\n\n# Alpha\n');

		await favorite('Alpha');

		expect(writeTextFile).toHaveBeenCalledTimes(1);
		expect(writeTextFile).toHaveBeenCalledWith(ALPHA, '---\n_type: Project\n_favorite: true\n---\n\n# Alpha\n', { create: false });
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('shows a toast and writes nothing when the frontmatter cannot be rewritten', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n# keep me\ntype: Project\n---\n\n# Alpha\n');

		await favorite('Alpha');

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith(
			"alpha.md: The note's frontmatter has comments; it cannot be rewritten without losing them",
		);
	});

	it('handles an empty note: the write adds a frontmatter block', async () => {
		vi.mocked(readTextFile).mockResolvedValue('');

		await favorite('Alpha');

		expect(writeTextFile).toHaveBeenCalledWith(ALPHA, expect.stringContaining('_favorite: true'), { create: false });
	});
});
