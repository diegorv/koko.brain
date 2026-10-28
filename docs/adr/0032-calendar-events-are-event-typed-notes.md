---
type: ADR
id: "0032"
title: "Calendar events are event-typed notes, in a new features/event-calendar"
status: active
date: 2026-10-28
---

## Context

The calendar-feature plan (`.scratch/calendar-feature/plan-2026-10-28.md`, deleted when the feature closed; read it with `git show c0103ff5:.scratch/calendar-feature/plan-2026-10-28.md`) ports a week / day / month event calendar from a standalone prototype that kept its events in `localStorage`. Kokobrain already had `plugins/calendar`, a sidebar month panel over periodic notes, and `plugins/periodic-notes`, but nothing that stores timed events.

Three questions had to be settled before any code: where an event's data lives, where the feature lives in the four-layer taxonomy ([0003](0003-four-layer-source-taxonomy.md)), and how its writes reach the indexes without a second note-change owner ([0009](0009-incremental-indexing-reverse-index.md), [0025](0025-rust-vault-index.md)).

## Decision

**A calendar event is a Markdown note whose type is the configured event type (`Event` by default). Its schedule lives in its frontmatter, and the calendar reads it from the Rust `VaultIndex` snapshot. The feature is a new `src/lib/features/event-calendar` that coexists with `plugins/calendar`, and it writes only through the existing note owners.**

### Storage: typed notes

- An event note's `_type` (alias `type`) equals the configured event type. Detection compares `entry.isA` ignoring case and never matches a type-definition note (`event-calendar-event.logic.ts:81-85`, `isEventEntry`).
- Schedule keys: `date` (`YYYY-MM-DD`), `start` / `end` (`HH:mm`, `24:00` allowed), optional `all_day`, `event_color` (six named hues), `location`. `end_date` (`YYYY-MM-DD`, not before `date`) marks a span; see the amendment below. A present but unparseable value is reported as an issue and never replaced by a default, so the calendar never overwrites a hand-written value it cannot read.
- Events are ordinary notes, so search, backlinks, QueryJS, collections, File History and the Trash cover them with no extra code. The note body is the event's description.

### The configurable event type (plan D25)

The type is the setting `settingsStore.eventCalendar.eventTypeName`, default `Event`. `normalizeEventTypeName` (`src/lib/core/settings/settings.logic.ts:64-69`) trims it and falls back to `Event` for an empty value or the reserved `Type`. Both the read projection and `createEvent` use it, and `resolveEventTypeName` (`event-calendar-event.logic.ts:367-370`) maps it to the casing of an existing type definition.

