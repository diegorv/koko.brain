# Item 4, contract side: expression engine for mods (read-only)

Scout report. Paths are absolute or relative to one of two repos:
- `MODS` = `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src` (HEAD `03526cf`, clean, in sync with origin/main)
- `HOST` = `/Users/diegorv/Dev/pet-projects/koko/brain`

No test, build, pnpm or cargo was run. Everything below is from reading code.

## Verdict

Whether item 4 needs a contract change is a choice about where the API lives, not a technical necessity.

| Option | Contract change | apiVersion bump | Mods repo commit | Host SHA bump |
|---|---|---|---|---|
| A. Stable `ctx.query` in `ModContextV1` | Yes, additive | No | Yes | Yes, mandatory |
| B. Unstable, `ctx.labs.query` or a `ctx.app` member | None | No | Optional (only to type it for mods) | Not required |

Recommendation: A, with `matches` and `notes` taking and returning only strings, booleans and vault-relative paths. No app type crosses the boundary, so the surface is cheap to freeze. This is the owner's call and it is the one decision this item needs. The alternative costs less and gives up the promise (see "Option B" below).

## Evidence that today's stable contract has nothing for this

- `ModContextV1` (`MODS/packages/mod-core/src/contract/mod-api.v1.ts:329-386`) lists `apiVersion, mod, signal, register, notify, log, addAction, addRailButton, watch, onNoteSaved, vault, workspace, ui, theme, loadData, saveData`. Nothing queries notes.
- The only index access is raw and unstable: `ctx.kb()` (`MODS/packages/mod-core/src/unstable/context.ts:25`), typed by the handwritten `RawKb` with a single member `pages(source?) => { array() }` (`MODS/packages/mod-core/src/unstable/raw.ts:116-118`). It is QueryJS's `KBAPI`, not the Collection expression engine (`HOST/src/lib/plugins/mods/mods-host.service.ts:13,68,187`, `HOST/src/lib/plugins/mods/mod-app.service.ts:14,80`).
- Mods filter in JavaScript over `KbPage[]` today: `notePages` in `MODS/packages/mod-core/src/notes/notes.ts:4-9`, `inboxNotes` at `:15-17` (`_organized === false && !_archived`). Callers: `mods/inbox-triage/src/triage.service.ts:11`, `mods/hotkeys/src/hotkeys.service.ts:18`, `mods/bulk-tag/src/bulk-tag.service.ts:113`, `mods/context-review/src/review.service.ts:37`, `mods/one-on-one/src/one-on-one.service.ts:105,172`.
- The host engine is `evaluateFilter(filter, ctx, onLeafError?)` at `HOST/src/lib/features/collection/collection.logic.ts:328`, `executeQuery` at `:132`, `evaluateExpression` / `validateExpression` at `HOST/src/lib/features/collection/expression/evaluator.ts:77,308`. Nothing in `plugins/mods` exposes it. Rules and views already use filter strings such as `file.inFolder("Examples/Rules") && isEmpty(rule_checked)`. The mods example `DEMO_RULE` (`MODS/docs/examples.md`, "Action an Auto Organize rule runs") is one.

The reuse of the exact filter strings that views and rules store is the benefit. A mod can keep a rule-shaped filter in its own data and evaluate it the way the app does.

## Option A: proposed contract addition

Additive, so by the file's own header no `apiVersion` bump (`mod-api.v1.ts:15-16`: "a new `ModContextV1` member is additive"). Members must be function-typed properties, the file must import nothing and stay `.ts` (`:8-14`).

```ts
/** Read-only queries over the vault's notes, with the filter language of views and Auto Organize rules */
export interface ModQueryV1 {
	/** Resolves to whether the note at `path` matches `expression`. Rejects `Mod "<id>": ...` when the expression does not parse or the note is not indexed. */
	matches: (expression: string, path: string) => Promise<boolean>;
	/** Resolves to the vault-relative paths of every note matching `expression`. Same rejection on a bad expression. */
	notes: (expression: string) => Promise<string[]>;
}
```
plus `query: ModQueryV1` in `ModContextV1` (next to `vault`, around line 364), with the line "Every function throws once the mod is unloaded" already covered by the interface doc at `:328`.

