# Sweep s7: Phase 4 bugs (Issues 152 to 168, and 145 to 150)

Checked 2026-11-12 against HEAD `318b6e9b5`. Read-only: nothing run, no tests. "Verified" means I read the cited code at HEAD; "inferred" means reasoning about the owner's usage. Impact is for this owner (daily: editing and saving, tables, Quick Capture, .view rail views, meta-bind, Kanban, canvas; no external sync; graph, queryjs and themes are not in the daily list).

## Scope outcome

- 151 is done (ledger), skipped.
- 145 to 150 are features (usage telemetry storage, recorder, stats page, file-open counts, table and meta-bind counts, `ctx.http.fetch`). Confirmed: none describes a defect. 145 adds a table, repo and commands, 146 to 149 add call sites and a page, 150 widens a capability and adds a wrapper. All "todo", none rated here.
- 152 to 168: all still present at HEAD (none fixed). One is partly overtaken (152, see notes).
- None of them is high impact for this owner. Two are the best medium candidates (161, 159).

## Table

| # | Title (short) | Still present? | Impact (trigger) | Complexity | Risk | Owner decision open? |
|---|---|---|---|---|---|---|
| 152 | Tag may start with a digit / carry emoji | Yes (Rust scanner and 3 TS copies still reject), but one criterion already done | Medium: `#1on1`, `#2024-goals`, `#ideas` + emoji are silently not tags (no Tags panel entry, no pill, no search). Hits only if the owner types such tags | M | Medium (Rust tag scanner in `parsing.rs`, live-preview tag handler, index cache version bump) | No (decided 2026-11-06). Still blocked by 040 and 048 (kanban, todo) |
| 153 | Tab strip overflow cue and hide `.md` | Yes | Low: cosmetic; active tab already scrolls into view | M | Low | No. It is a feature request, no defect |
| 154 | Inline title above the note | Yes (not built) | Low: feature, nothing broken (P3) | L | High (`MarkdownEditor.svelte` scroll restore and click positions, possible block widget at pos 0 under live-preview rules) | No (decisions recorded), but the placement is unproven |
| 155 | Leaving theme editor without Save keeps draft theme on the app | Yes | Low to medium: Settings > Appearance > edit/create theme, change a color, then Esc/X/Cmd+, or switch section: draft colors and dark/light mode stay until relaunch | S | Low | No |
| 156 | Relationship picker arrow keys | Yes (narrowed to RelationshipSearch; Kanban half already fixed) | Low: picker is mouse-only (rows act on mousedown, so keyboard cannot select at all). Hits only with relation properties | S | Low | No |
| 157 | Settings > Update loses download state on close | Yes | Low: occasional flow; close Settings mid-download, come back, Check again starts a second download | M | Low (frontend; touches the updater flow only) | No |
| 158 | Image embed `\|300x200` applies width and height | Yes | Low to medium: documented form renders at natural size. Only when the owner writes WxH | S | Low to medium (`widgets.ts` + `wikilink-embed-plugin.ts`, live preview, but tiny and mirrors `ImageWidget`) | No |
| 159 | Tags view blanks and collapses on refresh | Yes | Medium if the owner uses the Tags tab: every open shows "Indexing tags..." (0.7 to 1.2 s at 4.5k notes, per the code comment) and every index refresh while the tab is open collapses all expanded tags | S | Low (TagsView, tags.service, tagsStore, all small) | No |
| 160 | Tag click in Semantic/Hybrid mode searches the literal `tag:x` | Yes | Low: needs the session search mode switched to Semantic or Hybrid first | S | Low | No |
| 161 | Fuzzy search misses words past the first 500 per letter | Yes | Medium: fuzzy is on by default; in a vault with thousands of distinct words per letter a typo ("meating") returns "No results" because the target is alphabetically beyond the 500 cap. Hits on each typo query | S | Low to medium (Rust search path only, no write path; check fts5vocab range support and query cost) | No |
| 162 | `file.inlinks` for dotted note names | Yes | Low: queryjs only, dotted names are uncommon, wrong counts on screen | M | Low | No |
| 163 | Vault open does not create placeholder templates in subfolders | Yes | Low: only empty placeholder templates, only on a vault that lacks `periodic-note/` or `quick-capture/` folders. The owner's existing vault likely has them | S | Low | No |
| 164 | Quick Switcher Create with `Projects/Idea` | Yes | Low to medium: Cmd+O create with a path whose folder does not exist shows "Failed to create file." and creates nothing. No data loss | S | Low (QuickSwitcher + existing recursive `create_folder`) | No |
| 165 | Graph: dragging a node pans instead | Yes | Low: graph not in the daily list | S (M with the second-opinion coordinate bug) | Low | No |
| 166 | Graph: Arrows toggle does not redraw once settled | Yes | Low: graph not in the daily list | S | Low | No |
| 167 | Pasting an HTML table keeps cell links | Not built; depends on 055 (todo) | Low to medium: owner uses tables, but only matters when pasting web/Jira/Notion tables with links | M | Low to medium (paste handlers, not decoration builders) | No |
| 168 | Block embed matches `^id` as a substring | Yes | Low: app-generated IDs are 6 random chars, so a wrong match needs an earlier line containing the same `^id` (for example a self link) | S | Low (pure `.logic.ts`) | No |

## Evidence (path:line at HEAD)

Verified in code:

