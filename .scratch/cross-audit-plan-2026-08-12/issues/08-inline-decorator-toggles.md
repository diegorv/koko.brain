# Issue 08: Wire the six dead inline decorator toggles

Status: ready-for-agent
Phase: P1.1 (conflict C01)
Source: arch 1.1 plumbing slice; supersedes PONY #64 (dropped) — plan-2026-08-12.md §Conflicts resolved (C01) and §P1 — Conflict decisions that unblock everything
Blocked by: none

## What

Six Troubleshooting decorator kill-switches are dead UI: toggling them disables nothing, because the inline extension assembly ignores `disabledDecorators`. Goal: the user can isolate a misbehaving live-preview feature from the Troubleshooting pane, and all 12 documented toggle names become true.

## How

- Ship `inlineExtensions(disabledDecorators)` plumbing: a name to handlers table plus two array filters, roughly 15 lines. Call it from `live-preview.ts:64`.
- Every one of the six "dead" names already maps onto handlers in the registry at `inline-extensions.ts:25-47,57`. Filter those registries; keep `metaBindInput` wired.
- One small commit, with a test asserting a disabled name removes its handler and leaves the others intact.
- C01 resolution rationale (record it in the commit message): WIRE wins over delete. CLAUDE.md:241, the ADR-0008 Consequences bullet, and the open freeze hunt (`tasks/todo/audit-vault-and-freeze.md:9-10`, candidate causes a/e are inline-handler paths) all depend on inline isolation. After the wire, all 12 names in `help/documentation/19-settings.md:245` are true, so #64's "mandatory doc edit" inverts into "no doc edit needed", and #64 is DROPPED as refuted by construction.
- Keep #64's two corrections: stale persisted keys are harmless via `settings.service.ts:143-146`; a pre-wire toggle silently becomes honored. State that in one line of the commit message.
- This plumbing is deliberately split out of arch 1.1 because it is NOT gated on the freeze investigation. Do not pull the fold in.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue (`git add <specific files>`), then verify with `git diff --cached --stat`.
- One commit, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges). Test collateral lands in the same commit as the source change.

## Comments
