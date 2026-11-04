# Settings panel: design review

Scope: `src/lib/app/SettingsPanel.svelte`, `src/lib/core/settings/sections/*.svelte`, `BuildInfo.svelte`, and the section components that live in features/plugins (`SearchSection`, `RailSection`, `AutoMoveSection` + `AutoMoveRuleRow`, `EventCalendarSection`, `QueryjsSection`). Screenshots: `references/ux-polish-2026-11-04/screens/{default,lavender}/20-settings-*.png`. Commit `dd4f06376`.

## 1. Current state

**Shell.** `SettingsPanel.svelte:114-157`: a right-anchored drawer, `fixed top-0 right-0 z-40`, inline `width: 820px; max-width: 80vw; bottom: 24px`, `fly` x=820 200 ms, arbitrary `shadow-[-4px_0_12px_rgba(0,0,0,0.15)]`, `role="dialog"` with no `aria-modal`, no scrim, no focus move or trap, closes on window Escape. Nav column `w-48 px-3 py-5` with its own `h2 text-lg` "Settings" plus a `rounded p-0.5` X (`size-4` icon, about 20px hit area, no focus ring). Content column `ScrollArea` > `max-w-3xl px-10 py-8`.

**Navigation.** `settings.logic.ts:217-262`: 5 groups (General 4, Notes 6, Tools 5, Integrations 2, Advanced 2) = 19 pages, `section-label` group headings, lucide icon per item. Item: `rounded-md px-3 py-1.5 text-row`, hover `bg-settings-hover-bg`, selected `!bg-settings-hover-bg bg-accent` (`SettingsPanel.svelte:141`).

**Tokens.** `app.css:46-50` + `:202-206` / `theme.logic.ts:137-141` (dark) and `:250-252` (Lavender): `settings-dialog-bg` #313549, `settings-sidebar-bg` #2B2F40, `settings-hover-bg` #393e50, `setting-item-bg` #20212d, `settings-text` #bfcaf3. Rows are an inset well, darker than the panel, in both themes (Lavender rows #DDD8E8 on a lighter panel), so the ladder is consistent; the hover/selected step is the weak one.

**Row primitive.** `SettingItem.svelte:14-23`: `rounded-lg py-3 px-4 bg-setting-item-bg gap-4`, label `text-sm font-medium`, description `text-xs text-muted-foreground`, control column fixed `w-2/5 shrink-0 justify-end`. Used by 19 files. Rows stack in `flex flex-col gap-2`; groups via `h3.section-label mt-6 mb-2` (24 uses).

**Measured usage (settings files only, 21 files):**

| Pattern | Count | Notes |
|---|---|---|
| Page title `h2 text-lg font-semibold` | 20 (19 pages + nav) | hand-rolled in every section, outside the chrome scale (title = 15px) |
| Type sizes | text-sm 39, text-xs 39, text-lg 20, text-row 1, text-label 1 | the chrome scale (`text-meta`, `text-row`, `text-title`) is essentially unused in settings |
| Radius | rounded-md 19, rounded-lg 10, bare `rounded` 7, rounded-full 1, rounded-t-sm 2 | bare `rounded` (4px) on inputs and the close button, off the radius ladder |
| `<Input>` (shadcn, h-9, bg-input-bg) | 40 | only about 4 have a placeholder (all in Auto Move) |
| Raw `<input>` text fields | 7 | Todoist x2, Sentry x1 (`h-8 bg-background`), ThemeEditor (`h-8 rounded bg-input-bg`), ThemeColorRow (`h-7 w-[5.5rem]`) |
| Native `<select>` | 1 | `HeadingTypographyEditor.svelte:77` (h-9) vs `Select size="sm"` (h-8) elsewhere |
| Raw `<button class=...>` | 17 in 8 files | Appearance 8, ThemeEditor 2, Panel 2, Todoist, Update, AutoMove, Search, QueryJS |
| `<Button>` | 23 | |
| Control widths | `w-24` x12, `w-44` x6, `w-2/5` column, `w-[5.5rem]`, `w-64` | |
| Help text outside rows | 7 styles | see P5 |
| Static descriptions | 78 | 16 end with a period, 62 do not; 14 over about 95 chars; "dayjs" appears 9 times |
| Hardcoded colors | 3 | `UpdateSection.svelte:340` `text-green-500`, `BuildInfo.svelte:31` amber, `AutoMoveRuleRow.svelte:120` `text-green-500`, plus the panel shadow rgba |

