import { invoke } from '@tauri-apps/api/core';
import { updateNoteInIndex } from '$lib/features/collection/collection.service';
import { updateFrontmatterIconForFile } from '$lib/features/file-icons/file-icons.service';
import { updateCalendarForFile } from '$lib/plugins/calendar/calendar.service';
import { error, perfStart, perfEnd, perfBaseline } from '$lib/utils/debug';
import { isAlreadyIndexed, markIndexed } from '$lib/utils/index-dedupe';

/** Version counter to discard stale in-flight updates when a newer call arrives. */
let updateVersion = 0;

/** Yields to the event loop so the browser can process pending frames/input. */
const yieldToEventLoop = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/**
 * Updates per-file indexes for a single file's content change. Called with
 * a 1 s debounce from the layout content-effect when the active tab's
 * content changes.
 *
 * Two phases with an event-loop yield between them so we don't block the
 * main thread for the full duration:
 *
 *   Phase 1 (immediate): Rust `update_note_in_index` — fire-and-forget IPC
 *     (~1-5 ms). Updates VaultIndex.entries / by_path / backlinks /
 *     tags_index / properties_index and emits `vault-index-updated`. All
 *     panels (`BacklinksPanel`, `OutgoingLinksPanel`, `TagsPanel`,
 *     `TasksView`, `GraphView`) reactively refetch via the version bump.
 *
 *   Phase 2 (after yield): TS-side updaters that are not yet covered by
 *     the Rust path — `updateNoteInIndex` (collection panel),
 *     `updateFrontmatterIconForFile`, `updateCalendarForFile`.
 *
 * A version counter discards Phase 2 if a newer call has started. Each
 * updater is wrapped in try/catch so one failure doesn't block the rest.
 */
export async function updateIndexesForFile(filePath: string, content: string): Promise<void> {
	// Dedup against the shared signature map: if `notifyAfterSave` (or a
	// previous run of this function) already indexed this exact (path, content)
	// pair, skip the ~5-15 ms of per-file parsing entirely. Common hit: content
	// effect fires at 1 s of idle, autosave fires at 2 s for the same content.
	if (isAlreadyIndexed(filePath, content)) return;
	markIndexed(filePath, content);

	const version = ++updateVersion;
	const t0 = perfStart();

	// Phase 1: Rust VaultIndex update.
	const tP1 = perfStart();
	invoke('update_note_in_index', { path: filePath, content }).catch((err) => {
		error('INDEX', 'update_note_in_index failed:', err);
	});
	perfEnd('INDEX', 'Phase1:rust-update', tP1);

	// Yield to let the browser process pending frames/input
	await yieldToEventLoop();
	if (updateVersion !== version) return;

	// Phase 2: TS-side updaters not yet covered by the Rust path.
	const tP2 = perfStart();
	try { updateNoteInIndex(filePath, content); } catch (err) { error('INDEX', 'updateNoteInIndex failed:', err); }
	try { updateFrontmatterIconForFile(filePath, content); } catch (err) { error('INDEX', 'updateFrontmatterIconForFile failed:', err); }
	try { updateCalendarForFile(filePath, content); } catch (err) { error('INDEX', 'updateCalendarForFile failed:', err); }
	perfEnd('INDEX', 'Phase2:collection+icons+calendar', tP2);
	perfEnd('INDEX', 'updateIndexesForFile(total)', t0);
	perfBaseline('updateIndexesForFile', t0);
}
