# Verdict: Empty and loading states cluster (P29)

Adversarial check of `scout-nl-empty-states.md` against HEAD `ab143a411`. Read-only. I opened every cited line in `RailNoteList.svelte` (`:100-260`, `:480-560`, `:655-907`), `lens.logic.ts` (`:106-115`, `:179-208`, `:295-455`, `:536`, `:1011`), `list-search.logic.ts:34-62`, `RailListSearch.svelte`, `RailArchivedMenu.svelte:18-24`, `AppShell.svelte:100-170, 262-296`, `calendar-rail.service.ts`, `NoteActionBar.svelte`, `NoteRowMenu.svelte:250-275`, `global-keybindings.ts:185-205`, `utils/keybindings.ts:36-52`, `layout.logic.ts:15-28`, `editor.service.ts:143-195`, `editor.logic.ts:20-31`, the four right-sidebar panels, `CollectionTableView.svelte`, `CollectionView.svelte:690-735`, `scripts/import-graph.mjs:175-212`, ADR-0002 and ADR-0003, the rail test files, `help/documentation/25-types-and-relationships.md:448-457`, open-itens 204, 205, 206, 212, 010, 132, 250 and the ledger, and every sibling scout in this folder.

## Proposal: still real?

| ID | Verdict | Verified at |
|---|---|---|
| P29 | **revise** | Rail half real: `RailNoteList.svelte:876-879` prints "No notes here" for every flat empty list; `BUILT_IN_LENSES` (`lens.logic.ts:307-313`) carries only `label`, `rule`, `includes`, `newNote`. Collection half real but inverted, as the scout says: `CollectionTableView.svelte:34-38` prints "No results match the current filters" unconditionally. Properties half: the defect is not missing copy but that a `.txt` tab gets the full note panels; it belongs to P97's ticket, not here (see Dropped). Kanban half: owned by the kanban group. Skeletons: none, correctly. |

The scout's line numbers check out at HEAD. The places where it is wrong or short follow.

## Where the scout is wrong or incomplete

1. **Neighbourhood never reaches the flat empty branch.** The scout's inventory row 6 and T1 criterion 2 treat neighbourhood as a flat "No notes here" case with "a distinct hint". It is a grouped lens: seven groups, "This note" always holds the note itself (`RailNoteList.test.ts:836-851` mounts it and expects six `[data-note-list-group-empty]`). It renders through `{#if groupedItems}` (`:815`) and never hits `:876`. Only a **null** neighbourhood (its note left the snapshot, `lens.logic.ts:392-394`) reaches `:876`. The criterion as written cannot be met through the component.
2. **Search no-match is broken on the default lens, and T1's criterion would pass anyway.** `filterResolvedLens` keeps empty groups (`list-search.logic.ts:36-37, 51-58`), and `groupedItems` is tested before the no-match branch (`:815` vs `:872`). So on Today (the default rail item, `lens.logic.ts:121`) and on a neighbourhood, a query that matches nothing shows group headers at 0 and one "Nothing here" per group, never "No matching notes". The scout's criterion 4 is checked only on a flat list, so it passes while Today stays broken. Fix in T1: when `searching && notes.length === 0`, show the no-match state even for a grouped lens. `notes` holds every grouped note once (`rail-shell.types.ts:68-69`), and Today's plugin sections are already hidden while searching (`:671`).
3. **The archived filter is a filter too, and P84's scout handed it to this ticket.** `scout-nl-header-creation.md:116` says the P29 ticket must read `activeFilterCount` **and** `archivedFilter`. The scout reads only `activeFilterCount` and leaves the archived case out (its point 11). A type or Untyped lens set to "Only archived" (`RailArchivedMenu.svelte:21`) with no archived notes shows "No notes here", as does a type whose notes are all archived under "Hide archived". That is the "filtered-out list looks like data loss" case the proposal names. Both actions are local state with no file write (`archivedFilter` is component-local and not saved, `RailNoteList.svelte:140`), so they cost little. I folded them into T1 behind an owner question.
4. **The "N filters ... showing N of M" strip from P84's prototype has no ticket.** `scout-nl-header-creation.md:96, 116` says the strip and the filtered empty state "belong to P29". This scout tickets the empty state but never mentions the strip. "of M" needs the same unfiltered second query as "7 notes are hidden", which this scout already drops (point 5), and N2 of the header cluster puts the count on the Filter badge. Dropped here for the same reason, and listed under Dropped so the breakdown does not lose it between the two clusters.
5. **The missing-view hint misdirects.** The scout's default for the missing view is "Pick another list in Types." A missing view is also reached from a **rail pin**: `restoreRailItem` keeps `view:<path>` as the item (`lens.logic.ts:204-205`) after the file is gone, and the user is not in Types then. Use the prototype's hint ("Its .view file was moved or deleted."), which holds in both cases. No action, as the scout says.
6. **The null-lens criterion is too weak.** "A null `resolved` returns a title that is not 'No notes here'" passes with any string. The null cases can be told apart by lens kind alone, and each is reachable:
   - bare Types lens: a vault with no types and no views, Untyped hidden. `pickedTypesLens` falls back to `TYPES_LENS` (`lens.logic.ts:536-537`), and `resolveTypeLens` returns null with no target (`:363`).
   - folder gone mid-session: `staleFolderPickFix` runs once per vault open (`:1020-1028`).
   - neighbourhood note gone: `:392-394`.
   - unknown provider kind: `:446-447`.

   Each gets a fixed title (below).
