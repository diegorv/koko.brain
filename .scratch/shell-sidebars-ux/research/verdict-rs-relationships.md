# Verdict: Right sidebar relationships cluster (P72, P46)

Adversarial check of `scout-rs-relationships.md` against HEAD `ab143a411`. Read-only: I opened every cited source line, the Rust index code behind both panels, the git history of `RelationshipSearch.svelte`, the help pages, the ADRs on relationships (0026, 0027), open-itens 014, 156, 205 and 210, and the sibling scouts `scout-rs-links-toc.md`, `scout-rs-properties-layout.md` and `scout-nl-empty-states.md`. Nothing was run.

## Proposals: still real?

| ID | Real | Verified at |
|---|---|---|
| P72 | template bug yes, user-visible trigger rare (revise) | `BacklinksPanel.svelte:61-62` checks only `linkedMentions`; the Relationships block (`:80-102`) sits inside the `{:else}` of that check. Store, service and Rust paths are as the scout says (`backlinks.service.ts:172-186`, `index.rs:776-836`). But see point 1 below: from real vault data, relationship backlinks are a subset of linked mentions. |
| P46 | yes (revise the how) | `RelationshipSearch.svelte:33-38` handles Escape only; rows are `<button onmousedown>` with no `onclick` (`:66-72`), so Enter or Space on a focused row fires a `click` nothing handles. `:25` passes `[]` as recents and slices to 20. `trapFocus={false}` at `:53`. |

## Where the scout is wrong or incomplete

1. **P72's "relationships only" state is almost unreachable from data.** `NoteEntry::from_content_full` builds `outgoing_links` with `extract_outgoing_links(content)` over the whole file (`src-tauri/src/vault/entry.rs:252`), and the parser's doc says so on purpose: "frontmatter and fenced code blocks are NOT stripped" (`src-tauri/src/vault/parsing.rs:1063-1065`). The reverse index is built from those links (`index.rs:462-480`). Every relationship target comes from a `[[...]]` inside a frontmatter value (`extract_wikilinks_from_str` -> `extract_outgoing_links`, `entry.rs:475-481`), and `resolves_to` resolves it with the same `resolve()` (`index.rs:839-849`). So a note that holds `_belongs_to: "[[Website Redesign]]"` is also a linked mention of Website Redesign. The help example at `help/documentation/25-types-and-relationships.md:622-636` therefore shows the meeting under both groups, not only under Relationships. The state the prototype demos ("Roadmap": 0 mentions, 2 relationships) needs one of:
   - (a) **open-itens 014's stale skip.** With the panel expanded, go A -> B -> A at the same `vaultIndexVersion`. The path effect resets the store (`BacklinksPanel.svelte:33-39`). `fetchBacklinksV2(A)` then returns early on its per-path cache (`backlinks.service.ts:141-150`), while `fetchRelationshipBacklinks` has no cache and refills. Result: `linkedMentions` is empty and `relationshipBacklinks` is not. This is the practical trigger today.
   - (b) A `fetchBacklinksV2` IPC error, which is swallowed (`:166-168`).
   - (c) The basename fallback in `resolves_to` when `resolve()` returns `None`, or a YAML-folded or escaped string, where the raw scan and the parsed value differ. Both are exotic.

   The template is still wrong by construction, and the fix is cheap. But P72 alone turns 014's "No backlinks found" lie into a partial list (relationships shown, mentions still missing). rs-links-toc T1 fixes 014. The scout missed this, and it changes the sequencing (point 2).
