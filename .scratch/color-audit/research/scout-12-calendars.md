# Scout 12: calendars (event calendar, calendar navigator, periodic notes, Today)

Read-only audit. Scripts and raw output:
/private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-12-calendars/
(lib.mts copied from scout 03, measure.mts, m2.mts, m3.mts, m4.mts, results.json, table.txt, m2.txt, m3.txt).

## Scope traced

- src/lib/features/event-calendar/*.svelte (EventBlock, EventMonthGrid, EventAllDayLane, EventDayHeaders, EventWeekStrip, EventTimeGrid, EventTaskChip, EventTaskLane, EventPopover, EventDialog, EventForm, EventColorSwatches, EventCalendarHeader, EventCalendarNeedsAttention, EventDailyNoteButton, ShowInCalendarButton, EventShortcutsDialog, EventCalendarSection).
- src/lib/plugins/calendar/CalendarGrid.svelte and CalendarNavigator.svelte (left-rail Days navigator).
- src/lib/plugins/periodic-notes/DailyNoteButton.svelte (ghost icon button, shared Button styles only).
- app.css:396-415 (`--event-<c>-bg/fg` tokens) and the theme tokens in theme-tokens.json.
- No weekend shading and no today-column highlight exist in the event calendar (grep of EventTimeGrid/EventMonthGrid: only borders, `bg-editor-bg`, `bg-border`). The only weekend color cue is the navigator (`text-file-explorer-primary`).
- "Today view": the Today lens is a rail note list (RailNoteList); its only calendar-owned colors are in the navigator. The Today section registered by one-on-one is another area. The collection calendar / linear calendar views belong to the collections scout.

## Method

1. Surfaces: event calendar sits on `--editor-bg` (sticky headers `bg-editor-bg`); popover/dialog/EventForm on `--popover` (popover-content.svelte, dialog-content.svelte both `bg-popover`); settings swatches on `--settings-dialog-bg`; navigator on nav-bg (light = file-explorer-bg, dark = file-explorer-bg L-0.03, as scout 03 derived it); week-number column adds `bg-background/70` over nav-bg.
2. Event chips: `eventColorStyle` = `background: var(--event-X-bg); color: var(--event-X-fg)` (event-calendar-event.logic.ts:434-436). Tokens resolved as `color-mix(in oklab, hue 25%, editor-bg)` and `color-mix(in oklab, hue 30%, editor-fg)` with mixColors (t = share of the base).
3. For every pair on all 28 themes: WCAG 2 ratio (contrastRatio, alpha composited) and APCA Lc (APCA-W3 0.0.98G from scout 03's lib). Thresholds: text 4.5, meaningful non-text 3; APCA |Lc| < 45 flagged for small text.
4. Tailwind class precedence checked in the built CSS (.svelte-kit/output/client/_app/immutable/assets/0.Deg3xRUq.css): `.text-primary-foreground` is emitted after `.text-file-explorer-primary`, so on a selected weekend day in the navigator the white/dark label wins, not the primary color. No invisible-label bug there.
5. Light 15 themes, dark 13 (per the `dark` flag).

## Measurements (case, fails/28 at threshold, worst light, worst dark)

Full per-theme rows: results.json; lists in m2.txt and m3.txt.

```
chip text green   4.5 fails 5 (light 5)  worst Zettlr Bielefeld Light 4.10 Lc58 (#4f6f66 on #c8e5ce)
chip text cyan    4.5 fails 5 (light 5)  worst Zettlr Bielefeld Light 4.06 Lc58 (#4f6e7d on #c8e4e4)
chip text orange  4.5 fails 2            worst Zettlr Bielefeld Light 4.15
chip text purple  4.5 fails 1            Zettlr Bielefeld Light 4.40
chip text pink    4.5 fails 1            Zettlr Bielefeld Light 4.31
chip text blue    4.5 fails 1            Zettlr Bielefeld Light 4.36
  fail set: Zettlr Berlin/Bielefeld/Bordeaux/Frankfurt/Karl-Marx-Stadt Light (4.06-4.50); dark themes all >= 5.24
chip text under hover:brightness-110: slightly better (cyan worst 4.27, 5 fails), so hover does not add failures
chip lock icon (opacity-70) 3:1: all 6 colors fail on the same 5 Zettlr Light themes, 2.50-2.64 (Bielefeld Light 2.52 green); dark worst 3.39
popover dot / settings swatches (--event-X-fg fill on popover, settings-dialog-bg) 3:1: 0 fails, worst 5.44
chip bg vs pane (chip edge): 1.18-1.38, chips are identified by their fill tint and label, not a 3:1 boundary
selected ring (ring-primary/70) vs pane 3:1: fails 10 (Sakura 2.80, Shimmering Focus Light 2.75, Twilight Violet 2.94, Willemstad Dark 2.75, Zettlr Berlin Light 2.78, Bielefeld Light 2.69, Bordeaux Light 2.81, Frankfurt Dark 2.98, Frankfurt Light 2.90, Karl-Marx-Stadt Dark 2.95)
selected ring vs chip fill: 21-22/28 fail (worst 1.92 Twilight Violet); informational, the chip fill sits only 1.2-1.4 from the pane
selected day label (primary-foreground on primary), WCAG: 0 fails, min 4.51; APCA |Lc|<45 on 5 themes:
   Willemstad Dark 4.51 Lc33 (#090909 on #567f83), Zettlr Berlin Light 4.51 Lc33 (#030305 on #12865e), Twilight Violet 4.95 Lc39, Zettlr Frankfurt Dark 4.54 Lc41, Zettlr Karl-Marx-Stadt Dark 4.56 Lc41 (Berlin Dark 5.36 Lc47 borderline)
   same pair in the navigator (bg-file-explorer-primary text-primary-foreground): identical values, --file-explorer-primary == --primary in all 28 themes
today number (text-primary) on editor-bg 4.5: 0 fails, min 4.52 Shimmering Focus Light
today number on hover:bg-muted 4.5: fails 15 (light 8, dark 7), worst Zettlr Frankfurt Dark 2.58, Karl-Marx-Stadt Dark 2.60, Berlin Dark 2.96, Berlin Light 3.33
out-of-month day number (text-muted-foreground) on hover:bg-muted 4.5: fails 14 (light 8, dark 6), worst Zettlr Bordeaux Dark 2.52, Berlin/Bielefeld/Frankfurt/KMS Dark 2.58, Twilight Violet 3.87, Zettlr Light x5 3.68
   same pair: EventDailyNoteButton hover, closed EventTaskChip hover (muted-fg + line-through), view toggle has no hover bg (not affected)
weekday headers, time axis, task lane labels, "+N more", subtitle, popover muted text (muted-fg on editor-bg / popover): all pass, min 4.51-4.52 (Zettlr Bielefeld Light / KokoBrain Default); APCA Lc -39..-44 on 7 dark themes, small text, marginal
view toggle selected (foreground on bg-muted): min 4.82
focus ring (ring on editor-bg), now-line, create-ghost border/text: pass, min 4.52
needs-attention badge (text-destructive on bg-destructive/10 over editor-bg), text-xs medium: fails 15 (light 6, dark 9): KokoBrain Default 3.19 Lc-31, Zettlr Berlin/Bielefeld/Frankfurt/KMS Dark 2.78 Lc-25, Bordeaux Dark 2.95, Twilight Violet 3.74, Shimmering Focus Light 3.53, Tolaria Light 3.58, Willemstad Light 3.63, Lavender Haze 3.93
destructive text on popover (EventForm errors text-xs, dialog): fails 12: KokoBrain Default 3.02, Zettlr Bordeaux Dark 2.96, Zettlr Berlin/Bielefeld/Frankfurt/KMS Dark 3.11, Sakura 3.97, Graphite Violet 4.14, Shimmering Focus Light 4.09, Tolaria Light 4.13, Willemstad Light 4.20, Shimmering Focus Dark 4.42
destructive text on editor-bg (EventCalendarView load error): fails 10, worst Zettlr Berlin/Bielefeld/Frankfurt/KMS Dark 3.01, KokoBrain Default 3.44
Trash2 icon text-destructive on popover 3:1: 1 fail (Zettlr Bordeaux Dark 2.96)
navigator weekend day numbers / month label / weekend header (file-explorer-primary on nav-bg) 4.5: fails 8 (light 6, dark 2): Shimmering Focus Light 4.08, Bielefeld Light 4.13, Sakura 4.15, Berlin Light 4.19, Bordeaux Light 4.29, KMS Light 4.32, Twilight Violet 4.36, Willemstad Dark 4.40
navigator weekend day on hover:bg-file-explorer-accent 4.5: fails 11, worst Zettlr Berlin Light 2.73, Bordeaux Light 2.80, KMS Light 2.82, Frankfurt Light 2.95, Bielefeld Light 3.03, Shimmering Focus Light 3.37
navigator dot (bg-file-explorer-primary) on nav-bg 3:1: 0 fails (min 4.08); on hover accent: 4 fail (2.73-2.95)
navigator dot on the SELECTED day (bg-file-explorer-primary on bg-file-explorer-primary): 1.00:1 in 28/28
navigator today ring (ring-1 file-explorer-primary vs nav): min 4.08, pass
navigator current-month day numbers, hover, headers, chevrons, section label: pass (min 4.50 Lavender Haze muted on nav)
today marker distinguishability: today is text-primary only (no weight, ring or dot) in EventMonthGrid.svelte:115, EventDayHeaders.svelte:44, EventWeekStrip.svelte:53. primary vs editor-fg is under 3:1 in 26/28 themes (Zettlr Bordeaux Dark 1.08, Deep Ocean 1.22, Shimmering Focus Dark 1.32); OKLab distance under 15 in 4 (Deep Ocean 12.5, Bordeaux Dark 13.8, Bielefeld Light 14.5, Bordeaux Light 14.6)
event dialog checkbox accent-primary vs popover 3:1: 0 fails
```

## Findings

1. Selected day label reads poorly by APCA on 5 themes (medium, both). Root: readableCore lifts `primary` to 4.5 on editor-bg so it can serve as text, then `ensureContrast(primaryFg, primary, 4.5)` (theme-builder.logic.ts:194) picks the nearly black extreme for mid-tone fills. Willemstad Dark: repo primary #0d5257 with white label, lifted to #567f83, white then fails 4.5 so the label becomes #090909 (Lc33). White on the same fills is Lc -64 to -77 (m4.mts); `labelColors` (the aede19baa approach) yields white on a fill darkened to 4.5:1 at Lc -77. Elements: month grid day number (EventMonthGrid.svelte:113), day headers (EventDayHeaders.svelte:42), week strip (EventWeekStrip.svelte:51), navigator (CalendarGrid.svelte:60). The same bg-primary + text-primary-foreground pair is used app-wide (buttons), so the fix is shared.
2. Navigator dots vanish on the selected day (medium, app). CalendarGrid.svelte:68 draws dots in `bg-file-explorer-primary`; the selected day (line 60) fills with the same token: 1.00:1 on all 28 themes. The picked day defaults to today, so a today with notes shows no count.
3. Event chip text and lock icon on 5 Zettlr light themes (medium, app). The 25%/30% mix in app.css:403-414 is documented as verified on KokoBrain Default and Sakura only; on Zettlr Berlin/Bielefeld/Bordeaux/Frankfurt/Karl-Marx-Stadt Light the label is 4.06-4.50 (cyan, green worst), and the read-only lock at opacity-70 (EventBlock.svelte:128, EventMonthGrid.svelte:146, EventAllDayLane.svelte:91) is 2.50-2.64:1.
4. Destructive text in the calendar (medium, both). Needs-attention badge (EventCalendarNeedsAttention.svelte:69), EventForm errors (EventForm.svelte:88,115,162,198), load error (EventCalendarView.svelte:243), trash icon (EventPopover.svelte:197, EventDialog.svelte:211). Root: readableCore lifts `error` only to 3:1 (theme-builder.logic.ts, `lift(p.error, 3)`), and the built-in KokoBrain Default `--destructive` is #f3333b (3.02 on popover, 3.19 on the badge). Five Zettlr dark themes reach 2.78 on the badge and 3.11 in dialogs. Default theme included, so this is common.
5. Hover backgrounds under muted/primary text (medium, both). `hover:bg-muted` on out-of-month day numbers (EventMonthGrid.svelte:118), today number (:115, EventDayHeaders.svelte:44, EventWeekStrip.svelte:53), daily-note button (EventDailyNoteButton.svelte:44), closed task chip (EventTaskChip.svelte:37-38), and navigator weekend days on `hover:bg-file-explorer-accent` (CalendarGrid.svelte:58/60). Muted-foreground and primary are lifted against editor-bg/nav-bg only, not against the hover fill: 2.52-3.9:1 on 6 dark themes, 3.4-3.7 on Zettlr light.
6. Navigator weekend day numbers, weekend header and month label (low, both). `--file-explorer-primary` is lifted against the editor, not nav-bg, so it drops to 4.08-4.40 on 8 themes (CalendarGrid.svelte:46,58; CalendarNavigator.svelte:114).
7. Today is marked by hue only in the event calendar (low, app). See measurement above; the navigator adds bold + ring (CalendarGrid.svelte:59), the event calendar does not. The daily-note button stays visible on today (EventDailyNoteButton.svelte:22-24) as a second cue only when a daily-note opener is registered.
8. Selected event ring too faint on 10 themes (low, app). ring-primary/70 (EventBlock.svelte:79, EventMonthGrid.svelte:134, EventAllDayLane.svelte:80): primary's 4.5:1 is cut by the 70% alpha to 2.69-2.98 against the pane.

## Passed

- Popover dot and Settings color swatches (event hue fill vs popover/settings-dialog-bg): min 5.44:1.
- Selected-state indicator of the swatch (border-foreground): large margin, not measured per theme beyond foreground vs bg (4.5+ by READABILITY_PAIRS).
- Focus rings, now-line, create ghost, dialog checkbox: >= 4.52.
- Muted labels (weekday headers, hour axis, All day, task lane, +N more, popover date/time/location, shortcuts dialog labels, header subtitle, navigator headers/section label/chevrons): all >= 4.50.
- Navigator current-month and hover (foreground on accent): >= 4.76.
- EventForm textarea placeholder (muted-fg on input-bg): >= 4.51; kbd text (popover-fg on muted) >= 4.82.
- Chip text on all 13 dark themes: >= 5.24; chip text APCA on all themes Lc 57+.

## Overlaps with scout 03, not re-reported

- Navigator out-of-month day numbers (CalendarGrid.svelte:58, `/40`): re-measured 1.67-2.42:1, 28/28.
- Week-number column (`file-explorer-fg/70` on `background/70` over nav): re-measured 3.55 Zettlr Berlin Light, 5 light fails; same numbers.
- Archived event blocks (`opacity-50` on EventBlock.svelte:80, EventMonthGrid.svelte:135, EventAllDayLane.svelte:81): 168/168 fail, see scout 03.

## Could not check

- Real rendered colors in the running app (no tauri dev, no screenshots); all numbers computed from theme-tokens.json and static CSS.
- `oklch(from ...)` dark nav-bg approximated in OKLab (scout 03's helper); expected error under 1 level per channel.
- Tailwind `/NN` opacity colors compile to `color-mix(in oklab, ..., transparent)`; treated as plain alpha compositing, differences are sub-level.
- Event chip rendering with the `pending` dashed border: the border uses `currentColor` over the chip fill, same ratio as text (not a separate failure).
- WKWebView-specific filter behavior for `hover:brightness-110` (modeled as 1.1x per sRGB channel on fg and bg).
- User-chosen vault events in colors outside the six tokens: the type allows only the six.
- The Today rail section from one-on-one and the collection (linear) calendar views are outside this area.
