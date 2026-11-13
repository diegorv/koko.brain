# 03: One save can embed the same file twice

**What to build:** each note change triggers at most one `update_semantic_file`.

**Blocked by:** None

**Status:** needs-triage

- The after-save observer fires it on every `notifyAfterSave` (`src/lib/features/search/search.service.ts:327`).
- `applyNoteChange` fires it on every upsert with a `vaultPath` (`src/lib/core/filesystem/note-change.service.ts:252`), outside the `SOURCE_POLICY` axes and the dedupe signature.
- `watcher-handler.service.ts:46` skips a batch only when ALL paths are recent self-saves, so a mixed batch re-embeds the self-saved file through the watcher leg.
- Both invokes are fire-and-forget; Rust serializes them on the `EMBEDDER` mutex, so the duplicate costs a full extra inference, not concurrency.
- Rust's chunk-hash skip may make the second call cheap; confirm before deciding scope.

- [ ] Confirm from logs/tests whether the second call reaches ONNX or is hash-skipped
- [ ] Single owner for the semantic leg, with a test asserting one invoke per save

## Comments

**2026-11-02, UI responsiveness research** (`.scratch/ui-responsiveness/research/G-deep-dive.md`, `G-verify.md`): the open checkbox is answered: when the two calls overlap, the second one does reach ONNX. Session `2026-11-02_14-52-43.log` embedded the weekly notes in the order week-40, week-43, week-43, week-40, and day-02 call 2 logged "File update" at 17:54:59.106, 1 ms before call 1's "Search cache invalidated". `update_semantic_file` reads hashes before taking `EMBEDDER` (`semantic.rs:1233-1235`), takes it twice (`ensure_embedder_loaded` at `:245`/`:1264`, then `:1266`), and commits after dropping it (`:1288` vs `:1299`), so overlapping calls repeat work and can commit out of order (orphan rows that last until the note is edited again). Smallest fix proposed by the verifier: load-if-missing, re-read the path's hashes and commit, all under one `EMBEDDER` guard (lock order `EMBEDDER -> DB`; no site takes them the other way). Risk: longer parking widens the vault-switch window (`embedder-memory/07`: `shutdown_semantic` does not clear `VAULT_PATH`). Hash-matched vector reuse for re-keyed chunks is tracked separately in `ui-responsiveness/07`. The synthesis suggests folding this fix together with `embedder-memory/02` (the verifier says the same guard covers its silent skip) and `embedder-burst-cpu/04` rather than opening a duplicate Issue.
