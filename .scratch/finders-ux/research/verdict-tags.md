# Verdict: Tags view cluster (P76, P157, P187)

Adversarial check of `scout-tags.md` against HEAD `f2cd7f97b`. Read-only: I opened every cited source line, the three overlapping Issues and their Comments, and grepped every `.scratch/*/issues/*.md` for `TagItem`, `TagsView`, `TagColorPicker`, `TagColorDot`, `EditorTabs`, `filterTagTree`, `hideRareTags`.

## Proposals: still real?

| ID | Real | Verified at |
|---|---|---|
| P76 | yes | `TagsView.svelte:15` threshold 10, `:35-39` `displayedTree`, `:52-56` header prints `totalTagCount`, `:81-82` single "No tags found". `tags.logic.ts:98-108` keeps a node on its own `count >= 10` or a surviving child. `help/documentation/07-sidebar-panels.md:107-109` documents the unfiltered header on purpose. Line 116 only describes the filter icon and does not need to change (the scout was wrong about that line). |
| P157 | yes | No filter input anywhere in `TagsView.svelte`. `TagItem.svelte:30-32` chevron has no label. `TagColorPicker.svelte:32` trigger has no name. Alignment from the classes: the parent dot is at 20px (chevron `p-1` + `size-3`), the leaf dot at 8px (`px-2`), so 12px off. With the dot fixed, the name is still 2px off (40 vs 42) and the count sits 4px from the right edge in parents and 8px in leaves. The scout's numbers check out. |
| P187 | yes | `EditorTabs.svelte:69-82` has no `tags` branch. `fileType: 'tags'` (`tags.service.ts:136`) falls to `EditorView.svelte:56-64` `fileTabIcon`, which shows `FileText` unless `resolveIconForPath('__virtual__/tags')` matches a user rule. `EditorTabs.svelte` is the only place that picks a tab icon by `fileType`. |

## Where the scout is wrong or incomplete

1. **Do not supersede 212. Fold P76 into it.** Issue 212 is open (ready-for-agent, ledger line 228 `todo`, no Comments beyond the migration note). It already owns the empty-state half, with the same lines and the same test. The header half contradicts one sentence in 212 ("The header count keeps meaning 'tags in the vault' and does not change") and one non-goal ("the header's styling"). Amending 212 keeps its number, its ledger row and its links: 205's Notes already say "Issue 212 rewrites the `TagsView.svelte` empty branch", and that stays true. A new ticket would orphan those links.
2. **Y should stay `totalTagCount`.** The scout leaves it open. `get_all_tags_v2` → `lookup_all_tags` (`src-tauri/src/vault/index.rs:1039-1063`) returns one entry per case-insensitive tag. `buildTagTree` folds case the same way (`tags.logic.ts:18-19`). So `entries.length` equals the number of tree nodes with `count > 0`, and X (those nodes in `displayedTree`) is never larger than Y. Keeping `totalTagCount` also keeps 212's criterion "`tags.service.test.ts` totals are unchanged". `totalTagCount` has no consumer other than `TagsView.svelte:54`.
3. **The two "Show all" buttons collide.** In the filtered-empty case, P76's header ("Showing 0 of Y tags · Show all") and its empty state ("All Y tags are used fewer than 10 times. Show all") both render a Show all control. Recommendation: the header link appears only when `0 < X < Y`, and the body carries the button when X is 0.
4. **T3 is not blocked by Issue 159.** 159's fix keeps the keyed rows mounted (no `isLoading` swap) and does not need to touch `TagItem.svelte`. Its "expanded survives a refresh" criterion follows from staying mounted. T3 changes only classes and labels, not `open`. Only T4, whose `forceOpen` touches `open`, should wait for 159, and only in case 159 hoists that state.
5. **The chevron label should be static.** bits-ui's Collapsible trigger already emits `aria-expanded` (`node_modules/bits-ui/dist/bits/collapsible/collapsible.svelte.js:174`). A label that also flips between "Expand" and "Collapse" says the state twice. Use one stable name, such as "Subtags of {fullPath}", and let `aria-expanded` carry the state. A `title` is fine for the hover tooltip the prototype shows.
6. **`TagColorPicker` has a single caller** (`TagItem.svelte:8`). A required `label` prop is therefore safe and needs no migration.
7. **Missed overlap: P30 / Issue 159.** The sibling cluster `scout-background-refresh.md` (P30) proposes folding a delayed header spinner into 159. That edits the same header block at `TagsView.svelte:52-56` that P76 rewrites. The sequencing 159 → 212 has to hold whichever cluster amends 159.
8. **Usage weighs on T4.** `.scratch/open-itens/research/deep-dive-2026-11-12/validate-s7+s8.md:43` records that "The Tags tab is not on the owner's daily list". The filter box (M) is the only non-small piece of this cluster. It is real, but it is the first candidate to cut if the owner wants only the small ones. The owner named "tags" among the small, nice items, so it stays as a ticket, marked needs-triage until the owner answers its questions.
9. **Help page for T4.** The filter box adds a control, so `07-sidebar-panels.md` "Controls at the top" (around line 113) gets a bullet. The scout did not list this.

