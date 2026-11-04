# Issue 02 discovery

No `spec.md` exists for this feature; the Issue is the spec. Issue 01's work folder covers fonts only; the app.css mirror test (`font-stacks.test.ts`) is the prior art for the token test.

## Files that change

- `src/app.css:4-69` `@theme inline`: `--text-label` 11px, `--text-meta` 12px, `--text-row` 14px, `--text-title` 15px (+ `--text-title--font-weight: 600`), each with a unitless line-height. New `@utility section-label` (text-label, semibold, tracking-wide, uppercase, muted-foreground).
- `src/app.css:330-339` date-input rule reads `var(--date-input-fg, var(--foreground))` so a property date value can use the right-sidebar token.
- `src/lib/utils.ts:5` `cn()`: `extendTailwindMerge` with the four text roles. Without it tailwind-merge 3.7 reads `text-row` as a color and drops `text-foreground/80` (checked: `twMerge('text-sm text-foreground/80 text-row')` -> `text-sm text-row`).
- NEW `src/lib/utils/text-roles.ts`: `TEXT_ROLES` list shared by `cn()` and the mirror test.
- Right sidebar: `AppShell.svelte:259` (`text-[15px]` -> `text-row`), `BacklinksPanel.svelte:60-103`, `LinkItem.svelte:22-27`, `TableOfContentsPanel.svelte:51-65`, `OutgoingLinksPanel.svelte:58-82`, `PropertiesView.svelte:153-261`, `PropertyField.svelte:113-136`.
- Section labels -> `section-label`: `RailNoteList.svelte:458`, `TypesNavigator.svelte:194`, `PropertiesView.svelte:261`, `SettingsPanel.svelte:131`, `QuickCaptureSection.svelte:63,81`, `GraphControls.svelte:128`, `CalendarNavigator.svelte:142`, `collection/toolbar/PropertiesPanel.svelte:76,94,112`, `SnapshotList.svelte:34`, `ThemeEditor.svelte:193`. `CollectionCalendarView.svelte:119` and `CollectionLinearCalendarView.svelte:146` (column headers) untouched; `BuildInfo.svelte:42` keeps its badge style but goes 10px -> 11px for the floor (only numeric badges are exempt).
- Floor (no text < 11px): `SearchResult.svelte:146,156,161`, `SearchPanel.svelte:80,92,115,158`, `FormulaRow.svelte:47,56`, `FilterPanel.svelte:98,159`, `TodoistPopover.svelte:126,131,136`; `Rail.svelte:92` badge 9px -> 10px (allowed exception).

## Plan (test-first per step, one commit each)

1. Tokens + `section-label` + `cn()` extension. Test `src/tests/lib/utils/text-roles.test.ts`: reads app.css, asserts the four sizes, title weight, the section-label body, and that `TEXT_ROLES` equals the `--text-*` names; `cn('text-sm text-foreground/80', 'text-row')` keeps the color.
2. Right sidebar: header `text-title` sentence case (no uppercase/tracking; "Table of Contents" -> "Table of contents", e2e `hasText` is case-insensitive); rows `text-row`; counts, snippets, relationship types, empty/status messages `text-meta`; ToC entries `text-row`; Properties key `font-normal` vs value `font-medium` (weight + color), boolean value `text-row` + the value color, date value `--date-input-fg: var(--right-sidebar-fg)` + same class as text values. Tests extend `BacklinksPanel`, `LinkItem`, `TableOfContentsPanel`, `OutgoingLinksPanel`, `PropertiesView`, `PropertyField`, `AppShell` tests with role-class assertions.
3. Section labels: swap classes; area sites keep their area muted token after `section-label` (`text-file-explorer-muted-fg`, `text-right-sidebar-muted-fg`) so themes with a different sidebar color stay readable. Verify in the built CSS that the color utility sorts after `.section-label`.
4. Floor + opacity: 10px/9px readable text -> `text-label` (11px) or `text-meta` (12px for subtitles/timestamps); `/40` and `/60` muted text -> full-opacity muted token.

## Defaults taken

- The label token is size + line-height only; weight, tracking, uppercase and color live in `section-label` so `text-label` can also size chips and badges without forcing semibold.
- Empty and status messages use `text-meta` (smaller than the 14px rows they replace).
- Search result subtitle and right label: `text-meta` in `text-file-explorer-muted-fg`.
- `ThemeEditor.svelte:193` loses its `text-primary` accent (one label color).
- Tags view / event-calendar header: not aligned; the token set has no center-pane title role.
- Floor and label rules are held by a source scan (`src/tests/lib/chrome-type-scale.test.ts`), since most of those components have no test file.

## Risks

- jsdom does not run Tailwind: tests assert class names, not computed sizes. Real rendering unchecked.
- `SearchResult` cards are fixed `h-20`; a 12px subtitle line keeps the total at 80px (overflow hidden).
