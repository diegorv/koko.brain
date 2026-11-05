/**
 * The typed Tauri event contract: one `EVENT_NAMES` entry per `*_EVENT` const
 * in `src-tauri/src/events.rs`, and one `EventMap` entry per name with the
 * payload Rust emits. `events-parity.test.ts` checks the names against Rust.
 */

import type {
	ComposerCaptureResult,
	DebugLogPayload,
	SemanticProgress,
	UpdateResult,
	VaultFilesChangedPayload,
} from './index.js';

/** Every event name Rust emits, keyed by its Rust const name minus `_EVENT`. */
export const EVENT_NAMES = {
	VAULT_INDEX_UPDATED: 'vault-index-updated',
	VAULT_FILES_CHANGED: 'vault-files-changed',
	SEMANTIC_INDEX_PROGRESS: 'semantic-index-progress',
	TAURI_DEBUG_LOG: 'tauri-debug-log',
	MENU_SETTINGS: 'menu:settings',
	APP_EXIT_REQUESTED: 'app:exit-requested',
	QC_CAPTURE_DETECTED: 'qc:capture-detected',
	QC_OPEN_COMPOSER: 'qc:open-composer',
	QC_COMPOSER_CAPTURE_RESULT: 'qc:composer-capture-result',
} as const;

/** A Rust-emitted event name. */
export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];

/** The payload of each event, as it arrives in JS. */
export interface EventMap {
	/** Emitted after every `VaultIndex` mutation (`commands/vault.rs`). */
	'vault-index-updated': UpdateResult;
	/** One debounced watcher burst (`commands/watcher.rs`). */
	'vault-files-changed': VaultFilesChangedPayload;
	/** Model download and index build progress (`commands/semantic.rs`). */
	'semantic-index-progress': SemanticProgress;
	/** A Rust `debug_log` line, sent by the log sink set in `lib.rs`. */
	'tauri-debug-log': DebugLogPayload;
	/** The app menu's Settings item; Rust emits `()`. */
	'menu:settings': null;
	/**
	 * Quit was requested and Rust held the exit back until the frontend runs
	 * `prepareForExit` and invokes `confirm_exit` (`lib.rs`); Rust emits `()`.
	 */
	'app:exit-requested': null;
	/**
	 * A detected clipboard capture. Rust builds it with `json!`, so no type is
	 * generated; the quick-capture plugin narrows it to its own payload type.
	 */
	'qc:capture-detected': unknown;
	/** The composer popover was shown; Rust emits `""`. */
	'qc:open-composer': string;
	/** Whether the main window wrote one composer capture (`quick_capture/commands.rs`). */
	'qc:composer-capture-result': ComposerCaptureResult;
}
