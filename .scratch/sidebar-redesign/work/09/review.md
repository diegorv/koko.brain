VERDICT: APPROVED

## Acceptance criteria

- [met] Logic tests first for both lenses' rules and for Favorites' creation rule — `src/tests/lib/features/rail-shell/lens.logic.test.ts` adds `resolveLens - Favorites` (favorite and not archived, system folder excluded, newest first, empty snapshot), `resolveLens - Archive` (archived, favorites included, system folder excluded, empty snapshot) and `newNoteRule` cases (Favorites: Cmd+N folder + `{ _favorite: true }`, null without a vault; Archive: null even when a provider registers `archive`). The tests ship in the same commit as the rule (f0f55247). On main they cannot pass because `FAVORITES_LENS` / `ARCHIVE_LENS` are not exported there. I did not re-run them against main to see the red.
- [met] Favoriting or archiving a note from the action bar updates the open list without a restart — the list comes from `$derived` over `typeDefinitionsStore.entriesVersion` (`RailNoteList.svelte`). `vault-index-updated` -> `tauri-listeners.service.ts:149` `typeDefinitionsStore.setEntries` republishes that snapshot. `RailNoteList.test.ts` "lists a note as soon as the snapshot marks it favorite, and drops it when archived" and "drops a restored note from the Archive and shows the empty state" test this over the real store. I ran `bash scripts/e2e.sh e2e/specs/rail-shell.spec.ts` myself (7 passed). That run includes the two new tests, which click Add to favorites, Archive this note and Restore this archived note on the action bar.
- [met] Archive shows no New here button — `newNoteRule` returns null for `archive` (`lens.logic.ts` `BUILT_IN_NEW_NOTE` has no entry, and the built-in branch never falls through to a provider). Covered by `lens.logic.test.ts` "yields no rule for the Archive, whatever a provider says", by `RailNoteList.test.ts` "is hidden in the Archive, even with archived notes listed" and by the E2E `New here` toHaveCount(0).
- [met] The rail order matches the PRD (Favorites after Inbox; Archive pinned to the bottom) — `Rail.svelte` `items` = Inbox, Favorites, and `bottomItems` = Archive inside a `mt-auto` group in the flex-col `<nav>`. That matches PRD § Rail for the items that exist so far (Search, Today, Types, Calendar and Files are other tickets). `Rail.test.ts` asserts the order and the bottom group. The E2E asserts Archive's real y is more than 100 px below Favorites.
- [met] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter — the component tests use the real `typeDefinitionsStore`, `railRegistryStore`, `vaultStore` and the real `lens.logic.ts`. Only Tauri, the side-effect services and the log are mocked. Assertions check rendered rows, labels, rules and the empty state. Empty cases: empty snapshot for both lenses, and no vault -> null rule. The shared New here error path stays covered (`RailNoteList.test.ts:415`). The branch adds no store getter.
- [met] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme — the new items render through the same `railButton` snippet and the same `file-explorer-*` / `bg-background` classes as the existing Inbox item. `Rail.test.ts` "styles every item with the region tokens" checks for no hex or rgb values. Nobody has checked each built-in theme by eye. The only new markup is a wrapper div with no color classes.

## Checks run (by this review)

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/rail-shell src/tests/lib/core/layout src/tests/lib/features/type-definitions/inbox-workflow.logic.test.ts`: exit 0, 10 files, 156 tests passed. The test verdict rests on `lens.logic.test.ts`, `Rail.test.ts`, `RailNoteList.test.ts`, `new-note.service.test.ts`, `rail-registry.store.test.ts`, `rail-shell.boundary.test.ts`, the three `core/layout` tests (AppShell's lens wiring) and `inbox-workflow.logic.test.ts`.
- `bash scripts/e2e.sh e2e/specs/rail-shell.spec.ts`: exit 0, 7 passed.
- I did not run the full suite or `pnpm build`. Deliver runs them.
- The worktree is clean after the runs.

## Findings

1. minor — `src/lib/features/rail-shell/lens.logic.ts:50` — `italic: !entry.organized` came from the Inbox-only lens, and it now applies to Favorites and Archive too. In Archive, an archived note with `_organized: false` shows in italics, and so does a not-organized type definition in Favorites. Neither is an Inbox note. PRD § Lenses says "Inbox notes show in italics", and the `LensNote.italic` JSDoc says "Inbox notes (not organized)". discovery.md records this as a chosen default. Fix: either set `italic: isInboxEntry(entry)` and add an Archive test (archived + `organized: false` -> not italic), or keep the current behavior with the owner's OK and change the `LensNote.italic` JSDoc to "not organized".
2. nit — `src/lib/features/rail-shell/lens.logic.ts:90` — `BUILT_IN_NEW_NOTE` is a second map keyed by the same kinds as `BUILT_IN_LENSES` (line 61), so the two must stay in sync by hand. Fix: add an optional `newNote?: NewNoteRule['frontmatter']` field to `BuiltInLens` and drop the second map. `newNoteRule` then reads `builtIn.newNote` after one lookup.

## Notes (not findings)

- The E2E mock (`e2e/mocks/vault-index.ts`) now sets `archived` / `favorite` the way `extract_bool_flag` (`src-tauri/src/vault/entry.rs:367`) does: only a boolean `true` counts. It still does not copy Rust's default for a missing `_organized`. That gap was already there and is outside this Issue.
- No scope creep: the branch touches only rail-shell files, their tests, the E2E spec and the mock. The classic shell is unchanged.

## Resolution

1. Fixed. `toLensNote` sets `italic: isInboxEntry(entry)`, so only Inbox notes are italic in every lens, as PRD § Lenses says. New tests in `lens.logic.test.ts`: an archived note that is not organized is not italic, and a favorite type definition is not italic. The `LensNote.italic` JSDoc now names the full Inbox rule.
2. Fixed. `BuiltInLens` has an optional `newNote` frontmatter field; `BUILT_IN_NEW_NOTE` is gone and `newNoteRule` reads `builtIn.newNote` after the one lookup. Archive has no `newNote`, so it still yields no rule.
