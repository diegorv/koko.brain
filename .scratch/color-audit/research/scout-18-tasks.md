# Scout 18: Tasks feature and Todoist sync

Read-only audit. Area: Tasks view (TasksView, TaskLists, SourcesPanel), task status glyphs, due/overdue chips, completed task text, editor task checkbox, calendar task chips, Todoist settings, sync status and log dialog. 28 themes.

## Method

- cssVars from theme-tokens.json are already resolved (hex/oklch), so no app.css resolver was needed. Alpha surfaces (Tailwind `bg-accent/50`, `bg-muted/30`, `ring-ring/50`, `bg-destructive/10`, `color-mix(... 55%, transparent)`) were composited in gamma sRGB over the traced surface with color-tools `flatten`.
- Surface traced: TasksView is mounted in EditorView.svelte:71 inside `bg-editor-bg`; TasksView root, TaskLists sidebar and rows set no background. SourcesPanel is `bg-muted/30` over editor-bg with `bg-background` cards. Settings text sits on `--settings-dialog-bg` / `--setting-item-bg`; the status bar on `--status-bar-bg`; the sync log dialog on `--popover`.
- WCAG 2 via `contrastRatio`; APCA Lc with the same constants used by the other scouts (|Lc| < 45 flagged for small text). Thresholds: text 4.5, meaningful icons/borders/focus 3.
- Script: /private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-18-tasks/m.mts, raw output m.out (same dir).
- Not a browser measurement: no app launch.

## What exists in this area (facts that shape the audit)

- There are no priority colors. Priority is an emoji in the note and a plain `text-muted-foreground` word chip in the Tasks row (tasks.logic.ts:163, TasksView.svelte:902). task-line.logic.ts carries no styling at all (parse/serialize only).
- Overdue is a destructive-colored calendar icon plus the chip label switched from muted to foreground (TasksView.svelte:905-907). Not color-only: the label color change and the `title` "Overdue, due ..." also say it.
- Status glyph tones (task-status.logic.ts:47-53): muted-foreground, primary, warning, destructive, success. The circle is the toggle; its meaning is also in `title` and `aria-label`.
- Completed text: `text-muted-foreground line-through` (TasksView.svelte:871). In the editor, completed tasks get only the checkbox widget, no text dimming.
- Editor checkbox colors come from theme-builder.logic.ts:273 (`taskBorder: faintFg`, `taskHover/Checked: primary`, `taskCheckmark: primaryFg`).

## Findings (ranked)

