# Typography and spacing review

Scope: chrome type scale, weights, tracking, padding and gap scale, icon sizes, row heights, vertical rhythm, icon and text alignment. Every claim was checked against code in `src/` (tests excluded) or a screenshot in `references/ux-polish-2026-11-04/screens/`. The editor's own text (live preview) is out of scope except where noted.

## 1. Current state

**Tokens** (`src/app.css:71-91`, `@theme`): `text-label` 11/16, `text-meta` 12/16, `text-row` 14/20, `text-title` 15/22 weight 600. `section-label` utility (`app.css:102`) = `text-label font-semibold tracking-wide uppercase text-muted-foreground`. `cn()` knows the four roles through `utils/text-roles.ts` + `extendTailwindMerge` (`src/lib/utils.ts:8`), so a new role has to be added in both places. Root font size is the browser default 16px. Body font is the system stack (`app.css:390`).

**Key fact:** Tailwind v4 `text-xs` is 12/16 and `text-sm` is 14/20 at a 16px root. They render **pixel-identical** to `text-meta` and `text-row`. Swapping them protects against drift when the scale changes, but nobody will see a difference. The visible problems are the sizes that are off the scale (13px, 10px, 16px, 18px), the same role drawn at different sizes, and spacing and alignment.

**Measured usage** (`.svelte` under `src/`; lines matched):

| Class | Occurrences | Files |
|---|---|---|
| `text-xs` | 205 | 72 |
| `text-sm` | 133 | 71 |
| `text-lg` | 22 | 22 (18 settings `h2`, SettingsPanel, dialog-title, linear calendar) |
| `text-base` | 4 | 4 |
| `text-row` / `text-meta` / `text-label` / `text-title` | 33 / 30 / 10 / 8 | 13 / 13 / 6 / 7 |
| `section-label` | 33 | 19 |
| `text-[11px]` / `[13px]` / `[14px]` / `[10px]` | 20 / 4 / 2 / 1 | 14 files total |
| raw CSS `font-size:` px | 13px x9, 11px x8, 12px x5, 14px x3 | 12 files, 10 of them canvas |

So 338 lines use Tailwind defaults and 81 use the chrome tokens. The tokens are used consistently only in the rail navigators, the right-sidebar panels and RailNoteList.

- **Weights:** `font-medium` 64, `font-semibold` 40, `font-bold` 5, `font-normal` 3.
- **Tracking:** `tracking-widest` 3 (the shadcn shortcut components), `tracking-wide` 2, `tracking-wider` 1.
- **Icons:** `size-4` 151, `size-3.5` 130, `size-3` 60, `size-7` 18, `size-5` 10, `size-6` 9, `size-2.5` 4.
- **Icon buttons:** `button.svelte:23-25` offers only `icon` size-9, `icon-sm` size-8 and `icon-lg` size-10. Chrome icon buttons (24 and 28px) are all written by hand as `p-0.5`, `p-1`, `size-6` or `size-7` wrappers.
- **Spacing scale:** almost all values sit on the 4px grid: gap-2 108, gap-1 81, gap-1.5 62; px-2 127, px-3 56; py-1.5 52, py-1 41, py-0.5 41. Arbitrary spacing is rare (about 30 sites) and is concentrated in row heights and spacers: `py-[5px]` x4, `w-[18px]`, `w-[16px]`, `top-[7px]`, `ml-[5.5rem]`, `h-[1.5px]`, `h-[32px]`.
- **Pane headers:** the rail panes share one recipe, `h-10 pl-6 pr-3 bg-tab-bar` + `text-title` (FilesNavigator:295/299, TypesNavigator:201/205, RailNoteList:416/420, SearchPanel:68). Right-sidebar panels use `h-10 px-3` + `text-title text-right-sidebar-primary`. This is the strongest part of the system.

## 2. Problems (verified)

### High

**H1. Rail pane titles truncate to a few letters.** `RailNoteList.svelte:420` gives the title `truncate` while the count (:421), Sort/Filter triggers (:425-460), header action (:465) and "New here" (:477) are all `shrink-0`. The title is the only element that gives up width. Screenshots: `default/02-rail-today.png` shows "Tod..." and `default/02-rail-types.png` shows "Open pr...". The pane's name is the first thing a user reads, and it loses to secondary chrome.

