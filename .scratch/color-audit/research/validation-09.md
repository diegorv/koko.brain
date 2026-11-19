# Validation 09 (scouts 02, 04, 14, 16, 18 batch)

Method: own scripts in scratchpad/audit-validate-09 (lib.mts from validator 08: resolves cssVars, flattens alpha, models rail/nav/list per app.css:381-393, `.dark` per theme.service.ts:33). WCAG 2 ratio plus APCA Lc. Thresholds: text 4.5, icons/borders/indicators 3.

| # | Site | Verdict | Sev | Owner | Own measurement |
|---|------|---------|-----|-------|-----------------|
| 1 | SearchResult.svelte:153 Both/Semantic badges | confirmed | medium | both | Both 14/28 <4.5: Twilight Violet 3.25 (Lc31), SF Light 3.54, Sakura 3.56, Willemstad Dark 3.57 (Lc29); hovered row 18/28, Zettlr KMS Light 2.81. Semantic identical (14/28, 3.26). KD 4.53, LH 4.68 pass. |
| 2 | app.css:488 search `<mark>` | confirmed | high | both | muted fg on highlight over list-bg 15/28: Zettlr Berlin/Bielefeld/Frankfurt/KMS Dark 1.60 (Lc15), KD 2.42, Willemstad Dark 2.65, Twilight 2.73, Graphite 3.45, LH 3.65. `color: var(--file-explorer-fg)` fixes 24/28; Zettlr dark stays 4.40 because their `highlight: #ffff0060` is too strong (editorFg in the editor is 3.93 there too): themes repo. |
| 3 | SearchResult.svelte:155 (dup of 1) + fuzzy toggle SearchPanel.svelte:348 | confirmed | medium | both | same as 1; fuzzy sits on bg-background, not list-bg: 19/28, SF Light 3.18, Zettlr KMS Light 3.21, KD 4.47. |
| 4 | ThemeColorRow.svelte:52 swatch | confirmed | low | app | border vs settings-dialog-bg 28/28 <3 (Graphite 1.13, KD 1.21). Rare view. |
| 5 | AppearanceSection.svelte:190 hover icons, X, Active | confirmed (counts corrected) | medium | both | Icons are non-text (3:1): 5/28 fail, Zettlr Bordeaux Dark 2.52, other Zettlr dark 2.58. X hover destructive on destructive/10 over hover: 7/28 <3 (Zettlr dark 1.62-1.66 Lc14, KD 2.57, LH 2.89); scout's Willemstad Light 2.99 not reproduced. Active 12px on hover 17/28 <4.5 (Zettlr Frankfurt Dark 2.58), at rest 6/28 (Sakura 3.73). Hover-only for icons and X. |
| 6 | AutoOrganizeSection.svelte:266 / TrashSection.svelte:68 muted on bg-muted | confirmed | medium | both | 14/28: Zettlr Bordeaux Dark 2.52, Zettlr dark 2.58, Zettlr light 3.68, TV 3.87, LH 4.20. foreground on muted passes 28/28 (min 4.82). Same root as scout 02 #7 / scout 17 #5 / validation-05 #11. |
| 7 | UpdateSection.svelte:291 progress | confirmed | low | app | track vs row 28/28 <3 (KD 1.09); fill vs track 3/28 (Zettlr Frankfurt Dark 2.58). Transient, percent text shown. |
| 8 | BuildInfo.svelte:29 channel badge | confirmed | medium | app | Settings (setting-item-bg): stable 15/28 (LH 3.13), nightly 15/28 (LH 3.16), preview 23/28 (5 <3), dev 19/28. Footer (card): stable 21/28 (LH 3.50). |
| 9 | button.svelte:13 outline border | confirmed | low | app | border vs row 28/28 <3 (Sakura 1.06, LH 1.08, KD 1.09); light fill = row. Label identifies the control: polish only. |
| 10 | SettingItem.svelte:28 muted APCA | confirmed | medium | both | WCAG passes; Lc <45 on 6-7 dark themes (TV 4.51 Lc38 on dialog, Zettlr dark 4.53 Lc39, KD 4.61 Lc44). Plus a real WCAG fail on the settings nav group labels (see missed). |
| 11 | MyPeopleSection.svelte:50 and hover set | confirmed | low | both | MyPeople active row muted 11/28 (Zettlr light 3.02), warning 12/28 (3.05); weekend day hover 11/28 (Zettlr Berlin Light 2.73); today on hover:bg-muted 15/28 (Zettlr Frankfurt Dark 2.58); property type trigger hover 10/28 (Zettlr light 2.77). Duplicates the root of 5/6/17. |
| 12 | tag-colors.ts:3 presets / TagColorPicker swatches | confirmed | low | app | light themes: yellow 1.09-1.41, cyan 1.24-1.62, green 1.55-2.02 vs popover/right sidebar. Custom dot white 10%: 1.00-1.03 on light popovers and 1.33-1.38 on dark: empty swatch invisible in every theme. Content color, low. |
| 13 | theme-builder.logic.ts:273 taskBorder | confirmed | high | app | 19/28 <3: Zettlr Bielefeld Light 1.50, Sakura 1.61, TV 1.61, LH 1.69, Zettlr dark 1.78, KD 2.02. No override in styles.ts:234-264. Same as validation-01 #9. |
| 14 | SourcesPanel.svelte:344 hints on muted/30 | confirmed | low | app | 6/28: Zettlr dark 3.86, Bordeaux Dark 4.00, Bielefeld Light 4.25. |
| 15 | SourcesPanel.svelte:327 chip X | confirmed | low | both | 5/28 <3 (2.52-2.58 Zettlr dark). Muted-on-muted root. |
| 16 | TasksView.svelte:955 filter border | confirmed | low | app | border vs editor-bg 28/28 <3 (KD 1.09); input fill vs editor ~1.07-2.07. Placeholder visible; polish. |
| 17 | TaskLists.svelte:197 active count | confirmed | medium | app | muted on accent 11/28: Zettlr light 3.02 (Lc43), Graphite 3.70, TV 3.87, Sepia 4.13, LH 4.20. text-foreground worst 4.76. |
| 18 | TasksView.svelte:634 error banner | confirmed | medium | both | destructive on destructive/10 over editor-bg 15/28: Zettlr dark 2.79 (Lc25), Bordeaux Dark 2.96, KD 3.19; Retry hover 22/28. foreground on the tint passes 28/28 (min 6.14). Same root as scout 02 #4 / scout 17 #4 (error lifted only to 3:1). |

## Shared fixes

- A. Tint badge text (1, 3, 8, 18; also scout 17 #3/#8): text in a token color on its own 10-20% tint. One helper that runs ensureContrast(token, flatten(tint, surface), 4.5), or use the surface foreground for text with the tint as the cue. file-explorer-fg on the Both tint passes 28/28 (min 6.10).
- B. Muted text on hover/selected/muted surfaces (5, 6, 11, 15, 17): READABILITY_PAIRS has no mutedForeground on muted/hover/selected/settingsHoverBg pair. Lifting mutedFg to 4.5 on Zettlr's #505050 / #c8c8c8 would push it next to fg, so the fix is twofold: the app draws secondary text on those surfaces in foreground, and the themes repo darkens hover (#505050) in the Zettlr dark family.
- C. taskBorder (13): derive from a 3:1 lift of faintFg on editorBg and add the pair.
- D. Search mark (2): app sets mark color to file-explorer-fg; themes repo lowers Zettlr dark highlight alpha.

Not checked: real rendering in the app (computed, not screenshotted); tailwind-merge resolution of the ghost button hover classes was read from source, not from built CSS.
