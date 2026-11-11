# Issue 02 discovery: `ctx.onNoteSaved(cb(path, content), { ignoreOwnWrites })`

No `spec.md` in `.scratch/mods-power/`; the Issue and its research files are the spec.
Same contract-bump pattern as `work/01` (MOD-CORE.md steps 3-5); only the SHA and the members differ.

## Precondition checked

- Mods SHA `32c023f396b4d85723756e9c4463502ddc29ff4e` (mods Issue 02 Comments) is on mods `origin/main`.
- `git diff 4195eaab9..32c023f39 -- packages/mod-core/src/contract` changes only `mod-api.v1.ts`: the header compatibility note, the `updateFrontmatter` JSDoc (names `ignoreOwnWrites`) and the `onNoteSaved` JSDoc + signature. Nothing else, so the bump is allowed.

## Files that change

- `package.json:81`, `pnpm-lock.yaml:180-182,515-516,2607`: pin to the new SHA.
- `src/lib/plugins/mods/mod-vault.service.ts`: module-level `ownWrites` map + exported `isOwnWrite`; `write` (`:136`) wraps `notifyAfterSave` in increment/`finally` decrement; `updateFrontmatter` (`:138-147`) increments after the Markdown check, decrements in `finally` after `updateNoteFrontmatter` settles.
- `src/lib/plugins/mods/mods-host.service.ts:592-611`: `(callback, options)` validation via `invalid(...)`; observer takes `(path, content)`, returns early when `ignoreOwnWrites && isOwnWrite(manifest.id, path)`; timer calls `callback(relative, content)`.
- `help/examples/mods/kokobrain-mod.d.ts:206-208,412-418`: copy both JSDoc blocks and the signature verbatim.
- `src/tests/lib/plugins/mods/mod-note-saved.test.ts`: new cases (Acceptance list); `readDir` mock lists `saver` and `other`.
- Docs: the help files listed in the Issue.

## Plan

1. Commit A: failing content test first (red), then the SHA bump + `.d.ts` copy + host/vault change + all new tests, so `pnpm check` is green at the commit (the bump alone breaks `callback(relative)` arity only if typed; either way one commit per the Issue).
2. Commit B: docs.

## Prior-art tests

- `mod-note-saved.test.ts:59-72` (editor save via `saveFileByPath`), `:95-104` (`vault.write`).
- `mod-vault.service.test.ts` `describe('updateFrontmatter')` for frontmatter fixtures.

## Risks and defaults

- Second mod: the `readDir` mock returns both ids; the second mod's `main.js` stores its ctx in `globalThis.__otherCtx`. The `readDir` mock is called for every folder; it only matters for `_system/mods`.
- Concurrent `updateFrontmatter` on a closed note: both calls race (last write wins, documented); the test only asserts the marker is gone after both settle.
- Open-tab `updateFrontmatter` saves through `saveFileByPath` inside the await, so the marker covers it.
- Out of the gate here: `pnpm build`, the full suite and the mods workspace `check:package` / `verify` belong to deliver.