**H2. The right sidebar has three left edges and no heading hierarchy.**
- "Properties" sits at 12px (`PropertiesView.svelte:152`, `px-3`).
- "Relationships" sits at 16px (`:256`, `px-2` inside the `p-2` body).
- "Table of contents", "Backlinks" and "Outgoing links" sit at 32px (`TableOfContentsPanel.svelte:48-51`, `BacklinksPanel.svelte:56-60`, `OutgoingLinksPanel.svelte:54-58`: a size-3.5 chevron plus `ml-1.5`).

All five headings are `text-title` in the accent color, so the static subsection "Relationships" carries the same weight as the panel title and the collapsible panels. Screenshots: `default/02-rail-today.png`, `10-context-menu-file.png`, `13-more-menu.png` (x=1174 / 1178 / 1194). Mismatched left edges are the most visible "unfinished" signal in the shell.

**H3. The settings control column is a fixed 40%, which squeezes descriptions and wraps values.** `SettingItem.svelte:22` sets `w-2/5 shrink-0` on the control column for every row, even when the control is a 36px toggle.
- Descriptions wrap at about 300px of a 550px card and leave orphan words: "sidebar", "0.5)", "directory" (`20-settings-01-editor.png`, `20-settings-02-sidebar.png`).
- The Heartbeat description runs to six lines (`20-settings-17-troubleshooting.png`).
- The Build value (`BuildInfo.svelte:37`, `font-mono text-sm`) breaks into four right-aligned lines, splitting the date at "2026-11-" / "04T16:51:31)".
- Template path inputs are cut mid-word (`20-settings-05-quick-capture.png`).

One component causes all of these, and Settings is the screen where polish is judged most.

### Medium

**M1. The settings panel overlaps the status bar by 8px.** `SettingsPanel.svelte:116` hard-codes `bottom: 24px`, but `StatusBar.svelte:8` is `h-[32px]`. Visible in every `20-settings-*` screenshot: the nav column ends at y about 876 and the status bar starts at 868.

**M2. The page and dialog title tier is off the scale and copied by hand.**
- Eighteen settings sections repeat `<h2 class="mb-4 text-lg font-semibold">` (PeriodicNotesSection:20, EditorSection:37, ... RailSection:48), and `SettingsPanel.svelte:124` adds the same `text-lg`.
- `dialog-title.svelte:15` is `text-lg leading-none` (12 dialogs). Two dialogs shrink it to 14px: `IconPicker.svelte:144` (`text-sm font-medium`) and `FileHistoryDialog.svelte:66` (`text-sm font-semibold`).
- Calendar titles add more variants: `EventCalendarHeader.svelte:37` (`text-base` semibold), `EventPopover.svelte:167` (`text-base font-medium`), `CollectionLinearCalendarView.svelte:103` (`text-lg font-bold`).

Titles appear at 14, 15, 16 and 18px in medium, semibold and bold, with no named tier above `text-title`.

**M3. Two pane titles skip the shared header recipe.** `TagsView.svelte:50-51` uses `px-4`, `text-sm font-semibold text-primary` and an accent color (`12-cmd-toggle-tags-view.png`: a smaller, purple "Tags"). `CalendarNavigator.svelte:92` uses `text-sm font-medium` where every other rail pane uses `text-title`.

**M4. Settings vertical rhythm comes from stacked margins on top of a flex gap.** All 18 section roots are `flex flex-col gap-2`.
- `h2 mb-4` gives 24px under the title.
- `section-label mt-6 mb-2` (17 sites) gives 32px above and 16px below each group.
- `HeadingTypographyEditor.svelte:37-38` uses its own `mt-4` + `mb-1`.

Helper paragraphs come in 9 class variants: `text-sm` vs `text-xs`, with `mb-4`, `mb-3`, `mt-4 mb-2`, `-mt-1 mb-2` or none (TypesSection:54, TroubleshootingSection:101, AutoMoveSection:150/156/178, QueryjsSection:44+). Spacing between groups changes from page to page.

**M5. Some sizes are truly off the scale (13px, 10px).**
- `CalendarGrid.svelte:57`: day numbers at `text-[13px]`.
- `RelationshipSearch.svelte:57,77,87`: `text-[13px]`.
- `Rail.svelte:131`: inbox badge at `text-[10px] leading-[14px]`, below the 11px floor that the scale comment sets.
- Canvas uses raw 13px in 9 places (FileNode:105, TextNode:97/119, LinkNode:143/203, CanvasFilePicker:106/128/150, CanvasLinkInput:112). Canvas menus and pickers mix 11/12/13/14px for the same row role (CanvasContextMenu:199 12px, CanvasFilePicker:128 13px, CanvasInner:715 14px).

