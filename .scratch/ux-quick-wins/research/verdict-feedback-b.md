# Verdict: feedback-b (P153 P86 P87 P90 P92 P93 P94 P171 P172 P174 P175)

Refuter pass over `scout-feedback-b.md`, checked at HEAD 085b23c5d (= origin/main). Read-only. Every path:line below was re-read at HEAD.

MVP branch: `git diff --name-only origin/main...origin/mvp-claude` lists, among UI files, only `src/lib/app/AppShell.svelte`, `src/lib/app/SettingsPanel.svelte`, `src/routes/(app)/+layout.svelte`, the claude-code feature folder and `settings.logic.ts` / `settings.store.svelte.ts`. No file in the tickets below is on it (`WordCount.svelte` is imported by `AppShell.svelte:49` but not changed by the branch).

## 1. Final calls

| Id | Final call | Changed | One line |
|----|-----------|---------|----------|
| P153 | QUICK-PART | no (copy refined) | Header, label, +/- chips, column headers ship; Previous/Next change waits. The right side is the file on disk, not the editor buffer, so the copy must not say "current". |
| P86 | QUICK-PART | no | `aria-pressed` on the kanban view trio and the graph mode pair; search and calendar halves are DONE. |
| P87 | QUICK-PART | no | Theme-row keydown guard and the SnapshotList nested button ship; NoteRow pills and CollectionView wait or are ticketed elsewhere. |
| P90 | QUICK-PART | yes (scope narrowed) | Busy confirm ships; the "rejects -> inline error" branch is dropped (no caller can reject), and validation must freeze while busy (stale "already exists" otherwise). |
| P92 | QUICK-PART | no (sequencing added) | Three canvas shadows onto `--shadow-md/xl`; must land after canvas T3, which pins shadows byte-identical; fold into canvas T4 (same three files). |
| P93 | DEFER | no | New Badge primitive with no user-visible change until NoteRow and kanban adopt it; open-itens 204 keeps it. |
| P94 | QUICK, blocked by kanban P03 | yes (hidden data risk found) | The swap moves the sort control from a `<select>` to a `<button>` trigger, which `handleBoardKeydown` does not exempt: Space toggles and Backspace deletes the focused card. Safe only after the kanban P03 guard lands. |
| P171 | QUICK-PART | no (owner gate removed) | Base reduced-motion block in `app.css` for `animate-spin` and `animate-pulse`; the spin treatment gets a default instead of an owner gate. |
| P172 | QUICK-PART | no (missed test pin added) | Count copy only (= open-itens 213, = editor slice P116); `GraphView.test.ts:73` pins the bug ("1 links") and must be corrected. |
| P174 | QUICK-PART (no own ticket) | no | Two unused `Separator` imports; do them inside or right after shell-sidebars-ux 06. |
| P175 | DEFER | no | Pressed fill needs the P85 state tokens and edits the shared `button.svelte`; cursor policy is an owner call over ~148 sites. |

## 2. Per-proposal evidence

### P153. File History diff lacks orientation: QUICK-PART (kept)

Verified: `FileHistoryDialog.svelte:83` prints `formatSnapshotDateTime(...)` plus the raw epoch in `({timestamp})`; `:84` prints `formatSnapshotLabel(selectedSnapshotIndex)`, and `file-history.logic.ts:46-50` returns "Current" for index 0. `DiffViewer.svelte:39-54` is a `tbody`-only table with two unlabelled number columns (`:43-48`). The diff is `compute_diff({ oldContent: snapshot, newContent: currentContent })` (`file-history.service.ts:62-68`).