2. **P72 and rs-links-toc T1 edit the same lines.** The links-toc scout says "template region :54-102 vs this ticket's script region :16-51, trivial rebase, either order". That is wrong. Its own criterion 6 ("after a switch A -> B with B's fetch still pending, the rendered list does not contain A's rows and does not say 'No backlinks found'") has to change the same `{#if}` chain at `:57-63` that P72 re-branches. It also needs the store path record to cover `relationshipBacklinks`, because after P72 those rows render on their own. The only practical P72 trigger is the 014 bug that T1 fixes. Same component, same store, same lines: **fold P72 into rs-links-toc T1.** The extra work is small: the template branch, one label expression, three tests and two help sentences. If the owner wants it standalone, it must be blocked by links-toc T1, not land first.
3. **The label fix needs a trim, not only `replaceAll`.** Custom relationship types are raw frontmatter keys (`index.rs:821-833`). Underscore keys outside Rust's `SYSTEM_KEYS` (`entry.rs:444-450`) become relationship fields, which ADR 0027 accepts on purpose (`docs/adr/0027-frontmatter-system-metadata-underscore-prefix.md:52`: a `_group` holding a wikilink "also becomes a relationship field; accepted"). `'_group'.replace('_', ' ')` and `replaceAll` both give `" group"`. The label rule must be: underscores to spaces, then trim (`depends_on_project` -> `depends on project`, `_group` -> `group`). The built-ins arrive bare (`belongs_to`, ADR 0026 amendment at `0026-...md:45`), so they render as today.
4. **Missed doc line.** `help/documentation/25-types-and-relationships.md:248` says the label shows "with the leading underscore rendered as a space". This is false at HEAD: the built-in types have no leading underscore, and the code replaces the first underscore anywhere. Fix it with the label rule. The scout listed only `07-sidebar-panels.md:76-78`.
5. **P46 must not go back to `Command`.** The scout's core design (design points 1 and 6: `Command.Item` with `onSelect` on click, and trying to drop `trapFocus={false}`) reverses a deliberate fix. Commit `7af4d945a` built this picker on `Command`, then replaced it: "Command.Item onSelect fires via click event, but Popover's layer system could destroy the Command tree before the click completed, making selection flaky... Replace Command component with plain input + button list... Use onmousedown with e.preventDefault()... Set trapFocus={false} on Popover.Content to avoid focus conflicts". CLAUDE.md rule 4 applies. The data risk is real: `computeAddRelationshipValue` (`src/lib/core/frontmatter/properties.logic.ts:779-795`) does not dedupe. A mousedown pick plus a `Command` click pick would append `[[X]]` twice to the note's frontmatter. The font picker precedent (`EditorSection.svelte:55-83`) does not write a file, so it is not proof. Recommended: keep the plain list, the mousedown pick and `trapFocus={false}`, and add a hand-rolled active index: `KanbanWikilinkSuggestions.svelte:20-65` (`selectedIndex`, ArrowUp/Down/Enter) plus listbox ARIA. The QS behaviour the review asks for (active row, Up/Down, Enter, `aria-activedescendant`) does not need the `Command` primitive.
6. **`trapFocus` is not the keyboard defect.** The input already gets focus on open (`:41`), and arrow keys on the input are the mechanism. The review lists `trapFocus` under Problem, but removing it fixes nothing and undoes `7af4d945a`. Keep it.
7. **Group headings should match the Quick Switcher, not the prototype.** finders-ux 07 (resolved) settled the switcher's empty-query shape: a "Recent notes" heading, then an unheaded rest (`QuickSwitcher.svelte:164-184`). The prototype's "Recent" / "All notes" (`right-sidebar.html:1215`) would make the two pickers differ. Recommended: "Recent notes" plus an unheaded rest. This is an owner question.
8. **Criterion 5 of the scout's T2 is moot, and criterion 6 of its T1 breaks the mock rule.** The same-name collision exists only with `Command` values. With a hand-rolled index and `$props.id()` ids (precedent `TasksView.svelte:144`), there is nothing to collide. T1 criterion 6 asserts only that a mocked `openFileInEditor` was called. That is unchanged behaviour, and a `.toHaveBeenCalled()`-only check (CLAUDE.md Testing). Drop both.
9. **Misread guard in the neighbour scout.** `scout-rs-properties-layout.md:131` says "Do not change `RelationshipSearch` behaviour for callers without `kinds` (`finders-ux` 07 criterion: it 'behaves as today')". That criterion (`finders-ux/issues/07-...md:29`) guarded 07's change to `filterAndRank` and is resolved. P46 changes the picker on purpose. The P43 picker ticket must keep the behaviour "as after the P46 ticket", and its kind step should reuse the P46 active-row mechanism, so the kind step works from the keyboard too.
10. **jsdom seam.** A hand-rolled `scrollIntoView({ block: 'nearest' })` throws in jsdom. Tests stub it the way `QuickSwitcher.test.ts:31` and `EditorSection.test.ts:17` do: `Element.prototype.scrollIntoView ??= () => {};`.

