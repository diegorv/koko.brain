import { describe, it, expect, beforeEach } from 'vitest';
import { lanSyncStore } from '$lib/plugins/lan-sync/lan-sync.store.svelte';
import {
	createPairingPromptState,
	handleOpenChange,
	runPair,
	shouldDialogBeOpen,
	type PairingPromptService,
	type PairingPromptState,
} from '$lib/plugins/lan-sync/PairingPrompt.logic';
import type { PairingIncoming, TrustedPeer } from '$lib/plugins/lan-sync/lan-sync.types';

/**
 * Captured respondToPair call signature, mirroring the service argument list.
 */
interface RespondCall {
	vaultPath: string;
	requestId: string;
	accept: boolean;
}

/**
 * Fake `PairingPromptService` with a recorded call log and configurable
 * response/error per call. Mirrors the spirit of the service test transport.
 * The component only exercises the responder-side service surface; the
 * initiator path is tested separately in `lan-sync.service.test.ts` and
 * driven by `LanSyncSettings` in production.
 */
interface FakePairingService extends PairingPromptService {
	/** Mutable log of every invocation. */
	calls: RespondCall[];
	/** When set, the next call resolves with this value. Cleared after use. */
	nextResponse: TrustedPeer | null | undefined;
	/** When set, the next call rejects with this error. Cleared after use. */
	nextError: Error | undefined;
	/** When set, the call hangs on this promise (test resolves manually). */
	holdPromise: Promise<TrustedPeer | null> | undefined;
}

function createFakeService(): FakePairingService {
	const svc: FakePairingService = {
		calls: [],
		nextResponse: undefined,
		nextError: undefined,
		holdPromise: undefined,
		async respondToPair(vaultPath, requestId, accept) {
			svc.calls.push({ vaultPath, requestId, accept });
			if (svc.holdPromise) {
				const p = svc.holdPromise;
				svc.holdPromise = undefined;
				return p;
			}
			if (svc.nextError) {
				const err = svc.nextError;
				svc.nextError = undefined;
				throw err;
			}
			const response = svc.nextResponse === undefined ? null : svc.nextResponse;
			svc.nextResponse = undefined;
			// Service contract: respondToPair clears pendingPair in its finally block.
			lanSyncStore.setPendingPair(null);
			return response;
		},
	};
	return svc;
}

const VAULT = '/tmp/vault';

function makePair(overrides: Partial<PairingIncoming> = {}): PairingIncoming {
	return {
		fingerprintHex: 'peer0123456789ab',
		fingerprintDisplay: 'apple-banana-cherry-date-elder-fig',
		addr: '192.168.1.42',
		port: 4747,
		requestId: 'req-1',
		...overrides,
	};
}

function makeTrusted(fp: string): TrustedPeer {
	return {
		fingerprintHex: fp,
		fingerprintDisplay: `${fp}-words`,
		publicKeyB64: 'AAAA',
		displayName: null,
		trustedAtMs: 1_700_000_000_000,
	};
}

