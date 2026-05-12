import type { LanSyncService } from './lan-sync.service';
import type { PairingIncoming } from './lan-sync.types';

/**
 * Minimal slice of `LanSyncService` the PairingPrompt logic depends on. Lets
 * tests inject a fake without standing up the full service surface. Only the
 * responder-side call is needed — initiator pairing is driven from the
 * discovered-peers list in `LanSyncSettings`.
 */
export interface PairingPromptService {
	/** See `LanSyncService.respondToPair`. */
	respondToPair: LanSyncService['respondToPair'];
}

/**
 * Reactive state slot the component owns. Decoupled from Svelte runes so the
 * same helpers can drive the UI and be exercised by vitest with a plain object.
 */
export interface PairingPromptState {
	/** True while a pair-with-peer invoke is in flight; gates both buttons. */
	submitting: boolean;
	/** Most recent backend error, or empty string when none. */
	error: string;
}

/** Factory for a fresh, idle prompt state. */
export function createPairingPromptState(): PairingPromptState {
	return { submitting: false, error: '' };
}

/**
 * Derives the dialog's open state from the store's pendingPair. Single source
 * of truth: a non-null pendingPair means the modal is mounted-and-visible.
 */
export function shouldDialogBeOpen(pendingPair: PairingIncoming | null): boolean {
	return pendingPair !== null;
}

/**
 * Runs `service.respondToPair(...)` against the current `pendingPair`'s
 * `requestId` and the supplied `accept` flag. Manages `submitting` + `error`
 * on the supplied state object. The service is responsible for clearing
 * `lanSyncStore.pendingPair` in its `finally` block — the caller relies on
 * store reactivity to close the dialog after this returns.
 *
 * Returns silently when `pendingPair` is null (defensive guard).
 */
export async function runPair(
	state: PairingPromptState,
	service: PairingPromptService,
	vaultPath: string,
	pendingPair: PairingIncoming | null,
	accept: boolean,
): Promise<void> {
	if (pendingPair === null) return;
	state.submitting = true;
	state.error = '';
	try {
		await service.respondToPair(vaultPath, pendingPair.requestId, accept);
	} catch (err) {
		state.error = err instanceof Error ? err.message : String(err);
	} finally {
		state.submitting = false;
	}
}

/**
 * Handler for the dialog's `onOpenChange`. When the user dismisses the modal
 * (outside-click / Escape) AND a `pendingPair` is still in the store, this
 * forwards the dismissal as a Reject so the backend session resolves. When
 * `pendingPair` is already null, this is a no-op (the dialog is closing in
 * response to a completed accept/reject).
 */
export function handleOpenChange(
	open: boolean,
	state: PairingPromptState,
	service: PairingPromptService,
	vaultPath: string,
	pendingPair: PairingIncoming | null,
): Promise<void> | void {
	if (open) return;
	if (pendingPair === null) return;
	if (state.submitting) return;
	return runPair(state, service, vaultPath, pendingPair, false);
}
