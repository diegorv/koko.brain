# 01: A view lists `.view` files as notes, an unfiltered view lists itself

**What to build:** The note list of a picked view lists only notes, never `.view` files. Today an unfiltered view (for example a fresh one from New view) shows every `.view` file in the vault as a row, itself included, once the index refresh lands; a filtered view shows any `.view` whose top-level keys happen to match.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

- [ ] A view with no filters lists the vault's notes and no `.view` file, its own included (logic test on the view lens, real stores)
- [ ] A filtered view never lists a `.view` file, even one whose keys match the filter (logic test)
- [ ] The collection editor's table for the same `.view` is checked and the decision recorded: either it also drops `.view` rows, or it keeps them on purpose

## Notes

- **Traced, not reproduced in the running app.** Rust's `is_markdown_filename` counts `.view` as markdown, so `.view` files are indexed as entries and projected into the property records that `executeQuery` starts from. `resolveViewLens` in the rail shell's lens logic drops only the system folder and archived notes, so the `.view` paths in the query result become rows.
- The E2E vault-index mock indexes only `.md` files, so the E2E suite cannot show this today.
- Found during the review of `.scratch/view-create-dialog` (2026-11-04); that feature makes an unfiltered view a common result but does not fix it.

## Comments
