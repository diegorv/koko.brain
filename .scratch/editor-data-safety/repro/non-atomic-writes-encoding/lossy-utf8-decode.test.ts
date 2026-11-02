// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Only the Tauri IPC boundary (`window.__TAURI_INTERNALS__.invoke`) is stubbed.
// `vi.mock('@tauri-apps/api/core')` would not reach the externalized
// `@tauri-apps/plugin-fs` package, so the real plugin-fs JS runs here:
// readTextFile -> `new TextDecoder('utf-8').decode(bytes)`, writeTextFile ->
// `new TextEncoder().encode(data)`, exactly as the app ships.
const disk = new Map<string, Uint8Array>();
const ipc = vi.fn(async (cmd: string, args?: unknown, opts?: { headers?: Record<string, string> }) => {
	if (cmd === 'plugin:fs|read_text_file') {
		const path = (args as { path: string }).path;
		const bytes = disk.get(path);
		if (!bytes) throw new Error(`ENOENT ${path}`);
		return Array.from(bytes);
	}
	if (cmd === 'plugin:fs|write_text_file') {
		const path = decodeURIComponent(opts!.headers!.path);
		disk.set(path, new Uint8Array(args as Uint8Array));
		return undefined;
	}
	return undefined;
});
(window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
	invoke: ipc,
	transformCallback: () => 0,
	unregisterCallback: () => {},
};

vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { toast } from 'svelte-sonner';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { openFileInEditor, saveFileByPath } from '#lib/core/editor/editor.service.js';

/** "café São Paulo\n" encoded as Windows-1252 / Latin-1 (not valid UTF-8). */
const LATIN1_NOTE = new Uint8Array([
	0x63, 0x61, 0x66, 0xe9, 0x20, // "café "
	0x53, 0xe3, 0x6f, 0x20, // "São "
	0x50, 0x61, 0x75, 0x6c, 0x6f, 0x0a, // "Paulo\n"
]);

const PATH = '/vault/Old notes.md';

describe('F184: non-UTF-8 note opened in the editor', () => {
	beforeEach(() => {
		disk.clear();
		ipc.mockClear();
		vi.mocked(toast.error).mockClear();
		editorStore.reset();
	});

	it('sanity: the stubbed IPC really serves a UTF-8 note', async () => {
		disk.set('/vault/ok.md', new TextEncoder().encode('café\n'));
		await openFileInEditor('/vault/ok.md');
		expect(editorStore.tabs.find((t) => t.path === '/vault/ok.md')?.content).toBe('café\n');
	});

	it('does not silently load replacement characters into the tab', async () => {
		disk.set(PATH, LATIN1_NOTE);

		await openFileInEditor(PATH);

		const tab = editorStore.tabs.find((t) => t.path === PATH);
		// Correct behavior: either refuse with a message (no tab, toast shown)
		// or decode faithfully. A tab holding U+FFFD has lost the original bytes.
		if (!tab) {
			expect(toast.error).toHaveBeenCalled();
			return;
		}
		expect(tab.content).not.toContain('�');
	});

	it('an append + save keeps the untouched original bytes intact on disk', async () => {
		disk.set(PATH, LATIN1_NOTE);

		await openFileInEditor(PATH);
		const tab = editorStore.tabs.find((t) => t.path === PATH);
		if (!tab) {
			expect(toast.error).toHaveBeenCalled();
			return;
		}

		// User appends a line at the end; the first line is not touched.
		editorStore.updateContent(tab.content + 'more\n');
		expect(await saveFileByPath(PATH)).toBe(true);

		const onDisk = disk.get(PATH)!;
		expect(Array.from(onDisk.slice(0, LATIN1_NOTE.length))).toEqual(Array.from(LATIN1_NOTE));
	});
});
