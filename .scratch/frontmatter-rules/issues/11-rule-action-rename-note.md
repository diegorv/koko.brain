# 11: A rule can rename the note

**What to build:** a new consequence, **rename**. When a note matches, the rule renames it from a template, for example `{date} {basename}` for meetings, or a name taken from a property. Read the PRD and Issues 01 and 08 first, and `docs/agents/indexing-watcher-rules.md` (path changes).

**Blocked by:** 10

**Status:** needs-triage

### Proposal

- `AutoOrganizeRule` gets `rename?: string`, a file-name template using the destination `{variable}` syntax, or a computed expression (Issue 08). The `.md` extension is kept, and invalid file-name characters are replaced.
- **Order in the run:** rename, then move, then write the properties at the final path.
- Rename through `renameItem` (`src/lib/core/filesystem/fs.service.ts:280`), so links to the note are rewritten and the tab follows it. The final path goes into the run's skip set (Issue 01, Behavior 9).
- **Idempotent:** when the note already has the target name, nothing happens. With several matching rules, only the first rule with `rename` renames, as the move does.
- **A name clash** (the target exists) skips the rename. It is logged, plus a toast once per note per session, like a failed move (open-itens 082).

### Questions for triage

1. **Link rewrites at scale.** A rename rewrites every note that links to this one. Each rewritten note is saved, and that fires its own rules. A broad rename rule could cascade through the vault. Should rules be skipped for saves made by the link rewriter? The recommended answer: yes. Mark link-rewriter saves and skip them in the observer.
2. **The open note.** Renaming the note the user is typing in changes the tab title and the path mid-edit. Should the rename wait until the tab is not dirty, or not active?
3. **Templates that change every save**, such as a name from `now()`, would rename on every save. Refuse volatile values here, as Issue 08 question 1 decides?
4. **Name collisions across rules:** two notes would get the same name. Add a numeric suffix, or skip?

### Acceptance (draft)

- [ ] A matching save renames the note, and links to it are rewritten; a second save does nothing.
- [ ] A clash skips the rename, logs it and toasts once.
- [ ] Rename plus move plus properties land at the final path in one run, with no re-trigger.
- [ ] The answer to question 1 is covered by a test where a renamed note has backlinks.
- [ ] Docs and Settings updated. Frontend gate passes.

## Notes

- **Origin:** owner request on 2026-11-10, after the MVP.

## Comments