7. **Plugin lens providers are not covered.** The Calendar day lens (`calendar-rail.service.ts:33-43`) lists through a provider. An empty day falls into `:876`. `features/` cannot import `plugins/` (`import-graph.mjs:205`), so `list-empty.logic.ts` cannot know the day lens. Default: an unknown kind gets the generic title with no hint. The provider already offers its own next step in the header ("Daily note", `headerAction`). Adding an `empty` field to `RailLensProvider` is possible but not asked for.
8. **The Favorites hint skips a surface that exists.** The row menu has Favorite at HEAD (`NoteRowMenu.svelte:261-263`), so the hint can name it. Archive and Organized exist only in the note toolbar (`NoteActionBar.svelte:146-162, 207-215`). The Inbox hint "Captured notes land here" is false when `explicitOrganization` is off (`scout-nl-actions-keyboard.md:24`). Use neutral copy: "Notes not marked organized show here. Mark one with ⌘E."
9. **Help page pins the old copy.** `help/documentation/25-types-and-relationships.md:448-457` documents "Loading...", "This view no longer exists" and "No notes here". The scout's file list leaves it out. T1 must rewrite it.
10. **Where the primitive lives is an ADR question, and there is a cycle trap.** ADR-0003 (`:64, :75`) documents only `components/ui/`, and ADR-0002:48 says hand-made primitives are "feature-local, not in `components/ui/`". The scout's `src/lib/components/EmptyState.svelte` is fine for the layer scan (`locate` gives layer `components`, and `ruleFor` forbids only imports into core, features and plugins, `import-graph.mjs:208`), but the taxonomy does not list it. Keeping it feature-local in `rail-shell/` is not an option once T3 uses it: `rail-shell` already imports `collection/toolbar/FilterPanel`, so `collection` importing `rail-shell` would close a cycle that `feature-cycle.test.ts` fails. Recommended: `src/lib/components/EmptyState.svelte`, plus one line in ADR-0003's layout list and the CLAUDE.md layer table saying that `components/` outside `ui/` holds hand-written shared primitives with the same import rule.
11. **The no-match "spinner state" during FTS is a second spinner.** `RailListSearch` already spins in the input while `loading` (`RailListSearch.svelte:103`, fed `fullTextLoading` at `RailNoteList.svelte:790`). A full "Loading notes" block in the list on every keystroke is its own flash. Default: while `fullTextLoading` and no local match, show a compact muted "Searching note contents..." line (`data-note-list-searching`), not the no-match state and not the big loading state.
12. **Type scale numbers.** The scout says the roles are 12/14/15 px (`app.css:94-100`). There are also `text-label` 11px and `text-rail` 13px (`app.css:92-97`). It does not change the design: the hint is `text-meta`, the title `text-row font-semibold`.
13. **Stale-ledger and replacement accounting for 205 is wrong.** The scout says T1 + T2 "replace" 205's empties. T1 edits none of 205's sites. 205's list is Backlinks, Outgoing, TOC, Tags, Search, Trash and Appearance empties, plus raw error text in SearchSection and the event calendar. T2 edits the "Not available" lines, which 205 excludes in so many words ("'Not available' ... stay plain text"). No ticket in this cluster does 205's work. Listing it as replaced would drop it silently. See Overlaps.
14. **204's residual halves have owners elsewhere in the review.** Badge is review P93 ("Chips and badges are rebuilt in every feature", feedback-components group). InlineAlert has no proposal, and P16 (errors go to the wrong channel, the same group) is its nearest home. So 204 is fully accounted for: EmptyState here, Badge in P93, InlineAlert as a residual for the feedback-components breakdown.
15. **Shared-file neighbours the scout under-states.**
    - P24 ticket F (`scout-nl-actions-keyboard.md:171`) puts a roving keyboard model on the list body: both `VList`s at `:816` and `:880`, inside the same `{#if}` chain T1 rewrites. T1 and F must run in sequence.
    - P39 ticket B adds Archive and Mark organized to the row menu, and the Archive and Inbox hints then go stale. Keep all hint copy in one table in `list-empty.logic.ts`, so that B changes one entry and its test.
    - open-itens 010 (ready-for-agent, abandoned folder) turns "unknown method lists 0 notes" into an error. Until then such a view shows T1's "No notes match 1 filter", which is acceptable.

