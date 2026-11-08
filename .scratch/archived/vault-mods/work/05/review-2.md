VERDICT: APPROVED

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | minor: `ctx.workspace.openNote` on a missing path resolves, and the failure goes to `openFileInEditor`'s toast and Sentry | resolved | `mod-vault.service.ts:114-134` calls `exists(abs)` before `openFileInEditor` and throws `"<path>" does not exist` when it is false. A failing `exists` is logged through `debug` and rethrown, and `assertLive()` runs again after the await. `exists`, `debug` and `modId` are all in scope (imports at lines 1 and 11; `modId` is destructured from `ModVaultScope`). The contract doc at `contract/mod-api.v1.ts:111` says it rejects. Test `mod-vault.service.test.ts:240-244` asserts the rejection message and `editorStore.tabs` equal to `[]`. Before the fix, `openFileInEditor` caught the read error and resolved, so `rejects` would have failed. The existing "openNote opens" test still passes because the fs mock's `exists` reports the seeded file. |
| 2 | nit: Enter during IME composition submits the field | resolved | `ModActionPicker.svelte:27` returns early on `e.isComposing`. Test `ModActionPicker.test.ts:145-155` dispatches Enter with `isComposing: true` and asserts that the picker stays open, the field stays, and `__modEvents` stays empty after a tick. Before the fix, the handler would have closed the picker. `TemplatePicker.svelte` is outside this Issue, so leaving it alone is correct. |

Ratchet entry (`raw-write-ratchet.test.ts:49`): acceptable. The test's own doc says a new raw write site "fails here until it is listed, and its reason is the review point". The single `writeTextFile(` site is `mod-vault.service.ts:103` (`{ create: false }`). It is followed by `syncExternalContentToEditor` and `notifyAfterSave(abs, content)` at line 108, so the reason "notifyAfterSave follows" is true. The ratchet is not weakened: one file and one reason are added, and the count and reason assertions are unchanged. This is not `layer-baseline.json`, which is unchanged, and `BASELINE_SIZE` is not raised.

## Acceptance criteria re-checked

- [met] Failing tests first: — the fixes add one test to `mod-vault.service.test.ts` and one to `ModActionPicker.test.ts`. Both target behavior the old code got wrong, and both pass. No test was deleted or weakened: the `press` helper only gained an optional `isComposing` argument that defaults to `false`. The full suite is deliver's to run.
- [met] `layer-rules.test.ts` reports no new violation. — `src/tests/lib/architecture/` passes, `layer-baseline.json` and `BASELINE_SIZE` are unchanged by the fixes, and the fixes add no import edge (`exists` and `debug` were already imported).

## Findings

1. nit, `src/lib/plugins/mods/mod-vault.service.ts:125`: `exists` is also true for a folder, so `ctx.workspace.openNote('Ideas')` still reaches `openFileInEditor`, its generic toast and its Sentry report. A mod has little reason to open a folder. Fix (optional): reject a path whose `exists` is true but whose `readTextFile` would fail, or say in Issue 07's docs that `openNote` expects a file.

## Checks run by the reviewer

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/plugins/mods/ src/tests/lib/raw-write-ratchet.test.ts src/tests/lib/architecture/`: exit 0, 21 files, 262 tests.
- Not run: the full suite and `pnpm build` (deliver's job), and the E2E spec. The E2E flow opens a note it has just created, so the new `exists` check returns true on that path.
