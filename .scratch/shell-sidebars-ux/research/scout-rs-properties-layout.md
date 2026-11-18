# Scout: Right sidebar layout cluster (P43, P177, P121, P123)

Checked against HEAD `ab143a411` (main). Every load-bearing claim below was re-read in the source at that commit; the haiku raw files (`research/raw/P43.md`, `P177.md`, `P121.md`, `P123.md`) were used as leads. Nothing was rendered: all pixel figures are computed from classes, not measured. The codemap was not queried (it writes a cache under `node_modules/.cache`); importer lists below come from `grep` over `src`.

## Code map (what runs today)

The right sidebar is one `ScrollArea` inside `AppShell.svelte`. Panels are siblings in a fixed order; the only visibility flags are `layout.*Visible`.

| File | Role |
|---|---|
| `src/lib/app/AppShell.svelte:268-293` | Right pane (`minSize 3`, `maxSize 30`, `defaultSize = layout.rightSidebarSize`), root `div[data-right-sidebar]` (`bg-right-sidebar-bg`), one `ScrollArea` holding `PropertiesView`, `TableOfContentsPanel`, `BacklinksPanel`, `OutgoingLinksPanel`, `NoteInfo` (Info is gated by `propertiesVisible`, :290-292) |
| `src/lib/core/layout/SidebarSection.svelte` (72 lines) | Section frame. `collapsible = open !== undefined` (:31). Header is `<svelte:element this={button|div}>` with class `pane-toolbar w-full text-left` (+ `hover:bg-right-sidebar-accent/50` when collapsible, :38), a 14 px chevron slot (:41-45) then `<h2 class="text-title">` (:46); body `p-2 border-b border-divider` (:51); `Collapsible.Root` branch :57-66, static `<section>` branch :68-71 |
| `src/app.css:151-153` | `@utility pane-toolbar` = `flex h-10 shrink-0 items-center gap-1 px-3 border-b border-divider`. No sticky, no background |
| `src/lib/features/properties/PropertiesView.svelte` | `SidebarSection title="Properties"` with no `open` (:156, static). Type row :165-206 (spacer :203), property list :208-219, add row :221-241, Relationships block :243-290 (heading :245, kind label :250, per-kind `RelationshipSearch` :252, `FIXED_RELATIONSHIPS` :53-57). Script also owns the parse effect :105-119 |
| `src/lib/features/properties/PropertyField.svelte` | One property row: main row `flex items-center gap-2 min-h-7` (:108), key `<input>` `flex-[2] min-w-0 truncate` (:113-119), value `flex-[3] min-w-0` (:124/:139/:146), delete button `opacity-0` but in flow (:157-164), list chips below (:168-201) |
| `src/lib/features/properties/RelationshipSearch.svelte` | Popover with a plus trigger (`title="Add link"`, :41-52), `trapFocus={false}`, rows select on `mousedown` (:68), Escape only (:33-38) |
| `src/lib/features/properties/NoteInfo.svelte` | Info section drawn by hand: `p-2` + h2 with `Info` icon `px-2 mb-1` (:43-47), rows `flex items-center gap-2 px-2 py-0.5` with `shrink-0` label and `min-w-0 flex-1 truncate text-right` value, `title={row.value}` (:49-52). Reads `editorStore`, `vaultStore.vaultIndexVersion`, `getVaultEntries()` |
| `src/lib/features/properties/note-info.logic.ts` | `formatTimestamp` (:15-22, `month: 'long'` at :18, time from system locale :20), `buildNoteInfoRows` (:28-35), `NoteInfoRow {label, value}` |
| `src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte`, `features/backlinks/BacklinksPanel.svelte`, `features/outgoing-links/OutgoingLinksPanel.svelte` | The other `SidebarSection` users; all bind `open`, collapsed by default and reset per note (help `07-sidebar-panels.md:74,92`). Backlinks body is its own `max-h-[50vh] overflow-y-auto` scroller |
| `src/lib/core/settings/settings.types.ts:92-110`, `settings.store.svelte.ts:64-72`, `settings.logic.ts` `mergeLayout` | `LayoutSettings`: only visibility flags and pane sizes; no per-section state. `updateLayout` mutates in place (:250). `mergeLayout` keeps only keys present in the defaults and takes saved values unvalidated, so a boolean read must go through `=== true` (precedent `parseRailCollapsed`, `rail-items.logic.ts:173`) |

