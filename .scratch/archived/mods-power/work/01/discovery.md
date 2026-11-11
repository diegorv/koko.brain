# Issue 01 discovery: stable `ctx.vault.updateFrontmatter`

No `spec.md` in `.scratch/mods-power/`; the Issue and its research files are the spec.

## Precondition checked

- Mods SHA `4195eaab9b5f950d80b2d358de383329acb93ea6` is on the mods `origin/main`.
- `git diff 328ca55f6..4195eaab9 -- packages/mod-core/src/contract` adds only `ModPropertyV1` and `ModVaultV1.updateFrontmatter` (JSDoc + member). Nothing else in the contract changed, so the bump is allowed.
- HTTPS `git ls-remote` to the private repo works from this worktree, so `pnpm add -D` per `docs/MOD-CORE.md` step 3 can run.
- `ModPropertyV1` is structurally identical to core `Property` (`src/lib/core/frontmatter/properties.types.ts:5-12`), so `mutate` passes straight to `updateNoteFrontmatter` with no cast.

## Files that change

- `package.json:81`, `pnpm-lock.yaml:180-182`: pin to the new SHA (pnpm add, then inspect).
- `src/lib/plugins/mods/mod-vault.service.ts:118-136`: add `updateFrontmatter` after `write`; import `updateNoteFrontmatter` from `#lib/core/frontmatter/frontmatter-write.service.js`.
- `src/tests/lib/plugins/mods/mod-vault.service.test.ts:171-256`: new `describe('updateFrontmatter')` after `write`.
- `src/tests/lib/plugins/mods/mod-api-contract.test.ts:68-77`: `updateFrontmatter: true`.
- `src/tests/help/mods-example.test.ts:59-74`: `updateFrontmatter: unused`.
- `help/examples/mods/kokobrain-mod.d.ts:138-177`: `ModPropertyV1` + member, copied from the contract.
- `src/tests/help/mods-types.test.ts:25-47,83-87`: `STABLE_TYPES` entry and `expectTypeOf` line.
- Docs: `help/documentation/mods/13-api-reference.md`, `04-vault-files.md`, `09-raw-app.md`.

## Plan

1. Commit A (one commit, Behavior 1): failing adapter tests are written first and run red (the member does not exist; also `pnpm check` red after the bump). Then SHA bump + adapter + contract pin + `.d.ts` copy + `mods-types` + `mods-example`, so `pnpm check` is green at the commit.
2. Commit B: docs.

## Prior-art tests

- `write` describe in `mod-vault.service.test.ts` (after-save observer, dirty tab, `writeTextFile` not called).
- Unload cases at `mod-vault.service.test.ts:600-720` (set `runtime.unloaded` inside a `writeTextFile` mock implementation).

## Risks and defaults

- Unload during the write: the adapter's `assertLive()` after the await reports the unload even though the bytes are on disk (accepted limit in Issue Notes).
- Dirty tab case: the tab branch calls `saveFileByPath`, which writes through the mocked `writeTextFile`; the test asserts disk == tab content.
- Missing note: `readTextFile` mock throws `No such file: <abs>`; the adapter lets it through via `logged`.
- Out of the gate here: `pnpm build`, the full suite and the mods workspace's `check:package` / `verify` belong to deliver.
