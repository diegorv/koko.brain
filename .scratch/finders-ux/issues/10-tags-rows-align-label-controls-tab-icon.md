# 10: Tags rows align leaves with parents, name their chevron and colour controls, and the Tags tab shows a tag icon

**Origin:** design review 2026-11-17, proposals P157 and P187 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/finders-search-tags-graph.html`, research `.scratch/finders-ux/research/verdict-tags.md` (tickets T2 and T3) and `.scratch/finders-ux/research/breakdown.md` (08 and 09). P157's filter box is 11.

**What to build:**

1. **Leaf alignment.** In `src/lib/features/tags/TagItem.svelte` the leaf row (`:56`) gets a fixed 20px leading slot (for example `w-5 shrink-0`) matching the parent's chevron trigger (`:30`, `p-1` plus `size-3`). Name and count offsets match the parent row: today, with the dot aligned, the name is still 2px off (40 vs 42) and the count sits 4px from the right edge in parents and 8px in leaves.
2. **Chevron name.** The chevron `Collapsible.Trigger` (`:30-32`) gets a static `aria-label` and `title` naming the tag path, for example "Subtags of {fullPath}". bits-ui already emits `aria-expanded` (`node_modules/bits-ui/dist/bits/collapsible/collapsible.svelte.js:174`), so the label does not flip between Expand and Collapse.
3. **Colour-dot name.** `TagColorPicker.svelte` (one caller, `TagItem`) gets a required `label` prop applied to its `Popover.Trigger` (`:32`) as `aria-label` and `title`, for example "Color of {fullPath}". The swatch internals stay untouched (review P88). The local `open` state of `TagItem` is unchanged.
4. **Tab icon.** In `src/lib/core/markdown-editor/EditorTabs.svelte`, import `@lucide/svelte/icons/tag` and add an `{:else if tab.fileType === 'tags'}` branch with `size-3.5 shrink-0 text-muted-foreground`, before the `tabIcon` snippet branch (`:69-83`). No rail navigator.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`

- [x] Failing test first: a new `src/tests/lib/features/tags/TagItem.test.ts` (jsdom, real `settingsStore`, no store mocks). A parent and a leaf rendered as siblings have the same-width leading element before the dot and the same name and count classes (assert classes and DOM order, not pixels; jsdom has no layout).
- [x] The chevron trigger has an accessible name containing the tag path, and its `aria-expanded` goes from false to true on click while the name stays the same.
- [x] Every row's colour-dot trigger has an accessible name containing the tag path.
- [x] `TagsView.test.ts`: a tag click still opens Search with `tag:work`.
- [x] Failing test first, `src/tests/lib/core/markdown-editor/EditorTabs.test.ts`: a tab with `fileType: 'tags'` at `TAGS_VIRTUAL_PATH` renders an svg whose class contains `lucide-tag`, and no `lucide-file-text` in that tab (precedent `src/tests/lib/plugins/mods/mod-rail-icon.test.ts:77`).
- [x] A markdown tab still renders through the `tabIcon` snippet or FileText, unchanged.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P157.** The Tags tree has no filter box, tiny targets and misaligned leaves: there is no search, the chevron is unlabelled, and leaf dots sit 12px off from parent dots. A filter that matches full paths and expands matching parents, a fixed chevron slot on leaves, and labels on the chevron and dot.
- **P187.** Tags is a full tab that only hands off to Search, and it uses the generic note icon. Give the Tags tab its own icon (lucide Tag or Hash). No rail navigator.

## Problem

Leaf tag dots sit 12px left of parent dots, so the tree reads as misaligned, and the name and count offsets differ too. The chevron and the colour dot have no accessible name. The Tags tab shows FileText (or whatever a user file-icon rule matches on `__virtual__/tags`), so it looks like a note tab.

## Evidence

Checked at `bb57e6165`.

- `src/lib/features/tags/TagItem.svelte:29-32`: parent row, chevron trigger `p-1` with a `size-3` icon, no label; `:39-45` parent name button `px-1 py-1`; `:56` leaf row `px-2 py-1` with no leading slot; `:63-68` leaf name button.
- `src/lib/features/tags/TagColorPicker.svelte:32`: `Popover.Trigger` with no name. Its only caller is `TagItem.svelte:8`, so a required prop needs no migration.
- `src/lib/core/markdown-editor/EditorTabs.svelte:69-83`: branches for tasks, graph, canvas, kanban and event-calendar, no `tags` branch. `fileType: 'tags'` is set at `src/lib/features/tags/tags.service.ts:136` and otherwise falls to `src/lib/app/EditorView.svelte` `fileTabIcon`.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided: the tab icon is lucide Tag (Hash already marks an uncoloured tag dot in the view); the chevron label is static and `aria-expanded` carries the state.
- 2026-11-17, deliver (branch `issue/10-tags-rows-align-label-controls-tab-icon`): leaf tag rows get a `w-5` leading slot and the parent row's name and count classes, so dots, names and counts line up; the chevron trigger is named "Subtags of <path>" (state in `aria-expanded`) and every colour-dot trigger "Color of <path>"; the Tags tab renders the lucide Tag icon. Tests: `pnpm check` exit 0; full `pnpm vitest run` exit 0, 645 files, 17227 passed, 54 skipped, 1 todo. Review round 1: APPROVED with three nits, none needing a code change (see `work/10/review.md` Resolution).
