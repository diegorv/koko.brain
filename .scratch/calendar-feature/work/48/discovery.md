# 48 discovery: case-only name collisions get a numbered file

## Files that change

- `src/lib/core/filesystem/fs.logic.ts:183-217` (`generateUniqueName`): the one dedupe helper behind both paths. It builds `new Set(existingSiblingNames)` and tests exact membership (`:193-194`, `:215`), so `standup.md` next to `Standup.md` passes as free; Rust `create_note` (`src-tauri/src/commands/vault.rs:837`) then sees `Path::exists` true on APFS and refuses, and `createTypedNote` throws `create-failed`.
- Callers: `createFile` (`fs.service.ts:122`), `resolveTypedNoteTarget` (`type-definitions.service.ts:72`), plus `createFolder` (`fs.service.ts:151`), `createView` (`type-definitions.service.ts:231`) and `planTitleChange` (`event-calendar-form.logic.ts:215`, already lowercases its inputs, so unaffected).
- `type-definitions.service.ts:105-108` JSDoc of `createTypedNote` names "a case-folded name collision in Rust `create_note`" as a `create-failed` cause; after the fix it is only reachable through the accepted same-instant race, so the parenthetical goes.

## Plan (smallest change)

1. Failing tests first in `fs.logic.test.ts`: `standup.md` vs `['Standup.md']` gives `standup 1.md` (requested casing kept); a case-only numbered sibling is skipped too (`['Standup.md', 'STANDUP 1.md']` gives `standup 2.md`); distinct names unchanged; directory case.
2. `generateUniqueName`: fold the sibling set and each candidate with `toLowerCase()`; return the candidate in the caller's casing.
3. Service-level tests proving both paths: `createFile` case-only collision gives `/vault/new 1.md` (`fs.service.test.ts` near `:425`); `createTypedNote` with `Standup.md` present and title `standup` hands `standup 1.md` to `createFile` (`type-definitions.service.test.ts` near `:397`).

## Prior-art tests

`generateUniqueName` suite (`fs.logic.test.ts:591-623`), `generates unique name when file already exists` (`fs.service.test.ts:425`), `dedupes the filename and hands the deduped target to buildContent` (`type-definitions.service.test.ts:397`). Template for the folding: `planTitleChange` (`event-calendar-form.logic.ts:207-224`).

## Risks

- Fixing the shared helper also folds case for `createFolder` and `createView`. That is the right behavior on APFS (a recursive `create_folder` onto a case-variant folder silently reuses it today); on a case-sensitive volume a case-only variant now gets a number instead of coexisting. Accepted: Rust and the macOS default are case-insensitive.
- `toLowerCase` vs Unicode case folding: APFS folds more than `toLowerCase` (e.g. some locale-specific letters). Matches `planTitleChange`; good enough for the reported case.

## Defaults taken

- Fix in `generateUniqueName` rather than lowercasing at each call site: one helper, both acceptance paths, no duplicated folding.
- No E2E: the E2E virtual FS is case-sensitive; unit tests on the dedupe logic and both services cover it.
