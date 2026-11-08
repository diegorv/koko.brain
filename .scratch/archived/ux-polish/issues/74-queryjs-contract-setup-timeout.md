# 74: The QueryJS help contract test stops timing out its setup under full-suite load

**What to build:** `src/tests/help/queryjs-contract.test.ts` runs every help example block and script (about 128 runs, sequentially) inside one `beforeAll` (about line 404), under vitest's default 10 000 ms hook timeout. On 2026-11-04 that hook timed out in at least five full-suite runs during ux-polish deliveries (Issues 05, 04, 17, 20, 36), always under load from parallel worktrees, and the file passed 133/133 each time it ran alone. Each timeout cost a full-suite rerun and, once (Issue 17), a delivery against a red suite. Make the setup reliable under load without hiding a real slowdown:

- Measure first: log how long the hook takes alone and under a full parallel suite (record the numbers in the commit).
- Then either give the hook an explicit, commented timeout sized from those numbers (for example `beforeAll(fn, 60_000)` with the reason in a comment), or split the setup so no single hook runs all examples (for example per example file in its own `describe` with its own `beforeAll`), or both.
- Raising a timeout is a threshold change: the commit says why the new value is still tight enough to catch a real regression (it must stay well under a multiple of the measured load time, not "infinite").

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] The measured setup time alone and under full-suite load is recorded in the commit body
- [x] Every assertion the file makes today is kept; no example is skipped or removed
- [x] If a timeout is raised, it is set on this hook only (not globally in the vitest config) and carries a comment with the reason

## Notes

- **Source:** repeated load flake seen across ux-polish deliveries on 2026-11-04 (Issues 05, 04, 17, 20, 36 run logs under `brain.worktrees/test-logs/ux-polish/`).
- **Owner:** filed on 2026-11-04 at the owner's request, not to run that day.
- **Rule:** CLAUDE.md "Never weaken, skip or delete tests, thresholds or acceptance criteria": a timeout bump needs the measured justification above, not just a bigger number.
- **Owner (2026-11-05):** no repeated full-suite load runs as proof; the measurement and the normal gate are enough.
- **Size:** S.

## Comments

- 2026-11-05, branch issue/74-queryjs-contract-setup-timeout: the QueryJS help contract test's setup hook gets its own commented 30 s timeout sized from the measured setup time alone and under full-suite load; all assertions kept. Targeted: pnpm check exit 0; queryjs-contract.test.ts 133/133. Full suite at 578ca1987: vitest 499/499 files, 11855 passed, 1 skipped, 1 todo; pnpm build ok. Reviews: round 1 APPROVED, round 2 APPROVED (one nit on the commit body wording, fixed in the squash body).
