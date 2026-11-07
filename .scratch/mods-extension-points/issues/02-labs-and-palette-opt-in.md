# 02: `ctx.labs`, opt-in palette rows and a lazy run view

**What to build:** the plan's EP-02, as changed by its section 12.

- **`ctx.labs`:** a per-mod unstable member beside `disposable` in the host, added to `HOST_UNSTABLE` in the contract test. Its first call is `ctx.labs.place(actionId, { palette: true }): () => void`. An unknown id throws. `ModContextV1` does not change.
- **Palette:** a new `plugins/mods/mod-commands.store.svelte.ts` lists every action as `{ id, label, run, palette }`, with `label` as `<Mod name>: <title>`. `app/commands.ts` appends only rows with `palette: true`, in category `Mod`. `features/command-palette` is untouched. Raw for mods: `ctx.app.modCommandsStore`.
- **Lazy run view:** for non-rail origins with no input, skip `showRun` before mod code. The first `log` or `progress` shows the run once, so Close stays closed on later lines. A second invoke shows the run. Rail origin and actions with `input` are unchanged.

Decided by the owner (plan section 12): opt-in through `place`; lazy reveal everywhere, accepting no Stop on a quiet run and a silently held reload.

**Blocked by:** none

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`.

- [ ] Failing tests first. Store: a row is gone after its disposer, unload and a failed `onload`; one row after reload. `place`: an unknown id throws, an unmarked action is not in the palette but stays in the store, and the disposer removes the mark.
- [ ] Host: no `runKey` before the first log; the first log shows the run; closing it then logging again does not reopen it; a second invoke shows the run.
- [ ] `src/tests/lib/app/commands.test.ts:515` stays green. A mounted palette test in `AppOverlays.test.ts` shows a late registration changes the list.
- [ ] E2E: Cmd+P, type the title, Enter, assert the rendered result; an input action focuses its field.
- [ ] `help/documentation/28-mods.md` documents `ctx.labs` as unstable, `place` and the lazy run view.