Checked with no new finding: `hidesRightSidebar` covers every `fileType` `openFileInEditor` sets (`layout.logic.ts:23-28`, `editor.service.ts:186-189`); the Cmd+D and Cmd+E bindings are fixed (`global-keybindings.ts:189-201`, no user override anywhere in `src/lib`); `formatShortcut` is in `utils` and importable from a `.logic.ts`; `RailListSearch` re-syncs its draft from `value` (`:31-38`); the pin is `_rail: true` in the file (`rail-pin.logic.ts:1-7`, `lens.logic.ts:210-214`); no e2e spec asserts the empty copy; no active `.scratch` folder (tasks-view-ux, frontmatter-rules, vault-organization-v2, preview-channel, claude-code-integration, mods-host-robustness, finders-ux) has a non-resolved Issue touching `RailNoteList.svelte`, `CollectionTableView.svelte` or an EmptyState.

## Ticket breakdown

Order: T1, then T3. T1 runs in sequence with P24-F and before P39-B when possible. T3 can run in parallel with T1 only if the primitive is split out (it is not; T3 waits for T1).

### T1. The rail note list says why it is empty and what to do next (P29, rail half). Size M

**Files:**
- New `src/lib/components/EmptyState.svelte`.
- New `src/lib/features/rail-shell/list-empty.logic.ts`.
- `src/lib/features/rail-shell/RailNoteList.svelte`: the `{#if}` chain `:815-879` and the action handlers (`filterOpen`, `query`, `archivedFilter`). No header edits.
- `help/documentation/25-types-and-relationships.md:448-457`.
- One line in `docs/adr/0003-four-layer-source-taxonomy.md` (layout list) and the CLAUDE.md layer table, for the new `components/` location.
- Tests: new `src/tests/lib/components/EmptyState.test.ts`, new `src/tests/lib/features/rail-shell/list-empty.logic.test.ts`, `RailNoteList.test.ts`, `RailNoteList.search.test.ts`, `RailNoteList.view.test.ts`, `RailNoteList.toolbar.test.ts`.

**Blocked by:** none.

**Sequence with:**
- P24-F (list body, same `{#if}` chain).
- P39-B (hint copy).
- The nl-header-creation tickets N2 and N3. They edit the header at `:698-801`, so the lines do not overlap, but the file is the same and it needs a rebase.
- P84's N1 adds Clear filters inside `FilterPanel`, which T1's "Edit filters" opens. Either order works.

