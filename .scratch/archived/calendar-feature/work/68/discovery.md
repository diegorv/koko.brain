# 68 discovery: Calendar actions that can create duplicates

## Files that change

- `src/lib/features/event-calendar/EventCalendarSection.svelte:66-94` (`openEventType`): before `createTypeDefinition`, look for a vault-root note `<name>.md` (case-insensitive) in `fsStore.fileTree`; when one exists it is not the type (the type map would have resolved it), so toast "A note named "<name>.md" already exists in the vault root. Add "_type: Type" to its frontmatter or rename it." and create nothing. After the create, compare the returned basename with `<name>.md`; on a mismatch (stale tree, `createFile` deduped to `Event 1.md`) toast the same message and keep Settings open.
- `src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:33-36` (`open`): keep a per-day `Map<day, Promise>` of in-flight opens; a second `open(day)` while one runs returns that promise instead of calling the opener again. Cleared on settle.
- `src/lib/features/event-calendar/EventDailyNoteButton.svelte:16-36`: drop the per-instance `pending` flag; the store guard covers it for every view and remount.

## Plan

1. Event type collision (test-first in `src/tests/lib/features/event-calendar/EventCalendarSection.test.ts`): root `Event.md` in the real `fsStore` -> toast, no create, panel open; create returning `/vault/Event 1.md` -> toast, panel open; existing tests keep the happy path. One commit.
2. Per-day guard (test-first in `src/tests/lib/features/event-calendar/event-calendar-daily-note.store.test.ts`): two `open(day)` before settle call the opener once and both resolve; different days run separately; after settle (resolve or reject) a new open calls again. One commit.

## Prior art

`"Open Event type" creates once on a double click` test (deferred promise pattern) for both steps.

## Risks

- `fsStore.fileTree` can be stale; the post-create basename check is the backstop. In that case the deduped `Event 1.md` was already written and opened by `createTypeDefinition`; the toast names the cause. `fs.service.ts createFile` is owned by Issues 46/48 and is not touched.
- A double click on one button that fails now toasts twice (both callers share the rejected promise). Accepted: two clicks, two reports.

## Defaults taken

- "Opener registered unconditionally" item: periodic notes has no off switch today (no enable setting in `PeriodicNotesSettings`), so no change; recorded here for when one lands.
- `TypeSidebar.svelte:396` nit (discarded return value) is harmless; left untouched (surgical-changes rule).
