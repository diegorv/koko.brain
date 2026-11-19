# 01: Faded text and icons use full-strength tokens

**Origin:** color audit 2026-11-19 (`.scratch/color-audit/report.md`, cause A). Each finding below has its fg, bg, worst theme, measured ratio and validator fix in `.scratch/color-audit/research/workflow-result.json` (search by `file:line`); notes in `research/scout-*.md` and `research/validation-*.md`; resolved tokens of all 28 themes in `research/theme-tokens.json`.

**What to build:**

The theme builder tunes `muted-foreground`, `right-sidebar-muted-fg`, `tab-text-inactive` and the other muted tokens to 4.5:1 on their surface. An alpha modifier (`/30` to `/70`) or an `opacity-NN` on a text container throws that away: the findings below measure 1.5 to 3.8:1, and 3 are high.

1. Text and placeholders: drop the alpha and use the token at full strength. Sites: collection results count (`CollectionView.svelte:613`), Properties "Add property" label and "Add item" input (`PropertiesView.svelte:230,235`, `PropertyField.svelte:191`), property values at 70% (`PropertyField.svelte:131,139`), kanban placeholders (`KanbanView.svelte:607`, `KanbanLane.svelte:418`), collection table null dash (`CollectionTableView.svelte:73`), Tasks Sources hint (`SourcesPanel.svelte:344`), File History timestamp (`FileHistoryDialog.svelte:83`), the date input at 70% (`src/app.css:480`).
2. State dims that fade a whole row or chip: Outgoing Links unresolved rows (`OutgoingLinksPanel.svelte:74`) and the Properties unresolved relationship row keep full-strength text and mark the state another way (the destructive color already marks it, or italic, or an icon). Archived event chips (`EventBlock.svelte:80`) and out-of-month calendar days (`CollectionCalendarView.svelte:144,161`, `collection-block-widget.ts:271`, `CalendarGrid.svelte:58`) use `muted-foreground` at full strength instead of opacity on the cell.
3. Icon-only controls that are the sole affordance (3:1 non-text): kanban date icons (`KanbanDatePicker.svelte:67`), collection sort grip and panel remove buttons (`PropertiesPanel.svelte:135`), the unchecked kanban card checkbox border (`KanbanCard.svelte:214`) at full `muted-foreground`; hover keeps going to `foreground`.
4. A guard test so this does not come back (see below).

Purely decorative dims (separators that carry no meaning) may stay; say which ones in the commit.

Not in this ticket: canvas (Issue 09), the live-preview and QueryJS dims (Issue 08), tokens that are themselves too weak on a surface (Issues 05 to 07).

**Size:** M. Split point if one context struggles: items 1 and 4 first, items 2 and 3 second.

**Blocked by:** none

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [x] Failing test first, a source scan in `src/tests/lib/architecture/` (style of the existing scan tests, comments stripped): no `.svelte` file under `src/lib` outside `components/ui/` has `text-(muted-foreground|right-sidebar-muted-fg|tab-text-inactive|file-explorer-muted-fg|foreground)/[0-9]+` or `placeholder:text-*/NN`. An explicit allow-list names the decorative exceptions with a reason each. It fails today on the sites above.
- [x] Component tests for the high ones: the collection results count and the Properties "Add property" label carry the full token class and no alpha (`CollectionView`, `PropertiesView` tests); the Outgoing Links unresolved row has no `opacity-*` and still exposes its unresolved state (attribute or class the test reads).
- [x] A contrast test over `BUILTIN_THEMES` (real `contrastRatio` and `flatten` from `utils/color.ts`): `mutedForeground` on `background`, `rightSidebarMutedFg` on `rightSidebarBg` and `tabTextInactive` on `rightSidebarBg` are at least 4.5:1, and the old `/60` composite of each fails on at least one theme (proves the test sees the real alpha).
- [x] Frontend gate passes; tests that pinned an old opacity class move on purpose and the commit says why.

## Findings covered