These are the only sizes that look different from the rest of the chrome.

**M6. Icon-to-label gap is doubled in 13 menu items.** `context-menu-item` and `dropdown-menu-item` already apply `gap-2`. Thirteen call sites add `mr-2` to the icon, which makes the gap 16px instead of 8px: `EditorTabs.svelte:84,90`, `MarkdownEditor.svelte:618,623`, `KanbanCard.svelte:236` and 8 more found by grep `mr-2 size-4`. Visible in `10-context-menu-file.png`, where "Pin Tab" / "Close Tab" labels sit further from their icons than in other menus.

**M7. The command dialog overrides its children's sizes.** `command-dialog.svelte:33` forces `[&_[data-command-item]_svg]:h-5 w-5` and `py-3` on items. QuickSwitcher's `size-4` icons (`QuickSwitcher.svelte:79-81`) therefore render at 20px (`06-quick-switcher.png`). The two-line palette rows are about 62px tall, the tallest list rows in the app (NoteRow is about 54px, navigator rows 30px). Density is set from the outside by descendant selectors, so a row's own classes are unreliable.

**M8. Navigator row height is built from magic numbers, and sibling lists differ.**
- `py-[5px]` + `text-row` gives 30px rows in FilesNavigator:286, TypesNavigator:265/403 and TableOfContentsPanel:65.
- Tags rows are 28px (`TagItem.svelte:40`, `py-1`).
- Settings nav and backlinks group triggers are 32px (`SettingsPanel.svelte:141`, `BacklinksPanel.svelte:65`, `py-1.5`).
- Relationship link rows are 24px (`PropertiesView.svelte:268`, `py-0.5`).
- Chevron spacers are hard-coded to match `p-0.5 + size-3.5`: `w-[18px]` (FilesNavigator:449) and `w-[16px]` (PropertiesView:214, which does not even match 18).

**M9. One role, two sizes, inside the calendars.**
- Month vs linear weekday headers: `text-xs` (CollectionCalendarView:119) vs `text-[11px]` (CollectionLinearCalendarView:146).
- Event labels are swapped the other way: `text-[11px]` in month view (:154) and `text-xs` in linear view.
- Navigation buttons: `p-0.5` + size-3.5 (CollectionCalendarView:77-81) vs `p-1` + size-4 (Linear:89-93).
- The same event title is `text-sm font-medium` in the all-day chip (`EventAllDayLane.svelte:85`) and `text-xs` in the timed block (`EventBlock.svelte:88/99`).

Switching views makes headers and controls jump.

**M10. Icon sizes drift inside a single row.**
- Tab: pin and close at size-3, type icons at size-3.5 (`EditorTabs.svelte:51/76` vs `:54-66`).
- Collection toolbar: add-view Plus at size-3 (`CollectionView.svelte:449`) among size-3.5 icons (:502/528/551/570).
- Theme row: size-7 buttons with size-3.5 icons next to a size-6 button with a size-4 icon and a size-5 check (`AppearanceSection.svelte:189-218`).
- Kanban lane header: grip at size-4, chevrons at size-3.5 (`KanbanLane.svelte:229/244`).
- `DailyNoteButton.svelte:14-15` passes `size="icon-sm"` (size-8) and then overrides it with `class="size-6"`. This shows the variant set is missing a chrome size.

**M11. Graph labels scale with zoom and ignore the app font.** `GraphView.svelte:253` sets `Math.max(10, 11 / k)px sans-serif` under `ctx.scale(k)` (:142). Above k of about 1.1 the 10-unit floor takes over, so the on-screen size grows to about 80px at the 8x maximum (:301). The font is generic `sans-serif`, not the body stack.

**M12. The heading typography rows have no disclosure affordance and show raw values.** `HeadingTypographyEditor.svelte:40-47` uses `<details>`, but `summary` is `flex`, which drops the native marker. The rows look like static cards (`20-settings-01-editor.png`) and show "0.9em, semibold" in lowercase, while the select below it says "Semibold".

### Low

