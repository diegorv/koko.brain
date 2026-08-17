# Issue 33: Clamp on commit + normalizeSettings

Status: ready-for-agent
Phase: P3 Track D step 4 (conflict C04, cluster C09)
Source: ARCH 4.1, C04 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track D — Settings) + §Conflicts resolved (C04)
Blocked by: 31-settings-persistence-owner, 32-settings-section-registry

## What

Clamp settings values where they are committed, and normalize the whole settings object at load and
before serialization. Two steps, two commits; step 1 is a user-visible bug fix.

## How

Two commits, in this order:

1. **Clamp-on-commit** via the **DOM `onchange` attribute** — safe **only after issue 31 (arch 4.0)
   removed the shadowing `onchange` prop**, per the "4.0 before 4.1 step 1" sequencing constraint.
   Ship as a **standalone bug-fix commit with a regression test** written first.
2. **`normalizeSettings`** wired at **load** and **before the stringify**. This is the **second,
   non-markup caller** that justified keeping the seven clamp wrappers in conflict C04 — the wrappers
   stay, with the one-line bodies issue 14 already gave them.

Hard constraints:

- **NEVER clamp inside `settingsStore.updateEditor`.**
- **The 110-line generic merge collapse is NOT in this issue** — it is deferred to P5 (see issue 45).
- `settings.logic.test.ts:15-152` must stay green unchanged — the behaviour-neutrality proof.

## Gate

Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build` before every commit. Stage only the
files for the current step, verify with `git diff --cached --stat`, and commit each step separately
using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
