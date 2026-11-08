VERDICT: APPROVED

## Acceptance criteria

- [met] Write failing tests through real facade/store/component transitions and the existing local writer. Keep stores and pure logic real, mock external boundaries, and assert both the public result or real state and the serialized diagnostic output. — `src/tests/lib/plugins/mods/ModDialogDiagnostics.test.ts:4-44,67-461` keeps the facade, stores, component, debug helper and writer real, mocks external boundaries, and asserts public results, rendered content and serialized records. Its event assertions fail against the original implementation, which emits none of these records. Discovery records the build's red/green sequence; that historical sequence was not independently replayed.
- [met] With frontend file logging enabled and a session active, record queued, opened and terminal events for supported alert, confirm, prompt, pick and loading dialogs. Use mod identity, session-local dialog ID, dialog kind, host-generated outcome/reason codes and timing. A queued dialog cancelled before display must not appear as opened. — Store lines 43-99 record fixed lifecycle metadata, monotonic IDs and elapsed timing; component lines 56-60 mark the actual opening callback. Diagnostic tests at 119-168,272-345,444-460 cover all five kinds, queued cancellation and exact timing.
- [met] Capture terminal reasons at the originating transition: acknowledgement/submission, cancellation through buttons or dismissal, mod unload and reset. Preserve distinctions that the host actually knows; do not reconstruct the cause from null, false or undefined alone. Emit exactly one terminal dialog event. — Component handlers supply button/Escape reasons; store answer/dismiss/closeForMod/reset supply explicit transition reasons and delete the resolver before recording settlement. Diagnostic tests at 97-117,272-289,324-345 verify reason codes and duplicate-settlement suppression.
- [met] An empty submitted prompt is a submission, not cancellation. A picker with no items or no matches remains open until a real terminal action. Closing one mod's dialogs does not misattribute or close another mod's queued dialogs. — Diagnostic tests at 119-143,292-322,444-460 assert pending picker promises, rendered empty states, original picked-object identity, empty prompt submission and isolation between two mods.
- [met] Loading events distinguish dialog closure and cancellation request from task success/failure. The task starts when the facade currently starts it, including while queued; its existing promise still follows the task. A task settling after cancellation must not create another terminal dialog event or imply that cancellation stopped its JavaScript. — `mods-host.service.ts:240-265` preserves immediate task invocation and its returned/rejected value while recording task outcome separately; store settlement supplies cancellationRequested. Diagnostic tests at 145-222,390-427 verify queued start, late success/failure, cancellation and unload without a duplicate terminal event.
- [met] Do not attach a run or action ID by selecting the latest/current active run. The existing shared ctx.ui facade is mod-scoped. Run attribution remains unavailable unless a separate explicit contract is approved; this ticket adds no such contract. — New records contain no run/action lookup or fields. Diagnostic test at 347-366 starts overlapping runs, cancels one, verifies the dialog remains pending and asserts neither runId nor actionId is serialized.
- [met] A ctx.notify call emits only a notification-request event with mod identity and the validated notification kind. Do not claim that the notification was displayed, read, dismissed or acknowledged. — `mods-host.service.ts:391-400` snapshots and validates kind before recording notification-request. Diagnostic tests at 243-270 verify validated fallback, changing getters, encoded identity and no notification-content record.
- [met] Invalid dialog requests produce a content-free rejection diagnostic where the host handles validation, without changing the public rejection. Calls after unload retain their existing failure behavior. — `mods-host.service.ts:182-193,225-241` uses fixed rejection codes and preserves public error messages. Diagnostic tests at 224-241 cover each validation code; 390-442 cover real unload and failures before validation/notification.
- [met] Negative privacy tests seed unique content in dialog titles/messages, prompt values/results, picker query and item IDs/titles/descriptions/extra fields, notification text and thrown errors. None of that content appears in the new automatic metadata records. Encode selected identifiers as data; arbitrary mod-supplied text is not inherently safe metadata. — Diagnostic fixtures seed distinct PRIVATE_* values across these categories and inspect serialized filesystem writes, including task errors/results and picker extra fields. Tests at 243-270 also verify newline/quote-bearing mod identity remains JSON data and a changing kind getter cannot inject unvalidated content.
- [met] Cover submit, button cancellation, Escape/ordinary dismissal, queued cancellation, unload, reset, repeated settlement, loading completion/failure/cancellation and invalid input. Assert rendered outcomes and that pending promises retain their existing result semantics. — All 31 diagnostic cases passed, alongside the existing ModDialogHost, mod-dialogs.store and mods-host.service suites. The diagnostic suite asserts actual text/field values, promise results or pending state, and serialized transitions for these paths.
- [met] File logging off produces no new file records. New events stay local and do not use the Sentry-reporting error helper. Reuse the existing logger without changing its global semantics. — Only debug is used for new records; debug.ts and log.service.ts are unchanged. Diagnostic tests at 368-388 exercise logging-off and no-session behavior; every case's teardown asserts captureSentryException was not called.
- [met] Document supported events, content exclusions and absent run linkage. Explain that a notification request is not acknowledgement and that a closed loading dialog is not proof of task termination. — `help/documentation/28-mods.md:394-415` documents all six events, fixed reason vocabulary, timing, exclusions, no inferred run linkage, notification-request limits and cooperative loading cancellation. The unload paragraph also correctly distinguishes task promises from dialog closure.

