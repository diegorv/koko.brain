// The `.view` writers against the real editor service, stores, `editor.hooks`
// and note-change owner, with only plugin-fs and `invoke` mocked at the Tauri
// boundary: a `.view` open in a tab must not lose either its buffer or the
// written key, and writes of one path must not interleave.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readDir: vi.fn(),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

// The log writer stands in for its own Tauri file write, which would otherwise
// land in the `writeTextFile` mock and in its call assertions.
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { onContentChange, resetEditor, saveFileByPath } from '#lib/core/editor/editor.service.js';
import { areAllRecentSaves, resetHooks } from '#lib/core/editor/editor.hooks.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import {
	setViewRailPin,
	updateViewIcon,
	ViewWriteError,
} from '#lib/features/type-definitions/type-definitions.service.js';
import { updateViewRailYaml } from '#lib/features/type-definitions/type-sidebar.logic.js';

const VIEW = '/vault/Projects.view';
const SAVED = '_sidebar_label: Projects\nviews:\n  - type: table\n';
const EDITED = '_sidebar_label: Edited\nviews:\n  - type: table\n';

/** In-memory disk behind the plugin-fs mocks. */
const disk = new Map<string, string>();
/** While set, every read takes its bytes at call time and returns them once this resolves. */
let readGate: Promise<void> | null = null;
/** While set, the next write waits for it before it lands on disk. */
let nextWriteGate: Promise<void> | null = null;
/** Called inside a write, before it lands. */
let duringWrite: (() => void) | null = null;

/** A promise with its resolver exposed, to hold an `await` open mid-call. */
function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((res) => { resolve = res; });
	return { promise, resolve };
}

/** Lets every queued microtask run. */
async function flush(): Promise<void> {
	for (let i = 0; i < 20; i++) await Promise.resolve();
}

/** The open tab for `path`. */
function tabFor(path: string) {
	return editorStore.tabs.find((t) => t.path === path);
}

/** Opens a tab for `path`, dirty when `content` differs from `savedContent`. */
function openTab(path: string, content: string, savedContent = content): void {
	editorStore.addTab({ path, name: path.split('/').pop() ?? path, content, savedContent, fileType: 'collection' });
}

/** The `invoke` calls made for one Tauri command. */
function invokesOf(cmd: string): unknown[][] {
	return vi.mocked(invoke).mock.calls.filter(([c]) => c === cmd);
}

/** The `.view` on disk, parsed. */
function diskYaml(): unknown {
	return parseYaml(disk.get(VIEW) ?? '');
}

