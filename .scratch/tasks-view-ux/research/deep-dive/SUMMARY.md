# Tasks view ticket chain: deep-dive synthesis

Inputs: all dossiers, refutations and cross-cutting reports in this folder, the tickets in `.scratch/open-itens/issues/`, and the code at HEAD `d2304ac9e`. Nothing was run. Ticket lines are cited as `NNN:line`, and report findings as `refute-111 M1` or `cross-state H2`. Labels: (F) means verified in code or `node_modules` at HEAD. (I) means inference. No chain ticket has landed.

## What I checked in code myself

- **110's `[*]` claim is false.** Rust only accepts ` xX-/?!>` inside the box, so `- [*] foo` is not a task (F `src-tauri/src/vault/parsing.rs:1427,1434`).
- **234's save-on-destroy cannot work.** Svelte removes the `{#if}` branch's DOM, then destroys the children, then runs the teardowns (F `node_modules/svelte/src/internal/client/reactivity/effects.js:518-542`). So `onDestroy` reads `scrollTop` from a detached node.
- **Re-picking a checked radio fires again.** The bits-ui `MenuRadioGroup` setter calls `onValueChange` with no equality check (F `menu-radio-group.svelte:20-27`).
- **vitest `waitFor` moves fake clocks.** It advances fake timers on every check (F `vitest/dist/chunks/index.CZzC1gGg.js:6994`), which affects 234's debounce test.
- **113 names the wrong Svelte warning.** A `keydown` on a role-less div raises `a11y_no_static_element_interactions` (F `svelte/src/compiler/phases/2-analyze/visitors/shared/a11y/index.js:373`).
- **121 misses tests that must go.** `ipc-mirrors.test.ts:99-105` asserts the `FileTaskGroup` allowlist entry. `vault_test.rs:4,7,8` imports used by four section tests plus `index_note`, not one.
- **Relay runs no e2e, no clippy and no build.** `.agent-relay-lite/config.json` lists none of them. CI does run `clippy -D warnings` (F `ci.yml:116,151`).
- **Fixture location.** Shared fixtures live in `src/tests/fixtures/` (F `ls`; `docs/TESTING.md:31`). `src/tests/fixtures/vault-entries.fixture.ts:15` exports `entryV2`, which no report mentioned and which 115 should reuse.
- **Helper signatures.** `vaultRelativeKey(vaultPath: string, ...)` returns null outside the vault. `findInlineTags` uses `/(?:^|\s)#([\p{L}_][\p{L}\d_/-]*)/gmu`. `formatDateWithOffset` exists (`src/lib/utils/date.ts:136`).
- **Command tests.** `commands.test.ts:137` pins 44 commands, and `commands.new-commands.test.ts` has no tasks-service mock.
- **Chip text size.** `src/app.css:76-88` assigns chips to `text-label`, not `text-xs`.
- **The Hash icon.** Commit `d2304ac9e` deleted 108's Hash-icon removal and gives no reason.
- **198's file list is stale.** `src/lib/features/auto-move/` does not exist (the feature is now `auto-organize`), and `UpdateSection.svelte:252` still has `text-green-500`.

## 2.0 Edits that apply to several tickets

- **X1. Run one e2e spec, not the suite.** Applies to 108, 242, 110, 234, 109, 111, 239, 113, 241, 115, 116, 121, 122, 124.
  - Gate text: "`bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts` because <reason>. relay-lite's configured checks do not run e2e: the build step runs this spec before its last commit and reports its pass count, and the reviewer runs it again as a probe and cites the result. Do not run the whole e2e suite."
  - 110 also runs `e2e/specs/event-calendar-tasks.spec.ts`.
  - Process step for the owner: check the e2e result of `Main checks` on main after each delivery.
- **X2. Add clippy to the Rust gates.** Applies to 242, 121, 122, 074. Use the CI clippy command.
- **X3. Name the source-scan tests as targeted checks.** Applies to every ticket that edits `TasksView.svelte` or adds a `.logic.ts`: `pane-toolbar`, `menu-item-anatomy`, `chrome-type-scale`, `chrome-state-styles`, the `pure-logic`, `layer-rules` and `feature-cycle` architecture tests, and from 236 on `tasks-palette.test.ts`.
- **X4. One shared fixture, `src/tests/fixtures/tasks.fixture.ts`, created by 110.**
  - It holds the task and group builders, `mockTaskFetch`, `mountTasksView` and `openMenu`. The `openMenu` recipe is `PropertiesView.test.ts:233-240`.
  - Every later component test serves tasks through `mockTaskFetch`.
  - 111, 113, 240 and 241 put their component tests in their own `TasksView.<topic>.test.ts` file.
