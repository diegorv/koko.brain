import { describe, it, expect, beforeEach } from 'vitest';
import { lanSyncStore } from '$lib/plugins/lan-sync/lan-sync.store.svelte';
import {
	canSubmitPush,
	formatBytes,
} from '$lib/plugins/lan-sync/PushFolderDialog.logic';
import type {
	PushComplete,
	PushProgress,
	TrustedPeer,
} from '$lib/plugins/lan-sync/lan-sync.types';

/**
 * Tests for `PushFolderDialog`.
 *
 * The project's vitest config does NOT include `@testing-library/svelte` or a
 * DOM environment, so component-mount tests aren't viable here. Coverage is
 * split between:
 *   1. `formatBytes` + `canSubmitPush` pure-logic units, and
 *   2. Store-driven assertions for the conditional-render branches the
 *      component depends on. These keep the contract between
 *      `lanSyncStore.pushProgress` / `lastPushComplete` and the dialog's
 *      "show progress / show success / show error" gates pinned.
 */

function makeTrusted(fp: string, displayName: string | null = null): TrustedPeer {
	return {
		fingerprintHex: fp,
		fingerprintDisplay: `${fp}-words`,
		publicKeyB64: 'AAAA',
		displayName,
		trustedAtMs: 1_700_000_000_000,
	};
}

function makeProgress(overrides: Partial<PushProgress> = {}): PushProgress {
	return {
		peerFingerprint: 'fp1',
		filesDone: 0,
		filesTotal: 0,
		bytesDone: 0,
		bytesTotal: 0,
		...overrides,
	};
}

describe('PushFolderDialog.logic', () => {
	describe('formatBytes', () => {
		it('formats 0 bytes as "0 B"', () => {
			expect(formatBytes(0)).toBe('0 B');
		});

		it('formats a single byte', () => {
			expect(formatBytes(1)).toBe('1 B');
		});

		it('formats sub-KB sizes without a unit jump', () => {
			expect(formatBytes(1023)).toBe('1023 B');
		});

		it('formats exactly 1 KB', () => {
			expect(formatBytes(1024)).toBe('1.0 KB');
		});

		it('formats 1.5 MB', () => {
			expect(formatBytes(1024 * 1024 * 1.5)).toBe('1.5 MB');
		});

		it('formats 1 GB', () => {
			expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
		});

		it('coerces negative input to "0 B"', () => {
			expect(formatBytes(-100)).toBe('0 B');
		});

		it('coerces non-finite input to "0 B"', () => {
			expect(formatBytes(Number.NaN)).toBe('0 B');
			expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('0 B');
		});
	});

	describe('canSubmitPush', () => {
		it('returns false when peer fingerprint is empty', () => {
			expect(canSubmitPush('', 'target', false)).toBe(false);
		});

		it('returns false when target rel path is empty', () => {
			expect(canSubmitPush('fp1', '', false)).toBe(false);
		});

		it('returns false when target rel path is whitespace-only', () => {
			expect(canSubmitPush('fp1', '   \t  ', false)).toBe(false);
		});

		it('returns false when a push is in progress', () => {
			expect(canSubmitPush('fp1', 'target', true)).toBe(false);
		});

		it('returns true when peer + target are set and no push is in flight', () => {
			expect(canSubmitPush('fp1', 'Notes/Sub', false)).toBe(true);
		});

		it('treats target with surrounding whitespace as valid when trim non-empty', () => {
			expect(canSubmitPush('fp1', '  Notes  ', false)).toBe(true);
		});
	});
});

describe('PushFolderDialog (store contract)', () => {
	beforeEach(() => {
		lanSyncStore.reset();
	});

	describe('trusted peers gate', () => {
		it('exposes empty trustedPeers initially (empty-state branch)', () => {
			expect(lanSyncStore.trustedPeers).toEqual([]);
		});

		it('exposes the trusted peers list (peer-picker branch)', () => {
			const peers = [makeTrusted('a', 'Laptop'), makeTrusted('b')];
			lanSyncStore.setTrustedPeers(peers);
			expect(lanSyncStore.trustedPeers).toEqual(peers);
		});
	});

	describe('push-in-progress gate', () => {
		it('isPushInProgress is false when no progress event has arrived', () => {
			expect(lanSyncStore.isPushInProgress).toBe(false);
		});

		it('isPushInProgress is true when filesDone < filesTotal', () => {
			lanSyncStore.setPushProgress(makeProgress({ filesDone: 2, filesTotal: 5 }));
			expect(lanSyncStore.isPushInProgress).toBe(true);
		});

		it('isPushInProgress is false when filesDone === filesTotal', () => {
			lanSyncStore.setPushProgress(makeProgress({ filesDone: 5, filesTotal: 5 }));
			expect(lanSyncStore.isPushInProgress).toBe(false);
		});

		it('pushPercent reflects byte progress', () => {
			lanSyncStore.setPushProgress(makeProgress({ bytesDone: 250, bytesTotal: 1000 }));
			expect(lanSyncStore.pushPercent).toBe(25);
		});

		it('pushPercent is 0 when bytesTotal is 0', () => {
			lanSyncStore.setPushProgress(makeProgress({ bytesDone: 0, bytesTotal: 0 }));
			expect(lanSyncStore.pushPercent).toBe(0);
		});
	});

	describe('progress + completion peer matching', () => {
		it('progress is scoped by peerFingerprint so the dialog can filter to its peer', () => {
			lanSyncStore.setPushProgress(makeProgress({
				peerFingerprint: 'other-peer',
				filesDone: 1,
				filesTotal: 4,
			}));
			expect(lanSyncStore.pushProgress?.peerFingerprint).toBe('other-peer');
		});

		it('lastPushComplete carries the peer fingerprint for success rendering', () => {
			const complete: PushComplete = { peerFingerprint: 'fp1', filesTransferred: 7 };
			lanSyncStore.setLastPushComplete(complete);
			expect(lanSyncStore.lastPushComplete).toEqual(complete);
			expect(lanSyncStore.lastPushComplete?.error).toBeUndefined();
		});

		it('lastPushComplete carries the error string for error rendering', () => {
			const complete: PushComplete = {
				peerFingerprint: 'fp1',
				filesTransferred: 3,
				error: 'connection refused',
			};
			lanSyncStore.setLastPushComplete(complete);
			expect(lanSyncStore.lastPushComplete?.error).toBe('connection refused');
		});

		it('try-again clears lastPushComplete via the store setter', () => {
			lanSyncStore.setLastPushComplete({
				peerFingerprint: 'fp1',
				filesTransferred: 0,
				error: 'boom',
			});
			lanSyncStore.setLastPushComplete(null);
			expect(lanSyncStore.lastPushComplete).toBeNull();
		});
	});

	describe('formatBytes integration with store progress', () => {
		it('renders both transferred + total byte counts in human-readable form', () => {
			lanSyncStore.setPushProgress(makeProgress({
				bytesDone: 1024 * 1024 * 2.5,
				bytesTotal: 1024 * 1024 * 10,
			}));
			const progress = lanSyncStore.pushProgress!;
			expect(formatBytes(progress.bytesDone)).toBe('2.5 MB');
			expect(formatBytes(progress.bytesTotal)).toBe('10.0 MB');
		});
	});
});
