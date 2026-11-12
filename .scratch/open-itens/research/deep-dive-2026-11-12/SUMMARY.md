# Deep dive 2026-11-12: final prioritized plan

The harness refused the write to `/Users/diegorv/Dev/pet-projects/koko/brain/.scratch/open-itens/research/deep-dive-2026-11-12/SUMMARY.md`, so the full plan is below.

**What this is built on.** The 12 dossiers and 12 refutes for the queue, the 8 sweeps and 4 validations for the rest of the backlog, and the 2 cross-cutting reports in `.scratch/open-itens/research/deep-dive-2026-11-12/`. I only read; nothing was run.

**HEAD.** The refuters and validators checked `318b6e9b5`. Main is now `635b4af36`. The 7 commits since then touch only the tasks and todoist-sync features, `utils/tag-extraction.ts`, their tests, `tasks-view.spec.ts` and `.scratch/tasks-view-ux`. No file named below changed, so every path:line still holds.

## What I re-checked in the code myself (all verified at HEAD)

- **004:** the watcher never re-paths tabs. `fs.watcher.ts:1-9` imports only `refreshTree`, `fsStore` and fs.logic. `updateTabAfterRenameOrMove` has one caller, `path-change.service.ts:185`. `closeTab` asks at `editor.service.ts:313-318` and removes the tab at `:328`.
- **015:** three tests pin the prompt: `editor.service.test.ts:636`, `:647` and `:658`.
- **062:** `inline-markdown.test.ts:97-103` pins `***text***` as bold `*text` followed by `*`. `INLINE_RE` (`inline-markdown.ts:17`) handles only code, `**`, `*` and `~~`.
- **009:** `addView` pushes `{ type, name }` with no uniqueness check (`yaml-parser.ts:353`).
- **067:** `collection-logic.test.ts:669-680` pins the literal `note.` and `property.` keys. The Issue and the ledger both say `Blocked by: 010` (`067-*.md:10`, `ledger.md:104`).
- **068:** the DESC negation is at `collection.logic.ts:206` and `compareForSort` at `:439-444`. The pinned test is `collection-logic.test.ts:704`.
- **003:**
  - `destroy()` is called at `tauri-listeners.service.ts:54`.
  - The run closure matches only `ExitRequested` (`lib.rs:401-405`).
  - `default.json` grants `allow-destroy` but not `allow-hide`.
  - `tauri.conf.json` has no `backgroundThrottling`.
  - The locked tauri is 2.12.5. Its `webview_window.rs:1254-1267` says hidden views are suspended after about 5 minutes on macOS 14+.
- **070:** `handleIconSelect`, `handleIconColors` and `handleIconRemove` (`TypesNavigator.svelte:161-187`) have no try/catch.
- **010:** the mod API docs promise that an unknown method does not reject (`mods/13-api-reference.md:136`, `mods/10-querying-the-index.md:17`).
- **094:** plugin-fs `readTextFile` decodes with no fatal flag (`plugin-fs/dist-js/index.js:498`). `default.json` grants only `fs:allow-read-text-file` (`:66`).
- **Slots:** `git worktree list` shows one relay worktree, `issue-238-*`. tasks-view-ux 111 and 248 are done (`8a07b5ca3`, `d3b8d535a`). So 2 of the 3 relay slots are free now, not 1 as cross-order-files M1 says. I did not check whether the `update-tauri-to-v3` or `ios-poc` worktrees run cargo.
- **006:** two Issue files start with 006 (calendar and kanban). The ledger row 006 is the kanban one.

## Before any launch

All 12 queue Issues say `Status: ready-for-agent` and their ledger rows are `todo`. Under the auto-launch rule they can start as written, and every refuter says they need edits first.

- Apply the edits in section 2 in one batched docs commit on main.
- Until you answer section 4, set 002, 010, 043, 067 and 070 to `needs-info`.

## 1. Ranked table

Ranked by impact over complexity and risk. "Src": Q is your queue; A is an addition a validator confirmed (it needs your OK because it is outside the queue).