- **X5. Name the allowed boundary mocks.** Applies to 234, 241, 243, 129: `svelte-sonner`, `debug.js` or a `console.error` spy, `plugin-opener`, and `theme.service`.
- **X6. Visual checks the agent cannot do.** For 234, 236, 109, 239, 198, the delivery comment says the visual was not checked by eye, and the owner checks it after the merge.
- **X7. Run order.** 108, 242, 110, 234, 236, 109, 111, 238, 239, 113, 112, 240, 241, 115, then 116, 121, 122 and 129, each after 115. 243 runs after 234 and 030, before 116, and only by number. 074 never runs beside 242 or 121. Drop 198 from 108's series list.

## 2.x Per-ticket must-fix edits (condensed)

**108**
- `setHasLoaded` is called in `finally`, under the request guard.
- The spinner shows only when `hasLoaded && isLoading`.
- The sentence reads the applied tag.
- Stage 2 uses `checked`. Stage 3 with `all` returns 'No tasks found'. Stage 1 counts tasks.
- Keep the Hash icon.
- Fix the help lines at `:5`, `:13` and `:29`.
- Note that a failed first fetch is only logged until 234.
- Replace AC3 and AC4 with exact-text assertions (refute-108 M5, M6).
- Add a service test for `hasLoaded` (success, failure, superseded), tests for the sentence and Clear tag, the Show completed and All time actions, and remount.
- Sources: refute-108 M1-M6, S1-S8, S10; cross-tests L2.

**242**
- The match is the union of per-tag single-tag results, with one scan state per tag and a nested-case test.
- Blank tags are dropped, an empty list means every task, and the type text is `string[]`.
- Dedupe is exact after adding `#`, and a lone `#` is dropped.
- The e2e mock implements the heading rule.
- The e2e test writes its own note and asserts the untagged task is absent. The shared fixture is not edited.
- Add a vitest test of the mock.
- The sentence and empty state parse the tags internally.
- The placeholder test, the `w-40` width, the stale comments, and a note about the ios-poc branch.
- Sources: refute-242 M1-M6, S1-S8; cross-tests M4; cross-rust F6, F14.

**110**
- Remove the `[*]` claim.
- Keep `kind: 'showCompleted'`.
- Add `TASK_STATUSES` with open statuses first (todo, in-progress, question, important, forwarded, done, cancelled).
- The circle's tone is the only color. Fix the stale comment.
- Create the X4 fixture (raw `text` carries the signifiers; every task has a unique `lineNumber`).
- Rewrite the e2e premise.
- Stage 2, count-line, closed-parent, line-through and calendar-guard tests (refute-110 M2, M3, M5, S2, S3).
- Help: a glyph-words column and the "Hide closed" row.
- A grep check for positional selectors.

**234**
- `compareTaskPaths` lives in `tasks.logic.ts`: a module-level Collator plus a raw-order tie-break.
- A scroll listener writes `setScrollOffset`. Never read `scrollTop` in `onDestroy`.
- Store field only; no `tab-view-state`.
- Correct the vault-switch order sentence, and export `getTasksResetGeneration()`.
- `error: string | null` with `setError`.
- The alert sits under the sentence. Its "no list loaded" test is `fileTaskGroups` empty (111 later changes it to `rows`).
- Retry is disabled while loading.
- Test fixes: A/B/C toggle order, scroll event, flush ordering under fake timers, sync converse.
- Add the e2e scroll test.
- Sources: refute-234 M1-M4, S1-S12; cross-state M4, M5; cross-tests M2.

**236**
- Icon markup copied from `EditorView.svelte:56-63`.
- `noteFolder(vaultPath | null, filePath)` and `noteTaskCounts`.
- Circle classes `p-1 -mx-1 -mb-1 -mt-0.5`.
- `data-task-group*` hooks.
- Emoji-pack preload test, date test (units, other year, zero), a self-checking palette test, and the `feature-cycle` baseline diff as the check.
- Sources: refute-236 M1-M5, S1-S5.

