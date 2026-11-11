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

## Review amendments (2026-11-10)

From the scout and adversarial reviews in `.scratch/frontmatter-rules/research/issue-review-09*.md` and `issue-review-cross.md`. **These override the Behavior and Acceptance above where they differ.** The run order and the shared gates are in `PRD.md`, "Run order and gates for Issues 07-13".

1. **Self-matching creates.** Before creating, evaluate the rule's own filter against a record built for the note it would create (path plus initial content). If it matches, create nothing and log once per rule per session. Otherwise a template with `type: meeting`, or a target inside the filtered folder, creates `X follow-up follow-up.md` at every save. Add an acceptance line.
2. **Existence check:** `createFile` renames a clash to `X 1.md` and never refuses (`fs.service.ts:200-203`). So check `exists(target)` first, and hold the target in a module-level in-flight set, like the run's skip set, so two sources saved together do not both create it. Add an acceptance line for two sources run together.
3. **Example path:** use `{folder}/{basename} follow-up.md`. `{parent}` is the parent of the note's folder (`auto-move.logic.ts:348-349`).
4. **Path guard:** a configured path that starts with `/` is dropped on load. A resolved target with any `..` segment, which frontmatter variables can bring in, is refused **before** the folder is created.
5. **Template:** `template` is a vault-relative note path loaded with `loadNoteTemplate` (`note-creator.service.ts:53-58`). A missing template creates nothing and logs once per rule per session. Do not import `plugins/templates` (layer rule). Settings uses a path field, as in `PeriodicNotesSection.svelte:46`.
6. **Count:** "Would create N notes now" counts distinct resolved targets that do not exist yet and pass the gates.
7. **Key rules:** `createNote.properties` load with the same rules as `properties`:
   - `todoist_project` is refused;
   - lifecycle keys take booleans only;
   - `remove` is dropped, because it means nothing on a new note.
   
   A `createNote` without a string path ending in `.md` is dropped.
8. **Placement and gates** follow the PRD run order. A failed move skips the create. Create runs only when the source passes the shared gates. Widen the early return in the service (`auto-move.service.ts:255`) and the Settings "does nothing" hint (`AutoMoveRuleRow.svelte:79`) so a create-only rule acts.
9. **Docs:** add "Create note" to the Actions list on the help page.
10. **Carried over from Issue 08's review (open nit):** in `AutoOrganizeRuleProperty.svelte:122-126`, a key rename is refused after an expression was refused, and the field then shows the new key while the old key stays stored. This Issue reuses that editor for `createNote.properties`, so fix it here: either save the key rename even while the expression is refused, or have the field revert to the stored key. Add a row test.

## Notes

- **Owner decisions, 2026-11-10 survey:**
  - opening is a per-rule choice;
  - the link from the source is an optional property;
  - a missing folder is created;
  - every matching rule creates its note, with a count in Settings and a cap per run.
- The cap of 5 is a starting value, not measured.

## Comments
