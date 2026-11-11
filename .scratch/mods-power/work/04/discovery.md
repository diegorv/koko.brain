# Issue 04 discovery: `ctx.query` over the collection engine

No `spec.md` in `.scratch/mods-power/`; the Issue is the spec. Same bump-plus-code pattern as `work/01` (one commit for SHA + code, docs second); only the differences are listed.

## Precondition checked

- Mods Issue 03 Comments record `a94a107ac31efe5901c253357f604d2709d8dafb`; it is on mods `origin/main`.
- `git diff 32c023f..a94a107 -- packages/mod-core/src/contract` adds only `ModQueryV1` and `ModContextV1.query`. Behavior 3 of mods 03: nothing changed, so no `onNoteSaved` / `updateFrontmatter` JSDoc copy.

## Files that change

- `package.json:81`, `pnpm-lock.yaml`: pin to `a94a107...` via `pnpm add -D` (MOD-CORE.md step 3), then inspect the lockfile.
- New `src/lib/plugins/mods/mod-query.service.ts`: `createModQuery(scope: ModVaultScope): ModQueryV1`.
- `src/lib/plugins/mods/mods-host.service.ts:24` import, `:623` `query:` after `workspace:`.
- New `src/tests/lib/plugins/mods/mod-query.service.test.ts`.
- `src/tests/lib/plugins/mods/mod-note-saved.test.ts`: one wiring case (collection consumer registered, index ready).
- `src/tests/lib/plugins/mods/mod-api-contract.test.ts:46-63` `query: true`, `QUERY_PUBLIC`, members case after `:245`.
- `src/tests/help/mods-types.test.ts:25-47,85`; `src/tests/help/mods-example.test.ts:38-74` `query: unused`.
- `help/examples/mods/kokobrain-mod.d.ts:378-441`: `ModQueryV1` before `ModContextV1`, `query` after `vault`.
- Docs: `help/documentation/mods/13-api-reference.md` (`:23`, `:112`, `:249`), `10-querying-the-index.md`, `28-mods.md`, `15-errors-and-debugging.md:20`, `01-anatomy-and-loading.md:300`.

## Plan

1. Commit A: failing `mod-query.service.test.ts` run red (module missing), then bump + service + wiring + contract/types/example tests + `.d.ts`, so `pnpm check` is green at the commit.
2. Commit B: docs.

## Prior-art tests

- `mod-vault.service.test.ts:100-125` (real `vaultStore.open`, `createModContext` with a `ModRuntime`, unload cases `:699-730`).
- `mod-note-saved.test.ts:37-60` (real host via `startModsHost`, real `saveFileByPath`).

## Risks and defaults

- `notifyAfterSave` calls `applyNoteChange` with `void`, but for source `save` the TS consumers run synchronously before the first await (comment at `editor.hooks.ts:70`), so the record is in place before `onNoteSaved` callbacks (`setTimeout 0`). The wiring test pins it.
- Port in tests: register `blockRowSet` with `vaultPath: vaultStore.path` and `systemFolder: settingsStore.templates.systemFolder`, as `boot.ts:61-65`.
- `matches` on a `.view` path: the record evaluates; no special case.
- Out of the build gate: `pnpm build`, full suite, mods workspace `check:package` / `verify` belong to deliver.
