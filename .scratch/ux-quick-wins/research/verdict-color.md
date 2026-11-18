# Verdict: color slice (P19 P20 P23 P25 P26 P27 P85 P109 P106 P107 P108)

I tried to refute `scout-color.md` by reading the code at HEAD 085b23c5d (equal to `origin/main`). I ran no code. The contrast figures are my own WCAG and OKLab arithmetic on the theme hex values from `src/tests/lib/core/settings/__snapshots__/theme-snapshot.test.ts.snap`.

Verified context:
- **mvp-claude.** `git diff --name-only origin/main...origin/mvp-claude` touches `src/lib/app/AppShell.svelte`, `src/lib/app/SettingsPanel.svelte`, `src/routes/(app)/+layout.svelte`, the `core/settings` store, service, logic and types files, and help 07/19/20. It touches none of the color tickets' files below. The scout missed that its P23 sweep edits two of these files (`AppShell.svelte:191`, `SettingsPanel.svelte:137`).
- **Built-in themes come from code.** `normalizeAppearance` serves them from code (`src/lib/core/settings/theme.logic.ts:363-399`, `builtinsFromCode` since f9aca6d9f, 2026-10-30). Changing a built-in value therefore restyles every vault that uses that theme, and writes nothing to it. User themes keep the full colour set they were saved with.
- **E2E surface the scout missed.** `e2e/specs/focus-ring.spec.ts` reads the ring colour at 50% in two places: the raw-button outline test (`:37-57`, a probe of `color-mix(in oklab, var(--ring) 50%, transparent)`) and `ringToken()` (`:169-177`), which the folder-row box-shadow checks use (`:84,:92`).

## Per proposal

### P19: QUICK-PART (call kept, two parts corrected)
The premise holds. Kanban chip text is `COLOR_PRESET_TEXT` on `COLOR_PRESET_BG` (`src/lib/plugins/kanban/KanbanCardText.svelte:38,76`, `KanbanTableView.svelte:60`). The linear calendar hard-codes `text-white` (`src/lib/features/collection/CollectionLinearCalendarView.svelte:199`), while `barTextColor` exists (`linear-calendar.logic.ts:302-306`) and the block widget already uses it (`collection-block-widget.ts:380`). The rail badge is `text-white` on `var(--rail-c)` (`src/lib/features/rail-shell/Rail.svelte:396`), and only Inbox passes a count (`:169`; `:182,:195` pass 0). White on `#3b82f6` is 3.68:1 and black is 5.71:1.

Refuted:
1. **The 60% share fails on real cards.** The scout's test puts the chip tint on `editorBg`, but a chip sits on its card. An uncoloured card is `bg-background` (`KanbanCard.svelte:158`). A coloured card's inline `background` is the 15% preset over the lane, and the lane is `bg-muted/30` (`KanbanLane.svelte:215`). On that real stack the 60% share gives a worst case of 4.00 on Lavender Haze (yellow tag on a red card) and 5.32 on Default. The scout's test would pass while those chips stay below 4.5. The share has to be 70% (worst 4.96 on Lavender, 6.00 on Default; 65% gives 4.46), and the test must flatten over the real stack.
2. **Sequencing.** Kanban P88 moves the tag-colour popover out of `KanbanCardText.svelte` (`verdict-kanban.md` P88), and P144 rewrites the table card cell (`KanbanTableView.svelte`). Open-itens 230 (ready) rewrites the same bar `style=` block in `CollectionLinearCalendarView.svelte:198-205`. All are one-token conflicts: rebase over whichever lands first.

No data write: the chip colour is computed for display only, and `board.settings.tagColors` keys are untouched. `COLOR_PRESET_TEXT` stays as it is for its other readers (`KanbanCard.svelte:244` swatches, `evaluator.ts:448-462`). QueryJS and collection chips (`evaluator.ts:447-462`, the CodeMirror block widget) stay DEFER, and so do the two tag systems (item 4).

