# Validation of sweeps s5 (076-090) and s6 (091-107)

Adversarial check at HEAD 318b6e9b5 (2026-11-12). Read-only: code read, nothing run. "Verified" = read at HEAD; "inferred" = reasoned from code, not executed.

Scope: every addition the two sweeps recommend (077, 080 as rider, 039, 098, 094 reduced), every "fixed / partly fixed / stale" claim (080 delete leg, 102, 105, 106, 096), and spot checks of low-rated Issues in daily features (081 meta-bind/Properties, 097 Quick Capture, 105 and 089 rename-while-editing, 094 folder lens, 098 .view tables).

## Confirmed additions

| Issue | Impact (owner) | Cx | Risk | Evidence (verified) |
|---|---|---|---|---|
| 039 canvas picked/dropped nodes fail to load | High for a daily canvas user: every file or image node added in the app shows "Could not load file" / broken image. Display only, no text lost, but the .canvas stores absolute paths | S | Low | CanvasFilePicker.svelte:21-24,61 passes `file.path` from `flattenFileTree` (file-entries.logic.ts:21, absolute tree paths); drop reads `text/plain` (CanvasInner.svelte:561), which FilesNavigator.svelte:256 and NoteRow.svelte:77 fill with the absolute path; `createFileNode`/`createImageNode` store it as is (canvas.logic.ts:353-372, CanvasInner.svelte:481-486,573-575); FileNode.svelte:40 and canvas-image.service.ts:33-34 prefix `vaultStore.path` again. Only fix in git log of these files is f37acb402 (flush), unrelated. |
| 077 rename rewrite touches code and skips self links | Low to medium. Silent byte change in notes that quote `[[Old]]` in code; self `[[Old#H]]` dangles. Only for notes with those patterns | S to M (the full criteria include a self-link service change and a toast, not just the logic) | Low | link-updater.logic.ts:87-119 one global regex, no fence/code-span skip; link-updater.service.ts:47 filters `oldPath`. Sources include code-block links because Rust `extract_outgoing_links` scans the whole content on purpose (parsing.rs:1063-1066), so a code-only mention is a backlink source. |
| 098 collection link() cells | Conditional. Zero unless the owner's `.view` files or collection blocks use `link()`; when they do, one click loads the href into the main webview (app gone, debounce-window edits lost) and also fires the row click | S | Low | CollectionTableView.svelte:55-56 `<tr onclick>`, :68 `<a href={value.href}>` with no `isSafeUrl`, no handler; evaluator.ts:426-429 builds href from any string; no `on_navigation` in src-tauri/src. `.view` tabs render CollectionView (EditorView.svelte:37,87-90). Inferred, not verified: tauri-plugin-opener's injected link handler only intercepts `target="_blank"` links (from memory, crate source is outside the repo), so a plain `<a>` navigates. No `link(` found in any `.view` in the repo; owner vault not checked. |
| 094, reduced scope | Low to medium. A click on a `.docx/.xlsx/.epub/.db` row in a folder lens opens it as text; one keystroke and autosave replaces the bytes with U+FFFD, unrecoverable | S to M | Medium (core open path, editor.service.ts serial group) | Folder lens lists "direct files of every kind" (lens.logic.ts:981-1005); NoteRow.svelte:71 calls `openFileInEditor`; only gate is the extension set at fs.logic.ts:95-104 (no docx/xlsx/epub/sqlite/db); `readTextFile` lossy decode at editor.service.ts:125. Objection to the sweep's "refuse on U+FFFD" variant: a valid UTF-8 note that already contains U+FFFD (pasted or earlier damage) would become unopenable. Use a fatal `TextDecoder` over the bytes instead, as the Issue's own fix sketch says. Queue after 028 in the editor.service.ts group, not ahead of it. |

## Rejected additions

