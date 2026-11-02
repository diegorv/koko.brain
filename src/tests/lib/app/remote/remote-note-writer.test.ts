// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { remoteConnectionStore } from '#lib/app/remote/remote-connection.store.svelte.js';
import { createRemoteNoteWriter } from '#lib/app/remote/remote-note-writer.js';
import { startRemoteSession } from '#lib/app/remote/remote-session.js';
import { createRemoteTransport, REMOTE_CONFLICT_CODE } from '#lib/app/remote/remote-transport.js';
import { installTauriBridgeStandIn } from '#lib/app/remote/tauri-bridge-stand-in.js';
import { NoteConflictError } from '#lib/contracts/note-conflict.js';
import { setNoteWriter, writeNote } from '#lib/core/editor/note-write.port.js';
import { setRemoteBrowser } from '#lib/core/platform/capabilities.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { FakeSocket, flush } from './fake-socket';

vi.mock('#lib/utils/debug.js', () => ({ debug: vi.fn(), error: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

const g = window as unknown as Record<string, unknown>;

afterEach(() => {
	delete g.__TAURI_INTERNALS__;
	delete g.__TAURI_EVENT_PLUGIN_INTERNALS__;
	vaultStore.close();
	remoteConnectionStore.reset();
	setRemoteBrowser(false);
	setNoteWriter(null);
});

function connected() {
	const socket = new FakeSocket();
	const transport = createRemoteTransport({ open: () => socket });
	socket.welcome('/v');
	return { socket, write: createRemoteNoteWriter(transport.invoke) };
}

describe('createRemoteNoteWriter', () => {
	it('sends the text as the body and the path and base in the headers', async () => {
		const { socket, write } = connected();
		const done = write('/v/a b.md', '﻿new text', 'old text');
		await flush();
		expect(socket.calls[0]).toMatchObject({
			cmd: 'plugin:fs|write_text_file',
			args: { text: '﻿new text' },
			headers: { path: encodeURIComponent('/v/a b.md'), base: 'old text' },
		});
		socket.reply('plugin:fs|write_text_file', null);
		await expect(done).resolves.toBeUndefined();
	});

	it('an empty base is still sent', async () => {
		const { socket, write } = connected();
		const done = write('/v/a.md', 'x', '');
		await flush();
		expect(socket.calls[0].headers).toMatchObject({ base: '' });
		socket.reply('plugin:fs|write_text_file', null);
		await done;
	});

	it('a refusal with the conflict code is a NoteConflictError', async () => {
		const { socket, write } = connected();
		const done = write('/v/a.md', 'new', 'old');
		await flush();
		socket.fail('plugin:fs|write_text_file', 'Conflict: the note changed on the Mac: /v/a.md', REMOTE_CONFLICT_CODE);
		const err = await done.catch((e) => e);
		expect(err).toBeInstanceOf(NoteConflictError);
		expect(err.path).toBe('/v/a.md');
	});

	it('any other error passes through unchanged', async () => {
		const { socket, write } = connected();
		const done = write('/v/a.md', 'new', 'old');
		await flush();
		socket.fail('plugin:fs|write_text_file', 'failed to write file at path: /v/a.md: disk full');
		const err = await done.catch((e) => e);
		expect(err).not.toBeInstanceOf(NoteConflictError);
		expect(err.message).toContain('disk full');
	});

	it('the browser session installs it as the editor note writer', async () => {
		const socket = new FakeSocket();
		const invoke = startRemoteSession({ open: () => socket, reload: vi.fn() });
		installTauriBridgeStandIn({ hasTauriRuntime: false, connect: () => invoke });
		socket.welcome('/v');
		const done = writeNote('/v/a.md', 'new', 'old');
		await flush();
		expect(socket.calls.at(-1)).toMatchObject({ cmd: 'plugin:fs|write_text_file', headers: { base: 'old' } });
		socket.reply('plugin:fs|write_text_file', null);
		await done;
	});
});
