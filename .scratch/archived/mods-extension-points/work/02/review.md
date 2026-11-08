VERDICT: APPROVED

## Acceptance criteria

- [met] Failing tests first. Store: a row is gone after its disposer, unload and a failed `onload`; one row after reload. `place`: an unknown id throws, an unmarked action is not in the palette but stays in the store, and the disposer removes the mark. — `mod-commands.store.test.ts:8-75`, `mods-host.service.test.ts:368-409` and `commands.test.ts:115-131` pass independently and assert real state. Discovery's Build evidence records the initial failing runs; their historical order cannot be reconstructed from commits that contain both tests and implementation.
- [met] Host: no `runKey` before the first log; the first log shows the run; closing it then logging again does not reopen it; a second invoke shows the run. — `mods-host.service.test.ts:429-461` passes for both log and progress, Close, and a second invocation without a second execution. The host tracks reveal state per run at `mods-host.service.ts:223-265` and reveals a busy run at `:290-293`.
- [met] `src/tests/lib/app/commands.test.ts:515` stays green. A mounted palette test in `AppOverlays.test.ts` shows a late registration changes the list. — The existing rail-button exclusion test, now at `commands.test.ts:539-546`, passes. `AppOverlays.test.ts:66-106` mounts the real overlays and verifies an already-open palette gains the placed row and loses it on unplace or unregister.
- [met] E2E: Cmd+P, type the title, Enter, assert the rendered result; an input action focuses its field. — Independently ran `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`: all 12 tests pass. The tests at `:136-181` verify unmarked-action exclusion, palette invocation, rendered log/progress/completion, input focus, and the created note's rendered content.
- [met] `help/documentation/28-mods.md` documents `ctx.labs` as unstable, `place` and the lazy run view. — `:198-246` documents the unstable contract boundary, opt-in placement and disposal, raw rows, first-output reveal, second invocation, Close, input/rail behavior, and the accepted focus/reload tradeoffs.

## Findings

None. No blocker, major, minor or nit findings.

## Standards review

The registry uses raw reactive state and identity-owned cleanup. Tests use real stores and the real host; the mounted test exercises the existing composition-root-to-palette reactive chain. Every changed application source file has corresponding test changes. No architecture baseline, composition root, dependency, contract-v1 source, core source or command-palette component changes appear in `git diff main...HEAD`.

The E2E filesystem adapter's `stat` export is a narrow prerequisite for running the required browser coverage: the mod vault adapter imports it, the browser alias previously lacked it, and the branch adds four direct file-kind/missing-path checks. This is justified test infrastructure, not an unrelated production filesystem change.

## Specification review

Reviewed against the Issue, plan sections EP-02, 11 and 12, and ADR-0036. Every action gets the required namespaced raw row, while `app/commands.ts:374-379` includes only marked rows in category Mod. `ctx.labs` is per-context and listed in `HOST_UNSTABLE`, with no change to `ModContextV1`. Unload and failed-onload cleanup reach the registered command disposers; reload removes the old registration before registering its successor.

The lazy path preserves immediate rail/input behavior, records output before revealing, ignores late output for ended runs, and retains one reveal decision across Close and second invocation. The dedicated tests also exercise delayed output replacing another input picker and a quiet run holding reload until completion.

Accepted design limitations are not findings: delayed output may take focus, a quiet run has no visible Stop or reload indicator, and rail/non-rail invocations normally use different keys. The possible collision with a rail-button id `action:<x>` is explicitly acknowledged without changing the design in plan section 11; it is not a newly discovered implementation deviation.

## Independent verification

All commands ran at the Issue worktree root. Each command returned exit status 0; results were not inferred from the build report.

- `pnpm check`: 0 errors, 0 warnings.
- Targeted Vitest: 829 tests passed across 40 files, in three invocations. Exact selections follow.
- `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`: 12 passed.
- `git diff --check`: passed.

First selection: `pnpm vitest run src/tests/lib/plugins/mods src/tests/lib/app/commands.test.ts src/tests/lib/app/AppOverlays.test.ts src/tests/e2e/tauri-fs.test.ts src/tests/lib/architecture` (639 tests, 32 files):

```text
src/tests/e2e/tauri-fs.test.ts
src/tests/lib/app/AppOverlays.test.ts
src/tests/lib/app/commands.test.ts
src/tests/lib/plugins/mods/ModActionPicker.test.ts
src/tests/lib/plugins/mods/ModDialogHost.test.ts
src/tests/lib/plugins/mods/ModsStatusList.test.ts
src/tests/lib/plugins/mods/mod-api-contract.test.ts
src/tests/lib/plugins/mods/mod-app.service.test.ts
src/tests/lib/plugins/mods/mod-commands.store.test.ts
src/tests/lib/plugins/mods/mod-dialogs.store.test.ts
src/tests/lib/plugins/mods/mod-note-saved.test.ts
src/tests/lib/plugins/mods/mod-picker.store.test.ts
src/tests/lib/plugins/mods/mod-rail-icon.test.ts
src/tests/lib/plugins/mods/mod-theme.test.ts
src/tests/lib/plugins/mods/mod-vault-paths.test.ts
src/tests/lib/plugins/mods/mod-vault.service.test.ts
src/tests/lib/plugins/mods/mod-watch.test.ts
src/tests/lib/plugins/mods/mods-enabled.logic.test.ts
src/tests/lib/plugins/mods/mods-enabled.store.test.ts
src/tests/lib/plugins/mods/mods-host.service.test.ts
src/tests/lib/plugins/mods/mods-runs.store.test.ts
src/tests/lib/plugins/mods/mods.logic.test.ts
src/tests/lib/plugins/mods/mods.store.test.ts
src/tests/lib/architecture/event-listen.test.ts
src/tests/lib/architecture/feature-cycle.test.ts
src/tests/lib/architecture/fs-capabilities.test.ts
src/tests/lib/architecture/import-graph.test.ts
src/tests/lib/architecture/ipc-mirrors.test.ts
src/tests/lib/architecture/layer-rules.test.ts
src/tests/lib/architecture/markdown-editor-imports.test.ts
src/tests/lib/architecture/pure-logic.test.ts
src/tests/lib/architecture/raw-invoke.test.ts
```

Second selection (101 tests, 3 files):

```text
src/tests/lib/app/LabsSection.test.ts
src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts
src/tests/help/mods-example.test.ts
```

Third selection (89 tests, 5 files), using `pnpm vitest run src/tests/lib/app/commands.new-commands.test.ts src/tests/lib/app/global-keybindings.test.ts src/tests/lib/features/command-palette`:

```text
src/tests/lib/app/commands.new-commands.test.ts
src/tests/lib/app/global-keybindings.test.ts
src/tests/lib/features/command-palette/CommandPalette.test.ts
src/tests/lib/features/command-palette/command-palette.logic.test.ts
src/tests/lib/features/command-palette/command-palette.store.test.ts
```

## Verification limits

The full suite belongs to deliver and was not run. Production bundling and the native Tauri/WKWebView runtime were not exercised; the browser acceptance run uses Chromium and mocked Tauri boundaries. Historical test-first ordering is supported by the versioned discovery record, not independently observed during this review.
