# 05: Auto Move also evaluates a note when it is moved or renamed into a folder

**What to build:** Today Auto Move runs only from the after-save hook (`auto-move.service.ts:96`). A note dragged into a folder, or renamed, is not evaluated until its next save, so a rule's property consequences (Issue 01) for that folder are not applied, and a move rule does not route it. The proposal: also evaluate after a user move or rename, with the same debounce and the same rules.

**Blocked by:** 01

**Status:** needs-triage

## Questions for triage

- Which events count: explorer drag-and-drop, rename, a move from the command palette, a move done by Auto Move itself? Auto Move's own move must not trigger another evaluation, or rules can chain moves.
- Rename and move go through their own index path (`docs/agents/indexing-watcher-rules.md`: path changes, link rewrites). Where is the safe hook point, and does the note's content need a read, since there is no saved content in hand as there is after a save?
- Moves made outside the app (watcher events): in scope or not?
- Is "evaluate on next save" enough in practice? The note gets its properties as soon as it is touched.

## Notes

- **Origin:** owner request on 2026-11-10, split out of the old auto-move-default-properties Issue 01 to keep it on the save trigger only. Out of the MVP (`.scratch/frontmatter-rules/PRD.md`, Decision 3).
- **Research for triage:** `.scratch/frontmatter-rules/discovery-2026-11-10.md` section 4 answers most of the questions above: the hook is `registerPathChangeConsumer`, a move never fires after-save, and a move-triggered run should not move the note again, or a manual drag out of a rule's folder is undone.

## Comments
