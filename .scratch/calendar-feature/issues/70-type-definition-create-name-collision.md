# 70: "Create type definition" writes Name N.md next to an ordinary root note

**What to build:** stop `createTypeDefinition` from writing a deduped definition when an ordinary note already holds the type's file name in the vault root. Found by the issue 68 review (finding 3, `work/68/review.md`).

**Blocked by:** None

**Status:** ready-for-agent

- [ ] `TypeSidebar.svelte:396` ("Create type definition" in a type section's context menu) calls `createTypeDefinition(name)` (`type-definitions.service.ts:146`). With an ordinary root `Name.md` already present, `createFile` dedupes to `Name 1.md`, which defines type "Name 1"; the section still has no definition, so every repeat writes another copy. Fix: check the vault root for `<name>.md` (case-insensitive) inside `createTypeDefinition` and report the collision instead of creating, so both callers (TypeSidebar and the Calendar's "Open Event type", which has its own call-site check in `EventCalendarSection.svelte`) share it. Do not change `fs.service.ts createFile`.

## Comments
