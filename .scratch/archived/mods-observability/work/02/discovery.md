# Issue 02 discovery

## Scope and evidence
- Feature spec.md is absent. Issue 02, ADR-0015 and ADR-0036 define the scope.
- Prior art: `.scratch/mods-observability/work/01/`; retain its real-host/buffered-writer tests and session-file plus session-local runId convention. Only opted-in message records differ.
- `src/lib/plugins/mods/mods-host.service.ts:284-355`: run closure owns identity and writes start/log/progress/finish/fail/cancel to modsRunsStore. Check current id/status before persisting accepted text; retain reveal behavior.
- `src/lib/plugins/mods/mods-runs.store.svelte.ts:45-51,60-74,87-89,135-138`: accepted output requires a running stored id; runs/runFor/isBusy derive from runs. Keep this reactive-only store unchanged.
- `src/lib/plugins/mods/ModActionPicker.svelte:27,124`: renders runFor and reload state; host busy callbacks read isBusy. Picker showRun writes the view key; closing never cancels a run.
- `src/lib/core/settings/settings.types.ts:393-396`, `settings.store.svelte.ts:135,178,337`: add default-false setting, getter and setter. Setter writes settings; settings getter feeds autosave at `settings-persistence.svelte.ts:33,54`.
- `src/lib/core/settings/settings.service.ts:168-173,269-272`: strict `=== true` parsing and existing whole-object serialization cover missing/invalid values and round-trip.
- `src/lib/core/settings/sections/TroubleshootingSection.svelte:35-52`: add separately named opt-in switch and sensitivity warning; `src/lib/app/SettingsPanel.svelte:16,87` mounts it.
- `src/lib/utils/debug.ts:17-23`, `log.service.ts:82-120,238-242`: use existing debug/file gate, active-session no-op, JSON encoding and best-effort buffered writes. No writer changes.

## Smallest implementation plan
1. Add a failing real-host integration case to `src/tests/lib/plugins/mods/mods-host-trace.service.test.ts`, inspecting flushed bytes and real run/picker state. Implement per-run ordered JSON message records under both switches.
2. Test and implement persisted opt-in, strict loading and Troubleshooting control. Extend integration cases for concurrency, late calls, empty/multiline content, capped view, reset/replacement, toggling and writer failure. This is one end-to-end behavior commit after targeted gates.
3. Add rendered browser coverage in existing Settings/mods specs and update `help/documentation/19-settings.md` and `28-mods.md`; verify affected E2E specs through `scripts/e2e.sh`, then commit.

## Tests, defaults and risks
- Copy Issue 01's FS-map/real logger integration fixture; no store, logic or debug mocks. Settings service/store and Troubleshooting component tests provide prior art.
- Use event `run-message` with captured mod/action/run/origin identity, ISO timestamp, per-run sequence and text, under MOD-HOST. Session identity remains the containing file, not a new global ID.
- Sequence counts accepted messages, including unsaved ones: toggles can leave gaps and never replay prior text. Do not attribute ctx.log to a run.
- Existing last-500 UI cap, lazy reveal, cancellation and writer failure behavior stay unchanged. Raw content stays out of Sentry.
- No new retention: existing session files stay on disk until removed. Warn about secrets, inspecting before sharing, no deletion on opt-out, and non-crash-proof buffering.
- Browser FS mocks prove serialization and UI wiring, not native WKWebView delivery. Full frontend suite belongs to deliver, not build.
