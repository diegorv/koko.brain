# Scout: Right sidebar relationships cluster (P72, P46)

Checked against HEAD `ab143a411` (main). Nothing in `src/lib/features/backlinks/`, `RelationshipSearch.svelte` or `file-entries.logic.ts` changed since the review (last backlinks-panel commit is `cc62ad527`, Issue 94; last picker commit is `8afcfb42e`). The haiku leads in `research/raw/P72.md` and `research/raw/P46.md` were re-checked line by line; the corrections are called out below. The prototype for both is `.scratch/design-review/prototypes/right-sidebar.html` (P72 card at `:423-427`, script `:1053-1067`; P46 card at `:461-464`, script `:1181-1245`). The two proposals touch different components and share only the word "relationship": they are two separate tickets, not one.

## Code map (what runs today)

| File | Role |
|---|---|
| `src/lib/features/backlinks/BacklinksPanel.svelte` (106 lines) | The Backlinks `SidebarSection`. Local state `expanded`, `linkedOpen`, `relationshipsOpen`, `lastFetchedPath` (`:16-19`). `fetchData()` fires both fetches (`:25-31`). Effect `:33-39` collapses and `backlinksStore.reset()` on a path change while expanded. Effect `:46-51` refetches on `vaultIndexVersion`. Template: Not available / Indexing / empty / else both groups (`:57-103`). |
| `src/lib/features/backlinks/backlinks.store.svelte.ts` | `linkedMentions`, `relationshipBacklinks`, `unlinkedMentions` state with getters, `reset()` clears all. No combined "has any" getter. |
| `src/lib/features/backlinks/backlinks.service.ts` | `fetchBacklinksV2` (version-skip cache, `:141-170`), `fetchRelationshipBacklinks` (`:172-186`, no cache, `isStillCurrentPath` guard, swallows errors). Both `dedupeInflight`-wrapped. |
| `src/lib/features/backlinks/LinkItem.svelte` | Mention row (icon, name, snippets). Relationship rows do NOT use it; they are inline buttons in the panel (`BacklinksPanel.svelte:91-97`). |
| `src-tauri/src/vault/index.rs:776-836` | `lookup_relationship_backlinks`: `belongs_to`, `related_to`, `has_many` and every key of `entry.relationships` (custom wikilink-bearing frontmatter fields). Returns `relationship_type` as `"belongs_to"` etc. or the raw custom field name. Sorted by source name. |
| `src/lib/features/properties/RelationshipSearch.svelte` (94 lines) | The "+" popover picker. `allFiles` (`:24`), `results = filterAndRank(query, allFiles, []).slice(0, 20)` (`:25`), `handleKeydown` Escape only (`:33-38`), `Popover.Content ... trapFocus={false}` (`:53`), plain `<input>` (`:55-61`), rows are `<button onmousedown>` (`:66-72`). |
| `src/lib/features/properties/PropertiesView.svelte` | Only caller: `<RelationshipSearch onSelect={(name) => addRelationshipLink(rel.key, name)} />` once per `FIXED_RELATIONSHIPS` kind (`:246-252`). `addRelationshipLink` (`:70-78`) writes through `upsertProperty` / `updateProperty`. |
| `src/lib/core/filesystem/file-entries.logic.ts` | `filterAndRank` (`:67-104`), `splitRecentFiles` (`:51-65`, from finders-ux 07), `MAX_RESULTS = 100` (`:29`). |
| `src/lib/features/quick-switcher/quick-switcher.store.svelte.ts` | `recentPaths` (localStorage `kokobrain:recent-files`, max 20). `addRecentPath` is called only by `QuickSwitcher.svelte:82` (selectFile) and `:108` (create). Notes opened from the tree, links or tabs are NOT recorded. |
| `src/lib/features/quick-switcher/QuickSwitcher.svelte` | The model for P46: `Command.Dialog`, `shouldFilter={false}`, "Recent notes" group (`:164-184`). No hand-written arrow-key or `aria-activedescendant` code: the `Command` primitive does both (`node_modules/bits-ui/dist/bits/command/command.svelte.js:1142`, input props). |
| `src/lib/core/settings/sections/EditorSection.svelte:55-83` | Precedent for `Command.Root` + `Command.Input` + `Command.List` inside a `Popover.Content class="w-64 p-0"` (font picker). |
| `src/lib/app/AppShell.svelte:279, 285` | Mounts `<PropertiesView />` and `<BacklinksPanel />` side by side. |

