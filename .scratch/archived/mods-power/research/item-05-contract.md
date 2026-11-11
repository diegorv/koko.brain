# Item 5, contract side: note create / move / rename events for mods

Scout report. Paths: `M:` = `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`, `B:` = `/Users/diegorv/Dev/pet-projects/koko/brain`. Nothing was run or edited besides this file. Host internals are only cited where the contract shape depends on them; the host scout owns the rest.

## Verdict

Item 5 needs a contract change, unless the owner chooses to ship it as `labs` (unstable). In both cases the mods repo needs a commit and the host needs a new SHA, because the `ctx` type a mod compiles against (`ModContextV1` for stable, `ModCtx.labs` for unstable) lives in the mods repo.

Why a mod cannot do this today, with no new member:

- `ctx.onNoteSaved` is the only note event (`M:packages/mod-core/src/contract/mod-api.v1.ts:362`). The host feeds it from `addAfterSaveObserver` (`B:src/lib/plugins/mods/mods-host.service.ts:566-591`), the after-save pipeline. The docs say it "does not subscribe to external filesystem edits or to note creation" (`B:help/documentation/28-mods.md:173`), and `ctx.vault.create` "does not run" the after-save steps (`B:help/documentation/28-mods.md:313`; `create` goes through `create_note` + index, `B:src/lib/plugins/mods/mod-vault.service.ts:95-110`).
- Rename and move never reach a save observer: `renameItem`/`moveItem` call `applyPathChange` (`B:src/lib/core/filesystem/fs.service.ts:285,313`, import at line 8), whose only fan-out is `PathChangeConsumer.pathChanged(from, to)` (`B:src/lib/core/filesystem/path-change.service.ts:176-182`).
- `RawApp` exposes no path-change registry, no fs store and no create hook (`M:packages/mod-core/src/unstable/raw.ts:49-92`; `B:src/lib/plugins/mods/mod-app.service.ts` is the host side, listed in `MOD_APP`). `ctx.watch` can poll an observable only if one is in `RawApp`, and none covers paths. So a mod would have to use the raw `editorStore.tabs` as a rough proxy, which misses closed notes.

## Where to put it: stable or labs

Two shapes. Both need `M:` changes; they differ in the freeze test and in the promise.

A. Stable, additive members of `ModContextV1` (recommended). The header rule says a new `ModContextV1` member is additive and needs no `apiVersion` bump (`M:.../mod-api.v1.ts:15-18`). It sits next to `onNoteSaved`, which is the same kind of subscription (callback in, disposer out, unload unsubscribes). Cost: forever promise, and the host freeze test fails until the host implements it (see "Tests that pin the contract").

B. `labs` (unstable). Add the members to `ModCtx.labs` in `M:packages/mod-core/src/unstable/context.ts:23-26` and to the host's hand-typed `ModContext.labs` (`B:src/lib/plugins/mods/mods-host.service.ts:38-51`). The contract file, `CONTEXT_PUBLIC` and the contract test do not change. The existing mods that need host power already use `ctx.labs` (`M:mods/tasks/src/index.ts`, `M:mods/inbox-triage/src/index.ts`, `M:mods/playground/src/index.ts`, `M:mods/weekly-review/src/index.ts`). This answers "no contract change" only in the sense of the stable file; `M:` still changes and the SHA still moves. Whether `M:` `ModCtx.labs` and the host `ModContext.labs` are cross-checked by a test: not verified (the host contract test checks `HOST_UNSTABLE = ['app','kb','labs']` by key only, `B:src/tests/lib/plugins/mods/mod-api-contract.test.ts:~60`).

Recommendation: A, with the payload shapes below, because a mod reacting to creates and moves is as basic as reacting to saves, and the cost of getting the shape wrong is bounded by using object payloads that can grow. If the owner wants to learn from real use first, B costs one move later (declare it stable, keep the labs alias for one release).

## Proposed contract additions (stable option)

