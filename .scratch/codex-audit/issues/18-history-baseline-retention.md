# 18: Keep a recoverable pre-save baseline and each note's last snapshot

**What to build:** Imported or long-unsaved notes retain a recoverable original version before their first in-app overwrite, and retention never removes their final snapshot.

**Blocked by:** none
**Files:** src/lib/core/editor/editor.service.ts, src/lib/core/editor/editor.hooks.ts, src/lib/features/file-history/file-history.service.ts, src/lib/features/deep-link/deep-link.service.ts, src-tauri/src/commands/history.rs, src-tauri/src/db/history_repo.rs, src/tests/lib/core/editor/, src/tests/lib/features/file-history/, src/tests/lib/features/deep-link/, src-tauri/tests/history_test.rs, help/documentation/
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Both.

## Acceptance criteria

- [ ] With history enabled and empty for a note, its first in-app save preserves pre-save disk bytes before replacing them.
- [ ] Take the ordinary editor baseline once per path per session, not on every autosave.
- [ ] A deep-link overwrite of a clean or closed note with empty history preserves the replaced content as well as the new version.
- [ ] Retention keeps the newest snapshot per note even when every snapshot is older than the cutoff; retain other existing retention behavior.
- [ ] Update the retention documentation and the old delete-all-aged-snapshots test to the already-approved keep-latest contract.
- [ ] Verify restoration of the original bytes using real history persistence and boundary-only mocks where needed.
- [ ] Keep hash deduplication and normal post-save snapshots.
- [ ] Do not silently expand into append/prepend, daily capture, or unrelated closed-note writers; those retain their separate backlog owner.

## Provenance

Supersedes the full approved scope of [open-itens 016](../../open-itens/issues/016-file-history-keeps-snapshot-pre-save-bytes.md). The prior close-tab prerequisite is delivered. This is retained approved recovery work, not a newly executed deep-dive reproduction. [Evidence](../evidence.md#history-baseline).

## Comments