### P20: QUICK-PART (call kept, one consequence stated)
The premise holds. Default `inlineFg: '#93c5fd'` is at `theme.logic.ts:141`. The builder maps it to `emphasis` and `strong` (`theme-builder.logic.ts:220,262`). Deleting it derives both to `fg` (`:220`), which is the prototype's "bold = editor-fg". `--syntax-strong` and `--syntax-emphasis` are read only by `highlight-styles.ts` and `canvas-markdown.css`. This changes a token value and does not rework any decoration, so the live-preview rules are not touched. Lavender Haze is unchanged (15.8 distance).

Weekend part: `CalendarGrid.svelte:45` (headers) and `:58` (days). Moving weekend headers to `text-file-explorer-muted-fg` makes them identical to weekday headers, so the headers no longer mark weekends at all. The weekend-follows-week-start tests (`CalendarGrid.test.ts:61,69`) become "no header is accent". Weekend day numbers stay distinct, muted against `fg`. That is the proposal; state it in the ticket. The calendar slice's CAL-3 ticket (`verdict-calendar-tasks.md:72,153`) edits `CalendarGrid.svelte:56-72`, the same class block, so sequence the two or fold this line into CAL-3.

Section titles wait for shell-sidebars-ux 05, which is still ready-for-agent.

### P23: QUICK-PART (changed: narrowed to the primitives and the base rule)
The premise holds. `ring` is `p.primary` (`theme-builder.logic.ts:237`), which is lifted to 4.5:1 on the editor (`:186`), so full opacity needs no new token.

Refuted, the "replace everywhere" sweep:
- `AppShell.svelte:191` and `SettingsPanel.svelte:137` are mvp-claude files, and `AppShell.test.ts:397-398` pins `ring-ring/50`.
- The pins `Rail.test.ts:55`, `TasksView.test.ts:860` and `MyPeopleSection.test.ts:243` sit in files that live tickets edit: tasks-view-ux 113 and 237-247 (`TasksView.svelte`, `TaskLists.svelte`), and shell-sidebars-ux 15-20, 23-25 and 34 (rail-shell, NoteRow, EditorTabs, EditorView).
- The E2E `ringToken()` (`focus-ring.spec.ts:169-177`) would fail on the folder rows (`:84,:92`) once `FilesNavigator.svelte` changes. That is a helper change, not a selector update.
- `scroll-area.svelte:32` (`ring-ring/10 dark:ring-ring/20` with `focus-visible:ring-4`) is a deliberately faint 4 px ring on 11 importers. At full opacity it would box every focused scroll viewport, which is a design call.
- `aria-invalid:ring-destructive/20` is a standing error state, not a focus indicator, and `aria-invalid:border-destructive` already marks it. A full 3 px red ring on every invalid field is not what the proposal measured.
- Inputs, selects and switches already draw a full-opacity `focus-visible:border-ring` (`input.svelte:29,44`, `select-trigger.svelte:22`, `switch.svelte:18`), so those are the bordered case. The borderless case the review measured is the Button (`button.svelte:7`: on ghost and default variants `border-ring` paints nothing).

Ship:
- `button.svelte:7`: `focus-visible:ring-ring/50` becomes `focus-visible:ring-ring`. The proposal's width is 2 px (prototype `color-contrast-theming.html:217`): use `focus-visible:ring-2` in place of `ring-[3px]`. Skip the offset, because `ring-offset-background` paints the sidebar colour on popover and dialog surfaces.
- `button.svelte:12`: `focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40` becomes `focus-visible:ring-destructive`.
- `dialog-content.svelte:38`: `focus:ring-*` becomes `focus-visible:ring-*`.
- `src/app.css:495` base `outline-ring/50` becomes `outline-ring`, so raw buttons are covered too. The E2E probe at `focus-ring.spec.ts:49` and `ringToken()` (`:173`) move to 100% on purpose.

Feature-site copies of the Button recipe keep `ring-ring/50` until their own folders land. For a while the app shows two ring strengths. State this in the ticket.

