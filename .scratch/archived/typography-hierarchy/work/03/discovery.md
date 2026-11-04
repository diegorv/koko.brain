# Issue 03 discovery

No `spec.md`; the Issue is the spec. Same pattern as `work/02` (roles `text-label` 11, `text-meta` 12, `text-row` 14, `text-title` 15/600, `section-label`); only the sites differ.

## Files that change

- `FilesNavigator.svelte:278` header `text-sm font-medium` -> `text-title`; `:265` rows `text-[15px]` -> `text-row` (vault root `:307` keeps `font-medium`, now 14px/500 under 15px/600).
- `TypesNavigator.svelte:164` header -> `text-title`; rows `:212,241` -> `text-row`; counts `:228,255` `text-xs` -> `text-meta`.
- `RailNoteList.svelte:375` header -> `text-title` (same as the navigators); count `:376` `text-[11px]` -> `text-meta`.
- `note-list/NoteRow.svelte:82` title `text-[13px]` -> `text-row`; rename input `:57` same.
- "Views" (`TypesNavigator.svelte:194`) and group headers (`RailNoteList.svelte:458`) already use `section-label` (Issue 02): tests only.
- `SettingsPanel.svelte:120` "Settings" `text-sm` -> `text-lg font-semibold` (same as section titles); nav items `:137` `text-sm` -> `text-row` (same 14/20).
- Settings h3 -> `section-label` + margins only: `PeriodicNotesSection.svelte:35,66,83,100,117`, `GeneralSection.svelte:22,60`, `TypesSection.svelte:23,37`, `TroubleshootingSection.svelte:22,28,87,119`, `EventCalendarSection.svelte:239`, plus h3s the Issue did not list: `AutoMoveSection.svelte:143,177`, `AppearanceSection.svelte:242`, `HeadingTypographyEditor.svelte:38`.
- `QueryjsSection.svelte:44-45`: title `mb-1` -> `mb-4`, intro `text-xs` -> `text-sm`.
- `AppearanceSection.svelte:146-158`: the `flex flex-col gap-2` root and the title move outside the `{#if editorOpen}`, so `ThemeEditor` renders under the title; list layout unchanged.

## Plan

1. Rail (test-first): role assertions in `FilesNavigator.test.ts`, `TypesNavigator.test.ts`, `RailNoteList.test.ts`, new `NoteRow` assertions in `NoteRowMenu.test.ts` (it mounts `NoteRow` through `NoteRowMenuHarness`). Data attributes for the headers/count (`data-files-navigator-title`, `data-types-navigator-title`, `data-note-list-count`).
2. Settings: `SettingsPanel.test.ts` mounts the open panel and asserts title vs nav item classes; a source scan (`settings-headings.test.ts`) over the files SettingsPanel imports (and their local `./*.svelte` imports) holds: every h2 is `text-lg font-semibold` with `mb-4` or no margin, every h3/h4 is `section-label` + spacing only, every paragraph right after a title is `text-sm`. `AppearanceSection.test.ts`: title present with the editor open.

## Defaults taken

- Settings sub-heading style = `section-label` (Issue 02 already chose it for QuickCapture and the nav group labels; the scale has no other sub-heading role).
- Panel title = section title size (`text-lg`); "not smaller" allows equal, and the scale has no role above 15px.
- Out of the criteria, left as is: NoteRow subtitle/dates/pills (11px), group-header count inside the label, note list rule line, empty states, the "New type"/"New here" buttons.

## Risks

- jsdom does not run Tailwind; tests assert classes, not computed sizes.
- Note list rows grow 13 -> 14px titles: VList rows get taller (dynamic heights, no fixed size).
