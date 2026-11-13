# Issue 04 discovery

## Files that change

- `src/lib/features/deep-link/deep-link.service.ts:329-335` (silent create branch of `executeNewAction`): add `exists(fullPath)` check before `mkdir` / `writeTextFile`.
- `src/tests/lib/features/deep-link/deep-link-silent-new-overwrites.test.ts`: moved from `.scratch/file-io-audit/repro/o03-deep-link/` (fixture import path fixed, svelte-sonner mocked so the info toast can be asserted, plus a not-existing case and overwrite/append/prepend guards).

## Plan

1. Move the repro test, see both cases fail (red). Commit.
2. In the silent create branch: `if (await exists(fullPath)) { toast.info(...); return; }` before mkdir. No write, no `markRecentSave`, no `notifyAfterSave`, no tree refresh. Toast text: `<name> already exists; not overwritten. Use overwrite=true to replace it.` where `<name>` is the file name without `.md` (the same title the non-silent branch passes to `openOrCreateNote`).
3. Add cases to the moved test: new note still created; `overwrite=true` replaces; append and prepend unchanged.
4. Existing `deep-link.service.test.ts` mocks `exists` to false in `beforeEach` (:119), so its silent-create test (:308) keeps passing; add `info` to its svelte-sonner mock only if needed.

## Prior art

- `src/tests/lib/features/deep-link/deep-link-dirty-buffer.test.ts`: fake-disk plugin-fs mock with a svelte-sonner mock that includes `info`.

## Risks

- append/prepend on a missing file fall through to the create branch; `exists` is false there, so they still create. Covered by the existing tests.
- A race where the file appears between `exists` and `writeTextFile` remains (same as `openOrCreateNote`); out of scope.

## Defaults taken

- `<name>` in the toast is the note title (file name minus `.md`), not the vault-relative path.