### P25: QUICK-PART (kept)
The premise holds: `NoteRow.svelte:70` (`opacity-60`), `:103,:114,:124` (`text-primary/80`), and `SearchResult.svelte:171` (`text-file-explorer-fg/60`). The data attribute that tests read survives (`data-note-row-archived`, `RailNoteList.toolbar.test.ts:342`). No unit test or E2E test pins `opacity-60` on NoteRow (grep of `src/tests` and `e2e`). The prop doc at `NoteRow.svelte:33` ("Dims the row") must change with it.

Sequence: shell-sidebars-ux 15 (ready) moves `archived` into `NoteRowNote` and adds an Inbox check to `NoteRow.svelte`. 19 takes the row `tabindex` (`:67-81`). feedback-b defers the pill restructure at `:113-122`. Land this after 15 and 19. Selected-row text and `--faint-fg` stay DEFER (new tokens).

### P26: DEFER (kept)
The premise holds (`switch.svelte:18`, `input.svelte:43`, `select-trigger.svelte:22`, builder `input: p.borderStrong`, `switchUncheckedBg: p.borderStrong` at `theme-builder.logic.ts:237,252`). It needs a new boundary token or a darker `borderStrong`, which also feeds `hrBorder` (`:271`). Both are a colour decision across every field. Ship it with the P25/P27 pairs pass.

### P27: DEFER (changed from QUICK-PART)
Refuted: the scout's fold (`button.svelte:12` `text-white` to `text-destructive-foreground`) breaks the dark default theme. There `--destructive-foreground` is `#171717` (snapshot `:17`), because `ensureContrast` moves `#f9f9f5` toward black against `#f3333b`. The button keeps `dark:bg-destructive/60`. On the surfaces it sits on (`#333745`, `#313549`, `#2a2e3d`, `#21222e`) the label drops from 6.6-7.3:1 (white) to 2.5-2.7:1. The prototype's After (`#171717` on `#f3333b`, 4.57) also removes the `/60` fill, so every destructive button in dark mode turns bright red with a near-black label. That is an owner-visible restyle, and white passes on both built-in themes today (6.9 dark, 5.1 Lavender). There is no safe quick part: the error-text token and the hover pairs are new theme tokens. DEFER the whole proposal to the contrast-pairs pass with P26.

### P85: DEFER (kept)
The premise holds (`FilesNavigator.svelte:294-297`, `TypesNavigator.svelte:281-283`, `NoteRow.svelte:70`, `TaskLists.svelte:185`, `SettingsPanel.svelte:137` (mvp-claude), `AppearanceSection.svelte:173`). Every slice needs the three state tokens. The only single-surface candidate, the theme list, is also deferred by feedback-b (radio group). Nothing separable.

### P109: QUICK (kept, scope expanded by one file)
The premise holds: the `tabBar: '#5a5c79'` override is at `theme.logic.ts:155`, the builder derives `tabBar: p.sidebarBg` (`theme-builder.logic.ts:238`), and the static fallback is at `app.css:236`.

Missed regression: inactive tabs are `bg-tab-bar ... hover:bg-muted/30` (`EditorTabs.svelte:213`), and Default `muted` is `#242835`, nearly the new strip `#21222e`. Hover feedback drops from 1.29:1 against the strip today to 1.02:1, which is invisible. The ticket must also give inactive tabs a hover that shows on the darker strip, and a test must hold it. Lavender is unaffected: `muted #D5D0E2` over `#edeaf2`.

Other readers only darken with it: navigator headers, the rail strip (`Rail.svelte:283`), the empty-state bands (`AppShell.svelte:258,278`, a token read only, no edit to that mvp-claude file) and `resizable-handle.svelte:42`. `READABILITY_PAIRS` `tabTextActive`/`tabTextInactive` on `tabBar` (`theme-builder.logic.ts:118-119`) gain contrast. `RailNoteList.test.ts:262` only checks the pair exists. `EditorTabs.svelte` is also edited by shell-sidebars-ux 23 (menu) and 34 (wrapper class): those are different lines, so rebase.

