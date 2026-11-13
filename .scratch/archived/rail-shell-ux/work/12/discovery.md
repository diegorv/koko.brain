# Issue 12 discovery

No `spec.md` exists for rail-shell-ux; the Issue and its Notes are the spec. Builds on work/01 (`isListableNote`) and work/10 (`ViewLoad`).

## Files that change

- `src/lib/features/type-definitions/type-sidebar.logic.ts`: `excludeSystemFolder` (:49) goes generic `T extends { path: string }`; `isListableNote` (:67) also false for `isA === 'Type'`; `getNotesForSelection` type/untyped cases (:84-89) and `buildTypeSections` skip (:158) use `isListableNote`.
- `src/lib/features/type-definitions/inbox-workflow.logic.ts:8`: `isInboxEntry` uses `isListableNote` instead of `isA !== 'Type'` (Inbox lens, dock badge, rail badge, italic flag).
- `src/lib/features/rail-shell/lens.logic.ts`: Archive includes (:234), Today both groups (:260-261) add `isListableNote`; Favorites (:232) stays as is; neighbourhood `linked()` (:317) and backlinks (:322) filter with `isListableNote`, "This note" unchanged, doc comment updated. `resolveViewLens` (:603) already filters with `isListableNote`, so type definitions drop out of views and `countViewNotes` with no edit.
- `src/lib/plugins/calendar/day-lens.logic.ts`: `resolveDayLens` (:40) and `noteDateCounts` (:47) add `isListableNote`.
- `src/lib/plugins/queryjs/kb-api.ts`: `systemFolder` ctor option and private field; `ensureCache` builds `byPath` over every record and `list` over the records kept by `excludeSystemFolder` + (`isListableNote(entry)` or, without an entry, `!isViewFile(path)`); `sharedPageSet` key gains `systemFolder`.
- `src/lib/plugins/queryjs/queryjs-block-widget.ts:245`: pass `settingsStore.templates.systemFolder`.
- `help/documentation/13-queryjs.md`: pages() (:58-68), page() (:70), compatibility (:1131).

## Tests (prior art in the same files)

- `type-sidebar.logic.test.ts` `describe('isListableNote')` (:921): add type definition case.
- `lens.logic.test.ts`: new describe for the rule (Today/Day/Archive/Untyped/type rows/neighbourhood/view/Favorites), red before the change; uses `ctx()` + `entryV2`.
- `day-lens.logic.test.ts`, `inbox-workflow.logic.test.ts`: extend.
- `kb-api.test.ts`: `createAPI` gains `systemFolder`; new describe with `.view`, `_type: Type` and `_system` records + entries.
- `kb-api-contract.test.ts`: add `systemFolder` to `KBAPI_INTERNAL`; every `new KBAPI` in the four listed test files passes `systemFolder`.

## Defaults taken

- The Types navigator's Views section and the Files navigator read the file tree, not entries: untouched.
- `filterByNavItem` (dead from the rail, only `getNotesForSelection` `nav`) is not changed.
- A type definition in the property index with no entry is listed (only `.view` has a path fallback), as the Issue specifies.

## Risks

- `isInboxEntry` now imports `type-sidebar.logic.ts`; no cycle (that file imports neither inbox-workflow nor lens).
- Shared page objects: `list` holds the same objects as `byPath`, so `mutate` semantics are kept.
