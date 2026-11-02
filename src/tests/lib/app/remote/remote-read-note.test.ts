// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

import { readTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { startRemoteSession } from '#lib/app/remote/remote-session.js';
import { remoteConnectionStore } from '#lib/app/remote/remote-connection.store.svelte.js';
import { installTauriBridgeStandIn } from '#lib/app/remote/tauri-bridge-stand-in.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { setRemoteBrowser } from '#lib/core/platform/capabilities.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { createFakeHost, missingFileMessage, type HostCall } from './fake-host';

/**
 * Reading a note in the browser: the real `@tauri-apps/plugin-fs` and
 * editor service, the real bridge stand-in and session, over an in-process
 * fake host.
 */

const VAULT = '/vault';
const NOTE = `${VAULT}/Notes/Café.md`;
const CONTENT = '---\ntags: [a]\n---\n# Café\n\n> [!note] Über\n> body\n';

let calls: HostCall[];

beforeEach(() => {
	const host = createFakeHost({ root: VAULT, files: { [NOTE]: CONTENT, [`${VAULT}/empty.md`]: '' } });
	calls = host.calls;
	const invoke = startRemoteSession({ open: () => host.socket, reload: () => {} });
	installTauriBridgeStandIn({ hasTauriRuntime: false, connect: () => invoke });
	host.socket.welcome(VAULT);
	editorStore.reset();
	vi.clearAllMocks();
});

afterEach(() => {
	const g = window as unknown as Record<string, unknown>;
	delete g.__TAURI_INTERNALS__;
	delete g.__TAURI_EVENT_PLUGIN_INTERNALS__;
	vaultStore.close();
	remoteConnectionStore.reset();
	setRemoteBrowser(false);
	editorStore.reset();
});

describe('reading a note through the host', () => {
	it('round-trips the note content byte for byte', async () => {
		await expect(readTextFile(NOTE)).resolves.toBe(CONTENT);
		expect(calls.at(-1)).toMatchObject({ cmd: 'plugin:fs|read_text_file', args: { path: NOTE } });
	});

	it('reads an empty note as empty text', async () => {
		await expect(readTextFile(`${VAULT}/empty.md`)).resolves.toBe('');
	});

	it('a missing note rejects with the host error, never empty content', async () => {
		const missing = `${VAULT}/gone.md`;
		await expect(readTextFile(missing)).rejects.toThrow(missingFileMessage(missing));
	});

	it('opening a note shows its content in a new tab', async () => {
		await openFileInEditor(NOTE);
		expect(editorStore.activeTab?.path).toBe(NOTE);
		expect(editorStore.activeTab?.content).toBe(CONTENT);
		expect(editorStore.activeTab?.savedContent).toBe(CONTENT);
	});

	it('opening a missing note opens no tab and tells the user', async () => {
		await openFileInEditor(`${VAULT}/gone.md`);
		expect(editorStore.tabs).toEqual([]);
		expect(toast.error).toHaveBeenCalledWith('Failed to open file.');
	});
});
