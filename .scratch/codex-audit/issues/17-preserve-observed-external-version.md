# 17: Preserve an observed external version before autosave replaces it

**What to build:** Saving a locally edited note preserves competing disk bytes it observes before replacement, rather than depending on delayed watcher reads.

**Blocked by:** none
**Files:** src/lib/core/editor/editor.service.ts, src/lib/core/editor/editor.store.svelte.ts, src/lib/core/editor/editor.hooks.ts, src/lib/features/file-history/file-history.service.ts, src-tauri/src/commands/history.rs, src-tauri/src/db/history_repo.rs, src/tests/lib/core/editor/, src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts, src/tests/lib/features/file-history/, src-tauri/tests/history_test.rs
**Status:** needs-triage
**Priority:** P1
**Gate:** Frontend; Both if durable preservation changes the backend contract.

## Accepted policy and remaining decision

Retain the predecessor's approved policy: keep both versions, save the user's typing, and report the preserved external version. Decide the disabled-history and preservation-failure behavior. Recommended: use an approved durable conflict copy or refuse replacement and retain the dirty buffer; never claim recovery without a successful copy.

## Acceptance criteria

- [ ] Before replacement, compare disk content with the saved baseline and proposed content.
- [ ] Preserve a distinct observed external version successfully before writing local content; no false kept-version toast.
- [ ] Cover autosave firing before watcher delivery and an external read already in flight.
- [ ] Equal baseline content saves normally without conflict copy or warning; successful save/reload refreshes the baseline.
- [ ] Open-note calendar/frontmatter saves through the shared save path receive the same protection.
- [ ] Newer local typing stays intact and truthfully dirty when not yet persisted.
- [ ] Test delayed preservation, rejection, disabled history, and the chosen conflict-copy policy.
- [ ] Verify recoverable bytes through the actual storage boundary, not solely a mocked notification.
- [ ] Document that this protects successfully observed versions, subject to retention; it cannot capture unseen changes arriving after observation.

## Provenance

Supersedes [open-itens 019](../../open-itens/issues/019-every-tab-write-checks-disk-first-so.md). Its watcher prerequisite is already delivered. Status is deliberately triage because its old title promised more than read-before-write can guarantee. [Evidence](../evidence.md#external-writers).

## Comments

The failure-policy decision above is required before implementation.
