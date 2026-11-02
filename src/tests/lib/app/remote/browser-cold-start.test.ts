// @vitest-environment jsdom
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { startRemoteSession } from '#lib/app/remote/remote-session.js';
import { installTauriBridgeStandIn } from '#lib/app/remote/tauri-bridge-stand-in.js';
import { FakeSocket } from './fake-socket';

/**
 * Records the IPC sequence of a browser cold start: the layout's listeners,
 * the `teardownVault` the layout runs at mount before a vault is open, then
 * `initializeVault`, then `teardownVault`. Real app modules, real
 * `@tauri-apps/*` JS, the real bridge stand-in and the real session (whose
 * welcome opens the vault, as in the browser); only the host is canned. The
 * canned settings turn on Sentry and Tauri debug mode, so the recording
 * carries the calls that would flip the desktop's flags if they ran. The sequence is committed to
 * `src-tauri/tests/fixtures/browser-cold-start.json`, which
 * `remote_cold_start_test.rs` replays against the real host to prove the
 * desktop is untouched. When boot code changes the sequence, re-record:
 * `UPDATE_COLD_START=1 pnpm vitest run <this file>`.
 */

const VAULT = '/vault';
const FIXTURE = join(process.cwd(), 'src-tauri/tests/fixtures/browser-cold-start.json');

interface RecordedCall {
	cmd: string;
	args: unknown;
	headers: unknown;
}

/** Settings that make the boot send `configure_sentry` and `set_tauri_debug_mode` with `enabled: true`. */
const SETTINGS = {
	debugModeTauri: true,
	sentry: { enabled: true, dsn: 'https://key@o0.ingest.sentry.io/1' },
};

/** A host with an empty vault that has a `.kokobrain/settings.json`. */
function cannedResult(cmd: string, args: Record<string, unknown> | null): unknown {
	const path = typeof args?.path === 'string' ? args.path : '';
	switch (cmd) {
		case 'plugin:fs|exists':
			return path === `${VAULT}/.kokobrain` || path === `${VAULT}/.kokobrain/settings.json`;
		case 'plugin:fs|read_text_file':
			return [...new TextEncoder().encode(JSON.stringify(SETTINGS))];
		case 'plugin:fs|read_dir':
		case 'scan_vault':
		case 'get_all_vault_entries_v2':
		case 'get_all_tags_v2':
		case 'get_all_tasks_v2':
		case 'get_all_property_records':
			return [];
		case 'scan_vault_v2_cached':
			return { source: 'cache', entryCount: 0, loadMs: 0, filesReread: 0 };
		case 'plugin:event|listen':
			return 1;
		case 'cleanup_history':
			return 0;
		default:
			return null;
	}
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

async function recordColdStart(): Promise<RecordedCall[]> {
	const socket = new FakeSocket();
	const recorded: RecordedCall[] = [];
	const send = socket.send.bind(socket);
	socket.send = (data: string) => {
		send(data);
		const message = JSON.parse(data);
		if (message.method !== 'invoke') return;
		const { cmd, args, headers } = message.params;
		recorded.push({ cmd, args, headers });
		queueMicrotask(() => socket.receive({ jsonrpc: '2.0', id: message.id, result: cannedResult(cmd, args) }));
	};
	const invoke = startRemoteSession({ open: () => socket, reload: () => {} });
	installTauriBridgeStandIn({ hasTauriRuntime: false, connect: () => invoke });
	socket.welcome(VAULT);

	const listeners = await import('#lib/app/tauri-listeners.service.js');
	const { registerDeepLinkListener } = await import('#lib/features/deep-link/deep-link.service.js');
	const { registerQuickCaptureListener } = await import('#lib/plugins/quick-capture/quick-capture.service.js');
	const { registerAppPorts } = await import('#lib/app/boot.js');
	const { initializeVault, teardownVault } = await import('#lib/app/lifecycle/app-lifecycle.service.js');

	registerAppPorts();
	const unlisten = [
		listeners.registerMenuSettingsListener(),
		listeners.registerCloseHandler(),
		registerDeepLinkListener(),
		registerQuickCaptureListener(),
		listeners.registerFocusListener(),
		listeners.registerVaultIndexUpdatedListener(),
	];
	await settle();
	teardownVault();
	await settle();
	await initializeVault(VAULT);
	await settle();
	teardownVault();
	await settle();
	for (const stop of unlisten) stop();
	await settle();
	return recorded;
}

describe('browser cold start', () => {
	it('matches the recorded command sequence the host test replays', async () => {
		const recorded = await recordColdStart();
		if (process.env.UPDATE_COLD_START === '1') {
			writeFileSync(FIXTURE, `${JSON.stringify({ vault: VAULT, calls: recorded }, null, '\t')}\n`);
		}
		const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as { vault: string; calls: RecordedCall[] };
		const cmds = recorded.map((c) => c.cmd);
		expect(cmds).toContain('open_vault_db');
		expect(cmds).toContain('scan_vault');
		// Only reached when the welcome opened the vault in vaultStore.
		expect(cmds).toContain('build_search_index');
		const args = (cmd: string) => recorded.filter((c) => c.cmd === cmd).map((c) => c.args);
		expect(args('set_tauri_debug_mode')).toContainEqual({ enabled: true });
		expect(args('configure_sentry')).toContainEqual(expect.objectContaining({ enabled: true }));
		expect(fixture.vault).toBe(VAULT);
		expect(recorded).toEqual(fixture.calls);
	});
});