## 2. Problems (verified)

**P1. [high] The fixed 40% control column breaks row layout in both directions.** `SettingItem.svelte:21` `w-2/5 shrink-0`. A switch or `w-24` number field still reserves 40% of the row, so descriptions wrap early with orphans: "e.g. / 0.5)" (`01-editor.png`, Paragraph spacing), "week and month / views" (`09-calendar.png`), "rules / when saved" (`12-auto-move.png`). Wide controls get squeezed instead: the Font family input truncates to "MonoLisa, ui-m" beside Browse (`01-editor.png`), and `BuildInfo` wraps to four monospace lines on Update (`18-update.png`, "Current version"). Row heights therefore vary (about 62 to 86px) with no content reason. This one rule is the main reason the panel looks unfinished.

**P2. [high] Drawer chrome: misaligned headers, stranded close button, no modality.** `SettingsPanel.svelte:122-131` vs `:153`: the nav header sits at `py-5` + `mb-3` (title baseline y about 25), the page title at `py-8` (y about 45) in every screenshot. The X sits in the nav column, 20px hit area, `rounded` (4px), no `focus-visible` ring, while the content it dismisses is to the right. The drawer covers 820px of a 1440px window with no scrim: the file list and editor behind it stay bright and clickable (`00-appearance.png`), so the panel reads as a third sidebar, not a settings surface. `role="dialog"` without `aria-modal`, and focus is not moved into the panel on open. Width is an inline style and the shadow an arbitrary value.

**P3. [high] Troubleshooting exposes internals as UI.** `TroubleshootingSection.svelte:101-117`: 22 switches (12 block + 4 inline plugins + 6 handler groups, `decorator-names.ts`) labeled with raw identifiers (`blockMath`, `wikilinkEmbed`, `metaBindInput`, `simpleWidget`, `inlineMarks`, `markdownStyle`), each as its own full card, no group heading; the only header is a floating `text-xs mt-4 mb-2` paragraph that says "Disable" above switches whose on state means enabled (`17-troubleshooting-bottom.png`). `:62-63` label "Heartbeat ([HB] alive every 250 ms)" with a 60-word description full of log tags. `:82` button "Open" under row "Open log folder". The names are persisted keys, so humanize via a label map, not by renaming.

**P4. [high] Four input styles, three button styles, two select styles in one panel.** Inputs: shadcn `Input` h-9 `bg-input-bg` (40 uses); Todoist/Sentry raw `h-8 bg-background focus:border-primary/50` with no ring (`TodoistSection.svelte:27,50`, `SentrySection.svelte:69`), which render visibly darker than the Calendar inputs (`15-todoist.png` vs `09-calendar.png`); ThemeEditor name `h-8 rounded` (`ThemeEditor.svelte:16`); ThemeColorRow `h-7` (`ThemeColorRow.svelte:63`). Selects: `Select.Trigger size="sm"` h-8 with `dark:bg-input/30` beside 36px inputs, so a select row and an input row have different control heights and fills (`09-calendar.png`); native `<select>` in `HeadingTypographyEditor.svelte:77`. Buttons: hand-rolled outline clones with no focus ring (`QueryjsSection.svelte:75-81`, `EditorSection.svelte:52-54` Popover.Trigger "Browse", `AppearanceSection.svelte:112-117,137-149`), and the reranker Download (`SearchSection.svelte:139-146`, `rounded border px-3 py-1 text-xs`, no hover, no focus).