- **L1. Second rail pane header inset.** The `pl-6` traffic-light clearance (comment at `RailNoteList.svelte:414`) is also applied when the note list is the second pane. The title then sits 12px right of its rows (`02-rail-files.png`: "test-vault" at x=267, rows at 256). SearchPanel's input (`02-rail-search.png`) is inset about 15px from the index line and segmented control below it.
- **L2. Shortcut hints use `tracking-widest`.** `command-shortcut.svelte:16`, `context-menu-shortcut.svelte:16`, `dropdown-menu-shortcut.svelte:16`: the 0.1em tracking spreads "⌘W" apart (`05-command-palette.png`).
- **L3. Changing counts shift their row.** `WordCount.svelte:33` has no `tabular-nums`, so status bar text jitters as counts change. `TypesNavigator.svelte:283` type-row counts lack the `min-w-6 justify-end` that view rows use (:423).
- **L4. Vault root and folders use different gaps.** The root row uses `gap-1.5` (`FilesNavigator.svelte:286/327`) and folder rows use an inner `gap-2` (:464), so label offsets differ by 2px. The root also adds `font-medium` (:328), the only weight cue in the tree.
- **L5. 20 `text-[11px]` sites duplicate `text-label`.** Examples: NoteRow:86/99/109, RailNoteList:493, EventBlock:106/108/111, EventTimeGrid:275, MyPeopleSection:58/67. There is no visual change today, only drift risk.
- **L6. Table typography.** Collection table headers are 14px `font-medium` (`CollectionTableView.svelte:45`), the same size as cells (`09-view-table.png`). Header `py-2` vs cell `py-1.5` (:61). Sort direction is drawn as Unicode arrows appended to the label (:30).
- **L7. Small offsets that dodge the scale.** `AppShell.svelte:188` positions the 24px sidebar toggle with `top-[7px]`, which centres it at 19px against a 40px bar. `EventTimeGrid.svelte:328` draws the now-line at `h-[1.5px]` against `h-px` hour lines. `AutoMoveRuleRow.svelte:127` uses `ml-[5.5rem]`, which only stays aligned while the label is `w-20` + `gap-2`.
- **L8. Ellipsis character.** 46 strings use ASCII "..." and 2 use "…" (SearchSection:145).
- **L9. Hard-break glyph unit.** `styles.ts:103` sizes the glyph at `0.85rem`, breaking the file's own em rule (comment at :25-30), so it does not follow the editor font setting.

## 3. Recommended standard

**R1. Type roles (chrome).**

| Role | Token |
|---|---|
| Badges, chips, captions, weekday headers, rule strips, keyboard hints | `text-label` (11px) |
| Counts, subtitles, paths, helper text, empty and status messages, field errors, menu sublines, status bar | `text-meta` (12px) |
| List rows, inputs, menu items, settings labels | `text-row` (14px) |
| Pane and panel titles, popover titles, small dialog titles | `text-title` (15px semibold) |

- Add one tier, `--text-heading: 18px` (line-height 26/18, weight 600), for settings page titles and dialog titles, and add `'heading'` to `TEXT_ROLES`.
- No `text-[Npx]`, no 13px, nothing below 11px.
- Weights: 400 body, 500 for row emphasis, 600 for titles and section labels. Drop `font-bold` from chrome.
- Shortcut hints: `text-label tracking-normal tabular-nums`.

Files:
- Heading tier: the 18 settings sections, SettingsPanel:124, dialog-title.svelte:15, IconPicker:144, FileHistoryDialog:66.
- `text-title`: EventCalendarHeader:37, EventPopover:167, CollectionLinearCalendarView:103, TagsView:51, CalendarNavigator:92.
- 13px and 10px sites: CalendarGrid:57, RelationshipSearch:57/77/87, Rail:131, canvas (FileNode, TextNode, LinkNode, CanvasFilePicker, CanvasLinkInput, CanvasContextMenu, CanvasEdge, ImageNode, GroupNode, CanvasInner). Canvas CSS can use `var(--text-row)` and the other role variables.
- Shortcut hints: the 3 `*-shortcut.svelte` files.
- `text-label`: the 20 `text-[11px]` sites.

