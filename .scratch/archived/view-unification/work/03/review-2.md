VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `type-definitions.service.ts:409` takes the tab branch only when `updated !== tab.savedContent`; otherwise the no-tab write (`:429`, `create: false`) runs and `syncExternalContentToEditor(path, updated, true, 'none')` (`:436`) leaves the tab clean on the result. Test "writes the file when a clean tab already holds the result but disk differs" (`rewrite-view-file.service.test.ts:301`) asserts disk, tab content and `savedContent`. It fails against the pre-fix source (probe below). |
| 2 | minor | resolved | `:422` redoes the turn on the file when the tab is gone after a successful save; the redo stays inside the current queued turn, so serialization holds. Test "writes the file when the tab closes before its queued save runs" (`:314`) drives the queued-save-then-close order and asserts `_rail: true` on disk; it fails against the pre-fix source. The redo relies on each transform being idempotent; by reading, pin, icon, colors, list properties, `updateCollectionYaml` and `updateViewEditYaml` all set values rather than toggle (see new finding 1 for the contract). |
| 3 | nit | resolved | The tab-content line is gone from `RailNoteList.view.test.ts:446-451`; it held whatever the writer did because `syncExternalContentToEditor` is mocked there. The toast and row assertions remain, and the revert stays covered in `rewrite-view-file.service.test.ts`. Not a weakened test. |
| 4 | nit | resolved | Comment above the `appendLog` mock (`rewrite-view-file.service.test.ts:22-23`). |
| 5 | nit | resolved | `VIEW_WRITE_MESSAGES['vault-changed']` (`type-definitions.service.ts:295`) reads "the vault changed, so the view may not have been saved". No test asserted the old text (searched `src/` and `e2e/`); the other two `vault-changed` messages belong to other services and are untouched. |

## Acceptance criteria

- [met] Failing tests first, with real stores and only `plugin-fs` and `invoke` mocked: — The two new tests use the same real editor/vault stores and the same three mocks (`plugin-fs`, `invoke`, the `appendLog` Tauri stand-in now commented). Probe: with `type-definitions.service.ts` checked out from `f3878f47b`, both new tests fail on assertions (2 failed, 13 passed); source restored, clean `git status`.
- [met] No `.view` writer calls `writeTextFile` except through `rewriteViewFile`. `raw-write-ratchet.test.ts` keeps one site, with its reason string updated. — The fix adds no write site: the only `.view` `writeTextFile` is still `:429` inside `rewriteViewFileNow`; the redo calls `rewriteViewFileNow` itself. `raw-write-ratchet.test.ts` passes.
- [met] An open tab shows the result immediately. — Dirty-or-different tabs still sync before the save (`:412`); the new clean-tab-equal case already holds the result and gets marked saved by `:436`; test `:301` asserts the tab content.
- [met] The doc comment no longer implies a `.view` write always skips the after-save observers. — JSDoc `:336-343` keeps "The tab save runs the full after-save path (`notifyAfterSave`)" and names the clean-tab-equal case as taking the file path.

## Findings

1. nit — `src/lib/features/type-definitions/type-definitions.service.ts:346-347`: the JSDoc says `transform` "must be pure: it runs a second time when a tab opens during the existence check", but the redo at `:422` also runs it on its own output, which needs idempotence (`transform(transform(x)) === transform(x)`), not only purity. Fix: add "and idempotent: a tab closed before its save ran gets the rewrite redone on the file".
2. nit — `type-definitions.service.ts:406-408` and `:340`: the condition at `:409` also sends a dirty tab whose transform gives back its `savedContent` down the file path, but the comment says "A clean tab"; behaviour is fine (file written, tab marked clean by `:436`), only the wording is narrower than the code. Line `:340` is also wrapped past the block's width. Fix: "A tab whose saved bytes already equal the result" and rewrap.

## Checks run by this review

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/features/type-definitions src/tests/lib/features/rail-shell src/tests/lib/core/editor src/tests/lib/raw-write-ratchet.test.ts`: exit 0, 56 files, 1719 tests passed. Covers both test files the fixes change and the tests of the changed service.
- Probe against the pre-fix service (`f3878f47b`): the two new tests fail; source restored.
- Full suite and `pnpm build` are deliver's to run. No `src-tauri/` change, no layer-baseline change, no scope creep: the fix commit touches only the service, its two test files and the review file.