**P5. [medium] Page structure differs page to page.** Intro paragraph only on Appearance (`text-sm mb-4`, `AppearanceSection.svelte` markup l.18), Quick Capture (`text-sm mb-2`, `QuickCaptureSection.svelte:33`), QueryJS (`text-sm mb-4`, `QueryjsSection.svelte:45`); the other 16 go straight to rows. Help text between rows uses 7 treatments: `TypesSection.svelte:54` `text-sm` no padding; `TodoistSection.svelte:31` `px-4 text-xs`; `UpdateSection.svelte:249` `-mt-1 mb-2 text-xs` negative-margin hack, 5 lines; `SentrySection.svelte:90` `px-4 text-xs`; `TroubleshootingSection.svelte:101` `mt-4 mb-2 text-xs`; `AutoMoveSection.svelte:150` `text-xs`; `SearchSection.svelte:125` status `px-4 text-xs`. Trash puts an action in the title row (`TrashSection.svelte:64-78`), Auto Move puts one in a group heading (`AutoMoveSection.svelte:142-148`).

**P6. [medium] Copy reads as developer notes.** "dayjs" x9 (Periodic x5, 1:1 x2, Quick Capture x2); "CSS font-family value" (`EditorSection.svelte:41`); "thinning" (`FileHistorySection.svelte:30`); "kb.pages()" and a 35-word list (`TemplatesSection.svelte:24`); repo path `help/documentation/13-queryjs.md` and a literal triple-backtick fence (`QueryjsSection.svelte:46-48`, `14-queryjs.png`); "+ autoRun markers" (`:73`); model IDs in labels "Reranker (jina-reranker-v2-base-multilingual)" (`SearchSection.svelte:133`); "Today's My people flags a work person..." (`OneOnOneSection.svelte:84`); emoji in `EventCalendarSection.svelte` l.71 "(📅)" and "▶ Run" in `QueryjsSection.svelte:22`; two em dashes in `UpdateSection.svelte:253,260`; "You're up to date!" in hardcoded `text-green-500` (`:340`). Period use is 16/78; Periodic Notes repeats "dayjs format string for the note path" / "Path to the template file" five times each (`PeriodicNotesSection.svelte:37-126`). Nav "Types" vs page "Types & Lifecycle" (`settings.logic.ts:234`, `TypesSection.svelte:9`). "Folder and template" row with button "Open Event type" (`EventCalendarSection.svelte` l.155-156).

**P7. [medium] Settings in the wrong place, one duplicated.** Dock badge lives in Quick Capture (`QuickCaptureSection.svelte:81-95`) while the rail inbox badge lives in Rail with a cross-reference "The dock badge has its own switch under Quick Capture" (`RailSection.svelte:57-61`): the copy apologises for the placement. Folder notes is under "Other" on the Sidebar page (`GeneralSection.svelte:60-72`), unrelated to the sidebar; the component is named `GeneralSection` but the page is "Sidebar". `BuildInfo` renders twice: Troubleshooting "About > Build" (`TroubleshootingSection.svelte:22-26`) and Update "Current version" (`UpdateSection.svelte:273-275`). Sentry (error reporting, a privacy choice) sits under Integrations beside Todoist.

**P8. [medium] Number fields clamp on every keystroke in two sections.** `FileHistorySection.svelte:38-41` and `AutoMoveSection.svelte:133-137` clamp in `oninput` with a one-way `value`; clearing Retention days snaps to "1", so typing 30 yields 130; clearing Debounce snaps to 0.5. Editor and Heading Typography store raw on `oninput` and clamp on `onchange`; Calendar clamps on `onchange` only and writes back. Three behaviours for one control type.

**P9. [medium] Selected nav item is indistinguishable from hover.** `SettingsPanel.svelte:141`: selected = hover color via `!important`; `bg-accent` is dead. No weight or text color change, no `aria-current="page"`, no `focus-visible` style. Dark step #2B2F40 -> #393e50 is faint (`01-editor.png`, Editor row).

**P10. [low] Heading Typography nests cards on the same surface.** `HeadingTypographyEditor.svelte:49-50`: `details.bg-setting-item-bg` contains `SettingItem`s that are also `bg-setting-item-bg`, so expanded rows have no visible boundary; heading "Heading Typography" is Title Case while sibling groups are sentence case.

**P11. [low] Theme card actions are hover-only.** `AppearanceSection.svelte` l.46 `opacity-0 group-hover:opacity-100` with no `group-focus-within`, icon buttons rely on `title` (7 `aria-label`s exist across all settings files vs 9 title-only controls).

**P12. [low] Empty fields give no hint.** 36 of 40 `Input`s have no placeholder; Periodic template paths x5, Types base folder (whose description says "Empty = vault root"), 1:1 template, Templates folders render as blank boxes (`04-periodic-notes.png`, both themes).

