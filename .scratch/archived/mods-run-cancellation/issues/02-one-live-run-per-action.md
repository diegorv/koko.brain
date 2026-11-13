# 02: One live run per action across rail, palette and menus

**What to build:** A mod action has at most one live run, whatever starts it. Starting an action that is already running, from a rail button, the palette, a note menu, a folder menu or a raw command row, opens the existing run's view and runs nothing. Today the rail keys runs by button (`mod:<id>:<buttonId>`, `mods-host.service.ts:498-505`) while every non-rail entry point keys them by action (`mod:<id>:action:<actionId>`, `:145`). So one action runs twice at once when it is started from the rail and from the palette or a menu, or from two rail buttons that both list it (the trace test at `src/tests/lib/plugins/mods/mods-host-trace.service.test.ts:337` asserts the two-button case on purpose). Two Bulk Tag runs then rewrite the same notes' frontmatter and one loses the other's change; two Weekly Review runs race on creating the same report.

**Blocked by:** none

**Status:** resolved

## Acceptance criteria

- [x] Write failing tests first, through the real `startModsHost` / `runAction` path and the real `modsRunsStore` and `modPickerStore` (no mocked stores), asserting store state and that the action body executed exactly once.
- [x] Every entry point uses one run key per action: `mod:<id>:action:<actionId>`. Rail buttons no longer key runs by button id, so a button id can no longer collide with an action key.
- [x] Starting a live action from any entry point opens that run's view (`modPickerStore.showRun` with the run's own key), starts no second run and shows no toast. Covered in both directions: rail first then palette or menu, and palette or menu first then rail; and two rail buttons listing the same action.
- [x] A quiet non-rail run (lazy, never revealed) that is started again from the rail opens its view at that moment.
- [x] An action with `input` that is already live opens the run view instead of the text prompt. The busy check also runs when the input is submitted, so a run started elsewhere while the user was typing is revealed instead of starting a second one.
- [x] Different actions of one mod can run side by side, from different buttons or from the same button.
- [x] A rail button shows busy while any action it lists is live (a button without `actions` lists every action). Pressing a busy button whose picker resolves to a single action reveals that run. Pressing one with several actions opens its picker: choosing a live action reveals its run, choosing an idle one starts it.
- [x] The run target is not part of the key: a menu run on another note or folder still reveals the live run, as documented today.
- [x] When a run ends (done, failed, cancelled), the action can start again at once. Reload waiting for live runs and unload aborting them behave as today.
- [x] Trace records: a start that only reveals an existing run writes no `action-start`. `runId` stays unique per run. The trace test at `mods-host-trace.service.test.ts:337` is rewritten to expect the reveal.
- [x] `modsRunsStore` JSDoc and field names that say runs are keyed by rail button (`mods-runs.store.svelte.ts:23`, `:39`, `:64-81`) describe the per-action key.
- [x] `help/documentation/28-mods.md` states the rule in one place and drops the old ones: the separate-keys sentence (`:243`), "A button has one live run at a time; two buttons of a mod can run side by side" (`:268`), the menu and palette sentence (`:240`) and the run-ID paragraph (`:672`).

## Scope and constraints

Host only: `mods-host.service.ts`, `mods-runs.store.svelte.ts`, `mod-picker.store.svelte.ts` and the run view as needed, plus tests and docs. No contract change: `ModApiV1` says nothing about live runs. The matching one-line JSDoc in `@kokobrain/mod-core` is part of the mods-repo contract ticket (`kokobrain-mods-src`, `.scratch/run-ui/issues/01-run-ui-contract.md`).

Mods do not get a way to opt into parallel runs of one action. A mod that needs parallel work on different targets serializes it itself.

## Verification

Frontend gate: `pnpm check` and `pnpm vitest run`, plus the mods E2E suite through `bash scripts/e2e.sh`.

## Comments

- 2026-11-08: Rewritten after review. Decision: one live run per action, the second start reveals the existing run. Rejected: queueing per action (hides the race, holds reloads invisibly), refusing with a notice (a quiet run has no visible Stop), and leaving guards to each mod. Source: mods repository `.scratch/mods-review/report.md`, findings H8, bulk-tag-D3, inbox-triage-D2 (mods-review Issue 19, parked there as wontfix because it belongs to the host).
- 2026-11-08: Delivered from `issue/02-one-live-run-per-action`. Runs are keyed per action (`mod:<id>:action:<actionId>`) from every entry point; a second start reveals the live run's view and writes no `action-start`; a rail button is busy while any listed action is live; `buttonKey` renamed `runKey`; the mods guide states the rule in one place. Tests: full `pnpm vitest run` 579 files, 14027 passed, 54 skipped, exit 0. Review round 1: APPROVED (two optional nits, both rejected in the review's Resolution; the picker live-row mark is a possible follow-up).