Refutation attempts:
- Shared component? `DiffViewer` and `SnapshotList` have one consumer each (`FileHistoryDialog.svelte:9-10`). `formatSnapshotLabel` is used only by the dialog and pinned by `file-history.logic.test.ts:79-92` (update those cases, do not delete them).
- Data write? None. Restore (`:40-51`) is not touched.
- Copy accuracy (scout missed this): `currentContent` is `readTextFile(absoluteFilePath)` at dialog open (`file-history.service.ts:28-29`), and neither caller saves first (`commands.ts:448`, `global-keybindings.ts:174`). With a dirty tab the right side is the note as saved on disk, not what the editor shows. So the header reads "Compared with the note on disk" (or "as last saved"), and the right number column reads "Note", not "Now". The left reads "Version".
- E2E: `focus-ring.spec.ts:11-35` opens this dialog and relies only on the `File History: Welcome.md` heading (`:21`) and one focused element; the header text is not asserted. No selector update needed.
- Overlap: feedback-a Q3 (P77) edits the same three files and adds a "No differences" notice and `loadError` / `diffError` states. A "+0 -0" chip next to a "No differences" notice is redundant; one ticket owns both or Q3 lands first and this ticket hides the chips when both counts are 0.

### P86. Segmented controls: QUICK-PART (kept)

Verified DONE halves: `SearchPanel.svelte:242-249` (`role="group"`, `aria-pressed`, `aria-disabled` with the reason); `EventCalendarHeader.svelte:101-112` (`role="tablist"`, `role="tab"`, `aria-selected`).
Still missing: `KanbanView.svelte:464-484` (three buttons, `title` only, no `aria-pressed`); `GraphControls.svelte:44-63` (`aria-label`, no `aria-pressed`).
Refutation attempts: `aria-pressed` and `aria-label` are attributes only; `handleSetViewMode` and `graphViewStore.setMode` (`graph-view.store.svelte.ts:36`, store only) are untouched. `KanbanView.test.ts:71-76` selects toolbar buttons by `title`, so keep `title`. `GraphControls.test.ts:290-296` selects by `aria-label`, unchanged. No E2E selects these buttons (`rg "Board view|Global graph" e2e/specs` finds nothing). Note, not a blocker for this attribute change: the same three buttons are hit by the pre-existing kanban P03 bug (Space on a focused toolbar button reaches `handleBoardKeydown`).
Waits: the SegmentedControl primitive (M, restyles six surfaces), ThemeEditor/Collection tab semantics.

### P87. Nested interactive controls: QUICK-PART (kept)

Verified theme row: `AppearanceSection.svelte:172-178`, `div role="button"` whose `onkeydown` calls `selectTheme` on Enter or Space with no target check; Edit/Duplicate/Delete/Uninstall (`:192-239`) stop only `click` (`handleEdit :111-112`, `handleDuplicate :118-119`, `deleteTheme :92-93`). One more consequence the scout missed: Enter on Delete of a non-active theme first makes it active (keydown), then `deleteTheme` sees it as active and resets to `DEFAULT_THEME_NAME` (`:97-99`), so the user loses their real active theme. The guard fixes that too.
Settings data: `selectTheme` writes `activeTheme` (`:87-89`); the fix only removes an unintended write, and no settings schema changes. `AppearanceSection.svelte` is not on mvp-claude. Keep the diff to the keydown handler (color P85 and feedback-a also touch this file, at `:173` and `:92-103`).
Verified snapshot list: `SnapshotList.svelte:38-62`, a `span role="button"` inside the row `<button>`, Enter only, behind `svelte-ignore node_invalid_placement_ssr` (`:48`). Single consumer. `FileHistoryDialog.test.ts` does not query the reveal control.
Waits: `NoteRow.svelte:113-122` pills (note-list surface, restructure), `CollectionView.svelte:594-670` (shell-sidebars-ux 16).

### P90. Async dialogs: QUICK-PART (kept, scope narrowed)

Verified: `TypeNameDialog.svelte:40-45` sets `open = false` before `await onConfirm(name)`. Two consumers, both in `TypesNavigator.svelte` (`:465-472` new type, `:487-496` rename).

