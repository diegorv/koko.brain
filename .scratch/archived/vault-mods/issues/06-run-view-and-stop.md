# 06: Long runs: progress, log, Stop, and a busy rail button

**What to build:** actions that take minutes (HTTP, agents) need a visible home and a real cancel (PRD P7). Today every picker closes before it awaits (`src/lib/plugins/one-on-one/OneOnOnePicker.svelte`), and no progress or cancel UI exists in the app (V2).

- **`run` argument.** `action.run(input, run)` gets `run = { signal, log(text), progress(done, total, label?) }`. `signal` aborts on Stop, on mod unload (Labs toggle off, mod folder deleted) and on vault teardown. **Not on reload (PRD P10):** a reload requested while the mod has a live run waits until its runs end, then loads the newest code once. Editing a mod in Kokobrain reloads it on every 2 s autosave (`src/lib/core/editor/editor.service.ts:227`), which must not kill a paid agent run. While a reload waits, the run view says "Reload pending".
- **Run view.** After picking (and the input step), the picker dialog switches to a run view: the action title, the progress bar and label, the log (cap the kept lines, for example the last 500), and **Stop** and **Close**. Close hides the view; the run continues. On the end it shows done, failed (message plus stack in a `<details>`) or cancelled. A failure also raises the Issue 03 toast.
- **Busy rail button.** While a run of a button's actions is live, the button shows a busy mark (`busy: () => boolean` on `RailAction`, Issue 03, read in render from the runs store; the registry lists are `$state.raw`, so mutating an entry would not re-render), and a click reopens that run's view instead of the picker. One live run per button in the MVP; picking while one runs is not offered.
- **Teardown.** `teardownVault` aborts every live run (next to `queryjsSessionStore.reset()`, `src/lib/app/lifecycle/app-lifecycle.service.ts:622`); mod unload aborts that mod's runs. Mod code must check `run.signal.aborted` between steps; the docs say so (Issue 07).
- A run store in `src/lib/plugins/mods/mods-runs.store.svelte.ts`. Add the members to the contract and its freeze test.

**Blocked by:** 04

The run view follows 05's input step and 04's reload, whose wait-for-live-runs rule (P10) it adds; all of them edit the host.

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`.

- [x] Failing tests first:
  - Run store: start, progress, log cap, done, failed, cancelled; computed getters each tested.
  - Host: Stop aborts `run.signal` and the run ends `cancelled`; a reload batch during a live run does not abort it, and the mod reloads once with the newest code after the run ends; turning the Labs toggle off aborts the run; `teardownVault` aborts all runs and a `ctx.vault.create` attempted after it throws and writes nothing.
  - Component: the run view shows progress and log lines; Close keeps the run in the store; clicking the busy button reopens it.
  - E2E: an action that logs, waits on a promise the spec resolves, and ends; assert the log text, then a second run stopped with Stop shows "Cancelled".

## Notes

- A synchronous loop cannot be stopped (PRD P4). Stop works for `await`-based code only.
- Not in the MVP (PRD: the MVP is Issues 01 to 05).
- **Size:** M.

## Comments

- 2026-11-06, branch issue/06-run-view-and-stop: run view with progress, log and Stop, plus a busy rail button; fix round made Stop and Close keyboard-operable, moved focus into the run view and made the log follow new lines. Full suite at fbab80116: vitest 564 files, 13370 passed, 1 skipped, 1 todo, 0 failed; pnpm build succeeded. Reviews: round 1 APPROVED, round 2 APPROVED (two nits on ModActionPicker: Tab blocked by handleRunKeydown, followLog not reset between runs; not fixed, ship only).
