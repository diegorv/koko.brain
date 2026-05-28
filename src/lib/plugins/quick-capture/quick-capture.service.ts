import { listen } from '@tauri-apps/api/event';
import { toast } from 'svelte-sonner';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { executeAction } from '$lib/features/deep-link/deep-link.service';
import type { CaptureAction, CaptureKind } from '$lib/features/deep-link/deep-link.types';
import { debug, error } from '$lib/utils/debug';

/**
 * Event emitted by the Rust side (`quick_capture::commands::capture_clipboard_now`
 * and the global-shortcut dispatcher in `lib.rs`) when a clipboard capture is
 * detected. The payload mirrors a kokobrain `CaptureAction` minus the `vault`
 * field, which the frontend fills from `vaultStore` before dispatching.
 */
export const QC_CAPTURE_DETECTED_EVENT = 'qc:capture-detected';

/**
 * Partial `CaptureAction` shape emitted by the Rust side. Missing `vault`,
 * which the frontend fills from `vaultStore` before dispatching. Image
 * clipboard bytes are always materialized to a temp file path by the Rust
 * side before this is emitted, so every shot payload carries a real `path`.
 */
export interface QuickCaptureDetectedPayload {
	type: 'capture';
	kind: CaptureKind;
	text?: string;
	url?: string;
	title?: string | null;
	path?: string;
	mime?: string;
	originalName?: string | null;
	capturedAt?: string;
	/** macOS bundle id of the app that was frontmost when the capture fired. */
	sourceApp?: string;
	/** Browser tab title (Chrome / Safari only). */
	sourceTitle?: string;
	/** Browser tab URL (Chrome / Safari only). */
	sourceUrl?: string;
}

/**
 * Registers the Tauri event listener that routes a Rust-detected clipboard
 * capture into kokobrain's `executeAction` pipeline. The handler reads the
 * active vault from `vaultStore`, fills `vault` (name) on the payload, and
 * dispatches through the same code path the `kokobrain://capture` URI uses.
 *
 * Returns a cleanup function to unsubscribe (mirrors the pattern in
 * `registerDeepLinkListener` and `registerMenuSettingsListener`).
 */
export function registerQuickCaptureListener(): () => void {
	let cancelled = false;
	let unlisten: (() => void) | undefined;
	// Serialize capture handling. A multi-file clipboard capture emits one
	// `qc:capture-detected` event per file in a tight Rust-side loop; running
	// the handlers concurrently lets two writes resolve the same
	// timestamp-based filename and overwrite each other. Chaining each handler
	// after the previous one completes keeps the writes ordered (and makes the
	// exists()-then-write uniqueness guard in `executeCaptureAction` race-free).
	let queue: Promise<void> = Promise.resolve();

	listen<QuickCaptureDetectedPayload>(QC_CAPTURE_DETECTED_EVENT, (event) => {
		queue = queue
			.then(() => handleDetectedCapture(event.payload))
			.catch((err) => {
				// Keep the queue alive: one failed capture must not stall the rest.
				error('QUICK_CAPTURE', 'Capture handler failed:', err);
			});
	})
		.then((fn) => {
			if (cancelled) fn();
			else unlisten = fn;
		})
		.catch((err) => {
			error('QUICK_CAPTURE', 'Failed to register listener:', err);
		});

	return () => {
		cancelled = true;
		unlisten?.();
	};
}

/**
 * Handles a single detected capture: fills `vault` from the active vault
 * and dispatches via `executeAction`. Exposed for unit tests so they don't
 * need a Tauri runtime.
 */
export async function handleDetectedCapture(
	payload: QuickCaptureDetectedPayload,
): Promise<void> {
	const vaultPath = vaultStore.path;
	const vaultName = vaultStore.name;
	if (!vaultPath || !vaultName) {
		error('QUICK_CAPTURE', 'No vault open; ignoring capture');
		toast.error('Open a vault before capturing');
		return;
	}

	const action = buildCaptureAction(payload, vaultName);
	if (!action) {
		error('QUICK_CAPTURE', 'Invalid capture payload:', payload);
		return;
	}

	debug('QUICK_CAPTURE', 'Dispatching capture:', action.kind);
	await executeAction(action, vaultPath);
}

/**
 * Assemble a typed `CaptureAction` from the Rust payload + the active vault
 * name. Returns `null` when the payload is missing the required field for its
 * `kind` (defensive — Rust always emits the right fields, but the type
 * narrowing pays for itself in tests).
 */
export function buildCaptureAction(
	payload: QuickCaptureDetectedPayload,
	vaultName: string,
): CaptureAction | null {
	const common = {
		type: 'capture' as const,
		vault: vaultName,
		capturedAt: payload.capturedAt,
		sourceApp: payload.sourceApp,
		sourceTitle: payload.sourceTitle,
		sourceUrl: payload.sourceUrl,
	};

	switch (payload.kind) {
		case 'note':
			if (typeof payload.text !== 'string') return null;
			return { ...common, kind: 'note', text: payload.text };
		case 'clip':
			if (typeof payload.text !== 'string') return null;
			return { ...common, kind: 'clip', text: payload.text };
		case 'link':
			if (typeof payload.url !== 'string') return null;
			return {
				...common,
				kind: 'link',
				url: payload.url,
				title: payload.title ?? undefined,
			};
		case 'shot':
			if (typeof payload.path !== 'string' || payload.path.length === 0) return null;
			return {
				...common,
				kind: 'shot',
				path: payload.path,
				mime: payload.mime,
			};
		case 'file':
			if (typeof payload.path !== 'string' || payload.path.length === 0) return null;
			return {
				...common,
				kind: 'file',
				path: payload.path,
				mime: payload.mime,
				originalName: payload.originalName ?? undefined,
			};
	}
}