Refutation findings:
1. The scout's "if `onConfirm` rejects, stay open with an inline error" branch is unreachable. `createTypeDefinition` catches and returns `null` (`type-definitions.service.ts:173-196`), `handleNewType` awaits it (`TypesNavigator.svelte:136-140`), and `renameType` catches both stages and returns (`type-definitions.service.ts:220-226`, `:242-246`). No caller rejects. Per the floor rules (no handling for impossible scenarios), drop that branch; use `try { await onConfirm(name) } finally { busy = false; open = false }` so a future throw cannot leave the dialog stuck.
2. Stale validation while busy (scout missed): during the await, `renameItem` and `createFile` update `typeDefinitionsStore`, so `existingTypeNames` (`TypesNavigator.svelte:128-134`) gains the new name and `validate(value)` (`TypeNameDialog.svelte:28`) flips to "already exists". Today the dialog is already closed, so nobody sees it; with a busy dialog the error line (`:65-66`) would flash under the input. The ticket must hold the last valid `error`/`savedName` while busy (or hide the helper line while busy).
3. Blocking close: the shadcn content renders its own X (`dialog-content.svelte:15,36-42`, `showCloseButton`), and the Cancel button sets `open = false` (`:72`). Busy must cover all four exits: Cancel, X, Escape, overlay.
4. The scout says `TypesNavigator.svelte` is edited by shell-sidebars-ux 10. False: 10 touches `PropertiesView.svelte` and `PropertyField.svelte` only. `TypesNavigator.svelte` is named by shell-sidebars-ux 15, 29 (resolved) and 34; the optional `busyLabel` pass-through is one attribute line, rebase-trivial.
5. Data path: the write itself (`renameType`, `propagate_type_rename`, member-note frontmatter) is untouched; only when the dialog closes changes. Side effect worth recording: a modal dialog during the rename keeps keystrokes out of the editor while `renameType` rewrites open tabs (`:231-238`), which narrows the open-itens 089 type-rename race. It does not fix 089; 089 stays open.

### P92. Elevation tokens: QUICK-PART (kept, sequencing added)

Verified literals: `CanvasContextMenu.svelte:187` `0 4px 16px rgba(0, 0, 0, 0.4)`, `CanvasFilePicker.svelte:97` and `CanvasLinkInput.svelte:94` `0 8px 32px rgba(0, 0, 0, 0.5)`. Tokens: `app.css:125-130` in `@theme static` (emitted on `:root` even if no utility uses them), already read from TS (`live-preview/styles.ts:529`, `editor-theme.ts:74`). `--elev-*` exist in both palettes (`app.css:205-209`, `:279-283`). Each overlay has one consumer (`CanvasInner.svelte:23-26`).
Refutation: the canvas scout's T3 (P12 slice, supersedes open-itens 195/196) has acceptance 4 "Node and menu shadows are byte-identical to HEAD" and a guard test that allows `rgba(0` inside `box-shadow`. Shipping this before T3 breaks T3's acceptance; shipping it in parallel conflicts in the same `<style>` blocks. Canvas T4 edits exactly these three files. Fold this slice into T4 (or run it right after T4). With the token, dark menus get a 1px `--elev-ring` (`#ffffff0f`) and a slightly different blur; that is the intended look but only a by-eye check proves it.
Waits: SettingsPanel shadow (`SettingsPanel.svelte:116`, mvp-claude file), Dialog size prop (M), scrim (owner, open-itens 200).

### P93. Badge primitive: DEFER (kept)

`src/lib/components/ui/` has no badge. Value appears only when NoteRow (shell-sidebars-ux surface) and kanban adopt it; the review itself says "adopted when code is next touched". open-itens 204 (ready-for-agent) holds it.

### P94. Native select to Select: QUICK (kept), now blocked by kanban P03

Verified: the only native `<select>` under `src/lib` is `KanbanView.svelte:488-496`; the graph selects were migrated in 7e0a314ea (`GraphControls.svelte:9`, `Select.Root` usage), open-itens 208 is `wontfix`.