**What to build:**
- `EmptyState`: props `title`, optional `hint`, optional `icon` (a component), optional `action { label, onclick }`, `compact`, `spinner`, `class` (tone), rest props for `data-*`. `compact` renders a single `<p class="text-meta ...">` with no icon circle. Classes must pass `chrome-type-scale`, `chrome-state-styles` and `palette-classes`. It imports nothing from core, features or plugins.
- `list-empty.logic.ts`, pure: `explainEmptyList(input)` returns `{ icon, title, hint?, action? }` with `action` one of `clear-search | edit-filters | show-active | show-archived`. The input holds:
  - `kind`, `resolvedIsNull`, `isView`, `filterCount`;
  - `archivedFilter` and `hiddenArchivedCount` (type and Untyped only);
  - `query` (trimmed), `searching`, `fullTextLoading`.

  The icon is a key string mapped to a lucide component in the Svelte file, so the logic has no framework import. Precedent: `explainEmptyTasks` (`task-query.logic.ts:1436-1446`). Precedence: `searching`, then null lens, then view filters, then archived filter, then the per-lens copy, then generic.
- Copy (owner may edit, tests pin it):
  - Favorites: "No favorites yet" / "Star a note with ⌘D, the star above the note, or its row menu."
  - Inbox: "Inbox zero" / "Notes not marked organized show here. Mark one with ⌘E."
  - Archive: "Nothing archived" / "Archive a note from the ... menu above it. Archived notes leave Inbox and Today."
  - Untyped: "Every note has a type."
  - Type: "No {label} notes yet" / "Use + to create one."
  - Folder: "This folder is empty."
  - View with 0 filters: "No notes in this view".
  - View with N filters: "No notes match N filter(s)" and Edit filters.
  - Archived filter "Only archived": "No archived {label} notes" and Show active.
  - "Hide archived" with `hiddenArchivedCount > 0`: "All {n} {label} notes are archived" and Show archived.
  - Null lens: bare Types "No types yet"; folder "This folder no longer exists"; neighbourhood "This note is no longer in the vault".
  - Unknown kind or provider: "Nothing to show here", no hint.
  - Search: `No notes match "{query}"` / "Search covers titles and content of this list." and Clear search.
- `RailNoteList.svelte`:
  - Grouped lenses render the no-match state when `searching && notes.length === 0`. Otherwise Today's group notice stays the compact "Nothing here" line.
  - Loading becomes `EmptyState spinner` "Loading notes".
  - Missing gets the hint "Its .view file was moved or deleted." and no action.
  - Error keeps `role="alert"`, `data-note-list-error-message` and the Open view button exactly, and adds the hint "Fix the .view file and the list reloads."
  - `hiddenArchivedCount` is `resolveLens(shownLens, ctx, providers, 'all').notes.length`. The active list is empty in this case, so every note it counts is an archived one. It is computed only when a type or Untyped list is empty under "Hide archived" (a `$derived` that returns 0 otherwise).
  - Edit filters sets `filterOpen = true` and writes nothing. Clear search sets `query = ''` and keeps the search row open. Show active and Show archived set `archivedFilter`.
  - Every `data-note-list-*` hook stays on the wrapper. Query text renders as text, never `{@html}`, and is clamped with CSS.

**Acceptance criteria:**
- [ ] Failing test first, `list-empty.logic.test.ts` (real function, no mocks). Each of these is a separate case pinning the literal title and action, with the hint asserted as a literal containing `⌘D` or `⌘E`, not recomputed through `formatShortcut`:
  - Favorites, Inbox and Archive;
  - a view with 0, 1 and 3 filters (singular at 1);
  - "Only archived" with nothing archived, giving `show-active`;
  - "Hide archived" with 4 hidden, giving `show-archived`;
  - each null case (bare Types, folder, neighbourhood, unknown);
  - `searching` beats every lens case;
  - `fullTextLoading` with no local match returns the searching line, not the no-match title.
- [ ] `EmptyState.test.ts`:
  - The title renders.
  - The hint and the action render only when given, and clicking the action calls it.
  - `compact` renders one `p.text-meta` with no icon element.
  - `spinner` renders an `animate-spin` element and the title.
  - `data-*` and `class` reach the root.
- [ ] `RailNoteList.search.test.ts`:
  - On `TODAY_LENS` with one dated note, a query that matches nothing shows `[data-note-list-no-matches]` with `No notes match "zzzz"` and no `[data-note-list-group-empty]`. This is red today: 1 group-empty, no no-match.
  - On a flat list, Clear search empties the input and restores the rows.
  - With the FTS `invoke` held pending (pattern `RailNoteList.toolbar.test.ts:430-445`), `[data-note-list-no-matches]` is absent and `[data-note-list-searching]` shows. After the call resolves empty, the no-match state shows.
  - The neighbourhood case at `:326` changes on purpose only when every group is 0.