describe('PairingPrompt.logic', () => {
	beforeEach(() => {
		lanSyncStore.reset();
	});

	describe('shouldDialogBeOpen', () => {
		it('returns false when pendingPair is null', () => {
			expect(shouldDialogBeOpen(null)).toBe(false);
		});

		it('returns true when pendingPair is set', () => {
			expect(shouldDialogBeOpen(makePair())).toBe(true);
		});

		it('tracks the store pendingPair value', () => {
			expect(shouldDialogBeOpen(lanSyncStore.pendingPair)).toBe(false);
			const pair = makePair();
			lanSyncStore.setPendingPair(pair);
			expect(shouldDialogBeOpen(lanSyncStore.pendingPair)).toBe(true);
			lanSyncStore.setPendingPair(null);
			expect(shouldDialogBeOpen(lanSyncStore.pendingPair)).toBe(false);
		});
	});

	describe('createPairingPromptState', () => {
		it('builds an idle state with empty error and submitting=false', () => {
			const state = createPairingPromptState();
			expect(state).toEqual({ submitting: false, error: '' });
		});

		it('returns a fresh object on every call (no shared reference)', () => {
			const a = createPairingPromptState();
			const b = createPairingPromptState();
			a.submitting = true;
			a.error = 'boom';
			expect(b).toEqual({ submitting: false, error: '' });
		});
	});

	describe('runPair — accept', () => {
		it('invokes service.respondToPair with the pendingPair requestId and accept=true', async () => {
			const state = createPairingPromptState();
			const svc = createFakeService();
			svc.nextResponse = makeTrusted('peer0123456789ab');
			const pair = makePair();
			lanSyncStore.setPendingPair(pair);

			await runPair(state, svc, VAULT, lanSyncStore.pendingPair, true);

			expect(svc.calls).toHaveLength(1);
			expect(svc.calls[0]).toEqual({
				vaultPath: VAULT,
				requestId: pair.requestId,
				accept: true,
			});
		});

		it('after the call returns, the store pendingPair has been cleared (service contract)', async () => {
			const state = createPairingPromptState();
			const svc = createFakeService();
			svc.nextResponse = makeTrusted('peer0123456789ab');
			lanSyncStore.setPendingPair(makePair());

			await runPair(state, svc, VAULT, lanSyncStore.pendingPair, true);

			expect(lanSyncStore.pendingPair).toBeNull();
		});

		it('leaves state.error empty and state.submitting false on success', async () => {
			const state = createPairingPromptState();
			const svc = createFakeService();
			svc.nextResponse = makeTrusted('peer0123456789ab');
			lanSyncStore.setPendingPair(makePair());

			await runPair(state, svc, VAULT, lanSyncStore.pendingPair, true);

			expect(state.error).toBe('');
			expect(state.submitting).toBe(false);
		});
	});

	describe('runPair — reject', () => {
		it('invokes service.respondToPair with accept=false and the pendingPair requestId', async () => {
			const state = createPairingPromptState();
			const svc = createFakeService();
			const pair = makePair();
			lanSyncStore.setPendingPair(pair);

			await runPair(state, svc, VAULT, lanSyncStore.pendingPair, false);

			expect(svc.calls).toHaveLength(1);
			expect(svc.calls[0].accept).toBe(false);
			expect(svc.calls[0].requestId).toBe(pair.requestId);
		});

		it('clears pendingPair via the service contract', async () => {
			const state = createPairingPromptState();
			const svc = createFakeService();
			lanSyncStore.setPendingPair(makePair());
			await runPair(state, svc, VAULT, lanSyncStore.pendingPair, false);
			expect(lanSyncStore.pendingPair).toBeNull();
		});
	});

	describe('runPair — submitting flag', () => {
		it('flips submitting to true while in flight and back to false after settle', async () => {
			const state = createPairingPromptState();
			const svc = createFakeService();
			let resolveCall: (v: TrustedPeer | null) => void = () => {};
			svc.holdPromise = new Promise<TrustedPeer | null>((res) => {
				resolveCall = res;
			});
			lanSyncStore.setPendingPair(makePair());

			const pending = runPair(state, svc, VAULT, lanSyncStore.pendingPair, true);
			// Microtask drains the synchronous portion up to the await.
			await Promise.resolve();
			expect(state.submitting).toBe(true);

			resolveCall(makeTrusted('peer0123456789ab'));
			await pending;
			expect(state.submitting).toBe(false);
		});
	});

	describe('runPair — error handling', () => {
		it('captures the error message on rejection', async () => {
			const state = createPairingPromptState();
			const svc = createFakeService();
			svc.nextError = new Error('handshake failed');
			lanSyncStore.setPendingPair(makePair());

			await runPair(state, svc, VAULT, lanSyncStore.pendingPair, true);

			expect(state.error).toBe('handshake failed');
			expect(state.submitting).toBe(false);
		});

		it('coerces non-Error rejections to string', async () => {
			const state = createPairingPromptState();
			const svc: FakePairingService = createFakeService();
			// Override respondToPair for this one test to throw a non-Error.
			svc.respondToPair = async () => {
				throw 'plain string';
			};
			lanSyncStore.setPendingPair(makePair());

			await runPair(state, svc, VAULT, lanSyncStore.pendingPair, true);

			expect(state.error).toBe('plain string');
		});

		it('clears a previous error before the next attempt', async () => {
			const state = createPairingPromptState();
			state.error = 'previous failure';
			const svc = createFakeService();
			svc.nextResponse = makeTrusted('peer0123456789ab');
			lanSyncStore.setPendingPair(makePair());

			await runPair(state, svc, VAULT, lanSyncStore.pendingPair, true);

			expect(state.error).toBe('');
		});

		it('clears submitting even when the service throws', async () => {
			const state = createPairingPromptState();
			const svc = createFakeService();
			svc.nextError = new Error('nope');
			lanSyncStore.setPendingPair(makePair());

			await runPair(state, svc, VAULT, lanSyncStore.pendingPair, true);

			expect(state.submitting).toBe(false);
		});
	});

	describe('runPair — defensive guard', () => {
		it('is a no-op when pendingPair is null (no service call, no state change)', async () => {
			const state = createPairingPromptState();
			const svc = createFakeService();

			await runPair(state, svc, VAULT, null, true);

			expect(svc.calls).toHaveLength(0);
			expect(state).toEqual({ submitting: false, error: '' });
		});
	});

	describe('handleOpenChange', () => {
		it('is a no-op when the dialog is opening (open=true)', async () => {
			const state = createPairingPromptState();
			const svc = createFakeService();
			lanSyncStore.setPendingPair(makePair());

			await handleOpenChange(true, state, svc, VAULT, lanSyncStore.pendingPair);

			expect(svc.calls).toHaveLength(0);
		});

		it('is a no-op when pendingPair is null (post-completion close)', async () => {
			const state = createPairingPromptState();
			const svc = createFakeService();

			await handleOpenChange(false, state, svc, VAULT, null);

			expect(svc.calls).toHaveLength(0);
		});

		it('forwards a dismissal as Reject when pendingPair is still set', async () => {
			const state = createPairingPromptState();
			const svc = createFakeService();
			const pair = makePair();
			lanSyncStore.setPendingPair(pair);

			await handleOpenChange(false, state, svc, VAULT, lanSyncStore.pendingPair);

			expect(svc.calls).toHaveLength(1);
			expect(svc.calls[0].accept).toBe(false);
			expect(svc.calls[0].requestId).toBe(pair.requestId);
		});

		it('does not double-fire while a request is already in flight', async () => {
			const state: PairingPromptState = { submitting: true, error: '' };
			const svc = createFakeService();
			lanSyncStore.setPendingPair(makePair());

			await handleOpenChange(false, state, svc, VAULT, lanSyncStore.pendingPair);

			expect(svc.calls).toHaveLength(0);
		});
	});
});
