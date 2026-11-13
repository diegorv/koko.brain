VERDICT: APPROVED

# Issue 06 review

Reviewed `git diff main...HEAD` (70bc35b9..9db40535, base 2cb58d75) in the worktree.

## Acceptance criteria

- [met] The failing guard test is written first and lists the current violations — 725632bf adds only `src/tests/lib/architecture/pure-logic.test.ts` and comes before every fix commit. Its message lists 15 violations. I re-ran the guard's walk over a `git archive 725632bf src/lib` tree with a probe script that copies the test's rules: 133 start files and the same 15 chains (10 through `properties.logic.ts:15 -> log.service.ts`, 2 through `wikilink/index.ts -> completion.ts -> @tauri-apps/plugin-fs`, plus `canvas-image.logic.ts:1 -> @tauri-apps/plugin-fs`). The Issue's 16th file, `rail-shell.types.ts`, is exempt under the types-file rule, as the Issue asks.
- [met] properties.logic.ts logs through a module-level diagnostics sink (configured once, synchronously, at the top of the `src/routes/(app)/+layout.svelte` script, the same place issue 21 calls `registerAppPorts()`; same shape as the profiling port in issue 31) instead of importing appendLog. Both sites use it: line 205 (dropped nested key, still emitted only on a cache miss) and line 405 (`dedupeCanonicalKeys`, also reached from `serializeProperties`). The YAML-warning `console.warn` at line 182 (Issue 41) is not an `appendLog` import and can stay. A test covers both, and a cache hit emits nothing — the `appendLog` import is gone from `properties.logic.ts`. It now has `configurePropertiesDiagnostics({ log })` with a no-op default (lines 17-35). Both sites call `diagnostics.log`: line 276 (nested key, inside `computeAndCache`, so only on a miss) and line 482 (`dedupeCanonicalKeys`). `(app)/+layout.svelte:25` makes the call synchronously, right after the imports and before `$props()`. `properties.logic.test.ts` no longer mocks log.service and installs a `vi.fn()` sink. The new test checks that both messages fire exactly once, in order, and that the second identical parse returns the same result with no calls. The existing `serializeProperties` collision test covers the `serializeProperties -> dedupeCanonicalKeys` path. All of these tests pass.
- [met] copy-block-link.logic and toc.logic import HEADING_RE/BLOCK_ID_RE from wikilink/navigation.logic, not from the barrel (which re-exports Tauri-backed completion.ts) — `copy-block-link.logic.ts:1` and `toc.logic.ts:1` now import from `wikilink/navigation.logic.js`. Running the probe on the branch tip shows both files are clean.
- [met] canvas-image.logic is renamed or moved to a .service.ts, and its test is updated — commit 9db40535 renames the file to `canvas-image.service.ts` with git similarity 100%. The test becomes `canvas-image.service.test.ts` with an updated import. `CanvasInner.svelte:42`, `ImageNode.svelte:5` and ADR-0023 point to the new name. A repo grep finds no `canvas-image.logic` under `src/`, `e2e/`, `docs/` or `scripts/`; the old name survives only in `.scratch` history notes and `graphify-out`.
- [met] The guard test passes with only the canvas @xyflow allowlist — `ALLOWLIST` has exactly the two entries `canvas.logic.ts -> @xyflow/svelte` and `canvas-history.logic.ts -> @xyflow/svelte`, and a stale-entry test guards it. `pure-logic.test.ts` passes. The probe on the branch tip finds 132 start files and 0 violations.

## Checks I ran

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/architecture src/tests/lib/features/properties src/tests/lib/features/canvas src/tests/lib/features/copy-block-link src/tests/lib/plugins/table-of-contents src/tests/lib/lib-specifier-convention.test.ts`: exit 0, 29 files, 896 tests passed. This run is what my test verdict rests on. It covers `pure-logic.test.ts`, `layer-rules.test.ts`, `feature-cycle.test.ts`, `import-graph.test.ts`, `properties.logic.test.ts`, `canvas-image.service.test.ts` and the other canvas tests, `copy-block-link.logic.test.ts`, and `toc.logic.test.ts` with its service, store and panel tests.
- The full suite and `pnpm build` were not run. Deliver runs them.
- The guard reuses `scanLib` from `scripts/import-graph.mjs` (issue 04's `extractImports`/`resolveSpecifier`), so there is no second walker. `layer-baseline.json`, `BASELINE_SIZE` and the composition-root list are unchanged.
- No source changes outside the Issue's scope. There is no `spec.md` for architecture-stability.

## Findings

1. minor — `src/tests/lib/architecture/pure-logic.test.ts:41`: the Svelte-package regex misses `@sveltejs/kit`, because `svelte` is followed by `j`. The guard also has no rule for SvelteKit's `$app/*` modules or for Svelte libraries without `svelte` in the name (`bits-ui`, `paneforge`). A pure file could import `$app/environment` or `@sveltejs/kit` and the guard would stay green. No pure file imports any of them today (I checked with grep). Fix: also forbid specifiers that start with `@sveltejs/` or `$app/`. The `bits-ui` gap is a documented default and can stay.
2. minor — `src/routes/(app)/+layout.svelte:25`: no test checks that the app wires the sink to `appendLog`. If someone deletes this line, the two PROPERTIES diagnostics are silently dropped, and every test still passes because the default sink is a no-op. The project has no route tests, so this is acceptable as is. A cheap optional fix is a source-scan assertion next to the guard that the layout calls `configurePropertiesDiagnostics({ log: appendLog })`.
3. nit — `docs/adr/0029-frontmatter-yaml-canonical-form.md:72` still says the nested-key drop is "logged via `appendLog('PROPERTIES', …)`". It now goes through the properties diagnostics sink, which the app wires to `appendLog`. Fix: reword the sentence in the deliver squash, or leave it, since the effect is the same.
4. nit — the 725632bf commit message lists the violations with pasted diff markers (`- +   "src/...`). Deliver's squash message should list them cleanly.

## Resolution

1. Fixed: `forbiddenPackage` also rejects specifiers starting with `@sveltejs/` or `$app/` (reason `SvelteKit`), with a test. The `bits-ui` / `paneforge` gap stays a documented default, as the review allows.
2. Fixed: a source-scan test in `pure-logic.test.ts` asserts `src/routes/(app)/+layout.svelte` calls `configurePropertiesDiagnostics({ log: appendLog });`.
3. Fixed: ADR-0029 now says the nested-key drop is logged through the properties diagnostics sink, wired to `appendLog('PROPERTIES', …)` by the app layout.
4. Fixed in deliver's squash message: the violations are listed without diff markers.
