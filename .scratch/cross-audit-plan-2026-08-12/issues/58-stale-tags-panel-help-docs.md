# Issue 58: Help docs still describe Tags as a right-sidebar panel with vault-wide tag tinting

Status: ready-for-agent
Phase: unplanned
Source: reviewer follow-up surfaced during the cross-audit run, verified 2026-08-19 by triage

Blocked by: none

Note on anchors: every reference below is by symbol or by quoted doc sentence. The one sha-pinned
detail is the `03-editor.md` blank-line defect (line 67 as of `5e0b8bd3`), which will drift; find it
by the `| Tags (virtual) | Tags view |` row instead.

## What

The claim was "the Tags panel help documentation is stale". It is real, and the surface it names
exists: `help/documentation/07-sidebar-panels.md` section `## Tags`, with three satellite mentions in
`06-search-and-navigation.md`, `19-settings.md` and `03-editor.md`. There is no in-app help viewer -
`grep -rn "help/documentation" src/ src-tauri/ scripts/` returns exactly one hit, a code comment in
`collection/expression/evaluator.ts`, so these files are read-on-disk / on-GitHub docs only.

Two independent behavioural claims in those docs are false against current code, each traceable to a
specific commit that changed the code and left the prose behind.

### Mismatch 1: Tags is documented as a right-sidebar panel. It is a virtual tab.

Causal chain:

- `features/tags/TagsView.svelte` has exactly one importer, `core/markdown-editor/EditorView.svelte`,
  which renders it under the `isTagsTab` branch of the virtual-tab chain.
- `core/layout/AppShell.svelte` mounts the right sidebar and imports `PropertiesView`,
  `TableOfContentsPanel`, `BacklinksPanel`, `OutgoingLinksPanel`. No tags import.
- The only way in is `tags.service.ts::toggleTagsTab`, reached from
  `command-palette.service.ts` command id `tags:toggle`, label `Toggle Tags View`, and it pushes a
  tab at `editor.logic.ts::TAGS_VIRTUAL_PATH`. There is no keybinding and no settings toggle.
- History: `bf55080c feat(tags): move tags from right sidebar to virtual tab` (2026-05-25) moved it;
  `4e304adf refactor(tags): delete the orphaned TagsPanel and its tagsVisible flag` (2026-08-18)
  deleted the leftover `TagsPanel.svelte` and removed `layout.tagsVisible` from
  `settings.types.ts` + `settings.store.svelte.ts`. So the "toggle it in Settings > Sidebar" route
  the doc implies cannot exist even as a dead flag.

Stale prose:

| file | sentence | why it is false |
|---|---|---|
| `06-search-and-navigation.md` | "Clicking a tag in the Tags panel (right sidebar) automatically sets the search query to `tag:tagname`" | `TagsView.svelte` is never mounted in `AppShell.svelte`'s right sidebar |
| `07-sidebar-panels.md` (H1 + intro) | "Learn about the right sidebar panels: Backlinks, Outgoing Links, Tags, Properties, and Calendar." | Tags is not a right-sidebar panel |
| `07-sidebar-panels.md` (`## Opening and Closing the Sidebar`) | "Press **Cmd+B** to toggle the entire right sidebar" + "Each individual panel can be shown or hidden in **Settings > Sidebar**" | true for the four real panels, false for Tags: `Cmd+B` flips `layout.rightSidebarVisible` in `global-keybindings.ts` and never touches the Tags tab; `layout.tagsVisible` no longer exists |
| `19-settings.md` `## Tag Colors` | "shown in the Tags sidebar" | same |

