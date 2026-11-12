# Sweep s3-phase2-b: Phase 2 Issues 050 to 066

Checked at HEAD afc0a9df8 (2026-11-12). Scope: 17 Issues, all ledger status `todo` (none done or wontfix). Read-only sweep: facts below were verified by reading the cited code, no test or app was run. Inference is marked as such.

Result: all 17 are still present at HEAD. None looks already fixed. Two Issue texts have stale paths (see notes on 054 and 059).

## Table

| # | Claim at HEAD | Impact for this owner (trigger) | Cx | Risk | Owner decision open |
|---|---|---|---|---|---|
| 050 | Present. FileNode.svelte:40-44 reads the whole file, :82-83 renders it with `renderCanvasMarkdown` (canvas-markdown.logic.ts:14-18, marked only). No frontmatter strip. | Medium. Any typed/tagged note placed on a canvas previews raw YAML (owner's notes are typed). Cosmetic. Canvas: deferred group. | S | low | no |
| 051 | Present. CanvasInner.svelte:362-368 clones `node.data`; canvas.logic.ts:375-377 offsets `data.x/y`; nothing writes geometry into `data` (only `data: {...node}` at canvas.logic.ts:129 and color at CanvasInner.svelte:414). | Low-medium. Duplicate after drag/resize lands at the stale spot, possibly off screen. Canvas: deferred group. | S | low | no |
| 052 | Present. link-updater.service.ts:35-80 finds files only via `get_backlinks_v2`; no `.kanban` handling in the file. Owner already narrowed it to kanban only (canvas moved to 155). | Medium. Rename a note a kanban card links as `[[Note]]`, the card dangles. Owner uses kanban. Intact data, only a dangling link. | M | medium (rename write path, open dirty kanban tab sync, indexing-watcher rules) | no (scope set 2026-11-06) |
| 053 | Present. editor.hooks.ts:81-83 clears results on save; queryjs-block-widget.ts:243 reads `getVaultEntries()` (version-keyed memo); only bump is tauri-listeners.service.ts:268; nothing in `plugins/queryjs` reads `vaultIndexVersion`. | Low-medium. Edit then open a dashboard within 2 s keeps a stale result until another save. QueryJS is not on the owner's daily list. | M | medium (cache semantics ADR 0010, throttled refresh) | no |
| 054 | Present, but the feature was renamed: the file is now `src/lib/features/auto-organize/auto-organize.service.ts`; the observer (:200-206) skips only `isViewFile`, and nothing in the service or logic excludes `.kanban`/`.canvas` before `evaluateAndMove`. The `isMarkdownFile` check at auto-organize.logic.ts:857 only guards property writes. | Low-medium. Needs auto-organize enabled and a rule a board or canvas satisfies (folder, name or tag rule). File is moved intact. | S | low | maybe: is auto-organize on for this owner? Not known from the repo |
| 055 | Present. paste-html-link.logic.ts:90 builds `[${text}](${href})` unescaped; BLOCK_TAGS has no TD/TH. Scope already narrowed: escape brackets and return null for a fragment containing `<table>`. | Low-medium. Web paste with `[1]` anchors, or a web table with a linked cell (cells fuse). Visible and undoable. | S | low (pure `.logic.ts`) | no |
| 056 | Present. click-handler.ts:27-39 falls back to `textContent` and passes any scheme-less string to `openExternal`; rejection only reaches `reportError`. | Low. Rare link forms (reference link, email autolink, `[x](#h)`). Side effect: Sentry/log noise. | S | low | no |
| 057 | Present. search.service.ts:128-135 empty query returns before any `setSearching(false)`; the older call's `finally` (:271-274) is gated on `searchVersion === version`. | Low-medium. Clear the box while a slow (semantic/hybrid) search runs: panel shows "Searching..." until the next non-empty search. Self-heals. | S | low | no |
| 058 | Present. FormulaRow.svelte:29 still uses `validateFormulaExpression`, which only `parse()`s (formula.logic.ts:98-108). | Low. Typo in a function name in a `.view` formula gives an all-dash column. | S | low | no |
| 059 | Present. templates.service.ts:55-69 goes straight to `openOrCreateNote`; TemplatePicker.svelte:33-46 calls `reset()` before the call and toasts only on a throw. | Low. Needs a name collision. Opens the older note silently; no data lost. | S | low | no (picker may keep naming step open: small UX choice) |
| 060 | Present. kb-api.ts:518-519 `value.map(String)` for arrays, `String(value)` otherwise. | Low. Polish; needs a QueryJS table with an array/DataArray of links in a cell. | S | low | no |
| 061 | Present, all three parts. Fence: fenced-code-block.ts:58-61 takes the whole `CodeInfo`. Checkbox: widgets.ts:41-47 mousedown has no button or `isMacContextClick` check. TSV: paste-tsv-handler.ts:19-40 checks only `clipboardToMarkdownTable`. | Medium. (2) Right-click or Ctrl+click on an editor task checkbox toggles and autosaves it. (3) Tab-indented code pasted into a fence, or tab-indented list lines, becomes a pipe table (owner uses TSV/table paste and tab-indented editor). (1) `title="x"` fence attrs lost on a language switch. All undoable. | M (3 parts) | medium (live-preview widgets.ts, code-block-field, paste) | no |
| 062 | Present. widgets.ts:286-328 `renderCellContent` splits only on wikilinks; inline-markdown.ts:17 INLINE_RE has only code, `**`, `*`, `~~`. Already in the queue. | High. Tables are daily; links, `<br>` and `\|` (written by the app's own TSV paste) show as raw text. | M | medium (live preview) | no (decided 2026-11-06) |
| 063 | Present. widgets.ts:157-165 resolves only `file:` through the host; a scheme-less URL becomes `img.src` as is. The blocker (asset scope) is resolved at HEAD: tauri.conf.json:30-36 scope now lists `$HOME/kokobrain-vaults/**`. | Low-medium (inference). `![](assets/x.png)` form does not show. I found no code in the editor that inserts that form, so it hits mainly Obsidian-imported or hand-typed notes. | S | medium (live-preview widget; shares widgets.ts with 062) | no |
| 064 | Present. completion.ts:71-82 labels and inserts `nameWithoutExt` for every candidate. | Medium. `![[pho` + Enter inserts `![[photo]]`, which embeds as a note (binary text) instead of the image. Hit every time an image or PDF is picked from the popup. | S | low (wikilink completion, outside live-preview; no completion.ts test yet) | no |
| 065 | Present. CollectionCalendarView.svelte:36 `MAX_EVENTS_PER_CELL = 3`; `+N more` is a bare span (:161-165). | Low-medium. 4th+ note of a day is unreachable in a calendar `.view`; busy only on calendars over mtime or meeting notes. `.view` bugs-only rule applies, this is a real bug. | S-M | low | maybe (popover vs expand, small UX choice) |
| 066 | Present. `setIndexStats` only at search.service.ts:288, `setSemanticStats` only at :356, :398. | Low-medium. Status bar count frozen for the whole session after daily creates (daily note, Quick Capture). Cosmetic. | M (needs Rust count command or IPC change) | medium (Rust, shared search store; owner moved it out of first wave) | no |

## Recommend adding to the queue

Ranked by impact over complexity and risk. 062 is already queued.

1. 064 (wikilink autocomplete inserts the stem for a non-markdown file). Medium impact on a daily editor flow, S, low risk, isolated from live-preview rules; needs a new `completion.test.ts`. Cheapest real fix in the sweep.
2. 061, split: take part 2 (task checkbox ignores non-primary buttons, one guard line at widgets.ts:42) together with 062 because both edit `widgets.ts` (add 061 to the "run in series: widgets.ts" group). Parts 1 and 3 (fence info string, TSV paste in fences) are medium risk and can follow as a second pass; part 3 matters for an owner who pastes TSV and code.
3. 055 as already narrowed (escape `[` `]`, return null when the HTML holds a `<table>` so the TSV handler runs). S, pure logic, fixes fused-cell table pastes. Optional, medium-low impact.
4. 057 (one-line `setSearching(false)` on the empty-query branch). S, low risk, low-medium impact; fine as a filler.

Worth a note but not queue-worthy yet: 052 (kanban link rewrite). Real for a kanban user, but it touches the rename write path (M, medium risk), so keep it behind the queue's core items.

## Already fixed or obsolete

None. Details that changed since the Issues were written:
- 054: the feature folder is `auto-organize`, not `auto-move`; the Issue's service and test paths (`auto-move.service.ts`, `auto-move.service.test.ts`) no longer exist. Re-map before launching. Also it sits in the "run in series" group with 031, 079, 082 (same file).
- 063: its stated precondition (asset scope for `~/kokobrain-vaults`) is met at HEAD.
- 059: still matches, but `reset()` runs before the call (TemplatePicker.svelte:35), so "keep the naming step open" needs a reorder in the picker.

## Not checked

No test, build or app run; impact ratings are inference from the owner's stated usage (QueryJS, auto-organize and calendar `.view` usage are unknown). Evidence for 061 parts 1 and 3 and 063 was checked at the cited lines only, not traced to every caller.
