---
type: audit-xref
status: tracked
date: 2026-11-02
---

# Cross-reference: editor-data-safety audit vs file-io-audit issues

Maps every finding of `audit-2026-11-02.md` to the issues in `.scratch/file-io-audit/issues/`.
Method: 30 haiku proposed a mapping (15 batches for the 50 P0-P2 findings, 15 for the 73 low ones);
5 opus re-checked every P0-P2 mapping assuming it was wrong (haiku was wrong on 7 of 50). Low findings
have the haiku mapping only. No agent died.

Coverage: FULL = an issue describes the same bug and its fix would fix this scenario. PARTIAL = same
code or root cause, but a trigger, variant, consequence or acceptance criterion is missing. NONE = no issue.

## Summary (P0-P2)

| Action | Count |
|---|---|
| nothing (covered) | 18 |
| amend an existing issue | 18 |
| new issue | 14 |

## Amend existing issues

### F143 (P0, occasional) -> issue 16 [PARTIAL]

**Kanban serializer drops every line it does not model, on the first board mutation**

Issue 16 covers dropped prose, ### and '- [/]' lines typed in source mode (path a), with the fix "keep unrecognized lines attached to their lane or card". Verified in kanban.logic.ts that two variants fall outside it. (1) A '---' typed anywhere among the lanes, for example as a horizontal rule, matches ARCHIVE_SEPARATOR_RE (line 6, checked at 69-72). Every later '## Lane' is skipped (78-82) and its cards go to the archive (103-104). The issue ties '---' only to a frontmatter opener, and its fix (preserve a leading frontmatter block, keep unrecognized lines) does not help, because the line is recognized, not unrecognized. (2) SETTINGS_BLOCK_RE strips a '%% kanban:settings' block whose JSON is malformed (line 59). parseSettings returns {} and serializeSettings emits '' for it, so the user's block is deleted. Smaller: under a '### Sub' line, cards are reassigned to the previous lane, not only the heading line dropped.

### F144 (P0, rare) -> issue 16 [PARTIAL]

**Kanban card text with a newline is written as raw lines the parser drops**

Issue 16 covers only lines that were already in the file (from source mode, or written externally as CRLF or with frontmatter). Its fix only keeps or refuses unmodeled lines. It does not name the in-app writer that creates them: KanbanCard.svelte:66-75 intercepts only plain Enter, so Shift+Enter (or a multi-line paste) puts '\n' into item text. commitEdit (:91-94) trims only the ends, and serialize (kanban.logic.ts:118-127, 187-197) writes item.text raw. The 'multi-line cards' line in raw/review-fidelity.md:75 and deep/items/o09 treats them as pre-existing content only. Even with issue 16's fix, a continuation line that starts with '## ' still matches HEADING_RE and becomes a new lane, and the in-memory card text no longer matches the reparsed model. Add to issue 16: (1) Trigger path (c): the in-app card editor, via Shift+Enter or a multi-line paste in KanbanCard.svelte, with the file lines above. (2) Fix: reject newlines in card text (preventDefault on Shift+Enter, replace /\r?\n/ with a space in commitEdit and on paste), or serialize continuation lines indented and fold them back in on parse. (3) Acceptance: updateItem with 'a\nb' (and with 'a\n## b'), then serialize, parse, toggle and serialize again, must keep the text and must not create a lane.

### F151 (P0, rare) -> issue 06 [FULL]

**Vault switch silently discards dirty tabs whose save failed (resetEditor wipes them with no prompt)**

Issue 06 fixes the scenario. It says: "in `switchVault`, when `saveAllDirtyTabs()` returns failed paths, ask ... On cancel, return without `vaultStore.open`." The acceptance criteria cover the cancel case, the accept case and the no-failure case. One thing is missing, and it is a regression the fix itself would create. resolveAndDispatch (deep-link.service.ts:165-166) calls deepLinkStore.setPendingAction(action) BEFORE switchVault. If the user cancels, the pending action stays in the store. The next successful vault open (to any vault C) runs executePendingAction (app-lifecycle.service.ts:503 -> deep-link.service.ts:329-340) against vaultStore.path, so a `new`, `daily` or `capture` meant for vault B writes into C. Add to issue 06: on cancel, clear deepLinkStore's pending action, either by having switchVault return a boolean that resolveAndDispatch checks, or by setting the pending action only after the user agrees. Add the acceptance criterion: "After a cancelled deep-link switch, the next vault open does not run the dropped action."

### F165 (P0, rare) -> issue 05 [FULL]

**Deleting a note or folder throws away its unsaved editor buffer; a failed Trash move throws it away too**

Issue 05 covers scenarios A to D: the 2 s window, the failed save, the failed Trash move and the folder delete, with save-before-delete and abort when the save fails. It contradicts itself on ordering, though. 'What to build' says "Close the tabs only after diskOp resolves", while its fix sketch says "This keeps the close-before-disk ordering". The acceptance criterion "A failed Trash move keeps the tab open" only works with close-after-diskOp. That ordering breaks the load-bearing rule in path-change.service.ts:96-99 (close BEFORE diskOp, so the 2 s debounce cannot recreate the file) and the pinned test fs.service.race-audit.test.ts:87-107 ('closes tabs before moving file to trash to prevent auto-save resurrection'). An implementer following 'What to build' would have to break or weaken that test. Amend issue 05 to pick one design. Option 1: save, then close, then diskOp, and change the criterion to "a failed Trash move leaves the latest edits on disk (tab may be closed)". Option 2: if the tab must survive, reopen it from the saved bytes when diskOp throws. In both cases, add a criterion that the race-audit resurrection test stays green unchanged.

### G6 (P0, rare) -> issue 15 [PARTIAL]

**A canvas file with invalid JSON opens as an empty canvas with no error, and the first edit overwrites the file with only the new nodes**

Issue 15 covers the invalid-JSON case ('parseCanvas returns createEmptyCanvas() on any error ... block persistChanges while the source does not parse'). It does not cover G6's second defect, which I confirmed in the code. On VALID JSON, parseCanvas (canvas.logic.ts:42-45) returns only {nodes, edges}, and flowToCanvas (canvas.logic.ts:290-299) builds a new object with only nodes and edges, so every persist drops all other top-level keys. Issue 15's fix does not touch this. Add to issue 15: a fix line and an acceptance test saying a canvas with extra top-level keys keeps them after an edit (carry the parsed object through parseCanvas/flowToCanvas and spread it into the output).

### G7 (P0, rare) -> issue 41 [PARTIAL]

**A no-op Properties commit leaves skipNextParseFor armed, so the next editor burst is not parsed, and a later panel edit erases YAML typed in the editor**

Issue 41's section 'Properties panel skip flag swallows the only re-parse...' has the same root cause (properties.service.ts:33-37), and its first fix option ('skip only when the content being parsed equals it') would also fix G7. Its trigger, though, is a timed race: 'a second frontmatter change in the same note within 300 ms of a panel commit', rated 'hard to hit by hand', P3. G7 needs no timing. A no-op commit (newContent === content, properties.service.ts:86-95) arms skipNextParseFor, but the content does not change, so the PropertiesView effect never re-runs to consume the flag. The flag stays armed until the next editor burst, whenever that comes, and swallows it. Add to issue 41 (or split out at a higher priority): the no-op-commit trigger; an acceptance test where a commit leaves the content unchanged, a later edit adds `status: draft` in the editor more than 300 ms afterwards, and the next panel edit keeps `status: draft`; and the early return when newContent === content.

### F103 (P1, rare) -> issue 17 [PARTIAL]

