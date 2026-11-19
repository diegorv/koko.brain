# 05: Theme builder keeps text readable on every surface it derives, by WCAG and APCA

**Origin:** color audit 2026-11-19 (`.scratch/color-audit/report.md`, cause C and F). Each finding below has its fg, bg, worst theme, measured ratio and validator fix in `.scratch/color-audit/research/workflow-result.json` (search by `file:line`); notes in `research/scout-*.md` and `research/validation-*.md`; resolved tokens of all 28 themes in `research/theme-tokens.json`.

**Owner decision (2026-11-19):** the builder adjusts tokens for every theme (built-in, catalog and user), and uses APCA as a second gate next to WCAG 2.

**What to build** (`src/lib/core/settings/theme-builder.logic.ts`):

1. **More surfaces.** `readableCore` (`:183-209`) lifts `fg`, `mutedFg` and `primary` against four plain surfaces only (`editorBg`, `sidebarBg`, `panelBg`, `popoverBg`), each to exactly 4.5:1. The same palette also makes `hover` (used as `muted`, `secondary`, `settingsHoverBg`, `collectionTableHeaderBg`) and `selected` (used as `accent`, `fileExplorerAccent`, `rightSidebarAccent`), and the UI draws muted, primary and warning text on them: command palette and quick switcher highlighted rows, chips on `bg-muted`, hover rows in Tasks, Tags, Appearance, My people, calendar hover. Add those surfaces (flattened over the surface they sit on) to the lift, for `fg`, `mutedFg`, `primary` (as `fileExplorerPrimary` and `rightSidebarPrimary` too) and the warning/success tokens.
2. **Destructive as text.** `error` is lifted to only 3:1 (`:189`), but `text-destructive` is used as small plain text (collection errors, Todoist status and settings, calendar needs-attention). Lift it to 4.5:1 on the text surfaces; `errorFg` stays paired with `error` as a fill.
3. **APCA gate.** Add an APCA check next to `ensureContrast` in `utils/color.ts` (the APCA math already there for `labelColors`): text tokens must also reach |Lc| 45 (muted and small text) on their surfaces; move them in OKLab until both gates pass. This lifts the muted family, links, wikilinks, footnotes and URLs on the dark themes that sit at Lc 31 to 44 today (`:186,:192`, `StatusBar.svelte:9`, `SettingItem.svelte:28`, `TasksView.svelte:879,902`).
4. **`primaryForeground`.** Pick black or white for text on `primary` by APCA (as `labelColors` does) and then enforce 4.5:1, so mid-tone primaries get white text (`:194`; calendar selected day `EventMonthGrid.svelte:113`, kanban date picker `KanbanDatePicker.svelte:130`). Hover fills derived from primary keep the pair.
5. **Pairs.** Extend `READABILITY_PAIRS` with every new pair so `withReadableContrast` also catches overrides, and so Issue 12 can show them in the theme editor.

Backgrounds never change; only text and accent tokens move. The theme snapshot (`src/tests/lib/core/settings/__snapshots__/theme-snapshot.test.ts.snap`) changes on purpose: the commit lists the tokens that moved on each built-in theme.

Not in this ticket: tinted editor surfaces (callouts, blockquote, highlight, code; Issue 06), non-text boundaries (Issue 07), user theme warnings (Issue 12).

**Size:** L. Split point: items 1, 2 and 5 first (WCAG surfaces), items 3 and 4 second (APCA).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [ ] Hard palettes fixture under `src/tests/fixtures/` (create it if Issue 02 has not): the palettes of Zettlr Bielefeld Light, Tolaria Light, Twilight Violet, Zettlr Bordeaux Dark and Zettlr Karl-Marx-Stadt Dark copied from the themes repo with a source comment.
- [ ] Failing test first, `theme-builder.logic.test.ts` over `BUILTIN_THEMES` and the fixture: every new pair reaches its minimum, including `mutedForeground` on `accent` flattened over `popover` and on `muted` over `background`, and `destructive` on `editorBg` at 4.5:1. It fails today on the fixture (command-item accent row, muted chips).
- [ ] APCA test: an `apcaContrast` export (or equivalent) matches the apca-w3 reference on a few known pairs (black/white on `#3b82f6`: Lc 40.2 and -69.4); the muted family and links on the dark fixture palettes reach |Lc| 45; `primaryForeground` is white on a mid-tone blue primary.
- [ ] `utils/color.test.ts` covers the new APCA helper (happy path, unparseable input, already passing input unchanged).
- [ ] Snapshot updated on purpose; frontend gate passes.

## Findings covered

