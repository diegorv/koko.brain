# 03: ADR-0034 allows $derived in stores; fix ADR and CLAUDE.md drift

**What to build:** Add `src/tests/lib/svelte-derived-sync.test.ts`. It pins that a module-level `$derived` / `$derived.by` in a `.svelte.ts` fixture reads fresh, synchronously, after a `$state` write under vitest.config.ts. A probe passed on 2026-11-01 with Svelte 5.57.2 and vitest 5.0.5.

Write ADR-0034, which supersedes 0005:
- stores still expose getters, because Svelte forbids exporting derived state from a module (`node_modules/svelte/src/compiler/errors.js:134`: "Cannot export derived state from a module"); cite it in the ADR;
- a getter may return a module-level `$derived` when memoizing pays off;
- existing getters stay as they are, with no mass migration;
- every computed value keeps its test.

Set 0005 to `status: superseded`, `superseded_by: "0034"`. Rewrite CLAUDE.md Quick Reference rule 3, the Testing key rule, PATTERNS.md:9-24 and TESTING.md:25 to match.

ADR amendments:
- **0014:** `dependency-review-action` is not used; `quarantine-aware-audit.mjs` (security.yml:36) replaced `pnpm audit`; the workspace snippet is not complete; update the line references; add the Actions cooldown (14 days; the npm and cargo 5-day cooldowns are already in the 2026-10-29 amendment); mention the gitleaks and osv-scanner jobs.
- **0016:** relay-lite delivers one squash per Issue, and the sub-commits become unreachable; record the option chosen in issue 01; fix the stale "CLAUDE.md lines 259-305" citation and the frontend gate that lacks `pnpm build` (ADR-0030).
- **docs/adr/README:** allow dated amendments for factual drift, and require supersession when a decision is reversed. 12 ADRs already carry in-place amendments (0001, 0002, 0008, 0009, 0014, 0015, 0016, 0024, 0025, 0026, 0029, 0032), against a README that says ADRs are immutable once active.

CLAUDE.md fixes:
- the project-structure list (missing note-action-bar, note-list, rail-shell);
- the logging section: the actual idiom is `debug()`/`error()` from utils/debug.ts in 51 files;
- the utils layer row: `utils/debug.ts` and `utils/app-channel.ts` import core;
- note the known core->features violations as debt (baselined by issue 04), not as a rule that holds.

**Blocked by:** 01

Issue 01's decision is recorded in the ADR 0016 amendment.

**Status:** resolved

**Gate:** `pnpm vitest run src/tests/lib/svelte-derived-sync.test.ts` + `pnpm check`

**Source:** docs/adr/0005*, 0014*, 0016*, docs/adr/README.md, docs/PATTERNS.md, docs/TESTING.md, CLAUDE.md, src/lib/utils/debug.ts, .github/workflows/security.yml, .github/dependabot.yml

- [x] The probe test passes, and fails if the fixture's getter is replaced by a stale cached value (checked by hand once)
- [x] ADR-0034 cites the test, the Svelte and vitest versions, and "no mass migration"
- [x] No doc still says $derived does not work in vitest (`grep -rn "derived" CLAUDE.md docs/`)
- [x] The 0014/0016 amendments cite paths and line ranges; the 0016 amendment states the squash-per-Issue reality and the issue-01 decision; the ADR index is updated

## Notes

- **Size:** S.
- **Why early:** agents follow ADRs and CLAUDE.md literally, so stale rules produce wrong code.

## Comments

- 2026-11-01, branch `issue/03-adr-0034-derived-in-stores-and-doc-drift`: probe tests `src/tests/lib/svelte-derived-sync*.test.ts` pin module-level `$derived` behind getters; ADR-0034 supersedes 0005; ADR-0014 and ADR-0016 amended; CLAUDE.md, PATTERNS and TESTING aligned. Deliver fixed the review's five findings (utils/ row keeps the rule plus the exception, ADR-0016 amendment scoped to relay-lite, ADR-0005 superseded-reason, two stale vitest rationales, follow-up Issue 50 for ADR-0015). Tests: `pnpm check` 0 errors; full suite 386 files, 9304 passed, 1 skipped, 1 todo, `pnpm build` ok (exit=0). Review round 1: APPROVED.