Readers of the relevant stores: `propertiesStore` (PropertiesView, `properties.service.ts`), `editorStore` (PropertiesView, NoteInfo), `fsStore` (PropertiesView relationship resolution, RelationshipSearch), `typeDefinitionsStore` (type row), `settingsStore.layout` (AppShell visibility), `settingsStore.tagColors` (PropertyField chips). Importers: `SidebarSection` is used by the four panels only (`grep`: PropertiesView, TOC, Backlinks, Outgoing); `NoteInfo` and `PropertiesView` are mounted only by `AppShell.svelte`; `note-info.logic.ts` only by `NoteInfo.svelte` and its test; `PropertyField` only by `PropertiesView`; `RelationshipSearch` only by `PropertiesView`.

Facts that shape the tickets:
- The right pane opens at its narrowest by default (`settings.store.svelte.ts:68-72`: `rightSidebarSize: 3`, "the owner drags them to size"), so the narrow layout is the common case, not a corner. The pane unit (PaneForge percent of the inner group) was not verified; express thresholds as container width in px, never as pane percent.
- bits-ui 2.20.6 `ScrollArea` has no `display: table` content wrapper unless the horizontal scrollbar is enabled (`scroll-area.svelte.js:93`); `ScrollArea` here is vertical-only. Sticky inside it is not blocked by the viewport structure.
- The repo already uses Tailwind container queries (`TasksView.svelte:903` `@container` with `@max-[560px]:`, `TaskLists.svelte:178`, `EventBlock.svelte:75`). `pane-toolbar.test.ts:19-52` forbids `h-*`, `p*-*`, `gap-*`, `border-*` (except `border-b`) and `flex-wrap` on a toolbar's class list and scans `SidebarSection.svelte` (exactly one `pane-toolbar` class list). `sticky`, `top-0`, `z-*` and `bg-*` are allowed.
- jsdom computes no Tailwind and no container queries (`SidebarSection.test.ts` header comment; `PropertyField.test.ts:111` reads `app.css` as source). Layout facts are therefore pinned as class and structure assertions in vitest, and real layout needs a Playwright check. Precedents for narrow viewports: `e2e/specs/tabs.spec.ts`, `note-action-bar.spec.ts`, `sidebars.spec.ts` all call `setViewportSize`; `readPersistedLayout(page, key)` exists for persisted layout keys.

## P43. Properties cannot collapse, headers scroll away, empty Relationships chrome

**Still real: yes, all three parts.** The review's line numbers drifted by one to three lines; the claims hold.

Current behaviour:
- Not collapsible: `PropertiesView.svelte:156` passes no `open`, so `SidebarSection` takes the static branch (:68-71). The other three panels bind `open`.
- No sticky anywhere in the sidebar: `grep sticky` over `src/lib` lists only event-calendar and `Rail.svelte`; `SidebarSection`, `AppShell` and the panels have none. The header has a translucent hover (`hover:bg-right-sidebar-accent/50`, :38) and no base background.
- Empty Relationships chrome: `PropertiesView.svelte:244-290` always renders a `Separator`, the "Relationships" h3 (:245) and three kind rows each with a plus (:246-254), even with no links; `{#if links.length > 0}` (:255) guards only the link list. Class estimate of the empty block: separator `my-2` (16 px + 1) + h3 (16 + `mb-1` 4) + 3 rows each `py-1` + 20 px line = 3 x 28, about 120 px, consistent with the prototype's 121 px screenshot figure. Not measured.
- No remembered state exists: Backlinks/Outgoing use local `expanded` reset on note change; TOC uses `tocStore.expandedPath` per note. `LayoutSettings` holds none.
- The section header renders an `h2` inside a `button` for collapsible sections (:35-47), invalid HTML, which open-itens 210 item 3 wants flipped (its cited lines 110-122 are stale; the file is 72 lines).

What the prototype wants (`prototypes/right-sidebar.html`, `#P43` at :411, script :1011-1036, `relBlock` :746-751, `section()` :660-666): collapsible Properties (default open), sticky `.sec-h` (`position: sticky; top: 0; z-index: 4; background: var(--bg)`), and for Relationships: no heading and no groups when empty, just one "Add relationship" row that opens an upward menu "Belongs to / Related to / Has many" and then the picker; when any links exist, the "Relationships" heading plus only the non-empty groups, each with its own plus, and the Add row stays below them.