All in `M:packages/mod-core/src/contract/mod-api.v1.ts`, function-typed properties (header rule 1, lines 8-10), no imports.

1. `ModNoteCreatedV1`: `{ path: string }` (vault-relative). Object, not a bare string like `onNoteSaved`, so a later field (for example `own: boolean` for item 2) is additive. `onNoteSaved` passes a bare string (`:362`), which is why item 2 has to add an options argument and cannot add a field to the payload; this avoids repeating that.
2. `ModNoteMovedV1`: `{ from: string; to: string }` (vault-relative). One event covers rename and move, because the host has one entry point for both: `PathChangeConsumer.pathChanged(from, to)` (`B:path-change.service.ts:48`). A rename is a move within the same parent; a mod can tell by comparing parents. Do not add separate `onNoteRenamed`: it would need the host to classify, and the owner asked for "onNoteMoved/renamed" as one thing.
3. Members of `ModContextV1`, next to `onNoteSaved`:
   - `onNoteCreated: (callback: (event: ModNoteCreatedV1) => void) => () => void`
   - `onNoteMoved: (callback: (event: ModNoteMovedV1) => void) => () => void`
   Doc points to carry over from `onNoteSaved` (`:356-362`): reported in a later timer after synchronous observers; callback failures go to the mod's debug log; returns a disposer, unload also unsubscribes and cancels pending callbacks.
4. Decisions the doc comment must state, all dependent on the host scout:
   - Folder moves: `PathChangeConsumer` is called once for the folder, and children are not enumerated ("A folder change arrives once, for the folder", `B:path-change.service.ts:42-47`). `PathChange.isDirectory` is optional and not passed to consumers (`:28`, `:48`). So the contract cannot say `isFolder` unless the host adds it. Options: (a) document "a folder move reports the folder once; a path under `from + '/'` moved to `to + '/'`" and add no field; (b) host expands to children (a 1000-note folder fires 1000 callbacks). (a) is simpler and matches the registry. Either way `ModNoteMovedV1` stays `{ from, to }`.
   - Deletes: out of item 5 (`to: null`). The host consumer receives them (`:178`) so the host must ignore them. Say so in the doc comment ("not called for deletes") to avoid a silent future change.
   - Non-Markdown files: `onNoteSaved` also fires for canvases and `.view` files (`B:help/documentation/mods/14-cookbook.md:2134`). State whether `onNoteCreated`/`onNoteMoved` filter to notes. Mods repo already filters by `/\.md$/i` in `M:examples/note-save-reaction.ts:6`; recommend reporting all paths and leaving the filter to the mod, as `onNoteSaved` does.
   - Own writes: `ctx.vault.rename` and `move` go through `renameItem`/`moveItem` (`B:mod-vault.service.ts:56-70`), so a mod that renames in its handler triggers itself. The header of `onNoteSaved` already warns "Writing again with vault.write can loop" (`:361`). Copy the warning; if item 2 lands first, mirror its `ignoreOwnWrites` option in the new subscribers (an options argument is additive). Do not specify it here before item 2 is decided.
   - Creators: `ctx.vault.create` (`B:mod-vault.service.ts:95`) and the note creators (`B:src/lib/core/note-creator`, not read) are separate paths; the contract text must say which of them fire `onNoteCreated`. The doc cannot promise "every created note" until the host scout lists the creators.
5. `apiVersion` stays `1` (`:331`). No existing member changes. Header (`:1-18`) needs no edit.

## Changes elsewhere in `M:packages/mod-core`