**Meta-bind writes rewrite numbers through JS values: large integers change digits and trailing zeros are dropped**

Together, the two fixes would fix F103. detectLossyFrontmatter (properties.logic.ts:425-432) already reports an integer beyond MAX_SAFE_INTEGER as 'unparseable', and issue 17's fix runs the detector in dispatchMetaBindUpdate. Issue 18 names meta-bind among its triggers and covers the trailing zero (9.90 to 9.9), but only through detector changes, which reach meta-bind only if issue 17 lands. Neither issue names the unsafe-integer digit change (tweet_id 1234567890123456789 written back as 1234567890123456800) on the meta-bind path, and neither has a test for it. Issue 18 has no 'Blocked by 17' link, so an implementer could fix 18 in the detector alone and leave meta-bind unguarded. Add to issue 17 an acceptance criterion and red test: a meta-bind toggle (and a Properties panel checkbox) on a note with `tweet_id: 1234567890123456789` refuses with the toast and leaves the bytes unchanged. Add to issue 18: the meta-bind half of its trigger depends on issue 17 wiring the detector into dispatchMetaBindUpdate (Blocked by 17, or a cross-reference), and an acceptance case for `price: 9.90` through a meta-bind control.

### F136 (P1, occasional) -> issue 26 [PARTIAL]

**Pending deep-link action is a single slot and can be overwritten during vault init**

Issue 26 covers a different mechanism on the same slot: teardownVault calling resetDeepLink (app-lifecycle.service.ts:641) before step 8. It does not cover the single-slot overwrite. setPendingAction (deep-link.store.svelte.ts:18-20) assigns `pendingAction = action`, and resolveAndDispatch (deep-link.service.ts:163-167) calls it for every different-vault URL. A second URL for vault C that arrives before B's init reaches step 8 replaces action 1, and nothing reports it. Neither of 26's fixes (stop resetting in teardown, or consume at init entry) turns the slot into a queue, so URL 2 can still overwrite action 1 before init entry captures it. Only raw/scout-deep-link.md L5 (lines 114, 165-166, 257) describes this, and it says no issue covers it. Add to issue 26: (1) this variant as a second trigger: URL1 vault=B append, URL2 vault=C back to back, and URL1 never runs; (2) a fix direction: make the slot a queue keyed by target vault path, drain it at step 8 only for entries whose vault matches vaultStore.path, and toast whenever a pending action is discarded; (3) an acceptance criterion with a red test: two different-vault URLs back to back both run, or the dropped one shows a toast. executePendingAction (:329-341) also runs the action against vaultStore.path, not action.vault, so with only the teardown fix an action could run in the wrong vault.

### F158 (P1, rare) -> issue 28 [PARTIAL]

**A failed tree refresh drops the whole watcher burst: no tab reload, so the next autosave overwrites the external change**

Issue 28's section "Failed tree refresh skips listener fan-out" has the same trigger, code path (fs.watcher.ts:137/149/175/199, vault.rs:96/139) and consequence, and its repro asserts that listeners still get the burst paths. That repro would fix the tab-reload and overwrite half once green. But the section has no fix sketch, and the issue is graded P2 stale-state even though the section itself describes the stale buffer overwriting the external version. Add to that section of issue 28: (1) Fix sketch: wrap each refreshTree call in handleChangedPaths in try/catch, log and toast, and always call notifyListeners(changedPaths) (subject to the watchVersion check). In Rust scan_dir (vault.rs:96/139), skip and log an unreadable child directory the way per-entry stat failures are already skipped, so a persistent unlistable folder does not break every later burst and the tree. (2) Acceptance: a Rust test where scan_vault on a tree with an unreadable subfolder returns the rest of the tree. (3) Severity: data-loss through autosave overwrite of the external change, not only stale-state; re-check P2.

### F182 (P1, rare) -> issue 07 [PARTIAL]

**Main note save truncates the file in place (no temp+rename, no fsync): a failed write leaves the note empty or cut short on disk**

Issue 07 fixes the main editor save (my core scenario), but its fix lists only "the editor save, frontmatter write and link rewrite". grep shows other note writers that still use plugin-fs writeTextFile and that an agent following issue 07 would leave non-atomic: type-definitions.service.ts:218 (open member tab), 291 and 309 (definition/view notes); deep-link.service.ts:260, 279, 296 and 313 (append/prepend to an existing note, new note); deep-link-actions.ts:61 and 173. Haiku listed these gaps but still marked FULL with no action, so they would be forgotten. Amend issue 07: list these writers in the fix and add an acceptance criterion that no note-content writer under src/lib calls plugin-fs writeTextFile (a grep or architecture test). Also name the network or external volume EIO trigger next to ENOSPC.

### F184 (P1, rare) -> issue 31 [PARTIAL]

**Non-UTF-8 notes (and binary files with unrecognized extensions) are decoded lossily and permanently corrupted on the first edit**

Issue 31 covers the Latin-1/Windows-1252 case on the same path (editor.service.ts:124 lossy readTextFile, :168 UTF-8 write). Its fix, "Read with a fatal decoder (or check for U+FFFD) before any write path. Refuse to save or rewrite such a note, or open it read-only", would stop the autosave corruption. Applied at the openFileInEditor read, it would also catch most binary files. But the issue never names the binary variant, and its trigger and repro cover only legacy-encoded notes, so an implementer could scope the fix to .md notes. Add to 31: (1) Trigger: a binary file whose extension is not in BINARY_FILE_EXTENSIONS (fs.logic.ts:79-97 lists only image, audio, video, pdf and archive types, so e.g. .docx, .sqlite, .epub get through). Opened from the tree through openFileInEditor (editor.service.ts:104-140), one keystroke autosaves it as U+FFFD text. (2) Acceptance: opening an invalid-UTF-8 file under any extension is refused or read-only with a toast, and never autosaved; add a repro with such bytes under a .sqlite name. (3) Optional: surface the non-UTF-8 files the Rust index scan skips silently (vault.rs read_to_string, debug log only).

### F35 (P1, rare) -> issue 09 [PARTIAL]

**Notify's rescan flag is dropped, so a dropped-event burst skips the index rebuild**

Issue 09 has the same trigger and root cause: watcher.rs forwards event.paths regardless of the Rescan flag, and watcher-handler.service.ts:33-44 filters the dot-less directory and returns early. Its consequence covers only open clean tabs that are not reloaded, and it has no fix sketch. Issue 28's bulk section fixes FTS/semantic in the >10-file full-rebuild branch, and its folder-rename section fixes applyPathChange. Neither reaches a rescan batch that holds only a directory path, which still returns at :41-44 before either branch. Add to issue 09: (1) the consequence that VaultIndex (backlinks, tags, tasks, properties), FTS5 and semantic rows keep pre-burst content for every note changed in the dropped window, open or not, until restart or a later per-file event; (2) a fix sketch: check event.need_rescan() in the notify callback (or detect Flag::Rescan), emit a rescan marker to TS, run the full-rebuild path (rebuildIndex plus an FTS5/semantic reconcile, which issue 28's bulk fix should share), and reload clean open tabs whose disk content differs from savedContent; (3) an acceptance criterion: a rescan event refreshes both the indexes and the clean tabs.

### F53 (P1, occasional) -> issue 18 [PARTIAL]

**Numeric and boolean scalars are rewritten from parsed value, losing source text**