Hidden data risk (scout missed it): `handleBoardKeydown` is on the root that wraps the toolbar (`KanbanView.svelte:460`) and exempts only `INPUT`, `TEXTAREA` and `SELECT` targets (`:240`). It acts on store focus (`kanbanStore.focusedLaneIndex/ItemIndex`, `:245-246`), which survives Tab into the toolbar. The bits-ui trigger is a `<button>`, and its keydown handler (`node_modules/bits-ui/dist/bits/select/select.svelte.js:705-717`, v2.20.6) calls `preventDefault` but never `stopPropagation`. After the swap, with a card focused:
- Space or Enter on the sort trigger opens the menu and also toggles (`:294-299`, `handleToggleItem` writes the `.kanban` file) or starts editing (`:282-288`) the focused card;
- Backspace or Delete on the trigger deletes the focused card (`:301-312`); kanban has no undo;
- ArrowUp/Down move the card ring while the menu opens; typing `n` steals focus to the add-card input (`:314-324`).
Today the native `<select>` is exempt, so the swap opens a new delete path on a daily-use surface. The kanban scout's P03 slice replaces the tag check with `e.target === e.currentTarget` (`scout-kanban.md:45-50`), which closes it. So P94 is QUICK only with "Blocked by: kanban P03 ticket" and a regression test for exactly this path.
Other checks: `allowDeselect` defaults to false (`select/components/select.svelte:24`), and re-picking the current item only closes the menu (`select.svelte.js:1078-1083`, `:464-468`), so no empty `sortMode` can be written. bits-ui calls `onValueChange` only from user selection, not on mount. Unknown stored values exist (`help/examples/kanban-features/personal-week.kanban:24` `"unchecked"`, open-itens 225). The scout's fallback "Manual" would claim manual order while drag is off (`canReorderItems`, `kanban.logic.ts:933-934`); show the raw value or "Custom sort" instead. No E2E uses the kanban sort select. The kanban scout's P02 chip sits right after this control (`:486-497`): sequence.

### P171. Reduced motion: QUICK-PART (kept, owner gate removed)

Verified: the only `prefers-reduced-motion` in `src` is `EventCalendarView.svelte:284`; 13 `animate-spin`/`animate-pulse` uses under `src/lib` (`Rail.svelte:399` is the pulse); `app.css:1-2` imports `tailwindcss` and `tw-animate-css`, and the file's own layer is `@layer base` (`:493`). An unlayered rule beats every layered utility regardless of specificity (cascade layers), so the block goes outside any `@layer`. `app.css` is not on mvp-claude.
Refutation: no test or E2E depends on animation timing (tests only check class names: `SaveStatus.test.ts`, `RailNoteList*.test.ts`, `EmptyState.test.ts`, `ModDialogHost.test.ts`), and Playwright's default is `reducedMotion: 'no-preference'`. Scout's acceptance 3 ("owner confirms spin treatment before merge") would park an agent run; replace it with a stated default: spin slowed to 1.5 s or more (the pattern Bootstrap uses for its spinners under reduced motion; from memory, not checked) because several spinners have no text label, and `animation: none` on `.animate-pulse`. The owner can flip it in review.
Honest limit: a source-scan test proves the rule exists, not that it applies. A Playwright `page.emulateMedia({ reducedMotion: 'reduce' })` check of the Rail busy dot's computed `animation-name` is the real proof if that state is reachable in a spec; otherwise a manual macOS check.
Waits: `SettingsPanel.svelte:95,117` `fly` (mvp-claude), `EventTimeGrid.svelte:233` and `PropertiesPanel.svelte:69` smooth scroll (their slices).

### P172. Copy drift: QUICK-PART (kept, missed pin added)

