import { invoke } from '@tauri-apps/api/core';
import { updateIndexForFile } from '$lib/features/backlinks/backlinks.service';
import { updateTagIndexForFile } from '$lib/features/tags/tags.service';
import { updateNoteInIndex } from '$lib/features/collection/collection.service';
import { updateFrontmatterIconForFile } from '$lib/features/file-icons/file-icons.service';
import { updateCalendarForFile } from '$lib/plugins/calendar/calendar.service';
import { updateTaskIndexForFile } from '$lib/features/tasks/tasks.service';
import { error, perfStart, perfEnd, perfBaseline } from '$lib/utils/debug';
import { isAlreadyIndexed, markIndexed } from '$lib/utils/index-dedupe';

/** Version counter to discard stale in-flight updates when a newer call arrives. */
let updateVersion = 0;

/** Yields to the event loop so the browser can process pending frames/input. */
const yieldToEventLoop = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/**
 * Updates all per-file indexes for a single file's content change.
 * Called with a 1 s debounce from the layout content-effect when the active
 * tab's content changes.
 *
 * Split into 3 phases with event-loop yields between them to avoid blocking
 * the main thread for the full duration:
 *   Phase 1 (immediate): updateIndexForFile — stores parsed wikilinks for noteIndexStore
 *   Phase 2 (after yield): Rust `update_note_in_index` — bumps `vaultIndexVersion`
 *     so `BacklinksPanel` and `OutgoingLinksPanel` reactive effects re-fetch.
 *   Phase 3 (after yield): tags, tasks, collection, icons, calendar (still TS).
 *
 * A version counter discards phases 2/3 if a newer call has started.
 * Each updater is wrapped in try/catch so one failure doesn't block the rest.
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

	// Phase 1: immediate — must run first, stores parsed wikilinks for Phase 2
	const tP1 = perfStart();
	try { updateIndexForFile(filePath, content); } catch (err) { error('INDEX', 'updateIndexForFile failed:', err); }
	perfEnd('INDEX', 'Phase1:updateIndexForFile', tP1);

	// Yield to let the browser process pending frames/input
	await yieldToEventLoop();
	if (updateVersion !== version) return;

	// Phase 2: Rust VaultIndex update. Fire-and-forget IPC (~1-5 ms) — the
	// Rust side emits `vault-index-updated` which bumps
	// `vaultStore.vaultIndexVersion`, triggering `BacklinksPanel` AND
	// `OutgoingLinksPanel` reactive `$effect`s to re-fetch via
	// `get_backlinks_v2` / `get_outgoing_links_v2`. No TS-side outgoing
	// computation needed (Phase 6).
	const tP2 = perfStart();
	invoke('update_note_in_index', { path: filePath, content }).catch((err) => {
		error('INDEX', 'update_note_in_index failed:', err);
	});
	perfEnd('INDEX', 'Phase2:rust-update', tP2);

	// Yield again before the remaining lightweight updates
	await yieldToEventLoop();
	if (updateVersion !== version) return;

	// Phase 3: independent lightweight updates
	const tP3 = perfStart();
	try { updateTagIndexForFile(filePath, content); } catch (err) { error('INDEX', 'updateTagIndexForFile failed:', err); }
	try { updateTaskIndexForFile(filePath, content); } catch (err) { error('INDEX', 'updateTaskIndexForFile failed:', err); }
	try { updateNoteInIndex(filePath, content); } catch (err) { error('INDEX', 'updateNoteInIndex failed:', err); }
	try { updateFrontmatterIconForFile(filePath, content); } catch (err) { error('INDEX', 'updateFrontmatterIconForFile failed:', err); }
	try { updateCalendarForFile(filePath, content); } catch (err) { error('INDEX', 'updateCalendarForFile failed:', err); }
	perfEnd('INDEX', 'Phase3:tags+tasks+collection+icons+calendar', tP3);
	perfEnd('INDEX', 'updateIndexesForFile(total)', t0);
	perfBaseline('updateIndexesForFile', t0);
}
