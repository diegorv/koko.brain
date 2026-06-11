import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(() => Promise.resolve(vi.fn())),
}));

vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

const { executeActionMock } = vi.hoisted(() => ({
	executeActionMock: vi.fn<(...args: unknown[]) => Promise<void>>(() => Promise.resolve()),
}));
vi.mock('$lib/features/deep-link/deep-link.service', () => ({
	executeAction: executeActionMock,
}));

import { listen } from '@tauri-apps/api/event';
import {
	registerQuickCaptureListener,
	handleDetectedCapture,
	buildCaptureAction,
	QC_CAPTURE_DETECTED_EVENT,
	type QuickCaptureDetectedPayload,
} from '$lib/plugins/quick-capture/quick-capture.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { error } from '$lib/utils/debug';
import { toast } from 'svelte-sonner';

/** Flushes pending microtasks and timer-0 macrotasks. */
function flush(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('quick-capture service', () => {
	beforeEach(() => {
		clearLocalStorage();
		vaultStore._reset();
		executeActionMock.mockClear();
		(toast.info as ReturnType<typeof vi.fn>).mockClear();
		(toast.error as ReturnType<typeof vi.fn>).mockClear();
	});

	describe('buildCaptureAction', () => {
		it('builds a note action from a note payload', () => {
			const action = buildCaptureAction(
				{
					type: 'capture',
					kind: 'note',
					text: 'hello',
					capturedAt: '2026-05-28T10:00:00Z',
				},
				'MyVault',
			);
			expect(action).toEqual({
				type: 'capture',
				vault: 'MyVault',
				kind: 'note',
				text: 'hello',
				capturedAt: '2026-05-28T10:00:00Z',
			});
		});

		it('builds a clip action from a clip payload', () => {
			const action = buildCaptureAction(
				{ type: 'capture', kind: 'clip', text: 'snippet' },
				'V',
			);
			expect(action).toMatchObject({ kind: 'clip', text: 'snippet', vault: 'V' });
		});

		it('builds a link action and drops null title', () => {
			const action = buildCaptureAction(
				{ type: 'capture', kind: 'link', url: 'https://x.dev', title: null },
				'V',
			);
			expect(action).toMatchObject({
				kind: 'link',
				url: 'https://x.dev',
				title: undefined,
			});
		});

		it('builds a shot action with mime', () => {
			const action = buildCaptureAction(
				{ type: 'capture', kind: 'shot', path: '/tmp/a.png', mime: 'image/png' },
				'V',
			);
			expect(action).toMatchObject({
				kind: 'shot',
				path: '/tmp/a.png',
				mime: 'image/png',
			});
		});

		it('builds a file action with originalName', () => {
			const action = buildCaptureAction(
				{
					type: 'capture',
					kind: 'file',
					path: '/tmp/notes.pdf',
					mime: 'application/pdf',
					originalName: 'notes.pdf',
				},
				'V',
			);
			expect(action).toMatchObject({
				kind: 'file',
				path: '/tmp/notes.pdf',
				originalName: 'notes.pdf',
			});
		});

		it('returns null for a note payload missing text', () => {
			const action = buildCaptureAction(
				{ type: 'capture', kind: 'note' },
				'V',
			);
			expect(action).toBeNull();
		});

		it('returns null for a shot payload with empty path', () => {
			const action = buildCaptureAction(
				{ type: 'capture', kind: 'shot', path: '' },
				'V',
			);
			expect(action).toBeNull();
		});
	});

	describe('handleDetectedCapture', () => {
		it('dispatches via executeAction when vault is open', async () => {
			vaultStore.open('/vault');
			await handleDetectedCapture({
				type: 'capture',
				kind: 'clip',
				text: 'thought',
				capturedAt: '2026-05-28T10:00:00Z',
			});
			expect(executeActionMock).toHaveBeenCalledTimes(1);
			const [action, vaultPath] = executeActionMock.mock.calls[0] as [
				{ type: string; kind: string; text: string; vault: string },
				string,
			];
			expect(vaultPath).toBe('/vault');
			expect(action).toMatchObject({
				type: 'capture',
				kind: 'clip',
				text: 'thought',
				vault: vaultStore.name,
			});
		});

		it('ignores a shot payload with an empty path (no executeAction, no info toast)', async () => {
			vaultStore.open('/vault');
			await handleDetectedCapture({
				type: 'capture',
				kind: 'shot',
				path: '',
				mime: 'image/png',
			});
			expect(executeActionMock).not.toHaveBeenCalled();
			expect(toast.info).not.toHaveBeenCalled();
		});

		it('shows an error toast when no vault is open', async () => {
			await handleDetectedCapture({
				type: 'capture',
				kind: 'clip',
				text: 'thought',
			});
			expect(executeActionMock).not.toHaveBeenCalled();
			expect(toast.error).toHaveBeenCalledWith('Open a vault before capturing');
		});

		it('ignores invalid payloads (kind/field mismatch)', async () => {
			vaultStore.open('/vault');
			await handleDetectedCapture({
				type: 'capture',
				kind: 'link',
			});
			expect(executeActionMock).not.toHaveBeenCalled();
		});

		it('propagates sourceApp/Title/Url from payload to action', async () => {
			vaultStore.open('/vault');
			await handleDetectedCapture({
				type: 'capture',
				kind: 'clip',
				text: 'snippet',
				capturedAt: '2026-05-28T10:00:00Z',
				sourceApp: 'com.google.Chrome',
				sourceTitle: 'Example - Chrome',
				sourceUrl: 'https://example.com',
			});
			expect(executeActionMock).toHaveBeenCalledTimes(1);
			const [action] = executeActionMock.mock.calls[0] as [
				{ sourceApp: string; sourceTitle: string; sourceUrl: string },
				string,
			];
			expect(action.sourceApp).toBe('com.google.Chrome');
			expect(action.sourceTitle).toBe('Example - Chrome');
			expect(action.sourceUrl).toBe('https://example.com');
		});
	});

	describe('registerQuickCaptureListener', () => {
		/** Event handler captured from the listen() mock */
		let capturedHandler: ((event: { payload: QuickCaptureDetectedPayload }) => void) | undefined;

		beforeEach(() => {
			capturedHandler = undefined;
			(error as ReturnType<typeof vi.fn>).mockClear();
			vi.mocked(listen).mockReset();
		});

		/** Installs a listen() mock that records the handler and resolves with unlistenFn. */
		function mockListenCapture(unlistenFn: () => void): void {
			vi.mocked(listen).mockImplementation((_event, handler) => {
				capturedHandler = handler as (event: { payload: QuickCaptureDetectedPayload }) => void;
				return Promise.resolve(unlistenFn);
			});
		}

		function clipPayload(text: string): { payload: QuickCaptureDetectedPayload } {
			return { payload: { type: 'capture', kind: 'clip', text } };
		}

		it('registers for the capture event and dispatches payloads through executeAction', async () => {
			vaultStore.open('/vault');
			mockListenCapture(vi.fn());

			const cleanup = registerQuickCaptureListener();
			await flush();

			expect(listen).toHaveBeenCalledWith(QC_CAPTURE_DETECTED_EVENT, expect.any(Function));
			expect(capturedHandler).toBeDefined();

			capturedHandler!(clipPayload('thought'));
			await flush();

			expect(executeActionMock).toHaveBeenCalledTimes(1);
			const [action, vaultPath] = executeActionMock.mock.calls[0] as [
				{ kind: string; text: string; vault: string },
				string,
			];
			expect(vaultPath).toBe('/vault');
			expect(action).toMatchObject({ kind: 'clip', text: 'thought', vault: vaultStore.name });

			cleanup();
		});

		it('serializes concurrent capture events (second waits for the first)', async () => {
			vaultStore.open('/vault');
			mockListenCapture(vi.fn());

			let resolveFirst: () => void = () => {};
			executeActionMock.mockImplementationOnce(
				() => new Promise<void>((r) => { resolveFirst = r; }),
			);

			const cleanup = registerQuickCaptureListener();
			await flush();

			// Two events arrive back-to-back (multi-file clipboard capture)
			capturedHandler!(clipPayload('first'));
			capturedHandler!(clipPayload('second'));
			await flush();

			// Second capture must NOT start while the first is still in flight
			expect(executeActionMock).toHaveBeenCalledTimes(1);

			resolveFirst();
			await flush();

			expect(executeActionMock).toHaveBeenCalledTimes(2);
			const texts = executeActionMock.mock.calls.map(
				(call) => (call[0] as { text: string }).text,
			);
			expect(texts).toEqual(['first', 'second']);

			cleanup();
		});

		it('keeps the queue alive after a failed capture', async () => {
			vaultStore.open('/vault');
			mockListenCapture(vi.fn());
			executeActionMock.mockRejectedValueOnce(new Error('write failed'));

			const cleanup = registerQuickCaptureListener();
			await flush();

			capturedHandler!(clipPayload('doomed'));
			capturedHandler!(clipPayload('survivor'));
			await flush();

			// Both captures were attempted; the failure was logged, not rethrown
			expect(executeActionMock).toHaveBeenCalledTimes(2);
			expect((executeActionMock.mock.calls[1][0] as { text: string }).text).toBe('survivor');
			expect(error).toHaveBeenCalledWith(
				'QUICK_CAPTURE',
				'Capture handler failed:',
				expect.any(Error),
			);

			cleanup();
		});

		it('cleanup unsubscribes the Tauri listener', async () => {
			const unlistenFn = vi.fn();
			mockListenCapture(unlistenFn);

			const cleanup = registerQuickCaptureListener();
			await flush();
			expect(unlistenFn).not.toHaveBeenCalled();

			cleanup();

			expect(unlistenFn).toHaveBeenCalledTimes(1);
		});

		it('cleanup before listen resolves still unsubscribes once registration settles', async () => {
			const unlistenFn = vi.fn();
			let resolveListen: (fn: () => void) => void = () => {};
			vi.mocked(listen).mockImplementation(
				() => new Promise((r) => { resolveListen = r; }),
			);

			const cleanup = registerQuickCaptureListener();
			cleanup(); // unmount races ahead of the registration promise

			resolveListen(unlistenFn);
			await flush();

			expect(unlistenFn).toHaveBeenCalledTimes(1);
		});

		it('logs and does not throw when listener registration fails', async () => {
			vi.mocked(listen).mockRejectedValue(new Error('no tauri runtime'));

			const cleanup = registerQuickCaptureListener();
			await flush();

			expect(error).toHaveBeenCalledWith(
				'QUICK_CAPTURE',
				'Failed to register listener:',
				expect.any(Error),
			);
			expect(() => cleanup()).not.toThrow();
		});
	});

	describe('buildCaptureAction (source fields)', () => {
		it('includes sourceApp/Title/Url when present', () => {
			const action = buildCaptureAction(
				{
					type: 'capture',
					kind: 'note',
					text: 'idea',
					sourceApp: 'com.apple.Safari',
					sourceTitle: 'Tab title',
					sourceUrl: 'https://x.dev',
				},
				'V',
			);
			expect(action).toMatchObject({
				kind: 'note',
				vault: 'V',
				sourceApp: 'com.apple.Safari',
				sourceTitle: 'Tab title',
				sourceUrl: 'https://x.dev',
			});
		});

		it('leaves source fields undefined when payload omits them', () => {
			const action = buildCaptureAction(
				{ type: 'capture', kind: 'note', text: 'idea' },
				'V',
			);
			expect(action).toMatchObject({ kind: 'note' });
			expect((action as { sourceApp?: string }).sourceApp).toBeUndefined();
			expect((action as { sourceTitle?: string }).sourceTitle).toBeUndefined();
			expect((action as { sourceUrl?: string }).sourceUrl).toBeUndefined();
		});
	});
});
