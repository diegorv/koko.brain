// @vitest-environment jsdom
// The Inbox rows' Mark organized check over the real stores and the real
// lifecycle writer: only the Tauri boundaries, the editor's save and the toast
// are mocked, so a click is checked on the in-memory disk and the list.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// virtua mounts rows only after ResizeObserver reports sizes and skips targets
// without offsetParent; jsdom has neither. Same shim as RailNoteList.test.ts.
class ResizeObserverStub {
	private cb: ResizeObserverCallback;
	constructor(cb: ResizeObserverCallback) {
		this.cb = cb;
	}
	observe(el: Element) {
		const height = (el as HTMLElement).style?.overflowY === 'auto' ? 600 : 60;
		queueMicrotask(() =>
			this.cb(
				[{ target: el, contentRect: { height, width: 240 } } as unknown as ResizeObserverEntry],
				this as unknown as ResizeObserver,
			),
		);
	}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
	get() {
		return this.parentElement;
	},
	configurable: true,
});

vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
	saveFileByPath: vi.fn(),
	syncExternalContentToEditor: vi.fn(),
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import RailNoteList from '#lib/features/rail-shell/RailNoteList.svelte';
import { ARCHIVE_LENS, FAVORITES_LENS, INBOX_LENS } from '#lib/features/rail-shell/lens.logic.js';
import type { Lens } from '#lib/features/rail-shell/rail-shell.types.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const ALPHA = '/vault/Work/alpha.md';
const BETA = '/vault/beta.md';
const ALPHA_DISK = '---\n_organized: false\n---\n\n# Alpha\n';
const BETA_DISK = '---\n_organized: false\n---\n\n# Beta\n';

const disk = new Map<string, string>();

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

describe('RailNoteList Inbox check', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	async function mountList(lens: Lens = INBOX_LENS) {
		component = mount(RailNoteList, { target, props: { lens } });
		await settle();
	}

	function rowTitles(): string[] {
		return [...target.querySelectorAll<HTMLElement>('[data-note-row]')].map(
			(el) => el.querySelector('.truncate')?.textContent?.trim() ?? '',
		);
	}

	function checkOf(title: string): HTMLButtonElement | null {
		const row = [...target.querySelectorAll<HTMLElement>('[data-note-row]')].find(
			(el) => el.querySelector('.truncate')?.textContent?.trim() === title,
		)!;
		return row.parentElement!.querySelector<HTMLButtonElement>(':scope > [data-note-row-organize]');
	}

	function count(): string | null | undefined {
		return target.querySelector('[data-note-list-count]')?.textContent;
	}

	beforeEach(() => {
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		editorStore.reset();
		fsStore.reset();
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		settingsStore.reset();
		railRegistryStore.reset();
		clearAllIndexed();
		vi.clearAllMocks();
		disk.clear();
		disk.set(ALPHA, ALPHA_DISK);
		disk.set(BETA, BETA_DISK);
		vi.mocked(exists).mockImplementation(async (p) => disk.has(String(p)));
		vi.mocked(readTextFile).mockImplementation(async (p) => disk.get(String(p)) ?? '');
		vi.mocked(writeTextFile).mockImplementation(async (p, data) => {
			disk.set(String(p), String(data));
		});
		vi.mocked(invoke).mockResolvedValue(undefined as never);
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		editorStore.reset();
		vaultStore._reset();
	});

	it('gives every Inbox row a check', async () => {
		typeDefinitionsStore.setEntries([entryV2(ALPHA, { modifiedAt: 200 }), entryV2(BETA, { modifiedAt: 100 })]);
		await mountList();

		expect(rowTitles()).toEqual(['alpha', 'beta']);
		expect(checkOf('alpha')).not.toBeNull();
		expect(checkOf('beta')).not.toBeNull();
	});

	it.each<[string, Lens, Parameters<typeof entryV2>[1]]>([
		['Favorites', FAVORITES_LENS, { favorite: true }],
		['Archive', ARCHIVE_LENS, { archived: true }],
		['a type', { kind: 'type', target: 'Project' }, { isA: 'Project' }],
		['a folder', { kind: 'folder', target: '/vault/Work' }, {}],
	])('gives no check to the rows of %s', async (_name, lens, overrides) => {
		typeDefinitionsStore.setEntries([entryV2(ALPHA, overrides)]);
		fsStore.setFileTree([
			{ name: 'Work', path: '/vault/Work', isDirectory: true, children: [{ name: 'alpha.md', path: ALPHA, isDirectory: false }] },
		]);
		await mountList(lens);

		expect(rowTitles()).toEqual(['alpha']);
		expect(target.querySelector('[data-note-row-organize]')).toBeNull();
	});

	it('marks the row\'s note organized on disk while another note is active, and the row leaves once the index has it', async () => {
		editorStore.addTab({ path: BETA, name: 'beta.md', content: BETA_DISK, savedContent: BETA_DISK });
		typeDefinitionsStore.setEntries([entryV2(ALPHA, { modifiedAt: 200 }), entryV2(BETA, { modifiedAt: 100 })]);
		await mountList();
		expect(count()).toBe('2');

		checkOf('alpha')!.click();
		await vi.waitFor(() => expect(disk.get(ALPHA)).toBe('---\n_organized: true\n---\n\n# Alpha\n'));

		expect(disk.get(BETA)).toBe(BETA_DISK);
		expect(editorStore.activeTab?.path).toBe(BETA);
		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(vaultStore.takePromptIndexRefresh()).toBe(true);
		expect(toast.success).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();

		// The index refresh hands the list the updated entry.
		typeDefinitionsStore.setEntries([entryV2(ALPHA, { modifiedAt: 300, organized: true }), entryV2(BETA, { modifiedAt: 100 })]);
		await settle();

		expect(rowTitles()).toEqual(['beta']);
		expect(count()).toBe('1');
	});

	it('opens no row menu on a right-click on the check', async () => {
		typeDefinitionsStore.setEntries([entryV2(ALPHA)]);
		await mountList();

		const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 });
		checkOf('alpha')!.dispatchEvent(event);
		await settle();

		expect(event.defaultPrevented).toBe(true);
		expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(0);
	});
});
