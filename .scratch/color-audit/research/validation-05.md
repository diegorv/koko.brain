# Validation 05 (graph view, overlays, states)

Validator re-measured every finding from theme-tokens.json cssVars with color-tools.mts (WCAG 2) and an APCA 0.0.98G port. Alpha fills (Tailwind `/NN`, `opacity-50`, CSS alpha) were composited in sRGB over the real surface. `--list-bg` is resolved per app.css (dark: `--file-explorer-bg`; light: 50% mix of fe-bg and editor-bg). Graph panels are `--background` at 90% over `--editor-bg` (backdrop blur ignored). Dialogs and the command palette are `bg-popover` (dialog-content.svelte:30, command.svelte:24). Scripts: scratchpad/audit-validate-05/t1..t7.mts.

## Verdicts

| # | Finding | Verdict | Sev | Own measurement |
|---|---|---|---|---|
| 1 | graph-view.logic.ts:288 dimmed nodes and labels | confirmed | low | labelDimmed 1.57 (Zettlr Bielefeld Light) to 2.27 (Willemstad Light), APCA 0 on Willemstad Dark; nodeDimmed 1.22 to 1.53. This is a deliberate hover focus mode, so it gets low severity |
| 2 | GraphControls.svelte:45 mode toggle selected | confirmed | medium | chip vs panel 1.01 (Shimmering Focus Light), 1.05 Willemstad Dark, 1.06 KokoBrain Default, best 2.06; fg vs muted-fg icon 1.25 (Shimmering Focus Dark) to 2.74 |
| 3 | GraphControls.svelte:121 borders, select, switch | confirmed | medium | border vs panel 1.06 KB Default to 2.06; select chevron at 50% 1.94 to 2.90; switch track vs panel 1.25 Twilight Violet to 3.87; light-theme thumb vs track 1.28 Sakura, 1.31 Tolaria Light, 1.38 Lavender Haze. switch.svelte and select-trigger.svelte are shared, so this applies app-wide |
| 4 | GraphView.svelte:316 label over node | confirmed | low | label on node 1.12 Shimmering Focus Dark to 1.71; label on the active node 1.05 Zettlr Bielefeld Dark. Labels and nodes are drawn in one loop (GraphView.svelte:319-340), so how often this happens depends on graph density |
| 5 | command-item.svelte:20 accent vs popover | confirmed | high | 1.00 on all 5 Zettlr dark themes (palette selected == popoverBg == #282832 in themes/zettlr-*-dark.json), 1.01 Willemstad Dark, 1.06 Sakura, 1.24 KB Default, best 1.67. Text stays p.fg, so the selected row has no visible cue |
| 6 | ZoomChip.svelte:16 hover primary | confirmed | low | 3.73 Sakura, 4.02 Willemstad Dark (APCA -30), 4.48 Graphite Violet |
| 7 | CommandPalette.svelte:60 muted-fg on accent | confirmed | medium | 11/28: 3.02 Zettlr light x5, 3.70 Graphite Violet, 3.87 Twilight Violet, 4.13 Sepia, 4.20 Lavender Haze, 4.26 Sakura, 4.43 Tolaria Light; Deep Ocean 4.50 borderline |
| 8 | DiffViewer.svelte:14 diff text on tints | confirmed | high | delete 21/28 under 4.5 (2.65 Zettlr Bordeaux Dark, 2.74 KB Default and Zettlr dark, 3.24 Sakura; LH 4.09); insert 11/28 (3.42 Sakura); line numbers 3.32 KB Default on the insert tint |
| 9 | FileHistoryDialog.svelte:83 timestamp opacity-50 | confirmed | low | 28/28 under 3: 1.90 Zettlr light, 2.05 LH, 2.36 KB Default. The header text itself (muted-fg on muted/50) fails 11/28 (3.42 Zettlr Bordeaux Dark) |
| 10 | QuickSwitcher.svelte:137 type icons on accent | confirmed | low | 2.23 Zettlr light yellow, 2.51 Bielefeld Light teal, 2.80 LH orange, 2.83/2.85 Shimmering Focus L/D, 2.92 Sakura, 2.96 Zettlr Bordeaux Dark red (also 2.96 on plain popover). Only applies when the user gives a type a color |
| 11 | SearchPanel.svelte:251 muted text on muted | confirmed | high | mode labels 14/28: 2.52 Zettlr Bordeaux Dark, 2.58 Zettlr dark (APCA -28), 3.68 Zettlr light and LH; same numbers for the Text badge (SearchResult.svelte:156) and the Archived chip |
| 12 | SearchResult.svelte:151 file-explorer primary as text | confirmed | medium | Both/Semantic badges 14/28 (3.25 Twilight Violet, 2.81 Zettlr KMS Light on hover); fuzzy toggle 19/28 (3.18 Shimmering Focus Light); § heading 7/28 idle (3.97 Twilight Violet), 3.33 Zettlr Berlin Light on hover |
| 13 | TodoistSyncStatus.svelte:20 error text | confirmed | low | 12/28: 3.39 Zettlr Bordeaux Dark, 3.55 Zettlr dark, 3.62 Willemstad Light, 4.01 KB Default, 4.37 LH. The icon passes 3:1 |
| 14 | ModActionPicker.svelte:126 progress fill | confirmed | low | fill vs track 2.58 Zettlr Frankfurt Dark, 2.60 KMS Dark, 2.96 Berlin Dark |
| 15 | SettingsPanel.svelte:137 active section | confirmed | medium | hover-bg vs sidebar 1.00 Shimmering Focus Light, 1.04 Willemstad Dark, 1.06 Cool Mist and Willemstad Light, 1.25 KB Default, 1.48 LH. The only other cue is font-medium |
| 16 | scroll-area-scrollbar.svelte:29 thumb | confirmed | low | 30% thumb 1.44 (Zettlr Bielefeld Light list-bg) to 1.64 KB Default; 50% hover 1.89 or more |
| 17 | composition-aware-bracket-matching.ts:164 | confirmed | low | `--bracket-match-bg` is set nowhere in src. The fill measures 1.08 Sepia, 1.09 LH, 1.10 to 1.12 on the other light themes; link and wikilink text on the fill 2.25 Zettlr Frankfurt Dark, 2.67 KB Default (8 themes under 3:1) |
| 18 | PropertiesView.svelte:230 placeholders | confirmed | medium | preflight currentcolor 50%: 2.30 Zettlr light, 2.82 LH, 4.39 KB Default; PropertyField:187 1.46 LH, 1.56 KB Default; PropertyField:113 1.93 LH; kanban 1.94 Tolaria Light, 2.56 KB Default |

## Shared root causes

- A. Selected state shown only by a faint fill (2, 5, 15, and missed M2). The theme-builder maps `accent` to `p.selected`, `muted`/`secondary`/`settingsHoverBg` to `p.hover`, and never checks them against popover or sidebar. The app fix that works on every theme is a non-color cue: a primary leading bar, or a primary icon or text on the selected row. Themes repo: `selected` must differ from `popoverBg` (all 5 Zettlr dark themes).
- B. Muted text on the muted and accent tints (7, 11, 9). READABILITY_PAIRS lifts mutedForeground only on editorBg, background, card and popover. Add `hover` and `selected` flattened over popover and over the list background.
- C. Hue tokens lifted only on editorBg (6, 8, 12, 13, missed M1). In readableCore (theme-builder.logic.ts:184-187), `primary` is lifted to 4.5 on editorBg only and `error` to 3 on editorBg only. Lift both on popover, sidebar and status bar. Where the text sits on its own 15-20% tint (diff lines, badges, fuzzy toggle), take the text from the foreground token and keep the hue for the tint.
- D. Type tokens tested only on fileExplorerBg (10).
- E. Low-contrast border, input and switch tokens (3, 14): `switchUncheckedBg = p.borderStrong`.
- App only: 1, 4, 16, 17, 18.

## Missed

- M1. ModActionPicker.svelte:19 (rendered at :115): the mod run "Failed" status uses `text-destructive`, 12px, on popover. Measured 2.96 Zettlr Bordeaux Dark, 3.02 KB Default, 3.11 Zettlr dark, 3.97 Sakura; 12/28 fail. Same cause as C and the scout-17 destructive-menu finding.
- M2. TodoistSyncLogDialog.svelte:39: the selected filter pill is `variant=secondary` (bg-secondary) against a ghost pill on popover, with the same text color. Measured 1.00 Willemstad Dark, 1.02 Graphite Violet, 1.24 KB Default, 1.51 LH, best 1.81. Same cause as A.
