# Scout: color slice (P19 P20 P23 P25 P26 P27 P85 P109 P106 P107 P108)

Checked at HEAD 085b23c5d. Prototype: `.scratch/design-review/prototypes/color-contrast-theming.html` (the `SHEET` constant at the bottom holds the computed before/after ratios). Code lives in `src/lib/core/settings/` (theme logic, theme editor, Appearance section), `src/lib/components/ui/` (shadcn primitives), `src/app.css`, and one component each in kanban, collection, rail-shell, note-list, search and calendar. No Rust, no vault file, no frontmatter, no `.canvas`/`.kanban`/`.view` write, no settings schema change in any QUICK item. Themes are stored in settings, but the QUICK items only change values of the two built-in themes or class strings, never the `ThemeColors` shape.

Claude MVP diff (`git diff --stat origin/main...origin/mvp-claude`, 172 files) touches none of the files named below. It does touch `help/documentation/19-settings.md`; the one doc this slice needs is `help/documentation/26-theming.md`, which it does not touch.

Test seam for every ticket: real stores, real `.logic.ts`, real `settingsStore`; mock only Tauri APIs and side-effect services (`theme-catalog.service` is a network call, `svelte-sonner` is the toast service). Two source-scan precedents exist and are the right shape for class-string rules: `src/tests/lib/chrome-state-styles.test.ts` and `src/tests/lib/core/settings/theme-css-contract.test.ts`. Contrast assertions use `contrastRatio`, `flatten`, `mixColors` from `src/lib/utils/color.ts` on the real `KOKOBRAIN_DEFAULT_THEME` and `LAVENDER_HAZE_THEME` tokens.

## Summary table

| id | call | size | one-line reason |
|----|------|------|-----------------|
| P19 | QUICK-PART | S | Ship readable text on kanban tag chips, linear calendar bars and the rail badge; defer QueryJS/collection chips (live-preview rules) and the two-tag-system merge (data) |
| P20 | QUICK-PART | S | Ship bold/italic off the link hue in the default theme plus a distance test, and calendar weekends muted; defer section titles until shell-sidebars-ux 05 |
| P23 | QUICK-PART | S | Ship `ring-ring/50` to full opacity everywhere (token `--ring` is already primary lifted to 4.5:1), destructive ring, dialog close `focus-visible:`; defer a new `--focus-ring` token and the add-a-ring-everywhere sweep |
| P25 | QUICK-PART | S | Ship full-strength snippet and chip text and no `opacity-60` on archived rows; defer selected-row text and the `--faint-fg` tier (new theme tokens) |
| P26 | DEFER | M | Needs new control-border tokens and a built-in theme colour decision (borderStrong, switch track); changes how every field looks |
| P27 | QUICK-PART | S | Ship the destructive Button label on `text-destructive-foreground` (folded into the P23 ticket); defer the separate error-text token (new theme token, M) |
| P85 | DEFER | M | Six-plus selection surfaces plus three new state tokens; touches navigators, note list, Tasks lists, settings nav (shell/tasks exclusions) |
| P109 | QUICK | S | Drop the `tabBar: '#5a5c79'` override so the dark strip derives from `sidebarBg` |
| P106 | DONE | - | `applyStoredTheme()` runs at `src/routes/(app)/+layout.svelte:37` since 7dd276998 (2026-11-05), before the review |
| P107 | QUICK-PART | S | Ship swatch names and a Cancel confirm on a dirty draft; defer Simple mode, per-token reset (L) |
| P108 | QUICK | S | Remove the duplicate toast, add "Install and apply" |

Counts: 3 QUICK-or-QUICK-PART tickets of real weight plus two tiny ones (see candidate tickets). 2 DEFER, 1 DONE, 0 DROP.

## Per-proposal detail

### P19. Categorical colours blind to the theme: QUICK-PART (S)