Points the contract text must settle (host scout should confirm the host behavior):
1. Async. `buildPropertyIndex` is async (`HOST/src/lib/features/collection/collection.service.ts:90`), and `ctx.kb()` is async for the same reason, so a synchronous `matches` would promise more than the host can give.
2. Parse errors reject, not return `false`. `evaluateFilter` turns a leaf that fails to parse or throws into `false` (`collection.logic.ts:322-327` doc, `onLeafError` callback). A mod cannot tell a typo from "no match" unless the host runs `validateExpression` first and rejects. Stating this in the contract is what makes it testable.
3. Paths are vault-relative, like the rest of `ModVaultV1` (`:132-134`), not the absolute paths `KbPage.file.path` and `ctx.app` use. Reuse the existing path rule (`assertVaultPath`, mirrored in `MODS/packages/mod-core/src/testing/fake-ctx.ts:17-19`).
4. Freshness. The property index lags a write like `ctx.kb()` does (`HOST/help/documentation/mods/10-querying-the-index.md`, "Freshness and lag"). The contract comment should point to the same caveat instead of promising read-your-writes.
5. Filter strings only. `evaluateFilter` also takes object filters (`and` / `or` / `not`, `collection.logic.ts:328`, `filterProblem` in `HOST/src/lib/features/auto-organize/auto-organize.logic.ts:36`). Limiting the contract to strings keeps the stable surface to what a user types, and objects can be added later without a break.

## Mods repo: files that change under Option A

All under `MODS`. Edits are small; I verified each by reading the file.

1. `packages/mod-core/src/contract/mod-api.v1.ts`: the interface and the member above.
2. `packages/mod-core/src/testing/fake-ctx.ts`: required. `FakeCtx extends ModCtx extends ModContextV1` (`:60`, `unstable/context.ts:18`) and `fakeCtx()` returns an object literal typed as `FakeCtx` (`:215-331`), so a new required member makes `pnpm typecheck` fail until it is added. Follow the file's rule "Anything not modelled here throws" (`:97`, `notModelled` at `:155`): default `query: { matches: notModelled('query.matches'), notes: notModelled('query.notes') }`. Add a `FakeCtxOptions.query?: Partial<ModQueryV1>` override, like `app?: Partial<RawApp>` (`:56-57`, spread at `:197`). Do not write a mini evaluator: the engine lives in the host and the file header says the fake is "not the host implementation" (`packages/mod-core/README.md`).
3. `packages/mod-core/test/testing/fake-ctx.test.ts`: a test that the default throws "not modelled" and that an override is used.
4. `test/fixtures/package-consumer/main.ts` (run by `pnpm check:package`, `scripts/check-core-package.mjs:26-29`): optional, one typed use of `stable.query` so the installed package proves the member and `ModQueryV1` export (`export type * from './contract/mod-api.v1'`, `packages/mod-core/src/index.ts:1`).
5. Docs: `docs/examples.md` and `packages/mod-core/README.md` need no edit unless a recipe is added. If one is added, `docs/examples.md` counts go stale ("These seven TypeScript recipes", "all thirteen production bundles"); update them in the same change. A recipe would be a new `examples/*.ts` plus a `test/examples-*.test.ts` (the form of `examples/note-save-reaction.ts` and `test/examples-save.test.ts`).
6. Optional, not required: migrating `notePages(...).filter(...)` callers or `inboxNotes` to `ctx.query.notes`. Out of scope for the item, and `registrations.baseline.json` must not change (append-only for registrations; a migration would not touch registrations).

Not affected, checked:
- `editNote` / `appendToDailyNote` (`notes/editor.ts`): item 4 does not touch them. They are item 1's concern.
- `scripts/mod-loader.ts:127-148` recording `ctx`: a `Proxy` that falls back to a stub for unknown keys, so a new member needs no change there. (Read; not run.)
- `test/registrations.baseline.json`, `scripts/capture-registrations.mjs`: registrations only.

## Mods repo checks and tests that pin the contract

- `package.json` scripts: `typecheck` (`tsc -p tsconfig.json`), `test` (vitest minus host-integration), `test:host` (needs `KOKOBRAIN_HOST_ROOT`), `check` = typecheck + `scripts/check-bundle.mjs` + test + test:host, `verify` (temp build + full check, needs `KOKOBRAIN_HOST_ROOT`), `check:package <consumer>`.
- Nothing in the mods repo freezes the `ModContextV1` key list. The freeze is in the host: see below. The mods repo's contract-level checks are `tsc` (fakeCtx must satisfy the new interface), `check:package` (installed consumer type-checks and runs), and `test/host-integration/fake-ctx-rules.test.ts`, which compares fakeCtx with the host for the path rule and `saveData` only (`:1-48`). If `fakeCtx` ever gets a real `query` model, this is the place for a host parity test; with `notModelled` it is not needed.
- `test/fixtures/package-consumer/main.ts:35-44` has `@ts-expect-error` lines proving `app`, `kb`, `labs` are not stable. Under Option A `query` is stable, so no new expect-error. Under Option B nothing changes there either, but a `context.query` expect-error line would document the choice.