Verified: `WordCount.svelte:33` fixed plurals; `GraphView.svelte:556-557` `{simNodes.length} notes &middot; {simLinks.length} links`; `estimateReadingTime` floors at 1 (`word-count.logic.ts`, pinned by its test). The quick slice is exactly open-itens 213 (ready-for-agent), and the editor scout calls the same fix P116 (`scout-editor.md:19,101`): one ticket.
Missed by scout and by 213: `src/tests/lib/plugins/graph-view/GraphView.test.ts:73` asserts `toContain('1 links')`, so the current bug is pinned. The ticket must change it to "1 link" (and assert `not.toContain('1 links')`); that corrects a test that encodes the bug and is not a weakening. `:120,135` ("2 links") stay.
E2E: `word-count.spec.ts:9,15-16,23` use `\d+ words` / `\d+ min read` on `Welcome.md` (many words), and the status-bar test (`:43-83`) types into "Some words here", so the counts stay above 1. No selector update.
Waits: the "Failed to" / "Could not" voice sweep (owner choice, many pinned strings), ellipsis stragglers (settings slices), shortcut hints (canvas T4, P95), "Source mode" (shell-sidebars-ux 25).

### P174. Token hygiene: QUICK-PART, no own ticket (kept)

Verified: `BacklinksPanel.svelte:6` and `OutgoingLinksPanel.svelte:6` import `Separator`, and it is the only occurrence in each file (count 1), so it is unused. 29 raw `text-[Npx]` sites under `src/lib`. shell-sidebars-ux 06 (ready-for-agent) rewrites both panels, and 05 and 07 edit them too. Two deleted import lines need no new test (pure cleanup; `pnpm check` is the check). Add them to 06's checklist when 06 runs, or commit them right after 06. Do not open a ticket for them.
Waits: the `text-[Npx]` lint extension (needs a baseline over other groups' files), radius and z-index tokens.

### P175. Pressed state and cursor policy: DEFER (kept)

The prototype's pressed fill builds on the shared state tokens proposed in color P85; the only shared place to add it is `src/lib/components/ui/button/button.svelte`, which every Button consumer reads (visual change app-wide). The cursor rule is an owner policy over ~148 sites in every group's files. No small, safe part found.

## 3. Final quick tickets

### QB1. File History: say what is compared, label the columns, real reveal button (P153 slice, P87 SnapshotList)

- **Ids:** P153 (slice), P87 (SnapshotList part).
- **Files:** `src/lib/features/file-history/FileHistoryDialog.svelte`, `DiffViewer.svelte`, `SnapshotList.svelte`, `file-history.logic.ts`; tests `src/tests/lib/features/file-history/file-history.logic.test.ts`, `FileHistoryDialog.test.ts`.
- **Sequencing:** same files as feedback-a Q3 (P77). Merge the two into one ticket, or run this one after Q3 lands.
- **What to build:** The diff header reads "Compared with the note on disk" and the snapshot's date and time; the raw epoch goes. The version label reads "Latest saved version", "1 version before the latest", "N versions before the latest". Two chips show "+N" and "-M" line counts from a pure `diffSummary(lines)` in `file-history.logic.ts`, hidden when both are 0 (Q3's "No differences" notice covers that case). The diff table gets a header row: "Version" over the old line numbers, "Note" over the new ones, with `title` text spelling each out. In the snapshot list the reveal control becomes a sibling `<button aria-label="Show backup file in Finder">` next to the row's select button, inside a wrapper that carries the hover and selected background; no `role="button"` inside a `<button>`.
- **Acceptance criteria:**
  1. Failing test first: `diffSummary` counts `insert` and `delete` lines and returns `{ added: 0, removed: 0 }` for `[]` and for all-`equal` lines; `formatSnapshotLabel(0)` is "Latest saved version", `(1)` "1 version before the latest", `(2)` "2 versions before the latest" (the cases at `file-history.logic.test.ts:79-92` are updated, not removed).
  2. Failing test first (`FileHistoryDialog.test.ts`, real `fileHistoryStore`): with a selected snapshot and diff lines from the store, the header contains "Compared with the note on disk", "+N" and "-M", and no 13-digit number.
  3. The diff table has a `thead` whose number cells read "Version" and "Note".
  4. No element with `role="button"` sits inside a `button` in the dialog; the reveal button has an accessible name, works on Enter and Space, and clicking it does not change `fileHistoryStore.selectedSnapshot`.
  5. Restore and `selectSnapshot` tests stay green; `e2e/specs/focus-ring.spec.ts` "a dialog focused as a whole..." still passes.