Confirmed as the scout states: `feature-cycle-baseline.json:23` has `quick-switcher -> properties` (`QuickSwitcher.svelte:12` imports `lifecycle-filter.store`) and `FEATURE_CYCLE_EDGES_SIZE = 0` (`feature-cycle.test.ts:36`), so `properties` cannot import `quick-switcher`. `src/lib/app/` may import any feature (`scripts/import-graph.mjs:201-202`), and `app/` already imports `quickSwitcherStore` (`commands.ts:15`, `boot.ts:12`). `addRecentPath` has only two callers (`QuickSwitcher.svelte:82, :108`). `RelationshipSearch` has one caller (`PropertiesView.svelte:252`), and `PropertiesView` has one mount (`AppShell.svelte:279`). `relationshipBacklinks` is read only by `BacklinksPanel.svelte`. The layout's tab-switch fetch calls `fetchBacklinksV2` only (`+layout.svelte:129`). `filterAndRank` keeps its flat output (`CanvasFilePicker` also calls it). The E2E mock returns `[]` for relationship backlinks (`e2e/mocks/tauri-core.ts:135-139`). `MAX_RESULTS` is at `file-entries.logic.ts:30`, not `:29`.

## Ticket breakdown

Order: rs-links-toc T1 (amended with P72) and T2 below are independent of each other. T2 must land before the rs-properties-layout P43 picker ticket.

### Fold P72 into rs-links-toc T1 ("Backlinks and Outgoing links stay open across note switches and always show the open note's links"), adds about S

Amend that ticket:
- **What to build (added):** in `BacklinksPanel.svelte`, derive `hasMentions` and `hasRels` in the component and branch on them. The Linked mentions group renders only with mentions, and the Relationships group only with relationships; each stays an independent collapsible. "No backlinks found" shows only when both are empty and T1's path record says the store holds the open note's data. The Relationships group's `mt-2` (`:81`) applies only when the mentions group is above it. The row label is `relationshipType` with underscores turned into spaces, then trimmed (inline, one expression at `:96`). No store getter is needed (CLAUDE.md rule 3 would then require a test for it), no service, Rust or DTO change, and no row icon.
- **T1's path record** must cover `relationshipBacklinks` as well as `linkedMentions`. After this change, relationship rows render without mentions, so a stale relationship row for the previous note would now show on its own.
- **Help:** `07-sidebar-panels.md:76-78`: the Relationships section appears even when no note links here in the body, and it can list a note that also appears under linked mentions. `25-types-and-relationships.md:248`: "underscores rendered as spaces" (drop "leading").
- **Files added to T1:** `BacklinksPanel.svelte` (`:57-103`), `BacklinksPanel.test.ts`, `help/documentation/07-sidebar-panels.md`, `help/documentation/25-types-and-relationships.md`.

Added acceptance criteria:
- [ ] Failing test first, `BacklinksPanel.test.ts` (real `backlinksStore`, only the fetch services and `openFileInEditor` mocked, as the file does today): expanded, with one relationship backlink (`belongs_to`) and no linked mentions in the store for the open note. The panel shows no "No backlinks found", shows a "Relationships" trigger with count `1`, the row's name and `belongs to`, and no "Linked mentions" trigger. Fails today.
- [ ] Failing test first: relationship types `depends_on_project` and `_group` render `depends on project` and `group` (exact `textContent`). Fails today (`depends on_project`, ` group`).
- [ ] Neither list: "No backlinks found" with `text-meta` (the existing test at `:172-175` stays green). Mentions only and both: groups and counts as today (the existing test at `:177-197` stays green). The Relationships root has `mt-2` only when the mentions group renders.
- [ ] T1's criterion 6 (switch A -> B, B's fetch pending) also seeds a relationship row for A, and asserts that it is not rendered under B.
- [ ] Both help sentences updated.
- Gate: frontend only, `pnpm check` + `pnpm vitest run`.