**R2. One `SettingsSection` wrapper plus a fixed `SettingItem` layout.**
- The wrapper owns the `text-heading` title and the rhythm: `flex flex-col gap-2`, title `mb-2`, groups as `<section class="mt-6 flex flex-col gap-2">` with a plain `section-label` (no margins on the label itself), helper text `text-meta text-muted-foreground`.
- In `SettingItem`, replace `w-2/5` with `shrink-0` sized by content (`max-w-[50%]` for text inputs), give labels `text-row font-medium` and descriptions `text-meta` with `text-wrap: pretty`, and put the toggle `self-start` beside the label line for multi-line descriptions.
- Long values such as the build string go on the description line. BuildInfo uses `text-meta` in both variants.

Files: SettingItem.svelte, BuildInfo.svelte, the 18 sections (removing `mb-4 text-lg` and `mt-6 mb-2`), HeadingTypographyEditor.svelte (add a ChevronRight marker and a capitalised weight label).

**R3. Pane header contract.**
- Rail headers: `h-10 pl-6 pr-3` only on the first pane after the rail, `pl-3` otherwise. Title `text-title min-w-0 flex-1 truncate` with a minimum readable width (`min-w-16`). Secondary actions collapse to icon-only (`size-6` buttons) before the title truncates. Move "New here" and "Daily note" labels into a tooltip once the pane is narrow.
- Right-sidebar headers: every panel header `h-10 px-3` with a fixed `size-3.5` chevron slot (empty on static panels), so every title starts at 32px. "Relationships" becomes either a collapsible panel like its siblings or a `section-label`. The accent color stays on the panel title only.

Files: RailNoteList.svelte:414-488, FilesNavigator:295, TypesNavigator:201, SearchPanel:68, CalendarNavigator:88-92, TagsView:50, PropertiesView:152/256, Backlinks/TOC/OutgoingLinks headers.