Premise confirmed at HEAD.
- Kanban chips: `KanbanCardText.svelte:38` and `:76` and `KanbanTableView.svelte:60` set `color: COLOR_PRESET_TEXT[...]` (a fixed `rgb(...)` such as yellow `rgb(234,179,8)`) on `COLOR_PRESET_BG` (the same rgb at 15%). I computed the ratio with the prototype's recipe: yellow on Lavender Haze is 1.57:1, purple on the default theme 2.95:1.
- Linear calendar: `CollectionLinearCalendarView.svelte:199` hard-codes `text-white` on `getBarColor(...)` (`COLOR_PALETTE`, `hsl(.., .., 55-60%)`). `barTextColor()` already exists at `linear-calendar.logic.ts:302` and the monthly block widget already uses it (`collection-block-widget.ts:380`), so the Svelte view is the only place left.
- Rail badge: `Rail.svelte:396` is `text-white` on `var(--rail-c)`. Only the Inbox row passes `count > 0` today (`Rail.svelte:169`; `:182` and `:195` pass 0), so the visible case is white on `#3b82f6` = 3.7:1 at `text-label` size. The prototype's "worst: Favorites" row is a latent case only (ADR-0033 fixes the palette, so the item colours stay).

Ship:
1. `src/lib/utils/color-presets.ts`: export `CHIP_TEXT_FG_SHARE = 0.6` and `COLOR_PRESET_CHIP_TEXT`, each entry `color-mix(in oklab, rgb(r,g,b) 40%, var(--editor-fg))`. `in oklab` matches `mixColors` and is already used in `app.css:436`. I computed that a 60% share toward editor-fg gives a worst case of 5.02 (Lavender) and 5.93 (default) on the 15% tint over `editorBg`; 50% fails on Lavender (4.06). Kanban chip text at the three sites above uses the new map; backgrounds and the colour-pick swatches (`KanbanCardText.svelte:55`) keep `COLOR_PRESET_TEXT`.
2. `CollectionLinearCalendarView.svelte`: drop `text-white`; add `color: {barTextColor(getBarColor(event.colorValue))}` to the bar `style`.
3. `rail-items.logic.ts` (pure): `railBadgeTextColor(color)` returns `#000000` or `#ffffff`, whichever `contrastRatio` favours, and `var(--primary-foreground)` when the colour is not a hex/rgb/oklch. `Rail.svelte:396` drops `text-white` and sets `style:color`. Expected visible effect: the Inbox badge turns black on blue (5.7:1). If the owner dislikes dark text on blue, the alternative that keeps white text is `color-mix(in oklab, var(--rail-c) 75%, black)` as the badge background; say so in the PR.

Defer: (a) QueryJS/collection chips (`collection/expression/evaluator.ts:447-462` feed `color()` output into table cells and QueryJS blocks, and `collection-block-widget.ts` is a CodeMirror widget under `docs/agents/live-preview-rules.md`); (b) moving kanban tag colours onto `tag-colors.ts` names (item 4 of the proposal): it changes `board.settings.tagColors` keys stored in `.kanban` files.

Files: `color-presets.ts`, `KanbanCardText.svelte`, `KanbanTableView.svelte`, `CollectionLinearCalendarView.svelte`, `rail-items.logic.ts`, `Rail.svelte`. Tests: `src/tests/lib/utils/color-presets.test.ts`, `src/tests/lib/features/collection/linear-calendar-logic.test.ts` plus a new render test of the view, `src/tests/lib/features/rail-shell/rail-items.logic.test.ts` and `Rail.test.ts` (already queries `data-rail-badge`).

### P20. One accent colour does seven jobs: QUICK-PART (S)

Premise confirmed. `theme.logic.ts:141` sets `inlineFg: '#93c5fd'` and the builder maps it to both `syntax.emphasis` and `syntax.strong` (`theme-builder.logic.ts:220,262`) next to `linkFg: '#60a5fa'`; the OKLab distance is 10.7 (x100) against 30.3 for the proposed editor foreground. `app.css:292-293` repeats the value as the static `.dark` fallback.