Design points a ticket must settle:
1. Where "remember" lives. Recommended: one layout boolean `propertiesCollapsed` (default false), read with `=== true`, written by `settingsStore.updateLayout` from the section's `onOpenChange`. It is global and persists across notes and restarts, unlike the per-note Backlinks/TOC state. A new key must be added to `settings.types.ts`, the defaults in `settings.store.svelte.ts`, and any full `LayoutSettings` fixtures (`pnpm check` flags a missing key; `settings.logic.test.ts` builds `mergeLayout` fixtures from the defaults). `claude-code-integration` Issue 03 also adds `layout.claudeVisible` in the same three places: a textual merge conflict, not a semantic one.
2. Sticky scope and paint. A header sticks only inside its own section (its parent is `Collapsible.Root` or `<section>`), so each header is pushed off by the next, which is the wanted behaviour. It needs an opaque base: add `sticky top-0 z-10 bg-right-sidebar-bg` and make the collapsible hover opaque (`hover:bg-right-sidebar-accent`, or a layered gradient) because `/50` over a sticky bar shows scrolled content through it. Do not put `h-*`, `p-*`, `gap-*` or `border-*` on the header class list (`pane-toolbar.test.ts`).
3. If 210 item 3 is absorbed (button inside h2), the sticky element becomes the h2 wrapper that carries `pane-toolbar`, `Collapsible.Trigger`'s `child` snippet must hand its props to the inner button, and these locators change: `SidebarSection.test.ts` (`header()` and `title()` helpers), `AppShell.test.ts:264-285` (`header.querySelector('h2')`), `PropertiesView.test.ts:139-149`, and e2e `sidebars.spec.ts:43,56` (`locator('button', { has: locator('h2', ...) })`). Backlinks/Outgoing e2e must keep passing after the flip.
4. Collapsing must not unmount `PropertiesView`: the parse effect (:105-119) lives in the component script and keeps `propertiesStore` in sync while collapsed. `Collapsible.Content` keeps its DOM until the exit transition ends, so tests use the `bodyShown()` pattern from `SidebarSection.test.ts:41-47`.
5. The "Add relationship" row needs the kind step plus the picker. `RelationshipSearch` today owns its own plus trigger and Popover. Recommended: give it an optional `kinds` prop (and a `trigger` snippet) so one popover shows the three kinds first and then the search, and `onSelect` returns `(kindKey, name)`; keep the per-kind plus (no `kinds`) for non-empty groups. This is additive, but P46 (arrow keys, active row, `aria-activedescendant`) rewrites the same file's list: sequence with the P46 ticket.
6. Add row when only some kinds have links: the prototype keeps the Add row always, so an empty kind stays reachable. Keep that.
7. Tests that break by design (rewrite, do not weaken; each pins the old always-visible chrome): `PropertiesView.test.ts:172-181` expects all three kind labels on a note whose only relationship is `_belongs_to` (`NOTE_BODY`), so it pins the empty `Related To` and `Has Many` rows. `:151-158` (the h3 exists, with `section-label`) stays true for a note with a link; the new empty-note case is added next to it.

Test files and seams:
- `src/tests/lib/core/layout/SidebarSection.test.ts`: class assertions for sticky/opaque (real component, no mocks).
- `src/tests/lib/features/properties/PropertiesView.test.ts`: real `propertiesStore`, `editorStore`, `fsStore`, `settingsStore`; mocks only the icon data module, `editor.service.js` and `log.service.js` as today. Collapse is asserted through the real `settingsStore.layout.propertiesCollapsed`.
- `src/tests/lib/core/settings/settings.logic.test.ts` (merge keeps a saved `true`, ignores a non-boolean) and `settings.store.test.ts` (default).
- `src/tests/lib/features/properties/RelationshipSearch.test.ts` for the `kinds` step.
- E2E (`bash scripts/e2e.sh`, `e2e/specs/sidebars.spec.ts`): scroll the sidebar viewport and assert the active section header's `getBoundingClientRect().top` equals the viewport's; collapse Properties and `readPersistedLayout(page, 'propertiesCollapsed')` is `true`. No e2e covers sticky or collapse today.

## P177. Section titles misaligned; Info and Relationships label style

**Still real: yes.** Title x is computed from classes: every `SidebarSection` title sits at 12 (`px-3`) + 14 (slot) + 4 (`gap-1`) = 30 px; Info's sits at 8 (`p-2`) + 8 (`px-2`) + 14 (icon) + 6 (`gap-1.5`) = 36 px (`NoteInfo.svelte:43-45`). The 6 px gap matches the review. Info is not a `pane-toolbar` (no 40 px band, no header border) and is drawn outside any `SidebarSection`. Relationships h3 (`PropertiesView.svelte:245`) and the kind labels (:250) both use `section-label` (11 px uppercase semibold, `app.css:140-142`), so parent and children share one style; the stored labels are title case (:54-56) and the uppercase is CSS only.