Issue 18 covers the number respelling (leading zeros, trailing fraction zeros) on the same updateNoteFrontmatter and serializeProperties path. It never mentions booleans: core-schema True, TRUE, False and FALSE are parsed to JS booleans and written back lowercase (done: True -> done: true). Its first fix option ("flag a number scalar whose source text differs from String(value)") would let that through. Amend issue 18: retitle it to cover scalars, not only numbers, and list the boolean spellings, hex/octal (0x1F, 0o17) and exponent forms (1e3) as variants. If the detect option is chosen, require it to compare every number and boolean scalar's source token with its re-stringified form, or prefer the in-place Document edit. Add a repro case `done: True` plus toggleFavoriteForPath must keep 'done: True'.

### G1 (P1, rare) -> issue 40 [PARTIAL]

**QueryJS blocks auto-run on first open with full Tauri IPC (fs remove/write on the whole vault). A deep link or capture can plant one, and nothing gates, sandboxes or times it out**

Issue 40 has the mechanism right: auto-run on first open with the default 'first-open', and raw plugin:fs IPC (kb-api.ts:469). But it says the bug is "Not reachable through the user's own normal typing or actions" and needs "a note authored by someone else", and it was downgraded to P2 on that basis. Its fix (opt-in or 'manual' for foreign or non-locally-created vaults) would not cover G1. Add to issue 40: (1) Vector: a kokobrain://new deep link with content= or clipboard=true (deep-link.service.ts:315-321 -> openOrCreateNote, which opens the note so live preview auto-runs the block), or a Quick Capture of hijacked clipboard text, plants a queryjs fence in the user's OWN locally created vault. The note runs on first render after one 'Open KokoBrain?' browser prompt, so the reviewer's downgrade premise is wrong and the priority needs re-triage. (2) A synchronous while(true) block freezes the webview, so pending autosaves in other tabs never fire and the user must force-quit. The first-open markers live in memory only (queryjs-session.store.svelte.ts:38,111), so the freeze comes back after every restart. (3) Fix and acceptance: deep-link-created and capture-created notes (or any block hash not yet trusted, persisted per vault) must not auto-run. A fix scoped only to 'foreign vaults' is not enough.

### G3 (P1, rare) -> issue 36 [PARTIAL]

**A case (or NFC/NFD) variant of a note's path opens a second editable tab on the same file. That tab never receives watcher reloads, and its next autosave overwrites the other tab's saved edits**

No issue covers a case or NFC/NFD spelling of a path that opens a second editable tab. Issue 36 is the path-normalization issue. Its h07 deep note has the same outcome ("Clicking the note in the tree opens a second tab. openFileInEditor uses findTabIndex exact match (editor.service.ts:114)"), but only for the '//' unarchive path, and its fix only normalizes destination segments. Issue 09 shares the exact-match reload code (editor.service.ts:378-381) but covers dropped FSEvents rescans, so it does not cover this. raw/scout-rename-edges.md L12 (NFC/NFD, not verified) and raw/review-external-change.md:149 only list it as unverified. Add a section to 36. Title: 'A case or NFC/NFD variant of a note path opens a second tab, and the stale tab overwrites the other'. Trigger: the Periodic Notes folder is set to 'journal' while 'Journal/' is on disk. openOrCreateNote's exists() is true on case-insensitive APFS (note-creator.service.ts:86-88; periodic-notes.service.ts:36-42, periodic-notes.logic.ts:10-22), so tab A opens under the lowercase path. The tree, backlinks and wikilinks open tab B under the on-disk path, because findTabIndex compares exact strings (editor.service.ts:114-131). Also triggered by a typed deep link (open?file=inbox/todo for Inbox/Todo.md) and an NFC-typed wikilink to an NFD-named file. Consequence: A's next autosave writes its stale buffer over B's saved edits. reloadExternallyChangedTabs (editor.service.ts:375-404) never reloads A, and it reloads B with A's bytes. Fix: canonicalize at open time. Rust std::fs::canonicalize, or a resolve_real_path IPC, returns the stored case and form; call it in openFileInEditor and openOrCreateNote before findTabIndex. Also normalize the periodic folder against the tree's case when it is saved. Acceptance: opening '<vault>/journal/x.md' when the disk has 'Journal/x.md' activates the existing tab, and a test covers it. The same canonicalization would also close 36's '//' second-tab effect.

### F130 (P2, occasional) -> issue 17 [PARTIAL]

**Capture title/tags injection silently drops unparseable frontmatter from the template output**

Issue 17 is the same writer family (frontmatter rebuilt with rebuildContent(parsed, extractBody(...)) without detectLossyFrontmatter), but its root cause and fix name only properties.service.ts:82 commitChanges and widgets.ts:756 dispatchMetaBindUpdate. Fixing 17 as written leaves the capture path unguarded. I verified the code: deep-link-actions.ts:161-167 calls injectTitleIntoContent / injectTagsIntoContent on the processTemplate output. Those (deep-link.logic.ts:385-445) parse with parseFrontmatterProperties (an empty list when the YAML does not parse) and rebuild, with no lossy or unparseable check. Add to 17 a third writer: link or note capture with title or tags injection. Trigger: a link template with `title: <% title %>` and a title containing ': ' (e.g. 'Clean Code: A Handbook') renders invalid YAML. The injection then rebuilds the block from the title alone and drops 'created' and every other template key with no notice. The same happens to pasted text that starts with a YAML block that does not parse. Fix: in executeCaptureAction, skip the injection (keep the template output and toast) when detectLossyFrontmatter(fileContent) is non-null. Optionally YAML-quote string template variables, or document that `<% title %>` needs quotes. Acceptance: a capture test where the template keys survive or the injection is refused with a toast. Issue 30 (empty --- --- block) is a different defect.

### F78 (P2, rare) -> issue 34 [NONE]

**Frontmatter type rename writes the new name unquoted, so names with YAML syntax change the member's type**

Issue 34 covers a different bug in the same function: an existing '_type: Project # note' is not matched on read. Nothing covers the write side. Verified: rewrite_type_line (parsing.rs:146-150) and rewriteTypeInFrontmatter (type-definitions.logic.ts:207) write new_type raw when the original was unquoted, and getFileNameError (fs.logic.ts:117-124) allows '#', '[', ']', '{', '&', '!' and a leading '#'. So 'Book #2' is saved as type 'Book', and '[Projects]' becomes a flow sequence that drops the type. Issue 34's matching fix would not add quoting. Haiku's PARTIAL is too generous, though its amend-34 direction is right. Add a section to issue 34 for the new-name write. Fix: quote (double-quote with escaping) any value that is not a safe plain scalar, in Rust, TS and resolveTypedNoteTarget, or reject YAML indicator characters in the type-name validator. Acceptance: renaming to 'Book #2' and to '[Projects]' re-indexes the members under exactly that name.

### G5 (P2, rare) -> issue 13 [PARTIAL]

**File History never records a note's version before a write, and several writers take no snapshot at all, so the first lossy or destructive write of an externally authored note cannot be undone (deep-link overwrite is the sharpest case)**

Issue 13 covers in-editor saves. Its fix starts with 'Before the write in saveFileByPath ... snapshot tab.savedContent / the on-disk bytes when ... no snapshot exists', so a property, kanban or meta-bind edit to an open, externally authored note gets fixed. It also names task toggle, link rewrite and type rename. G5 (2) is not covered. The deep-link overwrite (deep-link.service.ts:291-305) calls writeTextFile directly, not saveFileByPath, and the only snapshot it takes is post-write, through notifyAfterSave. Issue 13 even says 'Corrected: frontmatter-write.service.ts:157 and the deep-link writers DO call it', so someone fixing it could treat those writers as already handled. Issue 02's 'Overwrite mode must save too' snapshots only a DIRTY open tab. With the note clean or closed and never saved in the app, overwrite=true destroys the only copy of the old version. Add to issue 13: (a) list the deep-link overwrite, prepend and append branches (deep-link.service.ts:254-305), daily append/prepend (deep-link-actions.ts:36-64) and the closed-note frontmatter rewrite (frontmatter-write.service.ts:149) as writers that must snapshot the pre-write disk bytes, because their notifyAfterSave snapshots only the new bytes. (b) Acceptance test: an externally authored note that is closed, with an empty history, gets kokobrain://new?name=X&overwrite=true&content=x. After that, File History holds the original text.

