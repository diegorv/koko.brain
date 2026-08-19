import { invoke } from '@tauri-apps/api/core';
import { isAlreadyIndexed, markIndexed, clearIndexedEntry } from '$lib/utils/index-dedupe';
import { vaultRelativeKey } from '$lib/utils/path';
import { debug, error } from '$lib/utils/debug';

/**
 * Where a note change came from. Each source gets its own policy row in
 * `SOURCE_POLICY` - the rules used to live implicitly at each call site.
 *
 * - `save`    - the editor autosave / explicit save (`notifyAfterSave`)
 * - `edit`    - the layout content-effect, 1 s debounce during typing
 * - `watcher` - an external on-disk change picked up by the file watcher
 * - `create`  - the note creator, right after Rust's `create_note`
 * - `fs`      - the file explorer's create / delete / rename / move
 */
export type NoteChangeSource = 'save' | 'edit' | 'watcher' | 'create' | 'fs';

/**
 * A per-file index that has to follow a note's bytes. Consumers live in
 * `features/` and `plugins/`, so they register themselves here instead of
 * being imported by `core/` (ADR-0003 forbids the inward import).
 */
export interface NoteChangeConsumer {
	/** Short identifier, used only in error logs. */
	name: string;
	/** The note at `path` now holds `content`. Must be synchronous. */
	upsert(path: string, content: string): void;
	/** The note at `path` stopped existing. Must be synchronous. */
	remove(path: string): void;
}

/** Descriptor for one note change. `upsert` carries the new bytes, `delete` does not. */
export type NoteChange =
	| {
		kind: 'upsert';
		source: NoteChangeSource;
		/** Absolute path. Never vault-relative - see ADR-0009. */
		path: string;
		/** The note's new plaintext content. */
		content: string;
		/** Absolute vault root. Supplying it enables the FTS5 / semantic leg. */
		vaultPath?: string;
		/** Checked after the policy's yield; `true` discards the consumer fan-out. */
		isStale?: () => boolean;
	}
	| {
		kind: 'delete';
		source: NoteChangeSource;
		/** Absolute path the note is vanishing from. */
		path: string;
		/** Absolute vault root. Supplying it enables the FTS5 removal. */
		vaultPath?: string;
	};

/** Per-source rules for the upsert branch. Deliberately two independent axes. */
interface SourcePolicy {
	/** `'deduped'` skips the registered consumers when the (path, content) signature is already indexed. */
	consumers: 'always' | 'deduped';
	/**
	 * `'always'` fires `update_note_in_index` on every call, `'deduped'` skips it
	 * on a dedupe hit, `'never'` means the caller's own Rust command
	 * (`create_note`) already indexed the note.
	 */
	rust: 'always' | 'deduped' | 'never';
	/** Whether to record the (path, content) signature in the shared dedupe map. */
	mark: boolean;
	/** Yield a macrotask after the Rust IPC and before the consumers. */
	yieldBeforeConsumers: boolean;
}

/**
 * The explicit per-source policy table.
 *
 * `consumers` and `rust` are separate on purpose: `save` deliberately fires the
 * Rust IPC even on a dedupe hit (the TS dedupe map only tracks whether the TS
 * consumers saw this exact content, and Rust has its own `UpdateResult.changed`
 * short-circuit), while `edit` skips both. Collapsing them into one boolean
 * would silently drop the save-side Rust refresh.
 *
 * This table governs the UPSERT branch only. A delete always drops the Rust
 * entry - `create` / `fs` map to `rust: 'never'` here because their own Rust
 * command already indexed the note, and there is no such command on the
 * delete side.
 */
const SOURCE_POLICY: Record<NoteChangeSource, SourcePolicy> = {
	save: { consumers: 'deduped', rust: 'always', mark: true, yieldBeforeConsumers: false },
	edit: { consumers: 'deduped', rust: 'deduped', mark: true, yieldBeforeConsumers: true },
	watcher: { consumers: 'always', rust: 'always', mark: true, yieldBeforeConsumers: false },
	create: { consumers: 'always', rust: 'never', mark: false, yieldBeforeConsumers: false },
	fs: { consumers: 'always', rust: 'never', mark: false, yieldBeforeConsumers: false },
};

/** Registered consumers, in registration order. */
const consumers: NoteChangeConsumer[] = [];

/**
 * Registers a per-file index to follow every note change. Returns an
 * unregister function; `app-lifecycle` calls it during vault teardown.
 */
export function registerNoteChangeConsumer(consumer: NoteChangeConsumer): () => void {
	consumers.push(consumer);
	debug('NOTE-CHANGE', `Consumer registered: ${consumer.name} (total: ${consumers.length})`);
	return () => {
		const idx = consumers.indexOf(consumer);
		if (idx >= 0) consumers.splice(idx, 1);
		debug('NOTE-CHANGE', `Consumer unregistered: ${consumer.name} (total: ${consumers.length})`);
	};
}

