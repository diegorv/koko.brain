# Issue 01 discovery: panel commit writes stale properties

## Files that change
- `src/lib/features/properties/properties.store.svelte.ts:4-19` - add `sourcePath` (path the properties were parsed from); `setProperties(p, sourcePath)` takes it, `reset()` clears it.
- `src/lib/features/properties/properties.service.ts:20-52,137-146` - path-scoped skip flag (`skipNextParseFor`), `consumeSkipNextParse(path)` only skips for the note the commit wrote and always clears; `parseAndSetProperties(content, path)`; new exported `propertiesMatchActiveNote()` guard; `commitChanges` returns boolean and refuses when the guard fails; `renameProperty` / `addNewProperty` return the commit result.
- `src/lib/features/properties/lifecycle.service.ts:12-22` - `commitLifecycleChange` writes the same way (props + active body), so it gets the same guard. Not listed in the Issue's Touches, but it is the same bug class.
- `src/lib/features/properties/PropertiesView.svelte:99-110` - pass the active path to `consumeSkipNextParse` / `parseAndSetProperties`; when the active path differs from `propertiesStore.sourcePath`, parse immediately instead of after 300 ms, so the panel never shows the previous note's properties.

## Plan
1. Move `.scratch/properties-cross-note/repro/repro-cross-note-frontmatter.test.ts` to `src/tests/lib/features/properties/properties-cross-note.test.ts`, flip its assertions to the correct behavior (B unchanged, no write to B, panel shows B's properties), add a direct guard test (props of A, B active -> every mutator refuses) and a lifecycle guard test. Run: fails.
2. Store + service + lifecycle + view change. Update existing tests for the new required `sourcePath` / `path` arguments; add store getter test for `sourcePath`; tests for the path-scoped skip flag.
3. Run the properties test folder + `pnpm check`.

## Guard semantics (default taken)
Refuse, then re-parse: a commit whose properties came from another note is dropped (B never changes, no file write) and the store is re-parsed from the active tab, so the panel immediately shows B's own properties. Applying the user's edit to B instead would still write something the user did not intend for B.

## Prior-art tests
- `src/tests/lib/features/properties/properties.service.test.ts` (fake timers + `resetEditor`, writeTextFile mock).
- `src/tests/lib/features/properties/lifecycle.service.test.ts` (mocks `syncExternalContentToEditor` only).

## Risks
- `PropertiesView` effect is not component-tested (no component-testing library); the repro inlines the debounced branch as a helper, which is the worst case the service guards cover. The immediate-parse branch is only covered by `pnpm check`.
- Every caller of `setProperties` must now name the source path; `pnpm check` catches missed sites.
- Closing-commit cleanup (suspected-bugs item, repro folder) is left for deliver, as the Issue says.
