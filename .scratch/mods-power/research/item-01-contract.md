# Item 1, contract side: stable `ctx.vault.updateFrontmatter`

Scout report. Paths: `M:` = `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`, `B:` = `/Users/diegorv/Dev/pet-projects/koko/brain`. Nothing was run or edited besides this file.

## Verdict

Item 1 needs a contract change. The stable `ModVaultV1` has no frontmatter writer, so a mod cannot write frontmatter without `ctx.app` (raw, no compatibility promise):

- `ModVaultV1` lists read, exists, list, create, write, rename, move, delete only (`M:packages/mod-core/src/contract/mod-api.v1.ts:136-161`).
- The only writer is `RawApp.updateNoteFrontmatter(absolutePath, mutate) => Promise<string>` (`M:packages/mod-core/src/unstable/raw.ts:76-77`), wired to the host's `updateNoteFrontmatter` (`B:src/lib/plugins/mods/mod-app.service.ts:4,53`).
- The `Property` type is `unstable`-only (`M:.../unstable/raw.ts:6-11`). The contract "imports nothing" (`M:.../contract/mod-api.v1.ts:7-9`), so it needs its own property type.
- Adding a `ModVaultV1` member is additive, so no `apiVersion` bump (header rule, `M:.../contract/mod-api.v1.ts:15-18`).

## Contract changes (in `M:packages/mod-core/src/contract/mod-api.v1.ts`)

1. `ModPropertyV1`, an exact copy of the host's `Property` (`B:src/lib/core/frontmatter/properties.types.ts:2-12`):
   `{ key: string; value: string | number | boolean | string[]; type: 'text' | 'list' | 'number' | 'date' | 'boolean' }`.