- `M:packages/mod-core/src/testing/fake-ctx.ts`: the returned object is typed by `ModCtx`, so `pnpm typecheck` fails until the new members exist. Add `onNoteCreated: notModelled('onNoteCreated')` and `onNoteMoved: notModelled('onNoteMoved')` next to `onNoteSaved: notModelled('onNoteSaved')` (`fake-ctx.ts:237`). `notModelled` throws `fakeCtx: <name> is not modelled` (`:155-157`).
  - `fake.vault.rename` and `move` are also `notModelled` (`:260-261`), so the fake cannot produce a move event on its own. Keep both unmodelled; a test that needs the event overrides the member, exactly as `M:test/examples-save.test.ts:9-12` does for `onNoteSaved` (it assigns `ctx.onNoteSaved` and emits to the registered handlers). This is consistent with the fake's stated scope. A real model (a subscription list and `emit` helpers on `FakeCtx`) is optional and not recommended: the mods repo has no mod using any of these events yet (`grep onNoteSaved M:mods` finds nothing; `M:packages M:examples M:docs M:test` only the lines cited here).
  - `B:help/documentation/mods/12-types-build-and-test.md:477,570` list what the fake does not model and print the fake's source (`onNoteSaved: notModelled('onNoteSaved')` at line 570); host-side docs, listed so the host scout does not miss them.
- `M:packages/mod-core/src/unstable/index.ts`: `ModCtx extends ModContextV1` (`unstable/context.ts:22`), so stable members flow in with no edit. Only option B would edit `context.ts` (`labs` type).
- `src/notes/editor.ts` (`editNote`), `markdown`, `errors`, `paths`: no change; none touches events.
- Docs and examples in `M:` (optional, none required to keep the repo green):
  - `M:docs/examples.md:47-53` ("Read-only note-save reaction") documents `observeSavedNotes` and the save-loop caveat. A sibling example for created/moved notes is optional: it needs a source in `M:examples/`, a test in `M:test/examples-*.test.ts` (override on `fakeCtx`, as above) and a section in `docs/examples.md`. Not recommended unless the owner wants a recipe.
  - `M:README.md`, `M:packages/mod-core/README.md`, `M:docs/mods-catalog.md`: no mention of `onNoteSaved` (grep found none), so no edit.

## Tests that pin the contract

- Mods repo: no test freezes the contract keys. `M:test/fixtures/package-consumer/main.ts:35-44` (`publicContract`) holds only negative `@ts-expect-error` lines for `app`, `kb`, `labs` and a bad `vault.write` argument. For option A an optional positive/negative line (for example `context.onNoteMoved(() => {})`, or a `@ts-expect-error` for a callback with wrong payload) is cheap, not required. For option B the existing `@ts-expect-error` on `context.labs` already covers it.
- Host freeze: `B:src/tests/lib/plugins/mods/mod-api-contract.test.ts`.
  - `CONTEXT_PUBLIC` is `satisfies Record<keyof ModContextV1, true>` (lines 46-63). After the host adopts the new SHA, `pnpm check` fails with the missing keys `onNoteCreated`, `onNoteMoved`, and `B:...:231` (`Object.keys(makeContext())` equals `CONTEXT_PUBLIC` plus `HOST_UNSTABLE`) fails until `createModContext` returns them. The host change must add both keys and the implementation in the same commit as the SHA bump.
  - Payload types have no frozen-key list yet. Style of the file: `*_PUBLIC` objects with `satisfies Record<keyof X, true>` plus a `Object.keys(...)` assertion (see lines 257-262). Add `NOTE_CREATED_PUBLIC`, `NOTE_MOVED_PUBLIC` the same way; add the two types to the import list at the top of that test.
  - Option B: `HOST_UNSTABLE` is not affected (`labs` already listed).
- Mods-side tests to add for option A: nothing for the types themselves (a `type` only change); a unit test that `fakeCtx().onNoteMoved` throws `fakeCtx: onNoteMoved is not modelled`, in `M:packages/mod-core/test/testing/fake-ctx.test.ts` (the file already tests the fake's other rules; the head shows `describe` blocks for the picker, placements and unload).
- `M:test/host-integration/*` (`fake-ctx-rules.test.ts`, etc.) compares fake rules with host rules; nothing models events, so no change.
- `M:test/bundles.test.ts` loads each built mod's `onload` and compares its registrations to `M:test/registrations.baseline.json` (actions and rail buttons only, as seen in the baseline's shape). No mod calls the new members, so the baseline and the bundles test are unaffected. When a mod starts to subscribe, whether the test's ctx stub handles an unknown member: not verified (file not read in full).

