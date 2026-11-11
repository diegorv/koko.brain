# Item 6, contract side: visible mod callback errors

Scout report. Paths: `M:` = `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`, `B:` = `/Users/diegorv/Dev/pet-projects/koko/brain`. Nothing was run or edited besides this file.

## Verdict

Item 6 needs NO contract change. No type, member, signature or runtime helper in `M:packages/mod-core` has to change, so `apiVersion` stays `1` and the host does not have to adopt a new `@kokobrain/mod-core` SHA for this item alone.

Evidence:

1. The feature is host-internal. What it adds is a "last callback error and time" on the Labs row and a once-per-session toast. The Labs row is the host's `ModStatusEntry` (`B:src/lib/plugins/mods/mods.store.svelte.ts:11-19`: `state`, `error?: { message; stack? }`, `loadMs?`) rendered by `B:src/lib/plugins/mods/ModsStatusList.svelte:54-71`. Neither type is in the contract. The contract file "imports nothing" and holds only what a mod sees (`M:packages/mod-core/src/contract/mod-api.v1.ts:7-9`).
2. The mod does not need to learn anything new. Every callback registration keeps its shape and the mod's callback is still called the same way. The error never flows back to mod code: the host already catches it at the call site and decides where to send it. The call sites that today swallow into `debug()` only:
   - `ctx.watch`, in `B:src/lib/plugins/mods/mod-watch.svelte.ts:21-23` and `:38-40` (`watch read failed:` and `watch callback failed:`), called from `B:src/lib/plugins/mods/mods-host.service.ts:~512` (`watchModValue(tag, read, onChange)`).
   - `ctx.theme.onChange`, `B:src/lib/plugins/mods/mods-host.service.ts:315-320` (`theme.onChange callback failed:`).
   - `ctx.onNoteSaved`, `B:src/lib/plugins/mods/mods-host.service.ts:570-584` (`report` writes `onNoteSaved callback failed:`; covers both a sync throw and a rejected promise).
   Call sites that already toast and are out of scope for the swallow gap: an action's `run` (`B:.../mods-host.service.ts:417-423`, `toast.error(... failed ...)` plus `modsRunsStore.fail`), `onunload`/cleanup (`reportUnloadError`, `:609-613`, toast), load errors (`recordLoadError`, `:646-659`, Labs row plus a toast deduped per vault and folder).
3. Compatibility rule: even if a type were wanted, a new member is additive and needs no bump (`M:.../contract/mod-api.v1.ts:15-18`). It is simply not needed here.
4. `ctx.labs` is an unstable host member outside the contract (`M:packages/mod-core/src/unstable/context.ts:20`, `B:src/lib/plugins/mods/mods-host.service.ts:38` and `:149`). It only does `place`. Putting error state on it would add nothing a mod can use, and a mod reading its own last error is not part of the request.

## Contract text that becomes incomplete (comment only, optional)

Three JSDoc sentences in `M:packages/mod-core/src/contract/mod-api.v1.ts` say a callback failure "goes to the debug log":

- `:309-312` `ModThemeV1.onChange`: "A throwing callback goes to the debug log."
- `:351-354` `ctx.watch`: "Both failures go to the mod's debug log."
- `:357-362` `ctx.onNoteSaved`: "Callback failures go to the mod's debug log."

After item 6 these stay true (the host should keep the `debug()` line) but are no longer the whole story: the failure also shows on the mod's Labs row and as a one-time toast. Options:

- A. Leave them. They are not wrong. Smallest change, no contract commit, no SHA bump caused by this item. Recommended.
- B. Reword to "is logged to the mod's debug log and shown on its Labs row". This is a comment-only edit in the mods repo; it forces a new full-SHA adoption in the host (steps below) only if no other item ships a contract commit. Items 1, 2, 4 and 5 do change the contract, so if any of them lands first or together, bundle this rewording into that commit at no extra adoption cost. Do not make a separate contract commit just for it.
- Coordination with item 2: it already rewrites the `onNoteSaved` signature and doc (`:357-362`). If the wording is changed, do it in that same edit to avoid a conflict. Item 5's new events will need the same sentence in their JSDoc; reuse whichever wording is chosen.

Do not describe the toast or Labs behavior in more detail than that in the contract: it is host UI that may change, and the contract header says the contract constrains the host rather than following it (`:1-4`).

## Other `M:packages/mod-core` pieces: no change

