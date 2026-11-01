# Issue 20 discovery: My people on Today

No `spec.md`; the source is `PRD.md` (Lenses: Today, Code placement, Q3, Q4, Q19). Fills the Today section slot
of `work/19` (`railRegistryStore.registerTodaySection`, rendered after Pinned by `RailNoteList.svelte:349-357`) and
reuses the `work/05` New 1:1 (`createOneOnOneNote`, which always writes `_related_to: [[person]]`). Only the
differences are listed.

## Files that change
- `core/settings/settings.types.ts:174-185` `OneOnOneSettings.dueAfterDays: number`; default 14 in
  `settings.store.svelte.ts:45-51` (old settings files get it from the existing `oneOnOne` merge,
  `settings.service.ts:113`). `sections/OneOnOneSection.svelte`: a number input (whole days, >= 0).
- `plugins/one-on-one/one-on-one.logic.ts`: `linksPerson(target, name)` (case-insensitive, folder prefix and `.md`
  ignored, as `ensureFrontmatterLink`); `buildMyPeople(entries, { vaultPath, workPeopleFolder, todayKey,
  dueAfterDays })` -> rows `{ name, path, lastDate, days, overdue }`. People = entries whose parent folder is
  exactly `<vault>/<workPeopleFolder>`. A 1:1 = any entry whose `relatedTo` (Rust-parsed `_related_to` targets)
  links the person; its day is `entryNoteDate`. `overdue` = never, or `days > dueAfterDays`.
- New `plugins/one-on-one/MyPeopleSection.svelte`: reads `typeDefinitionsStore.entries` (refreshed on every
  `vault-index-updated`), `settingsStore.oneOnOne`, `eventCalendarViewStore.todayKey` (the Today lens holds the
  clock). Row: name button opens the person (`openFileInEditor`), `Nd` / `never` label (`text-warning` when
  overdue, else `text-file-explorer-muted-fg`), "New 1:1" button -> `createOneOnOneNote(name)`, toast on failure.
  Empty: a notice naming the folder.
- `one-on-one.service.ts`: `registerOneOnOneTodaySection()` (id `my-people`, label `My people`).
- `core/app-lifecycle/app-lifecycle.service.ts:244-258`: added to `unregisterNoteChangeConsumers`.

## Plan (test-first)
1. `one-on-one.logic.test.ts`: `_related_to` counts anywhere; body-only mention does not; latest date wins;
   never; boundary `dueAfterDays` vs +1; people only directly in the folder, markdown only; empty folder setting.
2. Settings: store default 14, service merge for an old file, `OneOnOneSection` input updates the store.
3. `MyPeopleSection.test.ts` (real stores, Tauri/editor/toast mocked): rows and labels; flag class flips live
   when `dueAfterDays` changes; open person; New 1:1 writes `_related_to` via `create_note` and after the index
   refresh (`setEntries`) the row reads `0d`; failure toasts; empty state.
4. `app-lifecycle.service.test.ts`: registration wired at open, unwired at teardown.

## Prior art
`one-on-one.create.test.ts` (real note creator), `RailNoteList.test.ts` Today section, `EditorSection.test.ts`,
lifecycle "registers New Kanban Board" test.

## Defaults taken
- Order: overdue-most first (never, then oldest last 1:1), ties by name (PRD rule "my people by last 1:1").
- A 1:1 dated after today (scheduled ahead) is not counted as the last 1:1.
- "never" is flagged (prototype treats it as overdue).
- Label `Nd` like the prototype; the days refresh with the index (~2 s after New 1:1), not instantly.
- The Today rule text (`lens.logic.ts`) is left as is: it is features-owned and not in the criteria.

## Risks
- `warning` is defined for every built-in theme by Issue 02 (readability pinned at 4.5:1 on the sidebar bg).
