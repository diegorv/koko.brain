# 01: Trace host-managed mod execution in the local session log

**What to build:** With frontend file logging enabled, a user can determine whether a mod loaded, whether a host-managed action started, and how that run ended, even when the mod produces no output. Record a small execution trace through the existing local debug logger without changing action behavior or requiring changes to individual mods.

**Blocked by:** none

**Status:** resolved

## Acceptance criteria

- [x] Write failing tests first for the real host-to-file path. Keep the host, settings and run stores, debug logger and buffered writer real; mock filesystem and external boundaries rather than replacing the logger with a spy. Assert persisted output alongside actual run state and computed getters.
- [x] An enabled quiet mod produces load-attempt and load-result evidence. Disabling, deleting or unloading it produces an unload event. A reload held by an active run records that it is waiting and records the replacement load when it actually occurs. Do not report superseded code as successfully loaded.
- [x] Every started host-managed action emits a start and exactly one terminal event with mod ID, action ID, session-local run ID, known invocation origin, outcome and elapsed duration. Identify the run within its session, not as a globally durable ID.
- [x] Origins distinguish rail, note menu, folder menu and command entry points. Palette and programmatic invocation of the same command remain one command category; do not infer origin from a lazy-view flag or claim an unavailable distinction.
- [x] Quiet success, failure and cancellation are observable. Stop followed by late resolution or rejection does not emit a second terminal event or overwrite cancellation. Describe cancellation as the host run state, not proof that arbitrary JavaScript has stopped.
- [x] Concurrent runs retain separate identities. Invoking an already-busy key reveals its existing run without creating a false second start. A later run using that key receives a distinct run ID.
- [x] Automatic records contain only explicitly selected identifiers, host-generated event/outcome codes and timing. Do not copy action input, titles, note content, target paths, progress labels or raw error messages into these records. Encode mod-supplied identifiers as data so embedded newlines cannot forge extra events.
- [x] Disabling frontend file logging prevents these records from reaching the file. An absent log session remains a no-op. Use the existing buffering/flush behavior; do not introduce a database, network destination or crash-proof journal.
- [x] Preserve current caught-mod-error routing and existing user-facing failure feedback. New diagnostic records do not call the Sentry-reporting error helper. This does not promise to fix uncaught errors or all downstream app-service reporting.
- [x] Cover empty discovery, failed load, quiet success, action failure, Stop with late settlement, concurrent runs, busy-key reinvocation, reload while busy, unload and logging disabled. Exercise at least one UI-triggered action and verify both rendered result and diagnostic output using the existing E2E harness.
- [x] Document the event vocabulary, file-logging prerequisite, session-local identity and coverage limits in the mod documentation.

## Scope and constraints

- Extend the host's existing execution path. Do not add a global current-run variable, instrument every progress call, intercept raw registries, or change reload scheduling, watcher routing or cancellation semantics.
- Direct raw-registry callbacks, mod-owned DOM listeners/timers and other work outside the host action wrapper are not automatically action runs. Do not claim coverage of all mod activity.
- Keep stores responsible for reactive state; put persistence orchestration in the host/service boundary.
- Follow ADR-0036's trust and error-routing policy and the indexing/watcher invariants when tracing reloads. No Rust, IPC, dependency or logger rewrite is planned.
- Inbox Triage's reported sequence is motivation, not a reproduced bug. A successful run does not prove that its note contents or intended business outcome are correct.

## Verification

Frontend gate: `pnpm check` and `pnpm vitest run`, plus the existing mods E2E suite through the repository's E2E wrapper. Native session-file delivery still needs a desktop check; browser mocks alone do not prove WKWebView behavior.

## Comments

- 2026-11-07, `issue/01-host-execution-trace`: Added privacy-scoped host lifecycle and action records through the existing buffered logger, explicit invocation origins, regression coverage and documentation. Review round 1: APPROVED, no findings or delivery fixes. Delivery full suite: 577 files passed, 13,956 tests passed, 54 skipped, 1 todo, zero failures (exit 0); log: `/Users/diegorv/Dev/pet-projects/koko/brain.worktrees/test-logs/mods-observability/01-deliver.log`. Review verification also passed typecheck (zero errors/warnings), 735 targeted tests and all 15 mods E2E tests. `after-review` returned `[]`. Native WKWebView session-file delivery remains unverified.