- `src/testing/fake-ctx.ts`: `watch`, `onNoteSaved` and `theme.onChange` are all `notModelled(...)` (`:236`, `:237`, `:300`), so the fake has no error routing to update. `labs` in the fake only implements `place` validation (`:238-245`). A mod's own tests that call a callback run it directly and see its throw; nothing to add.
- `src/notes/editor.ts` (`editNote`), `src/errors/index.ts`, `src/markdown`, `src/paths`, `src/dates`: unrelated to callback error routing.
- Mods and examples in the workspace: the only users of the three callbacks are `M:examples/note-save-reaction.ts:5` and `M:examples/theme-aware-ui.ts:12` (and `docs/examples.md:51`). Neither catches and toasts its own error, so no double toast appears. No example or doc in the mods repo states what happens to a callback error beyond the contract JSDoc above (grep for "debug log", "callback fail", "swallow" over `packages docs examples test scripts README.md CLAUDE.md` finds only `mod-api.v1.ts:311,340,352,358`). Nothing else to edit there.

## Mods repo checks and tests that pin the contract (all unaffected by "no change")

- `package.json` scripts: `typecheck` (`tsc -p tsconfig.json`), `test` (`vitest run --exclude "test/host-integration/**"`), `test:host`, `check` = typecheck + `node scripts/check-bundle.mjs` + test + test:host, `verify` (build + check, needs `KOKOBRAIN_HOST_ROOT`), `check:package <consumer>` (`scripts/check-core-package.mjs`: installed `.ts` contract resolution, private-export rejection, `tsc` plus a bundled run of `test/fixtures/package-consumer/main.ts`).
- Contract-pinning there: `test/workspace.test.ts:11-16` (each mod resolves `@kokobrain/mod-core/contract`), `test/fixtures/package-consumer/main.ts` (type and negative `@ts-expect-error` checks on `ModContextV1`). Neither lists callback error behavior, so a comment-only edit (option B) keeps all green and a no-change keeps them untouched.
- Host side pin: `B:src/tests/lib/plugins/mods/mod-api-contract.test.ts` freezes the key sets of `ctx`, `vault`, `ui`, `theme`, etc. (e.g. `:231`, `:245`, `:268`). It compares host keys to contract keys, so item 6 adds no key and the test is unchanged. It does NOT assert error routing, so it would not catch a regression in the new behavior; the host behavior tests belong to the host-side scout (`mods-host.service.test.ts`, `mod-note-saved.test.ts`, `mod-watch.test.ts`, `mod-theme.test.ts`, `ModsStatusList.test.ts` under `B:src/tests/lib/plugins/mods/`).

## Host adoption (only if option B is shipped, alone or bundled)

Per `B:docs/MOD-CORE.md` ("Updating the dependency") and `M:docs/architecture.md` ("Host adoption"):

1. In the mods repo: edit, run `pnpm check`, commit, push to `diegorv/koko.brain-mods`.
2. Build an independent consumer (`mktemp -d`, copy `test/fixtures/package-consumer/{main.ts,tsconfig.json}`, `pnpm --dir "$consumer" add "@kokobrain/mod-core@github:diegorv/koko.brain-mods#<sha>&path:/packages/mod-core"`) and run `pnpm check:package "$consumer"`.
3. In Kokobrain: `pnpm add -D '@kokobrain/mod-core@github:diegorv/koko.brain-mods#<full-sha>&path:/packages/mod-core'` (current pin: `B:package.json:81`, `#328ca55f6add4d18e3c5b1490feee66ce8503b5e`). Inspect `pnpm-lock.yaml` for repo, commit and path, no credentials or workspace links.
4. `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm vitest run`, `pnpm build` (package.json and lockfile changed, so `pnpm build` is required by the project's gate).
5. In the mods repo, `pnpm verify` with `KOKOBRAIN_HOST_ROOT` pointing at the host checkout.

Git read access to the private repo is needed (SSH rewrite recipe in `B:docs/MOD-CORE.md`).

## Summary for the orchestrator

- Contract change: none required. Host-only: Labs row field(s) on `ModStatusEntry`, recording in the three swallow sites above, a once-per-session toast, docs.
- Host docs that state "goes to the debug log" and will need a wording update (host task): `B:help/documentation/mods/13-api-reference.md:105-107`, `B:help/documentation/28-mods.md:167,179,462`, `B:help/documentation/mods/14-cookbook.md:2135` ("Errors in a save callback never reach the user on their own"), plus `B:help/documentation/mods/15-errors-and-debugging.md` and `01-anatomy-and-loading.md:441-447` (Labs row semantics). Also `13-api-reference.md:105,107` note that a rejected promise from `watch` `onChange` / `theme.onChange` is not caught: if the host starts catching those, that is behavior the docs must state; still no contract change (the contract only says sync failures at `:352`, and says nothing about rejections for `watch` and `theme.onChange`).
- Not verified: the exact line of the `watchModValue` call in `mods-host.service.ts` (shown as `~512`); and I did not read the Labs row component tests or check how the host decides "once per session" (host-side scout).