### P106: DONE (kept)
`applyStoredTheme()` runs at the top level of `src/routes/(app)/+layout.svelte:36`, added by 7dd276998 ("fix(theme): the start screen uses the last applied theme") and pinned by `theme.service.test.ts:224-230`. The "Match system" pairing is a feature.

### P107: QUICK-PART (kept, open-itens 155 folded in)
The premise holds. Back (`ThemeEditor.svelte:133`) and Cancel (`:149`) call `onCancel` directly. The colour input (`ThemeColorRow.svelte:55-60`) and the hex `Input` (`:62-70`) have no accessible name.

Refuted gap: a confirm on Back and Cancel leaves the other exits (Esc, X, another section; `SettingsPanel.svelte:101-110`) discarding the draft and leaving it painted on `:root` (open-itens 155, ready-for-agent, verified: no teardown in `ThemeEditor.svelte` or `AppearanceSection.svelte`). A confirm on Back alone, while Esc silently keeps the wrong theme on the app, is worse than either fix alone. Fold 155's teardown into the same ticket: an `onDestroy` in `ThemeEditor.svelte` that calls `applyActiveTheme()`, which is idempotent after Save. It must not intercept Esc in `SettingsPanel.svelte`, which is an mvp-claude file. Open-itens 155 is then fully covered. Simple mode, per-token reset and grouping stay DEFER (L).

### P108: QUICK (kept, two corrections)
The premise holds (`AppearanceSection.svelte:44-54` toast plus `catalogStatus = 'error'`; `:261-268` inline error and Retry; `:57-65` install only adds the theme).

Corrections:
1. **The reason has to move inline.** Today only the toast carries the reason (`err.message`, for example "not valid JSON"). The inline text is generic (`:263`). Dropping the toast without moving the reason inline loses information. Both tests that pin the toast change: `AppearanceSection.test.ts:316` and `:327`.
2. **One settings write for "Install and apply".** Use `settingsStore.updateAppearance({ ...result.appearance, activeTheme: pkg.name })` then `applyActiveTheme()`. `installThemePackage` names the theme `pkg.name` (`theme-package.logic.ts:212-219`). This writes an existing settings key and changes no schema.

The first-button queries in the tests (`:90,:92,:105,:139,:157,:182,:210,:232,:267`) must target the button by its text. Open-itens 205 later moves this error box onto `InlineAlert`. It is not covered; sequence after this ticket. feedback-a and feedback-b also edit `AppearanceSection.svelte` (theme-row keydown): rebase.

## Final quick tickets

### Q1: Readable text on coloured fills (P19 part)
- **ids:** P19
- **Files:** `src/lib/utils/color-presets.ts`, `src/lib/plugins/kanban/KanbanCardText.svelte`, `src/lib/plugins/kanban/KanbanTableView.svelte`, `src/lib/features/collection/CollectionLinearCalendarView.svelte`, `src/lib/features/rail-shell/rail-items.logic.ts`, `src/lib/features/rail-shell/Rail.svelte`; tests `src/tests/lib/utils/color-presets.test.ts`, `src/tests/lib/features/rail-shell/rail-items.logic.test.ts`, `Rail.test.ts`, `KanbanView.test.ts`, and a linear-calendar view render test.
- **What to build:**
  - Kanban tag chip text (board and table) becomes `color-mix(in oklab, <preset rgb> 30%, var(--editor-fg))`, from a new `COLOR_PRESET_CHIP_TEXT` map with a 70% share toward the editor foreground. The chip background and the swatches keep `COLOR_PRESET_BG`/`COLOR_PRESET_TEXT`.
  - Linear-calendar bars drop `text-white` and set `color: barTextColor(...)`.
  - The rail badge text is black or white by contrast with the item colour, from a pure helper in `rail-items.logic.ts`. Inbox becomes black on blue.