Readers of the relevant state:
- `backlinksStore.relationshipBacklinks`: only `BacklinksPanel.svelte` (`:80, :86, :90`). The rail note-list "Belongs to / Related to" groups (`e2e/specs/rail-shell.spec.ts:1038`) come from a different source (lens), not this store.
- `backlinksStore.linkedMentions`: `BacklinksPanel.svelte`, and written by the layout tab-switch fetch (`src/routes/(app)/+layout.svelte:105-141`, calls `fetchBacklinksV2` only, never the relationship fetch).
- `quickSwitcherStore.recentPaths`: `QuickSwitcher.svelte` only.

## P72. Relationship backlinks hidden when a note has no linked mentions

**Still real: yes.**

Current behaviour:
- `BacklinksPanel.svelte:61-62`: `{:else if backlinksStore.linkedMentions.length === 0}` renders "No backlinks found" and ignores `relationshipBacklinks`.
- `:63-103`: the `{:else}` branch renders the Linked mentions collapsible (`:64-78`) and, nested inside the same branch, the Relationships collapsible guarded by `relationshipBacklinks.length > 0` (`:80-102`). A note with only relationship backlinks therefore never shows them, although `fetchData()` fetched them (`:30`) and the store holds them.
- The data path is fine: `get_relationship_backlinks_v2` -> `fetchRelationshipBacklinksInner` (`backlinks.service.ts:177-185`) -> `setRelationshipBacklinks`. No Rust, DTO or service change is needed.
- Row label: `rel.relationshipType.replace('_', ' ')` (`:96`). `String.replace` with a string replaces only the FIRST underscore. Built-in types (`belongs_to`, `related_to`, `has_many`) have one, so they render right; a custom field such as `depends_on_project` renders `depends on_project`. Real, because Rust returns custom field names verbatim (`index.rs:821-833`, doc comment in `entry.rs:132`).

What the prototype wants (`right-sidebar.html:1053-1067`, `blBody` `:777-784`):
- Empty message only when BOTH lists are empty.
- "Linked mentions" group only when mentions exist, "Relationships" group only when relationships exist; each an independent collapsible with chevron, icon, label and count.
- Relationship rows show a file-text icon, the name and the muted type label on the right. The current real rows have no icon (`:91-97`); the prototype "After" rows do. The review text does not ask for the icon.
- Four demo cases (mentions only, relationships only, both, neither). Only the relationships-only case changes.

Design points the ticket must settle:
1. Derive "has mentions" and "has relationships" once (`$derived` in the component) and branch on them: `{#if hasMentions}` group, `{#if hasRels}` group, `{#if !hasMentions && !hasRels}` empty. A store getter is not needed and would need its own test (CLAUDE.md rule 3); keep it inline. The Relationships group's `mt-2` (`:81`) must apply only when the mentions group renders above it.
2. Loading flash: on expand, a relationships-only note shows "No backlinks found" until the IPC resolves. This is the same flash linked mentions have today; do not add a loading flag (a local IPC call, no data at risk).
3. Stale data under the new rule: the effect `:33-39` resets the store only while expanded. If the user collapsed by hand on note A (store holds A's relationships), switched to B and expanded, A's relationships show until B's fetch resolves. Before P72 they were hidden whenever mentions were empty, so P72 makes this window newly visible. It is brief and self-corrects, and the same window already exists for mentions (this is Issue 014's territory). Do not fix it here; state the limit in the ticket.
4. Multi-underscore labels: replace all underscores (`replaceAll('_', ' ')` or a regex) in the same row template. One line, test-backed, in the rows P72 re-renders; keep it in this ticket.
5. Empty-state primitive: open-itens 205 wants this `<p>` moved to a future `EmptyState` (primitive not built; `src/lib/components/ui/` has no such directory at HEAD). The P72 ticket keeps the plain `<p class="text-meta ...">` and does not wait for 204/205.

