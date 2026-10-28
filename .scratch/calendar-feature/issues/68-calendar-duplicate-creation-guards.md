# 68: Calendar actions that can create duplicates

**What to build:** stop Calendar actions from creating duplicate notes when clicked again or from a second view. Split out of the former ticket 64 (Calendar polish from the post-merge adversarial reviews). Items are low severity as recorded; line anchors are as recorded at review time and may have drifted, so re-locate them on main first.

**Blocked by:** None

**Status:** ready-for-agent

Ticket 32 review (fix 0542bac2):
- [ ] "Open Event type" (`EventCalendarSection.svelte:79-90`) with an ordinary note `Event.md` already in the vault root: `createFile` (`fs.service.ts:121`) dedupes to `Event 1.md`, whose type name never matches the configured "Event" (resolved by name at `:46-49`), so every later click creates another `Event N.md` and closes Settings on a definition that is not the configured type. Fix: check the returned path's basename against the configured name, or detect the collision first and toast.
- [ ] Nit: `TypeSidebar.svelte:396` discards the new return value (harmless).

Ticket 54 review (fix dd9f45a4):
- [ ] The in-flight guard in `EventDailyNoteButton.svelte:21` is per instance, not per day: a remount or a second Calendar view during an open can fire a second `openOrCreate` for the same date and toast "File already exists". A per-day set in the store, or a guard in `openOrCreatePeriodicNoteForDate`, closes it.
- [ ] The daily note opener is registered unconditionally (`app-lifecycle.service.ts:247`); if periodic notes ever gets an off switch, the header button must hide with it.