**R4. Row heights.**
- Single-line nav rows: one `nav-row` utility in `app.css` (`flex items-center gap-2 rounded-md px-2 min-h-7.5 text-row`, 30px, keeping today's height without `py-[5px]`).
- Dense sub-rows (relationship links, filter rows): `min-h-7` (28px).
- Two-line rows keep `py-2`.
- Chevron slots: a `size-4.5` spacer shared by the toggle and its placeholder.

Files: FilesNavigator:286/449, TypesNavigator:265/403, TableOfContentsPanel:65, TagItem:40/56, PropertiesView:214/268, SettingsPanel:141.

**R5. Icon sizes.**
- size-4 for menu items, list-row leading icons, toolbar buttons in the editor bar and dialogs.
- size-3.5 for pane-header and panel-header controls, chevrons, inline chips in rows.
- size-3 only inside `text-label` chips.
- One row uses one size.
- Add `"icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3.5"` and `"icon-chrome": "size-7 [&_svg:not([class*='size-'])]:size-4"` to `button.svelte` and use them for hand-rolled chrome icon buttons (AppShell:188, DailyNoteButton:14, AppearanceSection:189-218, EditorView:93/106/119/132, Properties and pane-header triggers).
- Remove `mr-2` from icons inside `ContextMenu.Item` and `DropdownMenu.Item` (13 sites).

Files: EditorTabs:51/76/84/90, CollectionView:449, KanbanLane:229-244, CollectionCalendarView:77-81 vs Linear:89-93, MarkdownEditor:618/623, KanbanCard:236, plus the remaining `mr-2 size-4` grep hits.

**R6. Command palette density.**
- Move the density from `command-dialog.svelte:33` into a `density="palette"` prop on `command-item` (`px-2 py-2`, icons size-4) and drop the svg h-5/w-5 override.
- Single-line items should be 36px and two-line items about 48px.

**R7. Layout constants.**
- Define `--status-bar-height: 32px` in `app.css`. Use it in StatusBar:8 (`h-(--status-bar-height)`) and SettingsPanel:116 (`bottom: var(--status-bar-height)`).
- Add `tabular-nums` to WordCount and all counts.

## 4. Quick wins vs larger changes

**Quick wins (under 1 hour each):**
1. M1 status bar and settings overlap: one variable, 2 files (10 min).
2. M6 remove 13 `mr-2` from menu icons (15 min).
3. M5 replace 13px and 10px in the Svelte classes (CalendarGrid, RelationshipSearch, Rail badge) (15 min).
4. M3 TagsView and CalendarNavigator headers to the shared recipe (15 min).
5. L2 shortcut tracking, L3 `tabular-nums` and count min-width, L4 root gap (20 min total).
6. M10 icon size fixes in EditorTabs, CollectionView, KanbanLane, DailyNoteButton (30 min).
7. M11 graph label: `${11 / k}px` plus the body font family (15 min plus a visual check).
8. L5 `text-[11px]` to `text-label` (20 sites, mechanical, 20 min).

**Larger changes:**
1. R2 `SettingsSection` wrapper + SettingItem column fix + heading tier token: fixes H3, M2 (settings part), M4 and M12 across 20 files (half a day, including screenshot review of all 18 pages).
2. R3 pane header contract: H1 (collapse actions when narrow) and H2 (right-sidebar alignment and hierarchy) (half a day; H1 needs a decision on what collapses first).
3. R4 `nav-row` utility and spacer token across the navigators and sidebars (2-3 h).
4. R6 palette density variant (1-2 h; shadcn primitive edit).
5. Canvas CSS onto the role variables (10 files, 2 h).
6. Bulk `text-xs`/`text-sm` to `text-meta`/`text-row` migration (338 lines): no visual change. Do it per area together with the items above rather than as a sweep. SettingItem alone covers most settings text.

## 5. Rejected leads

- 3: `Command.Group` is rendered with no heading in CommandPalette:49 and QuickSwitcher:71, so the heading class never shows.
- 6, 12: shadcn-svelte upstream markup. The 16px icon centred in a 14px flex box overflows 1px per side, which is not visible.
- 8: `pe-8` holds the visible close X (`05-command-palette.png`). The h-9/h-10 heights are overridden to h-12 by the dialog (covered by M7).
- 9, 13: dropdown, context and select labels and group headings are not used anywhere outside `components/ui/`.
- 14: upstream shadcn file-input recipe. Only ThemeEditor uses a file input.
- 20: H6 fallback 600 matches the shipped default ("0.9em, semibold" in `20-settings-01-editor.png`).
- 144: px on the table add controls is the documented exception at `styles.ts:29-30`.
- 140: the composer font stack equals the body stack. The 14px and 11px sizes match row and label.
- 143: the override order is already documented at `app.css:94-101`. It is a robustness note, not a visual defect.
- 40: `leading-relaxed` on a truncated line is harmless styling noise.
- 16, 19, 24, 26, 28, 29, 32, 33, 38, 53, 54, 62, 66, 70, 72, 78, 85, 98, 104, 108, 115, 118, 119, 124, 127, 128, 131, 134, 139: `text-xs`/`text-sm` vs token. They render the same pixels (see section 1). Merged into L5 and the larger change 6, not counted as separate defects.
- 1, 21, 138: merged into M10 and R5.
- 2: merged into L7.
- 4, 11, 27, 30, 36, 67, 68, 75, 80, 101, 109, 136: merged into M2.
- 22, 23, 69, 102: merged into M4.
- 41-45: merged into M5.
- 47-49: merged into M9.
- 89, 90, 150-152, 156: merged into H2.
- 94-96: merged into M8 and L4.
- 147: merged into L1.
- 149: merged into H1.
- 153, 25: merged into M12.
- 154, 155, 157, 160, 161: merged into H3.
- 158: merged into H3/R2 (value style).
- 159: unit suffixes are copy, out of theme.
- 25, 31, 46, 100, 103, 110, 148: copy and casing, out of this theme except the ellipsis, which is kept as L8.
- 81: raw timestamp is a content issue, out of theme.
- 116: loading spinner is a component and state issue, out of theme.
- 121: the native select is a component choice. The px-1 vs px-2 padding mismatch is real but trivial.
- 5: merged into M7.
- 7, 10, 15: merged into L2.
- 17: merged into M10.
- 18: confirmed and widened to M6.
- 34: merged into R7.
- 35, 79: merged into L7.
- 50-52: merged into L6.
- 55: merged into M10.
- 56, 60, 63: real but trivial (same-height controls within 10px); left out.
- 57-59, 61, 76, 83, 86, 93, 114, 125, 129, 132, 137: icon-size variance within a single panel. Covered by the R5 rule; only the in-row cases are listed in M10.
- 64, 65, 74, 77, 84, 91, 92, 97, 99, 111: merged into M5, M9 or L5.
- 71, 73, 82, 87, 88, 105-107, 112, 113, 117, 120, 122, 123, 126, 130, 133, 135, 141, 142, 145, 146: merged into the items above (M3, M8, M9, M11, L3, L9) or trivial.
- 37, 39: trivial (button text size override on one Add Rule button, one size-3 chip X).