/** Yields to the event loop so the browser can process pending frames/input. */
const yieldToEventLoop = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/** Runs one method across every consumer, isolating failures. */
function fanOut(action: 'upsert' | 'remove', path: string, content: string): void {
	for (const consumer of consumers) {
		try {
			if (action === 'upsert') {
				consumer.upsert(path, content);
			} else {
				consumer.remove(path);
			}
		} catch (err) {
			error('NOTE-CHANGE', `${consumer.name} ${action} failed:`, err);
		}
	}
}

/**
 * THE one owner of "a note's bytes changed". Every write path and every
 * removal path routes through here so the Rust `VaultIndex`, the FTS5 /
 * semantic tables, the shared dedupe map and the registered per-file indexes
 * cannot drift apart.
 *
 * Never rejects and never throws: consumer failures are isolated, IPC
 * failures are logged. Callers that do not need the yield can fire and forget.
 *
 * Synchrony matters: for every source except `edit` the whole body runs
 * synchronously before the returned promise is created, which is what lets
 * `notifyAfterSave` refresh the indexes before it invalidates the queryjs
 * cache (ADR-0009).
 *
 * @param change - What happened, and where it came from
 */
export async function applyNoteChange(change: NoteChange): Promise<void> {
	const policy = SOURCE_POLICY[change.source];
	const { path, vaultPath } = change;

	if (change.kind === 'delete') {
		// Drop the dedupe signature first so a re-creation with identical
		// bytes is not silently skipped by the per-file index updaters.
		clearIndexedEntry(path);
		fanOut('remove', path, '');
		invoke('remove_note_from_index', { path }).catch((err) => {
			error('NOTE-CHANGE', 'remove_note_from_index failed:', err);
		});
		const key = ftsKey(vaultPath, path);
		if (key !== null) {
			// Drop the FTS5 row so deleted files stop appearing in text search
			// results. Semantic chunks for deleted paths are cleaned up by the
			// orphan pass at the end of the next `build_semantic_index` run.
			invoke('remove_from_search_index', { filePath: key }).catch((err) => {
				error('NOTE-CHANGE', 'remove_from_search_index failed:', err);
			});
		}
		return;
	}

	const { content } = change;
	const alreadyIndexed = isAlreadyIndexed(path, content);
	const runConsumers = policy.consumers === 'always' || !alreadyIndexed;
	const runRust = policy.rust === 'always' || (policy.rust === 'deduped' && !alreadyIndexed);

	if (policy.mark) markIndexed(path, content);

	if (runRust) {
		// Updates VaultIndex.entries / by_path / backlinks / tags_index /
		// properties_index and emits `vault-index-updated`, which bumps
		// `vaultStore.vaultIndexVersion` so every panel `$effect` refetches.
		invoke('update_note_in_index', { path, content }).catch((err) => {
			error('NOTE-CHANGE', 'update_note_in_index failed:', err);
		});
	}

	const key = ftsKey(vaultPath, path);
	if (key !== null) {
		// FTS5 - keeps text search fresh on external edits. Without this,
		// `search_fts` returns stale content until the user opens + saves the file.
		invoke('update_search_index_file', { filePath: key, content }).catch((err) => {
			error('NOTE-CHANGE', 'update_search_index_file failed:', err);
		});
		// Semantic - the Rust side compares content hashes first, so unchanged
		// chunks skip ONNX inference. Skipped silently if the embedder isn't loaded.
		invoke('update_semantic_file', { filePath: key, content, vaultPath }).catch((err) => {
			debug('NOTE-CHANGE', `Semantic incremental update skipped: ${err}`);
		});
	}

	if (!runConsumers) return;

	if (policy.yieldBeforeConsumers) {
		await yieldToEventLoop();
		if (change.isStale?.()) return;
	}

	fanOut('upsert', path, content);
}

/**
 * Derives the vault-relative FTS5 / semantic key, or `null` when the change
 * carries no vault root or the path is not inside it. A path that does not
 * share the vault prefix (e.g. canonicalized through a symlinked vault)
 * cannot be made relative - feeding the absolute path in would corrupt those
 * tables, so the update is skipped and freshness waits for the full rebuild.
 */
function ftsKey(vaultPath: string | undefined, path: string): string | null {
	if (!vaultPath) return null;
	const key = vaultRelativeKey(vaultPath, path);
	if (key === null) {
		debug('NOTE-CHANGE', `Path outside the vault prefix - skipping FTS/semantic update: ${path}`);
	}
	return key;
}
