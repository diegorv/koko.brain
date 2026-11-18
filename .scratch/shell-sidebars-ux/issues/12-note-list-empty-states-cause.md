# 12: The rail note list says why it is empty and what to do next

**Origin:** design review 2026-11-17, proposal P29 (rail half; the collection-table half is in 16), prototype `.scratch/design-review/prototypes/note-list-rail.html`, research `.scratch/shell-sidebars-ux/research/verdict-nl-empty-states.md` and `breakdown.md` (old ticket 12). Absorbs the EmptyState half of `.scratch/open-itens/issues/204-emptystate-inlinealert-badge-primitives-exist.md` (its Badge half goes to review P93 and its InlineAlert half to the feedback-components group; keep 204 open for those or move them).

**What to build:** an empty rail list no longer just says "No notes here" (`src/lib/features/rail-shell/RailNoteList.svelte:876-879`). Each case names its cause and, where there is one, a next step:

1. **Per-lens copy.**
   - Favorites: "No favorites yet" / "Star a note with ⌘D, the star above the note, or its row menu."
   - Inbox: "Inbox zero" / "Notes not marked organized show here. Mark one with ⌘E."
   - Archive: "Nothing archived" / "Archive a note from the ... menu above it. Archived notes leave Inbox and Today." (15 rewrites the Archive and Inbox hints once the row menu has those actions.)
   - Untyped: "Every note has a type." Type: "No {label} notes yet" / "Use + to create one." Folder: "This folder is empty."
   - View with no filters: "No notes in this view". View with N filters: "No notes match N filter(s)" with an Edit filters action that opens the Filter panel and writes nothing (singular at 1).
2. **Archived-filter causes** (local state, no file write): "Only archived" with nothing archived shows "No archived {label} notes" with Show active. "Hide archived" with every note archived shows "All {n} {label} notes are archived" with Show archived. `hiddenArchivedCount` is `resolveLens(shownLens, ctx, providers, 'all').notes.length`, computed only when a type or Untyped list is empty under "Hide archived".
3. **Gone targets** (the null lens, `lens.logic.ts:363,392-394,446-447,536-537`): bare Types "No types yet"; folder "This folder no longer exists"; neighbourhood "This note is no longer in the vault"; unknown kind or plugin provider (the Calendar day lens) "Nothing to show here", no hint (`features/` cannot import `plugins/`).
4. **Search with no match.** `No notes match "{query}"` / "Search covers titles and content of this list." with Clear search (empties the query, keeps the search row open). It must also show on grouped lenses (Today, neighbourhood): `filterResolvedLens` keeps empty groups (`list-search.logic.ts:36-58`) and `groupedItems` is tested first (`RailNoteList.svelte:815` before `:872`), so today a no-match query on Today shows zero-count group headers and no no-match state. Show it when `searching && notes.length === 0` for grouped lenses too. While the full-text search runs with no local match, show a compact "Searching note contents..." line (`data-note-list-searching`), not the no-match state and not the loading block (`RailListSearch` already spins).
5. **View statuses.** Loading becomes a spinner with "Loading notes"; Missing gets "Its .view file was moved or deleted." (true for a rail pin too) and no action; Error keeps `role="alert"`, `data-note-list-error-message` and the Open view button, and adds "Fix the .view file and the list reloads."
6. **Code.** New `src/lib/components/EmptyState.svelte` (`title`, `hint`, `icon`, `action { label, onclick }`, `compact`, `spinner`, `class`, rest props; `compact` is one `p.text-meta` with no icon; imports nothing from core, features or plugins). New pure `src/lib/features/rail-shell/list-empty.logic.ts` `explainEmptyList(input)` returning `{ icon, title, hint?, action? }` (`action`: `clear-search | edit-filters | show-active | show-archived`; icon is a key string mapped in the component; precedent `explainEmptyTasks`, `task-query.logic.ts:1436-1446`). Precedence: searching, null lens, view filters, archived filter, per-lens copy, generic. All copy lives in one table so 15 changes one entry. Every `data-note-list-*` hook stays on the wrapper; query text is text, never `{@html}`. No header edits. Today's empty group keeps the compact "Nothing here" when not searching.
7. **Docs.** Rewrite `help/documentation/25-types-and-relationships.md:448-457`. Add one line to `docs/adr/0003-four-layer-source-taxonomy.md` (layout list) and the CLAUDE.md layer table: `components/` outside `ui/` holds hand-written shared primitives with the same import rule (not `components/ui/`, which is shadcn only per ADR-0002; not feature-local, which would close a `collection` -> `rail-shell` cycle once 16 uses it).

