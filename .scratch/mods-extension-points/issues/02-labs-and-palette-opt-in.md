# 02: `ctx.labs`, opt-in palette rows and a lazy run view

**What to build:** the plan's EP-02, as changed by its section 12.

- **`ctx.labs`:** a per-mod unstable member beside `disposable` in the host, added to `HOST_UNSTABLE` in the contract test. Its first call is `ctx.labs.place(actionId, { palette: true }): () => void`. An unknown id throws. `ModContextV1` does not change.
- **Palette:** a new `plugins/mods/mod-commands.store.svelte.ts` lists every action as `{ id, label, run, palette }`, with `label` as `<Mod name>: <title>`. `app/commands.ts` appends only rows with `palette: true`, in category `Mod`. `features/command-palette` is untouched. Raw for mods: `ctx.app.modCommandsStore`.
- **Lazy run view:** for non-rail origins with no input, skip `showRun` before mod code. The first `log` or `progress` shows the run once, so Close stays closed on later lines. A second invoke shows the run. Rail origin and actions with `input` are unchanged.

Decided by the owner (plan section 12): opt-in through `place`; lazy reveal everywhere, accepting no Stop on a quiet run and a silently held reload.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`.

- [x] Failing tests first. Store: a row is gone after its disposer, unload and a failed `onload`; one row after reload. `place`: an unknown id throws, an unmarked action is not in the palette but stays in the store, and the disposer removes the mark.
- [x] Host: no `runKey` before the first log; the first log shows the run; closing it then logging again does not reopen it; a second invoke shows the run.
- [x] `src/tests/lib/app/commands.test.ts:515` stays green. A mounted palette test in `AppOverlays.test.ts` shows a late registration changes the list.
- [x] E2E: Cmd+P, type the title, Enter, assert the rendered result; an input action focuses its field.
- [x] `help/documentation/28-mods.md` documents `ctx.labs` as unstable, `place` and the lazy run view.

## Comments

- 2026-11-07, branch `issue/02-labs-and-palette-opt-in`: implemented unstable `ctx.labs.place`, opt-in reactive palette rows and lazy run reveal, with lifecycle coverage and documentation. Review round 1: APPROVED, no findings; no delivery fixes needed. Delivery full suite: 576 files passed, 13,904 tests passed, 54 skipped, 1 todo, 0 failures (`/Users/diegorv/Dev/pet-projects/koko/brain.worktrees/test-logs/mods-extension-points/02-deliver.log`). Review independently verified `pnpm check` (0 errors/warnings), 829 targeted tests and 12 E2E tests. Post-review source/test changes: none. Production bundling and native Tauri/WKWebView were not exercised.