1. [high] Editor task checkbox, unchecked: 2px border `--lp-task-border` (= faintFg, theme-builder.logic.ts:273, styles.ts:238) on editor-bg. 19/28 themes below 3:1; worst 1.50 Zettlr Bielefeld Light (#c8c8c8 on #f3f3e8), 1.61 Sakura and Twilight Violet, 1.69 Lavender Haze, 1.67 on four more Zettlr light themes, 1.78 on the Zettlr dark themes; KokoBrain Default 2.02. The border is the only mark of an unchecked box (fill is transparent). READABILITY_PAIRS has `taskChecked` but no `taskBorder` pair (theme-builder.logic.ts:143). Checked fill, hover border and checkmark all pass (worst 4.51).
2. [medium] Status bar Todoist sync error: `text-destructive` 12px text and icon on `--status-bar-bg` (TodoistSyncStatus.svelte:20). 12/28 fail; worst 3.39 Zettlr Bordeaux Dark, 3.55 other Zettlr dark, 3.62 Willemstad Light, 3.69 Shimmering Focus Light, 3.82 Tolaria Light, 3.98 Twilight Violet, KokoBrain Default 4.01.
3. [medium] Tasks refresh error banner: `text-destructive` row-size text on `bg-destructive/10` over editor-bg (TasksView.svelte:634), including the Retry button. 15/28 fail; worst 2.79 Zettlr Berlin/Bielefeld/Frankfurt/Karl-Marx-Stadt Dark, 2.96 Bordeaux Dark, 3.19 KokoBrain Default, 3.56 Shimmering Focus Light. Same root cause as scout-02 #4 (destructive used as text; theme-builder lifts error to 3:1 only); listed because it is this view's only error text.
4. [medium] Tasks row/list hover on light themes: `hover:bg-accent/50` (TasksView.svelte:845, TaskLists.svelte:185) puts muted-foreground chips, breadcrumb, closed text and inactive list names on a darker tint, and `text-primary` task links too. Muted-foreground on the hover tint: 6 fail (3.74 Zettlr Bielefeld Light, 3.96-3.97 four more Zettlr light, 4.37 Twilight Violet). `text-primary` link text on the hover tint (TasksView.svelte:879, 889): 10 fail (3.59 Zettlr Berlin Light, 3.67 Bordeaux Light, 3.71 Karl-Marx-Stadt Light, 3.75 Bielefeld Light, 3.89 Frankfurt Light, 3.93 Shimmering Focus Light, 4.02 Sakura, 4.06 Twilight Violet, 4.33 Willemstad Dark, 4.47 Graphite Violet). Resting state passes.
5. [medium] TaskLists active row count: `text-muted-foreground` 12px count inside the `bg-accent` active row (TaskLists.svelte:185, 197). 11/28 fail; worst 3.02 on the five Zettlr light themes (#6e6e77 on #c8c8c8), 3.70 Graphite Violet, 3.87 Twilight Violet, 4.13 Sepia, 4.20 Lavender Haze, 4.26 Sakura, 4.43 Tolaria Light. Visible at rest whenever a list is selected. The name (foreground on accent) passes, worst 4.76.
6. [medium] Muted-foreground small text is APCA-weak on six dark themes: due/scheduled/priority/recurrence/tag chips are 11px (`text-label`, TasksView.svelte:902), closed task text, breadcrumbs and counts all use it. WCAG passes (4.53 Zettlr Berlin/Bielefeld/Frankfurt/Karl-Marx-Stadt Dark, 4.68 Bordeaux Dark, 4.87 Twilight Violet) but Lc is -39. Chips carry the due date and the only priority indicator. Token comes from the theme palette.
7. [medium] Keyboard focus indicator `ring-ring/50` (50% alpha ring) on task rows (TasksView.svelte:845, ring-2 inset), the row toggle (855), list buttons (TaskLists.svelte:191) and all row/header buttons: 24/28 below 3:1 against editor-bg; worst 1.93 Willemstad Dark, 1.95 Zettlr Bielefeld Light, 1.99 Shimmering Focus Light, 2.00 Zettlr Berlin Light, KokoBrain Default 2.52. On a hovered row (accent/50 behind it) 25/28 fail, worst 1.81. The task list is a roving-focus list where the row ring is the only indication of position. Full-strength `--ring` passes everywhere (worst 4.52), so the 50% alpha is the cause. Pattern is shared with other shadcn controls, so it is app-wide.
8. [low] Todoist settings error and link text on `--settings-dialog-bg`: load error `text-destructive` 12px (TodoistSection.svelte:151) 12/28 fail, worst 3.01 Zettlr Berlin Dark, 3.05 Bordeaux Dark, 3.08 KokoBrain Default, 3.89 Shimmering Focus Light, 3.92 Twilight Violet; token link `text-primary` 12px (TodoistSection.svelte:91) 4/28 fail: 4.15 Sakura, 4.19 Twilight Violet, 4.30 Shimmering Focus Light, 4.34 Willemstad Dark. Error is shown only when "Load projects" fails.
9. [low] SourcesPanel meta text on `bg-muted/30` (SourcesPanel.svelte:344, text at 282, 348, 353, 362, 472): `text-meta text-muted-foreground` fails on 6 themes: 3.86 Zettlr Berlin/Bielefeld/Frankfurt/Karl-Marx-Stadt Dark, 4.00 Bordeaux Dark, 4.25 Bielefeld Light. The same text on the `bg-background` cards passes (worst 4.58).
10. [low] SourcesPanel exclude-chip remove button: X icon `text-muted-foreground` on the chip's `bg-muted` (SourcesPanel.svelte:322-327): 2.58 on four Zettlr dark themes, 2.52 Zettlr Bordeaux Dark (needs 3:1 as the only control to remove an entry; it has an aria-label). Same cause as scout-02 #7.
11. [low] Calendar task chip hover: `hover:bg-muted` behind closed task text/icon in `text-muted-foreground` (EventTaskChip.svelte:27, 38, 41). Text 14/28 fail on hover, worst 2.52 Zettlr Bordeaux Dark, 2.58 other Zettlr dark, 3.68 five Zettlr light, 3.87 Twilight Violet, 4.15 Tolaria Light; icon 5/28 below 3:1 (2.52-2.58). Resting state (no fill) passes 4.5.
12. [low] Tasks filter box border `border-border` vs editor-bg (TasksView.svelte:955): 28/28 under 3:1 (1.09 KokoBrain Default, 1.22 Tolaria Light, 1.86 Willemstad Light). The field's placeholder and label identify it; same family as scout-02 #10, weaker because it uses `--border`, not `--input`.
13. [low] Dimmed context-row marker: 2px inset strip `muted-foreground` at 55% over editor-bg (TasksView.svelte:845): 25/28 under 3:1, worst 2.08 Zettlr Bielefeld Light, 2.25 Sakura, KokoBrain Default 2.61. Only visual cue besides a `title` that a row is context-only.
14. [low] `--primary` as 12-14px text is APCA-weak on four dark themes while passing WCAG: Willemstad Dark 4.57 Lc -31, Twilight Violet 4.53 Lc -36, Zettlr Frankfurt/Karl-Marx-Stadt Dark 4.53-4.56 Lc -40. Applies to wikilinks and links in task rows (TasksView.svelte:879, 889) and the "Clear", "Show more" and rule-sentence buttons (TasksView.svelte:1100, 1125, 1133, 1190).

## Passed (not findings)

- `--foreground` on editor-bg: worst 7.13. `--foreground` on accent (active list name, hover): worst 4.76. Sync log dialog foreground on popover: worst 7.97.
- Muted-foreground on editor-bg for chips, closed task text, breadcrumbs, counts, empty-state text: WCAG all pass (worst 4.52 Zettlr Bielefeld Light); APCA issue in finding 6.
- Status glyph icons (3:1) on editor-bg: todo/forwarded/cancelled muted 4.52; in-progress primary 4.52; question warning 4.97; important destructive 3.01 (barely, Zettlr Berlin Dark); done success 4.92. On the hover tint: success 3.88, warning 4.00, muted 3.74, destructive 3.03.
- Overdue calendar icon destructive: 3.01 on editor-bg, 3.03 on hover tint (passes 3:1, barely). Overdue label uses foreground, passes.
- Editor checkbox checked fill vs editor-bg (4.52), hover border (4.52), checkmark on fill (4.51): all pass.
- Todoist settings muted descriptions on setting-item-bg: all pass WCAG (4.51); on settings-dialog-bg 4.51. APCA 38-44 on 7 themes (same token as finding 6).
- Status bar fg on status bar bg: all pass (4.50 KokoBrain Default; APCA Lc -37 there).
- Sync log dialog muted text on popover: all pass (4.51 Sakura).
- SourcesPanel chip text `foreground` on `--muted`: worst 4.82. Filter box placeholder on `--background`: worst 4.58.
- Full `--ring` (focus color without alpha) passes 3:1 everywhere.

## Not checked

- Real rendering (no app launch); alpha composites are my own sRGB math.
- Button, Select, Switch, Dialog internals from shadcn used here (Load projects button, Select triggers, Switch track): covered by other areas.
- Dropdown/context menu item colors (radio/checkbox items, sub-triggers): shared component, not measured here.
- Date input in the due dialog (TasksView.svelte:1223+): scout-02 #12 covers the date input color.
- Kanban card due/priority colors and queryjs tasklist (`.cm-lp-qjs-tasklist`) belong to other scouts.
- `task-line.logic.ts` has no colors; Todoist priority maps to emoji only, so there are no priority colors to audit.
- Disabled (`opacity-50`) Retry button and hover-only fade-in states.