## Mods repo checks (`M:package.json` scripts)

- `pnpm typecheck` = `tsc -p tsconfig.json`: catches the missing members in the `fakeCtx` literal.
- `pnpm test` = `vitest run --exclude "test/host-integration/**"`. `pnpm test:unit` also excludes `test/bundles.test.ts`. `pnpm test:host` = `vitest run test/host-integration`.
- `pnpm check` = typecheck + `node scripts/check-bundle.mjs` + test + test:host. `pnpm verify` = build into a temp dir then `check` (`M:package.json` scripts; `KOKOBRAIN_HOST_ROOT` must point to the host checkout).
- `pnpm check:package <consumer>` (`M:scripts/check-core-package.mjs`) validates the installed package from an independent consumer.

## What the host must adopt (`B:docs/MOD-CORE.md`, "Updating the dependency")

1. Commit the contract change in the mods repo and push to `diegorv/koko.brain-mods` (the host pins a full SHA).
2. Install into an independent temporary consumer and run `pnpm check:package <consumer>`.
3. In the host: `pnpm add -D '@kokobrain/mod-core@github:diegorv/koko.brain-mods#<full-sha>&path:/packages/mod-core'`. Current pin: `328ca55f6add4d18e3c5b1490feee66ce8503b5e` (`B:package.json:81`).
4. Inspect `pnpm-lock.yaml`: repository, commit and path must match; no credentials, workspace links or personal paths.
5. Run `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm vitest run` and `pnpm build` (package.json and lockfile changed, so `pnpm build` is mandatory under `B:CLAUDE.md` rule 6). Then the mods workspace `pnpm verify` with `KOKOBRAIN_HOST_ROOT` set.
6. `B:src/lib/plugins/mods/contract/mod-api.v1.ts` is `export type * from '@kokobrain/mod-core/contract'`, so new types flow through without an edit.
7. The host code that must land in the same host commit as the bump (host scout covers detail): implement the two members in `createModContext` (next to `onNoteSaved`, `mods-host.service.ts:566`), a `registerPathChangeConsumer` registration with vault-lifetime cleanup (`B:path-change.service.ts:73`), the creation hook, the `CONTEXT_PUBLIC` keys and payload frozen lists, host tests, and docs (`B:help/documentation/28-mods.md:171-176`, `mods/07-events-and-reactivity.md`, `mods/15-errors-and-debugging.md:19,102,247` for the `onNoteMoved needs a callback function` message and the log line, `mods/01-anatomy-and-loading.md:284,300` for the cleanup and unloaded-ctx lists, ADR 0036 if it lists the contract).

Ordering: mods-repo commit (contract + fake) first, host adoption second. A mod that calls `ctx.onNoteMoved` on an older host throws `not a function`; `apiVersion` stays 1, so there is no manifest gate. Not a concern until a mod uses it.

## Risks and open points

- Stable commits the shape forever. Mitigation: object payloads; option B first if the folder-move and creator questions stay open.
- The contract text depends on three host facts not settled here: whether children of a moved folder are enumerated, which creators fire `onNoteCreated`, and whether `ignoreOwnWrites` (item 2) is reused. Settle them with the host scout before writing the doc comments.
- Callback timing: copy `onNoteSaved`'s `setTimeout(0)` rule (`mods-host.service.ts:575-583`). The path consumer runs synchronously and before `updateLinksAfterRename` awaits (`B:path-change.service.ts:174-182`), so at callback time the link rewrite and the tree move may not have finished: the contract must not promise that `ctx.vault.read(to)` sees rewritten links. Worth a doc line.
- No mod in `M:mods` consumes these events yet, so no regression surface in bundles; the value is for future mods and Auto Organize-style tools.