Tests and seams:
- `src/tests/lib/features/backlinks/BacklinksPanel.test.ts`: mocks only the service (`:12-15`) and `openFileInEditor`; seeds the REAL `backlinksStore`. Existing: empty message with `text-meta` (`:172-175`), counts and relationship row roles with both lists seeded (`:177-197`), "No backlinks found" after index ready (`:128`). None seeds relationships alone, which is the bug case.
- `backlinks.store.test.ts` already covers set/reset of `relationshipBacklinks`. No service test change (service untouched).
- E2E: `e2e/mocks/tauri-core.ts:137-139` `handleGetRelationshipBacklinksV2` always returns `[]`, so a relationship-only E2E needs a mock change. Not needed: the component test on real store state covers the bug. Do not extend the mock for this ticket.
- Docs: `help/documentation/07-sidebar-panels.md:76-78` says "Below the linked mentions, a Relationships section shows ..."; it must say the section also appears when there are no linked mentions. (`:70` collapse-on-switch text belongs to P71.)

## P46. The relationship picker cannot be used from the keyboard

**Still real: yes** (validation "revise" holds: an empty query already lists the first 20 files alphabetically).

Current behaviour:
- `RelationshipSearch.svelte:33-38` handles Escape only. Rows are `<button onmousedown>` with `preventDefault` (`:66-72`), no `onclick`, no active-row state, no roles or ids. A focused row's Enter or Space fires `click`, which nothing handles, so the picker cannot be operated by keyboard at all.
- `:25` calls `filterAndRank(query, allFiles, [])`, so recents never rank. Empty query: `splitRecentFiles` with no recents returns every file by name (`file-entries.logic.ts:51-65`), the component then caps at 20.
- `:53` `trapFocus={false}`; focus is moved to the input by `queueMicrotask(() => inputRef?.focus())` on open (`:41`).
- Evidence correction: the review cites `file-entries.logic.ts:36-46`; at HEAD that range is `entryFolder` and a JSDoc. The relevant code is `splitRecentFiles` (`:51-65`) and `filterAndRank` (`:67-104`), which finders-ux 07 already prepared. No change to `file-entries.logic.ts` is needed, and `filterAndRank` must keep its flat output (`CanvasFilePicker` calls it too).
- "Follow the Quick Switcher" means reuse the bits-ui `Command` primitive (active row, Up/Down/Enter, `aria-activedescendant` on the input all come from it), not copy code. `EditorSection.svelte:55-83` already runs `Command.Root` inside `Popover.Content`.

What the prototype wants (`right-sidebar.html:1181-1245`):
- Input as combobox with `aria-activedescendant`, rows `role="option"` with `aria-selected`, list `role="listbox"`.
- Empty query: a "Recent" group (3 hardcoded notes) then an "All notes" group, not capped at 20. Typing: filtered list, first row active. Hover moves the active row. Active row scrolls into view.
- Up/Down move, Enter picks, Esc closes. Rows still pick on mousedown.
- Extras not in the review text: a key-hint footer ("Up Down move, Enter link, Esc close") and a `Linked X under Belongs to` status line after a pick.

