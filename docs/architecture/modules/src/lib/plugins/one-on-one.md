---
summary: "Person-based 1:1 notes: people picker, New 1:1 action and the Today My people section."
---

## Responsibility

Owns the 1:1 note feature: listing people from the work and personal people folders, creating or opening a dated 1:1 note for a chosen person (with _related_to linking that person), and computing the Today My people rows (last 1:1 per work person and an overdue flag). It registers its entries into the note action bar and the rail shell Today lens at vault open, so features/ never imports plugins/. It does not own settings (core/settings), the note creation pipeline (core/note-creator), the periodic-notes folder layout or the vault note index.

## Key files

- `src/lib/plugins/one-on-one/one-on-one.service.ts`: loadPeople, createOneOnOneNote, openOneOnOnePicker, the action bar registration and resetOneOnOne.
- `src/lib/plugins/one-on-one/one-on-one.logic.ts`: Pure functions: buildOneOnOnePath, buildOneOnOneVariables, loadPeopleFromEntries, filterPeople, buildMyPeople and myPeopleDaysLabel.
- `src/lib/plugins/one-on-one/one-on-one.store.svelte.ts`: oneOnOneStore: picker open state, people list and the per-open select handler.
- `src/lib/plugins/one-on-one/one-on-one-today.service.ts`: Registers the My people section into the rail shell Today lens.
- `src/lib/plugins/one-on-one/OneOnOnePicker.svelte`: Command dialog that groups people as Work and Personal and creates the note or calls the select handler.
- `src/lib/plugins/one-on-one/MyPeopleSection.svelte`: Today section UI: derives rows with buildMyPeople over typeDefinitionsStore.entries and renders open and New 1:1 controls.

## State

- oneOnOneStore: module-level $state for isOpen and people, plus a non-reactive selectHandler reset on close.
- Reads settings.oneOnOne and settings.periodicNotes through settingsStore. It does not write settings.
- People are read from disk with exists and readDir (@tauri-apps/plugin-fs) when the picker opens. No cache outside oneOnOneStore.people.
- 1:1 note files are created through openOrCreateNote in the periodic-notes base folder.

## Collaborators

- `src/lib/core/note-creator`: openOrCreateNote and applyExplicitOrganization create or open the 1:1 note with its template and variables.
- `src/lib/core/settings`: settingsStore.oneOnOne, periodicNotes and explicitOrganization; settings.types.ts defines the settings shapes.
- `src/lib/core/vault`: vaultStore.path is the root every path is built from.
- `src/lib/core/frontmatter`: ensureFrontmatterLink writes _related_to: [[person]] on created notes.
- `src/lib/core/filesystem`: isViewFile filters view files out of My people.
- `src/lib/core/editor`: openFileInEditor and editorStore.activeTabPath in MyPeopleSection.
- `src/lib/features/rail-shell`: railRegistryStore.registerTodaySection and entryNoteDate from lens.logic.ts.
- `src/lib/features/note-action-bar`: noteActionBarActionsStore.register adds New 1:1 for Person notes.
- `src/lib/features/type-definitions`: typeDefinitionsStore.entries supplies title, path and relatedTo for buildMyPeople.
- `src/lib/features/event-calendar`: eventCalendarViewStore.todayKey is the reference day for My people.
- `src/lib/plugins/periodic-notes`: buildWikilinkPath builds the daily note link variable. Allowed plugin-to-plugin import.
- `src/lib/types`: NoteEntryV2, the entry shape buildMyPeople reads.
- `src/lib/components/ui`: The command dialog component behind OneOnOnePicker.
- `src/lib/utils`: parseDateKey, stem and debug logging.
- `src/lib/app`: app-lifecycle.service.ts registers the action bar action and Today section, AppOverlays.svelte mounts the picker, and commands.ts and global-keybindings.ts open it.
- `src/lib/plugins/mods`: Caller: mod-app.service.ts exposes createOneOnOneNote and openOneOnOnePicker to mods.

## Gotchas

- 1:1 detection is by the _related_to link, not by path or body links. buildMyPeople ignores notes dated after the reference day when computing the last 1:1.
- buildMyPeople keys last-1:1 dates by the lowercase note name of each _related_to target (folder, alias and heading dropped) and matches work people by lowercase title, so a 1:1 that links any other note with the same name counts for that work person.
- Only top-level notes in the work people folder appear in My people. The picker lists both folders.
- loadPeople logs read errors with error() and sets an empty people list, so the picker shows its empty state with no toast.
- createOneOnOneNote and loadPeople return silently when no vault path is set.
- The new note's date is dayjs() at creation time, not the calendar's picked day, while My people uses eventCalendarViewStore.todayKey.
- resetOneOnOne has no production caller under src/lib.
- features/rail-shell and features/note-action-bar must not import this folder. The registrations happen from app-lifecycle at vault open.
