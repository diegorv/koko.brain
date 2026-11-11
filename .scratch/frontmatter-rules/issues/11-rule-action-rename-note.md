# 11: A rule can rename the note

**What to build:** a new consequence, **rename**. When a note matches, the rule renames it from a template or a computed name. Examples:
- `{date} {basename}` for meetings;
- a name taken from a property.

Read the PRD and Issues 01 and 08 first, and `docs/agents/indexing-watcher-rules.md` (path changes).

**Blocked by:** 10

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

### Behavior

1. **Type.** `AutoOrganizeRule` gets `rename?: { name?: string; expr?: string }`, exactly one of the two:
   - `name` is a file-name template using the destination `{variable}` syntax;
   - `expr` is computed by the engine, as in Issue 08.
   
   The `.md` extension is kept. Characters that are not valid in a file name (`/ \ : * ? " < > |`) become `-`. An empty result does nothing.
2. **Order in the run:** rename first, then move, then write the properties at the final path. Only the first matching rule with `rename` renames.
3. **How.** Through `renameItem` (`src/lib/core/filesystem/fs.service.ts:280`), so links are rewritten and the tab follows the note. The final path goes into the run's skip set (Issue 01, Behavior 9).
4. **Idempotent, including the suffix.**
   - **Target exists:** if another note already has the target name, the note gets `<name> 2.md`, then `<name> 3.md`, and so on: the first free name.
   - **Already named:** a note already named `<name>.md`, or `<name> N.md` for any N, is treated as already renamed and is left alone. Without this, a clash would rename the note again on every save (`X 2`, then `X 3`).
5. **Open note.** If the note is open in a tab with unsaved edits when the timer fires, the rename is skipped for this run and happens at the next save with no pending edit. The rest of the run (move, properties) still happens.
6. **Link rewrites.** First check whether link-rewriter saves fire the after-save hook today. The research says they write raw and do not (`link-updater.service.ts:58,71`; `.scratch/frontmatter-rules/discovery-2026-11-10.md` section 4).
   - If they do not, pin that with a test, so a rename never cascades into the rules of the notes that link to it.
   - If they do, mark those saves and skip them in the observer.
7. **Volatile names are allowed and documented.** A name built from `now()` or `file.mtime` renames the note on every save, and the help page says so.

### Docs

The help page gets a "Renaming notes" section with the meeting example, the order (rename, move, properties), the suffix rule, the open-note rule and the volatile warning.

### Acceptance

- [ ] Failing test first: a matching save renames the note, links to it are rewritten, and a second save does nothing.
- [ ] A clash renames to `<name> 2.md`; a later save leaves `<name> 2.md` alone.
- [ ] Rename, move and properties land at the final path in one run, with no re-trigger.
- [ ] A dirty open note is not renamed in that run; it is renamed at the next clean save.
- [ ] A test pins that the backlink rewrite after a rename does not run the rules on the rewritten notes.
- [ ] Docs and Settings (a "Rename" consequence with a name or expression field) updated. Frontend gate passes.

## Notes

- **Owner decisions, 2026-11-10 survey:**
  - skip link-rewriter saves;
  - wait while the open note has pending edits;
  - volatile names allowed and documented;
  - a numeric suffix on a clash.
  
  Behavior 4's "already named" rule is required by the suffix choice; it is not a new decision.

## Comments