**P13. [low] Small inconsistencies.** Sentry description says "configured below" while the DSN row only appears after enabling (`SentrySection.svelte:49,57`). Auto-pin is not disabled when Auto-open is off although its description says it requires it (`PeriodicNotesSection.svelte:58-63`). Calendar group "Event type" heading repeats the first row label (`EventCalendarSection.svelte` l.130-134). Title Case buttons ("Add Rule", "Create New Theme", "Empty Trash", "API Token") vs sentence case elsewhere.

## 3. Recommended standard

1. **Panel shell.** Centered modal (shadcn `Dialog`, `rounded-xl shadow-xl`, scrim `bg-black/40`), `w-[min(880px,90vw)] h-[min(680px,85vh)]`, focus trapped, X at content top-right as `Button variant="ghost" size="icon"` (size-8). If the drawer stays, add the scrim and move the X the same way. One header band: nav and content share `h-14` and the same top padding (nav title `text-title`, page title row aligned on the same baseline). Width/shadow as classes, not inline/arbitrary. Files: `SettingsPanel.svelte`.
2. **Nav item.** `rounded-md px-2.5 h-8 text-row`; hover `bg-settings-hover-bg`; selected `bg-settings-selected-bg text-foreground font-medium` (new token, one step stronger than hover in both themes), `aria-current="page"`, `focus-visible:ring-2 ring-ring/50`. Files: `SettingsPanel.svelte`, `app.css`, `theme.logic.ts` (both themes).
3. **Page header.** One `SettingsPage` wrapper (title + optional one-line description + slot): title `text-lg font-semibold` kept as a named `settings-page-title` utility (or `text-title` if the owner prefers the chrome scale), description `text-meta text-muted-foreground mt-1`, `mb-6` before the first row. Every page gets a description of at most one line. Files: all 19 section components.
4. **Row.** `SettingItem`: label column `flex-1 min-w-0`, control column `shrink-0` sized by its content (no `w-2/5`), `min-h-14 py-3 px-4`. Add a `layout="stacked"` variant (control below the text, full width) for wide controls: font family, paths, DSN, token, build info. Add a `hint` prop (second muted line, may hold a link) to replace floating paragraphs. Group consecutive rows into one `rounded-lg` card with `divide-y divide-border/50` instead of separate cards (macOS / Linear pattern); groups separated by `section-label mt-6 mb-2`. Files: `SettingItem.svelte`, then Todoist, Sentry, Types, Update, Troubleshooting, Search, AutoMove.
5. **Controls.** Text: shadcn `Input` only, `h-8` in settings (`class="h-8"` or a size variant), widths `w-56` for text/path, `w-20` for numbers with a unit suffix (px, em, days, min), `w-44` for selects. Select: `Select.Trigger size="sm"` and the same fill as `Input` (`bg-input-bg`). Buttons: `Button size="sm"` (`outline` for secondary, `default` for primary, `destructive` for Empty Trash), no raw `<button class>` for actions. Placeholders on every optional field ("Vault root", "None", an example path). Number fields: raw on `oninput`, clamp on `onchange`. Files: Todoist, Sentry, ThemeEditor, HeadingTypographyEditor, QueryJS, Search, Editor (Browse), Appearance, FileHistory, AutoMove.
6. **Copy.** Sentence case for labels and buttons; descriptions one sentence, no trailing period, at most about 80 chars; no library names, file paths, log tags or model IDs in labels (move model name to the description or a tooltip); units in the control suffix, not the description; no emoji or em dashes; success states use a semantic token, not `text-green-500`. Files: Periodic, 1:1, Quick Capture, Editor, File History, Templates, Types, QueryJS, Search, Update, Troubleshooting, Event Calendar.
7. **Information architecture.** Badges together: move "Show inbox count on dock" into Rail's "Inbox badge" group (or a General > Badges group) and drop the cross-reference. Rename the Sidebar page component or move Folder notes to a Files/Editor page. Show build info once (Update/About). Move Sentry to Advanced (or "Privacy & diagnostics"). Align nav label and title ("Types"). Files: `settings.logic.ts`, `QuickCaptureSection`, `RailSection`, `GeneralSection`, `TroubleshootingSection`, `UpdateSection`.

