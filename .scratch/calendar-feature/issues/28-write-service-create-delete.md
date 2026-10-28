# 28: Write service part 2: create, duplicate, delete, restore and their undo

**What to build:** the calendar write service can create, duplicate, delete and restore event notes, each through an existing owner (`createTypedNote`, `createFile`, `saveFileByPath` plus `deleteItem`, `restoreItem`), with a pending overlay entry for each change and a Cmd+Z op for each create, duplicate and delete, so creates and deletes undo and redo through the Trash. A new event lands in the same folder, with the same dedupe and template, as the type sidebar's "New Event"; a template whose frontmatter would be rewritten lossily is refused instead of merged; a delete saves a dirty tab first so the Trash keeps the edit; and a restore after the Trash was emptied refuses with a clear error while every store stays untouched.

**Plan reference:** Task 27 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 626-662). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 15, 16, 24, 39

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/event-calendar.service.ts` (modify)
- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts`

- [ ] The Notes C8 Pre-Change Checklist answers are confirmed before the change (the service writes the event-calendar stores directly, frontmatter through C2 and creation through C3; `createFile`, `deleteItem` and `restoreItem` write the `fsStore` tree, `trashStore`, `editorStore` tabs and the index legs), and each service test is written before its function
- [ ] `EventCalendarError` exists in `event-calendar.service.ts` with `reason: 'not-in-trash' | 'template-lossy' | 'create-failed'`, and `toastEventError` maps each reason to its message ("Event is no longer in the Trash"; "The Event template's frontmatter has comments or nested values; fix it or remove the template from the Event type"; "Could not create the note; a note with the same name, possibly differing only in case, may exist")
- [ ] `createEvent(draft)` calls `createTypedNote` (ticket 15) with `typeName: resolveEventTypeName(typeDefinitionsStore.typeMetadataMap.keys(), settingsStore.eventCalendar.eventTypeName)`, `title: eventFileBase(draft.title)`, `contextDate: dayjs(draft.date)` and a `buildContent` that runs `detectLossyFrontmatter(base)` first: a non-null reason throws `EventCalendarError('template-lossy')` and writes no note, otherwise it returns `applyEventDraft(base, draft, target.title)`; `Error('create-failed')` becomes `EventCalendarError('create-failed')`; a pending `create` entry and a 'Create event' op are recorded
- [ ] `duplicateEvent(path)` takes the open tab's content when one exists, else `readTextFile`, and calls `createFile` in the same folder with `eventFileBase(title) + ' (copy).md'` (`null` throws); bytes are copied unchanged, except that `event_title` becomes "<title> (copy)" when the base carries `event_title` and `detectLossyFrontmatter(base)` is null (a lossy base keeps its bytes); a pending `create` and a 'Duplicate event' op are recorded
- [ ] `deleteEvent(path)` first awaits `saveFileByPath(path)` (`false` aborts with `save-failed`), then calls `deleteItem(path)` (`false` throws), records `trashId` from `trashStore.items[0]` when its `originalPath` equals `getRelativePath(vaultStore.path, path)`, and records a pending `delete` and a 'Delete event' op
- [ ] `restoreDeletedEvent(path, trashId?)` picks the item with that id, else the newest `trashedAt` whose `originalPath` matches; no match (Trash emptied, or an unknown path) throws `EventCalendarError('not-in-trash')` with the stores and `trashStore` untouched; otherwise it calls `restoreItem`, which since ticket 16 also indexes the note and may return a suffixed path, then `remapPath` to the returned path plus a pending `create` until the snapshot has the path
- [ ] `undoDeleteEvent(path)` (the toast Undo) restores the event and retires the matching delete op with `removeOp`
- [ ] Undo/redo handles `create` (undo is `deleteEvent` when the event still equals `state`, redo is `restoreDeletedEvent`) and `delete` (undo is `restoreDeletedEvent`, remapping to the returned path, redo is `deleteEvent`); failing preconditions refuse the op, and a vanished path returns `vanished` as in ticket 24
- [ ] Create tests run the real `createTypedNote` with mocked fs and `invoke`: content from the inline template; a configured template; a template with `date: <% tp.date.now("YYYY-MM-DD") %>` and a body heading using the same expression renders the draft's date, not today; a template with a comment refuses with `template-lossy` and writes nothing; a second "Standup" lands in `Standup 1.md` with `event_title: Standup`; `1:1 with manager` lands in `1-1 with manager.md`; a null `createFile` throws `create-failed`
- [ ] Duplicate tests: the duplicated content matches, including a dirty tab's content, and a duplicate of an `event_title` note carries "<title> (copy)"
- [ ] Delete and restore tests: deleting a dirty open tab then restoring yields trashed and restored bytes that include the edit; a save failure aborts the delete; `deleteItem` returning false throws; restore by id; a restore with a suffixed path remaps; no match throws with stores and `trashStore` unchanged; undo of a delete restores, undo of a create deletes, and redo of each works
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 14:11 — discovery — plan in work/28/discovery.md: internal deleteNow/restoreNow shared by public calls and undo; real owners in tests on the fake disk — aa71267f
- 2026-10-28 14:16 — implement — create/duplicate/delete/restore/undoDelete + create/delete undo-redo; event-calendar vitest 544/544, importers+trash+type-definitions 491/491, svelte-check 0 errors; e2e and full gate left to deliver — 407b00a9
- 2026-10-28 14:21 — review — CHANGES_REQUESTED: suffixed restore remaps the occupying note's ops (Cmd+Z can trash the wrong note), drain skips createEvent, 3 Low; check 0 errors, vitest 1044/1044 — b262e451