- [ ] `RailNoteList.test.ts`:
  - Favorites, Inbox and Archive with no notes show their title and hint inside `[data-note-list-empty]`.
  - A type lens under "Only archived" with nothing archived shows Show active, and clicking it lists the active notes.
  - A type whose only note is archived shows "All 1 ... notes are archived", and Show archived lists it.
  - A bare Types lens (no rows) shows "No types yet".
- [ ] `RailNoteList.view.test.ts`, real stores, `invoke` mocked:
  - A view with two seeded filter rows and zero results shows "No notes match 2 filters".
  - Edit filters opens the Filter panel, the panel is still open after a tick, and no write to the `.view` happened.
  - Loading shows the spinner and "Loading notes", with no `[data-note-list-empty]`.
  - Missing keeps `[data-note-list-missing]` and shows the hint.
  - Error keeps `role="alert"`, the message and `[data-note-list-open-view]`, and shows the hint.
- [ ] The text pins that change on purpose:
  - `RailNoteList.test.ts:381, 417, 516, 872, 935`;
  - `RailNoteList.view.test.ts:589, 611, 702, 718, 746, 801, 860, 872, 877, 880`;
  - `RailNoteList.search.test.ts:357, 365`;
  - `RailNoteList.toolbar.test.ts:317`.

  They change because the title and hint now share the wrapper. Query the title element; do not loosen to `toContain`. Every `data-note-list-*` hook still exists.
- [ ] `layer-rules.test.ts`, `feature-cycle.test.ts`, `lib-specifier-convention.test.ts`, `chrome-type-scale.test.ts`, `chrome-state-styles.test.ts` and `palette-classes.test.ts` pass with the new files.
- [ ] Help page `25-types-and-relationships.md:448-457` describes the new states (a view with filters, Edit filters, the hints).
- Gate: frontend only, `pnpm check` + `pnpm vitest run`.

If one context struggles, split in sequence (never in parallel, same lines):
- T1a: the primitive, the logic, and the flat and grouped list states.
- T1b: the view statuses, filters, the archived filter and help.

### T3. The collection table says whether filters hid its rows (P29, collection half). Size S

**Files:**
- `src/lib/features/collection/CollectionTableView.svelte:34-38`: new `filterCount` and `onEditFilters` props, using `EmptyState`.
- `src/lib/features/collection/CollectionView.svelte:726-731`: pass `activeFilterCount` (`:222`) and open `filterOpen` (`:111`).
- Tests `CollectionTableView.svelte.test.ts` and `CollectionView.test.ts`.

**Blocked by:** T1 (`EmptyState`).

**Sequence with:** P84's N1, which rewrites `CollectionView.svelte:222-225` (the shared count helper) and `:620-669`. The lines do not overlap, but pass whichever count N1 leaves.

**What to build:**
- With no filter: "No rows in this view".
- With N filters: "No rows match N filter(s)", plus an Edit filters action that opens the existing Filter popover and writes nothing.
- The live-preview widget copy (`collection-block-widget.ts:160-165`) is untouched.

**Acceptance criteria:**
- [ ] Failing test first, `CollectionTableView.svelte.test.ts`: an empty `QueryResult` with `filterCount` 0 does not contain "filter". This is red today, because the text is unconditional.
- [ ] `filterCount` 2 shows "No rows match 2 filters" (1: singular) and an Edit filters button that calls `onEditFilters`.
- [ ] `CollectionView.test.ts` (real `collectionStore`): with a filtered-out view, Edit filters opens the Filter panel and nothing is written. A view with rows is unchanged.
- Gate: frontend only.

## Owner questions (with recommended defaults)