- **Acceptance:**
  1. Failing test first: in `color-presets.test.ts`, for every tag preset on both built-in themes, the chip text against the flattened stack is at least 4.5:1, using `contrastRatio`, `flatten` and `mixColors` from `utils/color.ts`. The stack is the tag tint at 15% over (a) `--background` (an uncoloured card) and (b) each card preset at 15% over `muted` at 30% over `editorBg` (a coloured card on its lane). It fails today (yellow on Lavender 1.57). It would also fail at a 60% share (4.00), which proves the stack is tested.
  2. A pure test: `railBadgeTextColor('#3b82f6')` is `#000000`, a dark navy is `#ffffff`, and an unparseable value falls back to `var(--primary-foreground)`. `Rail.test.ts:451-457` moves on purpose: the pill has no `text-white` and its `style` colour is black.
  3. A linear-calendar render test: the bar's `style` attribute carries `color: #000000` for a light `COLOR_PALETTE` hue and `var(--primary-foreground)` for the `var(--primary)` fallback.
  4. `KanbanView.test.ts`: a `#tag` chip's `style` contains `color-mix` and `--editor-fg`, and the colour swatches still use the full preset.
  5. `pnpm check` and `pnpm vitest run`.
- **Order:** rebase over kanban P88/P144 and open-itens 230 if they land first.

### Q2: Default theme, the tab strip and bold off the link hue (P109, P20 part)
- **ids:** P109, P20
- **Files:** `src/lib/core/settings/theme.logic.ts`, `src/app.css`, `src/lib/utils/color.ts`, `src/lib/core/markdown-editor/EditorTabs.svelte`, `src/lib/plugins/calendar/CalendarGrid.svelte`; tests `theme-builder.logic.test.ts`, `theme.logic.test.ts:40`, `theme.service.test.ts:25,32`, `__snapshots__/theme-snapshot.test.ts.snap`, `CalendarGrid.test.ts`, `src/tests/lib/utils/color.test.ts`, an EditorTabs test.
- **What to build:**
  - Delete `tabBar` from the Default overrides and set the static `.dark` fallback (`app.css:236`) to `#21222e`.
  - Give inactive tabs a hover that is visible on the darker strip, in place of `hover:bg-muted/30`. Pick a token that clears 1.1:1 against the strip on both built-in themes, for example `hover:bg-editor-bg/60`.
  - Delete `inlineFg` from Default, so bold and italic derive to `fg`. Set the static `--syntax-emphasis`/`--syntax-strong` at `app.css:292-293` to match.
  - Add `colorDistance(a, b)` (OKLab, x100) to `utils/color.ts`.
  - Weekend headers and days in the mini calendar use muted text, so weekend headers now match weekday headers.
- **Acceptance:**
  1. Failing tests first, in `theme-builder.logic.test.ts` over `BUILTIN_THEMES`. (a) The `tabBar` luminance ratio to `editorBg` is at most 1.5. (b) The inactive-tab hover composite (`flatten` of the chosen token at its alpha over `tabBar`) is at least 1.1:1 against `tabBar`. (c) `colorDistance(strong, link)`, `(emphasis, link)` and `(strong, wikilink.target)` are each at least 12. (a) and (c) fail on Default today (2.08, 10.7). (b) fails on Default once (a) passes with the old hover class (1.02).
  2. `colorDistance` gets its own unit test: equal colours give 0, and the pair `#93c5fd`/`#60a5fa` gives about 10.7.
  3. An EditorTabs test: an inactive tab carries the new hover class and not `hover:bg-muted/30`.
  4. The snapshot, `theme.logic.test.ts:40` and `theme.service.test.ts:25,32` move on purpose to the new `--tab-bar`, `--syntax-strong` and `--syntax-emphasis`.
  5. `CalendarGrid.test.ts:61,69,71`: weekend headers and weekend days carry `text-file-explorer-muted-fg`, never `text-file-explorer-primary`. Today keeps `ring-1`, and the selected day keeps `bg-file-explorer-primary` (`CalendarNavigator.test.ts:50`, `rail-shell.spec.ts:1000`).
  6. `READABILITY_PAIRS` still pass on both themes.
  7. `pnpm check` and `pnpm vitest run`. The commit says the dark screenshots were not checked by eye.