Design points the ticket must settle:
1. Row structure: `Command.Root shouldFilter={false}` (the list is already ranked by `filterAndRank`), `Command.Input` keeping `placeholder="Search notes..."`, `Command.List` with `max-h-48 overflow-y-auto`, `Command.Group`s, `Command.Item` per file with `value={file.path}` (NOT the name: two notes named `Projects` in different folders would collide in Command's value matching) and `onSelect` calling the existing `handleSelect(file.nameWithoutExt)`. Keep the icon + name + relative-path two-line row. Selection moves from mousedown to the item's click; verify in the test that the popover still closes and the query resets.
2. Recents source and the feature-cycle ratchet. `quickSwitcherStore.recentPaths` is the only recents list, but `properties` must not import `quick-switcher`: `feature-cycle-baseline.json:23` already has `quick-switcher -> properties` (`QuickSwitcher.svelte:12` imports `lifecycle-filter.store`), `featureCycleEdges` is `[]` and `FEATURE_CYCLE_EDGES_SIZE = 0` (`feature-cycle.test.ts:55`, never grows). A `properties -> quick-switcher` import would form a 2-cycle and fail `feature-cycle.test.ts`. The raw scout left this as "unconfirmed"; it is confirmed by reading the baseline. Therefore pass recents in as a prop: `RelationshipSearch` gets `recentPaths?: string[]` (default `[]`), `PropertiesView` forwards it, and `AppShell.svelte:279` (the `app/` layer, which may import both) supplies `quickSwitcherStore.recentPaths`. The alternative (move the recents store to `core/`) touches the quick switcher's store, its tests and its reset flow for a small win; not recommended.
3. Recents are sparse: only Quick Switcher selections and creations are recorded (`addRecentPath` has two call sites). The picker's Recent group will show "notes you jumped to with the switcher", not "notes you opened". Accept it (see owner question 1); a core "record every open" change is out of scope.
4. Caps: with groups, drop the component's `.slice(0, 20)` and use the helper's `MAX_RESULTS = 100` cap (as the Quick Switcher does); the list scrolls inside `max-h-48`. The review's "20 files" was only the old cap.
5. Empty query vs typed query: empty + recents -> `splitRecentFiles` groups ("Recent" heading, then the rest); empty without recents, or any non-empty query -> one flat group from `filterAndRank(query, allFiles, recentPaths)` (recents get the existing ranking tiebreak). No heading when there is nothing to separate.
6. Focus: keep the explicit input focus on open (`:41`). Try removing `trapFocus={false}` (EditorSection's picker uses the default); keep it only if the test or a manual check shows the popover loses focus. Do not guess: verify in the failing test run.
7. `PropertiesView` renders three pickers (one per kind). The key hints footer and the "Linked ..." status line are prototype extras: default is to skip both (the new link row appears in its group at once, which is the feedback).
8. Coordination with P43 (rs-properties-layout): P43 will replace the three always-visible "+" groups with one "Add relationship" row and a kind menu, so the picker's trigger will change. Keep this ticket to the popover internals plus the `recentPaths` prop and leave `onSelect` and the "+" trigger as they are; land it before P43 so P43 only has to make the trigger controllable.

Tests and seams:
- `src/tests/lib/features/properties/RelationshipSearch.test.ts` (3 tests). Its `offered()` helper clicks `button[title="Add link"]`, types in `input[placeholder="Search notes..."]` and reads `.max-h-48 button span.truncate:first-child`; the icon test reads `.max-h-48 button svg`. Row markup becomes `Command.Item` (`role="option"`), so update those selectors in the same change; the three existing behaviours (no `.view` offered, default icon colour, empty tree) must stay green.
- Keyboard seam: dispatch `new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })` on the input, then read the row with `aria-selected="true"`, as `QuickSwitcher.test.ts:561-573` does (it wraps the first read in `vi.waitFor`). Real stores only: `fsStore.setFileTree`, `vaultStore.open`, `fileIconsStore`, and for recents the real `quickSwitcherStore.addRecentPath` is NOT usable here (the component takes a prop), so pass `recentPaths` directly. `onSelect` is a plain callback prop, not a store or `.logic.ts`: asserting its argument is fine, but pair it with a DOM assertion (popover closed, input empty).
- `src/tests/lib/features/properties/PropertiesView.test.ts`: has the Relationships labels tests (`:151-177`) and a real `propertiesStore`/`editorStore`; an integration test can pick by keyboard and assert the real `_belongs_to` value. Unconfirmed whether the popover portal is reachable from `mountView()` there; the ticket should try it and fall back to the RelationshipSearch test if not.
- `src/tests/lib/architecture/feature-cycle.test.ts` is the guard for design point 2.
- No E2E covers the picker (`grep "Add link|Search notes" e2e` finds nothing relevant). Not required.
- Docs: `help/documentation/07-sidebar-panels.md:47` describes the "+" search button; add the keyboard behaviour and the recents-first list.

## Candidate tickets

### T1. Relationship backlinks show without linked mentions (P72)

- **Size:** S.
- **Files:** `src/lib/features/backlinks/BacklinksPanel.svelte` (`:61-103`), `src/tests/lib/features/backlinks/BacklinksPanel.test.ts`, `help/documentation/07-sidebar-panels.md` (`:76-78`).
- **Blockers:** none hard. Shares `BacklinksPanel.svelte` and its test file with P71 (rs-links-toc; P71 edits the effects at `:33-51`, different region) and P74 (LinkItem, not the relationship rows). If the rs-links-toc analyst forms one ticket for BacklinksPanel, fold T1 into it; otherwise land T1 first (it is the smaller, independent fix). When P71 keeps the panel open across note switches it must also reset or refetch `relationshipBacklinks`, since T1 makes them visible on their own.
- **Acceptance criteria:**
  1. Failing test first, `BacklinksPanel.test.ts`: with the real store holding one relationship backlink and no linked mentions, the expanded panel shows no "No backlinks found", shows a "Relationships" trigger with count `1`, and the row's name and `belongs to` label. Fails today.
  2. Failing test first: in that same state there is no "Linked mentions" trigger rendered (each group renders on its own).
  3. Neither list: "No backlinks found" with the `text-meta` role (the existing test at `:172-175` stays green).
  4. Mentions only and both lists: groups and counts as today (the existing test at `:177-197` stays green); the Relationships group's top margin only applies when the mentions group renders above it.
  5. A custom relationship type with several underscores (`depends_on_project`) renders `depends on project`. Fails today (`depends on_project`).
  6. Clicking a relationship row calls `openFileInEditor` with its `sourcePath` (service module mocked, as in the file today).
  7. `help/documentation/07-sidebar-panels.md` says the Relationships section appears even when no note links here with a plain `[[wikilink]]`.
  8. Gate: frontend only, `pnpm check` + `pnpm vitest run`.

### T2. Relationship picker works from the keyboard and lists recents first (P46)

- **Size:** S (M if the owner wants recents to record every note open, which this ticket does not do).
- **Files:** `src/lib/features/properties/RelationshipSearch.svelte` (rewrite of the list on `Command`, `recentPaths` prop), `src/lib/features/properties/PropertiesView.svelte` (forward the prop, one line at `:252`), `src/lib/app/AppShell.svelte` (`:279`, pass `quickSwitcherStore.recentPaths`), `src/tests/lib/features/properties/RelationshipSearch.test.ts`, optionally `PropertiesView.test.ts`, `help/documentation/07-sidebar-panels.md` (`:47`).
- **Blockers:** `PropertiesView.svelte` and `AppShell.svelte:277-292` are also edited by P43/P177/P121/P123 (rs-properties-layout); the T2 edit is one prop line in each, so conflicts are trivial, but land T2 before P43 (design point 8). P44/P45 (rs-properties-editing) edit `PropertiesView` elsewhere. `file-entries.logic.ts` must not change.
- **Acceptance criteria:**
  1. Failing test first, `RelationshipSearch.test.ts`: with three notes in the tree, ArrowDown and ArrowUp move the option marked `aria-selected="true"`, and the input's `aria-activedescendant` resolves to that option's element. Fails today (no options, no active row).
  2. Failing test first: Enter picks the active row: `onSelect` receives its `nameWithoutExt`, the popover closes and the query is cleared. Fails today.
  3. Failing test first: with `recentPaths` supplied, an empty query lists the recents first under a heading, in recents order, then the other notes by name; a recent path missing from the tree is skipped; with no recents there is no heading and the order is alphabetical as today.
  4. Typing filters as before (`'Pro'` offers `Projects` first) and Enter then picks the first match; clicking a row with the mouse still picks it and closes the popover; Escape still closes and clears.
  5. Two notes with the same name in different folders are both offered and arrow navigation reaches both (option `value` is the path).
  6. The three existing `RelationshipSearch` tests stay green with the updated row selectors (no `.view`, default icon colour, empty tree).
  7. `src/tests/lib/architecture/feature-cycle.test.ts` and `layer-rules.test.ts` stay green: `features/properties` imports nothing from `features/quick-switcher`.
  8. `help/documentation/07-sidebar-panels.md:47` mentions typing, Up/Down, Enter and the recent notes first.
  9. Gate: frontend only, `pnpm check` + `pnpm vitest run`.

Not grouped: T1 and T2 share no component, state or file. Together they are two S tickets; one agent context could take both, but they would not belong in one commit (CLAUDE.md rule 10) and T2 needs its own review.

## Overlapping Issues

| Issue | Status | Decision |
|---|---|---|
| `.scratch/open-itens/issues/156-relationship-picker-navigates-arrow-keys.md` (ledger `:172` todo) | ready-for-agent | **Replace with T2.** Same file, same defect, its failing-test criterion is T2's AC 1-2. Its line refs are stale (`handleKeydown` is at `:33-38`) and it does not cover recents. Note its text says "Kanban half is out of date" (kanban picker already has arrow keys; not re-verified here, out of T2). |
| `.scratch/open-itens/issues/205-sidebar-panels-settings-use-empty-error-primitives.md` (ledger `:221` todo, blocked by 204) | ready-for-agent | **Partial overlap, depend.** Its "No backlinks found" bullet moves the same `<p>` that T1 re-branches; 205 also pins `p.text-meta` in `BacklinksPanel.test.ts`. It covers 7 other panels and the settings sections, outside this batch, so it should not be replaced whole. Recommend trimming its BacklinksPanel bullet (or letting 205 land after T1, rebased on T1's template). 204's primitives do not exist yet. |
| `.scratch/open-itens/issues/014-backlinks-outgoing-links-always-show-open-note.md` (ledger `:51` todo) | ready-for-agent | **Depend, owned by rs-links-toc (P71).** It fixes the linked-mentions version cache and the store reset on path change; it states relationship backlinks "have no cache and are correct today". Not a P72 replacement; shares `BacklinksPanel.svelte` and its test file. |
| `.scratch/open-itens/issues/210-noteinfo-relationships-heading-follow-sidebar-section.md` (ledger `:226` todo) | needs-info | **Exclude from this cluster.** It concerns the Properties "Relationships" heading (`PropertiesView.svelte`), i.e. P43 in rs-properties-layout. |
| `.scratch/finders-ux/issues/07-quick-switcher-rows-type-icon-folder-highlight.md` | resolved | **Reuse.** Provides `splitRecentFiles` and the recents split; T2 calls it and keeps `filterAndRank`'s flat output. Not a conflict. |
| `.scratch/finders-ux/issues/06-palette-calendar-undo-recent-groups.md` | resolved | None (palette only). |
| `.scratch/tasks-view-ux`, `frontmatter-rules`, `vault-organization-v2`, `preview-channel`, `claude-code-integration`, `mods-host-robustness` issues | live | No hits for BacklinksPanel, RelationshipSearch, `get_relationship_backlinks`. `frontmatter-rules` may rename relationship keys in the future; unconfirmed, and it would only change the type labels T1 prints. |

Review proposals that touch the same files: P71 and P74 (BacklinksPanel / LinkItem), P43, P177, P121, P123, P44, P45 (PropertiesView / right sidebar, see T2 blockers).

## Owner questions

1. **Recents in the picker.** Only Quick Switcher selections and creations are recorded as recents (`addRecentPath` has two call sites), so the picker's "Recent" group will reflect "notes you jumped to with the Quick Switcher", not every note you opened. Recommended default: ship it as is and state the limit in the ticket; no core change to record every open. Alternative: add a shared recents recorder in `core/` (a larger change that touches the editor open path).
2. **Picker headings and extras.** The prototype labels the empty-query groups "Recent" and "All notes" and adds a key-hint footer and a `Linked X under Belongs to` status line; the Quick Switcher uses "Recent notes" with an unheaded rest and has no hint footer in this popover. Recommended default: headings "Recent" and "All notes" as in the prototype, no footer, no status line.
3. **P72 sequencing.** Land T1 as its own S fix first, or fold it into the P71 BacklinksPanel ticket from rs-links-toc? Recommended default: stand-alone, first, because P71 is M and was revised.
4. **Issue 205.** Trim its BacklinksPanel bullet and let it keep the other six panels, or wontfix and re-plan it later? Recommended default: trim and keep (its scope is outside these three groups, and 204 is not built).

## Not checked

- No test, build or app run (read-only). `Command` inside `Popover` focus behaviour with `trapFocus` removed, and the jsdom reachability of the popover portal from `PropertiesView.test.ts`, are marked as "verify in the failing test run" above.
- The look of the Relationships rows with an added icon was not compared with the prototype pixel by pixel; T1 does not require the icon.
