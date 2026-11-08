// Repro for o05 recovery-5. Asserts the CORRECT behavior (the bytes a save
// overwrites stay recoverable through File History), so it fails while the
// bug exists. Only Tauri APIs are mocked; the editor service, hooks, store and
// file-history service are real.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(),
	readDir: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(() => Promise.resolve(true)) }));

import { invoke } from '@tauri-apps/api/core';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { saveFileByPath } from '#lib/core/editor/editor.service.js';
import { registerFileHistoryHook } from '#lib/features/file-history/file-history.service.js';

const NOTE = '/vault/old-note.md';
const ORIGINAL = '# Old note\n\nTwo months of careful writing.\n';
const PASTED = 'oops, clipboard contents\n';

describe('o05 recovery-5: the first in-app overwrite of a note with no snapshot', () => {
	let unsubscribe: () => void;
	/** Snapshot table, keyed by vault-relative path (empty: never saved in-app, or aged out). */
	let snapshots: Map<string, string[]>;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		editorStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		snapshots = new Map();
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(invoke).mockImplementation(async (cmd: string, args?: any) => {
			if (cmd === 'save_snapshot') {
				const list = snapshots.get(args.filePath) ?? [];
				if (list[list.length - 1] === args.content) return false;
				list.push(args.content);
				snapshots.set(args.filePath, list);
				return true;
			}
			return undefined;
		});
		unsubscribe = registerFileHistoryHook();
	});

	afterEach(() => unsubscribe());

	it('keeps the pre-save bytes in File History', async () => {
		editorStore.addTab({ path: NOTE, name: 'old-note.md', content: ORIGINAL, savedContent: ORIGINAL });
		// Select all + paste over it by mistake; autosave fires.
		editorStore.updateContent(PASTED);
		expect(await saveFileByPath(NOTE)).toBe(true);
		await new Promise((r) => setTimeout(r, 0));

		const history = snapshots.get('old-note.md') ?? [];
		expect(history).toContain(PASTED);
		// The original text is what the user needs to get back.
		expect(history).toContain(ORIGINAL);
	});
});