| Rank | Issue | Title (short) | Src | Still present | Impact | Cx | Risk | Blockers | Run-with | Edits needed |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 003 | Closing the main window keeps Quick Capture, deep links, Dock working | Q | yes | high | S | medium as written, low after edits | none | Any frontend-only Issue. Not beside another cargo run, 043, 038, 098, or tasks 121/122/244 | yes |
| 2 | 014 | Backlinks and Outgoing links show the open note's own links | A | yes | medium-high | S | low-medium | none | Anything outside backlinks/outgoing-links | no |
| 3 | 015 | Closing a dirty tab saves and closes; prompt only on failed save | Q | yes | medium | S | low | 004 | 003, 014, 062, 002, 042, 064, views chain | yes |
| 4 | 004 | Canvas edit closed or renamed inside the debounce window is kept | Q | yes (close case) | low-medium (unblocks 015, 006, 027, 100) | S | low | none | Same as 015. Not beside 039 or 077 | yes |
| 5 | 064 | Wikilink autocomplete keeps a non-markdown file's extension | A | yes | medium | S | low | none | anything | no |
| 6 | 042 | Enter in the quick switcher creates the note on no match | A | yes | medium | S | low | none | anything | yes (minor) |
| 7 | 061 part 2 | Task checkbox reacts only to the primary button | A | yes | medium | S | low | 062 (same `widgets.ts`) | Anything except `widgets.ts` work | yes (split) |
| 8 | 062 | Table cells render links, highlight, `_x_`, `<br>`, `\|` | Q | yes | medium (Issue says high; display only) | M | low | none | 002, editor chain, views chain | yes |
| 9 | 068 | DESC sort lists notes without a value last | Q | yes | medium-low | S | low | 067 | Everything outside the views chain | yes |
| 10 | 002 | Keyboard edits next to hidden frontmatter never change its fences | Q | yes | medium | S-M | medium | none | 062, editor chain, views chain (one E2E per checkout) | yes + Q1 |
| 11 | 043 | Lens lists follow your own rename, trash and create at once | A | yes | medium | S-M | low-medium | 028 (series), 003 (shared test file) | Not beside 028, 003, 094 or tasks 244 | yes + Q5 |
| 12 | 047 | Numeric `<` `>` filters never match a note lacking the property | A | yes | medium-low | S | low-medium | 068 (series, add it) | Outside the views chain and 098 | yes |
| 13 | 055 | HTML link paste keeps bracketed text and table cells | A | yes | low-medium | S | low | none | anything | no |
| 14 | 028 | Duplicate saves unsaved typing before copying | Q | yes | low | S | low | none (file series with 043, 029) | 004, 015, 062, 002, views chain | yes |
| 15 | 010 | Filters report unknown methods (validator half only) | Q | yes | low-medium | S after split (M as written) | low after split | none | Outside the views chain | yes + Q2 |
| 16 | 067 | Columns and sort keys resolve like expressions | Q | yes | low | S | low | 010 (keep it; run 010 first) | Outside the views chain | yes + Q3 |
| 17 | 009 | Tab rename and delete keep `_rail_view` in sync | Q | yes | low | S | low | none | Outside the views chain | yes |
| 18 | 070 | Change icon on a broken .view says why nothing changed (rescoped) | Q | partly (fail-loudly half only) | low | S | low | none | Outside the views chain; not beside 009, 071, 131-135 | yes + Q4 |
| 19 | 012 | Tab-strip menu acts on the right tab; Delete asks first | Q | yes | low | S | low | 010, add 009 | Outside the views chain | yes |
| 20 | 077 | Rename rewrite skips code blocks and updates self links | A | yes | low-medium | S-M | low | 004 (add it) | Not beside 004 or other link-updater work | yes |
| 21 | 161 | Fuzzy search finds close spellings past the first 500 terms | A | yes | low-medium | S | low (Rust only) | none | Any frontend Issue. Not beside 003 or another cargo run | yes |

### Run order

Two relay slots are free now; the tasks lane keeps the third (238, then 239 and so on). Each chain runs in order. Only one cargo-gated run at a time.

- **Slot 1, editor and filesystem:** 004 -> 015 -> 028 -> 043 -> 077.
  - 004 and 015 share `closeTab`.
  - 028 and 043 share `fs.service.ts` and `path-change.service.ts`.
  - 004 and 077 share `link-updater.service.ts`.