The doc half-corrects itself in one paragraph ("You can **also** open Tags as a **dedicated virtual
tab** ... the tags UI is only ever shown here, not docked in a sidebar"), added in `2c77df70`
(2026-05-26) one day after the move. That parenthetical is the only accurate placement statement in
the whole file, and it directly contradicts the four sentences above it. Everything inside that
paragraph checks out: `Cmd+P` is the command palette (`global-keybindings.ts`, `key: 'p', meta: true`
-> `commandPaletteStore.toggle()`), the label is exactly `Toggle Tags View`, and the Sort and
Hide-rare-tags controls do behave as described in the tab.

### Mismatch 2: tag colors are documented as applying to inline `#tags` and editor decorations. They do not.

Causal chain:

- `features/tags/tag-colors.logic.ts::getTagColor` has exactly two importers today:
  `features/tags/TagItem.svelte` (the dot in the Tags tab) and
  `features/properties/PropertyField.svelte` (the `Tag` icon next to a frontmatter `tags` value in
  the Properties panel).
- The note body is not one of them. `live-preview/inline/handlers/` contains autolink,
  block-reference, blockquote, heading, highlight, inline-comment, mark, markdown-link and
  wikilink handlers plus `simple-widget-handlers.ts`. There is no hashtag handler, and
  `grep -rln "tagColors\|getTagColor" src/lib/core/markdown-editor/extensions/` is empty.
- `live-preview/plugins/frontmatter-field.ts` replaces every frontmatter line with an invisible
  `Decoration.replace`, so there is no in-editor frontmatter surface left to tint either.
- History: `911b2c7e refactor(editor): hide frontmatter in live preview, remove widget` (2026-05-25)
  deleted `FrontmatterWidget`, which held the three `getTagColor` call sites that made the sentence
  true. `git log -S"getTagColor" -- src/` returns only `b7358e71` (initial) and `911b2c7e`.

Stale prose:

| file | sentence | reality |
|---|---|---|
| `07-sidebar-panels.md` `### Tag colors` | "apply everywhere the tag is rendered: the Tags panel, inline `#tags` in notes, and editor decorations" | applies in `TagItem.svelte` and `PropertyField.svelte` only |
| `19-settings.md` `## Tag Colors` | "(and inline `#tags` in notes)" | same |

Repro path, user-visible: open the Tags tab (`Cmd+P` -> `Toggle Tags View`), click the dot next to
`work`, pick a preset. Open any note whose body contains `#work`. The hashtag renders with no tint in
either live preview or source mode. The colour appears only on the dot in the Tags tab and, if the
note declares `tags: [work]` in frontmatter, on the small `Tag` icon in the Properties panel.

### Partially confirmed: "shows all `#tags` used across your entire vault"

`tags.store.svelte.ts` initialises `hideRareTags = $state(true)` and `TagsView.svelte` sets
`MIN_COUNT_THRESHOLD = 10`, feeding `tags.logic.ts::filterTagTree`, which keeps a node only when
`node.count >= minCount` or it has a surviving child. So a fresh launch hides every tag used fewer
than 10 times, while the header prints `tagsStore.totalTagCount`, the unfiltered unique count set by
`tags.service.ts::buildTagIndex`. Header and tree disagree whenever the filter is on, which is by
default. This is an omission, not staleness: `git log -S"hideRareTags = $state"` traces the `true`
default back to `b7358e71`, the initial commit. Fixing it is one clause, so it is in scope, but it is
not evidence for the "no longer has" framing.

### Refuted parts of the original claim

- "the Tags panel no longer has [the behaviour]" is wrong for most of the section. Sort A-Z vs by
  count (`updateTagSort` -> `sortTagTree`), the 10-use rare-tag threshold, `tag:tagname` search on
  click (`handleTagClick` -> `searchStore.setQuery`/`setOpen`, and `SearchPanel` is mounted in
  `AppShell.svelte` behind `searchStore.isOpen`), the hierarchical tree from `/` segments
  (`buildTagTree`), the colour picker presets / custom `<input type="color">` / `No color` `X` swatch
  (`TagColorPicker.svelte`), and the `tagColors.colors` storage key
  (`settings.store.svelte.ts::updateTagColors`) are all accurate. Only placement and colour reach are
  stale.
- The claim implies one doc. It is four files.

### Precision defects found while verifying (in scope, cheap)

- "A small colored dot sits to the left of each tag name": `TagColorDot.svelte` renders a colored
  circle only when a colour is assigned, otherwise a lucide `Hash` icon.
- "Pick one of the preset colors to tint the tag": it tints the dot. `TagItem.svelte` renders the
  label as `<span class="text-[14px] truncate">{node.segment}</span>` with no colour binding.
- "shows all `#tags`": `parsing.rs::extract_tags_strict` merges `extract_frontmatter_tags` with
  `extract_inline_tags`, so frontmatter `tags:` values appear in the tree even though they carry no
  `#`.
- `03-editor.md`: the `| Tags (virtual) | Tags view | All tags across your vault with counts |` row
  is separated from its table by a blank line, so it renders as a literal paragraph rather than a
  table row. Introduced by `2c77df70`.

### Explicitly out of scope, recorded so nobody re-files it

- `core/markdown-editor/MarkdownEditor.svelte` still carries an `$effect` reading
  `settingsStore.tagColors.colors` and dispatching `forceDecorationRebuild`, commented "Rebuild
  frontmatter widget when tag colors change". That widget was deleted in `911b2c7e`. It is dead
  reactive work on every tag-colour change. Removing it is a code change with its own tracing and
  gate, not part of a docs fix. File separately if wanted.
- `help/documentation/screenshots/` does not exist, so `![Tags panel ...](screenshots/tags.png)` is a
  broken link. `grep -rn "screenshots/" help/documentation/ | wc -l` reports 30 such references
  across the doc set. Repo-wide, not Tags-specific.
- `src/lib/core/settings/sections/GeneralSection.svelte` carries the same placement staleness on a
  `src/` surface: the `SettingItem` labelled "Right sidebar" has
  `description="Show the right sidebar (Properties, Backlinks, Tags)"`, which names Tags as a
  right-sidebar panel and omits Table of Contents and Outgoing Links. Same `bf55080c` drift as the
  help docs, but this issue's How forbids touching `src/`, and fixing a user-facing string there
  carries the full frontend gate (`pnpm check` + `pnpm vitest run` + `pnpm build`). File it
  separately; the placement staleness is therefore NOT docs-only.
- `07-sidebar-panels.md` also mis-files Calendar: the intro lists it as a right-sidebar panel while
  its own `## Calendar` section correctly says "The calendar is a left sidebar mode". Pre-existing,
  independent of Tags. Leave it.

## How

Docs only. No file under `src/` or `src-tauri/` changes.

Exact edits:

1. `help/documentation/07-sidebar-panels.md`
   - Intro line: drop `Tags` from the list of right sidebar panels. Do not touch `Calendar` in the
     same sentence (see out-of-scope above).
   - `## Tags`: restate the placement once, up front, instead of leaving it to a parenthetical seven
     paragraphs down. Either move the whole `## Tags` section out of this file into its own doc and
     leave a one-line pointer, or keep it here with an explicit opening sentence that Tags is a
     virtual tab opened from the Command Palette (`Cmd+P` -> `Toggle Tags View`) and is never docked
     in a sidebar. Pick one; do not ship both the "also open it as a tab" framing and the new one.
   - Rewrite the "shows all `#tags`" opening so it states that the rare-tag filter is on by default
     (tags used fewer than 10 times are hidden until the filter icon is toggled) and that frontmatter
     `tags:` values are included alongside inline `#tags`.
   - `### Tag colors`: replace "apply everywhere the tag is rendered: the Tags panel, inline `#tags`
     in notes, and editor decorations" with the two real surfaces, the dot in the Tags tab and the
     tag icon in the Properties panel. Correct "a small colored dot sits to the left" to mention the
     `#` fallback when no colour is assigned, and "tint the tag" to "tint the tag's dot".
2. `help/documentation/06-search-and-navigation.md`: delete `(right sidebar)` from "Clicking a tag in
   the Tags panel (right sidebar)" and name the Tags tab instead.
3. `help/documentation/19-settings.md` `## Tag Colors`: "Tags sidebar" -> the Tags tab; drop "(and
   inline `#tags` in notes)" or replace it with the Properties panel. Keep the
   `07-sidebar-panels.md#tag-colors` cross-link working; if the `## Tags` section moves to a new file
   in step 1, repoint this link and the `README.md` row together.
