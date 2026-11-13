# 01: Move collision is silent

**Origin:** brain-os-vault (`diegorv/koko.brain-os`) `.scratch/vault-organization-v2/issues/01-move-collision-is-silent.md`, moved here on 2026-11-13. The vault layout it serves is `docs/vault-organization.md` in that repo.

**What to build:** On `targetExistsError` in the auto-organize move path (`src/lib/features/auto-organize/auto-organize.service.ts:336-343`), pick a free name with a ` 2` suffix the way `applyRename` does (links updated), complete the move, and show a toast naming the note and its new name.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first, reproducing the problem; it passes after the change.
- [ ] Filing a second `Untitled Task` lands as `Untitled Task 2`, its links are updated, and a toast names the note and its new name.
- [ ] No silent failure remains in the move path.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

On `targetExistsError` in the auto-organize path, either pick a free name the way `applyRename` does (and update links), or show a toast naming the note and the destination. The vault already lists stuck notes under **Not filed** in the weekly note; that stays as a safety net.

## Problem

A rule move into a folder that already holds a file with the same name fails with no signal. The note stays where it was created and every later save fails the same way. Type-sidebar notes are all named `Untitled <Type>` and deduped only inside their creation folder, so the second untitled Task collides in `vault/work/tasks/`.

## Evidence

- `src/lib/core/filesystem/fs.service.ts:306-325`: an existing target throws `targetExistsError`.
- `src/lib/features/auto-organize/auto-organize.service.ts:336-343`: the error is caught, logged, and the run returns.
- `src/lib/features/type-definitions/type-definitions.service.ts:85`: `Untitled ${typeName}`.
- `help/documentation/22-auto-organize.md:432-442`: the rename action already numbers duplicates (` 2`).

## Comments

- 2026-11-13, triage: ready-for-agent, P1. Decided: on a collision, pick a free name with a ` 2` suffix the way `applyRename` does (links updated), and show a toast naming the note and its new name.