| Finding | Sev | Measured (worst) |
|---|---|---|
| `features/collection/CollectionView.svelte:613` Muted info text at 60% alpha: collection results count and 'Add property' label are 2.2-3.8:1 | high | The scout measured the wrong surface: the view root is bg-card (CollectionView.svelte:517), not editor-bg. Re-measured on card: 28/28 fail, 2.35:1 ... |
| `features/outgoing-links/OutgoingLinksPanel.svelte:74` Unresolved link rows dimmed with container opacity (60% / 50%) lose readability | medium | Unresolved rows at opacity-60 on right-sidebar-bg: destructive text fails 28/28, 2.30:1 on Tolaria Light and 1.95:1 on Zettlr Bordeaux Dark. Headin... |
| `plugins/kanban/KanbanDatePicker.svelte:67` Icon-only controls dimmed to 50-60% alpha fall below 3:1 | medium | muted-foreground/50 on background (Kanban date icons, welcome page): 27/28 below 3:1, 1.94:1 on Tolaria Light (Lc 36), 2.23:1 on Twilight Violet. O... |
| `plugins/kanban/KanbanView.svelte:607` Placeholder text at 30-50% alpha is 1.5-3.1:1 (kanban inputs, properties list input) | medium | Kanban filter placeholder and the 'Add a card...' placeholder (KanbanLane.svelte:418, which is not the lane title input) at muted/50 on bg-backgrou... |
| `features/collection/collection-block-widget.ts:271` Widget calendar dims out-of-month cells to 35% opacity, including event pills | medium | Day numbers (--editor-fg composited at .35 over the collection bg) measure 1.76 to 3.11. 26 of 28 themes are under 3:1 and all 28 are under 4.5. Ev... |
| `features/collection/CollectionCalendarView.svelte:144` Svelte calendar out-of-month day numbers use muted-foreground/40 on muted/20 | low | 1.69 to 2.37 in all 28 themes: Zettlr light family 1.69, KokoBrain Default 2.02, best Shimmering Focus Dark 2.37. |
| `features/collection/CollectionTableView.svelte:73` Table null placeholder em dash uses text-muted-foreground/50 | low | 1.99 to 3.02: Tolaria Light 1.99, Zettlr light family 2.00. 27 of 28 themes are under 3. |
| `features/collection/toolbar/PropertiesPanel.svelte:135` Icon-only row actions and drag handle at text-muted-foreground/50 | medium | muted-foreground/50 on popover 1.95 (Sakura) to 2.96 (Willemstad Light), all 28 under 3:1; on accent hover row 1.66 to 2.82. At /70 12 themes still... |
| `plugins/calendar/CalendarGrid.svelte:68` Days navigator: note-count dots are invisible on the selected day | low | Dot and selected fill are both bg-file-explorer-primary: 1.00:1 on 28/28 themes |
| `features/file-history/FileHistoryDialog.svelte:83` File History header timestamp at opacity-50 is 1.6 to 2.8:1 | low | muted-fg at 50% on muted/50 over popover: 1.90 Zettlr light, 1.92 Sakura, 2.05 Lavender Haze, 2.36 KokoBrain Default; 28/28 under 3 |
| `features/properties/PropertiesView.svelte:230` Placeholders drawn with opacity modifiers or inherited 50% alpha fall far below 4.5:1 | medium | preflight placeholder (currentcolor 50%) right-sidebar-fg on right-sidebar-bg 2.30 Zettlr light, 2.64 Sakura, 2.82 Lavender Haze, 4.39 KokoBrain De... |
| `features/event-calendar/EventBlock.svelte:80` Archived event chips dim the whole chip with opacity-50 | low | opacity-50 over editor-bg: worst 1.83 Zettlr Bielefeld Light (green, Lc30) and 1.87 on the other Zettlr Light themes. Most light themes 2.1-2.2; Lu... |
| `src/app.css:480` Date input text is --foreground at 70% alpha | medium | Foreground at 70% over input-bg: 3.71 on the 5 Zettlr Light themes (Lc65); Sakura in the right sidebar (right-sidebar-fg) 4.38. All dark themes pas... |
| `plugins/calendar/CalendarGrid.svelte:58` Other opacity-dimmed text and icons: placeholders, out-of-month days, clear/delete icons | medium | Out-of-month days (file-explorer-muted-fg/40 on nav-bg): 1.67 Lavender Haze to 2.42, 28/28 under 3. KanbanDatePicker outside days (muted/40 on popo... |
| `plugins/kanban/KanbanCard.svelte:214` Unchecked card checkbox border at 40% muted-foreground is nearly invisible in every theme | medium | border-muted-foreground/40 on the card's bg-background: Tolaria Light and all Zettlr Light 1.68, Foolscap 1.72, Sakura 1.76, Lavender Haze 1.78, Ko... |
| `plugins/kanban/KanbanLane.svelte:418` Placeholder text at 50% muted-foreground unreadable in every theme (add-card and filter inputs) | high | muted-foreground/50 on bg-background: Tolaria Light 1.94 (Lc36), all Zettlr Light 1.96, Foolscap 1.99, Lavender Haze 2.10, KokoBrain Default 2.56, ... |
| `features/properties/PropertyField.svelte:131` Property values at 70% opacity fall below 4.5:1 on light Zettlr themes and Sakura | medium | right-sidebar-fg at 70%: 3.50:1 on right-sidebar-bg (#f5f5f5) and 3.66 on input-bg (#ffffff) for all 5 Zettlr light themes (Lc60). Sakura 4.38. Hov... |
| `features/properties/PropertiesView.svelte:235` Properties panel: 'Add property' label and 'Add item' placeholder are drawn at 30-60% opacity | high | 'Add property' (tab-text-inactive/60 on right-sidebar-bg) fails 4.5 on 28/28 themes and is under 3 on 21: KokoBrain Default 2.93 (Lc25), Lavender H... |
| `features/properties/PropertyField.svelte:139` Property values rendered at 70% of the sidebar foreground | medium | Input value: 3.66:1 on Zettlr Light input-bg #ffffff (x5) and 4.38 on Sakura. Boolean: 3.50 on right-sidebar-bg. Date input (app.css:480-481, 70% s... |
| `features/tasks/SourcesPanel.svelte:344` SourcesPanel hint and label text on bg-muted/30 below 4.5 | low | muted-foreground on muted/30 over editor-bg: 6/28 under 4.5, 3.86 (Lc 37) Zettlr Berlin/Bielefeld/Frankfurt/Karl-Marx-Stadt Dark, 4.00 Zettlr Borde... |
| `features/collection/CollectionCalendarView.svelte:161` Calendar '+N more' label falls under 4.5:1 inside out-of-month cells | low | 4.10:1 on the Zettlr dark family (Lc -38), 4.25 on Bordeaux Dark, 4.39 on Twilight Violet. Scout 09 measured this label on plain --card only (4.51 ... |
| `plugins/calendar/CalendarGrid.svelte:58` Calendar days outside the current month are at 1.7-2.4:1 | low | 1.67:1 on Lavender Haze and Zettlr Light, 1.91 KokoBrain Default, max 2.42 Shimmering Focus Dark |

## Comments

- 2026-11-19, triage: ready-for-agent. Decided by the owner: builder lifts tokens for every theme (WCAG + APCA), user themes are corrected by the builder and the editor warns, rail icons keep their hue and are darkened per theme (ADR-0033 amendment), Issues run through relay one at a time, the themes repo is fixed with version bumps.
- 2026-11-19, delivered from `issue/01-faded-text-icons-full-strength-tokens`: muted text, placeholders and icon-only controls use full-strength tokens (no `/NN` alpha or `opacity-*`), faded states marked without opacity, source-scan guard over `src/lib` and `src/routes`, contrast test over `BUILTIN_THEMES`. Review fixes: welcome page chevron/X/paths at full token, calendar read-only locks drop `opacity-70`. Full suite at 9805ff45c: 674 files, 18052 passed, exit 0; `pnpm check` clean. Reviews: round 1 APPROVED, round 2 APPROVED.
