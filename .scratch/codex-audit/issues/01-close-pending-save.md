# 01: Preserve the final edit when closing a tab with a pending save

**What to build:** Closing a note preserves its final accepted content even when Undo makes the tab appear clean while an older save is outstanding.

**Blocked by:** None (can start immediately).
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Frontend, with rendered-editor regression coverage.

## Reproduction

Save A, edit to B, delay B's save, undo to A, and close the tab. The tab disappears while the old write subsequently persists B.

## Acceptance criteria

- [ ] Add a failing deterministic test using real editor services and stores, deferring only filesystem I/O.
- [ ] Closing joins outstanding writes even when current and previously saved content match; it persists the final accepted content before removal.
- [ ] Edit, save, undo, close, and reopen through both the tab button and keyboard command; the reopened document contains A.
- [ ] A failed write retains the latest recoverable buffer unless the user explicitly consents to discard; Cancel keeps the tab and permits retry.
- [ ] Tab reordering or activation changes during the wait cannot close or save a different note.
- [ ] Ordinary clean, dirty, pinned, and virtual-tab close behavior remains intact.
- [ ] Assert persisted bytes and tab contents, not just save-call counts.

## Provenance

Distinct follow-up to delivered close-tab protection, not reopening its completed work. See [evidence](../evidence.md#save-boundaries).