## New issues needed

### F105 (P0, rare) -> no issue [NONE]

**ImageWidget throws URIError from decodeURIComponent on a raw % in a file:// URL, with no guard in toDOM**

Confirmed in code: fileUrlToFsPath (widgets.ts:104-116) catches only the new URL() failure. decodeURIComponent(parsed.pathname) at :113 is unguarded and throws URIError on a raw '%' (for example '100%.png'), and applyFileSrc (:157) is called from ImageWidget.toDOM with no try/catch. Nothing in issues/, raw/ or deep/ mentions ImageWidget, fileUrlToFsPath or URIError. New issue: catch the decode (return null or the raw pathname), with a test that renders `![x](file:///a/100%.png)` without throwing.

Repro: `.scratch/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts`. Fix sketch from the audit: In fileUrlToFsPath, wrap decodeURIComponent in try/catch and return null (or the raw pathname). Separately, wrap the tab-switch dispatch (MarkdownEditor.svelte:227-237) and the external-edit dispatch (:328-334) in try/finally so the suppress flags always reset. Consider a try/catch around widget toDOM work that parses user text.

### F98 (P0, rare) -> no issue [NONE]

**+row and +col delete cells beyond the header count**

I grepped issues/, raw/ and deep/ for dispatchAppendRow, dispatchAppendColumn, renderTableSource, normalizeRow, parsers/table, table.ts, +row, +col, and 'table'/'cell' as words. No hit for the table widget. The only 'table' hit is issue 32's collection-view YAML. Issues 16 (kanban) and 29 (meta-bind value types) are other writers. The +row/+col full-table rewrite that drops cells past the header count (table.ts:54-58, 141-143; widgets.ts:461-481) needs a new issue.

Repro: `.scratch/editor-data-safety/repro/table-and-doc-mutations/table-add-buttons.test.ts`. Fix sketch from the audit: Stop re-serialising the whole table for +row/+col. +row: insert one new line after the last table line, reusing that line's prefix. +col: append ` |  |` (or ` --- |` on the delimiter line) at the end of each table line. This keeps every existing byte, so it also fixes F99 and F100. If the full rewrite stays, normalizeRow must at least keep the excess cells in a separate raw field and write them back.

### F100 (P1, occasional) -> no issue [NONE]

**Tables inside blockquotes (callouts) or list items lose their container prefixes after +row or +col**

Grepping the whole file-io-audit tree for dispatchAppendRow, appendRow, +row, table-field, renderTableSource and table/callout finds nothing. The current code at widgets.ts:467-481 replaces [sourceRange.from, sourceRange.to) with renderTableSource output that has no container prefix, which confirms the bug. File a new issue with F100's scenario and fix (keep the `> ` or indent prefix on every emitted line, or point-insert the new row and column).