Prototype (`#P177` :487, script :1294-1311): Info through the same `.sec-h` (40 px, empty chevron slot, `border-bottom:0` on its body, no icon); Relationships children become `.rel-lab` 13 px/18 px muted sentence case from `RELS` ("Belongs to", "Related to", "Has many"); the Relationships h3 stays only when any group has links. The "after" cell also turns on P43 (collapsible, sticky, one Add row), so it is not P177 alone.

Design points:
1. 13 px already exists as `text-rail` (`app.css:96`, `--text-rail: 13px`). Sentence case: the rail already stores these labels as "Belongs to / Related to / Has many" (`rail-shell/lens.logic.ts:416-418`), so lower-casing the data in `FIXED_RELATIONSHIPS` makes the app consistent; this changes `PropertiesView.test.ts:172-181` literal strings.
2. Info body divider. `SidebarSection` always draws `border-b border-divider` on the body (:51). Through it, Info gets a closing line under the last panel. The prototype zeroes it. Recommended default: keep the divider (consistent with every other section, no new prop). Unverified visually.
3. Stale comment: `NoteInfo.svelte:42` ("No divider above: the section above draws its own bottom edge") and the `Info` icon import (:3) go away with the change.
4. Test impact: `AppShell.test.ts:264-285` asserts exactly four `[data-sidebar-section-header]` titles (Properties, Table of contents, Backlinks, Outgoing links); Info through `SidebarSection` makes five and that test must list `Info` last. `AppShell.test.ts:221-255` (Info last `h2`, hides with Properties) still holds. `pane-toolbar.test.ts` scans files, not mounted DOM, and needs no change if the class stays in `SidebarSection.svelte` only.
5. `section-label` has about 20 consumers; do not change the utility. In the right sidebar only `PropertiesView.svelte` uses it.

Test files: `NoteInfo.test.ts` (title through `SidebarSection`: `h2` inside `[data-sidebar-section-header]` with a chevron slot and no icon, same title classes as Backlinks), `PropertiesView.test.ts`, `AppShell.test.ts`. No e2e asserts any of these headings.

## P121. Narrow right sidebar truncates property names

**Still real: yes.** Class arithmetic at the screenshot's 166 px sidebar (MANIFEST.md:42; not re-measured): content width = 166 - 16 (section body `p-2`) - 16 (row `px-2`) = 134 px; minus 14 (type icon) minus three `gap-2` (24) minus the always-reserved 16 px delete button (`PropertyField.svelte:157-164`, `opacity-0` but in flow) leaves about 80 px for key (`flex-[2]`) and value (`flex-[3]`): roughly 32 px for the key and 48 px for the value. That is the "t...", "d..." in the screenshot. At 220 px the pair gets about 134 px (key about 54 px). The type row repeats the pattern: key span `flex-[2] truncate` (`PropertiesView.svelte:169`), dropdown `flex-[3]` (:176), and a 16 px spacer (:203).

Prototype (`#P121` :431, CSS :107-215, script :1068-1097): a `@container pb (max-width: 215px)` switches `.pmain` to a two-column grid (14 px icon column, `1fr` content); key above value; key gets `padding-left: 10px; font-size: 12px; height: 18px`; the spacer is hidden; action buttons are absolutely positioned (`top: 4px` when narrow) and shown on hover. The three thresholds in the sources disagree: proposal "about 220 px", prototype CSS 215 px on the section body content box, prototype caption "234 px of sidebar". 215 + 16 of padding = 231, so 220 to 234 describes one threshold seen from different boxes.

