# 33 (deferred until a second consumer exists): Move the editor engine into packages/editor

**What to build:**

1. **Workspace.** Add `packages: ['packages/*']` to pnpm-workspace.yaml, and a `catalog:` for @codemirror/* and @lezer/*.
2. **Package.** Create packages/editor:
   - private, ESM, source TS, subpath exports
   - @codemirror/* as peerDependencies
   - relative imports only
3. **Move.** Move the non-Svelte .ts files of core/markdown-editor into it.
4. **Inputs that only watch `src/`.** Update the root tsconfig include, the `INPUT_PATHS` in tauri-before-build.sh, the ci.yml and pr.yml paths-filters, and the privacy.yml paths.
5. **Tests.** They stay in src/tests and import from the package.

**Blocked by:** 32

**Status:** wontfix

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh`

**Source:** pnpm-workspace.yaml; tsconfig.json; vitest.config.ts; vite.config.js; scripts/tauri-before-build.sh; .github/workflows/{ci,pr,privacy}.yml; src/tests/lib/lib-specifier-convention.test.ts

- [ ] `lib-specifier-convention.test.ts` (which today walks only `src/`) is extended to walk `packages/`, and fails on any `#lib` specifier there
- [ ] A test asserts pnpm-lock.yaml has exactly one `@codemirror/state@` and one `@codemirror/view@` package key
- [ ] A type error planted in packages/editor fails `pnpm check`
- [ ] A change only under packages/ triggers a rebuild in tauri-before-build.sh and the CI frontend job
- [ ] `pnpm install --frozen-lockfile` passes with the supply-chain settings unchanged
- [ ] LP-PROFILE is recorded before and after, and the full E2E suite passes

## Notes

- **`#lib` trap (reproduced in /tmp by two independent runs):** inside a nested package with its own `package.json`, Node rejects `#lib` imports (`ERR_PACKAGE_IMPORT_NOT_DEFINED`), but `tsc` with the root `paths` resolves them. So `pnpm check` stays green while vitest and the build fail.
- **Why deferred:** for stability the move is structure only. Issues 31-32 deliver the value.
- **Dropped:** packages/ui (4 commits in its history, no bugs) and packages/domain (see issue 06).
- **Size:** M.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/151-editor-engine-lives-packages-editor.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
