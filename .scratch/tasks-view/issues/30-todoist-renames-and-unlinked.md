# 30: Todoist links follow renames, and unmatched entries are listed

**What to build:** After Issue 22 a sent task keeps its link through edits, but its entry holds the note's `relPath`, so renaming or moving the note makes the task look unsent, and entries that match no task are invisible. PRD "Identity strategy".

- **Renames.** A path-change consumer (`registerPathChangeConsumer`, `src/lib/core/filesystem/path-change.service.ts:73`) re-keys `relPath` on rename and move, folders included, and saves the sidecar. It is wired in `initializeVault` and unwound in `teardownVault`, as `registerEventCalendarPathChangeConsumer` is (`src/lib/app/lifecycle/app-lifecycle.service.ts:251`); a missing registration is a silent no-op (indexing rule 6).
- **Unlinked.** Entries that match nothing in any note (Issue 22's unmatched entries, legacy entries that matched no row included) are listed in the Todoist popover with Relink and Forget. Forget asks first and is the only way an entry is removed. Nothing is deleted automatically.

**Blocked by:** 22

**Status:** needs-info

**Waits on:** PRD decisions B3 and B4 (inherited from Issue 22).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first: renaming the note through `applyPathChange` keeps the link (real path-change service and `todoistStore`, `plugin-fs` mocked). Fails today.
- [ ] Moving a folder re-keys every entry under it.
- [ ] After `teardownVault` the consumer is gone (a rename in the next vault does not touch the old entries).
- [ ] An entry whose task was deleted shows under "Unlinked"; Relink attaches it to a chosen row; Forget removes it from the saved file and nothing else does.

## Notes

- **Size:** S to M. Split out of Issue 22.