Design points:
1. Container: no `@container` exists in `src/lib/features/properties`. Put it on the `PropertiesView` root `<div class="flex flex-col">` (:155), whose width equals the sidebar width (block inside the `ScrollArea` viewport), and state the threshold against that box. Recommended default: stack below 232 px of sidebar (`@max-[232px]:`), as one named constant in the ticket and the test. The container also serves the Relationships rows and any later narrow rules.
2. Both the `PropertyField` main row and the PropertiesView type row must change together or the type row keeps its squeezed layout; the 16 px spacer (:203) is removed outright if the button leaves the flow.
3. Remove button overlays the row on hover and `focus-within` (keep `group-focus-within:opacity-100` for keyboard users). Owner question below on overlaying the value's tail at wide widths.
4. Value variants to cover in the stacked layout: boolean (`label` :124), text/number/date (`Input` :135-143), list (empty `span` + add button :146-153; chips are already a separate row below, :168-201).
5. jsdom cannot run the query: unit tests pin the container class on the root and the stacked/overlay classes on key, value and button; a Playwright test at a narrow viewport asserts the key input's real width (for example `boundingBox().width` of `input[data-property-key]` above a floor) and that it is above the value input. Selectors that must survive a DOM change: `input[data-property-key]`, `div.group`, `input:not([data-property-key])` (`e2e/specs/properties-cross-note.spec.ts:64-66,102-103`).
6. Shared files with the editing cluster: P44 rewrites the key input's commit/revert (`PropertyField.svelte:29-33,52-58,113-119`), P45 rewrites the type row (`PropertiesView.svelte:165-206`, always shown with a "Set type" placeholder), P122 rewrites chips and the list add control (`PropertyField.svelte:146-153,166-201`). P121 touches the same class lists and wrapper structure. It cannot run in parallel with them; see blockers.
7. Existing tests to extend: `PropertyField.test.ts` (class assertions, value variants), `PropertiesView.test.ts` type row describe (`:184`).

## P123. Info values truncate their dates

**Still real: yes, and the proposal alone does not fix the default width.**

Current behaviour: `formatTimestamp` returns `"<long month> d, yyyy, hh:mm"` (`note-info.logic.ts:18-21`); the value span is `min-w-0 flex-1 truncate text-right` with `title={row.value}` (`NoteInfo.svelte:51`); the label is `shrink-0` (:50). Corrections to the review and raw file:
- The review's second evidence range `NoteInfo.svelte:29-33` is the `$effect` catch block; the relevant lines are :48-53.
- "The tooltip already holds the full value" is false: `title` is the same string as the visible text, so shortening `row.value` also shortens the tooltip (the prototype has the same bug at `right-sidebar.html:825`, against its own caption). The tooltip needs a separate full string.
- The review's "Dropped the Unavailable state" refers to nothing in code; the unknown placeholder is `'--'` (`note-info.logic.ts:4,16,30-33`) and stays.

