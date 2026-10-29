# Discovery: Issue 70, "Create type definition" name collision

## Files that change

- `src/lib/features/type-definitions/type-definitions.service.ts:139-157` `createTypeDefinition`: before `createFile`, read the vault root (`readDir(vaultStore.path)`) and look for an entry whose name equals `<typeName>.md` ignoring case. On a hit: `toast.error` (conditional wording, same advice as the Calendar's `toastNameTaken`) and return `null`, creating nothing. On a `readDir` failure: log and return `null` (the same outcome `createFile` gives when its own `readDir` fails; `createView` aborts the same way). JSDoc updated.
- `src/tests/lib/features/type-definitions/type-definitions.service.test.ts:494-563`: new cases (root note taken, case-insensitive hit, a nested/other-name entry does not block, readDir failure). Existing happy-path cases get `readDir` mocked to `[]` (the describe calls `vi.resetAllMocks()`, so an unmocked `readDir` returns `undefined`).
- No change to `fs.service.ts createFile` (Issue rule), `TypeSidebar.svelte` or `EventCalendarSection.svelte`.

## Plan

1. Test-first in the service test: the collision cases fail on main (createFile is called with `Sprint.md` and dedupes in real life).
2. Add the check in `createTypeDefinition`. Both callers share it: TypeSidebar's "Create type definition" (`TypeSidebar.svelte:396`), the "New type" dialog (`:412`) and the Calendar's "Open Event type" (`EventCalendarSection.svelte:105`).

## Prior art

- `createView` (`type-definitions.service.ts:208-235`): fresh `readDir` of the vault root before `createFile`, abort on failure.
- Calendar pre-check + `toastNameTaken` wording (`EventCalendarSection.svelte:60-69, 97-102`), from Issue 68.

## Defaults taken

- The check matches any root entry, file or folder, because `createFile`'s `generateUniqueName` dedupes against every sibling, case-insensitively (`fs.logic.ts:191-197`). The Calendar's own pre-check looks at files only; it is left as is.
- Reported by a toast in the service, since TypeSidebar discards the return value. Return stays `string | null`.
- The Calendar keeps its synchronous pre-check against `fsStore.fileTree`. When that tree is stale, the service now catches the collision: the user sees the service toast plus the Calendar's "Could not create" toast (two toasts, no stray `Event 1.md`), instead of today's one toast plus a stray file. Accepted; not widened into the Calendar.

## Risks

- One extra `readDir` per create (vault root only). Negligible.
- Same-instant race between this `readDir` and `createFile`'s accepted, as in `createView`.