- **Slot 2, shell and editor surface:** 003 (cargo; start it when no other cargo run is active) -> 014 -> 064 -> 042 -> 062 -> 061 part 2 -> 002 -> 055.
  - 062 and 061 part 2 share `widgets.ts`.
  - 002 shares no file with 062; its line in the priority file is wrong (cross-order-files L2).
- **Slot 3, views chain, once the tasks lane idles:** 009 -> 070 -> 010 -> 067 -> 068 -> 012 -> 047. Then 161 (cargo), when 003 is not running.

How this differs from your queue:
- **010 runs before 067.** 067 is blocked by 010 in both the Issue and the ledger, and the two edit the same functions in `evaluator.ts` and `collection.logic.ts`.
- **003 gets its own chain.** It is the highest-impact Issue and shares no file with chains 1 and 3.
- **Additions.** Six cheap, confirmed fixes on daily flows: 014, 064, 042, 061 part 2, 043 and 047. A second tier: 055, 077 and 161.

## 2. Must-fix edits per Issue

The full reasoning and the should-fix lists are in `refute-NNN.md`. Apply the one-line should-fix items too. Line numbers are at HEAD.

### 003

1. **Replace** "Cmd+Q with a hidden main window must still flush and exit (exit_decision already asks the frontend while the window exists; a hidden webview still runs)." with:

   > Cmd+Q with a hidden main window must still flush and exit. exit_decision already asks the frontend while the window exists. A hidden webview keeps running only if WebKit does not suspend it: by default a hidden or minimized view's tasks are suspended after about 5 minutes (tauri 2.12.5 webview_window.rs:1254-1267, macOS 14+). Set `"backgroundThrottling": "disabled"` on app.windows[0] in src-tauri/tauri.conf.json. Without it, captures wait until the window is shown, the composer reports 'Save not confirmed', and Cmd+Q waits for a confirm_exit that never comes.

2. **Add this as the first criterion:**

   > - [ ] Failing test first, beside src/tests/lib/architecture/fs-capabilities.test.ts: default.json grants "core:window:allow-hide", and app.windows[0] has backgroundThrottling "disabled". Both fail today.

3. **Move criteria 4-6 to Notes as plain bullets.** No relay role can tick an in-app check, so as checkboxes they would hold back approval (cross-tests-relay H2).

   > **Owner check after delivery (not an acceptance criterion).** Close the main window with the red button, wait at least 6 minutes, then: (a) Ctrl+Alt+Cmd+C on copied text creates its note; (b) the composer saves with no 'Save not confirmed'; (c) Cmd+Q flushes and quits; (d) after another close, a Dock click shows the main window with the vault and tabs intact; (e) the same close from fullscreen.

4. **Replace criterion 3** (`has_visible_windows` is true whenever the composer is shown):

   > - [ ] The Reopen arm unminimizes, shows and focuses 'main' whenever it exists, without reading has_visible_windows. Match it as `#[cfg(target_os = "macos")] RunEvent::Reopen { .. }` in a match with `_ => {}`, and give any helper it calls the same cfg. The reviewer checks the cfg by reading the code, because CI clippy runs on ubuntu (ci.yml:116). No Rust test for the arm.

5. **Add:**

   > - [ ] `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings` passes.

6. **Fix the test references.** The destroy cases run from `tauri-listeners.service.test.ts:224` to `:385`. Add `hide` to the window mock at `:34-40`. The cancel case at `:279` must assert that neither hide nor destroy is called.

7. **Add to Notes:**

   > Out of scope: a non-capture deep link while the window is hidden. Known limit: a discard prompt shown during Cmd+Q belongs to the hidden window.

### 004

1. **Replace criterion 1.** As written, a fix that only flushes passes it: `ask` is unmocked there, returns false, and the 2 s autosave writes A anyway.

   > - [ ] Failing test first, in canvas-tab-switch.test.ts: type into A, advance 100 ms, `await closeTab(tabIndex(A))`, `flushSync()`, advance 3000 ms. Assert: `tabIndex(A) === -1`; `writeTextFile` was called with A's path and the typed text; `ask` was not called (add a `vi.mock` of `@tauri-apps/plugin-dialog`); the neighbour was never written. Fails today.

