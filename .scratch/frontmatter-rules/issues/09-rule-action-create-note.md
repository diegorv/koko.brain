# 09: A rule can create a note

**What to build:** a new consequence, **create note**. When a note matches, the rule creates another note, for example:
- a meeting follow-up;
- a project's tasks page;
- a hub note for a topic.

Read the PRD and Issues 01, 07 and 08 first.

**Blocked by:** 08

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

### Behavior

1. **Type.** `AutoOrganizeRule` gets `createNote?: { path: string; template?: string; properties?: RuleProperty[]; open?: boolean }`.
   - `path` is vault-relative, ends in `.md`, and supports the destination `{variable}` templates (`resolveDestination`), for example `{parent}/{basename} follow-up.md`.
   - `template` is a note in the templates folder, applied the way the template system already does.
   - `properties` go into the new note's frontmatter, with literal or computed values (Issue 08). The variables and `file.*` fields refer to the **source** note.
   - `open` defaults to `false`.
2. **Only when missing.** If the target exists, nothing is created and nothing is written to it. This keeps the action idempotent: the next save of the source finds the file and stops.
3. **Folder.** A missing target folder is created, as the move does.
4. **Creation.** Create through `createFile` (`src/lib/core/filesystem/fs.service.ts:198`), so the Rust index learns about the note. Open it in a background tab only when `open` is true.
5. **No chaining.** The created note is not evaluated by the rules in the same run. It is evaluated at its own first save (Issue 01, Behavior 9).
6. **Several rules.** Every matching rule with `createNote` creates its note. One run creates at most **5** notes; past that it creates none of the rest, and logs once per rule per session.
7. **Gates.** Never create:
   - inside `_system`, the templates folder or an excluded folder;
   - at a path that leaves the vault (`..`, absolute paths).
8. **Settings.** A "Create note" consequence on the rule row, with the path, the template picker, the properties rows (Issue 02's editor) and an "Open it" toggle. Next to the match count, show "Would create N notes now": the matching notes whose resolved target does not exist yet.
9. **Linking source and target** is not automatic. The help page shows how to do it with a property consequence on the source, using a computed value (Issue 08).

### Docs

The help page gets a "Creating notes" section with the follow-up example, the "only when missing" rule, the cap, the gates and the linking recipe.

### Acceptance

- [ ] Failing test first: a matching save creates the note at the resolved path, with the template and properties; a second save creates and changes nothing.
- [ ] An existing target is untouched. A missing folder is created.
- [ ] `open: true` opens a tab; the default does not.
- [ ] A run with 6 matching create rules creates 5 notes and logs the rest.
- [ ] Gates and the `..` guard hold.
- [ ] The created note's after-save does not run the rules in the same run.
- [ ] Settings shows "Would create N notes now".
- [ ] Docs updated. Frontend gate passes.

## Notes

- **Owner decisions, 2026-11-10 survey:**
  - opening is a per-rule choice;
  - the link from the source is an optional property;
  - a missing folder is created;
  - every matching rule creates its note, with a count in Settings and a cap per run.
- The cap of 5 is a starting value, not measured.

## Comments