Repro: `.scratch/editor-data-safety/repro/table-and-doc-mutations/table-add-buttons.test.ts`. Fix sketch from the audit: Take the line prefix (the text from the first line's start up to table.from, e.g. `> ` or `  `) and add it to every emitted line after the first. Or point-insert as in F98: append to line ends and insert the new row with the prefix of the last row.

### F104 (P1, rare) -> issue 12,17 [NONE]

**Meta-bind button actions after a navigation or create write into whichever note the shared editor shows**

Haiku's gap text is correct, but its label is wrong. No issue's fix would fix this, so it is NONE, not PARTIAL. Issue 12 shares only the root-cause class (writes go to the shared editorStore.editorView and the active tab). Its trigger is File History Restore after Cmd+W, and its fix ("Restore by fileHistoryStore.filePath") touches only file-history.service.ts. Issue 17's fix adds detectLossyFrontmatter to dispatchMetaBindUpdate and does nothing about the target note. I verified the code: the click handler (meta-bind-button-widget.ts:33-36) runs actions in sequence. 'open' awaits host.openLink and returns true (lines 90-101), so the sequence continues. updateMetadata then calls dispatchMetaBindUpdate(view, ...), which reads view.state.doc at call time (widgets.ts:754-767). No grep hit for meta-bind-button, updateMetadata or the action sequence in issues/, raw/ or deep/ apart from the scout inventory line raw/scout-frontmatter-writers.md:52. File a new issue that cross-references 12 (same shared-view class). Fix: capture the button note's path at click and apply later updateMetadata calls to that tab by path, or stop the sequence after a navigation or create.

Repro: `.scratch/editor-data-safety/repro/writes-into-wrong-tab/meta-bind-button-sequence.test.ts`. Fix sketch from the audit: Capture the button note's path (editorStore.activeTabPath) when the click starts. Before each updateMetadata, if the active path has changed, apply the update to the captured path's tab content: compute it from the tab's content with the same parse and rebuild code, then call syncExternalContentToEditor(path, newContent, false, 'frontmatter'). Otherwise dispatch as now. Or stop the sequence after a navigation.

### F21 (P1, occasional) -> no issue [NONE]

**Canvas-to-canvas tab switch drops the pending edit and leaves a stale persist flag**

No issue covers canvas-to-canvas switches. Issue 15 is the unparseable-.canvas empty-merge-base bug (canvas.logic.ts:36-49), and no other issue cites CanvasInner.svelte:85-98, :211-234 or pendingPersist. The README's Refuted section (line 70) says the residual is 'unclaimed, P3': 'On a canvas -> canvas switch, the effect cleanup cancels the timer but leaves pendingPersist true, dropping A's last <300 ms edit.' The same note refutes the stale-flag half: Svelte teardown reads pre-change values, so onDestroy writes to the tab that was active before the switch. When leaving Board-2, that is Board-2 with its own nodes. File a new issue for the dropped <300 ms edit on canvas-to-canvas switch (and on closing a canvas within 300 ms, which the README notes as the same residual). Suggested fix: key the canvas branch by tab path, or flush the pending persist to the old path in the effect cleanup.

Repro: `.scratch/editor-data-safety/repro/writes-into-wrong-tab/canvas-unmount-flush.test.ts`. Fix sketch from the audit: Key the canvas branch by tab path ({#key editorStore.activeTab.path}<CanvasView .../>{/key}), so each canvas gets a fresh CanvasInner with its own history and its own onDestroy flush. Combine that with the path-keyed persist from F5, so the flush during destroy targets the right file without relying on Svelte teardown semantics.

### F99 (P1, occasional) -> no issue [NONE]

**+row and +col re-escape raw cell text, so backslashes double on each click and wikilink aliases break**

No issue, raw or deep note mentions cellEscape, renderTableSource, extractCells or the table +row/+col widget. Verified: renderTableSource (widgets.ts:490) runs cellEscape (backslash then pipe escaping) over cells that extractCells (parsers/table.ts:92) sliced raw from the source and re-merged across wikilink pipes. Each + click doubles backslashes, and [[Note|alias]] becomes [[Note\|alias]]. A new issue is needed. Fix: point-insert the new row or column, or skip escaping for cells taken from the source. Repro: a round-trip test with a backslash cell and a wikilink alias cell.

Repro: `.scratch/editor-data-safety/repro/table-and-doc-mutations/table-add-buttons.test.ts`. Fix sketch from the audit: Same as F98: point-insert the new row or column and never re-serialise the existing cells. If a full rewrite is kept, drop cellEscape for cells taken from source, since they are already valid cell source. Escape only text the user enters in new cells, and write a merged wikilink cell back exactly as it was in the source.

### G4 (P1, occasional) -> no issue [NONE]

**Quick Capture clipboard screenshots are stored only in the OS temp dir. The note never displays them (outside the asset scope), and macOS deletes them later, so the capture is lost**

No issue covers this. It appears only in raw/scout-deep-link.md L16 ('[M, known by design]') and raw/scout-rust-fs-utils.md L10 ('Not data loss for notes'). Neither was promoted to an issue, and neither mentions that the file:// temp path is outside the asset-protocol scope, so the image is broken from the first open. Issues 20 and 38 cover other quick-capture paths. A new issue should describe: Shot::Bytes written only to std::env::temp_dir() (quick_capture/commands.rs:123-142), the note linking to that path, the image broken at once, the only copy lost on temp purge, and the fix (write the bytes into a vault attachments folder and emit a vault-relative embed).

Repro: `none (trace only)`. Fix sketch from the audit: In materialize_input, write Shot::Bytes into the vault (e.g. an attachments folder under the capture's folder) instead of temp_dir, and emit a vault-relative ![[...]] or relative link. Keep file:// only for Shot::Path inputs that the user owns.

### LP1 (P1, common) -> no issue [NONE]

**Backspace, Delete, Tab or Enter pressed inside a meta-bind number/date input edits the note at the editor's cursor instead of the input**

Nothing in issues/, raw/ or deep/ mentions ignoreEvent, keydown routing to the CodeMirror keymap, or Backspace/Delete/Tab/Enter inside widget controls. The only keydown mentions are about the File History dialog (issue 12). The current tree confirms the bug: ignoreEvent() returns false in widgets.ts:738, :834 and :875 and in code-block-widget.ts:141. Issues 17 and 29 cover only the values the meta-bind widgets write. File a new issue with LP1's scenario and fix.

Repro: `src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-input-keydown.test.ts` (moved from `.scratch/editor-data-safety/repro/lp-plugins/` by Issue 47). Fix sketch from the audit: In MetaBindTextInputWidget, MetaBindToggleWidget, MetaBindSelectWidget (and CodeBlockWidget's select), make ignoreEvent return true for keyboard and input events coming from form controls, e.g. `ignoreEvent(e) { return e.type.startsWith('key') || e.type === 'beforeinput' || e.type === 'input' || (e.target instanceof HTMLElement && e.target.closest('input,select,textarea') !== null); }`. Keep the existing mousedown stopPropagation. Alternatively, stopPropagation on keydown inside the controls. Add a regression test that presses Backspace, Delete, Tab and Enter in each control and checks the doc is unchanged.

### F101 (P2, occasional) -> no issue [NONE]

**Code-block language switch replaces the whole info string and drops text after the language**

I grepped issues/, raw/ and deep/ for code-block-widget, fenced-code, CodeInfo, languageFrom, 'info string', 'title=', language and dropdown. Nothing describes the code-block language dropdown replacing the whole CodeInfo range (code-block-widget.ts:170-181, fenced-code-block.ts:59-62). Issue 27's fenced-code item is a different defect (the rename regex inside fences). New issue needed.

Repro: `.scratch/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts`. Fix sketch from the audit: In fenced-code-block.ts, take language as the first whitespace-delimited token of CodeInfo, and set languageTo = languageFrom + token.length, so the rest of the info string is kept on replace. Build the dropdown from that token.

### F121 (P2, occasional) -> no issue [NONE]

**TSV paste turns tab-indented code and any first line with a tab into a markdown table, doubling backslashes and not checking for code fences**

Only issue 13 matches 'paste', and it is a different trigger (paste over a whole note, no File History baseline). No issue covers looksLikeTSV (paste-tsv.logic.ts:19-26), tab-indented code becoming a table, the missing FencedCode/frontmatter check in paste-tsv-handler.ts, or backslash doubling. The only mention in raw/ is incidental (verify-fidelity.md:55, CRLF grep). This is editor input transformation, outside the file I/O audit's scope. File a new issue.

Repro: `.scratch/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts`. Fix sketch from the audit: In the handler, resolve syntaxTree(state) at the selection, and return false (default paste) inside FencedCode, CodeBlock or InlineCode and inside the frontmatter range. In looksLikeTSV, reject input where every row starts with a tab (an empty first column in every row means indentation). This keeps Excel ranges whose top-left cell is blank.

### F129 (P2, occasional) -> no issue [NONE]

**Prepend inserts text above the frontmatter block, detaching the note's properties**

No issue covers prepend placing text above an existing frontmatter block. Issue 02 touches the same branches (deep-link.service.ts:254-270, deep-link-actions.ts:36-64), but only to save a dirty tab before the disk-based write. Its fix keeps the `content + '\n' + existing` order, so the block is still detached. Issue 30 covers only the empty '---\n---' block in FRONTMATTER_REGEX. Grepping issues/, raw/ and deep/ for prepend finds only dirty-buffer and inventory notes. This is a different bug that happens to share a code path, so it needs a new issue: insert after the closing fence when extractRawFrontmatter matches, in both executeNewAction and executeDailyAction.

Repro: `.scratch/editor-data-safety/repro/fs-trash-deeplink/deep-link-writes.test.ts`. Fix sketch from the audit: Use a shared helper: if extractRawFrontmatter(existing) matches, insert the content right after the closing '---' line (keeping the original line endings). Otherwise prepend as today. Apply it in both executeNewAction and executeDailyAction.

### F142 (P2, rare) -> no issue [NONE]

**Non-silent new processes URI and clipboard text as a template, rewriting <% %> in note content**

Confirmed in code: the non-silent create branch (deep-link.service.ts:316-321) passes the URI or clipboard content as inlineTemplate to openOrCreateNote, and loadNoteTemplate (note-creator.service.ts:49-64) runs processTemplate on it, which rewrites <% %>. The silent branch (:309-314) writes the same content raw. Issue 04 only adds an exists check to the silent branch, and no issue mentions processTemplate or inlineTemplate on deep-link content. New issue: write the deep-link content literally, either with buildContent: () => content and no inlineTemplate, or with a raw option. Add a test that content '<%= user.name %>' arrives byte-identical through both the silent and non-silent paths.

Repro: `.scratch/editor-data-safety/repro/fs-trash-deeplink/deep-link-writes.test.ts`. Fix sketch from the audit: Write the URI content literally. In executeNewAction, call openOrCreateNote with buildContent: () => content and no inlineTemplate, or add a 'raw' option to openOrCreateNote that skips processTemplate.

### F92 (P2, occasional) -> no issue [NONE]

**Right-click, middle-click and macOS ctrl-click toggle a task checkbox and rewrite the note**

Confirmed in code: TaskCheckboxWidget.toDOM (widgets.ts:36-42) runs preventDefault and dispatches the [ ] / [x] change on mousedown with no button check, while the wikilink widget (widgets.ts:294-295) returns early for e.button !== 0 || isMacContextClick. No issue, raw note or deep note mentions TaskCheckboxWidget, a checkbox button check or right-click toggling. Issues 02, 24 and 33 cover other paths (TasksView/Rust toggle, link rewrite), and their fixes would not stop a right-click, middle-click or macOS ctrl-click from rewriting the line, which autosave then writes to disk. New issue: add the button and isMacContextClick guard at the top of the listener, with tests for button 1, button 2 and macOS Ctrl+click.

Repro: `.scratch/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts`. Fix sketch from the audit: At the top of the mousedown listener in TaskCheckboxWidget.toDOM, add `if (e.button !== 0 || isMacContextClick(e, IS_MAC)) return;` before preventDefault. Add tests for buttons 1 and 2 and for Ctrl+click on macOS.

### LP2 (P2, occasional) -> no issue [NONE]

**An empty inline footnote `^[]` throws RangeError in the footnote ViewPlugin and permanently deactivates footnote rendering**

No issue, raw note or deep note mentions footnote, RangeError, 'Mark decorations' or this ViewPlugin. The code matches my finding: footnote-plugin.ts:90 pushes footnoteRefDeco.range(range.textFrom, range.textTo). INLINE_FOOTNOTE_RE (parsers/footnote.ts:38) accepts empty content via `*`, and textFrom === textTo when content is empty (:101-102). The file I/O audit did not cover live-preview decorations. File a new issue.

Repro: `.scratch/editor-data-safety/repro/lp-plugins/footnote-empty-inline.test.ts`. Fix sketch from the audit: In buildFootnoteDecorations, push the text mark only when range.textTo > range.textFrom, or skip empty inline footnotes entirely (`if (range.textFrom === range.textTo) continue;`). Optionally tighten INLINE_FOOTNOTE_RE to require at least one character. Add a test with `^[]` off the cursor line.

## Already covered

### F126 (P0, occasional) -> issue 04 [FULL]

**deep-link new with silent=true overwrites an existing note**

Issue 04 covers it. Same branch: "The silent branch calls mkdir then writeTextFile(fullPath, content) with no exists() check" (deep-link.service.ts:309-315). Same trigger: "kokobrain://new?...&silent=true with no append/overwrite, naming an existing note". The empty-content variant is there too: "resolveContent returns '' by default" and "clipboard=true with a non-text clipboard". The fix "check exists(fullPath) and skip (or pick a unique name) when the file exists. Leave replacing to overwrite=true" fixes my scenario.

### F155 (P0, rare) -> issue 08 [FULL]

**External edit to an open note with unsaved edits is silently discarded, then autosave overwrites it on disk (no conflict detection)**

Issue 08 has the same trigger: "The user is typing in note N (dirty for 2 s after each keystroke, or longer while a save is failing) when a sync client, git pull or second editor rewrites N." Same root cause: editor.service.ts:380 skips a dirty tab, and :168 writes with no precondition. Its fix, "Before any tab write, stat or read the file. If it differs from savedContent, keep the external bytes (conflict copy or File History snapshot) before writing, and toast", runs on every save. So it also covers the variant where the tab stays dirty through a long typing session, which 08 does not name. Optional wording only, no amend needed.

### F189 (P0, occasional) -> issue 01 [FULL]

**Cmd+Q, Dock Quit and logout skip the save-on-close handler, so pending and failed-save edits are lost**

Issue 01 covers both scenarios. Steps 2-3 put Cmd+Q and app-menu Quit through prepareForExit, which saves dirty tabs and asks before discarding a failed save. Acceptance: "Cmd+Q and the app-menu Quit run `prepareForExit`". For Dock Quit and logout the issue may conclude they are not covered, but an acceptance criterion forces a record: "Notes record whether Dock Quit and logout are covered, and a follow-up Issue exists if they are not". Step 5 (10 s max wait) bounds the loss in that case. Restart to update (step 4) and the maxWait idea from my option (b) are both in the issue. Nothing gets forgotten.

### F2 (P0, occasional) -> issue 02 [FULL]

**Toggling a task from the Tasks tab overwrites the unsaved text of that note**

Issue 02 states: "`toggleTask` (src/lib/features/tasks/tasks.service.ts:100-115): Rust `toggle_task_status` reads the note from disk (vault.rs:669)", plus daily-note append/prepend (deep-link-actions.ts:36-64) and deep-link new with append/prepend/overwrite (deep-link.service.ts:254-300). Its fix: "if an open tab for that path is dirty, `await saveFileByPath(path)`... If it returns false, abort the write and show a toast." Its acceptance criteria include "Ticking a task of a note with unsaved typing keeps the typing in the tab and on disk" and cover every deep-link variant in F2. Same trigger, path, consequence and fix.

### F3 (P0, rare) -> issue 33 [FULL]

**Watcher reload overwrites keystrokes typed while the disk read is in flight**

Issue 33, section 'Watcher reload replaces keystrokes or property edits made while its readTextFile is pending'. Root cause: 'editor.service.ts:398 (after the await, only diskContent===savedContent is checked, not isTabDirty)'. Fix: 'After the await, skip when isTabDirty(tab) or when tab.content changed since eligibility'. Same trigger, code path and fix as F3.

### F43 (P0, rare) -> issue 19 [FULL]

**duplicateItem overwrites an existing case-variant sibling on case-insensitive volumes**

Issue 19's title: "Duplicate overwrites a sibling whose name differs only in case (APFS)." Its root cause: "src/lib/core/filesystem/fs.logic.ts:185 (generateCopyName uses an exact-case sibling Set) together with src/lib/core/filesystem/fs.service.ts:278 (copyFile with no exists check)." Its fix: "Compare lowercased sibling names in generateCopyName, matching generateUniqueName." In the code, the same `siblings` Set feeds both the `${baseName} copy` check and the numbered `copy N` loop (fs.logic.ts:185, 203-208), so the lowercase fix covers both cases in F43. The exists() guard is optional in both the issue and F43.

### F45 (P0, rare) -> issue 33 [FULL]

**Link rewrite on rename overwrites keystrokes typed while it awaits disk I/O**

Issue 33, first section, names the same trigger, code path (link-updater.service.ts:33-47, unguarded syncExternalContentToEditor, updateTabContentByPath setting content and savedContent) and consequence. Its fix: "After the await, rewrite the live buffer (tab.content at that moment), not the snapshot; or when the tab changed since the snapshot, write the disk copy only". The repro test covers both the clean-read and dirty-write windows. The same guard for renameType is in that issue's third section. Only the priority differs (P2 vs my P0).

### F67 (P0, rare) -> issue 12 [FULL]

**Restore writes the snapshot into whichever note is the active tab, not the inspected file**

Issue 12 root cause: 'file-history.service.ts:86-99 (filePath is only null-checked; the dispatch goes to editorStore.editorView and saveCurrentFile saves activeTab)'. Fix: 'Restore by fileHistoryStore.filePath: dispatch to the view only if that path is the active markdown tab; otherwise update the tab by path or write the file directly.' The fix works no matter how the active tab changed, so Cmd+O, Cmd+W and Cmd+Shift+[ / ] are all covered.

### F7 (P0, rare) -> issue 02 [FULL]

**Deep-link and daily-note append/prepend discard unsaved edits in the open tab**

Issue 02 lists "Daily-note append/prepend (src/lib/app/deep-link-actions.ts:36-64)" and "Deep-link `new` with append/prepend/overwrite (deep-link.service.ts:254-300)". Its root cause is the same disk read followed by syncExternalContentToEditor(...,true). Its fix is the same as mine: "if an open tab for that path is dirty, `await saveFileByPath(path)`. If it returns false, abort the write and show a toast". Its acceptance criteria include "Daily append, daily prepend, and `new` with append, prepend and overwrite keep ... the unsaved typing" and "When the pre-save fails, nothing is written and the tab stays dirty".

### F97 (P0, occasional) -> issue 17 [FULL]

**Meta-bind writers skip the lossy-frontmatter guard, so a checkbox or select click deletes nested maps, comments and duplicate keys**

Issue 17's title: "Properties panel and meta-bind edits drop YAML comments, nested maps, duplicate keys and anchors." Its root cause: "Same in src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:756 (dispatchMetaBindUpdate). Neither runs detectLossyFrontmatter." Its fix: "Run detectLossyFrontmatter in commitChanges and dispatchMetaBindUpdate. Refuse with the same toast." Its repro already fails for the meta-bind toggle. Same trigger, path, consequence (nested maps, comments, duplicate keys) and fix as F97.

### G2 (P0, occasional) -> issue 17 [FULL]

**A Properties panel edit rewrites the whole frontmatter with no lossy-frontmatter guard: nested maps, comments, anchors and duplicate keys are deleted on the first keystroke, and Cmd+Z cannot bring them back**

Issue 17 covers the same code path (properties.service.ts commitChanges checks only isFrontmatterUnparseable) and the same consequence (comments, nested maps, duplicate keys and anchors dropped, no undo because of addToHistory(false), File History only if saved before). Fix: "Run detectLossyFrontmatter in commitChanges and dispatchMetaBindUpdate. Refuse with the same toast". Verified that detectLossyFrontmatter (properties.logic.ts:412-460) flags comments, anchors and aliases, nested maps and duplicate keys (uniqueKeys:false plus a raw-key set), so the fix catches every element of my scenario. A typed text field goes through the same commitChanges. My optional read-only banner is UX polish, not needed to stop the loss.

### F54 (P1, rare) -> issue 07 [FULL]

**Closed-note write truncates the file before writing and is not atomic**

Issue 07 names the same writer: 'frontmatter-write.service.ts:149 (closed note, base and next exist only as locals in attempt())' and 'The closed-note paths lose the content at once'. Its fix routes the 'frontmatter write ... through a Rust command built on write_atomic'. Its repro also covers the closed-note frontmatter rewrite failing ('closed note: a failed frontmatter rewrite (calendar drag) leaves the note on disk'). Issue 07 calls the force-quit window theoretical, but the same fix covers it.

### F84 (P1, occasional) -> issue 14 [FULL]

**Undo after a note switch or external sync re-inserts deleted text into the wrong note and autosaves it**

Issue 14's root cause: "MarkdownEditor.svelte:230-235 (tab switch) and :329-333 (external sync) dispatch a whole-doc replace with addToHistory=false into one long-lived EditorState whose history() (setup/editor-extensions.ts:130) is never reset." Its trigger includes "Task toggle, link rename and watcher reload take the same external-sync path" and the Properties-panel rewrite. Its fix: "On tab switch, give each tab its own EditorState ... For external syncs, dispatch a minimal diff (or reset history)." That covers the A->B undo, the external-sync undo and the autosave persistence in F84.

### F19 (P2, rare) -> issue 07,41 [FULL]

**Note saves are non-atomic and not serialized per path**

Non-atomic half: issue 07 root cause 'editor.service.ts:168 ... writeTextFile ... opens with truncate:true and then calls write_all, with no temp file, rename or sync', fix 'Route the editor save ... through a Rust command built on write_atomic'. Same-path half: issue 41 root cause 'editor.service.ts:161-177 saveFileByPath has no per-path lock or in-flight check', fix 'Add a per-path promise chain in saveFileByPath (await the in-flight write, then save the current tab.content if it is still dirty)'. saveDirtyTabs (editor.service.ts:183-194) and saveAllDirtyTabs (:234-247) both call saveFileByPath, so that chain serializes the exact overlap F19 describes. The 'save again if still dirty' step also prevents F19's outcome where the tab is left dirty with no autosave timer armed. Issue 41 names different triggers, but its fix is at the shared choke point, so F19's scenario is fixed too.

### F29 (P2, rare) -> issue 10 [FULL]

**Settings file is replaced by defaults on any read or parse failure**

Issue 10, first section: trigger "unreadable or invalid ... a transient read/write I/O error", root cause settings.service.ts:166-178, fix "In the catch: do not write. Rename the bad file to settings.json.corrupt-<ts>, show a toast ... Write settings atomically". Both of my options and the atomic write are covered. The repro asserts both the transient-read and truncated-file cases. The issue also adds the history-purge consequence and the write-back-failure path.

### F47 (P2, rare) -> issue 27 [FULL]

**Rename rewrite skips path-qualified and self-links, leaving them dangling**

Issue 27, section 'Link rewrite on rename skips path-qualified, extension-qualified, self and unsaved links': "replaceWikilinks: compares the whole target 'Work/Plan' with the bare note name, so path-qualified links are never rewritten. link-updater.service.ts:28 filters out oldPath, so self-links in the renamed note are not rewritten." The fix covers both of my sub-cases: "Rewrite the basename part of any target whose basename equals the old name, keeping the path prefix, and handle .md suffix. Include the renamed note's own content and the open dirty tabs in the rewrite set".

### F61 (P2, rare) -> issue 11 [FULL]

**Failed or unparseable manifest load makes the next trash operation overwrite the manifest; Empty Trash then deletes the orphaned notes**

Issue 11 names the unreadable- or empty-manifest trigger ("the manifest is empty or unreadable at open ... and the next delete rewrites it with only the new item"), the root cause trash.service.ts:37-39 and trash.logic.ts:58-66, and Empty Trash deleting unlisted containers. Its repro asserts "a transient manifest read failure at load does not make the next delete drop earlier entries". The fix backs up the manifest, adopts orphan items/<uuid> dirs, limits emptyTrash to listed items and writes atomically. The orphan-adoption fix also covers my variant where parseTrashManifest drops malformed entries, since those containers become orphans and get adopted.

### F79 (P2, rare) -> issue 24 [FULL]

**toggle_task_status has no staleness guard, so a stale line number can flip a different task's checkbox**

Issue 24 matches the trigger, code path and fix. Trigger: "the user inserts a task line above another ... the list stays stale until the throttled version bump (2 s, or up to 10 s ...). Ticking in that window flips the line that now sits at that number." Root cause: parsing.rs:1873-1906 and vault.rs:708-713. Fix: "Pass the task text (or line text/hash) the list displayed. In toggle_task_status_inner, check that the line still matches; on a mismatch, find the task by text or return a stale error." F79's fix is the same. The no-marker no-op case is harmless.

## Low findings (haiku mapping only)

| ID | Coverage | Issues | Only in raw notes | Title |
|---|---|---|---|---|
| F4 | NONE | - |  | Async language load lands on whichever note is open when it resolves |
| F11 | PARTIAL | 33,34 |  | renameType loop iterates the live tab array across awaits, so it can skip a tab |
| F12 | PARTIAL | 14 | yes | Closing a tab whose neighbour has identical content takes the rename branch in MarkdownEditor |
| F17 | PARTIAL | 01,06 | yes | saveAllDirtyTabs is a snapshot, so edits made while it awaits are armed on a timer that callers then destroy |
| F18 | PARTIAL | 01 | yes | Canvas edits pending in the 300 ms persist window are not saved when the window quits |
| F25 | NONE | - |  | openLink scrolls the previously active tab when the target failed to open |
| F26 | PARTIAL | 28 |  | Layout content effect indexes non-markdown tabs through the note-change owner (unverified downstream effect) |
| F31 | PARTIAL | 41 |  | Init continues past its version guard after three awaits and touches the new vault |
| F33 | PARTIAL | 32 | yes | Auto-move for a note saved just before a vault switch is silently dropped |
| F36 | FULL | 28 |  | A failed read of an existing note is treated as a deletion and removes it from the index |
| F37 | PARTIAL | 28 | yes | Overlapping incremental tree patches can overwrite a fresher tree written by a concurrent refresh |
| F38 | NONE | - | yes | Rust debounce never flushes while real events keep arriving less than 500 ms apart |
| F40 | PARTIAL | 09 | yes | Latent prefix mismatch when the vault path contains a symlink component |
| F41 | PARTIAL | 39 | yes | A vault switch during a watcher batch can upsert the old vault's note into the new vault's index |
| F42 | PARTIAL | 28 | yes | Overlapping startWatching calls can leak a vault-files-changed listener |
| F46 | FULL | 43 |  | Case-only rename is refused as already existing on case-insensitive volumes |
| F48 | PARTIAL | 28 |  | Renaming a folder leaves its folder note and _order behind |
| F49 | PARTIAL | 27 | yes | Names containing #, [ or ] are written verbatim into rewritten wikilinks |
| F50 | FULL | 35 |  | A failed backlink lookup aborts the rename after the disk move |
| F51 | FULL | 28 |  | Folder rename or move gives moved notes no FTS5 or semantic rows under the new paths |
| F55 | PARTIAL | 41 | yes | Concurrent writers to one closed note lose an update without error |
| F56 | NONE | - | yes | Write errors on a closed note are rethrown raw and not shown to the user |
| F57 | NONE | - |  | Unquoted [[X]] is read as text but refused as a nested value |
| F58 | PARTIAL | 30 | yes | Closing delimiter matched as a prefix, so the rest of its line is moved and changed |
| F59 | FULL | 42 |  | CRLF notes get LF frontmatter and CRLF body after a write |
| F60 | PARTIAL | 31 | yes | A UTF-8 BOM is dropped on every read and never written back |
| F63 | PARTIAL | 11 | yes | Manifest write failure after a successful move leaves the item visible only until restart, then orphaned until |
| F64 | PARTIAL | 11 | yes | Manifest is saved after the disk op, so a failed save leaves entries that cannot be cleared; emptyTrash commen |
| F65 | FULL | 41 |  | restoreItem checks for an existing destination, then renames; a file appearing in between is silently replaced |
| F66 | PARTIAL | 11 | yes | loadTrash has no vault check, so a slow load can fill the store with a previous vault's items after a switch |
| F69 | FULL | 12 |  | Restore on a non-markdown active tab silently does nothing and closes the dialog |
| F70 | PARTIAL | 12 | yes | Restore reports success when the write to disk failed |
| F71 | PARTIAL | 12 | yes | Restore errors go unhandled and show no message to the user |
| F72 | FULL | 23 |  | History is keyed by path, so a renamed or deleted note's snapshots show up for a new file at the same path |
| F73 | PARTIAL | 12 | yes | Out-of-order snapshot selection shows one snapshot's diff while restoring another |
| F74 | NONE | - | yes | Backup 'show in Finder' can open another snapshot's backup file |
| F75 | NONE | - |  | Diff view renders every unchanged line, which can freeze the dialog on large notes |
| F77 | PARTIAL | 07 |  | write_atomic has no fsync before rename, so a crash can leave an empty or stale note |
| F80 | PARTIAL | 37 | yes | toggle_task_status writes any path the frontend sends, skipping the ensure_safe_write_path check |
| F82 | PARTIAL | 07 | yes | A failed write leaves a partial .tmp file that the file tree shows |
| F83 | PARTIAL | 34 | yes | propagate_type_rename does disk I/O under the VaultIndex write lock on a synchronous command |
| F85 | NONE | - |  | Unclosed or stray $$ line makes the lezer parser swallow the rest of the block structure and hide prose in liv |
| F87 | NONE | - |  | Composition freeze keeps bracket decorations at pre-edit offsets because the stored set is never mapped |
| F89 | NONE | - |  | Callout fold state is keyed by line number, so deleting a folded callout moves its fold onto the next line's c |
| F90 | NONE | - |  | isInsideBlockContext lists CommentBlock, which no grammar produces, so inline handlers run inside %% comment b |
| F93 | NONE | - |  | Wikilink and %% syntax inside inline code is decorated; a plain click on it can create a note |
| F94 | NONE | - |  | Decorations built before the background parse finishes are not rebuilt when it finishes, so notes over about 3 |
| F95 | NONE | - |  | Closing ATX hashes stay visible when the cursor is off the heading line |
| F96 | NONE | - |  | Multi-line setext heading styles only its first line |
| F106 | NONE | - |  | Task checkbox toggled from the keyboard changes the DOM state without writing the note |
| F113 | NONE | - |  | Media finder hides everything up to the next closing tag, including inside fenced code, with no bound |
| F114 | PARTIAL | 30 | yes | Frontmatter fence rule diverges: properties see a closing ----, but the hider needs an exact --- |
| F115 | NONE | - |  | Embed block-id lookup matches by substring, so ^abc returns the line that has ^abcdef |
| F116 | PARTIAL | 16 |  | Embed heading and frontmatter extraction fail on CRLF notes and inside fenced code |
| F117 | NONE | - |  | Indented or blockquoted mermaid/queryjs/collection/meta-bind-button fences get no renderer |
| F120 | NONE | - |  | Pasting a table whose clipboard HTML contains a link merges every cell in the row into one run of text |
| F122 | NONE | - |  | A button whose actions list is malformed next to a valid action writes null into the bound property |
| F123 | FULL | 30 |  | Empty `---\n---` frontmatter gets a second block, and the original delimiters stay in the body |
| F124 | NONE | - |  | Clicking the second of two adjacent wikilinks can open the first one |
| F125 | PARTIAL | 27 | yes | A path-qualified wikilink opens any note with the same basename instead of the named path |
| F131 | FULL | 25 |  | Vault root resolves to a sibling '<Vault>.md' file outside the vault |
| F134 | FULL | 32 |  | Corrupt auto-move rules file is replaced with defaults on the next rule edit |
| F135 | FULL | 32 |  | Corrupt Todoist sent-task file is overwritten, dropping sent history |
| F138 | PARTIAL | 34 | yes | Type rename that collides with a plain root note fails silently |
| F146 | PARTIAL | 04 | yes | Non-silent new on an existing note silently discards the supplied content |
| F148 | FULL | 32 |  | .view icon and query writers bypass the open tab, so a dirty tab can revert the change |
| F154 | FULL | 41 |  | No per-path save serialization: overlapping writes can land out of order or mix bytes |
| F159 | FULL | 28 |  | Self-save TTL (15 s, refreshed on every autosave) makes the watcher skip index rebuilds for genuine external w |
| F159 | FULL | 28 |  | Self-save TTL (15 s, refreshed on every autosave) makes the watcher skip index rebuilds for genuine external w |
| F164 | FULL | 41 |  | Overlapping same-path saves (frontmatter-write tab branch vs an in-flight autosave) can leave older bytes on d |
| F168 | FULL | 41 |  | An autosave that overlaps the rename/move IPC recreates a ghost copy of the note at the old path |
| F187 | PARTIAL | 42 | yes | Line endings and BOM are normalized on the first keystroke (CRLF -> LF for the whole file, BOM dropped); Rust  |
| F188 | PARTIAL | 07 | yes | write_atomic swaps the inode: resets the note's creation time, drops mode/xattrs/Finder tags, does not fsync,  |
| F194 | PARTIAL | 26,28 | yes | open_vault_db failure leaves the session with no file-history snapshots and no external-change reload, and ski |
