# 52: Readable note list chips, archived rows and search snippet

**Origin:** split from Issue 39 by the owner on 2026-11-18 (its old items 4 and 5). Design review 2026-11-17, proposal P25 (part), prototype `.scratch/design-review/prototypes/color-contrast-theming.html`, research `.scratch/ux-quick-wins/research/verdict-color.md` (Q5) and `breakdown.md` (old ticket 40).

**What to build:**

1. **Note list chips and archived rows.** The type and property chips use full `text-primary` (`src/lib/features/note-list/NoteRow.svelte:103,114,124`, today `/80`). An archived row loses `opacity-60` (`:70`), keeps the Archive icon and `data-note-row-archived`, and the prop doc at `:33` ("Dims the row ...") changes with it.
2. **Search snippet.** `text-file-explorer-muted-fg` replaces `text-file-explorer-fg/60` (`src/lib/features/search/SearchResult.svelte:171`).

Line numbers are from `085b23c5d`; shell-sidebars-ux 15 and 19 move them. Re-read both files before building.

Not in this ticket: the selected-row subtitle and chips, `--faint-fg` and property value alphas (new tokens, shell-sidebars-ux 04, 10, 11); kanban, calendar and rail colours (Issue 39).

**Size:** S.

**Blocked by:** none

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [x] Failing test first, `src/tests/lib/core/settings/theme-builder.logic.test.ts` over `BUILTIN_THEMES`: `primary` on `primary` at 10% flattened over `fileExplorerBg` is at least 4.5:1, and the old `/80` composite fails on at least one theme (Lavender Haze 3.58).
- [x] An archived `NoteRow` has no `opacity-60` and keeps the attribute and the icon (`RailNoteList.toolbar.test.ts` archived-row test stays green); `SearchResult` snippet has `text-file-explorer-muted-fg` and no `/60` (`SearchResult.test.ts`).
- [ ] Frontend gate: pnpm check and pnpm vitest run pass. The by-eye check on both themes is recorded in the commit.

## Problem

Chips in the note list measure about 3.6:1 at 11 px, an archived row fades the whole row, including the type chip, below readable contrast, and the search snippet is the least readable line of a result.

## Evidence

- `NoteRow.svelte:70` (`opacity-60`), `:103,:114,:124` (`text-primary/80`), `:33` (prop doc); `SearchResult.svelte:171`. Nothing under `src/tests` or `e2e` pins `opacity-60`; the data attribute that tests read survives.
- Contrast figures are the verdict's own WCAG arithmetic on the theme hex values of `src/tests/lib/core/settings/__snapshots__/theme-snapshot.test.ts.snap`.

## Why blocked

External, so not in `Blocked by`: shell-sidebars-ux 15 (`issues/15-note-actions-group-inbox-organized.md`) moves `archived` into `NoteRowNote` and adds the Inbox check to `NoteRow.svelte`; 19 (`issues/19-rail-note-list-keyboard.md`) takes the row `tabindex` there and names `SearchResult.svelte:179-182`. Run this Issue only after both are done (24 and 31 only need a rebase). Until then its status stays `needs-info`; name it in a run only once they land.

## Comments

- 2026-11-18, split from Issue 39 after its first run blocked on this dependency.
- 2026-11-19, triage: ready-for-agent. shell-sidebars-ux 15 (c52c7475e) and 19 (fb5f91cf7) are merged; re-read NoteRow.svelte and SearchResult.svelte before building, the line numbers above moved.
- 2026-11-19, delivered from branch issue/52-note-list-chips-archived-rows-search-snippet. Note list type and property chips use full `text-primary`, archived rows no longer fade (attribute and icon kept), search snippet uses `text-file-explorer-muted-fg`; a theme test pins pill contrast on every built-in theme. Review round 1: APPROVED (four findings, none asking for code; pill hover contrast filed as Issue 54). Tests: pnpm check exit 0 (review); full suite 672 files, 17990 passed, 56 skipped, 1 todo, exit 0. The by-eye check on KokoBrain Default and Lavender Haze was not done (no app window in deliver), so the third criterion stays unticked; the owner checks it.