describe('rewriteViewFile through the .view writers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		resetHooks();
		clearAllIndexed();
		editorStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		disk.clear();
		readGate = null;
		nextWriteGate = null;
		duringWrite = null;
		vi.mocked(invoke).mockResolvedValue(undefined as never);
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			const content = disk.get(String(p));
			if (readGate) await readGate;
			if (content === undefined) throw new Error(`not found: ${String(p)}`);
			return content;
		});
		vi.mocked(writeTextFile).mockImplementation(async (p, data, options) => {
			const path = String(p);
			const gate = nextWriteGate;
			nextWriteGate = null;
			if (gate) await gate;
			duringWrite?.();
			// Tauri refuses to open a missing file for writing with `create: false`.
			if ((options as { create?: boolean } | undefined)?.create === false && !disk.has(path)) {
				throw new Error(`not found: ${path}`);
			}
			disk.set(path, String(data));
		});
		vi.mocked(exists).mockImplementation(async (p) => disk.has(String(p)));
	});

	afterEach(() => {
		vi.useRealTimers();
		resetEditor();
		resetHooks();
		vaultStore._reset();
		clearLocalStorage();
	});

	it('keeps the buffer of a dirty tab and the pin through the autosave, and leaves the tab clean', async () => {
		vi.useFakeTimers();
		disk.set(VIEW, SAVED);
		openTab(VIEW, SAVED);
		onContentChange(EDITED);

		await setViewRailPin(VIEW, true);
		await vi.advanceTimersByTimeAsync(10_000);

		expect(diskYaml()).toEqual({ _sidebar_label: 'Edited', _rail: true, views: [{ type: 'table' }] });
		expect(tabFor(VIEW)?.content).toBe(disk.get(VIEW));
		expect(tabFor(VIEW)?.savedContent).toBe(disk.get(VIEW));
	});

	it('takes disk as the base under a clean tab with an older buffer, and shows the result in the tab at once', async () => {
		disk.set(VIEW, EDITED);
		openTab(VIEW, SAVED);
		const signal = editorStore.externalContentSignal;

		await setViewRailPin(VIEW, true);

		expect(diskYaml()).toEqual({ _sidebar_label: 'Edited', _rail: true, views: [{ type: 'table' }] });
		expect(tabFor(VIEW)?.content).toBe(disk.get(VIEW));
		expect(tabFor(VIEW)?.savedContent).toBe(disk.get(VIEW));
		expect(editorStore.externalContentSignal).toBeGreaterThan(signal);
	});

	it('keeps both keys when a pin and an icon write start while a read is held', async () => {
		disk.set(VIEW, SAVED);
		const gate = deferred();
		readGate = gate.promise;

		const pin = setViewRailPin(VIEW, true);
		const icon = updateViewIcon(VIEW, 'lucide:rocket');
		await flush();
		gate.resolve();
		await Promise.all([pin, icon]);

		expect(diskYaml()).toEqual({ _sidebar_label: 'Projects', _rail: true, _icon: 'lucide:rocket', views: [{ type: 'table' }] });
	});

	it('lands a pin after a tab save already in flight, keeping the pin', async () => {
		disk.set(VIEW, SAVED);
		openTab(VIEW, EDITED, SAVED);
		const gate = deferred();
		nextWriteGate = gate.promise;

		const save = saveFileByPath(VIEW);
		const pin = setViewRailPin(VIEW, true);
		await flush();
		gate.resolve();
		expect(await save).toBe(true);
		await pin;

		expect(diskYaml()).toEqual({ _sidebar_label: 'Edited', _rail: true, views: [{ type: 'table' }] });
		const writes = vi.mocked(writeTextFile).mock.calls.map(([, data]) => data);
		expect(writes).toEqual([EDITED, disk.get(VIEW)]);
		expect(tabFor(VIEW)?.savedContent).toBe(disk.get(VIEW));
	});

	it('does not recreate a file deleted while a write is queued', async () => {
		disk.set(VIEW, SAVED);
		const gate = deferred();
		readGate = gate.promise;

		const first = updateViewIcon(VIEW, 'lucide:rocket');
		const queued = setViewRailPin(VIEW, true);
		first.catch(() => {});
		queued.catch(() => {});
		await flush();
		disk.delete(VIEW);
		gate.resolve();

		await expect(first).rejects.toMatchObject({ reason: 'missing' });
		await expect(queued).rejects.toThrow('not found');
		expect(disk.has(VIEW)).toBe(false);
		expect(invokesOf('update_note_in_index')).toEqual([]);
	});

	it('writes a closed view with create: false, marks a recent save and indexes it in Rust only', async () => {
		disk.set(VIEW, SAVED);

		await setViewRailPin(VIEW, true);

		expect(vi.mocked(writeTextFile).mock.calls).toEqual([[VIEW, disk.get(VIEW), { create: false }]]);
		expect(invokesOf('update_note_in_index')).toEqual([['update_note_in_index', { path: VIEW, content: disk.get(VIEW) }]]);
		expect(invokesOf('update_search_index_file')).toEqual([]);
		expect(areAllRecentSaves([VIEW])).toBe(true);
	});

	it('saves through the open tab, which indexes the written bytes and marks a recent save', async () => {
		disk.set(VIEW, SAVED);
		openTab(VIEW, SAVED);

		await setViewRailPin(VIEW, true);

		expect(vi.mocked(writeTextFile).mock.calls).toEqual([[VIEW, disk.get(VIEW)]]);
		expect(invokesOf('update_note_in_index')).toEqual([['update_note_in_index', { path: VIEW, content: disk.get(VIEW) }]]);
		expect(areAllRecentSaves([VIEW])).toBe(true);
	});

	it('redoes the write on a tab opened while the existence check was pending', async () => {
		disk.set(VIEW, SAVED);
		vi.mocked(exists).mockImplementationOnce(async (p) => {
			openTab(VIEW, EDITED, SAVED);
			return disk.has(String(p));
		});

		await setViewRailPin(VIEW, true);

		expect(diskYaml()).toEqual({ _sidebar_label: 'Edited', _rail: true, views: [{ type: 'table' }] });
		expect(tabFor(VIEW)?.content).toBe(disk.get(VIEW));
		expect(tabFor(VIEW)?.savedContent).toBe(disk.get(VIEW));
	});

	it('shows the write in a tab opened while it was landing', async () => {
		disk.set(VIEW, SAVED);
		duringWrite = () => {
			duringWrite = null;
			openTab(VIEW, SAVED);
		};

		await setViewRailPin(VIEW, true);

		expect(tabFor(VIEW)?.content).toBe(disk.get(VIEW));
		expect(tabFor(VIEW)?.savedContent).toBe(disk.get(VIEW));
	});

	it('restores the buffer and rejects with save-failed when the tab save fails', async () => {
		disk.set(VIEW, SAVED);
		openTab(VIEW, EDITED, SAVED);
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const err = await setViewRailPin(VIEW, true).catch((e: unknown) => e);

		expect(err).toBeInstanceOf(ViewWriteError);
		expect((err as ViewWriteError).reason).toBe('save-failed');
		expect(tabFor(VIEW)?.content).toBe(EDITED);
		expect(disk.get(VIEW)).toBe(SAVED);
		consoleSpy.mockRestore();
	});

	it('puts back the older buffer of a clean tab, still clean, when its save fails', async () => {
		disk.set(VIEW, EDITED);
		openTab(VIEW, SAVED);
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(setViewRailPin(VIEW, true)).rejects.toMatchObject({ reason: 'save-failed' });

		expect(tabFor(VIEW)?.content).toBe(SAVED);
		expect(tabFor(VIEW)?.savedContent).toBe(SAVED);
		expect(disk.get(VIEW)).toBe(EDITED);
		consoleSpy.mockRestore();
	});

	it('writes nothing and rejects with vault-changed when the vault switches during the read', async () => {
		disk.set(VIEW, SAVED);
		const gate = deferred();
		readGate = gate.promise;

		const pin = setViewRailPin(VIEW, true);
		pin.catch(() => {});
		await flush();
		vaultStore.open('/other');
		gate.resolve();

		await expect(pin).rejects.toMatchObject({ reason: 'vault-changed' });
		expect(disk.get(VIEW)).toBe(SAVED);
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('writes the file when a clean tab already holds the result but disk differs', async () => {
		// An outside edit dropped the pin and the tab has not reloaded it yet.
		const pinned = updateViewRailYaml(SAVED, true);
		disk.set(VIEW, SAVED);
		openTab(VIEW, pinned);

		await setViewRailPin(VIEW, true);

		expect(disk.get(VIEW)).toBe(pinned);
		expect(tabFor(VIEW)?.content).toBe(pinned);
		expect(tabFor(VIEW)?.savedContent).toBe(pinned);
	});

	it('writes the file when the tab closes before its queued save runs', async () => {
		disk.set(VIEW, SAVED);
		openTab(VIEW, EDITED, SAVED);
		const read = deferred();
		readGate = read.promise;
		const write = deferred();
		nextWriteGate = write.promise;

		const pin = setViewRailPin(VIEW, true);
		await flush();
		// A tab save starts after the pin's wait for one and holds its write.
		const save = saveFileByPath(VIEW);
		await flush();
		readGate = null;
		read.resolve();
		await flush();
		// Discard: the tab closes while its save of the pinned buffer is queued.
		editorStore.removeTab(editorStore.tabs.findIndex((t) => t.path === VIEW));
		write.resolve();
		await save;
		await pin;

		expect(diskYaml()).toEqual({ _sidebar_label: 'Edited', _rail: true, views: [{ type: 'table' }] });
	});

	it('writes nothing when the transform gives back the base of a dirty tab', async () => {
		const pinned = '_rail: true\n';
		disk.set(VIEW, '_sidebar_label: Projects\n');
		openTab(VIEW, pinned, '_sidebar_label: Projects\n');

		await setViewRailPin(VIEW, true);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(tabFor(VIEW)?.content).toBe(pinned);
	});
});