Checked with no overlap found: 160 (tag click → search mode; `open-search.service.ts`), 153 and 012 (other regions of `EditorTabs.svelte`), 025 and 214 (mention `EditorTabs` incidentally), 152 and 045 (tag grammar, search). The resolved `tasks-view-ux` Issues touch Tasks only. 205 is blocked by 204 (ready-for-agent, not done) and reconciles with 212 by its own Notes. No resolved Issue fixed any part of P76, P157 or P187.

## Ticket breakdown

Order: 159 (existing) → 212 amended → T4. T3 and T2 can run any time, and T3 must land before T4.

### Fold P76 into `.scratch/open-itens/issues/212-tags-view-explains-when-rare-tag-filter.md` (S)

Amend 212:
- **Header:** with `hideRareTags` on and `0 < X < Y`, the header reads "Showing X of Y tags" with an inline "Show all" button that calls `toggleFilter()`. Otherwise it reads "Y tag(s)" as today. X = the number of nodes with `count > 0` in `displayedTree`, from a new pure helper in `tags.logic.ts`. A rare parent kept only to hold a popular child counts, because it is a visible row. Pure containers (`count === 0`) do not count. Y = `tagsStore.totalTagCount`.
- **Empty state:** "All Y tags are used fewer than 10 times." plus the "Show all tags" button (P76 wording, which carries the number the header shows). 212's other branch, "No tags found", stays.
- **Copy to remove from 212:** the sentence "The header count keeps meaning 'tags in the vault' and does not change" and the "header's styling" non-goal.
- **Help:** rewrite `help/documentation/07-sidebar-panels.md:107-109` to describe "Showing X of Y".
- **Blocked by:** 159 (same lines `:52-56` and `:79-82`; sequencing only).
- **Toolbar row:** the inline button goes inside the count `<span>`. No `h-*`, `p*-*`, `gap-*` or `border-*` utilities on the `.pane-toolbar` row (`pane-toolbar.test.ts:30`).

Added acceptance criteria:
- [ ] Failing test first in `TagsView.test.ts`: real `tagsStore` with one tag at count 12 and one at count 3, `totalTagCount` 2, filter on. The header reads "Showing 1 of 2 tags" and has a Show all button. Clicking it sets `hideRareTags` false, lists both tags, and the header reads "2 tags".
- [ ] With the filter off, or with no tag hidden, the header reads "N tags" with no button.
- [ ] Filtered-empty case: the body reads "All 3 tags are used fewer than 10 times." with one Show all button, and the header shows no second one.
- [ ] Helper unit tests in `tags.logic.test.ts`: empty tree is 0, pure container not counted, a rare parent kept for a popular child counted.
- [ ] `pane-toolbar.test.ts`, `tags.service.test.ts` and the existing "No tags found" case stay green.

### T2 (new): The Tags tab shows a tag icon (P187, S)

`EditorTabs.svelte`: import `@lucide/svelte/icons/tag`, and add `{:else if tab.fileType === 'tags'}` with `size-3.5 shrink-0 text-muted-foreground`, before the `tabIcon` branch.
- [ ] Failing test first in `src/tests/lib/core/markdown-editor/EditorTabs.test.ts`: mount with a `fileType: 'tags'` tab at `TAGS_VIRTUAL_PATH`. Its svg class contains `lucide-tag`, and no `lucide-file-text` appears in that tab (precedent: `mod-rail-icon.test.ts:77`).
- [ ] A note tab still gets the `tabIcon` snippet or `FileText`, unchanged.
- Gate: `pnpm check` + `pnpm vitest run`.
- **Blocked by:** none.