| Finding | Sev | Measured (worst) |
|---|---|---|
| `core/settings/theme-builder.logic.ts:128` Accent text passes WCAG 2 but reads poorly by APCA on some dark themes | medium | Fails by APCA only. Willemstad Dark #567f83 (links, wikilinks, footnote, ol marker, url, processing): 4.57:1, Lc -31. Frankfurt Dark #5e97c7: 4.53,... |
| `features/collection/CollectionCalendarView.svelte:119` Calendar and linear-calendar header cells use muted-foreground on bg-muted/60 | medium | Measured on --muted at 60% over --card: Zettlr Berlin, Bielefeld, Frankfurt and Karl-Marx-Stadt Dark 3.26 (Lc -33), Bordeaux Dark 3.32, Twilight Vi... |
| `features/collection/CollectionTableView.svelte:78` text-primary used as small text, and link hover primary/80, on card and widget surfaces | low | --primary on card: Sakura 4.15, Twilight Violet 4.19, Shimmering Focus Light 4.30. On a hovered row (muted/50): Frankfurt Dark 3.43. The link with ... |
| `features/collection/CollectionView.svelte:520` text-destructive in collection error panels and form messages | medium | Error panel (destructive on destructive/10 over card): Zettlr Berlin, Bielefeld, Frankfurt and Karl-Marx-Stadt Dark 2.79 (Lc -25). 14 of 28 themes ... |
| `features/event-calendar/EventCalendarNeedsAttention.svelte:69` Destructive-colored text in the calendar fails on dark themes including the default | medium | Badge (destructive on destructive/10 over editor-bg) fails on 15 themes: Zettlr Berlin/Bielefeld/Frankfurt/KMS Dark 2.78 (Lc-25), Zettlr Bordeaux D... |
| `features/event-calendar/EventMonthGrid.svelte:113` Selected-day number: near-black label on mid-tone primary fill reads poorly by APCA | medium | WCAG 4.51 to 4.95, but APCA Lc33 on Willemstad Dark and Zettlr Berlin Light, Lc39 Twilight Violet, Lc41 Zettlr Frankfurt and KMS Dark. White on the... |
| `features/event-calendar/EventMonthGrid.svelte:118` Hover fill hurts muted and primary text on calendar days and buttons | medium | muted-fg on muted fails on 14 themes (Zettlr Bordeaux Dark 2.52, Zettlr dark 2.58, Twilight Violet 3.87, Zettlr light 3.68). primary on muted (toda... |
| `features/properties/NoteInfo.svelte:44` NoteInfo heading text-right-sidebar-primary slightly under 4.5 on 7 themes | low | right-sidebar-primary on right-sidebar-bg fails on 7 of 28 themes (5 light, 2 dark): 4.08 Shimmering Focus Light, 4.15 Sakura, 4.18 Willemstad Dark... |
| `features/tags/TagItem.svelte:62` Tags view row counts (muted-foreground on hover accent) drop to 3:1 on hover | low | muted-foreground on accent fails 11/28: 3.02 (Lc 43) on all 5 Zettlr light themes, Lavender Haze 4.20. At rest on editor-bg the minimum is 4.52. Th... |
| `features/rail-shell/RailPropertiesPicker.svelte:130` Properties picker popover label uses a token tuned for the sidebar: 3.71:1 on the default theme | low | file-explorer-muted-fg on popover: KokoBrain Default 3.71 (Lc -35). All other themes pass. muted-foreground on popover passes everywhere (min 4.51). |
| `components/ui/command/command-item.svelte:20` Highlighted row (accent) is invisible against popover on 7+ themes in command palette, quick switcher, menus, autocomplete | high | accent vs popover 1.00:1 on all 5 Zettlr dark themes (selected == popoverBg == #282832 in themes/zettlr-*-dark.json), 1.01 Willemstad Dark, 1.06 Sa... |
| `core/zoom/ZoomChip.svelte:16` ZoomChip hover color primary on popover fails on three themes | low | primary on popover 3.73:1 Sakura, 4.02 Willemstad Dark (APCA -30), 4.48 Graphite Violet |
| `features/command-palette/CommandPalette.svelte:60` Muted text and icons on the highlighted accent row fail on light themes | medium | muted-foreground on accent: 3.02 Zettlr light x5 (APCA 43), 3.70 Graphite Violet, 3.87 Twilight Violet (Lc -36), 4.13 Sepia, 4.20 Lavender Haze, 4.... |
| `features/search/SearchPanel.svelte:251` Muted text on --muted fails: search mode toggle, Archived chip, Text badge, footer key hints | high | file-explorer-muted-fg on bg-muted over list-bg: 2.52 Zettlr Bordeaux Dark, 2.58 Zettlr dark x4 (Lc -28), 3.68 Zettlr light x5 and Lavender Haze, 3... |
| `features/todoist-sync/TodoistSyncStatus.svelte:20` Todoist sync error text in status bar fails on 12 themes | low | destructive on status-bar-bg 3.39 Zettlr Bordeaux Dark, 3.55 Zettlr dark (Lc -28), 3.62 Willemstad Light, 3.69 Shimmering Focus Light, 4.01 KokoBra... |
| `core/settings/sections/TrashSection.svelte:68` text-muted-foreground on bg-muted chips fails 4.5:1 in 14 themes, 2.5:1 on Zettlr dark family | medium | muted-foreground on muted fails on 14/28: Zettlr dark 2.52 (Bordeaux), 2.58 (others), Lc 27-28; Zettlr light 3.68; Twilight Violet 3.87 (Lc 36); To... |
| `plugins/kanban/kanban.logic.ts:756` text-muted-foreground on opaque bg-muted pills fails on Zettlr dark and several light themes | medium | Same pair as TrashSection:68: 14/28, 2.52 Zettlr Bordeaux Dark. Collection weekday headers on bg-muted/60 over editor: 12/28, 3.26 Zettlr dark, 4.0... |
| `features/event-calendar/EventTaskChip.svelte:27` Calendar task chip hover fill hides closed task text | low | hover:bg-muted under text-muted-foreground: 14/28 under 4.5 (2.52 Zettlr Bordeaux Dark, 3.68 Zettlr light, 3.87 Twilight Violet, 4.15 Tolaria Light... |
| `core/settings/theme-builder.logic.ts:186` Links, wikilinks, footnotes and URLs at APCA Lc 31-44 on dark themes | medium | Willemstad Dark: every link, wikilink, footnote and URL token is #567f83 on #070707, 4.57:1 but APCA Lc-31. The raw palette primary #0d5257 is 2.27... |
| `plugins/kanban/KanbanDatePicker.svelte:130` Date picker selected day: black on mid-saturation primary passes WCAG at the limit but is poor by APCA | medium | WCAG passes 28/28, but APCA: Zettlr Berlin Light #030305 on #12865e 4.51 Lc33 (white would be 4.57 / Lc-77); Willemstad Dark #090909 on #567f83 4.5... |
| `core/settings/theme-builder.logic.ts:192` mutedForeground family sits at APCA Lc 38-42 on 6 dark themes (WCAG floor only) | medium | WCAG passes; APCA does not. mutedFg on Zettlr Dark themes (x5): 4.53-4.68:1, Lc39-42 on editor-bg, card and background. Twilight Violet: 4.51-5.32,... |
| `core/settings/theme-builder.logic.ts:241` --file-explorer-primary text on nav and list surfaces | low | file-explorer-primary on nav-bg fails on 8/28: Shimmering Focus Light 4.08, Zettlr Bielefeld Light 4.13, Sakura 4.15, Zettlr Berlin Light 4.19, Wil... |
| `core/layout/SidebarSection.svelte:46` Primary and file-explorer-primary text on sidebar surfaces, only guaranteed on the editor background | low | right-sidebar-primary section titles (15px semibold, not large text) fail on 7/28: Shimmering Focus Light 4.08, Sakura 4.15, Willemstad Dark 4.18, ... |
| `core/settings/sections/AppearanceSection.svelte:190` Theme row hover in Settings > Appearance: action icons, Active label and uninstall X unreadable on hover surface | medium | Edit and duplicate icons are non-text, so 3:1 applies: 5/28 fail (Zettlr Bordeaux Dark 2.52, other Zettlr dark 2.58), not 15. Uninstall/delete X on... |
| `features/auto-organize/AutoOrganizeSection.svelte:266` Muted text and remove icon on bg-muted chips in Settings | medium | muted-foreground on bg-muted: 14/28 under 4.5, 2.52 (Lc 27) Zettlr Bordeaux Dark, 2.58 other Zettlr dark, 3.68 Zettlr light x5, 3.87 Twilight Viole... |
| `core/settings/sections/SettingItem.svelte:28` Muted description, label and placeholder text in Settings passes WCAG but is under APCA Lc45 on dark themes | medium | WCAG passes everywhere for row descriptions and dialog text, but APCA is under Lc 45 on 6-7 dark themes: Twilight Violet 4.51:1 Lc 38 (dialog), Zet... |
| `plugins/one-on-one/MyPeopleSection.svelte:50` Hover and active-row surfaces under muted, primary or warning text | low | Active My People row (file-explorer-accent): muted days 11/28 under 4.5 (Zettlr light 3.02, Lc 43), warning days 12/28 (3.05). Weekend day on hover... |
| `features/tasks/SourcesPanel.svelte:327` SourcesPanel exclude-chip remove icon low contrast on bg-muted | low | Exclude-chip remove X (icon, 3:1), muted-foreground on bg-muted: 5/28 fail, 2.52 Zettlr Bordeaux Dark and 2.58 the other Zettlr dark themes. The ch... |
| `features/tasks/TaskLists.svelte:197` Active task list count is muted text on the accent row | medium | Active list count, muted-foreground on bg-accent: 11/28 under 4.5, 3.02 (Lc 43) Zettlr light x5, 3.70 Graphite Violet, 3.87 Twilight Violet, 4.13 S... |
| `features/tasks/TasksView.svelte:845` Tasks row and list hover tint drops muted text and links below 4.5 on light themes | medium | Surface is bg-editor-bg (EditorView.svelte:71). muted-foreground on accent/50 over editor fails on 6/28 themes: 3.74 on Zettlr Bielefeld Light (#6e... |
| `features/tasks/TasksView.svelte:902` Muted-foreground 11px task chips are APCA-weak on six dark themes | medium | muted-foreground on editor-bg passes WCAG but is APCA-weak on 6/28 dark themes: 4.53-4.87 at Lc 39 on Twilight Violet and the 5 Zettlr Dark themes.... |
| `features/tasks/TasksView.svelte:879` Primary-colored small text is APCA-weak on four dark themes | low | primary on editor-bg is APCA-weak on 4/28 dark themes: 4.57 Lc31 on Willemstad Dark, 4.53 Lc36 on Twilight Violet, Lc40 on Zettlr Frankfurt Dark an... |
| `core/settings/theme-builder.logic.ts:194` primaryForeground on primary passes AA but reads poorly (black on mid-tone fills), and hover drops it | medium | At rest, primaryForeground on primary passes WCAG but reads poorly: 4.51 Lc33 on Zettlr Berlin Light (#030305/#12865e) and Willemstad Dark (#090909... |
| `core/status-bar/StatusBar.svelte:9` Muted text on dark themes passes 4.5:1 by a hair but reads at Lc 37 to 42 | low | status-bar-fg on status-bar-bg is 4.50 Lc37 on KokoBrain Default, and 7/28 themes are under /Lc/ 45. muted on popover: 7/28 under Lc 45 (KokoBrain ... |
| `core/settings/theme-builder.logic.ts:187` text-destructive used as small plain text is held to only 3:1 by the theme builder | medium | text-destructive fails 4.5 by surface: popover 12/28 (2.96 Lc26 Zettlr Bordeaux Dark, 3.02 Lc30 KokoBrain Default, 3.11 other Zettlr Dark, 3.97 Sak... |
| `core/settings/theme-builder.logic.ts:183` readableCore lifts text to exactly 4.5 on four plain surfaces, so hover/selected surfaces from the same palette fail | medium | destructive on muted (hover) fails 19/28: 1.64 Lc14 Zettlr Bordeaux Dark, 1.72 other Zettlr Dark, 3.74 KokoBrain Default. muted on accent 11/28 (3.... |
| `features/todoist-sync/TodoistSection.svelte:151` Todoist settings load error and token link below 4.5 | low | On settings-dialog-bg, the error text (12px) fails on 12/28 themes: 3.01 Zettlr Berlin Dark, 3.08 KokoBrain Default, 3.89 Shimmering Focus Light. T... |
| `core/settings/theme-builder.logic.ts:194` Primary and destructive button labels pass WCAG but read poorly by APCA (dark text on mid-tone fills) | medium | 4.51:1 at Lc33 on Willemstad Dark and Zettlr Berlin Light; 4.54-4.56 at Lc41 on Zettlr Frankfurt/KMS Dark (black on mid blue, the owner's original ... |
| `app/SettingsPanel.svelte:130` Settings nav group labels fail 4.5:1 on Twilight Violet | medium | 4.27:1, Lc 37 on Twilight Violet; next lowest 4.58 Tolaria Light |

## Sequence with

- Issues 06, 07 and 12 edit the same builder and its tests: run after this one, never in parallel.
- Issue 03 tokens are measured against the lifted `primary`: if 03 lands first, re-measure its shares here.

## Comments

- 2026-11-19, triage: ready-for-agent. Decided by the owner: builder lifts tokens for every theme (WCAG + APCA), user themes are corrected by the builder and the editor warns, rail icons keep their hue and are darkened per theme (ADR-0033 amendment), Issues run through relay one at a time, the themes repo is fixed with version bumps.
