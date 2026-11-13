# Issue 03 discovery

No `spec.md` for architecture-stability. Docs Issue plus one probe test. Issue 01's decision (option B)
is in `CLAUDE.md:308-318` and `.scratch/architecture-stability/issues/01-review-deliver-phase-fixes.md`.

## Files that change

- `src/tests/lib/svelte-derived-sync.test.ts` (node env, server runtime: fresh, re-runs per read) and
  `svelte-derived-sync.client.test.ts` (jsdom, client runtime: fresh, memoized) + fixture
  `src/tests/fixtures/derived-sync.svelte.ts`. Found while probing: node resolves the server
  runtime (`svelte/src/internal/server/index.js:495-511`), whose module-level derived is not memoized.
- `docs/adr/0034-derived-allowed-behind-store-getters.md` (new), supersedes 0005.
- `docs/adr/0005-svelte-runes-getter-stores.md:5-6`: `status: superseded`, `superseded_by: "0034"`; body untouched (README rule).
- `docs/adr/0014-supply-chain-pnpm-quarantine.md`: dated amendment (security.yml:23-36, 55-81, 83-113; dependabot.yml:19-26; pnpm-workspace.yaml).
- `docs/adr/0016-plan-mode-commit-per-task.md`: dated amendment (squash per Issue, option B, line refs, gate with `pnpm build`).
- `docs/adr/README.md:5,92,99-100`: dated amendments for factual drift allowed, reversal needs supersession; index rows 0005 and 0034.
- `CLAUDE.md:16` (rule 3), `:63-71` (structure), `:81` (utils row), Layer Rules debt note, `:166-174` (logging), `:193` (Testing key rule).
- `docs/PATTERNS.md:9-24`, `docs/TESTING.md:25`.

## Plan

1. Probe test first (fixture + test), run it; break the getter by hand once (return a captured stale value) and see it fail.
2. ADR-0034 + 0005 frontmatter + README index/rules.
3. 0014 and 0016 amendments.
4. CLAUDE.md, PATTERNS.md, TESTING.md rewrites.
5. Targeted checks: `pnpm check`, the probe test, `src/tests/lib/architecture/` (cites ADR paths? grep tests for changed text).

## Prior art

- Store tests under `src/tests/lib/core/**` import real `.svelte.ts` stores directly; no extra setup (vitest.config.ts compiles runes via vite-plugin-svelte).

## Defaults taken

- The ADR-0005 body stays as written (README: superseded bodies are not edited), so `grep derived docs/` still hits 0005 as history; every live rule (CLAUDE.md, PATTERNS, TESTING, README index title) is rewritten.
- Debt note cites `src/tests/lib/architecture/layer-baseline.json` (ADR-0003 2026-11-01 amendment), no counts that go stale.
- Logging section: `debug()` / `error()` from `#lib/utils/debug.js` is the idiom; `appendLog` stays documented as the raw file writer that `debug()` calls when `debugLogToFile` is on.

## Risks

- Docs only apart from the test; no app code. The probe could be flaky if Svelte changes derived semantics: that is the point of pinning it.
