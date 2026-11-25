# 07: Preserve typing and backlink updates during overlapping renames

**What to build:** Automatic reference rewriting preserves newer edits and all successful link transformations through overlapping saves and renames.

**Blocked by:** None (can start immediately).
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Frontend with rendered-editor history coverage.

## Acceptance criteria

- [ ] Add deterministic failures for typing during a clean reference read and a dirty reference write, using real stores and transformations.
- [ ] Preserve pre-existing and intervening edits in active and background references while applying the rename to relevant current content.
- [ ] Coordinate rewrites with ordinary saves and other rewrites; cover both completion orders and two target renames sharing one reference.
- [ ] After settling and saving pending content, reopen and verify every successful rename and retained edit.
- [ ] Saved state acknowledges only committed bytes; merged unsaved text remains dirty.
- [ ] Keep rendered editor content, persisted content, and backlink relationships consistent.
- [ ] Failed rewrites retain newer content, do not mark it saved, and identify unsuccessful references; successful siblings remain usable.
- [ ] Preserve normal user-typing undo/redo across the rewrite and tab switching; undo must not silently restore an obsolete target.
- [ ] Do not expand this ticket into link-resolution syntax or folder-move semantics.

## Provenance

Supersedes the link-rewrite portion of [open-itens 089](../../open-itens/issues/089-keystrokes-typed-during-link-rewrite-type-rename.md). Its stale watcher subsection and UI-unproven type-rename scenario are separately disposed in [deferred findings](../deferred.md). [Evidence](../evidence.md#backlink-rewrites).
