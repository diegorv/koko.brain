# 03: The left rail and Settings follow the type scale

**What to build:** The Files and Types navigators, the rail note list and the Settings panel use the text roles from Issue 02, so every header sits above its rows and one level of heading looks the same on every Settings page.

**Blocked by:** 02

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Navigator headers are above their rows: "Files" (`FilesNavigator.svelte:278`) and "Types" (`TypesNavigator.svelte:164`) are 14px medium over 15px rows (`FilesNavigator.svelte:265`, `TypesNavigator.svelte:212,241`).
- [x] The vault root row (`FilesNavigator.svelte:307`, 15px medium) is not larger or heavier than the "Files" header.
- [x] The note list and the trees next to it share the row role. Today `NoteRow.svelte:82` titles are 13px while the adjacent tree rows are 15px (`AppShell.svelte:192-234` puts them side by side), and the note list header (`RailNoteList.svelte:375`, 14px) is larger than its rows, the opposite of the navigators.
- [x] Counts use the metadata role: `TypesNavigator.svelte:228,255` (`text-xs`), `RailNoteList.svelte:376` (`text-[11px]`).
- [x] The "Views" label (`TypesNavigator.svelte:194`) and the note list group headers (`RailNoteList.svelte:458`) use the one label style from Issue 02; today they differ and render side by side.
- [x] Settings: the panel title "Settings" (`SettingsPanel.svelte:120`, 14px) is not smaller than the section titles (`text-lg` in every section) and is distinct from the nav items (`:137`, 14px).
- [x] Settings sub-headings (h3) have one style. Today: `text-base font-bold` (`PeriodicNotesSection.svelte:35,66,83,100,117`), `text-sm font-semibold uppercase` (`QuickCaptureSection.svelte:63,81`), `text-sm font-medium` (`GeneralSection.svelte:22,60`, `TypesSection.svelte:23,37`, `TroubleshootingSection.svelte:22,28,87,119`, `EventCalendarSection.svelte:239`).
- [x] Settings intro paragraphs under a section title use one size (`QueryjsSection.svelte:45` is `text-xs`, `AppearanceSection.svelte:160` and `QuickCaptureSection.svelte:33` are `text-sm`), and the space under the title is the same (`mb-4` in most sections, `mb-1` in QueryJS).
- [x] The Appearance section keeps its title while the theme editor is open (`AppearanceSection.svelte:146-156` replaces the whole title block with `ThemeEditor`).
- [x] Tests: component tests for the navigators, `RailNoteList`, `NoteRow` and `SettingsPanel` assert the role class on headers, rows and counts.

## Notes

- **Created 2026-11-04** from the owner's typography review (claims C03-C05, C27, plus missed findings from the opus refuters).
- **Runs before rail-shell-ux 14, 20 and 24 (owner, 2026-11-04):** none of them has started, so this Issue goes first and they are built on top of it. Their Notes ask them to use the text roles from Issue 02. The panel header style and scale were decided in Issue 02 (sentence case, 11/12/14/15): the navigator headers use the `text-title` role.
- **Out of scope:** right sidebar and the small-text floor (Issue 02).
- **Size:** M.

## Comments

- 2026-11-04, branch `issue/03-left-rail-and-settings-follow-the-scale`: left rail navigators, note list and NoteRow moved to the chrome type scale roles (header, row, metadata, label); Settings uses one h2/h3/intro style with a shared spacing, Appearance keeps its title while the theme editor is open. Review round 1 APPROVED (nits fixed: h2 `mb-4` test with named exceptions, rename input `text-row`, class-list assertion in AppearanceSection test); round 2 APPROVED with no findings. Full suite: 465 files, 10760 passed, 1 skipped, 1 todo, `pnpm build` ok (exit=0, HEAD 03967b83); `pnpm check` 0 errors.
