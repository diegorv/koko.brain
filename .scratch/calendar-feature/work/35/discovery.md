# Issue 35 discovery: ADR-0032, ADR-0029 and ADR-0009 amendments

Docs only; no source, no test files (no Pre-Change Checklist applies).

## Files that change
- `docs/adr/0032-calendar-events-are-event-typed-notes.md` (new), frontmatter and sections as `0031-native-rust-vault-watcher.md`.
- `docs/adr/README.md:138`: append the 0032 row after the 0031 row (last line).
- `docs/adr/0029-frontmatter-yaml-canonical-form.md`: amendment bullet at the end of Consequences (after the "Nested mappings stay dropped" bullet).
- `docs/adr/0009-incremental-indexing-reverse-index.md:48` ("The five sources"): amendment note right after that paragraph.
- Issue file: comments only.

## Inventory (grep on the final tree, 2026-10-28)
- `grep -rn "features/event-calendar" src/lib` (outside the feature):
  - core: `SettingsPanel.svelte:13`, `global-keybindings.ts:13`, `tauri-listeners.service.ts:17`, `EditorView.svelte:19`, `app-lifecycle.service.ts:64`.
  - feature: `command-palette.service.ts:32-33`.
  - plugin: `plugins/calendar/CalendarPanel.svelte:13`.
  - `EditorTabs.svelte:55` matches only a `fileType === 'event-calendar'` check (the icon is lucide); not listed.
- Event-calendar to other features (`grep -rnE "['\"](\\\$|#)lib/features/"`; the plan's literal `"\$lib/features/"` matches nothing on macOS BSD grep because `$` is read as an anchor, so the ADR records the escaped form):
  - properties: `event-calendar-event.logic.ts:14,16` (types, logic), `event-calendar.service.ts:27` (`frontmatter-write.service`), `:28` (logic).
  - type-definitions: `event-calendar-event.logic.ts:17` (`type-sidebar.logic`), `event-calendar.service.ts:29` (`createTypedNote`), `:30` (store), `EventCalendarSection.svelte:14-16` (store, `type-definitions.logic`, `createTypeDefinition` / `refreshTypeDefinitions`).
  - No `#lib/` specifier anywhere in the feature; no plugin import.
- Differs from the plan's expected list: `EventCalendarSection.svelte` also imports `type-definitions.logic` and two more service functions (Settings > Calendar: the events-folder line and the "Open Event type" button, which creates the definition when missing). The ADR lists the grep result, not the plan's guess.

## Facts the ADR cites
- `restore` row: `note-change.service.ts:17` (union), `:92-94` (`consumers: 'always', rust: 'always', mark: true`); caller `trash.service.ts:145-146`, `indexRestoredNote` `:221-230`.
- Refuse writers: `frontmatter-write.service.ts:94` (`updateNoteFrontmatter`), `event-calendar.service.ts:598` (`template-lossy`); reasons `properties.logic.ts:197-203`. Duplicate (`:650`) skips the `event_title (copy)` rewrite instead of refusing.
- Event type: `settings.logic.ts:64-69` (`normalizeEventTypeName`, default `Event`), `event-calendar-event.logic.ts:367-370` (case-insensitive resolve).
- `event_title`: `event-calendar-event.logic.ts:108-111` (read), `:278-279` (write).

## Defaults taken
- ADR date 2026-10-28, status active. Decision text from plan Notes D1, D3, D5, D6, D20, D25.
- Amendment notes use the existing "Amendment YYYY-MM-DD (issue NN):" style of ADR-0009:67.
- Gate: none (docs only); check `git diff --cached --stat` before each commit.