- **Out:** Previous/Next change navigation.

### QB2. Kanban sort on the themed Select, pressed state on view switches (P94, P86 kanban and graph part)

- **Ids:** P94, P86 (slice).
- **Blocked by:** the kanban slice's P03 ticket (board keydown acts only when `e.target === e.currentTarget`). Do not start before it lands.
- **Files:** `src/lib/plugins/kanban/KanbanView.svelte`, `src/lib/plugins/graph-view/GraphControls.svelte`; tests `src/tests/lib/plugins/kanban/KanbanView.test.ts` (harness `src/tests/fixtures/KanbanViewHarness.svelte`), `src/tests/lib/plugins/graph-view/GraphControls.test.ts`.
- **Sequencing:** kanban P02 adds a chip right after the sort control (`KanbanView.svelte:486-497`); one at a time.
- **What to build:** The kanban sort becomes `Select.Root type="single"` with `Select.Trigger size="sm" aria-label="Sort cards"` and one item per `SORT_LABELS` entry, same recipe as `GraphControls.svelte`; `onValueChange` calls the existing `handleSetSortMode`. A stored `sortMode` that is not a `SORT_LABELS` key shows its raw value (or "Custom sort") in the trigger, never "Manual". The three view buttons get `aria-pressed` for the current mode and an `aria-label` equal to their `title` (keep `title`). The two graph mode buttons get `aria-pressed`.
- **Acceptance criteria:**
  1. Failing test first: no `select` element in the kanban toolbar; opening "Sort cards" lists the six labels in `SORT_LABELS` order; choosing "Text (A→Z)" leaves the harness board with `settings.sortMode === 'text-asc'` through the real `applyChange` (only `kanban.service.js` mocked).
  2. Failing-path regression test: with `kanbanStore.setFocus(0, 0)` on the seeded board, focus the sort trigger and dispatch bubbling `keydown` for Space, Enter, Backspace and `n`; the focused card still exists with the same checked state, `kanbanStore.editingItemId` stays null, and no save is issued. (Fails if QB2 runs without the P03 guard.)
  3. Mounting, and re-choosing the current option, issue no save.
  4. A board whose settings carry `"sortMode": "unchecked"` mounts with no save and a trigger that does not read "Manual".
  5. View buttons: `aria-pressed="true"` only on the current mode, and `clickToolbarButton('List view')` (`KanbanView.test.ts:71-76`) still works; graph: `aria-pressed` follows `graphViewStore.mode`.

### QB3. Keyboard and pending-state fixes: theme row, type name dialog (P87 theme row, P90 slice)

- **Ids:** P87 (theme row), P90 (slice). Two unrelated components; split into two tickets if the runner wants one component per ticket.
- **Files:** `src/lib/core/settings/sections/AppearanceSection.svelte`, `src/lib/features/type-definitions/TypeNameDialog.svelte`, optionally one `busyLabel` attribute in `src/lib/features/rail-shell/TypesNavigator.svelte:487-496`; tests `src/tests/lib/core/settings/AppearanceSection.test.ts`, new `src/tests/lib/features/type-definitions/TypeNameDialog.test.ts`, existing `src/tests/lib/features/rail-shell/TypesNavigator.test.ts`.
- **What to build:** The theme row's keydown selects only when the row itself is the target (`e.target === e.currentTarget`), and Space calls `preventDefault`. `TypeNameDialog` keeps itself open while `onConfirm` runs: the confirm button is disabled and shows a busy label (optional `busyLabel` prop, the rename passes "Updating notes..."), Cancel, the X, Escape and an outside click do nothing while busy, the error and "Saved as" line keep their last pre-confirm state while busy, and the dialog closes in a `finally` once `onConfirm` settles. No inline-error branch for a rejected `onConfirm`.
- **Acceptance criteria:**
  1. Failing test first (`AppearanceSection.test.ts`, real `settingsStore`): a bubbling Enter, and a Space, `keydown` on Duplicate (and on Edit for a user theme) of a non-active row leaves `settingsStore.appearance.activeTheme` unchanged; Enter on Delete of a non-active user theme leaves the previous active theme active; Enter on the row itself still selects it (twin of the click tests at `:418-440`).
  2. Failing test first (`TypeNameDialog.test.ts`, the real component, `onConfirm` a plain function returning a held promise): after Enter, the dialog is still open, the confirm button is disabled and shows the busy label, and Cancel, the X and Escape do not close it; after the promise resolves the dialog closes.
  3. While busy, a `validate` that starts returning an error (simulating the store gaining the new name) does not render an error line.
  4. Enter twice while busy calls `onConfirm` once.
  5. `TypesNavigator.test.ts` new-type and rename flows stay green.

