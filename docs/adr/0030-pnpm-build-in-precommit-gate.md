---
type: ADR
id: "0030"
title: "pnpm build joins the pre-commit gate for frontend changes"
status: active
date: 2026-08-11
---

## Context

[0007](0007-testing-strategy-real-stores.md) established the pre-commit gate: `cargo test` for Rust changes, `pnpm check` + `pnpm vitest run` for frontend changes, all of them for mixed changes. That gate held for four months and this ADR does not disturb the rest of 0007 — real stores over mocks, the three test tiers, and the no-commit-without-tests rule all stand unchanged.

What surfaced the gap was a dependency update. `pnpm update --depth Infinity` (8ac6fc8) moved sixteen transitive packages, two of them on vite's bundling path: `rolldown` 1.2.1 -> 1.2.2 and `es-module-lexer` 2.1.0 -> 2.3.1. Both gate commands passed and the commit was made. `pnpm build` was run afterwards, out of caution rather than obligation, and it passed too — so nothing broke. But the gate had no way of catching it if it had, and the commit had already landed by the time anyone looked.

The near-miss is the point. Nothing about that change was unusual enough to prompt extra care by itself.

## Decision

`pnpm build` is the third command in the frontend gate. Frontend changes now require `pnpm check` + `pnpm vitest run` + `pnpm build`; mixed changes require all four commands.

The "Frontend only" trigger is also widened to name `package.json` and `pnpm-lock.yaml` explicitly. The change that prompted this ADR touched neither `src/` nor styles, and read as only ambiguously covered by "config" — the kind of ambiguity that gets resolved in favour of skipping.

## Rationale

vitest never runs the production bundler. It has its own transform pipeline, so an entire class of failure clears both existing gate commands and still breaks `pnpm build`:

- Dependency bumps that move `rolldown`, `vite` or `es-module-lexer` — the case that prompted this.
- Circular imports, which vitest tolerates and the bundler does not.
- adapter-static prerender failures, which only exist at build time.

For a Tauri app the production build is what actually ships. A green test suite sitting on top of a broken build is the worst available split: maximum confidence, zero coverage of the artefact users receive.

The cost is ~17s, against a suite that already takes ~12s and a type check on top of that. Cheap enough that a conditional rule ("run the build when you touch dependencies") is not worth its own judgement call — conditional gates get skipped, uniform ones get run.

## Alternatives considered

**Run `pnpm build` only for dependency or build-config changes.** Cheaper on paper, but it requires correctly classifying the change before knowing whether the classification mattered. The commit that prompted this ADR is precisely the case that a human or agent would have classified as "just a lockfile bump, tests are enough". A gate that depends on recognising the risky case cannot catch the case you failed to recognise.

**Move the build to CI only.** CI already builds, so this is genuinely redundant coverage. Rejected because the repo's whole commit convention (0016) is built on each commit being independently reviewable and revertable — a commit that breaks the build and is only discovered three commits later defeats that, and bisecting across a broken window is exactly the cost 0016 was written to avoid.

**Add E2E to the gate as well.** Rejected as disproportionate: `bash scripts/e2e.sh` starts a server and drives Playwright, an order of magnitude more expensive than the build, with failure modes dominated by flake rather than by real regressions.

## Consequences

- Every frontend commit costs ~17s more. Accepted.
- Bundler-level breakage is caught before the commit rather than after.
- The gate is stated in four places — CLAUDE.md (Quick Reference rule 6 and the Plan Mode sequence), docs/COMMITS.md and docs/TESTING.md. They must stay in sync; 0007 and 0016 quote the older three-command form and are deliberately left untouched, per the immutability rule in [README](README.md).

## Notes

Supersedes nothing. 0007 remains active: this ADR extends one line of it and leaves its substance alone.
