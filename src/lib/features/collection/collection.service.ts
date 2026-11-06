import { call } from '#lib/contracts/ipc.js';
import { registerNoteChangeConsumer } from '#lib/core/filesystem/note-change.service.js';
import { registerPathChangeConsumer } from '#lib/core/filesystem/path-change.service.js';
import { isMarkdownFile } from '#lib/core/filesystem/fs.logic.js';
import { debug, error as errorLog, timeAsync } from '#lib/utils/debug.js';
import { createFile } from '#lib/core/filesystem/fs.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { collectionStore } from './collection.store.svelte';
import type { PropertyIndexRecord } from './collection.types';
import type { NoteRecordV2 } from '#lib/types/vault-v2.types.js';
import { buildNoteRecord } from './collection.logic';

/**
 * The body New table writes: a `.view` kept out of Views (`_visible: false`)
 * that opens in the editor (`_open_in_editor: true`), with one table view and
 * no filters.
 */
const NEW_TABLE_TEMPLATE = `_visible: false
_open_in_editor: true
views:
  - type: table
    name: All
`;

/**
 * Creates the `Untitled.view` of New table in `parentPath` (`Untitled 1.view`
 * when taken) with `NEW_TABLE_TEMPLATE`. Returns the file path; a failure
 * propagates from `createFile`.
 */
export async function createCollectionFile(parentPath: string): Promise<string> {
	// Asked before the write, since `create_note` emits the event: until the
	// entry lands, a view with no entry counts as visible and shows in Views.
	vaultStore.requestPromptIndexRefresh();
	return createFile(parentPath, 'Untitled.view', NEW_TABLE_TEMPLATE);
}

/**
 * Converts a `NoteRecordV2` (Rust IPC, properties as a JSON object)
 * into the TS-side `PropertyIndexRecord` (properties as a Map<string, unknown>
 * — kb-api / collection consumers iterate via `.get(key)`). Unit
 * conversion happens server-side in `commands::vault::project_note_record`,
 * so `mtime` / `ctime` arrive in milliseconds already.
 */
function fromV2(record: NoteRecordV2): PropertyIndexRecord {
	const properties = new Map<string, unknown>();
	for (const [k, v] of Object.entries(record.properties)) {
		properties.set(k, v);
	}
	return {
		path: record.path,
		name: record.name,
		basename: record.basename,
		folder: record.folder,
		ext: record.ext,
		mtime: record.mtime,
		ctime: record.ctime,
		size: record.size,
		properties,
	};
}

/** One `applyPropertyDelta` batch, kept so a whole read can replay it. */
interface PropertyDelta {
	records: NoteRecordV2[];
	removed: string[];
}

/**
 * Deltas applied while a whole read is in flight. A whole read's snapshot can
 * be older than a delta that lands before it, so it replays the deltas logged
 * after it started. Emptied once no whole read is in flight.
 */
let deltaLog: PropertyDelta[] = [];
/** Number of `buildPropertyIndex` calls awaiting their IPC. */
let wholeReadsInFlight = 0;
/** Set when the latest whole read failed; cleared by the next successful one. */
let wholeReadFailed = false;

/**
 * Builds the property index from the Rust `VaultIndex`. Phase 8 —
 * replaces the previous TS-side per-file `parseFrontmatterProperties`
 * scan + `buildMetadataMap(fsStore.fileTree)` join with a single
 * `call('get_all_property_records')` call. The Rust side has already
 * parsed every entry's frontmatter at scan / save time and projects
 * the kb-api shape on the way out.
 *
 * Deltas applied while the read was in flight are replayed on top of its
 * snapshot, so a late landing does not roll their notes back.
 */
export async function buildPropertyIndex(): Promise<void> {
	const logStart = deltaLog.length;
	wholeReadsInFlight++;
	try {
		await timeAsync('COLLECTION', 'buildPropertyIndex', async () => {
			const records = await call('get_all_property_records');
			const index = new Map<string, PropertyIndexRecord>();
			for (const record of records) {
				index.set(record.path, fromV2(record));
			}
			for (const delta of deltaLog.slice(logStart)) patchIndex(index, delta);
			collectionStore.setPropertyIndex(index);
			wholeReadFailed = false;
			debug('COLLECTION', `Properties: ${index.size} notes`);
		});
	} catch (err) {
		wholeReadFailed = true;
		errorLog('COLLECTION', 'buildPropertyIndex failed:', err);
	} finally {
		if (--wholeReadsInFlight === 0) deltaLog = [];
	}
}