### T3 (new): Tags rows align and their controls have names (P157 part 1, S)

`TagItem.svelte`: the leaf row gets a fixed 20px slot where parents have the chevron. Its name and count offsets match the parent row (no 2px name offset, the same right inset). The chevron trigger gets a static `aria-label` and `title` naming the tag. `TagColorPicker.svelte`: a required `label` prop applied to `Popover.Trigger` as `aria-label` and `title` ("Color of {fullPath}"). The swatches are untouched (review P88).
- [ ] Failing test first: new `src/tests/lib/features/tags/TagItem.test.ts` (jsdom, real `settingsStore`, no mocks of stores). A parent and a leaf rendered as siblings have the same leading structure before the dot (chevron trigger vs a `w-5` slot, the same width class) and the same name and count classes. jsdom has no layout, so assert classes and DOM order, not pixels.
- [ ] The chevron has an accessible name containing the tag path, and its `aria-expanded` toggles false → true on click.
- [ ] The colour-dot trigger of every row has an accessible name containing the tag path.
- [ ] `TagsView.test.ts` tag click still opens Search with `tag:work`.
- Gate: `pnpm check` + `pnpm vitest run`.
- **Blocked by:** none.

### T4 (new): The Tags view has a filter box (P157 part 2, M, needs-triage until the owner answers)

- A "Filter tags" input (`Input`, `h-7 text-xs`, `aria-label`, precedent `RailListSearch.svelte`) in the toolbar.
- A pure `filterTagTreeByQuery(nodes, query)` in `tags.logic.ts`: case-insensitive substring on `fullPath`, leading `#` stripped. It keeps the ancestors of a match and the whole subtree of a matching node, and returns the set of ancestor paths to force open.
- `TagItem` gets a `forceOpen` prop OR-ed with its local `open`. Clearing the query restores the user's own expansion.
- While a query is active, the rare filter is bypassed (recommended). Otherwise "No tags match" would appear for a tag that exists, which is the very contradiction P76 fixes.
- A third empty branch: "No tags match '{q}'".
- Query state: local `$state` in `TagsView` (recommended; it is ephemeral, the view remounts per tab open) or a `tagsStore` field with `reset()` and a store test.
- Help: a bullet in `07-sidebar-panels.md` "Controls at the top".

Acceptance criteria:
- [ ] Failing test first, `tags.logic.test.ts`: query "pro" on a tree with `work/projects`, `projects`, `home` keeps the first two and their ancestors, and the forced-open set holds `work`. "#Work" matches `work`. An empty query returns the tree unchanged.
- [ ] `TagsView.test.ts`: typing a query that matches a rare tag (count 3, filter on) shows it. A query with no match shows "No tags match". Clearing the query restores the filtered list and the header.
- [ ] A matching nested tag is visible without clicking its parent's chevron (forced open). After the query is cleared, the parent returns to its previous open state.
- [ ] `pane-toolbar.test.ts` stays green.
- Gate: `pnpm check` + `pnpm vitest run`.
- **Blocked by:** 212 (empty branch and header), T3 (`TagItem.svelte`), 159 (in case it hoists `open`).

## Owner questions

- **212 / P76:** the header changes from "unfiltered total" to "Showing X of Y" (the opposite of the help page and 212). OK? (Recommended: yes.) Should the header link hide when X is 0? (Recommended: yes, because the body carries the button.)
- **T2:** `Tag` or `Hash`? (Recommended: `Tag`. `Hash` already marks an uncoloured tag dot inside the view.)
- **T4:**
  - Is it worth building, given that the Tags tab is not on the daily list?
  - Should a query bypass the rare filter? (Recommended: yes.)
  - Substring on the full path? (Recommended: yes.)
  - Local state or store? (Recommended: local.)

## Not checked

- I did not run the app or the tests, so the pixel offsets come from reading Tailwind classes.
- I did not re-verify review P88 or P21; their names come from the scout.
