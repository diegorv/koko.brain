VERDICT: APPROVED

# Review: Issue 70, "Create type definition" name collision

Reviewed `git diff main...HEAD` (8afcf7da, 7dbee86e, 8fc8a8c9) in the worktree, branched from main at 2294a13d.

## Acceptance criteria

- [x] **Met.** `createTypeDefinition` checks the vault root for `<name>.md` (case-insensitive) and reports the collision instead of creating, and every caller goes through that check. `fs.service.ts createFile` is unchanged.
  - Evidence: `src/lib/features/type-definitions/type-definitions.service.ts:155-172` reads the root with `readDir(vaultStore.path)`, finds the entry whose lowercased name equals `<typeName>.md` lowercased, shows `toast.error` and returns `null` before `createFile`. A failed read logs and returns `null`.
  - Callers: `TypeSidebar.svelte:396` ("Create type definition"), `TypeSidebar.svelte:412` ("New type" dialog) and `EventCalendarSection.svelte:105` ("Open Event type") all call the service. `git diff main...HEAD -- src/lib/core/filesystem` is empty.
  - The case-insensitive match is the right one. `generateUniqueName` (`fs.logic.ts:191-197`) dedupes against every sibling ignoring case, so this check rejects exactly the names `createFile` would rename.
  - Test evidence: `type-definitions.service.test.ts:565` (ordinary root note: no `createFile`, no open, toast), `:580` (`sprint.MD` matches, and the `select` path leaves the store selection `null`), `:594` (a root `Sprints.md` and a folder `Sprint` do not block the create), `:608` (a root read failure creates nothing).

## Checks I ran

- Red probe: I swapped in main's `type-definitions.service.ts` and ran `type-definitions.service.test.ts`. Result: 3 failed, 56 passed. The three collision and read-failure cases fail and the "other names" guard passes. I restored the file with `git checkout HEAD --` and the tree was clean afterwards.
- `pnpm vitest run src/tests/lib/features/type-definitions/ src/tests/lib/features/event-calendar/EventCalendarSection.test.ts src/tests/lib/core/filesystem/`: 19 files, 641/641 passed.
- `pnpm check`: 211 files, 0 errors, 0 warnings.
- I did not run the full gate, because deliver runs it.

My test verdict rests on these files:
- `src/tests/lib/features/type-definitions/type-definitions.service.test.ts` (the changed file)
- `src/tests/lib/features/type-definitions/TypeSidebar.test.ts` and `src/tests/lib/features/event-calendar/EventCalendarSection.test.ts` (the callers; both mock the service, so they show the callers did not regress but say nothing about the new check)
- `src/tests/lib/core/filesystem/` (`createFile` and `generateUniqueName`)

## CLAUDE.md rules

- Layers: the change stays inside `features/type-definitions` and imports only core, so the layer rules hold.
- Error handling: the `readDir` failure is caught, logged with context and turned into `null` without touching any store. No partial state is written.
- Stores: the tests assert real store state (`selectedTypeOrNav`) and do not mock the store.
- Tests: the one changed source file has its test file updated in the same commit. Tabs are used and the JSDoc is updated.
- Scope: one function and its tests changed. The Calendar call site and `createFile` are untouched, as the Issue asks.
- Performance: one extra `readDir` of the vault root per create, an explicit user action. This is negligible and follows the `createView` precedent.

## Findings

1. **Low**, `src/lib/features/event-calendar/EventCalendarSection.svelte:97-112`. The Calendar checks `fsStore.fileTree` for files only. When that tree is stale, or when a root folder is literally named `Event.md`, its check passes. The service then shows its name-taken toast and returns `null`, and the Calendar adds "Could not create the "Event" type", so the user gets two toasts. Before this change the user got one toast and a stray `Event 1.md` was written. The post-create basename check at `:109-112` can now only fire on a same-instant race. The discovery notes disclose this trade-off and the Issue keeps the call-site check, so no change is required. If the double toast matters later, the service could report why it returned `null`, so the Calendar can skip its generic toast.
2. **Low**, `src/lib/features/type-definitions/type-definitions.service.ts:159-165`. A failed vault-root read only logs. From TypeSidebar, whose call ignores the return value, the user sees nothing. CLAUDE.md asks for user-facing errors to be shown in a toast. This matches the existing `createFile` failure path, which also returns `null` silently to TypeSidebar, and the Calendar already shows its own toast, so this is not blocking. Optional fix: toast in TypeSidebar's handler when the result is `null`. Do not toast in the service, or the Calendar would show the error twice.
3. **Nit**, `src/lib/features/type-definitions/type-definitions.service.ts:167-171` and `EventCalendarSection.svelte:64-68`. The service toast repeats the Calendar's `toastNameTaken` wording almost word for word, so the two copies can drift apart. The advice to add `"_type: Type" to its frontmatter` also fits poorly when the colliding entry is a folder. Optional: share a single message builder. No change required.

None of these findings blocks delivery.