- 152: `src-tauri/src/vault/parsing.rs:469-473` first char must be alphabetic or `_`; `:477` continuation set; `src/lib/utils/tag-extraction.ts:2`; `src/lib/plugins/kanban/kanban.logic.ts:762` and `:815`; `src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:22,25` (another copy the Issue does not list, autocomplete is out of its scope). `INDEX_SCHEMA_VERSION` is now 7 (`src-tauri/src/vault/index_cache.rs:18`), the Issue says 5. The task-metadata criterion is already done by tasks-view-ux Issue 075 (commit `015f8c18f`): `parsing.rs:1442-1443,1938-1940` task tags now use `scan_inline_tags`. So one Rust scanner change now covers the index and task tags.
- 153: `src/lib/core/markdown-editor/EditorTabs.svelte:45` (overflow-x-auto, no fade), `:85` renders `{tab.name}`, `:40` scrollIntoView.
- 155: no `onDestroy` in `ThemeEditor.svelte` or `AppearanceSection.svelte`; `ThemeEditor.svelte:67,77,121` applyDraft; `AppearanceSection.svelte:77-141` are the only `applyActiveTheme` calls.
- 156: `src/lib/features/properties/RelationshipSearch.svelte:32-37` handleKeydown handles Escape only; rows use `onmousedown` only.
- 157: `UpdateSection.svelte:94-99` component-local `$state`; `:178` `download_and_install`.
- 158: `wikilink-embed-plugin.ts:19-23` `Number('300x200')` is NaN so parseWidth returns null; `widgets.ts:561-565` `WikilinkImageEmbedWidget` has only `width`; `ImageWidget` already has height (`widgets.ts:138,152-153,180`).
- 159: `tags.service.ts:27` unconditional `setLoading(true)`; `TagsView.svelte:41-46` effect on `vaultIndexVersion`; `:79-80` list replaced by "Indexing tags..."; `TagItem.svelte:19` local `open`.
- 160: `open-search.service.ts:11-15` sets query only, not mode.
- 161: `src-tauri/src/search/fuzzy.rs:55-58` pattern `<first char>%`, cap 500; `src-tauri/src/db/fts_repo.rs:258` `SELECT DISTINCT term ... LIKE ?1 LIMIT ?2`.
- 162: `src/lib/plugins/queryjs/queryjs.logic.ts:12-17` getBasename strips after last dot; `:53` keys link targets with it, `:76` looks up the file basename. 'Dr. Silva' target keys as 'dr', file key is 'dr. silva'.
- 163: `src/lib/plugins/templates/templates.service.ts:100-107` create_folder for the root only; `:111-121` `writeTextFile` with no parent mkdir; `:122-124` one catch around the whole loop.
- 164: `QuickSwitcher.svelte:40-58` raw query to `createFile`; `src/lib/core/filesystem/fs.service.ts:198-208` builds `${parentPath}/${uniqueName}`; `src-tauri/src/commands/vault.rs:1136-1147` `create_note` has no parent creation; bare catch shows "Failed to create file.".
- 165: `GraphView.svelte:299-305` zoom registered before `:308` drag on the same canvas (d3-zoom stops propagation; claim from the Issue, not re-read in node_modules).
- 166: `GraphView.svelte:165` `showArrows` read only inside `render()`; the effect at `:375-385` tracks mode, filters, centerPath only.
- 168: `src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:40-50` `line.includes(marker)` and a loose strip regex. Block IDs are 6 random chars (`copy-block-link.logic.ts:59`).

Inference (not verified by running anything):

- 161: with a real 4.5k-note vault the alphabetical 500 cap is hit for most letters, so fuzzy rarely reaches the target. The vault size comes from the code comment at `tags.service.ts:101-105`; I did not count the owner's vocabulary.
- 159: how often the owner opens the Tags tab is unknown.
- 167: not re-checked beyond `paste-html-link.logic.ts` (no table handling in `BLOCK_TAGS` beyond `TABLE`/`TR`, line 25) and 055 still being todo.

## Recommended to join the queue

1. **161** fuzzy search cap. Rust only, one SQL range bound plus a length window, no write path, a failing test already specified (`search_fuzzy_test.rs`). It is the one bug here where a default-on feature silently fails in a realistic vault. Open point: confirm fts5vocab accepts a term range constraint (the Issue says LIKE gives it no bound) and keep the Rust gate (cargo test, clippy).
2. **159** Tags view refresh. Frontend only, a small gate on `isLoading` plus whether a tree already exists. Worth it only if the owner opens the Tags tab; ask once.

Optional cheap riders, not for the main queue:

- **158** right after 062 (same series group, `widgets.ts`), so the file is already open and tested; S, but it only matters if the owner writes `|WxH`.
- **155** (S, low risk, frontend) if themes are touched at all.
- **164** (S, low risk) if the owner creates notes from Cmd+O with paths.

Not recommended now:

- 152: medium impact, and still blocked by 040 and 048 (kanban, deferred). Its only reason to wait is merge conflicts in `kanban.logic.ts`, which is not touched by any queued Issue. Owner decision needed: drop that blocker, or keep it deferred. Scope shrank (task-metadata part done by 075, cache version is now 7).
- 154 (L, high risk, feature), 153 (feature), 156, 157, 160, 162, 163, 165, 166, 167, 168: low impact for this owner's daily use; leave in Phase 4.

## Already fixed

None of 152 to 168. Partly overtaken: 152 (task-metadata tag criterion done by tasks-view-ux 075; `INDEX_SCHEMA_VERSION` is 7, not 5) and 156 (Kanban picker half was already fixed at audit time). Stale text to correct when promoted: 156 body still says to rebuild both pickers on Command.

## Not checked

- Did not read d3-zoom in node_modules for 165, nor test fts5vocab range support for 161.
- Did not ask or measure which of Tags tab, Quick Switcher create-with-path, WxH images or theme editing the owner actually uses; impact ratings for those are inference.