**109**
- Export `usesRawTaskText`, using `/\S#[A-Za-z0-9_]/` or an empty description.
- Export `stripTaskTrailers` (trim, block id `[\w-]+`, then the anchor).
- `taskChips(metadata, today, { tags, open })` sets overdue only when open. Chips carry `data-task-chip`.
- `today` is a derived value. Chips use `text-label`.
- Exact Rust-traced description pairs and the raw-path cases.
- Spell out the metadata. Toggle test with the Send-invoice task. e2e with `clockTime`.
- Sources: refute-109 M1-M5, S1-S12; refute-241 M3.

**111**
- Add `noteTaskCount` and `noteOpenCount` to `TaskRow`. `rowsByNote` reads them, which fixes "M".
- `buildTaskRows(groups, vaultPath | null)` with `vaultRelativeKey` and `noteFolder`.
- `TaskQuickFilters`, `DEFAULT_QUICK` and `isQuickFieldDefault`. Setters write `undefined`.
- Status words in `TASK_STATUSES` order. The radio value is `''` while statuses are chosen.
- Ordered empty-state stages.
- Move every `fileTaskGroups` reader to `rows`.
- `setRows` inside the guard. The `visibleRows` shape. Count visibility.
- Delete `filterByDate` and port its cases. Port 110's open-rule cases.
- Dimming, path, `parentLine`, multi-select and dimmed-view tests, plus a service test.
- Sources: refute-111 M1-M8, S1-S9; cross-state H2, H3, M1, M2, M8, L9.

**238**
- One radio group. `Any` is stored as `undefined`.
- Next-7 end computed with `formatDateWithOffset`.
- Every caller passes four arguments, and `applyEditedCutoff` folds into the predicate.
- The Due stage is cumulative.
- Reset Due calls `setQuick({ due: undefined })`.
- `allTime` is removed.
- A "Tests that change on purpose" list.
- Test fixes: December to January under the Sao Paulo time zone, Status All plus Reset Due, store clock test, help text.
- Sources: refute-238 M1-M5, S1, S2, S4-S7; cross-state M1.

**239**
- "No priority" also matches a missing priority.
- `isQuickFieldDefault` is extended to priority, tags and search.
- The search haystack is pinned with Rust's real description.
- Labels in menu order. `taskTagOptions` returns tags without `#`. The empty Tag menu.
- The search box uses a setter, not a binding, with `min-w-0`.
- Narrow mode: the count hides at `@max-[420px]` and the filter row wraps. The folded menu is flat, with `Filters (0)`.
- Snippets or `TasksFilterRow.svelte`.
- Store test, exact-name selectors, e2e with a negative first step.
- Sources: refute-239 M1-M3, S1-S11.

**113**
- No grid wording. Headers keep their tab stops.
- `repeat` in the key input. Arrow keys clamp at the ends.
- `nextCurrentRow` and `tabStopRow` in `tasks-keys.logic.ts`. Focus moves only from body or inside the list.
- Never steal focus from a text field. One attempt per mount.
- Correct svelte-ignore names. No `aria-pressed`.
- Palette test in `commands.new-commands.test.ts`, with the count going to 45.
- e2e "exactly once" through `expect.poll` plus no toast.
- Sources: refute-113 M1-M8, S1-S10; cross-state M6.

**112**
- `TaskGroupKey`, `groupBy` and `setGroupBy`.
- Note groups carry `filePath`, `folder`, `modifiedAt`, `total` and `open` from the row fields. N is `open`.
- Group keys defined. `compareTaskPaths`.
- The breadcrumb is `taskDisplayText` of the parent.
- Flat-group markup and hooks. `order` becomes the flattened groups.
- Focus follows a row that changes group.
- `timeSync` in the debug mocks. Fix the help pointer.
- Tests rewritten to the row fields; Done and Due tests tightened.
- Dropped: the `totals` map parameter.
- Sources: refute-112 M2-M7, S1-S10; cross-state H2, L3.

