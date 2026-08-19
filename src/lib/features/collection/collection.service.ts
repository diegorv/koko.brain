import { invoke } from '@tauri-apps/api/core';
import { registerNoteChangeConsumer } from '$lib/core/filesystem/note-change.service';
import { debug, error as errorLog, timeAsync } from '$lib/utils/debug';
import { createFile } from '$lib/core/filesystem/fs.service';
import { collectionStore } from './collection.store.svelte';
import type { NoteRecord } from './collection.types';
import type { NoteRecordV2 } from '$lib/types/vault-v2.types';
import { buildNoteRecord } from './collection.logic';

/** Minimal valid .collection body — a single table view with no filters. */
const DEFAULT_COLLECTION_TEMPLATE = `views:
  - type: table
    name: All
`;

/**
 * Creates a new .collection file with a minimal valid body (one empty table
 * view, no filters). Returns the file path on success, or null on failure.
 */
export async function createCollectionFile(parentPath: string): Promise<string | null> {
	try {
		return await createFile(parentPath, 'Untitled.collection', DEFAULT_COLLECTION_TEMPLATE);
	} catch (err) {
		errorLog('COLLECTION', 'Failed to create collection file:', err);
		return null;
	}
}

/**
 * Converts a `NoteRecordV2` (Rust IPC, properties as a JSON object)
 * into the TS-side `NoteRecord` (properties as a Map<string, unknown>
 * — kb-api / collection consumers iterate via `.get(key)`). Unit
 * conversion happens server-side in `commands::vault::project_note_record`,
 * so `mtime` / `ctime` arrive in milliseconds already.
 */
function fromV2(record: NoteRecordV2): NoteRecord {
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

/**
 * Builds the property index from the Rust `VaultIndex`. Phase 8 —
 * replaces the previous TS-side per-file `parseFrontmatterProperties`
 * scan + `buildMetadataMap(fsStore.fileTree)` join with a single
 * `invoke('get_all_property_records')` call. The Rust side has already
 * parsed every entry's frontmatter at scan / save time and projects
 * the kb-api shape on the way out.
 */
export async function buildPropertyIndex(): Promise<void> {
	try {
		await timeAsync('COLLECTION', 'buildPropertyIndex', async () => {
			const records = await invoke<NoteRecordV2[]>('get_all_property_records');
			const index = new Map<string, NoteRecord>();
			for (const record of records) {
				index.set(record.path, fromV2(record));
			}
			collectionStore.setPropertyIndex(index);
			debug('COLLECTION', `Properties: ${index.size} notes`);
		});
	} catch (err) {
		errorLog('COLLECTION', 'buildPropertyIndex failed:', err);
	}
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
 * `vault-index-updated` and (eventually) refetches via `buildPropertyIndex`.
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
 */
export function registerCollectionNoteChangeConsumer(): () => void {
	return registerNoteChangeConsumer({
		name: 'collection',
		upsert: updateNoteInIndex,
		remove: removeNoteFromIndex,
	});
}

/** Resets the collection store to its initial state. Used during vault teardown. */
export function resetCollection(): void {
	collectionStore.reset();
}
