# 17: Help docs speak of views, and their examples work

**What to build:** two things in `help/documentation/12-collection.md`.

**Speak of views.** Since view-unification only `.view` exists, but the page still presents "Collection" as the feature: the title `# Collection`, "What Are Collection?", "Collection are saved as `.view` files", "Creating a Collection", "There are three ways to create a collection". Rewrite the prose around views: a `.view` file, shown as a table, calendar or linear-calendar in its editor tab, listed in Views unless hidden, or embedded with a ` ```collection ` block. Keep the file path and the anchors other pages link to (`grep -rn '12-collection.md#' help/ src/`), and keep `src/tests/help/collection-features.test.ts` green. Renaming the file itself is out of scope. Follow the vocabulary in `.scratch/view-editor/PRD.md` § Vocabulary.

**Fix what the code contradicts** (`.scratch/view-editor/research/validated/A13.md`, `synthesis-completeness.md` C8):
- `:32-34`: the manual creation steps give a file that fails to parse, and New table lists every note.
- `:180`: inline blocks run `views[0]` and can draw calendars.
- `:352`: `daysLeft: "date - today()"` gives NaN, because frontmatter dates reach the evaluator as strings. Use `date(due) - today()`.
- `:348`: a compound `&&` string becomes a raw row; prefer an `and:` list (or say that 14 now splits it).
- `:316-325`: `file.tags` as a column (works once 03 lands).
- Missing: in inline blocks, the table caps at 50 rows and the linear calendar at 3 lanes (`collection-block-widget.ts:64`); the order of notes without the value in a DESC sort, as it stands when this runs (04 may have changed it).

Re-check each line against the code at the time this runs, since 02, 03, 04 and 14 change behavior.

**Blocked by:** 03, 14

**Status:** ready-for-agent

**Gate:** docs only: `pnpm vitest run src/tests/help/` (the help tests, `collection-features.test.ts` included); no full suite. Check every code fact cited in the edited lines.

- [ ] Each item above fixed or confirmed still true.

## Notes

- **Size:** S.