Not in this ticket: right-sidebar panels explaining non-note tabs (replaced by hiding the sidebar, see 26); "Remove from sidebar" on a missing view; kanban empty lanes (kanban-board group P02, P05, P143); the "showing N of M" strip and "N notes are hidden by filters" (need an unfiltered second query; the count reaches the user through 16's Filter badge); a styling sweep of the other ~30 empty strings (open-itens 205 or the feedback-components group); a "Clear filters" action in the empty state (P29 asked for it; this ticket ships Edit filters and 16 puts Clear filters inside the panel).

**Split point if one context struggles:** 12a the primitive, the logic and the flat and grouped list states; 12b the view statuses, filters, archived filter and help. In sequence.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`

- [x] Failing test first, `src/tests/lib/features/rail-shell/list-empty.logic.test.ts` (no mocks), one case each pinning the literal title and action, hints as literals containing `⌘D` or `⌘E`: Favorites, Inbox, Archive; a view with 0, 1 and 3 filters (singular at 1); "Only archived" giving `show-active`; "Hide archived" with 4 hidden giving `show-archived`; each null case (bare Types, folder, neighbourhood, unknown); `searching` beats every lens case; `fullTextLoading` with no local match gives the searching line.
- [x] `src/tests/lib/components/EmptyState.test.ts`: title; hint and action only when given, action click calls it; `compact` is one `p.text-meta` with no icon; `spinner` renders `animate-spin` and the title; `data-*` and `class` reach the root.
- [x] Failing test first, `RailNoteList.search.test.ts`: on `TODAY_LENS` with one dated note, a no-match query shows `[data-note-list-no-matches]` with `No notes match "zzzz"` and no `[data-note-list-group-empty]` (red today); Clear search empties the input and restores rows on a flat list; with the full-text `invoke` pending (pattern `RailNoteList.toolbar.test.ts:430-445`) `[data-note-list-searching]` shows and no-match does not, then no-match shows once it resolves empty. The neighbourhood case at `:326` changes on purpose only when every group is 0.
- [x] `RailNoteList.test.ts`: Favorites, Inbox and Archive empties show title and hint inside `[data-note-list-empty]`; "Only archived" shows Show active and clicking it lists the active notes; a type whose only note is archived shows "All 1 ... notes are archived" and Show archived lists it; a bare Types lens shows "No types yet".
- [x] `RailNoteList.view.test.ts` (real stores, `invoke` mocked): two seeded filters and zero results show "No notes match 2 filters"; Edit filters opens the Filter panel, it is still open after a tick, and nothing was written; Loading shows the spinner and "Loading notes" with no `[data-note-list-empty]`; Missing keeps `[data-note-list-missing]` and shows the hint; Error keeps `role="alert"`, the message and `[data-note-list-open-view]` and shows the hint.
- [x] The text pins that change on purpose (`RailNoteList.test.ts:381,417,516,872,935`, `RailNoteList.view.test.ts:589,611,702,718,746,801,860,872,877,880`, `RailNoteList.search.test.ts:357,365`, `RailNoteList.toolbar.test.ts:317`) query the title element; none is loosened to `toContain`.
- [x] `layer-rules`, `feature-cycle`, `lib-specifier-convention`, `chrome-type-scale`, `chrome-state-styles` and `palette-classes` tests pass with the new files.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P29.** Empty and loading states say "nothing" without the cause or a next step (about 25 variants). Add a small EmptyState (icon, title, hint, optional action), give each lens a hint, make filtered views say "No results match N filters" with Clear filters, and have Properties explain unsupported files. Validation: revise; the note list already separates loading, missing, error and no-match; no skeletons.
- **204 (absorbed, EmptyState half).** EmptyState, InlineAlert and Badge primitives exist as hand-copied markup; build the EmptyState here.

## Problem

Every flat empty list prints "No notes here", whatever the cause: a lens with nothing in it, a filter or archived setting that hides everything, or a target that is gone. A filtered-out list looks like data loss. On Today and the neighbourhood lens a search with no match shows empty group headers and never the no-match message.

## Evidence

Checked at `ab143a411`.

- `src/lib/features/rail-shell/RailNoteList.svelte:872-879` (no-match "No matching notes", then "No notes here"); `:815-816` grouped `VList` tested before them; `:665` `groupedItems`.
- `src/lib/features/rail-shell/lens.logic.ts:307-313` `BUILT_IN_LENSES` carries no empty copy; null-lens paths at `:363`, `:392-394`, `:446-447`, `:536-537`.
- `src/lib/features/rail-shell/list-search.logic.ts:36-58` keeps empty groups.
- `src/lib/components/` holds only `ui/` today, so `EmptyState.svelte` is new; ADR-0003 (`:64`, `:75`) and ADR-0002 (`:48`) do not list the location.
- `help/documentation/25-types-and-relationships.md:448-457` documents the old copy.

## Sequence with

- 15, 16, 17, 19, 20, 24: all edit `RailNoteList.svelte` on other lines (the `{#if}` chain `:815-879` here; the header `:698-801` in 16 and 17). 19 edits the same `{#if}` chain and both `VList`s, so it is blocked by this ticket.
- 34 (pane-band) rewrites the header band class at `RailNoteList.svelte:699`.
- 05 (right sidebar headers): its all-hidden text uses `EmptyState` if it exists.
- open-itens 010, 132, 136, 137, 250 touch the same file (header, rule line, view tests); rebase only.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: granularity of 34 consolidated tickets (this is old ticket 12 unchanged). Defaults (not individually answered): 12.1 a filtered-out view offers Edit filters, not Clear filters; 12.2 include the archived-filter causes; 12.3 `EmptyState` in `src/lib/components/` with an ADR-0003 and CLAUDE.md line; 12.4 the hint copy as written above; 12.5 Today's empty group keeps the compact "Nothing here" when not searching.
- 2026-11-18, deliver (issue/12-note-list-empty-states-cause): `EmptyState` component and `explainEmptyList` logic; the rail note list names why it is empty (search, view filters, archived filter, per-lens copy) with an action. Review fixes: help doc says "Loading notes"; Clear search refocuses the search input. Tests: pnpm check 0 errors; full suite at 1eaabc7fb 649/649 files, 17170 passed, 54 skipped. Reviews: round 1 APPROVED, round 2 APPROVED (no findings).
