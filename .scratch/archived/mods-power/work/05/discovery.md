# Issue 05 discovery: `ctx.onNoteMoved`

No `spec.md` in `.scratch/mods-power/`; the Issue is the spec. Same bump-plus-code pattern as `work/04` (one commit for SHA + code, docs after); only the differences are listed.

## Precondition checked

- Mods Issue 04 Comments record `dcf4a40de6aa877bb33a8633dab755d21acc1101`, a commit in the mods checkout.
- `git diff a94a107..dcf4a40 -- packages/mod-core/src/contract` adds only `ModNoteMovedV1` and `ModContextV1.onNoteMoved`.

## Files that change

- `package.json:81`, `pnpm-lock.yaml`: pin to `dcf4a40...` (MOD-CORE.md step 3), inspect the lockfile.
- `src/lib/core/filesystem/path-change.service.ts:38-49` optional `settled`; `:67-72` third lifetime; after `:233-235` the `settled` fan-out when `to !== null`.
- `src/lib/plugins/mods/mods-host.service.ts:593-622`: `onNoteMoved` after `onNoteSaved`, importing `registerPathChangeConsumer`; `:134` JSDoc lists it.
- `src/lib/plugins/mods/mods.store.svelte.ts:25` union gains `'onNoteMoved'`.
- Tests: new `src/tests/lib/plugins/mods/mod-note-moved.test.ts`; `fs.service.test.ts:1296-1385`; `mod-api-contract.test.ts:53,88-91,257`; `mods-types.test.ts:25-47,89`; `mods-example.test.ts:46`.
- `help/examples/mods/kokobrain-mod.d.ts:398,456-463`.
- Docs: `28-mods.md`, `mods/07`, `13`, `15`, `12`, `README.md`.

## Plan

1. Commit A: `fs.service.test.ts` `settled` cases red, then the core `settled` step.
2. Commit B: `mod-note-moved.test.ts` red (`onNoteMoved` not a function), then SHA bump + host member + store union + contract/types/example tests + `.d.ts`, so `pnpm check` is green at the commit.
3. Commit C: docs.

## Prior-art tests

- `mod-vault-paths.test.ts:1-80` (in-memory disk, real fs services, `createModContext` with a `ModRuntime`); the invoke mock answers `get_backlinks_v2` with `['Other.md']`-shaped results, checked against `link-updater.service.ts`.
- `mod-note-saved.test.ts` (fake timers, callback errors, toast once, disposal/unload/vault switch). The new file uses `startModsHost` for the unload and toast cases, as there.

## Risks and defaults

- Fake timers plus async disk mocks: `await renameItem(...)` completes `applyPathChange` fully before `settled` returns, so only the `setTimeout(0)` is pending; `vi.advanceTimersByTimeAsync(0)` drains it.
- `settled` runs after `forgetNote` loop; `forgetNote` is fire-and-forget, so the Rust removals may still be in flight. Accepted: the Issue places it there.
- Toast shared: one toast per load across `onNoteSaved` and `onNoteMoved`, by the existing per-ctx `toasted` flag.
- Out of the build gate: `pnpm build`, full suite, the mods workspace `check:package` / `verify` belong to deliver.