2. **Replace the last two sentences of What to build:**

   > Add `registerPendingEditFlusher(path, flush): () => void` and `flushPendingEdits(path): boolean` to editor.service.ts. In closeTab, after the pinned check and only for a non-virtual tab, call the flusher; if it returns true, `await saveFileByPath(tabPath)` before the dirty check. Never write a path that has no open tab. CanvasInner registers on mount and unregisters on destroy; unregister removes only its own function. A flusher that throws is logged and does not stop the close.

   This also drops option 2 from the text.

3. **Replace criterion 2.** The watcher never re-paths tabs, and a rename never calls closeTab.

   > - [ ] A programmatic rename or move inside the debounce window (auto-organize at auto-organize.service.ts:338 and :473, or a vault mod's vault.rename / vault.move at mod-vault.service.ts:93 and :100) keeps the typed text. `updateTabAfterRenameOrMove` (link-updater.service.ts:93-109) calls `flushPendingEdits` for each tab it re-paths, before `updateTabPath`. Test it with A renamed to A2: written to A2, never to A.

4. **Above the merged Issue 49 section,** add "Context only, superseded by the criteria above: a close saves and does not prompt (Issue 015 owner decision)". Delete the second Status line at `:39`. The text at `:55` and `:66` says the close "either prompts or saves", which accepts the flush-only fix.

5. **Add to Notes:** quit, vault switch and delete inside the 300 ms window are out of scope. Fix the comment at `CanvasInner.svelte:243-245`. Name `canvas-view.spec.ts` and `editor.spec.ts` as targeted e2e checks.

### 015

1. **Replace the last sentence of What to build:**

   > This changes documented behavior (03-editor.md:129) and three tests that pin the old prompt (editor.service.test.ts:636, :647, :658). The owner approved the new behavior on 2026-11-06; rewrite those tests in this Issue.

2. **Replace AC 6:**

   > - [ ] 03-editor.md:129 describes the new behavior. The tests at :636, :647 and :658 are rewritten, and their Cancel and label assertions move to the failed-save case, so no coverage is dropped. The commit message names them.

3. **Replace AC 5:**

   > - [ ] closeTab calls saveFileByPath(path) again until the tab, re-found by path, is clean or gone, then removes it. If any of those saves fails, it shows the failed-save prompt. Test with a deferred writeTextFile (pattern at :331-343).

   Reason: `writeTab` captures the content before writing (`editor.service.ts:191`), so a keystroke during the write leaves the tab dirty.

4. **AC 2 prompt:**

   ```ts
   ask(`Failed to save ${fileName}. Close anyway and lose unsaved changes?`, { title: 'Unsaved Changes', kind: 'warning', okLabel: 'Close Anyway', cancelLabel: 'Cancel' })
   ```

5. **Add to Notes:**
   - Do not import exit.service.ts (it would create an import cycle).
   - Do not cancel the debounce timers in closeTab.
   - Set the `writeTextFile` and `ask` mocks explicitly in every test.
   - Remove 004's interim save, and run this save after 004's flush.

### 062

1. **Replace AC4:**

   > - [ ] Update inline-markdown.test.ts:60 (==highlight==) and :97-103 (***text***) to the new contract, under the 2026-11-06 owner decision. Keep :65 and :70. Name both in the commit message.

   Add "and `***x***`" to the owner-decision line.

2. **Add a no-false-emphasis criterion:**

   > - [ ] `a_case_b`, `snake_case_name`, `_notes/2026/_journal-day` and `__init__x` render as plain text. `_` is a delimiter only at a word boundary, using `\p{L}\p{N}` with the `u` flag. `a == b == c` stays plain, following highlight-extension.ts:22-27.

3. **Replace AC2 with a parent mousedown spy.** In jsdom the widget sits outside `contentDOM`, so "selection unchanged" passes either way. With the open modifier: `openExternal` is called once, the event is prevented and stopped. With no modifier: nothing is stopped. A right click or macOS Ctrl+click is not opened. A `javascript:` link is not opened, but the event is still stopped.

4. **Escapes:**

   > Backslash escapes follow CommonMark. Inside a code span, only `\|` becomes `|`. Escapes apply only to non-wikilink text. Leave splitRow unchanged (pinned by table.test.ts:189-191). A doubled backslash `\\` in the source (what TSV paste writes) renders one backslash.

5. **Grammar:**

   > `[text](url)` renders as `span.cm-lp-link`, never with an href. `<br>`, `<br/>` and `<br />` work in any case, but stay literal inside code. Nothing nests except `***x***` -> `strong > em`. Highlight uses class `cm-lp-highlight`. Bare URLs are out of scope.

   Also change the Issue's impact from high to medium.

### 009

1. **Replace both What-to-build bullets.** A rename that matches on the old name breaks with duplicate names, and `addView` creates duplicates:

   > - renameView: when `viewIndexByName(views, readRailView(raw._rail_view)) === index`, computed before the change, write the new name as `_rail_view`. Otherwise leave it.
   > - removeView: under the same condition, computed before the splice and after the existing guards, delete `_rail_view`. Otherwise keep it.

2. **Add a test:** with `views: [A, Dup, Dup]` and `_rail_view: Dup`, renaming index 2 leaves `_rail_view` and `railViewIndex` (1) unchanged. Renaming index 1 writes the new name, and `railViewIndex` stays 1.

3. **One-liners:**
   - Mark which tests are red today and which are guards.
   - Add a CollectionView delete case using `diskYaml()`.
   - Add tests for removing an earlier view and for a non-string `_rail_view`.
   - Use the exact replacement text for ADR 0027:40 and help 25:487 from refute-009.

### 070

1. **Retitle:** "Change icon on a broken .view says why nothing changed". **New What to build:**

   > updateViewIconYaml (type-sidebar.logic.ts:546-551) and updateViewColorsYaml (:568-573) throw on YAML that does not parse or is not a mapping, with the messages at :597 and :599. Wrap the `isViewFile` branch of the three icon handlers in TypesNavigator.svelte:161-187 in try/catch like handleRailPin (:198-206): no toast for a ViewWriteError 'save-failed', a toast otherwise, and skip trackRecentIcon on failure.
   >
   > Out of scope: promptIndexRefresh. Icons read fileIconsStore, which the save updates at once (file-icons.service.ts:299-305), and filter fields write on every keystroke (FilterRow.svelte:177).

2. **Make the TypesNavigator component test the first failing criterion.** Replace the bug-pinning tests at `type-sidebar.logic.test.ts:886-892` only after you approve (Q4), and record that approval as a Comment.

3. **Hotspot note:** only JSDoc changes in type-definitions.service.ts.

4. **Add to Notes:** this closes Issue 170 case 4. Never run it beside 009, 071 or 131-135.

### 010

1. **Split the per-note count into a new needs-info Issue.** What counts as a failure is undefined:
   - a missing property throws (`methods.logic.ts:51-57`);
   - `and:` short-circuits, so the count depends on item order (`collection.logic.ts:377-378`);
   - the row rule drops records only after the filter (`lens.logic.ts:717-762`).

   Block 131 on the new Issue. Set Size to S and retitle to "Filters report unknown methods".

2. **Validator rule.**
   - Split the callee at the last dot.
   - When the object is exactly `file`, accept only an exported `FILE_METHODS` (hasTag, inFolder, hasProperty, asLink), with a drift test.
   - Everything else, including methodCall nodes, accepts own keys of `methodRegistry` (never `in`), plus `filter` and `map`.
   - Tests must reject `file.contains('a')`, `now().reverse()` and `x.constructor()`, and accept `file.folder.endsWith('x')`, `now().format('YYYY')` and `x.toString()`.

3. **Contracts that change.** Mod `query.matches` and `query.notes` will reject an unknown method (`mod-query.service.ts:34-36`), and Auto Organize will refuse to save one (`auto-organize.logic.ts:39`, `:521`, `:594`).
   - Add one test for each.
   - Update `mods/13-api-reference.md:136`, `mods/10-querying-the-index.md:17` and `22-auto-organize.md:309`.

4. **Doc marker:** the real one is `view-files.md:137` `(changes: open-itens/010)`, plus item 9 at `:351`.

5. **Notes:** run in series with 009, 067 and 068. Do not copy refute-010's claim that 010 shares `CollectionView.svelte` with 009 (cross L4).

### 067

1. **Resolve keys the way filters do.**
   - Export `resolveFileProperty` and `canonicalPropertyName` from `evaluator.ts`.
   - Make getPropertyValue dispatch like `resolvePropertyPath` (`evaluator.ts:614-631`): `file.*` through resolveFileProperty; `formula.*` reads the stored value; `note.*`, `property.*` and bare keys go through canonicalPropertyName.
   - Never parse the key as an expression, and never use canonicalizeKey.
   - Delete `getCellValue` (`collection-block-widget.ts:492-506`) and call getPropertyValue at `:456`.

2. **Pinned tests.** Add a criterion to rewrite `collection-logic.test.ts:669-674` and `:676-680`, and keep `:663-667`. Record your approval as a Comment (Q3).

3. **Blocker.** Keep `Blocked by: 010` and run 010 first. Add a series note. Do not also remove the blocker.

4. **Docs.** Add a criterion: in `docs/agents/view-files.md`, rewrite `:90-95`, drop the clause at `:149` and remove gotcha 11 at `:353`.

5. **Tests.**
   - The `archived` test is a guard; build its record with `buildNoteRecord`.
   - The type-sort test goes through `executeQuery` with unsorted input.
   - Add `property.` and `note.type` cases.

### 068

1. **Line references:** `compareForSort` is at `collection.logic.ts:438-457`; the sort loop is at `:199-210`, with the negation at `:206`.

2. **Replace criterion 1:**

   > - [ ] Failing tests first: rewrite the test at :704-722 to put nulls last (owner-approved 2026-11-06); a `limit: 2` DESC case over 1, null, 3, missing, 2 returns 3 and 2; a two-level `status ASC, priority DESC` case. The ASC test at :684 stays green.

3. **Owner Comment:** replace ":640-659" with a reference to that test by name.

4. **Rename "view-editor 05" to "Issue 133".** It has not landed, so criterion 3 is a check, not a change.

5. **Add a scope note:**

   > "Without a value" means null or undefined. `""` and `[]` keep today's order. The `""` that the TS edit path briefly holds is out of scope. Existing DESC views will reorder; that is intended.

### 028

1. **Replace criterion 1.** `fs.service.test.ts:32-37` mocks editor.service, so the saved text cannot be seen there.

   > - [ ] Failing test first, in a new duplicate-dirty-tab.test.ts modeled on f165-delete-dirty-tab.test.ts: real stores and real editor, fs and path-change services, an in-memory disk, and a copyFile mock that copies the bytes. With disk 'old' and the tab holding 'new', the copy at '/vault/a copy.md' holds 'new'.

2. **Replace criterion 2:**

   > - [ ] With writeTextFile failing, duplicateItem rejects with PreDeleteSaveError (reused), copyFile is not called, no copy exists, the tab stays dirty, and exactly one toast appears. Export saveDirtyTabsUnder (path-change.service.ts:65-72) and call it first. Update the doc comments at path-change.service.ts:61-64 and fs.logic.ts:155-158.

3. **Line references:** `:65-72`, `:168` and NoteRowMenu `:77-79`. Add `rail-shell.spec.ts:232` as a targeted e2e check.

### 012

1. **Confirm with the native `ask`,** as `FilesNavigator.svelte:195-202` does: message `Delete view "<name>"?` with `{ title: 'Delete view', kind: 'warning', okLabel: 'Delete', cancelLabel: 'Cancel' }`. Cancel writes nothing. The test asserts that `ask` is called once and that a false answer leads to no write.

2. **One ContextMenu.Root per tab,** as in `EditorTabs.svelte:46-110`. The Trigger wraps only the tab button. Delete `tabContextIndex`. Several Triggers under one Root would share one triggerNode (bits-ui `menu.svelte.js:1537`).

3. **Stale-menu test:** close the first menu with Escape, then right-click "+", and query only `[role="menu"][data-state="open"]`. Closed menus stay in the DOM under jsdom (`NoteRowMenu.test.ts:155`).

4. **Also:**
   - The existing delete tests need `ask` resolving true.
   - Keep the tab buttons in the Tab order (the trigger props set tabindex -1).
   - Add a Rename-through-the-menu test.
   - Set `Blocked by: 010, 009` through `relay ledger`.

### 002

1. **Guard `move` edits too.** Replace "A user `input.*` or `delete.*` change" with "a change whose userEvent is `input`, `delete` or `move` (`tr.isUserEvent`)". Alt+ArrowUp (`moveLine`) moves the closing fence today.

2. **Pin the "narrow" behavior:**

   > A changeFilter returns [0, bodyStart], so replace-all still changes the body. A pure insert at 0 returns false. An insert at bodyStart passes. undo and redo pass.

3. **Cmd+A:**

   > Cmd+A and menu Select All select the body only in live preview; source mode is unchanged.

   This needs your answer to Q1 first.

4. **Fix the Notes contradiction:** the e2e at `frontmatter.spec.ts:53-65` changes. Set the Gate to "Frontend + E2E", with the targeted check `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/frontmatter.spec.ts`.

5. **Add jsdom criteria:**
   - `moveLineUp` on the first body line leaves the doc unchanged;
   - a paste at position 0 leaves the doc unchanged;
   - one replace-all dispatch changes only the body occurrence;
   - `selectAll` starts at the first body line;
   - undo after a frontmatter write restores the old text (guard).

   Use full-doc equality in criteria 1 and 2.

### Additions

- **014:** none. The build agent reads `docs/agents/indexing-watcher-rules.md` first.
- **042:** drop the `pnpm build` checkbox. There is no dependency change, and relay never runs that build (CI does).
- **064:** none. It creates `completion.test.ts`, which does not exist yet.
- **061:**
  - Split it. 061 keeps only part 2: a guard at `widgets.ts:41-47` that returns on `e.button !== 0` or `isMacContextClick(e)`.
  - Criteria: buttons 1 and 2 and Ctrl+click leave the doc unchanged; a plain click still toggles.
  - Parts 1 and 3 become new Issues. Drop `pnpm build`. Add `Blocked by: 062`.
- **043:**
  - Mark criterion 3 as a guard or drop it. Its test file mocks fs.service, and the prompt bypass already exists at `tauri-listeners.service.ts:297-303`.
  - Name where the refresh request goes (Q5).
  - Add `Blocked by: 028`, and run it after 003.
- **047:** add a criterion that an auto-organize rule `priority < 3` does not match a note without `priority` (`auto-organize.logic.ts:17` imports the same evaluator). Add `Blocked by: 068`.
- **055:** none.
- **077:** mock `svelte-sonner` for criterion 5. Add `Blocked by: 004`. Rewrite the repro against `replaceWikilinks(content, buildRenameResolution(...))`.
- **161:** replace the 'é' criterion with "the query term is folded like the tokenizer (`remove_diacritics 2`, schema.rs:13) before the range is built". Add the clippy criterion. Confirm with a test that fts5vocab accepts a range on `term`.

## 3. Defer, and close as fixed

### Defer

- **011:** L, a hotspot file, and a rare dialog. You deferred it.
- **013:** present, and medium-high for rail views. Re-ask (Q7); if yes, run it after 012.
- **069, 071:** low impact. 071 is also M and medium risk.
- **076:** L and high risk; your "no core changes for corner cases" rule applies.
- **097:** rare, and it shares the Rust run handler with 003. Revisit after 003.
- **023:** needs a tab change while the dialog is open, and Cmd+Z recovers.
- **Kanban (006, 040, 048, 049, 052):** deferred by you. When Kanban opens, take 040 first, then 052.
- **Canvas other than 004 (026, 027, 038, 039, 050, 051, 100):** deferred. Re-ask 038 + 039 (Q6).
- **Meta-bind (007, 024, 025, 081):** deferred. Re-ask through a vault grep (Q8).
- **.view chain 131-144:** features. 139 and the `!=` part of 141 depend on a vault grep (Q8).
- **094:** its tests would pass while opening any note breaks: `fs:allow-read-file` is not granted. It needs 038 and is a corner case.
- **098, 230:** conditional on usage (Q8).
- **045:** second tier.
- **214:** cosmetic, and its tests are e2e only.
- **159:** the Tags tab is not in daily use.
- **005, 008, 029, 036, 057, 158, 155, 164:** fillers, best done as riders when their files are already open.
- **016-020, 022, 088, rest of 106:** need an external writer.
- **084, 086, 095, 171, 211, 219:** high live-preview or CodeMirror risk.
- **090, 103, 104, 085, 078, 083:** Rust lifecycle or hardening.
- **037, 107, 044, 092, 093, 053, 066:** L or medium risk for low impact.
- **080:** only as a rider on another path-change task.
- **145-150, 153, 154, Phase 6 polish and docs:** not bugs. Batch the docs ones (223-226).
- **031, 054, 079, 082:** low, and their paths still say `auto-move`.

### Close as fixed

No open Issue is fully fixed at HEAD. Already closed: 198 (`1198d8e7b`), 229 (`8ab6672fa`), 151 (`07ec74a68`), 021 (`fc8741157`), 030 (`721ef3a5c`).

Partly fixed; trim the Issue text but keep it open:
- 152: `015f8c18f`. Also drop 151 from its Blocked by.
- 106: `fc37b1370`.
- 105: `3df680423`.
- 102: `f618f44ce`.
- 080: delete leg fixed by `f618f44ce`.
- 020: `fc37b1370`.
- 224: the 3000 ms default is already right.
- 107: may duplicate 037.

### Data hygiene

- Renumber the calendar 006 and give it a ledger row.
- In `priority-2026-11-08.md`, move 002 out of the properties group.
- Move 028 to a new "path-change / link-updater" line together with 043 and 077.
- Add 047 to the views line.

## 4. Questions only you can answer

1. **002:** should Cmd+A in live preview select only the body, so copying leaves out the hidden properties? I recommend yes. If no, 002 goes to needs-info.
2. **010:** split the per-note failure count into its own needs-info Issue, and accept that mods calling `query.*` with an unknown method start rejecting? I recommend yes to both. Grep your mod sources first; I did not check them.
3. **067:** approve rewriting the pinned tests at `collection-logic.test.ts:669-680`, and keep the 010 blocker by running 010 first? I recommend yes.
4. **070:** approve flipping `type-sidebar.logic.test.ts:886-892` and dropping the "refresh promptly" half? I recommend yes. Icons already update at once.
5. **043:** should the prompt refresh fire only from the places you act (row menu, F2, Cmd+N, New here), or inside `applyPathChange`, which also covers auto-organize and mods? I recommend the user entry points only.
6. **Canvas:** un-defer 038 + 039? I recommend yes if you put notes or images on canvases. Both are S, and 038 runs first.
7. **013:** run it right after 012? I recommend yes.
8. **Usage greps:** one vault grep each decides these:
   - 007 and 025: meta-bind inputs you paste into, and buttons that put open/createNote before updateMetadata;
   - 098: `link(` in views;
   - 141: `!= true` or `!= false` in `.view` files;
   - 139: `.view` tables;
   - 230: linear calendar views;
   - 081: unquoted `key: [[...]]` in frontmatter.

   I recommend keeping each one deferred unless its grep finds something.
9. **Additions:** approve 014, 064, 042 and 061 part 2 now, and 043, 047, 055, 077 and 161 after the queue? I recommend yes.

No new decision is needed for 004, 015, 062, 009, 068, 028, 003 or 012. 003 does need you to run the 6-minute hand check from its Notes after delivery.

## What I did not verify

- Nothing was run. Every "fails today" claim comes from reading the code.
- Four claims rest on library source and docs, not on running anything: WebKit suspending a hidden view, CodeMirror's replace-all under a changeFilter, fts5vocab range support, and how bits-ui menus behave in jsdom.
- Usage frequency depends on your vault and mods, which are outside the repo and were not read.
- Whether relay-lite force-launches an Issue whose blocker is not done comes from the ledger's wording, not the relay source.