2. `ModFrontmatterWriteReasonV1`, a string union mirroring `FrontmatterWriteReason` (`B:src/lib/core/frontmatter/frontmatter-write.service.ts:30`) plus `LossyFrontmatterReason` (`B:src/lib/core/frontmatter/properties.logic.ts:357-363`): `'unparseable' | 'nested' | 'comments' | 'duplicate-keys' | 'alias-collision' | 'anchors' | 'save-failed' | 'vault-changed' | 'missing'`. These are the same strings `writeFailureText` already maps (`M:packages/mod-core/src/errors/index.ts:8-15`).
3. `ModFrontmatterWriteErrorV1 extends Error { name: 'FrontmatterWriteError'; reason: ModFrontmatterWriteReasonV1; path: string }`, modelled on `ModDataCorruptErrorV1` (`M:.../contract/mod-api.v1.ts:321-326`). Doc: `path` is vault-relative here (the host's own error carries an absolute path, so the host must convert; this is a host task); `save-failed` means the editor already toasted, so the mod must not toast again.
4. `ModVaultV1.updateFrontmatter: (path: string, mutate: (props: ModPropertyV1[]) => ModPropertyV1[]) => Promise<void>`. Doc points to carry over from `raw.ts:76` and the host writer's JSDoc (`B:src/lib/core/frontmatter/frontmatter-write.service.ts:81-98`):
   - vault-relative path, same path rule as the other `ctx.vault` members (invalid path rejects `Invalid vault path "<path>"`);
   - `mutate` must be pure, because it can run twice when a tab opens during the read;
   - returning the same array means "no change", and nothing is written;
   - an open tab keeps unsaved body edits and is saved at once; a closed note is written to disk (unlike `vault.write`, which rejects on a dirty tab, `mod-api.v1.ts:149-154`);
   - lossy YAML (comments, nested, anchors, duplicate keys, alias collision, unparseable) rejects with `ModFrontmatterWriteErrorV1`, nothing written;
   - concurrent calls on one closed note race, so callers serialize per path (host JSDoc, line 96-97).
   - Return type is a decision: the raw API returns the written text (`Promise<string>`). The mods only latch `didChange` inside `mutate` and ignore the result (`M:mods/portent/src/portent.service.ts:40-47`, `M:mods/bulk-tag/src/bulk-tag.service.ts:142-149`, `M:mods/operations/src/operations.service.ts:69-80`). Recommendation: `Promise<void>`, the smaller promise to keep forever. Choosing `Promise<string>` makes the migration a pure mechanical swap. Either is additive.
5. Header comment of the contract file: no change needed. Its freeze note points at the host test (`mod-api.v1.ts:17`).

No change to `ModContextV1` itself (the member lives on `vault`), `apiVersion` stays `1` (`mod-api.v1.ts:331`).

## Changes elsewhere in `M:packages/mod-core`

- `src/unstable/raw.ts`: `RawApp.updateNoteFrontmatter` can stay (existing mods and published behavior). Make `Property` an alias of `ModPropertyV1` (`export type Property = ModPropertyV1`) so a mutate written for one works for the other; structurally they are already identical. Keep the raw member until all five mods have moved, then delete in a separate commit (raw has no compatibility promise, `raw.ts:3-4`).
- `src/errors/index.ts`: `writeFailureText` reads `err.reason` only (`errors/index.ts:23-27`), so it works unchanged on the new error. Could tighten its parameter to accept `ModFrontmatterWriteErrorV1`, but not required. Its comment says "failed `updateNoteFrontmatter`" (line 20) and `WRITE_FAILURES` says "its own table is not on `ctx.app`" (line 7): update both to name `ctx.vault.updateFrontmatter` once adopted.
- `src/testing/fake-ctx.ts`: the `vault` object literal is typed by `ModCtx`, so `tsc` fails until `updateFrontmatter` is added (`fake-ctx.ts:~256-295`, literal ends with `write`). Follow the file's convention: `updateFrontmatter: notModelled('vault.updateFrontmatter')` like `vault.list/rename/move` (`fake-ctx.ts:~258-260`), wrapped in `checked(...)` if modelled so the path rule applies.
  - Every mod test today injects its own writer through the `app` option, because `FakeCtxOptions` only has `app?: Partial<RawApp>` (`fake-ctx.ts:56`). Those tests: `M:mods/portent/test/{portent.service,index,relationships}.test.ts`, `M:mods/inbox-triage/test/triage.service.test.ts`, `M:mods/operations/test/operations.service.test.ts`, `M:mods/bulk-tag/test/bulk-tag.service.test.ts`, `M:test/host-integration/parent-resolution.test.ts:110`. To migrate mods, `FakeCtxOptions` needs a matching `vault?: Partial<ModVaultV1>` override (additive, same pattern as `app`), otherwise those tests have no way to inject a writer.
  - A real in-memory model (parse and rebuild YAML in the fake) is not recommended: the workspace has no YAML dependency and the fake's stated scope is "only the operations needed" (`packages/mod-core/README.md`, testing paragraph). Keep it as `notModelled` plus an override.
  - If it is modelled with an override or error, `FakeCtx` has a place for a typed rejection: construct `Object.assign(new Error(...), { reason })` as `errors.test.ts:20` does.
- `src/notes/editor.ts` (`editNote`): it edits text, not frontmatter, and uses raw `editorStore`/`vaultStore` (`editor.ts:24-42`). It does not call `updateNoteFrontmatter`. It cannot be replaced by `updateFrontmatter` for body edits, and `updateFrontmatter` cannot replace it for a combined frontmatter plus body change. The only in-repo frontmatter-through-`editNote` user is `M:examples/auto-organize-rule-action.ts:44-70`, which regex-edits the YAML text (no refusal on comments/nested values) and appends a body line "as a single change" (`M:docs/examples.md` "Action an Auto Organize rule runs"). Recommendation: do not touch `editNote`. Optionally change that example to call `ctx.vault.updateFrontmatter` for the marker and `editNote`/`appendToDailyNote`-style helper for the line, but that splits one change into two saves, which makes the rule's loop guard (marker in filter) fire between them. Flag to the orchestrator as an optional follow-up, not part of item 1.
- `src/markdown/props.ts`: `setProp`, `addPickedParent`, etc. take `Property[]` (`props.ts:2,9`). With the alias above they need no edit.

## Mods and docs that follow (separate, optional commits)

- Migrate the five `ctx.app.updateNoteFrontmatter` call sites to `ctx.vault.updateFrontmatter(relative, ...)`: `M:mods/portent/src/portent.service.ts:40`, `M:mods/inbox-triage/src/triage.service.ts:73`, `M:mods/operations/src/operations.service.ts:69` (builds `${ctx.app.vaultStore.path}/${selected.path}`, becomes `selected.path`), `M:mods/bulk-tag/src/bulk-tag.service.ts:142` (passes `note.file.path`, an absolute index path: needs `toVaultPath`, `M:packages/mod-core/src/paths/index.ts:1-8`), and the portent relationship code reached via `portent.service.ts`. This would not by itself change the mods' bundles' registration baseline (`M:test/registrations.baseline.json` records registrations, not frontmatter calls), but check `M:test/bundles.test.ts` and `M:scripts/check-bundle.mjs` (not read) before assuming. Header comments in `M:mods/portent/src/index.ts:1` and `M:mods/inbox-triage/src/index.ts:1` list `ctx.app.updateNoteFrontmatter` as a requirement and would change.
- Docs to update when the member lands:
  - `M:README.md:139-144` "Writing notes" bullets (`updateNoteFrontmatter`'s `mutate` must be pure; failures via `writeFailureText`): rename to `ctx.vault.updateFrontmatter`, keep the purity and `save-failed` rules.
  - `M:packages/mod-core/README.md` table rows for `markdown` and `errors` (lines 12,15) need no change; the `contract` row (line 11) needs none either.
  - `M:docs/examples.md`: add a short example only if one is written (examples are tested by `M:test/examples-*.test.ts` with `fakeCtx`; a new example needs a `fakeCtx` vault override).
  - `M:docs/mods-catalog.md:13-22,153,193` describe mod behavior; no edit until mods migrate and only if behavior changes.
  - `M:docs/research/portent-mod-opportunities.md:81,164` say frontmatter mutation is raw/unstable; that research note is historical, leave as is or add a line.
  - Host-side docs (`B:help/documentation/mods/*.md`, `B:help/documentation/28-mods.md`, ADR 0036) are the host scout's.

## Tests that pin the contract

- Mods repo has no test freezing the contract keys. Contract tests: `M:packages/mod-core/test/**` (helpers and fake only), `M:test/fixtures/package-consumer/main.ts` (type checks only against public types; `publicContract` has negative `@ts-expect-error` lines at the end, none about vault members), `M:test/core-workspace-entry.test.ts` (trivial).
- The freeze lives in the host: `B:src/tests/lib/plugins/mods/mod-api-contract.test.ts`. `VAULT_PUBLIC` is `satisfies Record<keyof ModVaultV1, true>` (line 66-77) and line 245 asserts `Object.keys(makeContext().vault)` equals `VAULT_PUBLIC`. After the host adopts the new SHA, `pnpm check` fails on `VAULT_PUBLIC` (missing key `updateFrontmatter`) until the host adds the key, and the runtime test fails until `createModVault` (`B:src/lib/plugins/mods/mod-vault.service.ts`, called at `mods-host.service.ts:592`) returns it. That is the intended safety net. Property and error types are new exports; the host test imports named types from the contract (see imports near line 26), so a frozen `Object.keys` list for `ModPropertyV1` is optional (a `satisfies Record<keyof ModPropertyV1, true>` is cheap and matches the file's style).
- Add in the mods repo: tests for the `FakeCtx` change (the override option and the `notModelled` message) in `M:packages/mod-core/test/testing/fake-ctx.test.ts`; if `writeFailureText`'s signature changes, `M:packages/mod-core/test/errors/errors.test.ts`. A negative type line in `package-consumer/main.ts` is optional.
- Host-integration tests (`M:test/host-integration/*`) copy the host's path rule and `saveData` serialization (`fake-ctx-rules.test.ts`). If the fake models `updateFrontmatter` with the path check through `checked(...)`, the existing path rule test already covers the rule; no new host import needed.

## Mods repo checks (from `M:package.json` scripts)

- `pnpm typecheck` = `tsc -p tsconfig.json` (includes `packages/*/src|test`, `mods/*`, `test`, `examples`). This is what catches the `fakeCtx` literal missing the new member.
- `pnpm test` = `vitest run --exclude "test/host-integration/**"`; `pnpm test:unit` also excludes `test/bundles.test.ts`; `pnpm test:host` = host-integration (needs `KOKOBRAIN_HOST_ROOT`).
- `pnpm check` = typecheck + `node scripts/check-bundle.mjs` + test + test:host. `pnpm verify` builds into a temp dir and runs `check`.
- `pnpm check:package <consumer>` validates the installed package from a temp consumer (`M:scripts/check-core-package.mjs`; steps in `M:docs/architecture.md`, "Install and validate core").

## What the host must adopt (`B:docs/MOD-CORE.md`, `M:docs/architecture.md` "Host adoption")

1. Commit in the mods repo and push (the host pins a full SHA from GitHub). Current pin: `328ca55f6add4d18e3c5b1490feee66ce8503b5e` (`B:package.json:81`). `git log -- packages/mod-core/src/contract` in the mods repo shows `328ca55` is also the last commit that touched the contract, and mods HEAD is `03526cf` (examples/docs only after the pin), so the pin has no other contract drift to absorb.
2. Install into an independent consumer by SHA and run `pnpm check:package <consumer>`.
3. In the host: `pnpm add -D '@kokobrain/mod-core@github:diegorv/koko.brain-mods#<full-sha>&path:/packages/mod-core'`; inspect the lockfile (repo, commit, path, no credentials); `pnpm install --frozen-lockfile`; `pnpm check`, `pnpm vitest run`, `pnpm build` (`package.json`/lockfile change, so `pnpm build` is required by `B:CLAUDE.md` rule 6).
4. The host's `src/lib/plugins/mods/contract/mod-api.v1.ts` is `export type * from '@kokobrain/mod-core/contract'` (`B:...:2`): the new types flow through without an edit.
5. Host code that must change in the same host commit (host scout covers detail): implement `updateFrontmatter` in `createModVault` (vault-relative to absolute, assert-live, call `updateNoteFrontmatter`, convert absolute `path` in `FrontmatterWriteError` to vault-relative), add `updateFrontmatter: true` to `VAULT_PUBLIC` in the contract test, host tests for it, and docs. Order matters: the host's `pnpm check` fails right after the SHA bump until these land, so bump and implement in one commit (CLAUDE.md rule: one commit per task).
6. Run the mods workspace `pnpm verify` with `KOKOBRAIN_HOST_ROOT` pointing at the host checkout.

Ordering across repos: mods-repo commit (contract + fake + optional alias) first, host adoption second, mod migrations third (they can only be built into vault `main.js` once the running host implements the member; a mod calling `ctx.vault.updateFrontmatter` on an older host throws "not a function", and `apiVersion` stays 1 so there is no manifest gate: see risks).

## Risks and open points

- Compatibility gate: additive members have no version signal (`apiVersion` stays `1`). A mod using `ctx.vault.updateFrontmatter` loaded in an older Kokobrain fails at call time. I did not check whether the manifest has a minimum-app-version field; the host scout or the manifest check (`M:test/host-integration/manifest-check.test.ts`) should confirm. Not verified.
- Property type duplication: `ModPropertyV1` and the host's `Property` must stay identical. The host assigns one to the other, so a drift is a `pnpm check` error in the host, not silent.
- Error identity: the contract can only describe `reason`, `path`, `name`. The host class is `FrontmatterWriteError` with `name = 'FrontmatterWriteError'` (`frontmatter-write.service.ts:33-45`), and mods must not rely on `instanceof`.
- Absolute vs relative `path` on the error is a host decision I flag but did not resolve.
- Not checked: `M:scripts/check-bundle.mjs` and `M:test/bundles.test.ts` internals; whether other worktrees under `M:.worktrees` hold in-flight contract edits (`.worktrees` was excluded from searches); `M:.scratch` has no item for this yet.