- **Order:** after open-itens 194 if it runs (same Default block and snapshot). Rebase over shell-sidebars-ux 23 and 34 (`EditorTabs.svelte`). CalendarGrid: sequence with calendar CAL-3, or move item 5 into CAL-3.

### Q3: Full-strength keyboard focus on Button, dialog close and raw buttons (P23 part)
- **ids:** P23
- **Files:** `src/lib/components/ui/button/button.svelte`, `src/lib/components/ui/dialog/dialog-content.svelte`, `src/app.css` (`:495`), `e2e/specs/focus-ring.spec.ts`, new `src/tests/lib/focus-ring-styles.test.ts`.
- **What to build:**
  - The Button base focus ring becomes `focus-visible:ring-2 focus-visible:ring-ring`, with no `/50` and no 3 px width.
  - The destructive variant's focus ring becomes `focus-visible:ring-destructive`.
  - The dialog close button rings only on `focus-visible`.
  - The base outline becomes `outline-ring`.
  - Input, select, switch, scroll-area, `aria-invalid` rings and feature-file copies are untouched.
- **Acceptance:**
  1. Failing test first, a source scan of `button.svelte`, `dialog-content.svelte` and `app.css`. It has no `ring-ring/NN` on a `focus-visible:` variant, no `ring-destructive/NN` on a `focus-visible:` variant, no `focus:ring`, and no `outline-ring/NN` in the base layer. It fails today.
  2. The scan's self-test: `focus-visible:ring-ring/50` and `dark:focus-visible:ring-destructive/40` match, while `focus-visible:ring-ring`, `ring-offset-2` and `aria-invalid:ring-destructive/20` do not.
  3. A dialog render test: the close button's class has `focus-visible:ring-2` and no `focus:ring-2`.
  4. `focus-ring.spec.ts`: the raw-button probe (`:49`) and `ringToken()` (`:173`) move to `var(--ring)` at full strength on purpose. The folder-row checks (`:84,:92`) keep the old 50% probe under a separate name until FilesNavigator changes, because its rows still use `ring-ring/50`. The first test (`:10-35`) stays green. Run `bash scripts/e2e.sh` for this spec.
  5. `pnpm check` and `pnpm vitest run`. The commit notes that feature-site copies still use the 50% ring.

### Q4: Appearance settings, one catalog error and a safe theme editor (P108, P107 part, open-itens 155)
- **ids:** P108, P107, open-itens 155
- **Files:** `src/lib/core/settings/sections/AppearanceSection.svelte`, `ThemeEditor.svelte`, `ThemeColorRow.svelte`, `help/documentation/26-theming.md` (`:57`, Install bullet); tests `AppearanceSection.test.ts`, `ThemeEditor.test.ts`.
- **What to build:**
  - The catalog failure no longer toasts. The inline error keeps Retry and shows the failure reason.
  - An `install` entry gets a primary "Install and apply" (one `updateAppearance` with `activeTheme: pkg.name`, then `applyActiveTheme()`) and an outline "Install" that keeps today's behaviour. Install failures keep their toast.
  - In the theme editor, Back and Cancel on a dirty draft show an inline "Discard changes?" row with Keep editing and Discard. A clean draft cancels at once.
  - `ThemeEditor` re-applies the active theme in `onDestroy`.
  - The colour picker and the hex field get accessible names from the row label.
