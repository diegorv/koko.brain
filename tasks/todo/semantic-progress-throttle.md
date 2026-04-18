# Semantic Progress — Throttle Frontend Overhead

While profiling the file-explorer (see `file-explorer-perf-large-folders.md`),
we found that opening a file triggered a ~2-second main-thread block — logged
as `activeTabLinks:effect→callback: 2060ms` even though the inner work took
only 4ms. The block is caused by many small pieces of work piling up on the
main thread. One significant contributor is the `semantic-index-progress`
event stream from Rust: the embedder emits one event per batch of 4 chunks
(~16 events/second during indexing), and every event triggers an
`appendLog` IPC call plus a reactive update to `searchStore.semanticProgress`,
which forces `SearchStatus.svelte`, `SearchPanel.svelte`, and
`SearchSection.svelte` to re-render. Rough cost: 80–160 ms/s of main-thread
work while the vault is indexing. Throttling the listener and removing the
per-batch debug log are low-risk frontend-only wins that free time for other
work (including expand-folder clicks that happen while indexing is in flight).

## Tasks

- [x] Task A: In `src/lib/features/search/search.service.ts`, throttle the
  `semantic-index-progress` listener so `searchStore.setSemanticProgress` is
  called at most once every 500 ms (keep the latest payload, coalesce the
  rest). The "complete" / phase-change events must still propagate promptly,
  so a leading+trailing throttle is appropriate.
- [ ] Task B: In the same listener, drop the per-batch
  `debug('SEARCH', 'Semantic progress:', …)` call. The Rust side already
  logs `Index batch N/M` via `debug_log('EMBEDDER', …)`, so the frontend
  duplicate is redundant and each call costs a Tauri plugin-fs IPC write
  (~2–5 ms). Keep logs for phase transitions / terminal states only.

## Notes

- Both tasks are frontend-only; the Rust `semantic.rs` emit stays
  unchanged. Measured impact should drop overhead from ~160 ms/s to
  ~10 ms/s during indexing (16× reduction).
- `src/tests/lib/features/search/search.store.test.ts` already covers
  `setSemanticProgress`; Task A may need a test for the throttle behavior
  (ensure the store eventually receives the latest payload).