Width check from classes: at the default narrow sidebar of about 166 px, the value gets roughly 166 - 16 - 16 - 8 (gap) - 58 (label "Modified" at 14 px) = about 68 px; "Nov 10, 2026, 10:00" is 19 characters, about 125 px at 14 px. The short month fits only from roughly 250 px up (the prototype's demo width). So the ticket must include the wrap-under-label state the prototype shows at 200 px (`.info-row` `flex-wrap: wrap`, value `flex: 1 0 auto; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`), not just `month: 'short'`. Flex-wrap needs no container query.

Design points:
1. `NoteInfoRow` is exported (`note-info.logic.ts:7-12`); add a `title: string` carrying the long form (for Words and Size it equals the value). Keep one `formatTimestamp` implementation with a `month` option, or two thin formatters; the long form `month: 'long'` stays for the tooltip.
2. Time is system-locale (:19-20): in a 12-hour locale the value is "Nov 10, 2026, 10:00 AM" (longer), which makes wrapping more likely at 250 px.
3. Existing short-date precedents: `file-history.logic.ts:38` (`month: 'short', day: 'numeric'`, no year) and `trash.logic.ts:91` (`month: 'short', day: 'numeric', year: 'numeric'`). Info should keep the year (review example "Nov 10, 2026, 10:00").
4. Tests that pin the old behaviour and must change: `note-info.logic.test.ts:27` and `:47` (`November 5, 2026`), `:29` (`May 12` stays "May"), `NoteInfo.test.ts:117` (`November 5, 2026`), `:124-129` (title equals text: becomes title equals the long form), `:134-147` ("truncates the value before the label": pins `flex-1 min-w-0 truncate` on the value; wrap changes the value classes). Keep the invariant that matters, the label stays `shrink-0` and never `flex-1`, and replace the value-class pin with the wrap assertions. This is a deliberate behaviour change to a pin; the ticket must say so explicitly for approval.
5. jsdom has no layout: add a Playwright check at a narrow sidebar that no Info value has `scrollWidth > clientWidth` (not clipped). `e2e/specs/rail-list-toolbar.spec.ts:104-149` only mentions "Modified"/"Created" for the list sort, not Info.

Test files: `src/tests/lib/features/properties/note-info.logic.test.ts` (pure, no mocks), `NoteInfo.test.ts` (mocks only `invoke`, icon data, `editor.service.js`, `log.service.js`; fixture `src/tests/fixtures/vault-entries.fixture.ts` `entryV2`).

## Candidate tickets

Grouping rationale: P177's Info half and P43's sticky/collapse are all "section frame" concerns (`SidebarSection.svelte`, `NoteInfo.svelte`, the `open` binding), small and in one test family; P177's Relationships labels and P43's empty chrome are the same lines (:243-290); P123 is the Info rows only; P121 is the row layout and collides with another cluster. Four tickets, one fresh context each.

### T1. Right sidebar section frame: sticky headers, Properties collapses and is remembered, Info on the shared header
- **Ids:** P43 (sticky + collapse), P177 (Info half); replaces open-itens 210 items 1 and 3.
- **Size:** M.
- **Files:** `src/lib/core/layout/SidebarSection.svelte`, `src/lib/features/properties/PropertiesView.svelte` (only the `SidebarSection` call at :156 and the `open` plumbing), `src/lib/features/properties/NoteInfo.svelte`, `src/lib/core/settings/settings.types.ts`, `settings.store.svelte.ts` (+ any full `LayoutSettings` fixtures), `help/documentation/07-sidebar-panels.md`; tests `SidebarSection.test.ts`, `PropertiesView.test.ts`, `NoteInfo.test.ts`, `AppShell.test.ts`, `settings.logic.test.ts`/`settings.store.test.ts`, `e2e/specs/sidebars.spec.ts`.
- **Blockers:** none. It goes first of the Info/PropertiesView edits (T2, T3, T4 follow it). Merge-order note with `claude-code-integration` 03 and `rs-links-toc` P71/P115: the layout-settings key list and the `AppShell.test.ts` sections test are shared.
- **Acceptance criteria:**
  1. Failing test first, `SidebarSection.test.ts`: every header (static and collapsible) carries `sticky`, `top-0`, `z-10` and an opaque `bg-right-sidebar-bg`, the collapsible hover is opaque, and no `h-*`/`p*-*`/`gap-*`/`border-*` is added (`pane-toolbar.test.ts` stays green).
  2. Failing test first, `PropertiesView.test.ts` with the real `settingsStore`: the Properties header is a button with `aria-expanded="true"` by default; clicking it hides the body and sets `settingsStore.layout.propertiesCollapsed` to `true`; remounting after a tab switch keeps it collapsed.
  3. `settings.logic.test.ts`: `mergeLayout` keeps a saved `propertiesCollapsed: true`; a non-boolean saved value reads as expanded (`=== true`); the default is `false`.
  4. Failing test first, `NoteInfo.test.ts`: Info's title is an `h2` inside `[data-sidebar-section-header]` with the empty chevron slot and no `Info` icon, with the same title classes as the other sections; `AppShell.test.ts` sections test lists five headers ending in `Info`; the "Info is last and hides with Properties" tests still pass.
  5. `SidebarSection.test.ts`: the collapsible header is a `button` inside an `h2` (210 item 3), still toggles and sets `aria-expanded`; `AppShell.test.ts`, `PropertiesView.test.ts` and `sidebars.spec.ts` locators updated to the new structure, Backlinks/Outgoing e2e still green.
  6. E2E: scrolling the sidebar keeps the current section's header pinned at the viewport top (bounding rect), and collapsing Properties persists (`readPersistedLayout(page, 'propertiesCollapsed')` is `true`).
  7. Help `07-sidebar-panels.md` mentions the collapsible Properties header (docs, no test).

### T2. Relationships block: only groups with links, one Add relationship row, sentence-case labels
- **Ids:** P43 (empty chrome), P177 (Relationships labels); replaces open-itens 210 item 2.
- **Size:** M.
- **Files:** `src/lib/features/properties/PropertiesView.svelte` (:53-57, :243-290), `src/lib/features/properties/RelationshipSearch.svelte` (additive `kinds` step and optional `trigger`), `help/documentation/07-sidebar-panels.md:45-47` and `25-types-and-relationships.md`; tests `PropertiesView.test.ts`, `RelationshipSearch.test.ts`.
- **Blockers:** T1 (same file, different regions: textual merge only, safe in either order). `RelationshipSearch.svelte` is shared with the `rs-relationships` ticket for P46 (keyboard in the same list): run after it, or agree who owns the picker's list markup. Do not change `RelationshipSearch` behaviour for callers without `kinds` (`finders-ux` 07 criterion: it "behaves as today").
- **Acceptance criteria:**
  1. Failing test first, `PropertiesView.test.ts`: a note with no relationship keys renders no "Relationships" heading, no `Separator` and no kind labels, only one "Add relationship" row; it fails today (heading :245 always renders).
  2. A note with only `_belongs_to` renders the "Relationships" heading, the "Belongs to" group with its link and its own plus, no "Related to" or "Has many" group, and the Add row below.
  3. The kind labels read "Belongs to", "Related to", "Has many" in 13 px (`text-rail`) sentence case, muted, not `section-label`; the `_belongs_to`/`_related_to`/`_has_many` keys are unchanged (`PropertiesView.test.ts:172-181` rewritten for the new rule).
  4. Picking a kind then a note from the Add row writes the right key through the real `propertiesStore`/`properties.service` (new key via `upsertProperty`, existing via `updateProperty`), asserted on `propertiesStore` and tab content, not on call counts.
  5. `RelationshipSearch.test.ts`: without `kinds` it behaves exactly as today (offers notes, never a view, icons); with `kinds` it shows the kind step first.
  6. Playwright or class check that the empty note's Relationships region is one row high (the prototype's figure for the old block is 121 px, unmeasured here).
  7. Help docs describe the single Add relationship row.

