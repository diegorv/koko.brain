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

import {
	handleDetectedCapture,
	buildCaptureAction,
} from '$lib/plugins/quick-capture/quick-capture.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { toast } from 'svelte-sonner';

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
