# 02: The app chrome has a type scale, and the right sidebar follows it

**What to build:** The chrome uses a small set of named text roles instead of the seven 1px-apart sizes it has today (9, 10, 11, 12, 13, 14, 15px across about 470 class uses). One uppercase label style replaces the seven in use. The right sidebar is the first area moved onto the scale, together with the small-text floor, because neither depends on other open work.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Text-role tokens are defined once (Tailwind v4 `--text-*` entries in the `@theme` block of `src/app.css`, which today holds only colors and radii) and documented, with the values the owner chose (Notes): section label 11px semibold tracking-wide muted, metadata (counts, subtitles, timestamps) 12px, list row 14px, panel title 15px semibold in sentence case. Row and title are 1px apart, so the title also differs by weight.
- [x] One uppercase section-label style (size, weight, tracking, color) replaces the variants at `RailNoteList.svelte:458`, `TypesNavigator.svelte:194`, `PropertiesView.svelte:261`, `SettingsPanel.svelte:131`, `QuickCaptureSection.svelte:63,81`, `GraphControls.svelte:128`, `CalendarNavigator.svelte:142`, `collection/toolbar/PropertiesPanel.svelte:76,94,112`, `file-history/SnapshotList.svelte:34`, `ThemeEditor.svelte:193`. Badges (`BuildInfo.svelte:42`) and table column headers (`CollectionCalendarView.svelte:119`) are not section labels and keep their own style.
- [x] Right sidebar: the container's `text-[15px]` (`AppShell.svelte:259`) stops being the size every unclassed element inherits. Panel headers (`BacklinksPanel.svelte:60`, `TableOfContentsPanel.svelte:51`, `OutgoingLinksPanel.svelte:58`, `PropertiesView.svelte:153,256`) are visibly above their rows by size, not only by uppercase and color.
- [x] Counts are smaller than the names they count: `BacklinksPanel.svelte:76,93` render at 15px over 14px items today.
- [x] Empty and status messages (`BacklinksPanel.svelte:65,67,69`, `OutgoingLinksPanel.svelte:63,65`, `TableOfContentsPanel.svelte:56,58`, `PropertiesView.svelte:169,171`) are no larger than the rows they replace.
- [x] Backlinks: the source note name leads its entry. Today name and snippet are both 14px (`LinkItem.svelte:22,25`) and the snippet's link fragment is `font-semibold` (`:27`), heavier than the name. Relationship items (`BacklinksPanel.svelte:99,103`) use the same roles as `LinkItem`.
- [x] Table of Contents entries (`TableOfContentsPanel.svelte:65`, 15px) are smaller than the panel header.
- [x] Properties: key and value are told apart by more than a muted color; the boolean value (`PropertyField.svelte:131`, inherits 15px) matches the other values; date values use the same color token as text values (today `Input`'s `text-foreground/80`).
- [x] Small-text floor: no readable text below 11px in the chrome. Today 9px at `SearchResult.svelte` and 10px at `SearchPanel.svelte:92` (progress messages), `FormulaRow.svelte:47,56` (error messages), `SearchResult.svelte:156,161`, `FilterPanel.svelte`, `TodoistPopover.svelte`, `CalendarNavigator.svelte`. Numeric badges (`Rail.svelte:92`) may stay at 10px.
- [x] No small text with stacked opacity: `SearchResult.svelte:156,161` (10px at `/40`) and `collection/toolbar/PropertiesPanel.svelte:76,94,112` (`text-muted-foreground/60`) use a muted color token at full opacity.
- [x] Tests: component tests for the touched panels assert the role class on the header, row, count and empty-state elements, so a regression to an inherited size fails.

## Notes

- **Created 2026-11-04** from the owner's typography review (claims C01-C12, C28-C30, all verified).
- **Owner decision (2026-11-04):** scale 11/12/14/15: label 11px semibold tracking-wide muted, meta 12px, row 14px, panel title 15px semibold. Panel headers are sentence case everywhere: the right sidebar headers (Backlinks, Table of Contents, Outgoing links, Properties, Relationships) drop uppercase and tracking, and the left rail (Issue 03) uses the same title role. Uppercase stays only for the small section label inside panels.
- **`src/lib/components/ui`** (shadcn) is out of scope; it uses Tailwind tokens already.
- **Tags view** (`TagsView.svelte:51`) is a center-pane view, not a sidebar panel; its peer is `EventCalendarHeader.svelte:37`. Align the two only if the token set covers a center-pane title.
- **Out of scope:** left rail and Settings (Issue 03), editor content (Issues 04, 05), font families (Issue 01).
- **Size:** L.

## Comments

- 2026-11-04, branch `issue/02-chrome-type-scale-and-right-sidebar`: chrome text-role tokens (`--text-*` in `src/app.css`) and one `section-label` utility; right sidebar panels (Backlinks, Outgoing links, Table of contents, Properties) follow the scale; 11px text floor and no stacked opacity on small text. Fix round: `section-label` comment on color order, Settings label "Table of contents" in sentence case, comment on `md:text-row` in `PropertyField.svelte`. Tests: full suite at 2125446c, 464 files / 10748 tests passed, 1 skipped, 1 todo, build OK. Reviews: round 1 APPROVED, round 2 APPROVED.