It is a setting, not a constant, because `renameType` rewrites `_type` across the vault (`src/lib/features/type-definitions/type-definitions.service.ts:174-200`): with a hard-coded `Event`, renaming the type to `Meeting` would empty the calendar while new events were still created as `Event`. `renameType` does not update the setting (that would couple the type owner to one consumer's settings); Settings > Calendar shows a static hint to update it after a rename.

### Titles: the filename and the `event_title` key (plan D6)

- The filename is the sanitized title: the characters `isValidFileName` rejects become `-`, and the typed-note owner dedupes it (`Standup.md`, `Standup 1.md`). A title such as `1:1 with manager` works.
- The typed title is stored in `event_title` only when it differs from the filename base. The display title is `event_title` when it is a non-empty string, else the filename base (`event-calendar-event.logic.ts:110-113`, `eventTitle`). The writer sets or removes the key in `applyEventFields` (`:278-279`).
- A plain `title` key was rejected: many vaults and tools already use `title` with other meanings. `color` was rejected for `event_color` because it is an alias of `_color`, the file-icon tint (`src/lib/utils/frontmatter-aliases.ts`).

### Placement: a new feature beside `plugins/calendar`

The feature is always loaded and owns a singleton virtual tab (`fileType: 'event-calendar'`). The sidebar month panel in `plugins/calendar` stays as it is and only gains a bridge that opens the Calendar tab (plugin to feature, which ADR-0003 allows).

### Writes go through the existing owners

- Frontmatter edits (move, resize, edit) go through one shared writer, `updateNoteFrontmatter` in `src/lib/features/properties/frontmatter-write.service.ts`: an open note is patched in its tab and saved at once, a closed note is written and then runs `notifyAfterSave`. It never re-creates a note that vanished.
- Creation goes through `createTypedNote` (`type-definitions.service.ts`), the owner the type sidebar's "New Event" also uses, so both entry points put Event notes in the same folder (`_folder` on the type) with the same template.
- A title edit renames the note through `renameItem`; Duplicate writes the copy through `createFile` (`fs` source).
- Delete and restore go through `deleteItem` and `trash.service::restoreItem`. Undo of a create or a delete goes through the Trash.
- Rust needs no production change; a contract test (`src-tauri/tests/vault_event_frontmatter_test.rs`) pins the fields the projection reads.

### New note-change source: `restore` (plan D20)

`NoteChangeSource` gains a sixth value, `restore` (`src/lib/core/filesystem/note-change.service.ts:17`), with the policy row `restore: { consumers: 'always', rust: 'always', mark: true, yieldBeforeConsumers: false }` (`:92-94`). `restoreItem` calls it for a restored Markdown file after the rename back (`src/lib/core/trash/trash.service.ts:145-146`, `indexRestoredNote` at `:221-234`), so the note is indexed at once instead of after the watcher debounce. The IPC must fire on every call: the delete already removed the note from Rust (`forgetNote`), and unlike `create` / `fs` no `create_note` ran for the restored file. Restored directories still rely on the watcher. The Trash panel's own restores get the same fix.

### Cross-layer imports

Built from `grep -rn "features/event-calendar" src/lib` and `grep -rnE "['\"](\\\$|#)lib/features/" src/lib/features/event-calendar` on the final tree (2026-10-28). The plan wrote the second grep as `"\$lib/features/"`; BSD grep on macOS reads that `$` as an anchor and matches nothing, so the escaped pattern above is the one that was run. It also covers the `#lib/features/` specifier form; no event-calendar file uses `#lib/` yet.

Core to event-calendar (each has precedent: `global-keybindings.ts` already imported five features and three plugins, `tauri-listeners.service.ts` a plugin and four features):

| Importer | Imports | Why |
| --- | --- | --- |
| `src/lib/core/markdown-editor/EditorView.svelte:19` | `EventCalendarView.svelte` | renders the Calendar virtual tab |
| `src/lib/core/keybindings/global-keybindings.ts:13` | `toggleEventCalendarTab` | the global Calendar toggle binding |
| `src/lib/core/app-lifecycle/app-lifecycle.service.ts:64` | `drainEventCalendarWrites`, `resetEventCalendar` | drain in-flight writes and reset state on vault teardown |
| `src/lib/core/layout/tauri-listeners.service.ts:17` | `drainEventCalendarWrites` | drain in-flight writes before the window closes |
| `src/lib/core/settings/SettingsPanel.svelte:13` | `EventCalendarSection.svelte` | the Settings > Calendar section |

`src/lib/core/markdown-editor/EditorTabs.svelte:55` only compares `tab.fileType === 'event-calendar'` to pick a lucide icon; it imports nothing from the feature and is not listed.

Feature to feature:

| Importer | Imports |
| --- | --- |
| `src/lib/features/command-palette/command-palette.service.ts:32-33` | `event-calendar.service` (open, toggle, new event, undo / redo commands), `eventCalendarViewStore` |
| `src/lib/features/event-calendar/event-calendar-event.logic.ts:14, 16` | `features/properties`: `Property` type, `extractBody`, `parseFrontmatterProperties`, `rebuildContent` |
| `src/lib/features/event-calendar/event-calendar-event.logic.ts:17` | `features/type-definitions/type-sidebar.logic`: `excludeSystemFolder` |
| `src/lib/features/event-calendar/event-calendar.service.ts:27` | `features/properties/frontmatter-write.service`: `updateNoteFrontmatter`, `FrontmatterWriteError`, `FrontmatterWriteReason` (type) |
| `src/lib/features/event-calendar/event-calendar.service.ts:28` | `features/properties/properties.logic`: `detectLossyFrontmatter`, `extractBody`, `parseFrontmatterProperties`, `rebuildContent` |
| `src/lib/features/event-calendar/event-calendar.service.ts:29-30` | `features/type-definitions`: `createTypedNote`, `typeDefinitionsStore` |
| `src/lib/features/event-calendar/EventCalendarSection.svelte:14-16` | `features/type-definitions`: `typeDefinitionsStore`, `buildTypeNoteDir`, `validateTypeName`, `createTypeDefinition`, `refreshTypeDefinitions` (the events-folder line and the "Open Event type" button, which creates the definition when the vault has none) |

Plugin to feature (allowed by ADR-0003):

| Importer | Imports |
| --- | --- |
| `src/lib/plugins/calendar/CalendarPanel.svelte:13` | `openEventCalendarTab` |

The feature imports no plugin.

### Amendment 2026-10-28 (calendar-feature issue 41): multi-day and cross-midnight events

- **Spans render on every day they cover**, in the day, week and month views. `segmentOnDay` (`src/lib/features/event-calendar/event-calendar-view.logic.ts:187`) cuts a timed span into one segment per day; an all-day span is listed as itself on each day.
- **An `end` before `start` without `end_date` ends the next day** (`entryToEvent`, `event-calendar-event.logic.ts`). `end: 00:00` after a later `start` means 24:00 of the same day. A `start` of `24:00` is reported as an issue, since nothing of the event would fall on its own day.
- **Spans are read-only on the calendar**, because the calendar never writes `end_date`: moving one bound would desync `date` and `end_date`. Every event with `end_date` or a cross-midnight range is `readOnly`, and `writeEvent` (`event-calendar.service.ts:418`) refuses any timing patch on it with `EventCalendarError('read-only')` before anything is written. Non-timing edits (title, colour, location, notes) still go through.
- **Timed spans are drawn in the time grid**, one block per day, not in the all-day lane; a middle day gets a full-height block.

## Relation to ADR-0029

[0029](0029-frontmatter-yaml-canonical-form.md) says nested mappings and YAML comments are dropped on a frontmatter rewrite and that callers must accept the loss. The calendar departs from that, in two places only:

- `updateNoteFrontmatter` runs `detectLossyFrontmatter` (`src/lib/features/properties/properties.logic.ts`, reasons `unparseable`, `nested`, `comments`, `duplicate-keys`, `alias-collision`, `anchors`) on the current content first (`frontmatter-write.service.ts:94`). A non-null reason throws `FrontmatterWriteError` with that reason and writes nothing, so a drag on a note with commented or nested frontmatter is refused and rolled back instead of silently losing data.
- Calendar creation from a type template refuses the same way: `createEvent` throws `EventCalendarError('template-lossy')` before any note is written (`event-calendar.service.ts:598`). The sidebar's "New Event" keeps such a template verbatim because it never rewrites it; the calendar must merge fields into it, so it refuses. Duplicate keeps the bytes unchanged and only skips the `event_title (copy)` rewrite when the frontmatter is lossy (`:650`).

The existing writers (Properties panel, lifecycle toggles, meta-bind widgets, the frontmatter-icon service, deep-link writers, the type-definitions service) keep ADR-0029's drop behaviour unchanged. A runtime round-trip deep-equal was rejected as the refusal test: ADR-0029 defines `key:` -> `""` and list-item stringification as canonical, so it would refuse every note with an empty template key.

## Alternatives considered

- **Sidecar JSON (`.kokobrain/calendar/events.json`).** Rejected: events would be invisible to search, backlinks, QueryJS and collections; [0019](0019-kokobrain-in-vault-data-dir.md) tells users to exclude `.kokobrain` from sync; the watcher drops dot directories (`src-tauri/src/vault/watcher.rs:74-82`), so it would need a new Rust write command and a merge-and-reconcile subsystem; and [0027](0027-frontmatter-system-metadata-underscore-prefix.md) already moved file icons off a sidecar JSON for the same reasons. The prototype's `localStorage` was rejected too: it is per webview, not per vault.
- **Promote `plugins/calendar` and `plugins/periodic-notes` into one `features/calendar`.** Rejected: about 35 files move before any user value appears, it extends a TypeScript mirror of vault metadata (against CLAUDE.md Indexing rule 1), and it changes the month grids that collection views and the live-preview widget use. Reusing the name `calendar` was rejected as well: it collides with `calendarStore`, the `calendar` note-change consumer, the SidebarMode value and `features/collection/calendar.logic.ts`.
- **One ISO datetime per bound, or integer minutes.** Rejected: `PropertyField.svelte` renders every `date`-typed value as `<input type="date">`, so a `T` value shows blank; minutes are unreadable by hand.
- **A note-change consumer as the read path.** Rejected: another TypeScript mirror and a silent-registration risk. The view projects `getVaultEntries()`, keyed on `vaultIndexVersion`.
- **A feature-local frontmatter writer, or disk-direct writes.** Rejected: duplicated owner logic, or clobbered dirty tabs and skipped after-save observers.
- **Watcher-only indexing after a Trash restore.** Rejected: Trash panel restores lag by the debounce, and the calendar's pending overlay could stall.

## Consequences

- Event notes are first-class notes: users can edit them by hand, query them and sync them with the vault.
- `applyNoteChange` has six sources. Any new restore-like path that puts bytes back without a Rust `create_note` uses `restore` (or another `rust: 'always'` row), not `create` / `fs`.
- A rename of the event type needs the matching settings edit, or the calendar shows no events.
- Notes with lossy frontmatter cannot be moved or edited from the calendar until the user fixes the frontmatter; the toast names the reason. The rest of the app still drops per ADR-0029.
- Multi-day and cross-midnight events render on every day but are read-only on the calendar (see the amendment); no recurrence.
- A new cross-layer import needs a row here; re-run the two greps above to check the inventory.

## Citation map

- Plan and decision log: `git show c0103ff5:.scratch/calendar-feature/plan-2026-10-28.md` (deleted from the tree when the feature closed), Notes > Decisions D1-D26.
- Event detection: `src/lib/features/event-calendar/event-calendar-event.logic.ts:81-85`.
- Display title: `event-calendar-event.logic.ts:110-113`; `event_title` write: `:278-279`.
- Event type setting: `src/lib/core/settings/settings.logic.ts:64-69`; resolution: `event-calendar-event.logic.ts:367-370`.
- Shared writer: `src/lib/features/properties/frontmatter-write.service.ts:68` (`updateNoteFrontmatter`), lossy check `:94`.
- Template refusal: `src/lib/features/event-calendar/event-calendar.service.ts:598`.
- `restore` source: `src/lib/core/filesystem/note-change.service.ts:17, 92-94`; caller `src/lib/core/trash/trash.service.ts:145-146, 221-234`.