If the owner keeps P72 as its own ticket: same scope and criteria minus the T1 path-record one. Size S, **blocked by rs-links-toc T1** (same `{#if}` chain, and T1 removes the 014 trigger).

### T2 (new): The relationship picker works from the keyboard and lists recent notes first (P46, S)

**Files:** `src/lib/features/properties/RelationshipSearch.svelte`, `src/lib/features/properties/PropertiesView.svelte` (`:252`, forward one prop), `src/lib/app/AppShell.svelte` (`:279` and one import), `src/tests/lib/features/properties/RelationshipSearch.test.ts`, `src/tests/lib/features/properties/PropertiesView.test.ts`, `help/documentation/07-sidebar-panels.md:47`. `file-entries.logic.ts` does not change.

**Blocked by:** none. Must land before the rs-properties-layout P43 "Add relationship" ticket, which adds a kind step inside the same popover. That ticket's kind step should reuse this ticket's active-row mechanism. P44, P45 and P177 edit other regions of `PropertiesView.svelte`; this ticket's edit there is one line.

**What to build:**
- Keep the plain input, the `<button onmousedown>` pick with `preventDefault`, `Popover.Content trapFocus={false}` and the explicit focus on open. They are the `7af4d945a` fix for a flaky `Command`-in-`Popover` pick. Do not use the bits-ui `Command` primitive here.
- A local `activeIndex` over the flat list of rendered rows. It resets to 0 when the query changes. ArrowDown and ArrowUp move it, wrapping, with `preventDefault`. Enter picks the active row and does nothing on an empty list. Escape works as today. `mousemove` on a row makes it active. The active row scrolls into view with `{ block: 'nearest' }`. Precedent: `KanbanWikilinkSuggestions.svelte:20-65`.
- ARIA: the input gets `role="combobox"`, `aria-expanded`, `aria-controls` (the list id) and `aria-activedescendant` (the active option id). The list gets `role="listbox"`. Each row gets `role="option"`, a unique `id` from `$props.id()` plus its index, and `aria-selected` on the active one. The active row also gets the visible `bg-accent` state, not only hover.
- Recents: a `recentPaths?: string[]` prop (default `[]`). `PropertiesView` forwards it, and `AppShell` passes `quickSwitcherStore.recentPaths`. `features/properties` must not import `features/quick-switcher`, or the cycle ratchet fails.
- Groups: with an empty query and at least one recent in the tree, `splitRecentFiles(allFiles, recentPaths)` gives a "Recent notes" group (`role="group"` labelled by its heading) and then the rest with no heading. Any other case gives one flat list from `filterAndRank(query, allFiles, recentPaths)`. The component's `.slice(0, 20)` goes away; the helpers' `MAX_RESULTS` (100) caps the list, which scrolls inside `max-h-48`.
- No key-hint footer, no "Linked X under Belongs to" status line (prototype extras).

