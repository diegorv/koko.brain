# 02: Auto Move never moves a `.view`

**What to build:** The Auto Move after-save observer has no extension gate (`auto-move.service.ts:95-117`), unlike the search observer (`search.service.ts:303`). `evaluateAndMove` builds a record and tests every enabled rule, so a rule keyed on `file.*` can match a `.view` saved from the editor. A sidebar write does not run that observer, so the same view moves or stays depending on how it was edited.

Issue 03 makes more `.view` writes go through a tab save, which would let a Pin click move a view. This gate goes first.

Add a one-line `isViewFile` gate at the top of the observer. A `.view` is not a note, and Auto Move is for notes.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: with Auto Move on and a rule on `file.folder` that matches, saving a `.view` through the real observer does not move it, and the same rule still moves a `.md` in that folder.
- [ ] `help/documentation/22-auto-move.md` says a view is never moved.

## Notes

- `evaluateAndMove`'s body and `findMatchingRule`'s handling of `file.*` fields were not read line by line. Confirm in the failing test that the rule really matches today. If it does not, report that before changing anything.
- **Size:** S.