### T3. Info section: short dates that fit, full value in the tooltip
- **Ids:** P123.
- **Size:** S.
- **Files:** `src/lib/features/properties/note-info.logic.ts`, `NoteInfo.svelte` (row markup only); tests `note-info.logic.test.ts`, `NoteInfo.test.ts`, optional e2e.
- **Blockers:** T1 edits `NoteInfo.svelte` (header, :43-47) and this ticket edits the rows (:48-53): textual merge only. No cross-cluster blockers.
- **Acceptance criteria:**
  1. Failing test first, `note-info.logic.test.ts`: Modified and Created read "Nov 5, 2026, <local time>" (short month, day, year, system-locale time); an unknown timestamp stays `'--'`; each row carries a `title` with the long form ("November 5, 2026, <time>"); Words and Size titles equal their values.
  2. Failing test first, `NoteInfo.test.ts`: the value's `title` attribute is the long form and differs from the visible short text for date rows; fails today.
  3. `NoteInfo.test.ts`: the row wraps (`flex-wrap`) so a value that does not fit moves under its label; the label stays `shrink-0` and never `flex-1`; the value keeps `truncate`/`max-w-full` as a last resort. The old "truncates the value before the label" case is replaced, not weakened, and the ticket states why.
  4. E2E at a narrow sidebar (`setViewportSize`): no Info value has `scrollWidth > clientWidth`.

### T4. Properties rows stack key over value in a narrow sidebar
- **Ids:** P121.
- **Size:** M.
- **Files:** `src/lib/features/properties/PropertyField.svelte` (main row :108-165), `PropertiesView.svelte` (root :155, type row :167-204 incl. spacer :203); tests `PropertyField.test.ts`, `PropertiesView.test.ts`, `e2e/specs/properties-cross-note.spec.ts` or a new narrow-width spec.
- **Blockers:** same files as the `rs-properties-editing` tickets (P44, P45, P122). Order: P44 and P45 first (they own the key input behaviour and the type row structure), then this ticket, then P122 (or after it, depending on who touches the delete/add buttons); do not run it in parallel with any of them. It also edits the `PropertiesView.svelte` root, which T1 and T2 leave alone.
- **Acceptance criteria:**
  1. Failing test first, `PropertiesView.test.ts`: the root carries the `@container` class; `PropertyField.test.ts`: the main row, key, value and delete button carry the stacked classes under the chosen threshold (recommended `@max-[232px]:`) and the delete button is out of flow (absolute) with `group-hover` and `group-focus-within` visibility kept.
  2. The type row (`PropertiesView.svelte:167-204`) stacks the same way and the 16 px spacer is gone; its dropdown and the type selector tests (`:184-`) still pass.
  3. Every value variant (text, number, date, boolean, list with and without chips) renders with the key above the value in the stacked layout; the list branch's empty value span is not left in the grid.
  4. Selectors `input[data-property-key]`, `div.group`, `input:not([data-property-key])` still work (cross-note e2e unchanged).
  5. E2E at a 1024 px viewport (sidebar near its default width): the key input's rendered width is above a stated floor (the key is no longer 3 to 4 characters) and the key sits above the value input; at a wide sidebar the key and value are on one row.
  6. No `rightSidebarSize`, `minSize` or `maxSize` change in `AppShell.svelte` (Issue 03 of `claude-code-integration` forbids touching `maxSize`).

