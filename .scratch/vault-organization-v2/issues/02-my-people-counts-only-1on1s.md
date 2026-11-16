# 02: My People counts only 1:1s

**Origin:** brain-os-vault (`diegorv/koko.brain-os`) `.scratch/vault-organization-v2/issues/04-my-people-counts-only-1on1s.md`, moved here on 2026-11-13. The vault layout it serves is `docs/vault-organization.md` in that repo.

**What to build:** Count only notes with `kind: one-on-one` (or the 1:1 template's tag) when computing days since the last 1:1.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`

- [x] Failing test first, reproducing the problem; it passes after the change.
- [x] A group meeting `_related_to` a direct report does not reset their counter; a 1:1 does.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Problem

**My people** counts any note `_related_to` a person as a 1:1, so a group meeting related to a direct report resets that report's overdue counter.

## Evidence

- `src/lib/plugins/one-on-one/one-on-one.logic.ts:139-188`.
- The 14 direct reports now carry `_one_on_one_every: true` (vault).

## Comments

- 2026-11-13, triage: ready-for-agent, P2.
- 2026-11-16, delivery (branch issue/02-my-people-counts-only-1on1s): My people counts only notes with `kind: one-on-one` or tag `type/meeting/one-one`; New 1:1 writes the kind (quoted keys respected); help page updated. Review round 1 APPROVED (nits fixed: constants module-private, quoted `kind` key), round 2 APPROVED. Full suite at 6588b4c4: 639 files, 16983 passed, 0 failed; `pnpm check` 0 errors.