4. `help/documentation/03-editor.md`: delete the stray blank line above the `| Tags (virtual) |` row
   so it rejoins its table.
5. `help/documentation/04-markdown.md`: "also feeds the Tags panel" -> Tags tab, for naming
   consistency. One word.
6. `help/documentation/README.md`: row 07 summary currently reads "Backlinks, outgoing links, tags,
   properties, calendar". Update only if step 1 moved the section.

Red-first test strategy: **there is none, and inventing one is out of scope.** No test reads these
files (`grep -rn "help/documentation" src/tests e2e` is empty), there is no in-app help viewer, and a
bespoke docs-lint suite would be new machinery for a one-off prose fix. Verification is a grep
contract instead, run before and after:

```bash
grep -rn -i -e "tags panel" -e "tags sidebar" -e "right sidebar" help/documentation/07-sidebar-panels.md help/documentation/06-search-and-navigation.md help/documentation/19-settings.md
grep -rn "inline \`#tags\`" help/documentation/
grep -rln "getTagColor" src/lib
grep -rn "TagsView" src/lib --include=*.svelte
```

The last two are the freshness check: if `getTagColor` ever gains a third importer, or `TagsView`
ever gains a second mount point, the replacement prose is wrong again. Confirm both lists match what
this issue records BEFORE writing the new sentences, so the fix does not go stale in the other
direction. The side channel that could fake a good outcome here is the doc's own self-correcting
parenthetical: leaving it in place makes a skim-read of the diff look complete while the four
contradicting sentences above it survive. Read the rendered section end to end, not the diff hunks.

Must NOT change:

- Any file under `src/` or `src-tauri/`, including the dead `MarkdownEditor.svelte` `$effect`.
- The `## Calendar` section or the `Calendar` token in the intro list.
- The 30 broken `screenshots/` references, in this file or any other.
- The `### Controls at the top` bullets for Sort and Hide rare tags: verified accurate, leave the
  wording except for the default-state clause called for above.
- The `tag:tagname` search behaviour description, the colour picker description (presets, custom
  swatch, `No color`), and the `tagColors.colors` storage key: all verified accurate.

## Gate

- Docs-only surface. Nothing under `src/` or `src-tauri/` moves, so root CLAUDE.md rule 6 triggers no
  test command. The gate is the grep contract in `## How` plus a rendered read of the edited
  sections, and every relative link touched must still resolve.
- If the implementer widens scope into `MarkdownEditor.svelte` (they should not), the full frontend
  gate becomes mandatory: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue, verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

### 2026-08-19 - triage revision after adversarial review

One finding applied. Verdict unchanged: confirmed, low, ready-for-agent.

The out-of-scope inventory gained `core/settings/sections/GeneralSection.svelte`, whose
`SettingItem` labelled "Right sidebar" carries `description="Show the right sidebar (Properties,
Backlinks, Tags)"`. That is the same `bf55080c` placement staleness this issue documents for the
help docs, but on a `src/` surface the How forbids touching. Recorded so a reader of the closed
issue does not conclude the staleness was docs-only. The docs fix itself is unchanged.