## 4. Quick wins vs larger changes

**Quick wins (under 1 h each)**
- Nav selected state + `aria-current` + focus ring; drop `!`/`bg-accent` (15 min).
- Close button -> `Button ghost icon`, focus ring (15 min); align nav/content top padding (15 min).
- Clamp-on-change in FileHistory and AutoMove (15 min, needs a test per repo rules).
- Swap raw inputs in Todoist/Sentry and hand-rolled buttons in QueryJS/Search/Editor/Appearance to `Input`/`Button` (45 min).
- Decorator label map + "Live preview decorators" group heading with the restart hint as its description; rename Heartbeat label; "Open" -> "Show in Finder" (30 min; keep persisted keys).
- Copy pass: dayjs, CSS, thinning, repo path, backticks, emoji, em dashes, model ID label, 1:1 due sentence, periods (1 h).
- Placeholders on empty optional fields (20 min).
- Move Dock badge next to Rail inbox badge; remove duplicate BuildInfo (30 min).
- `group-focus-within:opacity-100` + `aria-label` on theme card actions (10 min).

**Larger changes**
- `SettingItem` content-sized control column, `stacked` variant, `hint` prop, then migrate the 7 floating help paragraphs (half a day).
- `SettingsPage` header component across 19 pages with one-line descriptions (2 to 3 h).
- Grouped cards with dividers instead of one card per row (half a day; touches every page, needs screenshot review in both themes).
- Drawer -> modal with scrim, focus trap, shared header band (half a day to a day, includes E2E selectors that open/close settings).
- Control size standard (h-8 everywhere, widths, unit suffixes) (2 to 3 h).

## 5. Rejected or reduced leads

- 2 (surface ladder): rows darker than the panel is consistent in both themes; only the hover/selected step is weak, folded into P9. `#2b2f40` vs `#2B2F40` case difference is cosmetic.
- 4, 7, 28, 42: merged into P5.
- 8: merged into standard 3; the 18px title is not wrong for a page title, the problem is it is hand-rolled 20 times.
- 9 (daily-only auto-open asymmetry): intentional, `settings.types.ts:19-26` defines autoOpen/autoPin on daily only. Kept the repeated copy part (lead 30) in P6.
- 10, 24, 31, 34, 35, 38: merged into P6.
- 11 (ThemeColorRow without cards): reduced; a dense bare list is right for 50+ color rows. Only the `h-7`/`rounded` input mismatch is kept (P4).
- 12: count is 22 decorators, not 12; "empty description line" is wrong, `SettingItem` skips an empty description (`{#if description}`).
- 13, 14, 17, 46, 47: merged into P3.
- 15 (Trash rows not using SettingItem): a list of items with two actions is not a setting row; reusing SettingItem would be wrong. Token naming `setting-item-bg` vs `settings-*` is a rename with no visual effect.
- 20 (missing `data-setting` wrappers): test hooks only (`EventCalendarSection.test.ts`), no visual effect.
- 21, 22, 45: reduced to low in P13/P6. Sentry fields do exist, shown only when enabled.
- 23, 26, 41: merged into P6.
- 27, 40: merged into P2.
- 29, 39, 18: merged into P12. Inputs do have a border token (`border-input`); the dark border is just low contrast.
- 32 (first Calendar group unlabeled): common settings pattern (Sidebar, Types do the same); not a defect.
- 33, 48, 19, 16: merged into P5 (floating help text).
- 36: merged into P4/standard 5.
- 37: kept in P6.
- 43: root cause is P1 (fixed `w-2/5` column), not hard breaks in the copy.
- 44: `_templates` is a placeholder, chips do render once a folder exists (`AutoMoveSection.svelte:201-214`); the disabled Add is correct. Not a defect beyond P13 casing.
- 5, 6, 25, 3, 1: kept (P6, P7, P4, P8, P9).

Not verified: whether a window-level Escape closes the panel while a Select or Popover inside it is open (`SettingsPanel.svelte:104-108` does not check for an open popover); the expanded Heading Typography state (screenshots only show it collapsed, P10 is from code).
