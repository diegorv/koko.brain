# Issue 26: Delete sortTree and the dead sort-option feature

Status: ready-for-agent
Phase: P3 Track C step 1
Source: PONY B2 + #39 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track C — Filesystem/paths)
Blocked by: none

## What

The file-explorer sort-option feature is dead: `sortTree` and the option surface around it have no
live path. Delete both in one commit, including the orphaned store state left behind. Doing it now
pays the heavy `fs.service.test.ts` churn **before** the ARCH filesystem refactors add lines to the
same file.

## How

- **B2 + #39 in ONE commit** — they are the same feature; splitting them leaves a half-dead surface.
- Delete `sortTree` and the dead sort-option feature.
- **Decide the orphaned `sortBy` store state in the same commit** — do not leave it dangling for a
  later pass to rediscover. State the decision (delete vs keep) in the commit message.
- Delete by symbol, never by line range.
- The heavy `fs.service.test.ts` churn is paid here **before** Track C step 3 (`forgetNote`) and arch
  3.1 add lines to that file, so it is rewritten once.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Test collateral (the `fs.service.test.ts` churn included) lands in the same commit as the source
  deletion.
- Stage only the files related to this step (`git add <specific files>`), verify with
  `git diff --cached --stat`.
- One commit, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with
  line ranges).

## Comments
