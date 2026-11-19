# Validation 04: scouts 13, 14, 15 (tags/properties, rail/sidebar, graph)

Scripts: /private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-validate-04/ (lib.mts, m1-m6.mts).
Method: own lib over color-tools.mts; every translucent layer alpha-composited over the real surface; list-bg / nav-bg / rail-bg derived per app.css:380-393 (light: oklch mixes approximated in OKLab; dark: OKLCH L shift). Tailwind `x/NN` checked in the built CSS (color-mix oklab with transparent = alpha NN%). Counts are fails/28 (light L, dark D).

## Verdicts

| # | Finding | Verdict | Severity | Owner | Own measurement |
|---|---------|---------|----------|-------|-----------------|
| 1 | evaluator.ts:448 badge() | confirmed | high | app | editor-bg: red 27/28, purple 27/28, blue 25/28, gray 22, green 21, orange 21, yellow 15 (all light). Worst yellow 1.51 Sepia; on lp-collection-bg yellow 1.29 Lavender Haze (Lc 11). KD blue 3.54, purple 2.95 |
| 2 | evaluator.ts:462 color() | confirmed | high | app | editor-bg: purple 25/28, red 24/28, blue 17/28, others 15/15 light. Yellow 1.63 Sepia, 1.38 Lavender Haze on lp-collection-bg. KD red 3.58, purple 3.53 |
| 3 | evaluator.ts:457 progress() | confirmed | medium | app | label rgb(160,160,160): 15/15 light, 2.22 Sepia (editor-bg), 1.88 Lavender Haze (lp-collection-bg); bar vs surface yellow 1.63, green 2.06, blue 2.59 (8 light) |
| 4 | NoteRow.svelte:141 pills | confirmed | medium | both | rest 10/28, worst Twilight Violet 3.49 (Lc -32); hovered row 18/28 (3.08); active row 26/28 (2.53) |
| 5 | NoteInfo.svelte:44 heading | confirmed | low | themes-repo | 7/28: 4.08 Shimmering Focus Light ... 15px semibold is not large text |
| 6 | TagColorPicker.svelte:99 active ring | confirmed | low | app | ring vs enclosed swatch: dark 13/13 fail for orange/yellow/green/cyan/purple (yellow 1.07 Deep Ocean, cyan 1.03); ring vs popover >= 7.97 |
| 7 | TagColorPicker.svelte:60 custom swatch | confirmed | medium | app | rgba(255,255,255,.1) vs popover 1.00 on all light, 1.36 KD; 28/28 |
| 8 | TagItem.svelte:62 count on hover | confirmed | low | themes-repo | 11/28: 3.02 on 5 Zettlr light (Lc 43); at rest min 4.52 |
| 9 | theme-builder:123 type palette on tint | confirmed | medium | both | nav selected 10-13/28 per hue (red 2.11 Bordeaux Dark), list selected 10-12/28 (red 1.94); organize check 8/28 plain (2.88), 15/28 on active row (1.98 Willemstad Light) |
| 10 | IconPicker.svelte:51 title colors | confirmed | medium | app | as title text on list-bg: Purple 25/28, Red 24/28, Blue/Pink 19/28, Yellow/Green/Cyan/Orange 15/15 light (Yellow 1.47 Sepia on nav). Also EditorTabs.svelte:232 tab titles (Yellow 1.47 on tab-bar) |
| 11 | NoteRow.svelte:127 selected text | confirmed | high | both | primary on list tint 21/28 (Twilight Violet 2.82, KD 3.70); fe-primary on nav tint 20/28 (2.97, KD 4.05); fe-fg on tint >= 5.03 |
| 12 | FilesNavigator.svelte:569 muted on tint | confirmed | medium | both | counts selected 21/28 (KD 3.08), subtitle selected 22/28 (2.96); hover 10-12/28; base pairs sit at exactly 4.50 so any tint breaks them |
| 13 | Rail.svelte:384 active tint | confirmed | low | app | 18% tint vs rail-bg 1.06-1.45, 28/28; hover fg/10 1.15-1.32 |
| 14 | Rail.svelte:382 ring/50 | confirmed | medium | app | 24/28 on rail/nav/list/tab-bar (1.80 Bielefeld Light); 28/28 on selected tint; full ring on rail min 3.62. Button already uses full ring-ring |
| 15 | RailNoteList.svelte:974 toolbar state | confirmed | low | app | active vs inactive 1.25 (Shimmering Focus Dark) - 2.74, 28/28 |
| 16 | RailPropertiesPicker.svelte:130 | confirmed | low | app | fe-muted-fg on popover KD 3.71 (Lc -35); built CSS orders text-file-explorer-muted-fg after section-label so it wins |
| 17 | graph-view.logic.ts:296 center node | confirmed | medium | app | primary vs muted-fg <1.5 on 23/28; OKLab distance 4.9 KD, 5.3 Mint Linen, 6.0 Twilight Violet |
| 18 | graph-view.logic.ts:289 edges | confirmed | medium | app | edge 21/28 under 3:1 (2.31 Bielefeld Light, KD 2.73); edgeHighlight 27/28 (1.79 Willemstad Dark) and weaker than plain edge on many themes |

## Shared root causes
- A (1, 2, 3): raw COLOR_PRESET_TEXT on light surfaces. The chip mix at 30% preset / 70% editor-fg leaves 13/784 pairs under 4.5 (worst 4.14); 25/75 leaves 1/784 (4.42). Use 25/75 or ensureContrast.
- B (4, 9, 11, 12, 14 on selected rows): 25% primary tint under primary or muted text. Lighter tint does not fix it (0.12 still 12-15/28 because muted tokens have zero headroom: min 4.50 on base). Selected-row text in foreground (passes >= 5.03), primary kept for icon or a bar; add selected-tint pairs to READABILITY_PAIRS for built-ins and the themes repo.
- C (10, plus tag dots in missed): fixed dark-theme palettes used on light themes.

## Missed
- Tag color dots (TagColorDot.svelte:14 in Tags view on editor-bg, PropertyField.svelte:173 tag icon on input-bg): tag-colors.ts presets on light themes yellow 1.20 Sepia / 1.15 Lavender Haze, cyan 1.38/1.32, green 1.72/1.64, orange 1.99/1.91, purple 2.44/2.34; 15/15 light fail per preset except red. Dark all pass.