- **080 as a standalone ticket: rejected.** Present (path-change.service.ts:198-202 awaits `updateLinksAfterRename` unguarded), but the only rejection inside it is `get_backlinks_v2`'s poisoned-lock error (commands/vault.rs:486-495); per-file work is in `Promise.allSettled` (link-updater.service.ts:49). Acceptable only as a one-line rider on another path-change.service.ts task, as the sweep says.

## Fixed / stale claims

| Issue | Claim | Verdict | Evidence |
|---|---|---|---|
| 080 | delete leg fixed by f618f44ce | Confirmed for the tree half: f618f44ce "perf: update the tree in place for app changes, no vault scan (Issue 09)"; delete now removes the node in place (path-change.service.ts:183) | |
| 102 | mostly stale | Confirmed: `refreshTree()` only runs when `movedNode` is null (path-change.service.ts:207-213), tree moved in place since f618f44ce. Not closable outright: the narrow window remains | |
| 105 | partly fixed (same-path saves) | Confirmed, but the sweep did not name the commit: 3df680423 "route every .view write through one tab-aware writer (Issue 03)" added `saveTails` (editor.service.ts:163-183). Retry stacking still present (:217-219 `setTimeout(saveDirtyTabs, ...)` with no handle) | |
| 106 | folder rename/move leg fixed | Confirmed: fc37b1370 "keep folder notes in search after rename or move (Issue 11)" introduced `rename_in_search_index` in path-change.service.ts:231-238 | |
| 096 | partly stale | Confirmed: `features/auto-move/` gone, `features/auto-organize/` is the only match; the `${vaultPath}/${resolvedDest}` pattern is at auto-organize.service.ts:323, mkdir/move failures return silently at :330-342. Canvas section duplicates 039 | |

No Issue in 076-107 is fully fixed. Both sweeps agree and I found nothing that contradicts it.

## Spot checks of low ratings (missed high-impact bugs)

- **081 (meta-bind / Properties):** present. `detectLossyFrontmatter` (properties.logic.ts:405-462) parses raw YAML without `foldUnquotedWikilinks` (defined :113, called only :250), so an unquoted `up: [[Home]]` reads as a nested sequence and returns `nested`. Callers that then refuse: frontmatter-write.service.ts:125, live-preview widgets.ts:874, deep-link-actions.ts:205, event-calendar.service.ts:943. The rating is right if the owner's notes never hold hand-typed unquoted wikilinks; if they do (common in hand-edited or imported vaults), every Properties, icon and meta-bind write on those notes is refused. Not a missed high-impact bug from the code alone; the cheap owner check is to grep the vault for unquoted `key: [[...]]` lines. If that finds hits, 081 (S, decided 2026-11-06) moves up into the properties group.
- **097 (Quick Capture):** present (quick_capture/commands.rs:110 advances `last_signature` at emit; frontend failure returns false at quick-capture.service.ts:103-116, acked only for composer captures at :95-97). Failures show a toast ("Open a vault before capturing"), and only an identical retry is swallowed. Rating low-medium stands.
- **105 / 089 (rename while editing):** the autosave-during-rename race needs the 2 s timer to fire inside the rename IPC round trip, because the tab is re-pathed before the link-rewrite await (path-change.service.ts:174-184). 089 needs a keystroke in a *different*, linked open note during the rewrite. Low stands for both.
- **098 (.view tables):** the one rating I would raise from "low" to "conditional": `.view` is a daily feature, and the failure (app webview replaced) is severe. Rank it by whether the owner uses `link()`.

No missed high-impact bug found beyond 039, which s6 already flagged.

## Ordering notes

- 039 after 004: both edit CanvasInner.svelte (004's Issue cites it three times).
- 077 touches link-updater.service.ts, also touched by 001 and 089. Run it after 001.
- 094 in the editor.service.ts group, after 004, 015, 028.

Not checked: tauri-plugin-opener's injected script (crate source outside the repo), the owner's vault content (link() usage, unquoted frontmatter wikilinks), runtime behavior of any of the above.