## Overlapping Issues

| Issue | Status (file / ledger) | Overlap | Disposition |
|---|---|---|---|
| `.scratch/open-itens/issues/210-noteinfo-relationships-heading-follow-sidebar-section.md` | needs-info / ledger todo | Items 1 (Info through `SidebarSection`), 2 (Relationships heading vs kind labels), 3 (`h2` inside `button`) are exactly P177 and part of P43. Its cited lines drifted (item 2 cites :244/:249, now :245/:250; item 3 cites `SidebarSection.svelte:110-122`, the file has 72 lines) | **Replace** with T1 (items 1, 3) and T2 (item 2). Its open owner decision (drop the heading or make it weightier) is settled by the prototype: keep the heading, only when links exist; see Owner questions |
| `.scratch/open-itens/issues/156-relationship-picker-navigates-arrow-keys.md` | ready-for-agent / todo | `RelationshipSearch.svelte` keyboard (P46). Not a P43 proposal, but T2 adds a step to the same component | **Replace** by the `rs-relationships` P46 ticket (not ours); T2 **depends** on it or coordinates ownership |
| `.scratch/open-itens/issues/205-sidebar-panels-settings-use-empty-error-primitives.md` | ready-for-agent / todo (blocked by 204) | Empty states of Backlinks, Outgoing links, TOC; not Properties or Info | **Exclude** (no shared lines) |
| `.scratch/open-itens/issues/008-...` and `105-...` | ready-for-agent / needs-triage | `PropertiesView.svelte:100-114` parse effect and skip flag | **Exclude**; do not touch that effect (collapse must not unmount the panel) |
| `.scratch/open-itens/issues/139-properties-panel-matches-columns.md` | ready-for-agent | Name collision only: the collection view's Properties panel | **Exclude** |
| `.scratch/claude-code-integration/issues/03-claude-chat-panel.md` | ready-for-agent | Edits the right sidebar section set in `AppShell.svelte:277-292` and adds `layout.claudeVisible` | **Depend**: only a merge-order note (settings keys, AppShell sections test). T1 does not edit `AppShell.svelte`, only its test; the Claude panel being the sole section when visible is compatible with sticky headers |
| `.scratch/finders-ux/issues/07-quick-switcher-rows-type-icon-folder-highlight.md` | resolved | Criterion: `RelationshipSearch` "behaves as today" | Regression guard for T2 |
| `.scratch/frontmatter-rules/issues/01-rules-set-properties-on-save.md` | resolved | Term hit only | Exclude |
| Review P71, P115 (`rs-links-toc`) | not yet tickets | May add per-section remembered state for Backlinks/Outgoing/TOC; T1 introduces a boolean for Properties | Coordinate the persistence key shape; recommended default is one boolean now, generalise only if P71 needs it |
| Review P44, P45, P122 (`rs-properties-editing`) | not yet tickets | Same `PropertyField.svelte` and type row as T4 | T4 sequenced after P44/P45 |

## Owner questions

Only questions the code cannot answer; each has a recommended default.

1. Should Properties' collapsed state be global and persistent, or per note? Recommended: global, one layout boolean (`propertiesCollapsed`), persisted in settings. Backlinks/Outgoing/TOC keep their deliberate per-note collapse (help `07-sidebar-panels.md:74,92`), which P71/P115 may revisit separately.
2. Relationships heading (open-itens 210 item 2): the prototype keeps the uppercase "Relationships" heading only when at least one link exists and drops it when empty. Confirm that this settles 210. Recommended: yes.
3. The "Add relationship" interaction: kind menu first, then the note picker (prototype, recommended), or a single picker with a kind selector inside it. The first costs one more click but matches the prototype and the three fixed kinds.
4. The remove button: the proposal and prototype take it out of the flow at every width, so on hover it overlays the value's right edge (about 6 px of a long value, class estimate). Recommended: follow the proposal everywhere (frees about 24 px at every width). Alternative: out of flow only in the stacked layout.
5. Info dates always show the year. Recommended: keep the year ("Nov 10, 2026, 10:00", the review's example). The alternative drops the year for the current year, which is shorter but ambiguous across years.
6. Info through `SidebarSection` adds a closing divider under the last panel. Recommended: accept it (consistent with the other sections, no new prop); the alternative is a `SidebarSection` option to omit the body border.
7. The stacked-layout threshold. Recommended: 232 px of sidebar width (reconciles "about 220", the prototype's 215 on the content box, and its 234 caption). Only a question if the owner has a preferred breakpoint.