## Findings

### Standards

1. minor, `src/lib/plugins/mods/mod-dialogs.store.svelte.ts:43-48`: Lifecycle mutations now call `debug()`, which reads settings and can enqueue filesystem writes or write to the console. This introduces side-effect orchestration into the store, contrary to `CLAUDE.md` Architecture Guidelines and `docs/adr/0004-file-type-separation.md` Decision (stores hold reactive state only; services orchestrate side effects). Fix: keep transition metadata and exactly-once settlement in the state layer, but emit the diagnostics from the host/dialog service boundary. Preserve originating reasons, event order, queued-cancellation behavior and the current real-writer tests. This is a nonblocking architectural finding, not an observed public-result or privacy failure.

### Spec

No missing acceptance behavior, unauthorized run attribution, privacy leak or scope expansion found in the reviewed diff.

## Independent verification

Reviewed `git diff main...HEAD` for branch commits `1c072a24b1a9bc6dedcbcd13ba690a4ac622ec52` and `1e89124a27095795794959b469e5182288ec8dc5`, including the workflow discovery record. No feature spec.md exists; Issue 03 and ADR-0015/ADR-0036 provide the relevant contract. The architecture baseline and composition roots are unchanged.

- `pnpm check`: exit 0, 226 files checked, zero errors and zero warnings.
- Targeted Vitest command below: exit 0, 28 files and 743 tests passed. This includes all 31 new diagnostics cases.
- `git diff --check`: exit 0.
- No application source or tests were modified during review.

```sh
pnpm vitest run src/tests/lib/plugins/mods src/tests/lib/app/LabsSection.test.ts src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts src/tests/lib/app/AppOverlays.test.ts src/tests/help/mods-example.test.ts src/tests/lib/utils/debug.test.ts src/tests/lib/utils/log.service.test.ts src/tests/lib/architecture/layer-rules.test.ts
```

The test verdict rests on these files:

```text
src/tests/lib/plugins/mods/ModDialogDiagnostics.test.ts
src/tests/lib/plugins/mods/ModDialogHost.test.ts
src/tests/lib/plugins/mods/mod-dialogs.store.test.ts
src/tests/lib/plugins/mods/mods-host.service.test.ts
src/tests/lib/plugins/mods/mods-runs.store.test.ts
src/tests/lib/plugins/mods/ModsStatusList.test.ts
src/tests/lib/plugins/mods/mod-commands.store.test.ts
src/tests/lib/plugins/mods/mods.store.test.ts
src/tests/lib/plugins/mods/mod-theme.test.ts
src/tests/lib/plugins/mods/mod-picker.store.test.ts
src/tests/lib/plugins/mods/mods-enabled.logic.test.ts
src/tests/lib/plugins/mods/mod-vault-paths.test.ts
src/tests/lib/plugins/mods/mod-vault.service.test.ts
src/tests/lib/plugins/mods/mod-rail-icon.test.ts
src/tests/lib/plugins/mods/mod-watch.test.ts
src/tests/lib/plugins/mods/mods.logic.test.ts
src/tests/lib/plugins/mods/mod-note-saved.test.ts
src/tests/lib/plugins/mods/mod-app.service.test.ts
src/tests/lib/plugins/mods/ModActionPicker.test.ts
src/tests/lib/plugins/mods/mods-enabled.store.test.ts
src/tests/lib/plugins/mods/mod-api-contract.test.ts
src/tests/lib/app/LabsSection.test.ts
src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts
src/tests/lib/app/AppOverlays.test.ts
src/tests/help/mods-example.test.ts
src/tests/lib/utils/debug.test.ts
src/tests/lib/utils/log.service.test.ts
src/tests/lib/architecture/layer-rules.test.ts
```

## Resolution

- Accepted the round 1 minor standards finding. The store now exposes content-free transition metadata through an optional per-dialog callback; the owning host service emits `debug()` records and derives loading cancellation metadata. The store no longer imports the logger. Resolver deletion, queue updates, originating reasons, synchronous event order and result resolution are unchanged.
- Added a real-writer regression proving direct state-only dialogs do not emit diagnostics. Before the change it failed with three unexpected records (31 existing cases passed); after the change all 32 diagnostic cases pass, including host-originated lifecycle, privacy, loading and exactly-once cases.
- Targeted verification: `pnpm check` passed (226 files, zero errors/warnings); 24 Vitest files and 639 tests passed; `git diff --check` passed. Full-suite verification follows in deliver.

## Verification limits

The full unit suite belongs to deliver and was not run. Mods E2E, production bundling and native-app behavior were not verified in this review; browser dismissal/focus behavior is covered here by jsdom component tests, not a native webview run.