**240**
- Collapsing never moves focus by code (WebKit and jsdom do not focus a clicked button).
- Collapse and the row cap do not count as removals. `order` keeps collapsed rows.
- One fallback feeds `tabStopRow`, focus on open, and the focus-follow.
- Fixtures pinned for cases (a) to (d).
- No persistence. Key built with `groupBy`. `$state.raw` Set.
- Cap defined on `group.rows`. Rows leave the DOM.
- Focus goes to row 51 after "Show N more".
- Sources: refute-240 M1-M4, S1-S9.

**241**
- Equal status returns early on the client.
- Exact refusal copy.
- Copy uses `stripTaskTrailers`.
- `onCloseAutoFocus` focus handling.
- Capture the reset generation before the write.
- Key rule for F10 and the ContextMenu key. Open the menu with `click()`.
- NoteRow's context-menu pattern. Toast id and dismiss.
- Statuses outside the four. Test mechanics.
- Sources: refute-241 M1-M5, S1-S10; cross-state M5-M7.

**115** (split)
- Row fields: `noteType`, `noteTags`, `archived`, `organized`, `favorite`, `properties`, `headings`, `modifiedAt` × 1000.
- Notes sorted with `compareTaskPaths`. Counts taken after the heading filter.
- `TaskItem` stays. `fromV2` and `fileTaskGroups` are left unused on purpose for 121.
- The whole-tag rule uses `findInlineTags`, with the nested case per Q2.
- `buildTaskIndex` filters by heading.
- Overlay: a module Map, cleared by reset, version read before the await.
- A refusal invalidates the memo. Clear the refresh flag on no-op paths.
- The 243 clause becomes conditional.
- Reset list completed.
- e2e timeouts of 12 s for tests that write a note.
- Failing-first test pair with a fake disk.
- A "Tests that change on purpose" list that names `mockTaskFetch` with `entryV2`.
- Sources: refute-115 M1-M9, S1-S12; cross-state H1-H3, M10, L1; cross-rust F11.

**243**
- Verbatim pass-through in `parseSettings`.
- Load seam `loadSavedTasksView`, called from `initializeVault`, with the lifecycle mock and an invalid-value rule.
- Saving mutates the store through `updateTasksView` in place. Never call `saveSettings`.
- Blocked by 234 and 030.
- Criteria: the 030 protected session, the double-switch path, the flush leaves settings unchanged, the Q1 case.
- Sources: refute-243 M1-M6, S1-S7; cross-persistence H1, M2, L2; cross-tests M1.

**116**
- Blocked by 115 and 243.
- Write-back only for cards holding one tag clause, synchronously, through `updateTasksView`.
- Keep 243's loader, and keep `getTasksResetGeneration`.
- `matchesHeading(row.headings, [text], match)`. Empty clauses are inactive. Strip `#` on both sides. Inline `noteType === 'Type'`.
- Reuse 108's loading text and add `!indexReady` to its gate.
- Fix line references. A "Tests that change on purpose" list.
- Sources: cross-persistence H1, H2, M6, M7, L6; cross-state H4, M13; dossier-116.

**121**
- Remove by grep, not line numbers.
- Remove all four Rust tests, `index_note`, the imports, and what 242 added.
- Replace the `ipc.test.ts` case.
- Type the `ALLOWLIST` and rewrite its self-test.
- Reword the `task.rs` doc and commit the regenerated binding.
- Note the ios-poc branch. Clippy. "No test outside the list changed."
- Sources: cross-rust F1-F6, F12, F13; cross-state M11.

**122**
- Blocked by 115 only; drop 085.
- Describe the locator gap accurately (Q5). After 115, the DTO returns the re-parsed task.
- Update the indexing rules.
- `setPriority` replaces in place. A date-picker Dialog. CRLF limit stated.
- Fix the citations. Split.
- Sources: cross-rust F7-F10; dossier-122.

**123**
- Reuse 243's plumbing. Mapping and what is not saved.
- Invalid-value rule. Writes go through `updateTasksView`.
- Stop the mirror before applying, then restart it.
- Fix the audit-number line. Ready for agent after Q3.
- Sources: cross-persistence M2, M3, H1, L1, L3, L4.

