# UX polish review: color and theming

Scope: tokens, hardcoded colors, cross-theme adaptation, contrast, accent use, semantic colors. Contrast figures are WCAG ratios computed from the **built** themes (`buildTheme` output bundled from `theme.logic.ts` and evaluated with the repo's own `contrastRatio`), not from the `app.css` fallbacks. The scouts mostly measured the fallbacks, which explains most of the rejected leads.

## 1. Current state

**How a theme reaches the page.**
- `app.html:2` hardcodes `<html class="dark">`. `app.css:157-339` (`.dark`) therefore always applies, and `:root` at `app.css:106-155` is dead in practice. Both blocks are only fallbacks.
- `theme.service.ts:13-27` writes every token of the active theme as an inline custom property on `<html>`. Built-in themes are produced by `buildTheme` (`theme-builder.logic.ts:216`). It derives roughly 150 tokens from a 30-color core and lifts text tokens to the minimum contrast in `READABILITY_PAIRS` (`theme-builder.logic.ts:105-153`), then applies per-theme overrides.
- No `@custom-variant dark` exists, so Tailwind v4 `dark:` means `prefers-color-scheme: dark` (the OS setting), not the app theme.

**Token families** (`app.css:4-64`): shadcn core (background, card, popover, primary, muted, accent, destructive, border, input, ring), per-area tokens (file-explorer-*, right-sidebar-*, tab-*, settings-*, status-bar-*, editor-*), `input-bg`, `switch-unchecked-bg`, a 9-hue `type-*` palette, and `warning`. Theme groups also emit `--syntax-*`, `--lp-*` (about 60), `--wikilink-*` and `--callout-*`. There is **no success token**. There is a warning token, but `text-warning` is used once (`MyPeopleSection.svelte:58`).

**Resolved surfaces.**
- KokoBrain Default has 11 distinct surfaces: bg `#21222e`, card/editor/right sidebar `#2a2e3d`, popover `#171a26`, navigator `#262938`, tab bar `#5a5c79`, settings dialog `#313549`, setting card `#20212d`, code/table/collection/embed `#1e1e2e`, collection header `#181825`, and others.
- Lavender Haze has 7: editor/bg `#F3F0F8`, card/right sidebar `#EAE6F2`, popover and setting card `#DDD8E8`, navigator `#FAF8FE`, tab bar `#edeaf2`, status bar `#efecf4`.
- In Default, `border`, `input`, `muted`, `accent` and hover are all the same value, `#242835`.

**Measured usage** (src/, excluding tests):

| Pattern | Count | Where |
|---|---|---|
| Tailwind palette classes (`text-green-500`, `bg-red-500/15`, `text-white`, `bg-black/50`...) | 33 in 12 files | kanban (18), DiffViewer (4), BuildInfo (3), TasksView (2), AutoMoveRuleRow, UpdateSection, KanbanLane, CollectionLinearCalendarView, button.svelte, dialog-overlay |
| `rgba(...)` literals | 120 in 25 files | queryjs `kb-ui.ts` (30), canvas (13 files, about 55), collection calendars (12), GraphView (4), TagColorPicker (3), live-preview `styles.ts` (4) |
| hex literals outside theme defs | about 65 | kb-ui (10), IconPicker (10), styles.ts (10), GraphView (4), CanvasContextMenu, CanvasEdge |
| `dark:` variants | 13 in 9 files | shadcn button/input/select/switch/menus, BuildInfo, AppShell |
| alpha-dimmed text tokens (`text-muted-foreground/50` and similar) | 40 in 21 files | `/50` x17, `/40` x3, `/30` x1 |
| `opacity-50/60` on content | 47 | canvas nodes, OutgoingLinksPanel, EventDailyNoteButton, NoteActionBar |
| `text-destructive` | 52 | everywhere errors show |
| selection tints | `primary/25` x4, `primary/15` x1, `file-explorer-accent` x20, `right-sidebar-accent` x15, `settings-hover-bg` x6 | rail, types, files, search, sidebars, settings |

**What already works.**
- `buildTheme` plus `READABILITY_PAIRS` is a strong base. The core muted text is lifted to 4.55:1 (Default) and 4.53 to 5.6:1 (Lavender) on every core surface.
- Button foregrounds pass: primary foreground 7.6 and 6.8; destructive foreground 4.57 and 4.52.
- Event colors (`app.css:348-361`) and the meta-bind tokens are already mixed from editor tokens with `color-mix`.
- `mermaid-widget.ts:17` picks dark or light from `isDarkColor(editorBg)`. That is the right pattern, and nothing else uses it.

## 2. Problems (verified)

### High

**H1. Default theme muted text in the navigator, right sidebar and status bar fails contrast, and the guard cannot see it.**
- `theme.logic.ts:125,132,142` override `fileExplorerMutedFg`, `rightSidebarMutedFg` and `statusBarFg` with `oklch(0.55 0.06 268)`. `contrastRatio` parses only hex and rgb, so `ensureContrast` returns oklch values unchanged.
- The test records the skip instead of failing: `theme-builder.logic.test.ts:233-238` lists these three tokens as expected skips.
- The value is `#627195`, which measures 2.96:1 on the navigator `#262938`, 2.77:1 on the right sidebar `#2a2e3d` and 3.24:1 on the status bar. On the tab-bar surface it is 1.33:1: the RailNoteList count (`RailNoteList.svelte:416,421`) is nearly invisible next to "Work" in `default/04-note-alpha-blocks.png`.
- It affects every `text-file-explorer-muted-fg` and `text-right-sidebar-muted-fg` label: "Nothing here", "pinned; note date is today", section labels and property keys (`default/01-shell-initial.png`).
- Severity: high. This is the dimmest common text in the main theme.

**H2. The active theme's mode never reaches code that branches on dark or light.**
- `app.html:2` sets `class="dark"` for every theme. `dark:` follows the OS.
- `AppOverlays.svelte:12`: `<Toaster richColors theme="dark" />` always draws dark toasts.
- `editor-theme.ts:78`: `{ dark: true }` registers CodeMirror's dark base for Lavender too.
- `kb-ui.ts:596,1006`: `classList.contains('dark')` is always true, so Lavender gets the dark chart highlight `#fff` and the dark heatmap empty color `#333`.
- `BuildInfo.svelte:31`: `text-amber-700 dark:text-amber-400` gives amber-400 on Lavender (1.48:1) when the OS is dark, and amber-700 on Default (2.69:1) when the OS is light.
- `button.svelte:12`: destructive is `bg-destructive ... dark:bg-destructive/60`. The screenshots run with a light OS, so the solid version shows. A macOS user in dark mode sees a 60% red. On Lavender that is white on a pink mix, 2.79:1.
- `switch.svelte:26`: the thumb is `dark:data-[state=unchecked]:bg-foreground`. Under OS dark plus Lavender, it becomes a dark purple knob.
- Severity: high. Theme correctness depends on an unrelated OS setting.

**H3. Canvas, graph view and collection calendars are dark-only.**
- Canvas uses white-alpha strokes and fills across 13 files, about 55 literals:
  - `CanvasInner.svelte:712-743`: "Override Svelte Flow theme for dark mode", applied unconditionally. Node border, edge, grid and controls are white 5 to 30%. The minimap mask is black 60%.
  - Node borders at white 15%: `FileNode.svelte:102,160`, `TextNode.svelte:94`, `LinkNode.svelte:140,166,199,201`, `ImageNode.svelte:71`, `GroupNode.svelte:31-32`.
  - Overlays and menus: `CanvasContextMenu.svelte:183,206,231`, `CanvasFilePicker.svelte:91,103,135`, `CanvasLinkInput.svelte:91,108,110,151`, `CanvasEdge.svelte:72`, `ColorPicker.svelte:61,69`.
  - On `#F3F0F8`, white 15% is about 1.1:1. In `lavender/08-canvas.png` the edges are invisible and the minimap is a grey block.
- `--foreground-15` is never defined anywhere. `CollectionCalendarView.svelte:120,137` and `CollectionLinearCalendarView.svelte:147,152,167,180` therefore always fall back to `rgba(255,255,255,0.04-0.15)`, and Lavender loses the grid entirely.
- GraphView hardcodes `BG_COLOR '#1a1a1e'`, nodes `#8b8b8b`, active `#c084fc` and labels `#a1a1aa` (`GraphView.svelte:46-51,244,252`), with the background applied inline at line 429. `lavender/12-cmd-toggle-graph-view.png` shows a near-black slab under light controls.
- `TagColorPicker.svelte:58,94,102`: the "none" swatch and hover ring are white alpha.
- Severity: high. Whole features break the theme contract in the light theme.

**H4. Status colors use the raw palette. There is no success token and the warning token is ignored.**
- `KanbanDatePicker.svelte:21-24` uses red-400, yellow-400, orange-400 and blue-400.
- `KanbanListView.svelte:48` and `KanbanTableView.svelte:69,74` use red-500, yellow-500 and green-500.
- Other places: `KanbanLane.svelte:311` (green-500), `DiffViewer.svelte:14-15` (green-300, red-300), `TasksView.svelte:184` (purple-400 file header) and `:252` (green-400), `AutoMoveRuleRow.svelte:120` and `UpdateSection.svelte:340` (green-500).
- Contrast on Lavender `#F3F0F8`:
  - Diff text green-300 is 1.25:1 and red-300 is 1.68:1, so added lines are unreadable.
  - yellow-400 is 1.36:1, green-400 1.55:1, green-500 2.02:1, red-400 2.45:1 and purple-400 2.34:1.
- The board's "at limit" state uses `text-destructive` (`KanbanLane.svelte:313`), so one board mixes a token with raw palette colors.
- Severity: high.

**H5. Switch off-tracks and form-field edges are below the 3:1 non-text minimum in both themes.**
- `switch-unchecked-bg` on the setting card measures 1.12:1 on Lavender (`#D2CCE0` on `#DDD8E8`) and 1.74:1 on Default. See `lavender/20-settings-10-search.png`, `-04-periodic-notes.png` and `-16-sentry.png`.
- `border-input` on the setting card is 1.08 to 1.09:1 in both themes. `input-bg` against the card is 1.14 (L) and 1.32 (D). The fields read as borderless (`default/20-settings-15-todoist.png`).
- `SentrySection.svelte:69` and `TodoistSection.svelte:27` hand-roll inputs with `bg-background border-border placeholder:text-muted-foreground/50`. The placeholder at 50% muted is about 2.0:1, and these inputs differ from `<Input>` (`input.svelte:43`, `bg-input-bg border-input`).
- Severity: high for the switch, which is the only state cue.

### Medium

**M1. The Default tab bar is the brightest surface in the shell, and it erases the active-tab cue.**
- `tabBar #5a5c79` (`theme.logic.ts:122`) is 2.43:1 against the background, a slate band above dark panes (`default/01-shell-initial.png`).
- To pass 4.5:1 on it, the lift pushes both tab text tokens toward white: active `#cfd7f4` and inactive `#d3d7e7`, which differ by 1.00:1. The inactive tab is slightly lighter than the active one.
- The overrides `tabTextActive #bac5ee` and `tabTextInactive #9ca3c7` are discarded by the lift.

**M2. Headings use a rainbow, and Lavender H1 is the error red.**
- `theme.logic.ts:147-150` (Default pink, cyan, mint, yellow, coral) and `:257-260` (Lavender red, orange, yellow, green, blue) override the derivation's single-hue ramp (`headingAt`, `theme-builder.logic.ts:224`).
- Lavender `heading: '#C83848'` (line 211) equals `error` (line 225) and `type-red`. In `lavender/03-note-roadmap.png` and `13-more-menu.png`, the H1 "Roadmap" is the same red as "Delete this note".
- Default H1 is pink with an orange `#` marker (`default/04`): three accent hues in one title.

**M3. The Default theme mixes in a second palette and has five reds.**
- About 25 preview overrides are Catppuccin Mocha: `#1e1e2e`, `#181825`, `#313244`, `#a6adc8`, `#cdd6f4`, `#f38ba8` (`theme.logic.ts:168-192`). Code blocks, tables, frontmatter, collections and embeds sit on a near-black that is cooler than the `#2a2e3d` editor (`default/04`: the table header and code block).
- The error reds:
  - `destructive #f3333b`
  - `lp-collection-error` and `lp-embed-error` `#f38ba8` (lines 185, 192)
  - `callout-caution #f87171` (line 200), also the fallback for mermaid, math and QueryJS errors at `styles.ts:824,844,864,891`
  - `#fb464c` in `CanvasContextMenu.svelte:211`
  - `#ef4444` at `styles.ts:770,774`

**M4. Faint and alpha-stacked text is used for content.**
- `collectionEmpty` and `collectionNull` derive from `faintFg` (`theme-builder.logic.ts:281-282`) but render text: "no results" messages, the footer and "+N more" (`styles.ts:598-606`, `collection-block-widget.ts:154,175,252,270,455`). They measure 1.37:1 on Lavender and 2.46:1 on Default.
- Alpha on muted text:
  - `text-muted-foreground/50` (17 uses) is 2.0 to 2.2:1; `/40` is 1.8:1. Examples: `CollectionView.svelte:488` (`/60`, 2.4 to 2.6:1), `QuickSwitcher.svelte:79`, PropertiesPanel and SortPanel icons.
  - `PropertyField.svelte:191` (`right-sidebar-muted-fg/30` placeholder) is 1.35 to 1.46:1.
  - `CalendarGrid.svelte:58` (`file-explorer-muted-fg/40`, out-of-month days) is 1.5 to 1.7:1.
- Opacity on content: `opacity: 0.4` and `0.5` in canvas nodes (`LinkNode.svelte:184,214`, `TextNode.svelte:108`, `ImageNode.svelte:90`, `CanvasFilePicker.svelte:140`, `CanvasContextMenu.svelte:226`) is 2.2 to 3.4:1. `EventDailyNoteButton.svelte:30` stacks muted with `opacity-60`. `OutgoingLinksPanel.svelte:83` sets `opacity-60` over `text-destructive`.

**M5. Destructive is used inconsistently.**
- `button.svelte:12` uses `text-white`, ignoring `destructive-foreground`: Default sets `#171717` because white on `#f3333b` is only 3.93:1. The "Empty Trash" label in `default/20-settings-13-trash.png` is under 4.5:1.
- `readableCore` lifts `error` only to 3:1 (`theme-builder.logic.ts:185`). `text-destructive` on Default is 3.44:1 on the card and editor, yet it is used 52 times as small text, such as validation messages.
- `AppearanceSection.svelte:252` sets a non-fatal notice ("your themes still work") in destructive red.

**M6. Broken color declarations in live preview.**
- `styles.ts:683-684,766-767,788` use `hsl(var(--primary))`. `--primary` is hex or oklch, so the value is invalid and the browser drops it.
- As a result, the meta-bind select and input focus border, the focus ring and the checkbox `accentColor` never take the accent.
- The select chevron is a hardcoded `%239ca3c7` (`styles.ts:674`) even though `--lp-meta-bind-select-arrow` exists (`app.css:307`).

**M7. Surface and edge ladders read as patchy (Lavender) or edgeless (Default).**
- Lavender: the popover `#DDD8E8` is darker than the editor, so menus recede. Setting cards (`#DDD8E8`) sit 1.14:1 below the dialog (`#EAE6F2`), giving recessed wells with no border. The navigator, editor and sidebar are three different tints (`lavender/02-rail-today.png`, `20-settings-16-sentry.png`).
- Default: `border` is 1.07 to 1.09:1 on bg, card and editor, and it equals hover, muted and accent (`#242835`), so a hovered row has the same tone as every divider. `divider #383a4f` (1.42:1) and `file-explorer-border` are two other strengths, and both are used inside one panel (`TypesNavigator.svelte:200` vs `:256`).

**M8. Five selection recipes and four hover recipes.**
- Selection: `primary/25` with primary text (Rail:80, TypesNavigator:266,404, FilesNavigator:285), `primary/15` (SearchResult:148), `file-explorer-accent`, `settings-hover-bg` (settings nav) and `right-sidebar-accent`.
- Hover: `primary/10`, `file-explorer-accent`, `muted/30` (EditorTabs:40), and global `accent` inside the sidebar (PropertyField:148).
- Primary text on the `primary/25` tint is 4.44:1 on Lavender.
- Off-family token borrowing: `text-tab-text-inactive` for property icons (PropertyField:110), `bg-background` for the rename input (FilesNavigator:458), the calendar week column (CalendarGrid:28) and the rail (Rail:87).

### Low

- L1. Scrims are hardcoded `bg-black/50` (`dialog-overlay.svelte:16`) and `rgba(0,0,0,.5)` (`CanvasFilePicker.svelte:81`, `CanvasLinkInput.svelte:81`). This is heavy on the light theme and cannot be tuned per theme.
- L2. `CollectionLinearCalendarView.svelte:199` puts `text-white` on user-mapped bar colors with no luminance check.
- L3. `IconPicker.svelte:50-58` presets are Tailwind hex values, although the resolver already supports palette names that follow the theme (`file-icons.logic.ts:170`).
- L4. `kb-ui.ts` (QueryJS UI helpers) has 40 color literals, including white zebra rows `rgba(255,255,255,0.03)` (line 419), `rgb(61,61,61)` borders (788, 881), and `#fff` badge text on 40% alpha fills (346).
- L5. `input.svelte:28`: in the file variant, `cn()` (tailwind-merge) keeps the later `bg-transparent`, so `bg-input-bg` is dropped there.
- L6. The today tint is `primary/5` in the month view (`CollectionCalendarView.svelte:136`) and `primary/10` in the linear view (line 179).
- L7. `ThemePreview.svelte:12`: the thumbnail frame uses the active theme's `border-border`, not the previewed theme's divider.
- L8. `canvas-markdown.css:91-168`, `styles.ts:481,495-496,513` and `CanvasEdge.svelte:66-67` have dark-only fallbacks. Every `--lp-*` token is always defined, so these are dead code, but misleading.

## 3. Recommended standard

1. **One source of mode.** Add `isDark: boolean` to the theme, derived as `isDarkColor(editorBg)`. `applyTheme` toggles `html.dark` from it and sets `color-scheme`. In `app.css`, add `@custom-variant dark (&:where(.dark, .dark *));` so `dark:` follows the app theme. Bind Sonner `theme` and the CodeMirror `dark` flag (or a compartment) to it, and replace `classList.contains('dark')` in kb-ui.
   - Files: `app.html`, `app.css`, `theme.service.ts`, `theme.types.ts`, `AppOverlays.svelte`, `editor-theme.ts`, `kb-ui.ts`.
2. **Contrast guard covers every format.** Make `parseRgba` read `oklch()`, or change the three overrides to hex. Delete the expected-skip list in `theme-builder.logic.test.ts:233-238` so any future skip fails the test.
   - Add pairs to `READABILITY_PAIRS`:
     - `fileExplorerMutedFg` on `tabBar`, 4.5
     - `mutedForeground` on `settingsDialogBg`, 4.5 (Default measures 4.08)
     - `destructive` on `editorBg` and `card`, 4.5 (it is used as text)
     - `collectionEmpty` and `collectionNull` on `collectionBg`, 4.5
     - non-text 3:1 pairs: `switchUncheckedBg` on `settingItemBg`, `input` on `settingItemBg`, `border` on `card`
   - Files: `color.ts`, `theme.logic.ts`, `theme-builder.logic.ts`, the test.
3. **Semantic tokens.** Add `success` (and `success-foreground`) next to `warning` and `destructive`. Derive them from core `green`, `yellow` and `error` with 4.5:1 lifts. Add `diff-insert-bg/fg` and `diff-delete-bg/fg` as `color-mix` of success and destructive with the editor background. Status chips use `bg-{tone}/15 text-{tone}`. Never use palette classes. Use one error red per theme, and point `collectionError`, `embedError`, `calloutCaution` and the `styles.ts` fallbacks at `error`.
   - Files: `app.css @theme`, `theme-builder.logic.ts`, `theme.logic.ts`, kanban (4 files), `DiffViewer`, `TasksView`, `AutoMoveRuleRow`, `UpdateSection`, `BuildInfo`, `styles.ts`, `CanvasContextMenu`.
4. **No white or black alpha in components.** Strokes use `var(--border)` (hairline) or `var(--divider)` (structural). Translucent hover fills use `color-mix(in oklab, var(--foreground) 6%, transparent)`, exposed as a token such as `--hover-overlay`. Scrims use a new `--overlay` token (black 50% dark, `fg` 25% light). Graph and canvas read tokens through `getComputedStyle` for canvas drawing.
   - Files: 13 canvas files, `CanvasInner` Svelte Flow vars, `GraphView.svelte`, both collection calendars (replace `--foreground-15` with `var(--divider)`), `TagColorPicker`, `ColorPicker`, `dialog-overlay`, `kb-ui.ts`.
5. **Muted text rule.** Secondary text uses the area's muted token at full strength. Never use `/NN` alpha or `opacity` on text that carries information. Use `faint` only for decoration (task borders, rules), never for text. A disabled or archived state may use `opacity-60` on the whole row, and only once.
   - Files: the 21 files with `/NN` text, canvas nodes, `EventDailyNoteButton`, `OutgoingLinksPanel`, `CalendarGrid`, and the `collectionEmpty`/`collectionNull` derivation.
6. **Surface ladder (two themes, same roles).** Use chrome (rail, tab bar, navigator, status bar), content (editor, right sidebar), raised (card, setting item, `input-bg`) and overlay (popover, dialog). In light themes, raised and overlay are lighter than content and carry a `border` (at least 1.3:1). In dark themes they are lighter by one step. The tab bar sits between bg and card, never above card.
   - Preview blocks derive from editor: `codeblockBg = mix(editorBg, sidebarBg)`, `tableBorder = border`. Drop the Catppuccin overrides.
   - Default: `border` about `#343850` (1.4:1), distinct from hover. Lavender: popover `#FAF8FE`, setting item `#FAF8FE` with a `border`.
   - Files: `theme.logic.ts` overrides for both themes.
7. **Controls.** Switch off-track: `switch-unchecked-bg` at 3:1 or more against `setting-item-bg`, or a track with a `border-input` outline at 3:1. Inputs: always `<Input>` (`bg-input-bg border-input`, `input` at 3:1 or more on its surface). Remove the hand-rolled inputs in Sentry and Todoist. Fix `hsl(var(--primary))` to `var(--primary)` and the chevron to `currentColor` with `--lp-meta-bind-select-arrow`.
   - Files: `switch.svelte`, `theme.logic.ts`, `SentrySection`, `TodoistSection`, `styles.ts`.
8. **Accent discipline.**
   - Headings: one hue ramp per theme. Use the derivation (H1 is `heading`, then steps to muted) and delete the `heading2-5` overrides. Lavender `heading` must not equal `error`.
   - Selection: `bg-{area}-primary/20 text-{area}-primary` everywhere a row is current (rail, files, types, search, note list, settings nav). Hover: `bg-{area}-accent`. Remove `primary/10`, `primary/15` and `muted/30` hovers.
   - Destructive button: `bg-destructive text-destructive-foreground`, with no `dark:bg-destructive/60` and no `text-white`.

## 4. Quick wins vs larger changes

**Quick wins (each under 1 h):**
- Fix `hsl(var(--primary))` in `styles.ts` (5 lines) and point the chevron at `--lp-meta-bind-select-arrow`. 15 min.
- Destructive button: `text-destructive-foreground`, drop `dark:bg-destructive/60`. 10 min.
- Replace the three oklch overrides in `theme.logic.ts:125,132,142` with hex values that pass 4.5:1, and delete the test's skip list. 30 min.
- `--foreground-15` to `var(--divider)` in both collection calendars, including the dashed cell lines. 20 min.
- Lavender `heading` to `primary` or `fg`; drop the `heading2-5` overrides in both themes. 20 min.
- Raise `switchUncheckedBg` in both themes to 3:1 on `settingItemBg`, and add the pair to `READABILITY_PAIRS`. 30 min.
- `collectionEmpty` and `collectionNull` derive from `mutedFg`; point `collectionError` and `embedError` at `error`. 15 min.
- `BuildInfo`, `UpdateSection`, `AutoMoveRuleRow`, `TasksView`: switch to `text-warning`, `text-type-green` (or the new success token) and `text-file-explorer-primary`. 30 min.
- Drop the `/50` and `/30` alpha on placeholders and icons (21 files, mechanical). 45 min.

**Larger changes:**
- App-driven dark mode (rule 1): `isDark` on the theme, `@custom-variant`, Toaster, CodeMirror compartment, kb-ui. 0.5 to 1 day including tests.
- Success, warning and diff tokens plus the kanban and DiffViewer migration (rule 3). 0.5 day.
- Canvas and Svelte Flow tokenization (13 files) and GraphView canvas colors from computed tokens (rule 4). 1 day.
- Surface ladder rework for both themes (Catppuccin removal, Lavender elevation, Default border separated from hover, tab-bar darkening) with screenshot review (rule 6). 1 to 1.5 days.
- oklch parsing in `color.ts` and the extended `READABILITY_PAIRS` with non-text pairs (rule 2). 0.5 day.
- Unifying selection and hover recipes (rule 8, about 40 sites). 0.5 day.

## 5. Rejected leads

- 4, 89: `--input-bg`, `--file-explorer-bg` and the others "missing in light". Every token is set inline by the theme, and `.dark` is always on `<html>`.
- 82: light primary-foreground "2.2:1". The `app.css` fallback is not used; the built Lavender pair is 6.82:1.
- 86: semantic-search fg "2.5:1". Built Lavender is `#6848A8`, 6.47:1.
- 87: badge fg "3:1". Built 4.52:1 in both themes (the token on tab-bar is H1's case, not this one).
- 88: destructive-foreground "3.3:1". Built pairs are 4.57 and 4.52; the real issue is `text-white` in button.svelte (M5).
- 10, 11 (mutedFg part): the core mutedFg is lifted to at least 4.5:1. The real defect is the oklch overrides (H1) and faintFg used as text (M4).
- 7: duplicate unchecked bg on the switch. `cn()` tailwind-merge removes `bg-input`, so it is harmless cruft, not order-dependent.
- 3: as phrased (menu destructive highlight). Merged into H2; the item hover difference itself is negligible.
- 17: two code backgrounds serve different roles (source-mode inline code vs live-preview chip). Not a defect.
- 40, 91, 93 (fallback part): dark-only `var()` fallbacks are dead because every `--lp-*` token is always set. Kept only as L8; the live part of 93 is in M3.
- 106: Save looks disabled. It is disabled because the form shows "Enter a title". Correct state.
- 102: Lavender labels too faint. They measure 4.51 to 5.6:1; the faint labels are a Default problem (H1).
- 103: yellow star and green check. These are intentional state colors through `type-*` tokens.
- 105: triangles behind kanban columns. Not traced to any code; likely a capture artifact. Confirm in the real app.
- 61: rail `bg-background` vs the navigator. An intentional one-step chrome layer in both themes.
- 6, 8, 19, 47, 48, 63, 64, 66, 72, 78, 80: component, icon or interaction consistency, not color. Left for those reviews.
- 22: SaveStatus emphasis. Mostly hierarchy and motion; the color part is minor.
- 98, 116 (screenshot dividers and selection tints): covered by M7 and M8 without separate evidence.