/**
 * Whether the property index needs a whole read before per-path deltas can
 * keep it current: it was never built, or the latest whole read failed (a
 * failed full-rescan read would otherwise leave the rest of that rescan out).
 */
export function propertyIndexNeedsWholeRead(): boolean {
	return !collectionStore.isIndexReady || wholeReadFailed;
}

function patchIndex(index: Map<string, PropertyIndexRecord>, delta: PropertyDelta): void {
	for (const path of delta.removed) index.delete(path);
	for (const record of delta.records) index.set(record.path, fromV2(record));
}

/**
 * Patches the property index for the paths one `vault-index-updated`
 * refresh window changed: `records` (from `get_index_delta`) replace or add
 * their notes, `removed` paths are dropped. One map copy for the batch.
 */
export function applyPropertyDelta(records: NoteRecordV2[], removed: Iterable<string>): void {
	const delta = { records, removed: [...removed] };
	if (wholeReadsInFlight > 0) deltaLog.push(delta);
	const index = new Map(collectionStore.propertyIndex);
	patchIndex(index, delta);
	collectionStore.setPropertyIndex(index);
}

/**
 * Updates a single note's record in the property index. Phase 8 — kept
 * as a TS-only fast path because the content effect fires within ~1 s
 * of typing and Rust has already updated its index via Phase 2's
 * `update_note_in_index`. We just keep the TS cache fresh so kb-api
 * queries off the in-memory index see the new properties immediately.
 *
 * Preserves existing file metadata (mtime/ctime/size) since timestamps
 * don't change during editing — the watcher / save path triggers a Rust
 * `update_note_in_index` with fresh metadata, which bumps
 * `vault-index-updated` and (eventually) patches it via `applyPropertyDelta`.
 */
export function updateNoteInIndex(path: string, content: string) {
	const existing = collectionStore.propertyIndex.get(path);
	const record = buildNoteRecord(
		path,
		content,
		existing?.mtime ?? 0,
		existing?.ctime ?? 0,
		existing?.size ?? 0,
	);
	collectionStore.updateRecord(path, record);
}

/**
 * Removes a note from the property index. Called when a note is deleted.
 */
export function removeNoteFromIndex(path: string) {
	collectionStore.removeRecord(path);
}

/**
 * Registers the property index as a note-change consumer, so `applyNoteChange`
 * keeps it in sync on every write and eviction. Returns an unregister function.
 *
 * Only a Markdown upsert writes a record. A `.kanban`, a `.canvas` or any
 * other non-Markdown file is not a note, so a record here would list it in
 * `executeQuery` and `kb.pages()`. A `.view` body is bare YAML:
 * `buildNoteRecord` would read no properties and replace the Rust-projected
 * record with an empty one, and the `vault-index-updated` delta
 * (`applyPropertyDelta`) refreshes that record from Rust instead.
 */
export function registerCollectionNoteChangeConsumer(): () => void {
	return registerNoteChangeConsumer({
		name: 'collection',
		upsert: (path, content) => {
			if (!isMarkdownFile(path)) return;
			updateNoteInIndex(path, content);
		},
		remove: removeNoteFromIndex,
	});
}

/**
 * Moves the view index remembered for a collection file (or for every file
 * under a folder) to its new path, or drops it on a delete.
 */
function followViewIndexPathChange(from: string, to: string | null): void {
	const prefix = from + '/';
	for (const path of collectionStore.viewIndexPaths()) {
		if (path !== from && !path.startsWith(prefix)) continue;
		const index = collectionStore.getViewIndex(path)!;
		collectionStore.deleteViewIndex(path);
		if (to !== null) collectionStore.setViewIndex(to + path.slice(from.length), index);
	}
}

/**
 * Registers the remembered view indexes as a path-change consumer, so a
 * renamed or moved collection reopens on its last view. Returns an unregister
 * function; `initializeVault` registers it and `teardownVault` unregisters it.
 */
export function registerCollectionPathChangeConsumer(): () => void {
	return registerPathChangeConsumer({ name: 'collection-view-index', pathChanged: followViewIndexPathChange });
}

/** Resets the collection store to its initial state. Used during vault teardown. */
export function resetCollection(): void {
	collectionStore.reset();
	wholeReadFailed = false;
}