**124**
- Seed from the 123 query or the saved tags, else `#to-list`.
- Disk shape. A behavior-change note.
- Fallback and deletion per Q4. `savedViews: []` never re-seeds.
- Seeding needs no snapshot read. Split.
- Sources: cross-persistence M1, M3-M5, L5.

**129**
- Blocked by 115.
- Error rule per Q6.
- `isQueryModified` moves to 126.
- `TodoistFilter` as the fifth argument. Precedence. Behavior with sync off. Tokens only.
- Sources: cross-tests H2; dossier-129.

**198**
- Use the sites as they are at HEAD; AutoMoveRuleRow is gone.
- The by-eye criterion becomes a delivery note.
- Remove 236's `tasks-palette.test.ts` once this test covers the folder.
- Sources: cross-tests M6; cross-state L8.

**205**
- Launch only by number, after 204.
- Only three tests pin `p.text-meta`.
- Minimum scope (dossier-205).
- Source: cross-tests M7.

**074** (blocks 115; not in the table)
- Make the new fields optional on the wire.
- Never run it beside 242 or 121.
- Clippy.
- Sources: cross-tests H3; cross-rust F15.

## 2.25 Findings dropped, and why

- **Fixture path under `src/tests/lib/features/tasks/`** (refute-110 S1, cross-state H1): the repo puts shared fixtures in `src/tests/fixtures/`, as `docs/TESTING.md:31` says.
- **refute-112 M1's `totals` map:** the row-field design survives 115 and 116 unchanged.
- **refute-111 S5, clearing with `[]`:** three other reports need `undefined`.
- **refute-238 S3's keydown recipe:** not wrong, just replaced by the one shared `openMenu`.
- **cross-state M12's conditional assertion:** no longer needed now that 243 is blocked by 234.
- **cross-persistence H2, "115 blocked by 243":** it would stall the end of the chain on 030. 116 takes the blocker instead.
- **refute-108 S9:** superseded by cross-tests L2, which runs the targeted e2e spec.
- **dossier-123+124's "build 243 yourself":** blocker edges replace it.
- **dossier-116's write-back timer:** it causes a vault-switch race.
- **dossier-129's "either order":** it ignores the risk of 129 and 115 running in parallel.
- **dossier-109's "e2e clock is real":** false; `test-vault.ts:162-176` provides an opt-in clock.
- **dossier-234's `closeTab` path:** false, though its conclusion stands.
- **dossier-121's "`never[]`":** wrong inference, but the outcome is the same.
- **refute-243 M7 against cross-persistence M1:** not dropped; it is owner question Q1.

## 4. Splits and merges

- **Split 115** into 115a (heading rule, no caller, blocked by 074) and 115b (fetch move and overlay, blocked by 115a and 241).
- **Split 116** into 116a (query, excludes, sentence; the textbox still drives the cards) and 116b (panel, textbox removal).
- **111 stays one run**, using X4's own test file. Splitting it into 111a/111b is optional; your call.
- **Split 122** into 122a (Rust, gate Both) and 122b (frontend).
- **Split 124** into 124a (model and migration) and 124b (UI).
- **No merges.** The 235, 237 and 120 merges hold. 243 stays separate because it waits on 030.

## 5. What nobody could verify without running or rendering the app

- **Scroll restore in WKWebView (234):** timing and clamping. The e2e runs Chromium only.
- **WebKit focus:** a clicked button not taking focus, focus on row removal, and the palette's focus restore.
- **Layout and CSS:**
  - the 560 px fold and the 420 px count hide;
  - the chip wrap at 500 px;
  - the circle geometry;
  - the pane width at a 500 px viewport;
  - the textbox width.
- **Colors and contrast in both themes** (198).
- **ICU collation in the webview against Node.**
- **The e2e throttle timing after 115.**
- **Runtime behavior read from source, not run:**
  - a keyed node moving between two `{#each}` blocks;
  - bits-ui menus unmounting after one animation frame in jsdom;
  - whether `error()` and Sentry stay quiet in jsdom;
  - a `$effect.root` mirror under vitest;
  - `vi.mock` reaching `invoke` inside the shared fixture.
- **Performance** on your vault.
- **Your real headings** for Q2, and how many task lines carry anchors.
- **The `feature/ios-poc` build.**
- **Context fit per relay run** (estimated, not measured).