### QB4. Canvas overlays on the elevation tokens (P92 slice)

- **Ids:** P92 (slice).
- **Where:** fold into canvas T4 (same three files), or run right after T4. Must land after canvas T3, whose acceptance pins these shadows byte-identical.
- **Files:** `src/lib/features/canvas/CanvasContextMenu.svelte`, `CanvasFilePicker.svelte`, `CanvasLinkInput.svelte`; test: tighten canvas T3's `canvas-theme-colors.test.ts` (or add one scan next to `canvas-markdown-css.test.ts`).
- **What to build:** `CanvasContextMenu.svelte:187` box-shadow becomes `var(--shadow-md)`; `CanvasFilePicker.svelte:97` and `CanvasLinkInput.svelte:94` become `var(--shadow-xl)`. Nothing else in those rules changes; scrims (`:81`) stay.
- **Acceptance criteria:**
  1. Failing test first: the scan finds no `rgba(` inside a `box-shadow` declaration in the three files (fails today at the three lines above); the scrim allowance stays.
  2. The three declarations read the tokens exactly as above.
  3. By-eye check recorded in the commit body: menu, picker and link dialog in Default (dark) and one light theme (Lavender Haze) show an edge and lift.
  4. Canvas vitest folder and `pnpm check` green.

### QB5. Word count and graph stats read correctly for 0 and 1 (P172 slice = open-itens 213 = editor P116)

- **Ids:** P172 (slice); same work as open-itens 213 and editor-slice P116. One ticket for all three.
- **Files:** `src/lib/plugins/word-count/WordCount.svelte`, `src/lib/plugins/graph-view/GraphView.svelte`, `src/lib/plugins/graph-view/graph-view.logic.ts`; tests new `src/tests/lib/plugins/word-count/WordCount.test.ts`, `graph-view.logic.test.ts`, `GraphView.test.ts`.
- **What to build:** "1 word", "1 character", and no reading-time segment (and its separator) at 0 words; `estimateReadingTime` unchanged. A pure `formatGraphStats(noteCount, linkCount)` in `graph-view.logic.ts` ("1 note · 1 link", "2 notes · 3 links") rendered by the graph footer.
- **Acceptance criteria:**
  1. Failing test first: `formatGraphStats` (0,0) "0 notes · 0 links", (1,1) "1 note · 1 link", (2,3) "2 notes · 3 links".
  2. Failing test first: `WordCount` with the real `editorStore` and an active `.md` tab, fake timers advanced 500 ms: empty shows "0 words" and no "min read"; "hello" shows "1 word", "5 characters", "1 min read"; 250 words shows "2 min read".
  3. `GraphView.test.ts:73` changes from `toContain('1 links')` to `toContain('1 link')` plus `not.toContain('1 links')`; `:120,135` unchanged.
  4. `estimateReadingTime` and its tests unchanged; no inline pluralization left in the graph footer.
  5. `bash scripts/e2e.sh e2e/specs/word-count.spec.ts` passes.

### QB6. Reduced-motion base rule (P171 slice)