Ship:
1. Default theme only: delete `inlineFg` from `KOKOBRAIN_DEFAULT_THEME` so bold and italic derive to `fg` (`#F8F8F2`). Update the static `--syntax-emphasis`/`--syntax-strong` in `app.css:292-293` to the same value. Lavender Haze is left alone (its own `inlineFg #843C7E` already measures 15.8 from its link, and heading = primary there is the owner's taste, per the review).
2. Add `colorDistance(a, b)` (OKLab, x100) to `src/lib/utils/color.ts` and a test over the built-in themes: strong and emphasis stay at least 12 away from `syntax.link` and `wikilink.target`. The default theme fails it today (10.7).
3. `CalendarGrid.svelte:46` and `:58`: weekends use `text-file-explorer-muted-fg` instead of `text-file-explorer-primary`. Today and the selected day keep their own ring and fill.

Defer: section titles to foreground (`SidebarSection.svelte:46`, `NoteInfo.svelte:44`): shell-sidebars-ux Issue 05 rebuilds those headers (Info "uses the shared header"), so do it after 05 as a one-line follow-up.

Files: `theme.logic.ts`, `app.css`, `utils/color.ts`, `CalendarGrid.svelte`. Tests: `theme.service.test.ts:32`, `theme.logic.test.ts:47`, `__snapshots__/theme-snapshot.test.ts.snap:105,118` (updated on purpose), `theme-builder.logic.test.ts` (distance rule), `CalendarGrid.test.ts` (`isAccent` assertions at `:60` and `:66` change to the muted class).

### P23. Focus ring at 50%: QUICK-PART (S)

Premise confirmed. `--ring` is not a free colour: `theme-builder.logic.ts:237` derives `ring: p.primary`, and `readableCore` lifts primary to 4.5:1 on the editor (`:191`). So the fix needs no new token: dropping the `/50` already gives 4.5:1 or better. The count is 38 `ring-ring/50` class strings across 20 files (`grep -rn "ring-ring/" src/lib`), plus `ring-ring/10`, `ring-ring/20`, 5 `ring-destructive/*` and 3 `focus:ring` sites.

Ship:
- Replace `ring-ring/50` with `ring-ring` everywhere under `src/lib` (class-string edit, widths unchanged; the `-[3px]` shadcn rings stay 3 px, which the owner should glance at once).
- Destructive rings (`aria-invalid:ring-destructive/20`, `/40`, button `focus-visible:ring-destructive/20`) go to full `ring-destructive` (the error colour is lifted to 3:1 on the editor).
- `dialog-content.svelte:38`: `focus:ring-*` becomes `focus-visible:ring-*`, so the close button stops ringing when the dialog opens.
- A source-scan test (shape of `chrome-state-styles.test.ts`) forbids `ring-ring/NN`, `ring-destructive/NN` on `focus`/`focus-visible`/`aria-invalid` variants, and `focus:ring` in `src/lib`. Failing first: it lists the 38 and 3 sites.

Defer: the `--focus-ring` token and `focus-ring` utility, the base `:focus-visible` rule, and adding rings to inputs that use `outline-none` with nothing (`PropertyField.svelte:114,191`, `KanbanView.svelte:489,501`, `TasksView.svelte:921`, `CollectionView.svelte:530`): each is a per-surface design call and the first three files belong to other slices or live folders.

Conflict note: the sweep edits one class token in many files, including kanban, Tasks and rail files other tickets edit. Run it when no sibling ticket is open on those files, or rebase over single-token conflicts.

Files: the 20 files from the grep (`components/ui/button, input, select-trigger, switch, dialog-content` first), new `src/tests/lib/focus-ring-styles.test.ts`.

### P25. Alpha-faded text and selected rows: QUICK-PART (S)

Premise confirmed (`NoteRow.svelte:70,103,114,124`; `SearchResult.svelte:171`; `PropertyField.svelte:131,139`).

I checked the proposal's chip fix with composite maths: full `text-primary` on the chip tint gives 5.25 (Lavender) and 5.44 (default) on an unselected row, up from 3.58 and 4.06 with `/80`. On a selected row (`bg-primary/25`) it only reaches 3.71 and 3.45, so the prototype's `--chip-fg` token is needed there. That part is DEFER.

Ship:
- `SearchResult.svelte:171`: snippet from `text-file-explorer-fg/60` to `text-file-explorer-muted-fg` (the `fileExplorerMutedFg` on `fileExplorerBg` pair is already in `READABILITY_PAIRS`).
- `NoteRow.svelte:103,114,124`: chips from `text-primary/80` to `text-primary`.
- `NoteRow.svelte:70`: drop `opacity-60` on archived rows; the Archive icon and `data-note-row-archived` remain (tests read the data attribute, `RailNoteList.toolbar.test.ts:342`, not the class). This removes the dimmed look the prop doc describes (`NoteRow.svelte:33`), a call the review made.

Defer: selected-row subtitle and chips (need `--state-selected-muted-fg`/`--chip-fg`), `--faint-fg`, and the property value alphas (`PropertyField.svelte`, `PropertiesView.svelte` are shell-sidebars-ux 04/10/11 files).

Sequence: after shell-sidebars-ux 15 and 19 (both edit `NoteRow.svelte`), and after 19 for `SearchResult.svelte`. Tests: `NoteRow` tests under `src/tests/lib/features/note-list/`, search result tests under `src/tests/lib/features/search/`, and a composite-contrast test for unselected chips on both built-in themes using `flatten`.

### P26. Control boundaries fail non-text contrast: DEFER (M)

Premise confirmed (`switch.svelte:18` uses `bg-switch-unchecked-bg` with `border-transparent`; `input.svelte:43` and `select-trigger.svelte:22` use `border-input`; builder maps `input: p.borderStrong`, `switchUncheckedBg: p.borderStrong`, `theme-builder.logic.ts:237,252`). A 3:1 boundary needs either a new `--control-border` token or a darker `borderStrong` in both built-in themes (Lavender today `#D5D0E2` against a 3:1 target of about `#817796`). That changes every field, select and switch in the app and `borderStrong` also feeds `hrBorder`. It is a colour decision plus new `READABILITY_PAIRS`, which the review says to ship with P25/P27 as one contrast-pairs pass. Not a quick fix.

### P27. Error text only held to 3:1: QUICK-PART (S)

Premise confirmed (`theme-builder.logic.ts:187` lifts `error` to 3:1 on the editor only; `button.svelte:12` uses a literal `text-white`).

Ship (folded into the P23 ticket, same file): `button.svelte:12` destructive variant `text-white` becomes `text-destructive-foreground`. The pair `destructiveForeground` on `destructive` is already a 4.5:1 `READABILITY_PAIRS` entry, so custom themes get a guaranteed label. Honest effect: on Lavender Haze white (5.10) becomes `#f1f1f3` (4.52), still passing; the gain is theme-correctness, not contrast.

Defer: the separate error-text token (new `ThemeColors` key, builder, validation, editor row, snapshots, `--error-text` must also be read by `theme-css-contract.test.ts`) and the muted-on-hover pairs. Raising `error` itself to 4.5:1 is not a shortcut: `destructive` is also the fill colour, so it would turn the red buttons salmon.

### P85. Hover and selected states: DEFER (M)

Premise confirmed (selected treatments: `FilesNavigator.svelte:294-297`, `TypesNavigator.svelte:281-283`, `NoteRow.svelte:70`, `TaskLists.svelte:185`, `SettingsPanel.svelte:137`, `AppearanceSection.svelte:173`). Needs three new tokens, `aria-current`/`aria-selected` wiring across navigators, the note list, Tasks lists and the settings nav, and a read of `chrome-state-styles.test.ts`. Touches shell-sidebars-ux (navigators, note list) and tasks-view-ux (`TaskLists`) files, and `Rail.svelte:359-360` is ADR-0033 and stays. No separable slice that does not depend on the tokens.

### P109. Dark tab strip is the brightest surface: QUICK (S)

Premise confirmed: `theme.logic.ts:155` `tabBar: '#5a5c79'` against editor `#2a2e3d` is 2.08:1 by luminance; the builder default is `tabBar: p.sidebarBg` (`theme-builder.logic.ts:238`), `#21222e` here (1.17:1). The active tab already uses the editor background, so nothing else changes. The token also paints the other 40 px bands (`RailNoteList.svelte:774`, `SearchPanel.svelte:233`, `CalendarNavigator.svelte:88`, `AppShell.svelte:258,278`, `EditorView.svelte:154`), so they darken together, which is the intent.

Ship: delete the `tabBar` override from `KOKOBRAIN_DEFAULT_THEME`'s overrides; set `app.css:236` (`.dark` static fallback) to `#21222e`. `tabTextActive #bac5ee` and `tabTextInactive #9ca3c7` only gain contrast on the darker strip.

Files: `theme.logic.ts`, `app.css`. Tests updated on purpose: `theme.service.test.ts:25`, `theme.logic.test.ts:40`, snapshot line 120; add a rule in `theme-builder.logic.test.ts`: in every built-in theme the tab strip is within 1.5:1 luminance of the editor (the prototype's `max: 1.5` bound; Lavender is 1.06). By-eye check of the dark screenshots stays with the owner (an agent cannot run the app).

### P106. Vault picker and first paint ignore the last theme: DONE

`src/routes/(app)/+layout.svelte:37` calls `applyStoredTheme()` synchronously at layout script top level, with a comment saying the start screen needs the mirrored theme. Commit 7dd276998 "fix(theme): the start screen uses the last applied theme" (2026-11-05) added it, and `theme.service.test.ts:222-230` pins it. `app.html:2` still ships `class="dark"` but `ssr = false` (`src/routes/+layout.ts`), so it is replaced before the first Svelte paint. The optional "Match system" pairing is a feature, not polish.

### P107. Theme editor: QUICK-PART (S)

Premise confirmed (`ThemeEditor.svelte:149` Back and `:173-184` Cancel call `onCancel` straight away; `ThemeColorRow.svelte:51-61` picker input has no accessible name).

Ship, in `ThemeEditor.svelte` and `ThemeColorRow.svelte` only:
- The native colour input gets `aria-label={label}` and the hex input an `aria-label` of the same label plus "hex".
- Back and Cancel on a dirty draft (name differs or `draftColors` differs from `theme`) show an inline "Discard changes?" row with Keep editing and Discard; a clean draft cancels at once. No `confirm()`: the app has no window-confirm precedent; use an inline row like the catalog error box.

Defer: Simple mode through `buildTheme`, per-token reset, grouping (L). Open-itens 155 (restore the active theme when the editor is torn down by Esc/X) is a different change in the same file; it is not covered by this slice.

Tests: `src/tests/lib/core/settings/ThemeEditor.test.ts` (render with the real settings store; assert Back calls `onCancel` once when clean, and only after Discard when a colour changed; assert both inputs expose the row label by role/name).

### P108. Catalog reports failure twice: QUICK (S)

Premise confirmed: `AppearanceSection.svelte:44-48` calls `toast.error` and sets `catalogStatus = 'error'`, and `:260-268` renders the inline error with Retry. `installTheme` (`:52-61`) only adds the theme to the list.

Ship in `AppearanceSection.svelte`:
- Remove the `toast.error` in `loadCatalog`; keep the `debug()` line, the inline error and Retry.
- The install button for an `install` entry becomes primary "Install and apply" (calls `installTheme` then, when `result.ok`, `settingsStore.updateAppearance({ activeTheme: pkg.name })` and `applyActiveTheme()`), with a secondary outline "Install" that keeps today's behaviour. Install failures keep their `toast.error` (they are not duplicated inline).
- `help/documentation/26-theming.md:53` gets one line for the new button.

Tests: `AppearanceSection.test.ts`. The existing assertion at `:316` (`toast.error` called with the catalog message) is the old behaviour; the ticket replaces it with `expect(toast.error).not.toHaveBeenCalled()` while `:313` (inline error text) stays. Existing install tests click `querySelector('button')` (first button, `:139,157,182`): they must target "Install" by text now.

## Candidate quick tickets

### Ticket C1: Readable text on coloured fills (P19)
Behaviour: kanban tag chip text mixes 60% toward the editor foreground; linear-calendar bars pick black or white by contrast; the Inbox rail badge picks black or white by contrast. Files: `utils/color-presets.ts`, `KanbanCardText.svelte`, `KanbanTableView.svelte`, `CollectionLinearCalendarView.svelte`, `rail-items.logic.ts`, `Rail.svelte`. Size S (6 files, 3 independent edits).
Acceptance:
1. Failing test first: `color-presets.test.ts` asserts chip text (mixed per `CHIP_TEXT_FG_SHARE`) on the 15% tint over `editorBg` is at least 4.5:1 for all 7 presets on both built-in themes; it fails today (yellow on Lavender 1.57).
2. A render test of `CollectionLinearCalendarView` with one yellow-ish `COLOR_PALETTE` event: the bar's inline `color` is `#000000`, and the `var(--primary)` fallback bar uses `var(--primary-foreground)` (read via `getAttribute('style')`, since jsdom may drop `color-mix`).
3. `railBadgeTextColor('#3b82f6')` is `#000000`, `'#1e3a8a'` is `#ffffff`, an unparseable value falls back to `var(--primary-foreground)` (pure test); `Rail.test.ts` shows the Inbox badge with the computed colour and no `text-white` class.
4. `KanbanView.test.ts`: a `#tag` chip's `style` attribute contains `color-mix` and `--editor-fg`; the colour-swatch buttons still use the full preset colour.
5. `pnpm check` + `pnpm vitest run`.
Order: after the kanban slice's P88/P143 tickets (they edit `KanbanCardText.svelte` lines near `:38,:55,:76`) and after shell-sidebars-ux 29/30 (`Rail.svelte`).

### Ticket C2: Full-strength focus rings and the destructive label (P23, P27 part)
Behaviour: keyboard focus rings are drawn at 100% of `--ring` everywhere; the dialog close button rings only on keyboard focus; the destructive Button label uses the theme token. Files: 20 files with `ring-ring/NN`, `dialog-content.svelte`, `button.svelte`, new `focus-ring-styles.test.ts`. Size S (mechanical, wide).
Acceptance:
1. Failing test first: the source scan lists every `ring-ring/NN`, faded destructive ring and `focus:ring` site in `src/lib`; it passes after the sweep.
2. `src/tests/lib/components/ui/dialog` test: the close button class has `focus-visible:ring-2` and no `focus:ring-2`.
3. A render test of `Button variant="destructive"`: class has `text-destructive-foreground`, not `text-white`.
4. The scan's self-test: positives (`focus-visible:ring-ring/50`, `aria-invalid:ring-destructive/20`) match; negatives (`ring-offset-2`, `focus-visible:ring-ring`) do not.
5. `pnpm check` + `pnpm vitest run`.
Order: last of the class-token sweeps, or the first one merged, so other open tickets rebase over one-token conflicts.

### Ticket C3: Default theme polish, accent is for links and the current place (P109, P20 part)
Behaviour: dark default tab strip and pane bands derive from `sidebarBg`; bold and italic use the editor foreground; mini-calendar weekends use muted text. Files: `theme.logic.ts`, `app.css`, `utils/color.ts`, `CalendarGrid.svelte`. Size S.
Acceptance:
1. Failing tests first: (a) tab strip within 1.5:1 luminance of `editorBg` in both built-in themes, (b) `colorDistance(strong, link)` and `(emphasis, link)` at least 12 in both built-in themes; both fail on the default theme today (2.08 and 10.7).
2. `theme.logic.test.ts`, `theme.service.test.ts` and `theme-snapshot.test.ts.snap` carry the new `--tab-bar`, `--syntax-emphasis`, `--syntax-strong` values; `app.css` static fallbacks match.
3. `CalendarGrid.test.ts`: weekend headers and weekend day numbers have the muted class and not the primary class; today still has the ring and the selected day the filled primary.
4. Existing `READABILITY_PAIRS` still pass for both themes (`tabTextActive`/`tabTextInactive` on `tabBar`).
5. `pnpm check` + `pnpm vitest run`. The commit says the dark screenshots were not checked by eye.
Order: after open-itens 194 if that is ever run (same default-theme block), otherwise any time. Independent of shell-sidebars-ux 34 (it moves the class, not the token).

### Ticket C4: Appearance settings polish (P108, P107 part)
Behaviour: a catalog failure shows one inline error with Retry; catalog entries offer "Install and apply"; the theme editor asks before discarding a changed draft and names its colour inputs. Files: `AppearanceSection.svelte`, `ThemeEditor.svelte`, `ThemeColorRow.svelte`, `help/documentation/26-theming.md`. Size S.
Acceptance:
1. Failing test first: catalog fetch rejects, `toast.error` not called, inline `theme-catalog-error` with Retry shown (today the toast fires).
2. "Install and apply" installs, sets `settingsStore.appearance.activeTheme` to the package name and the root `--background` equals the new theme's; plain "Install" still leaves the active theme alone.
3. A failed install (name collision) still raises the toast and changes nothing.
4. `ThemeEditor`: Back/Cancel on an unchanged draft calls `onCancel` immediately; after one `updateColor` they show "Discard changes?" and `onCancel` fires only on Discard.
5. Both colour inputs of a row expose the row label as their accessible name.
6. `pnpm check` + `pnpm vitest run`.

### Ticket C5: Faded text that was below 4.5:1 (P25 part)
Behaviour: search snippets use the muted token; note-row chips use full primary; archived rows are no longer dimmed (the Archive icon remains). Files: `SearchResult.svelte`, `NoteRow.svelte`. Size S.
Acceptance:
1. Failing test first: chip text on the unselected chip tint (flattened over `sidebarBg`) is at least 4.5:1 for both built-in themes using their `primary` token; it fails with the `/80` composite.
2. `NoteRow` render: archived row keeps `data-note-row-archived` and the Archive icon, and has no `opacity-60`.
3. `SearchResult` snippet element has `text-file-explorer-muted-fg` and no `/60` fade.
4. `pnpm check` + `pnpm vitest run`.
Order: after shell-sidebars-ux 15 and 19 (both edit `NoteRow.svelte`; 19 also lists `SearchResult.svelte`). Smallest of the five; merge into C1 only if the owner wants fewer tickets and accepts waiting for 19.

## Overlaps found

- `.scratch/open-itens/issues/155` (leaving the theme editor any way other than Save restores the active theme): same files as C4 (`ThemeEditor.svelte`, `AppearanceSection.svelte`) but a different behaviour; C4 does not cover it. Not marked wontfix.
- `.scratch/open-itens/issues/194` (Default theme drops its Catppuccin preview overrides): same default-theme block in `theme.logic.ts` as C3 and the same snapshot file. No overlap in behaviour; sequence them, do not merge.
- `.scratch/open-itens/issues/198` is already `done` (1198d8e7b): palette-class test excludes `components/ui`, so C2's ring sweep is unaffected, and C1 uses no palette class.
- No open-itens issue is fully covered by a quick ticket here.
- shell-sidebars-ux: Issue 05 owns `SidebarSection.svelte`/`NoteInfo.svelte` (P20 section titles wait for it); Issues 15 and 19 own `NoteRow.svelte`, 19 also `SearchResult.svelte` (C5 waits); 29 and 30 touch `Rail.svelte` (C1 waits); 34 later moves `bg-tab-bar` into a `pane-band` utility and is independent of C3.
- Other scouts: kanban slice P88/P143 edit `KanbanCardText.svelte` (C1 order); the collection slice owns `evaluator.ts` chips and the QueryJS widget (the deferred half of P19); calendar-tasks may also touch `CalendarGrid.svelte` (C3); the settings slices may touch `AppearanceSection.svelte`/`SettingsPanel.svelte` (C4, P85's selected state) and `components/ui` primitives are shared primitives for C2.
- tasks-view-ux: `TasksView.svelte` has 6 of the `ring-ring/50` sites (C2 sweeps them as a one-token edit).

## Not checked

Nothing was run: no screenshots, no app. The contrast numbers for P19 chips and P25 chips are my own composite calculations (python, WCAG formula, OKLab mix) on the built-in theme hexes, assuming the chip sits on `editorBg`/`sidebarBg`; chips on tinted kanban cards (`cardColor`) can differ. P23 assumes `--ring` equals the lifted primary in the two built-in themes (true per the builder; a user theme can override `ring`). jsdom's handling of `color-mix(...)` in inline styles was not tested; the criteria read `getAttribute('style')` for that reason.
