# 118: Group by note type, note property or heading

**Origin:** `tasks-view` Issue 15, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/tasks-view/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** The owner organizes typed notes with meta-bind properties, so those are the natural categories. The rows carry `noteType`, `properties` and `headings` since Issue 12. Add three groupings to the Display menu (Issue 08), after Status:

- **Note type:** one group per `noteType` value, labels sorted case-insensitively, plus "No type" last for `null`.
- **Note property:** a "Property" submenu (`DropdownMenuSub`) lists the frontmatter keys present in the rows, sorted. Picking one sets `group: { property: key }`. A scalar value groups by `String(value)`; a list value groups by its elements as strings, sorted and joined with ", " (`[b, a]` lands in "a, b"); a missing key, `null`, `''` or `[]` goes to "(empty)". Groups are sorted by label, "(empty)" last.
- **Heading:** one group per nearest heading (the last entry of `row.headings`), labelled `<heading text>, <relPath without .md>` ("Next steps, Projects/ACME"); tasks before the first heading go under a group labelled with the note's `noteTitle`. Groups follow note `relPath` order, then heading order in the note. Rows keep document order, and the dimmed-parent rule of note grouping (Issue 07) applies, as the PRD's "Parents" rule says.
- Type, property and heading groups keep Issue 08's flat-row rules except heading, which behaves like note grouping (document order, dimmed parents kept).
- Type groups get "Only this type" and "Hide this type" header actions, like Issue 14's folder actions: "Only this type" adds a type clause to every card (or one card with it when there are none); "Hide this type" adds it to `query.exclude.types`. The "No type" group gets no actions.

`TaskGroupKey` gains `'type' | { property: string } | 'heading'`.

**Blocked by:** 117

**Status:** resolved

**Answered:** PRD B6 (a), so heading grouping stays in this Issue (owner, 2026-11-06).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [x] Failing test first, `task-query.logic.test.ts`: type groups with a "No type" bucket last; property groups on a scalar, a number, a list (`[b, a]` lands in "a, b"), and missing and empty values; heading groups including tasks before the first heading, and a failing parent kept dimmed above a matching child. Fails today (no such groupings).
- [x] `onlyThisType` / `hideType` in `task-query.logic.ts`, tested like Issue 14's folder helpers.
- [x] `TasksView.test.ts`: choosing Display > Property > `area` shows one header per area value with counts, and "Hide this type" on a type group removes it.

## Notes

- **Size:** S to M.
- Group by parent note (`_belongs_to`) is left for later (PRD non-goals).

- 2026-11-12, branch `issue/118-group-by-type-property-heading`: Display grouping by note type, note property and heading, with `onlyThisType`/`hideType`. Review round 1 APPROVED with findings, fixed: heading groups drop orphan dimmed parents and give split children a breadcrumb; property collapse keys JSON-encoded; type/property labels ordered with `compareTaskPaths`. Round 2 APPROVED, no findings. Tests: pnpm check 0 errors; tasks tests 777 passed; full suite at 0fcb00182 exit 0, 16405 passed, 54 skipped, 1 todo.
