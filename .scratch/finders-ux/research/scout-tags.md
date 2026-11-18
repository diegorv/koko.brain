# Scout: Tags view cluster (P76, P157, P187)

Checked against HEAD `f2cd7f97b` (main). Nothing in `src/lib/features/tags/`, `EditorTabs.svelte` or the Tags help page changed since the review; `git log` shows the last tags-related commit is `96e7d186e` (Issue 50, pane-toolbar). No Tags screenshot exists in `.scratch/design-review/screens/` (MANIFEST.md:47 records the gap), so the prototype `prototypes/finders-search-tags-graph.html` (`TagsView()` at line 726, sections P76/P157/P187 at lines 1036-1064) is the only visual reference.

## Code map (what runs today)

Tags view = virtual tab, only reachable through the palette command `tags:toggle` "Toggle Tags View" (`src/lib/app/commands.ts:286-293` -> `toggleTagsTab`, `tags.service.ts:149-158`). Mounted by `src/lib/app/EditorView.svelte:41,73-74` only while the tab is active (so every open is a fresh mount, which resets TagItem's local `open`).

| File | Role |
|---|---|
| `src/lib/features/tags/TagsView.svelte` (91 lines) | toolbar (title, count, filter + sort buttons), body, empty/loading branches |
| `src/lib/features/tags/TagItem.svelte` (71 lines) | recursive row; parent branch (Collapsible) and leaf branch |
| `src/lib/features/tags/TagColorPicker.svelte` (110 lines) | Popover trigger wrapping the dot, 20px swatches |
| `src/lib/features/tags/TagColorDot.svelte` | coloured dot or `Hash` icon |
| `src/lib/features/tags/tags.logic.ts` | `buildTagTree`, `filterTagTree` (:98-108), `sortTagTree` |
| `src/lib/features/tags/tags.store.svelte.ts` | `hideRareTags` default `true` (:5), `totalTagCount`, `sortMode`, `isLoading` |
| `src/lib/features/tags/tags.service.ts` | `buildTagIndex` (:26-57), tab open/close/toggle (:124-158) |
| `src/lib/core/markdown-editor/EditorTabs.svelte` | tab strip; icon branches at :69-80 |

Only `TagsView.svelte`, `tags.service.ts` and the lifecycle/command files read `tagsStore`; nothing outside the feature consumes `hideRareTags` or `totalTagCount`.

## P76. Header contradicts the body (rare-tag filter)

**Still real: yes.**

Current behaviour:
- `TagsView.svelte:15` `MIN_COUNT_THRESHOLD = 10` (a view constant, not a setting).
- `TagsView.svelte:35-39` `displayedTree = hideRareTags ? filterTagTree(tagTree, 10) : tagTree`.
- `tags.logic.ts:98-108` keeps a node when `node.count >= minCount` (own count, not `totalCount`) or when a child survives. A pure-parent node (count 0) with only rare children disappears. The kept parent's `totalCount` is recomputed from the surviving children only, so a parent's number shrinks while the filter is on.
- `TagsView.svelte:52-56` header prints `tagsStore.totalTagCount` (`tags.service.ts:45`: `entries.length`, the flat unique tag names from `get_all_tags_v2`; pure-parent path nodes are not counted). It never reflects the filter.
- `TagsView.svelte:81-82` empty branch prints "No tags found" for both an empty vault and a filtered-out one.
- The toolbar button (`:58-64`) is an icon-only toggle with a `title`; its active state is colour only (`text-primary`).
- Deliberate and documented: `help/documentation/07-sidebar-panels.md:107-109` says "The tag count in the header is the unfiltered total, so it does not change when the filter does". P76 reverses that sentence, so the help page must change with it (lines 107-109, 116).
- No ADR covers it (grepped `docs/adr`).

Notes for the ticket:
- The prototype computes X as entries whose subtree `total >= 10`, which is NOT what the real filter does (real: own `count >= 10`, parents kept as containers). Define X from the real `displayedTree`: number of nodes with `count > 0` (i.e. real tags, not pure containers) in the displayed tree, via a small pure helper in `tags.logic.ts`. A rare parent tag kept only to hold a popular child is counted in X under this rule; that is acceptable but should be stated in the ticket.
- Proposed empty copy "All N tags are used fewer than 10 times. Show all" is accurate for the real filter (`>= 10` kept, so empty means all `< 10`). Issue 212 proposes different copy ("No tags are used 10 or more times." + "Show all tags" button).
- Header link: the toolbar row (`pane-toolbar`) is guarded by `src/tests/lib/pane-toolbar.test.ts:19,47-51`: the row's class list may not carry `h-*`, `p*-*`, `gap-*`, `border-*`, `flex-wrap`. An inline "Show all" button inside the count `<span>` is fine; do not add padding/gap utilities to the row itself.

## P157. Filter box, leaf alignment, labels

**Still real: yes, all three parts.**

Current behaviour:
- No filter input anywhere in `TagsView.svelte`. The only search is `openSearch('tag:...')` on click (`:17-19`).
- Chevron: `TagItem.svelte:30-32` `Collapsible.Trigger` with `p-1` around a `size-3` icon (20px wide), no `aria-label`, no `title`. bits-ui sets `aria-expanded` itself (not verified in this scout; check in the ticket by reading the rendered DOM in the new test).
- Dot: `TagColorPicker.svelte:32` `Popover.Trigger` (`p-0.5`, 16px hit area) has no accessible name and no `title`. The swatches inside have `title` only (lines 42, 52, 59) - that part is P88's territory.
- Misalignment, measured from the classes: parent row has no horizontal padding, chevron slot = 4 + 12 + 4 = 20px, so the parent dot starts at x=20. Leaf row (`TagItem.svelte:56`) has `px-2` (8px) and no chevron slot, so the leaf dot starts at x=8: the 12px the review states is correct. Two more mismatches the review does not name: parent name button is `px-1` with no outer gap (`:39-40`) while the leaf uses `gap-1.5` (6px) with no padding (`:56,64`), so names are 2px off; the count sits 4px from the right edge in parent rows and 8px in leaf rows. A fix that only adds a 20px spacer to leaves leaves those two residuals.
- Expanded state is local `let open = $state(false)` (`TagItem.svelte:19`), so a filter that "expands matching parents" cannot reach it without a prop or hoisted state. Children are indented with `pl-4` (`:48`).
- Leaf row counts `node.count`, parent rows `node.totalCount` (`:44` vs `:68`).

Design points the ticket must settle (see owner questions): match semantics, interaction with the rare filter, where filter text lives.
- The prototype's `matches()` does a case-insensitive substring on `fullPath`, keeps ancestors of a match, and (via `anc`) keeps all descendants of a matching node. Recommended shape: pure `filterTagTreeByQuery(nodes, query)` in `tags.logic.ts` returning the pruned tree, with the ancestors of every match flagged for forced expansion; `filterTagTree` composes with it. Test file `tags.logic.test.ts` already covers `filterTagTree` (lines 243-319) and is the natural home.
- State: `hideRareTags` lives in `tagsStore`, so by the same pattern a `filterQuery` would too (needs `reset()` and a store test; `tags.store.test.ts` has the reset case at :43). A component-local `$state` in `TagsView` is simpler and the query is ephemeral; the repo rule is "stores expose getters, reactive state only", so either is defensible - flag to owner only if the grill wants it, otherwise follow the `hideRareTags` precedent.

## P187. Tags tab icon

**Still real: yes.**

Current behaviour: `EditorTabs.svelte:69-80` has branches for `tasks` (ListChecks), `graph` (Network), `canvas` (LayoutDashboard), `kanban` (Kanban), `event-calendar` (CalendarRange), then falls to the `tabIcon` snippet, else `FileText`. `fileType: 'tags'` (`tags.service.ts:136`, type at `core/editor/editor.types.ts:12`) hits the snippet, `EditorView.svelte:56-64` `fileTabIcon`, which calls `resolveIconForPath('__virtual__/tags')` and otherwise renders `FileText`. So the Tags tab shows the generic note icon (and, in principle, a user's file-icon rule could match the virtual path; a dedicated branch also fixes that).

Fix: add `Tag` or `Hash` import and an `{:else if tab.fileType === 'tags'}` branch with the same `size-3.5 shrink-0 text-muted-foreground` classes. Icon precedent in the feature: `TagColorDot.svelte` uses `Hash` (uncoloured tag), `PropertyField.svelte:9` and `CanvasContextMenu.svelte:12` use `Tag`. The prototype uses the lucide `tag` path (line 318). The review's Problem line says "only hands off to Search" but the Proposal is icon only, no rail navigator; `help/documentation/07-sidebar-panels.md:98-100` states the palette-only access as intended. Do not widen.

## Existing .scratch Issues touching the same behaviour

| Issue | Status | Overlap |
|---|---|---|
| `.scratch/open-itens/issues/212-tags-view-explains-when-rare-tag-filter.md` | **ready-for-agent** (ledger line 228: todo) | P76 empty-state half, same lines `TagsView.svelte:81-82`, same test file. 212 explicitly says "The header count keeps meaning 'tags in the vault' and does not change" and "Out of scope: the header's styling" - so P76's header half contradicts 212's non-goal. Needs reconciling: supersede 212 with the P76 ticket (or amend 212). Its copy differs from P76's. |
| `.scratch/open-itens/issues/159-tags-view-keeps-list-expanded-tags-screen.md` | **ready-for-agent** (ledger 175: todo) | Same as review P30 (not in this cluster). Edits `TagsView.svelte:79-80` (loading branch) and the header at `:52-56` ("header count should not flicker"), and wants `TagItem` expanded state to survive a refresh. Collides with P76 (header) and P157 (expanded state, `open`). Creates `TagsView.refresh.test.ts` mocking only Tauri. |
| `.scratch/open-itens/issues/160-tag-click-lists-notes-that-tag-even.md` | ready-for-agent | Tag click -> `openSearch`. Touches `TagsView.svelte:17-18` only by reference; fix lives in `open-search.service.ts`. No conflict; none of the three proposals change click behaviour. |
| `.scratch/open-itens/issues/153-tab-strip-shows-overflow-hides-md-extension.md` | ready-for-agent | Edits `EditorTabs.svelte` (edge fade, tab-list menu, `.md` stripping at the `{tab.name}` span ~:78-80). Same file as P187 but different lines; trivial rebase, no semantic overlap. |
| `.scratch/open-itens/issues/012-tab-menu-right-tab-and-delete-confirm.md` | ready-for-agent | `EditorTabs.svelte` tab menu; same file, different region. |
| `.scratch/open-itens/issues/152-tag-may-start-digit-may-carry-emoji.md` | ready-for-agent | Tag grammar, not the view. None. |
| `.scratch/open-itens/issues/045-text-search-tag-path-returns-every-note.md` | ready-for-agent | Search `tag:` path semantics. None. |
| `.scratch/open-itens/issues/205-sidebar-panels-settings-use-empty-error-primitives.md` | not read in depth | Mentions the Tags view; EmptyState primitive. 212's notes say to use the primitive if it lands first. Check its Status before writing the P76 ticket (grep hit, not opened here). |
| Review P88 (kanban/tag colour pickers) | in the review, not yet an Issue | Touches `TagColorPicker.svelte:37-55` (swatch labels, radiogroup). P157 only touches the trigger at `:32` (add a label); keep the two disjoint. If P88 promotes a shared swatch component first, the P157 label change still applies to the trigger. |
| Review P21 (toolbar kit / `ToolbarSearch`) | in the review, not yet an Issue | Would supply the filter input P157 wants. Not built; do not block on it. An inline `Input` (`#lib/components/ui/input`) at `h-7 text-xs` like `RailListSearch.svelte:84-94` is the precedent today. |
| Review P30 | in the review | Duplicate of Issue 159; treat as owned by 159. |

Archived and closed (context only): `.scratch/archived/ux-polish/issues/13-tags-filtered-empty-state.md` (origin of 212), `archived/ux-polish/issues/17-sidebar-row-radius.md` (touched TagItem radius), `archived/tags-obsidian-parity/` (tag grammar). `.scratch/tasks-view-ux/issues/113-keyboard-and-a11y.md` is resolved and unrelated to the Tags view (it mentions swatches for Tasks).

## Tests that cover this code

Unit (vitest, `src/tests/lib/`):
- `features/tags/TagsView.test.ts` (68 lines): jsdom, mocks `tags.service.js`, real `tagsStore`/`searchStore`/`settingsStore`. Two cases: tag click opens rail Search with `tag:work`; empty tree shows "No tags found". Its fixture comment "Above the rare-tag threshold (10)" shows the default filter is exercised only implicitly.
- `features/tags/tags.logic.test.ts` (319 lines): `buildTagTree`, `tagTreeShape`, `sortTagTree`, `filterTagTree` (`describe('filterTagTree')` at :243, ≥ minCount boundary at :262, recompute at :306).
- `features/tags/tags.store.test.ts`: default state (:9), `setHideRareTags` (:38), reset (:43).
- `features/tags/tags.service.test.ts` (345 lines): `buildTagIndex` incl. `totalTagCount` (:53) and loading on IPC error (:104), tab open/close/toggle (:155-260), debounced rebuild (:263+).
- `core/markdown-editor/EditorTabs.test.ts` (157 lines): scroll-into-view and tab menu; no icon assertions. A new case for the Tags icon goes here (mount with a `fileType: 'tags'` tab and assert the glyph; lucide icons render `<svg class="lucide lucide-tag ...">`).
- `pane-toolbar.test.ts:19,47-51`: guards the TagsView toolbar row classes.
- No test exists for `TagItem.svelte`, `TagColorPicker.svelte` or `TagColorDot.svelte` (P157 needs a new `TagItem.test.ts`, real stores).
- `src/tests/lib/architecture/codemap-golden/files__src__lib__features__tags__TagsView.svelte.md` is a synthetic fixture (imports `TagRow.svelte`), not tied to the real file; unaffected.

E2E (`e2e/specs/`): no spec exercises the Tags view contents. `e2e/specs/rail-shell.spec.ts:346` only types "Toggle Tags View" into the palette. No e2e needed for these tickets; the vitest component tests are enough.

## Owner-only questions

1. **P76 header vs documented decision and Issue 212.** Help page says the header count is deliberately the unfiltered total; 212 (ready-for-agent) says the same. OK to supersede 212 and change the header to "Showing X of Y tags" + inline "Show all"? (Recommended: yes, one ticket, mark 212 superseded.)
2. **What counts in X**: nodes with an own tag (`count > 0`) in the displayed tree, including rare parents kept only to hold a popular child, or something stricter? (Recommended: own-tag nodes in `displayedTree`.)
3. **Filter box vs rare filter (P157)**: while a query is typed, should it search all tags (rare filter bypassed) or only the visible ones? Searching only visible ones recreates P76's contradiction ("No tags match" for a tag that exists). Recommended: query bypasses the rare threshold and the header reads "Showing X of Y" only when no query is active, or counts matches.
4. **Match scope**: substring on full path (as prototype) vs prefix/segment; does a leading `#` in the query count; keep all descendants of a matching parent visible? (Recommended: case-insensitive substring on `fullPath`, strip a leading `#`, matching parent shows its whole subtree.)
5. **P157 expansion state ownership**: matching parents forced open while a query exists, user's manual open state restored after clearing? Depends on Issue 159's final shape for `open`. (Recommended: `forceOpen` prop OR-ed with local `open`.)
6. **P187 glyph**: `Tag` (Properties, canvas menu, prototype) or `Hash` (dot placeholder)? (Recommended: `Tag`.)
7. Should the leaf alignment also fix the 2px name offset and 4px count offset (see P157 section)? (Recommended: yes, same classes.)

## Suggested grouping into tickets

Constraint reminder: same component + same test files together; each ticket fits one fresh agent context. Gate for all: frontend only (`pnpm check` + `pnpm vitest run`); P76 also edits a help page, which needs no extra gate.

**Prefactor / ordering.** Do Issue 159 first (existing ticket). It rewrites the loading branch and header region of `TagsView.svelte` and the `open` lifecycle in `TagItem.svelte`, the two spots the new tickets also edit. Then P76, then the P157 filter. Not doing so means three tickets editing the same 40 lines of `TagsView.svelte`.

1. **T1: Tags header and empty state say what the rare filter hides (P76, supersedes 212).** Size S.
   - Files: `TagsView.svelte` (header :52-56, empty :81-82), `tags.logic.ts` (new pure helper counting own-tag nodes), `help/documentation/07-sidebar-panels.md` (:107-109, :116).
   - Tests: `TagsView.test.ts` (header "Showing X of Y" with filter on, plain count when X = Y or filter off, filtered-empty message + "Show all" button restoring the list, existing "No tags found" case stays), `tags.logic.test.ts` (helper).
   - Failing test first as in 212's checklist; absorbs 212's criteria, with its non-goal on the header dropped.
   - Blocked by: 159 (same file region; not a hard dependency).

2. **T2: Tags tab gets its own icon (P187).** Size S. Files: `EditorTabs.svelte` (+ one import). Test: new case in `EditorTabs.test.ts`. Independent of everything else; can run first or in parallel. If the owner wants fewer tickets, it can ride as a second commit inside T1 (both are < 30 lines) at the cost of two test files in one ticket; it is cleanest as its own ticket.

3. **T3: Tags rows align and carry accessible labels (P157, part 1).** Size S. Files: `TagItem.svelte` (leaf gets the 20px chevron slot and matching name/count offsets; chevron `aria-label` "Expand/Collapse {segment}"), `TagColorPicker.svelte` (new `label` prop applied to the trigger as `aria-label` + `title`, "Change color of {segment}"; swatch internals untouched to stay disjoint from P88). Tests: new `src/tests/lib/features/tags/TagItem.test.ts` (real stores; assert both rows' dot buttons sit behind the same-width leading element, labels present, `aria-expanded` toggles). jsdom has no layout, so assert on structure/classes rather than pixels. Independent of T1 and T4 (touches only the rows), but run after 159 because 159 may change how `open` is kept.

4. **T4: Tags filter box (P157, part 2).** Size M. Files: `TagsView.svelte` (input in the `pane-toolbar` row, new "No tags match" empty branch as a third case beside T1's), `tags.logic.ts` (pure `filterTagTreeByQuery` + expanded-ancestor set), `tags.store.svelte.ts` if the query is stored, `TagItem.svelte` (`forceOpen`/derived open prop; also the only place T3 and T4 overlap). Tests: `tags.logic.test.ts`, `TagsView.test.ts`, `tags.store.test.ts` if a field is added. Blocked by T1 and T3 (empty branch and TagItem edits), and by 159.

Recommended order: 159 -> T1 (+T2 any time) -> T3 -> T4. If the owner wants the minimum, T1+T2 are the "small and nice" part; T3 and T4 can merge into one ticket only if the agent budget allows (M, three source files, two new/extended test files), which is why the split is advised.

## Not checked

- Did not run the app or the tests (read-only scout). The 12px leaf offset and the 2px/4px residuals come from reading Tailwind classes, not from a rendered measurement.
- Did not verify that bits-ui `Collapsible.Trigger` emits `aria-expanded` on this version; the T3 test should assert it.
- Did not open `.scratch/open-itens/issues/205-...` beyond the grep hit.