- **Ids:** P171 (slice).
- **Files:** `src/app.css`; a source-scan test under `src/tests/lib/` (style of `chrome-type-scale.test.ts`), plus a Playwright check if a reachable state shows `.animate-pulse` or `.animate-spin`.
- **What to build:** One unlayered `@media (prefers-reduced-motion: reduce)` block in `app.css`: `.animate-pulse { animation: none; }` and `.animate-spin { animation-duration: 1.5s; }` (or slower). A short comment says why the spinner keeps turning (unlabelled spinners must still read as busy).
- **Acceptance criteria:**
  1. Failing test first: `app.css` has an unlayered `prefers-reduced-motion: reduce` block that names `.animate-pulse` and `.animate-spin` (fails today).
  2. If a spec can reach the Rail busy dot or a spinner: with `page.emulateMedia({ reducedMotion: 'reduce' })` the dot's computed `animation-name` is `none`, and the spinner's `animation-duration` is the slowed value; without that state, the commit body records a macOS Reduce motion check.
  3. `EventCalendarView.svelte:284` rule untouched; `pnpm check` and vitest green.

## 4. Deferred list

- P153 part: Previous/Next change buttons (scroll a hunk into view inside `ScrollArea`, a hunk index and focus handling, M).
- P86 part: one SegmentedControl primitive and its selected look over six surfaces (M, owner design call); ThemeEditor and Collection tab semantics (roving model; Collection is shell-sidebars-ux 16).
- P87 part: `NoteRow.svelte:113-122` wikilink pills inside the row button (note-list restructure); theme row as a real radio group (restructure, overlaps color P85).
- P90 part: failure keeps the typed name for the real callers (needs `createTypeDefinition` / `renameType` to report failure, which changes the type-rename write path).
- P92 part: Settings shadow (`SettingsPanel.svelte:116`, on mvp-claude); Dialog size prop sm/md/lg (M, every dialog); Settings scrim (owner, open-itens 200).
- P93: Badge primitive (M, no visible change until NoteRow and kanban adopt it; open-itens 204).
- P171 part: `SettingsPanel` `fly` gating (mvp-claude); JS smooth scroll at `EventTimeGrid.svelte:233` and `PropertiesPanel.svelte:69` (calendar and collection slices).
- P172 part: one voice for "Failed to" / "Could not" across toasts and their pinned tests (owner choice, M); ellipsis stragglers (settings slices); "(Cmd+D)" hints (canvas T4, P95); "Source mode" (shell-sidebars-ux 25).
- P174 part: lint forbidding `text-[Npx]` (needs a per-file baseline over other groups' files, 29 migrations); radius and z-index tokens (theme system, M); dark fallback and stale "today" (separate tickets per the review).
- P175: pressed fill (needs P85 state tokens; edits the shared `button.svelte`) and the cursor policy (owner call, ~148 sites).

## 5. Overlaps

- open-itens 213: fully covered by QB5 (with the `GraphView.test.ts:73` correction 213 lacks). Mark wontfix with a pointer once QB5 exists. Editor P116's quick half is the same ticket.
- open-itens 195 and 196: covered by canvas T3 (canvas verdict's call); QB4 lands after T3.
- open-itens 204 stays open (Badge, InlineAlert). 208 is already wontfix. 225 (example `sortMode`) is independent of QB2 but its "select shows Unchecked first" criterion will read the new trigger.
- open-itens 089 (type-rename keystroke race) is narrowed, not fixed, by QB3's modal busy state; it stays open.
- Live folders, dependencies only: kanban P03 (blocks QB2), kanban P02 (same toolbar lines), canvas T3/T4 (QB4), feedback-a Q3 (QB1 files), shell-sidebars-ux 06 (P174 imports), 15/34 (`TypesNavigator.svelte`, one attribute line), 16 (CollectionView), 25 (source-mode copy).

## 6. Not checked

Visual result of any CSS change; bits-ui Select inside the kanban harness beyond the graph precedent (the keydown bubbling was read in bits-ui 2.20.6 source, not run); whether a Playwright spec can reach the Rail busy state for QB6; the Bootstrap reduced-motion precedent is from memory.