- **Acceptance:**
  1. Failing test first: with the catalog fetch rejected (the `theme-catalog.service` network call mocked), `toast.error` is not called, and `theme-catalog-error` shows Retry and the error message. This replaces `:316` and `:327`.
  2. "Install and apply" puts the theme in `settingsStore.appearance.themes`, sets `activeTheme` to it, and `:root --background` equals the built theme's. "Install" leaves `activeTheme` unchanged. A name collision still toasts and changes nothing.
  3. Failing test first (155): with Default active, open Create new theme, change a UI colour through its row input, then unmount without Save. `:root` holds the active theme's value again, and `appliedThemeStore.isDark` matches it.
  4. Back on a clean draft calls `onCancel` once. After one colour change Back shows "Discard changes?", and `onCancel` fires only on Discard.
  5. `getByRole` finds both inputs of a row by its label (the hex one with a "hex" suffix).
  6. The existing first-button queries target the button by its text.
  7. `pnpm check` and `pnpm vitest run`.
- **Order:** rebase over feedback-a/b's AppearanceSection tickets. Open-itens 205 comes after this one.

### Q5: Faded text below 4.5:1 in the note list and search (P25 part)
- **ids:** P25
- **Files:** `src/lib/features/note-list/NoteRow.svelte`, `src/lib/features/search/SearchResult.svelte`; tests under `src/tests/lib/features/note-list/` and `src/tests/lib/features/search/`, plus one contrast test.
- **What to build:**
  - Note-row type and property chips use full `text-primary`.
  - Archived rows lose `opacity-60`; the Archive icon and `data-note-row-archived` stay, and the prop doc changes with it.
  - The search snippet uses `text-file-explorer-muted-fg`.
- **Acceptance:**
  1. Failing test first: on both built-in themes, `primary` on `primary` at 10% flattened over `fileExplorerBg` is at least 4.5:1. The `/80` composite (`primary` at 80% over that chip) fails on at least one theme (Lavender 3.58).
  2. NoteRow render: an archived row has no `opacity-60` and still has the attribute and the icon.
  3. SearchResult: the snippet has `text-file-explorer-muted-fg` and no `/60`.
  4. `pnpm check` and `pnpm vitest run`.
- **Order:** after shell-sidebars-ux 15 and 19 (`NoteRow.svelte`).

## Deferred
- P19 part: QueryJS and collection chips (`evaluator.ts:447-462`, CodeMirror block widget, live-preview rules). Kanban tag colours onto `tag-colors.ts` (changes `.kanban` `tagColors` keys).
- P20 part: section titles to foreground, after shell-sidebars-ux 05.
- P23 part: the `--focus-ring` token and utility, the feature-site sweep (mvp-claude `AppShell`/`SettingsPanel`, tasks-view-ux and shell-sidebars-ux files, unit pins), the scroll-area ring, the `aria-invalid` rings, and rings on `outline-none` inputs.
- P25 part: selected-row subtitle and chips (`--chip-fg`, `--state-selected-muted-fg`), `--faint-fg`, and property value alphas (shell-sidebars-ux 04/10/11).
- P26: control-boundary tokens and a darker `borderStrong`, a colour decision across every field (M).
- P27: the destructive label on `destructive-foreground` measures 2.5-2.7:1 on the dark `/60` fill, and fixing it restyles every dark destructive button. Also the error-text token and the hover pairs (M).
- P85: state tokens across navigators, note list, Tasks lists and settings nav (M, live folders, mvp-claude `SettingsPanel`).
- P107 part: Simple mode through `buildTheme`, per-token reset, grouping (L).

## Overlaps
- Open-itens 155 is fully covered by Q4: mark it wontfix with a pointer to Q4.
- Open-itens 194 (same Default block as Q2), 230 (same linear-calendar bar block as Q1) and 205 (moves the Q4 error box onto `InlineAlert`) are not covered. Sequence with them.
- Live folders: shell-sidebars-ux 05 (P20 titles), 15 and 19 (Q5), 23 and 34 (Q2 `EditorTabs`), 30 (needs-info, `Rail.svelte` hints, Q1). Tasks-view-ux owns the `TasksView`/`TaskLists` ring sites (deferred P23).

## Not checked
I ran no app, tests or E2E specs. Ring widths and colours, the darker tab strip and its new hover, and bold in `fg` all need a by-eye check in both themes. jsdom's handling of `color-mix` in inline styles was not tested, so the Q1 criteria read the `style` attribute.
