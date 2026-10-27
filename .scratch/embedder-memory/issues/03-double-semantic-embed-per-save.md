# 03: One save can embed the same file twice

**What to build:** each note change triggers at most one `update_semantic_file`.

**Blocked by:** None

**Status:** needs-triage

- The after-save observer fires it on every `notifyAfterSave` (`src/lib/features/search/search.service.ts:335-337`).
- `applyNoteChange` fires it on every upsert with a `vaultPath` (`src/lib/core/filesystem/note-change.service.ts:202-204`), outside the `SOURCE_POLICY` axes and the dedupe signature.
- `watcher-handler.service.ts:46` skips a batch only when ALL paths are recent self-saves, so a mixed batch re-embeds the self-saved file through the watcher leg.
- Both invokes are fire-and-forget; Rust serializes them on the `EMBEDDER` mutex, so the duplicate costs a full extra inference, not concurrency.
- Rust's chunk-hash skip may make the second call cheap; confirm before deciding scope.

- [ ] Confirm from logs/tests whether the second call reaches ONNX or is hash-skipped
- [ ] Single owner for the semantic leg, with a test asserting one invoke per save
