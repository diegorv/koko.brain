VERDICT: APPROVED

## Acceptance criteria

- [met] Write failing tests first for the real host-to-file path. Keep the host, settings and run stores, debug logger and buffered writer real; mock filesystem and external boundaries rather than replacing the logger with a spy. Assert persisted output alongside actual run state and computed getters. — `src/tests/lib/plugins/mods/mods-host-trace.service.test.ts:1-327` retains the real host, stores, logger and writer; `records()` flushes and parses filesystem bytes. Independent baseline probe ran its quiet-load and quiet-command cases against the pre-change host: both failed on missing persisted records after their real state assertions passed. The branch's complete 19-case trace suite passes.
- [met] An enabled quiet mod produces load-attempt and load-result evidence. Disabling, deleting or unloading it produces an unload event. A reload held by an active run records that it is waiting and records the replacement load when it actually occurs. Do not report superseded code as successfully loaded. — Host lines 542-545, 588-655 and 688-734 emit lifecycle records at the existing boundaries and retain generation/epoch guards. Passing trace tests cover quiet load, disable/delete/stop, busy reload ordering and superseded onload.
- [met] Every started host-managed action emits a start and exactly one terminal event with mod ID, action ID, session-local run ID, known invocation origin, outcome and elapsed duration. Identify the run within its session, not as a globally durable ID. — Host lines 284-298 capture the run identity and monotonic start time; lines 320-352 record cancellation, success or failure behind a per-run terminal guard. Trace tests compare complete records with actual run IDs and terminal state. Documentation lines 626-636 states the session-local scope.
- [met] Origins distinguish rail, note menu, folder menu and command entry points. Palette and programmatic invocation of the same command remain one command category; do not infer origin from a lazy-view flag or claim an unavailable distinction. — Host lines 171, 378, 437 and 474 carry explicit entry-point values separately from `lazy`; the four-origin trace test passes. Documentation line 638 explains the shared command category.
- [met] Quiet success, failure and cancellation are observable. Stop followed by late resolution or rejection does not emit a second terminal event or overwrite cancellation. Describe cancellation as the host run state, not proof that arbitrary JavaScript has stopped. — Passing trace cases cover quiet success, action failure, and both late resolution and rejection after Stop, including a replacement run. Host lines 291-298 guard terminal recording; the unchanged run store's `updateLive` rejects writes to ended runs. Documentation line 640 states the cancellation limit.
- [met] Concurrent runs retain separate identities. Invoking an already-busy key reveals its existing run without creating a false second start. A later run using that key receives a distinct run ID. — The concurrent trace case asserts two real busy keys and distinct IDs, reinvokes one key, checks the rendered-view store key and unchanged start count, then verifies independent outcomes. Replacement-run cases verify a new ID for the same key. Host lines 367-370 retain the pre-existing busy-key early return.
- [met] Automatic records contain only explicitly selected identifiers, host-generated event/outcome codes and timing. Do not copy action input, titles, note content, target paths, progress labels or raw error messages into these records. Encode mod-supplied identifiers as data so embedded newlines cannot forge extra events. — Every new `MOD-HOST` call serializes an explicit object with `JSON.stringify`; no mod object, error or input is spread into a record. The passing privacy case uses newline, carriage-return, quote and backslash characters in an action ID and verifies exact parsed records, while separately verifying real output/progress state. Error tests and E2E also check excluded text.
- [met] Disabling frontend file logging prevents these records from reaching the file. An absent log session remains a no-op. Use the existing buffering/flush behavior; do not introduce a database, network destination or crash-proof journal. — Passing disabled/no-session trace cases execute real successful actions and unload without persisted host records. Unchanged `debug.ts:17-23` gates file output and `log.service.ts:82-120` handles no-session, buffering and append writes. The E2E awaits a first flush before completing the run and checks later appended terminal records.
- [met] Preserve current caught-mod-error routing and existing user-facing failure feedback. New diagnostic records do not call the Sentry-reporting error helper. This does not promise to fix uncaught errors or all downstream app-service reporting. — Host diff preserves existing `debug`, run error, toast and unload-error paths; only `debug('MOD-HOST', ...)` is added. Passing failed-load/action tests verify actual store errors, original toast text and no Sentry capture. ADR-0036's caught-mod-error distinction remains intact and is documented at guide lines 642-644.
- [met] Cover empty discovery, failed load, quiet success, action failure, Stop with late settlement, concurrent runs, busy-key reinvocation, reload while busy, unload and logging disabled. Exercise at least one UI-triggered action and verify both rendered result and diagnostic output using the existing E2E harness. — All 19 trace cases pass and cover the named cases. `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts` independently passed all 15 tests; lines 342-407 assert rendered success, output/progress and cancellation alongside persisted trace identities and outcomes.
- [met] Document the event vocabulary, file-logging prerequisite, session-local identity and coverage limits in the mod documentation. — `help/documentation/28-mods.md:616-646` documents all six events, outcomes, settings, example JSON, origin categories, session-local IDs, host-only cancellation, privacy, detached-work exclusions and buffered/native-delivery limits. Documentation example tests also pass.

