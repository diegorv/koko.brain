// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
	syncExternalContentToEditor: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import NoteInfo from '#lib/features/properties/NoteInfo.svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { resetProperties } from '#lib/features/properties/properties.service.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const NOTE = '/vault/note.md';
const OTHER = '/vault/other.md';

/** Local-time date as the seconds-since-epoch `NoteEntryV2` timestamps carry. */
function seconds(year: number, monthIndex: number, day: number): number {
	return new Date(year, monthIndex, day, 12).getTime() / 1000;
}

const NOTE_ENTRY = entryV2(NOTE, {
	modifiedAt: seconds(2026, 10, 5),
	createdAt: seconds(2026, 4, 12),
	wordCount: 167,
	size: 1126,
});

describe('NoteInfo', () => {
	let component: ReturnType<typeof mount> | null = null;
	let target: HTMLElement;
	let entries: NoteEntryV2[] | Error;

	beforeEach(() => {
		clearLocalStorage();
		vi.clearAllMocks();
		vaultStore._reset();
		vaultStore.open('/vault');
		invalidateVaultEntries();
		resetProperties();
		editorStore.reset();
		entries = [NOTE_ENTRY];
		vi.mocked(invoke).mockImplementation(async (command) => {
			if (command !== 'get_all_vault_entries_v2') return undefined;
			if (entries instanceof Error) throw entries;
			return entries;
		});
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		editorStore.reset();
		vaultStore._reset();
		vi.restoreAllMocks();
	});

	function openNote(path: string): void {
		editorStore.addTab({ path, name: path.split('/').pop()!, content: 'body', savedContent: 'body' });
	}

	/** The rendered Info rows as `[label, value]` pairs. */
	function infoRows(): string[][] {
		return [...target.querySelectorAll('[data-testid="note-info-row"]')].map((row) =>
			[...row.children].map((cell) => cell.textContent?.trim() ?? ''),
		);
	}

	async function mountView(): Promise<void> {
		component = mount(NoteInfo, { target });
		flushSync();
		await vi.waitFor(() => expect(invoke).toHaveBeenCalled());
		await settle();
	}

	async function settle(): Promise<void> {
		for (let i = 0; i < 5; i++) await Promise.resolve();
		flushSync();
	}

	it('shows the active note metadata from the index', async () => {
		openNote(NOTE);
		await mountView();

		const [modified, created, words, size] = infoRows();
		expect(modified[0]).toBe('Modified');
		expect(modified[1]).toMatch(/^November 5, 2026, 12:00(\sPM)?$/);
		expect(created[0]).toBe('Created');
		expect(created[1]).toMatch(/^May 12, 2026, 12:00(\sPM)?$/);
		expect(words).toEqual(['Words', '167']);
		expect(size).toEqual(['Size', '1.1 KB']);
	});

	it('keeps the full value readable when a narrow sidebar truncates it', async () => {
		openNote(NOTE);
		await mountView();

		const value = target.querySelector('[data-testid="note-info-row"] > :last-child');
		expect(value?.getAttribute('title')).toBe(value?.textContent?.trim());
	});

	it('shows placeholders for a note the index does not have yet', async () => {
		openNote(OTHER);
		await mountView();

		expect(infoRows().map(([, value]) => value)).toEqual(['--', '--', '--', '--']);
	});

	it('follows the active tab to another note', async () => {
		entries = [NOTE_ENTRY, entryV2(OTHER, { wordCount: 3 })];
		openNote(NOTE);
		await mountView();
		expect(infoRows()[2]).toEqual(['Words', '167']);

		openNote(OTHER);
		flushSync();
		await settle();

		expect(infoRows()[2]).toEqual(['Words', '3']);
	});

	it('refreshes when the vault index version moves', async () => {
		openNote(NOTE);
		await mountView();
		expect(infoRows()[2]).toEqual(['Words', '167']);

		entries = [{ ...NOTE_ENTRY, wordCount: 200 }];
		vaultStore.bumpVaultIndexVersion(vaultStore.vaultIndexVersion + 1);
		flushSync();
		await settle();

		expect(infoRows()[2]).toEqual(['Words', '200']);
	});

	it('falls back to placeholders and reports the error when the read fails', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		entries = new Error('index unavailable');
		openNote(NOTE);
		await mountView();

		expect(infoRows().map(([, value]) => value)).toEqual(['--', '--', '--', '--']);
		expect(consoleError).toHaveBeenCalled();
	});

	it('is empty and reads nothing for a file type the panel does not support', async () => {
		editorStore.addTab({ path: '/vault/a.canvas', name: 'a.canvas', content: '{}', savedContent: '{}', fileType: 'canvas' });
		component = mount(NoteInfo, { target });
		flushSync();

		expect(infoRows()).toEqual([]);
		await settle();
		expect(vi.mocked(invoke).mock.calls.map(([command]) => command)).not.toContain('get_all_vault_entries_v2');
	});
});
