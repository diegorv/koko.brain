# 09: A rule can create a note

**What to build:** a new consequence, **create note**. When a note matches, the rule creates another note, for example a meeting follow-up, a project's tasks page, or a hub note for a folder that does not exist yet. Read the PRD and Issues 01, 07 and 08 first.

**Blocked by:** 08

**Status:** needs-triage

### Proposal

- `AutoOrganizeRule` gets `createNote?: { path: string; template?: string; properties?: RuleProperty[]; ifExists: 'skip' }`.
  - `path` is vault-relative and supports the destination `{variable}` templates (`resolveDestination`), for example `{parent}/{basename} follow-up.md`.
  - `template` is a note in the templates folder, applied as the template system already does.
  - `properties` are written into the new note's frontmatter, with literal or computed values (Issue 08).
- **Create only when the target does not exist.** An existing file is never overwritten, and the rule writes nothing to it. This keeps the action idempotent: the next save of the source note finds the file and does nothing.
- The new note is created through `createFile` (`src/lib/core/filesystem/fs.service.ts:198`), so the Rust index learns about it. It is not opened.
- The created note's own after-save must not run the rules. Its creation is part of this run (Issue 01, no chaining). It is evaluated at its own first save.
- Gates: never create inside `_system`, the templates folder or an excluded folder. Never create a path outside the vault (`..`).

### Questions for triage

1. Should the new note be opened in a tab, or created silently?
2. Should the source note get a link to the new one, for example a property `follow_up: "[[...]]"`? That could be a property consequence on the source using a computed value.
3. What should happen when the target folder is missing: create it, as the move does, or skip?
4. With several matching rules that each create a note, should all of them run, or only the first?
5. Does a rule that creates a note need extra protection against a broad filter? A typo could create one note per note in the vault. The recommended answer: Settings shows "Would create N notes now" next to the match count, and a cap per run.

### Acceptance (draft)

- [ ] A matching save creates the note at the resolved path with the template and properties applied; a second save does not create or change anything.
- [ ] An existing target is untouched.
- [ ] Gates and the `..` guard hold.
- [ ] The created note's after-save does not run rules in the same run.
- [ ] Docs and Settings updated. Frontend gate passes.

## Notes

- **Origin:** owner request on 2026-11-10, after the MVP.

## Comments