1. **Filtered view action: Edit filters or Clear filters?** Clear writes through to the `.view` file (`RailNoteList.svelte:350-358`). Recommended: Edit filters. P84's N1 puts Clear filters inside the panel it opens.
2. **Archived-filter causes in T1 (Show active, Show archived).** Recommended: include. They are local state, P84's scout handed them here, and they are the data-loss look the proposal names.
3. **Where `EmptyState` lives.** Recommended: `src/lib/components/EmptyState.svelte`, with one line added to ADR-0003 and the CLAUDE.md layer table. Not `components/ui/` (shadcn only, ADR-0002), and not feature-local (that would create a `collection` to `rail-shell` cycle once T3 uses it).
4. **Hint copy.** Recommended: the strings in T1, written for HEAD. P39-B updates the Archive and Inbox hints when the row menu gains those actions.
5. **Today's empty group.** Recommended: keep the compact "Nothing here" when not searching. Searching with no match shows the full no-match state.
6. **Missing view.** Recommended: hint "Its .view file was moved or deleted." and no action.

## Overlaps

| Issue | Status | Decision |
|---|---|---|
| `open-itens/issues/204-emptystate-inlinealert-badge-primitives-exist.md` | ready-for-agent, ledger `todo` | **Replaced** by T1 for the EmptyState half. Badge goes to review P93 and InlineAlert to the feedback-components group (nearest P16). Note both in the README so they are not dropped silently. |
| `open-itens/issues/205-sidebar-panels-settings-use-empty-error-primitives.md` | ready-for-agent, blocked by 204 | **Not replaced.** No ticket here edits its sites. It explicitly excludes "Not available". Owner call: wontfix with the abandoned folder, or hand it to the feedback-components breakdown (P16, P172). |
| `open-itens/issues/206-...`, `212-...` | wontfix (ledger stale `todo`) | Exclude. Ledger bookkeeping only. |
| `open-itens/issues/010-filters-report-unknown-methods.md` | ready-for-agent | Exclude. It changes which views reach the error branch; no shared lines. |
| `open-itens/issues/132`, `136`, `137`, `250` | ready-for-agent / needs-info | Exclude. They edit the same file (header, rule line, view tests); rebase only. |
| nl-header-creation N1, N2, N3 (P84, P33) | this batch | Sibling dependency. Same file, disjoint lines. N1's Clear filters complements Edit filters. |
| nl-actions-keyboard B, F (P39, P24) | this batch | F runs in sequence with T1 (same `{#if}` chain). B updates T1's hint table. |
| sh-empty-zoom-status P97 | this batch | Receives the `.txt` right-sidebar case (see Dropped). |

## Dropped

- **T2 (right-sidebar panels explain a non-note tab).** It is real only for a non-binary, non-`.md` text file (`editor.service.ts:186-189` leaves `fileType` undefined). Every other non-note tab already hides the sidebar (`layout.logic.ts:22-28`, whose rule is "every panel in it covers notes only"). Editing four panels collides with three rs-* clusters on the same `{#if}` chains. The cohesive fix is one line in `hidesRightSidebar` (hide for any non-`.md` path). That is the function P97's ticket already rewrites (`null` to true) and tests in `layout.logic.test.ts`. Hand it to sh-empty-zoom-status as an optional criterion. Owner question there: hide (recommended) or explain. `help/documentation/16-table-of-contents.md:43` already describes a "Not available" state the user cannot reach; fix it in that ticket.
- **"N notes are hidden by filters" and the "showing N of M" strip** (P29 and P84 prototypes). Both need an unfiltered second query of a view whose filters define it. The count already reaches the user through N2's Filter badge.
- **"Remove from sidebar" on a missing view.** The pin lives in the deleted file, so there is nothing to remove.
- **Kanban empty lanes.** Owned by the kanban group (review P02, P05, P143).
- **The styling sweep** (TypesNavigator, pickers, settings, the TOC, Outgoing and Backlinks empties, file history). No hidden-data defect. 205 and the feedback-components group own the rest.

## Not checked

- I ran neither the app nor any test. The Today search behaviour and the FTS flash are traced from code. The six group-empty count at `RailNoteList.search.test.ts:326` confirms the grouped behaviour, but only for a neighbourhood.
- I did not trace whether `neighbourhoodStore` clears its note on delete (it decides how often the null neighbourhood case shows). I also did not trace whether "Add property" on a `.txt` writes YAML to disk.
- I did not read `docs/agents/live-preview-rules.md`; T3 leaves the CodeMirror widget alone for that reason.
