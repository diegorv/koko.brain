import { applyNoteChange } from '$lib/core/filesystem/note-change.service';
import { perfStart, perfEnd, perfBaseline } from '$lib/utils/debug';
import { isAlreadyIndexed } from '$lib/utils/index-dedupe';

/** Version counter to discard stale in-flight updates when a newer call arrives. */
let updateVersion = 0;

/**
 * Updates per-file indexes for a single file's content change. Called with
 * a 1 s debounce from the layout content-effect when the active tab's
 * content changes.
 *
 * Delegates to the note-change owner with source `'edit'`, whose policy row
 * fires the Rust `update_note_in_index` IPC first, then yields a macrotask so
 * the browser can process pending frames/input, then fans out to the
 * registered per-file consumers. The `isStale` callback discards that fan-out
 * when a newer call has started in the meantime.
 *
 * The dedupe guard stays HERE rather than relying on the owner's `'deduped'`
 * policy: the version counter must not be bumped by a call that does no work,
 * or a dedupe hit would cancel the consumer fan-out of an in-flight call whose
 * content nothing else will index.
 */
export async function updateIndexesForFile(filePath: string, content: string): Promise<void> {
	// Dedup against the shared signature map: if `notifyAfterSave` (or a
	// previous run of this function) already indexed this exact (path, content)
	// pair, skip the ~5-15 ms of per-file parsing entirely. Common hit: content
	// effect fires at 1 s of idle, autosave fires at 2 s for the same content.
	if (isAlreadyIndexed(filePath, content)) return;

	const version = ++updateVersion;
	const t0 = perfStart();

	await applyNoteChange({
		kind: 'upsert',
		source: 'edit',
		path: filePath,
		content,
		isStale: () => updateVersion !== version,
	});

	perfEnd('INDEX', 'updateIndexesForFile(total)', t0);
	perfBaseline('updateIndexesForFile', t0);
}
