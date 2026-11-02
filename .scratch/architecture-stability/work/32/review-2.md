VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `registerQueryjsBlockPorts` is now in `src/lib/plugins/queryjs/queryjs-ports.ts:13-21`, body identical to the removed one (`git diff ac2e0ace..HEAD`). `queryjs-block-widget.ts` no longer imports `editor.service` or `note-change.service`. `boot.ts:13` is the only importer. `boot.test` still covers both ports through `registerAppPorts` (queryjs cache cleared on save / watcher / restore, autoRun marker dropped on tab close and delete, lines 223-266), and it passes. Relative specifiers without extension match the rest of `plugins/queryjs/`. |
| 2 | nit | resolved | `editor.service.ts:22-26` JSDoc now states only the contract (which closes notify, throwing listener logged, returns unregister). No plugin is named. |
| 3 | nit | rejection stands | Round 1 marked it "Fix: none needed"; reworking the import order would only add another unrelated diff. |

## Acceptance criteria re-checked

- [met] `core/markdown-editor/**/*.ts` has zero imports of #lib/features or #lib/plugins (the `.svelte` shells are handled by issue 22) — the fixes touch only `plugins/queryjs`, `app/boot.ts`, `core/editor/editor.service.ts` (JSDoc) and two test mocks; `markdown-editor-imports.test.ts` passes in my run.
- [met] The existing queryjs widget tests (policy matrix, manual mode never marks autoRun, cache re-attach) pass after the move with only specifier changes — the fix removes only the ports function and its two imports from the widget module; `src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts` is untouched by the fix commits and passes.
- [met] `layer-baseline.json` and `featureCycleEdges` (issues 04-05) shrink by exactly the edges this issue removes, in the same commit — the fix commits do not touch `layer-baseline.json` or `BASELINE_SIZE`; the new `queryjs-ports.ts` imports only `core/` (allowed for `plugins/`), and `layer-rules.test.ts` / `feature-cycle.test.ts` pass.

## Findings

No open or new findings.

Notes on the second fix commit ("test: stub registerTabCloseListener in the editor.service mocks"): `fs.service.test.ts` and `deep-link.service.test.ts` mock `#lib/core/editor/editor.service.js` with factories that lacked `registerTabCloseListener`, which `registerAppPorts` calls via `registerQueryjsBlockPorts` since 0fe49bd0. The added `vi.fn(() => () => {})` stub returns a valid unregister function and changes no assertion; no test is weakened or skipped. Both files pass.

## Checks run by the reviewer

- `pnpm check`: exit 0, 212 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/app src/tests/lib/plugins/queryjs src/tests/lib/core/editor src/tests/lib/core/filesystem/fs.service.test.ts src/tests/lib/features/deep-link src/tests/lib/architecture src/tests/lib/core/markdown-editor`: exit 0, 148 files, 3025 passed, 1 skipped, 1 todo.
- Not run: full `pnpm vitest run`, `pnpm build`, E2E; those are deliver's.