## Host adoption under Option A

Source: `HOST/docs/MOD-CORE.md` "Updating the dependency" (steps 1-6).

1. In `MODS`: change contract, fakeCtx and tests; run `pnpm check` (with `KOKOBRAIN_HOST_ROOT=HOST`); commit; push to `diegorv/koko.brain-mods`. The adopted commit must stay reachable.
2. `pnpm check:package <consumer>` in a temp consumer (`MODS/docs/architecture.md`, "Install and validate core").
3. In `HOST`: `pnpm add -D '@kokobrain/mod-core@github:diegorv/koko.brain-mods#<full-sha>&path:/packages/mod-core'`. Current pin is `328ca55f6add4d18e3c5b1490feee66ce8503b5e` (`HOST/package.json:81`, lockfile `pnpm-lock.yaml:180-182,515-516`). It is an ancestor of `MODS` HEAD; 28 commits and 6 mod-core commits lie between them (`b986cce`, `b3e0e52`, `cb6f933`, `e086a13`, `531292f`, `0f81b8f`), but `git diff --stat 328ca55..HEAD -- packages/mod-core/src/contract` is empty, so the bump pulls helper and fakeCtx changes only. The host imports no runtime helpers (`MOD-CORE.md`, line 5).
4. Inspect the lockfile (repo, commit, path; no credentials). `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm vitest run`, `pnpm build` (package.json and lockfile changed, so CLAUDE.md rule 6 requires the build).
5. The bump cannot land on its own as a green commit. After it, `ModContext extends ModContextV1` (`mods-host.service.ts:36`) requires `query`, so the object `createModContext` returns (`:122`, `vault:`/`workspace:` at `:592-593`) fails `pnpm check` until `query` is built, and `src/tests/lib/plugins/mods/mod-api-contract.test.ts` fails at `CONTEXT_PUBLIC ... satisfies Record<keyof ModContextV1, true>` (`:46-63`) and at the key-equality test (`:230-232`). The host commit that bumps the SHA must carry the implementation and the test update (`query: true`, a `QUERY_PUBLIC satisfies Record<keyof ModQueryV1, true>` list, an `Object.keys(makeContext().query)` test like `:244-246`). Commit order is therefore: mods repo first, then one host commit.
6. Run `pnpm verify` in `MODS` with `KOKOBRAIN_HOST_ROOT=HOST` after the host adopts it.
7. Host docs, outside this report's scope but required by the change: `HOST/help/documentation/mods/10-querying-the-index.md` (currently marked "raw"), `13-api-reference.md`, `HOST/help/documentation/28-mods.md`, and the ADR `HOST/docs/adr/0036-vault-mods-trust-loader-storage.md` if it lists the stable surface (not read; unverified).

## Option B: no contract change

- Host only: add a member to `MOD_APP` (`HOST/src/lib/plugins/mods/mod-app.service.ts:25-62`, "Adding a member is one line here") or to the `labs` object (`mods-host.service.ts:149`). The host test already treats `app`, `kb`, `labs` as unstable and not frozen (`mod-api-contract.test.ts:66,230-238`).
- Mods repo: no change is required for the host to ship it. Mods need a type, so add one to the handwritten `RawApp` (`packages/mod-core/src/unstable/raw.ts:45-84`, whose header says it lists only what mods use) or to `ModCtx['labs']` (`unstable/context.ts:20-23`), and a default in `fakeCtx` (`app` defaults at `:158-198`, `labs` at `:238-255`). That is optional and does not require a host SHA bump, because the host's own `ModContext` type is not generated from `unstable`.
- Cost: no compatibility promise (`HOST/help/documentation/28-mods.md:140-141`), so every mod using it can break on an app change. Benefit: no contract freeze on a language the app still evolves.

## Not verified

- Host behavior for parse errors, unindexed notes, and index freshness (the host-side scout covers it); the proposed contract wording assumes the host can reject on `validateExpression` failure.
- `HOST/docs/adr/0036-vault-mods-trust-loader-storage.md` contents.
- That `pnpm check` / `pnpm verify` pass on the proposed change; nothing was run.