**Acceptance criteria:**
- [ ] Failing test first, `RelationshipSearch.test.ts` (jsdom, real `fsStore`, `vaultStore`, `fileIconsStore`, stub `scrollIntoView`): with three notes and an empty query, the first option has `aria-selected="true"`. ArrowDown moves it to the second, ArrowUp moves it back. After each move, the input's `aria-activedescendant` is the id of the element that has `aria-selected="true"`, and that element has `role="option"`. Fails today (no options, no active row).
- [ ] Failing test first, `PropertiesView.test.ts` (real `propertiesStore` and `editorStore`, note open): open the Belongs To picker, type `Pro`, press Enter. `propertiesStore.properties` holds `_belongs_to` equal to `[[Projects]]` exactly once, the popover is closed, and reopening shows an empty input. Fails today (Enter does nothing).
- [ ] Failing test first, `RelationshipSearch.test.ts`: with `recentPaths` `['/vault/C.md', '/vault/Gone.md', '/vault/A.md']` and notes A, B, C, an empty query lists C, A under a "Recent notes" heading, then B with no heading. The missing path is skipped. With no `recentPaths` there is no heading, and the order is A, B, C. With a query there is no heading. Fails today.
- [ ] A mouse pick (mousedown on a row) still writes exactly one `[[...]]` in `PropertiesView.test.ts` and closes the popover. Escape still closes and clears the query. Enter with no matches does not call `onSelect`.
- [ ] The three existing `RelationshipSearch` tests stay green, with selectors moved to `[role="option"]` (never a `.view` offered, default icon colour, empty tree).
- [ ] `feature-cycle.test.ts` and `layer-rules.test.ts` stay green.
- [ ] `07-sidebar-panels.md:47` says you can type, move with Up and Down, pick with Enter, and that recent notes come first.
- Gate: frontend only, `pnpm check` + `pnpm vitest run`.

## Open-itens Issues replaced

| Issue | Status / ledger | Decision |
|---|---|---|
| `156-relationship-picker-navigates-arrow-keys.md` | ready-for-agent, ledger `:172` todo | **Replaced by T2.** Same file and defect; its criteria become T2's first two. Its "Rebuild on shadcn Command" and its `pnpm build` gate do not carry over (see point 5; no dependency change). |
| `014-backlinks-outgoing-links-always-show-open-note.md` | ready-for-agent, ledger `:51` todo | Replaced by rs-links-toc T1, not by this cluster. P72 folds into that same ticket. |
| `205-sidebar-panels-settings-use-empty-error-primitives.md` | ready-for-agent, blocked by 204 | **Depend, no edit.** P72 moves the "No backlinks found" `<p>` into a new branch but keeps its markup. The nl-empty-states `EmptyState` keeps a compact `<p class="text-meta">` (`scout-nl-empty-states.md:97`), so whichever lands second rebases trivially. The scout's "trim 205" is unnecessary. |
| `210-noteinfo-relationships-heading-follow-sidebar-section.md` | needs-info | Exclude (PropertiesView heading, rs-properties-layout). |

Live folders: `grep` for `RelationshipSearch`, `BacklinksPanel`, `relationshipBacklinks` and "No backlinks" over `.scratch/*/issues` hits only finders-ux 07 (resolved, regression guard for `filterAndRank`, see point 9) and the open-itens Issues above.

## Dropped

- Rebuilding the picker on bits-ui `Command`, and removing `trapFocus={false}`. Both reverse `7af4d945a` and risk a double link write (points 5 and 6).
- The scout's T2 criterion 5 (same-name value collision, moot without `Command`) and T1 criterion 6 (mock-call-only assertion on unchanged behaviour).
- Prototype extras: the key-hint footer, the post-pick status line, and a file icon on relationship rows. The review text asks for none of them.
- Editing Issue 205.

## Owner questions

- **P72 placement:** fold into rs-links-toc T1, or keep as its own S ticket blocked by T1? (Recommended: fold. Same lines and store, and the only practical trigger is the 014 bug that T1 fixes.)
- **T2 recents source:** only Quick Switcher picks and creations are recorded (`addRecentPath` has two callers), so "Recent notes" in the picker means "notes you reached with the switcher". Ship it that way? (Recommended: yes. Recording every open is a core change outside this cluster.)
- **T2 headings:** "Recent notes" plus an unheaded rest (as the Quick Switcher, finders-ux 07), or the prototype's "Recent" / "All notes"? (Recommended: match the Quick Switcher.)

## Not checked

- Nothing was run. The claim that relationship backlinks are a subset of linked mentions comes from reading `entry.rs`, `parsing.rs` and `index.rs`. No Rust test asserts it (no test in `index.rs` mentions frontmatter backlinks).
- The `Command`-in-`Popover` flakiness from `7af4d945a` was not reproduced. It is cited from the commit message, which is why T2 keeps the proven mousedown path instead of retesting it.