## Findings

None. No blocking correctness, scope or acceptance-criterion defect found in `git diff main...HEAD`.

## Independent verification

- `pnpm check`: exit 0, 226 files, zero errors and warnings.
- `pnpm vitest run src/tests/lib/plugins/mods src/tests/e2e/tauri-fs.test.ts src/tests/lib/utils/debug.test.ts src/tests/lib/utils/log.service.test.ts src/tests/lib/architecture/layer-rules.test.ts`: exit 0, 634 tests across 25 files.
- `pnpm vitest run src/tests/help/mods-example.test.ts src/tests/lib/app/LabsSection.test.ts src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`: exit 0, 101 tests across three files.
- `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`: exit 0, all 15 tests passed.
- Regression-sensitivity probe: a temporary Vite loader supplied the real pre-change host from `git show main:src/lib/plugins/mods/mods-host.service.ts` without editing application source. The new quiet-load and quiet-command tests each failed on empty persisted records, exit 1 as expected. Removed the temporary config, then reran the current complete trace file: exit 0, all 19 tests passed. The historical order of uncommitted edits is not independently recoverable from the grouped implementation commit; this probe independently verifies the claimed red/green distinction.
- `git diff --check main...HEAD` and the final working-tree diff check passed. Source, dependencies, Rust, watcher routing, store ownership and architecture baselines are unchanged except for the reviewed host instrumentation; the E2E mock change is limited to append semantics required by the real writer.
- `.scratch/mods-observability/spec.md` does not exist. Reviewed the issue, discovery record, ADR-0015, ADR-0036 and indexing/watcher invariants instead.

### Test files supporting the verdict

Under `src/tests/lib/plugins/mods/`:

- `ModActionPicker.test.ts`
- `ModDialogHost.test.ts`
- `ModsStatusList.test.ts`
- `mod-api-contract.test.ts`
- `mod-app.service.test.ts`
- `mod-commands.store.test.ts`
- `mod-dialogs.store.test.ts`
- `mod-note-saved.test.ts`
- `mod-picker.store.test.ts`
- `mod-rail-icon.test.ts`
- `mod-theme.test.ts`
- `mod-vault-paths.test.ts`
- `mod-vault.service.test.ts`
- `mod-watch.test.ts`
- `mods-enabled.logic.test.ts`
- `mods-enabled.store.test.ts`
- `mods-host-trace.service.test.ts`
- `mods-host.service.test.ts`
- `mods-runs.store.test.ts`
- `mods.logic.test.ts`
- `mods.store.test.ts`

Additional files:

- `src/tests/e2e/tauri-fs.test.ts`
- `src/tests/lib/utils/debug.test.ts`
- `src/tests/lib/utils/log.service.test.ts`
- `src/tests/lib/architecture/layer-rules.test.ts`
- `src/tests/help/mods-example.test.ts`
- `src/tests/lib/app/LabsSection.test.ts`
- `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`
- `e2e/specs/vault-mods.spec.ts`

## Verification limits

The full frontend suite belongs to deliver and was not run here. Native WKWebView session-file delivery remains unverified; browser filesystem assertions do not establish native filesystem or CSP behavior.
