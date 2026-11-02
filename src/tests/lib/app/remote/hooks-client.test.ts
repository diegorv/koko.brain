// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Globals = Record<string, unknown>;
const g = window as unknown as Globals;

/** Evaluates `src/hooks.client.ts` fresh with `isTauri()` answering `runtime`. */
async function loadHooks(runtime: boolean): Promise<void> {
	vi.resetModules();
	vi.doMock('@tauri-apps/api/core', async (importOriginal) => ({
		...(await importOriginal<typeof import('@tauri-apps/api/core')>()),
		isTauri: () => runtime,
	}));
	await import('../../../../hooks.client');
}

/** Sockets the hooks opened; jsdom must not dial a real host. */
const opened: string[] = [];
class FakeWebSocket {
	onopen = null;
	onmessage = null;
	onclose = null;
	onerror = null;
	constructor(url: string) {
		opened.push(url);
	}
	send() {}
	close() {}
}

beforeEach(() => {
	opened.length = 0;
	vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.doUnmock('@tauri-apps/api/core');
	delete g.__TAURI_INTERNALS__;
	delete g.__TAURI_EVENT_PLUGIN_INTERNALS__;
});

describe('hooks.client', () => {
	it('installs the stand-in when the browser has no Tauri runtime', async () => {
		await loadHooks(false);
		const { isBridgeStandInInstalled } = await import('#lib/app/remote/tauri-bridge-stand-in.js');
		expect(isBridgeStandInInstalled()).toBe(true);
		expect(opened).toEqual([`ws://${location.host}/ws`]);
	});

	it('does not install it inside the Tauri webview', async () => {
		await loadHooks(true);
		expect(g.__TAURI_INTERNALS__).toBeUndefined();
		expect(opened).toEqual([]);
	});

	it('does not install it in E2E mode, where @tauri-apps/api/core is the e2e mock', async () => {
		const mock = await import('../../../../../e2e/mocks/tauri-core');
		expect(mock.isTauri()).toBe(true);
	});
});
