# 25: Preserve pre-write history for append, daily capture and closed-note metadata writes

**What to build:** Extend the pre-write baseline delivered by 18 to deep-link prepend/append, daily-note append/prepend, and the closed-note frontmatter rewrite. A note with empty history retains its original bytes before these writers replace them.

**Files:** src/lib/features/deep-link/deep-link.service.ts, src/lib/app/deep-link-actions.ts, src/lib/core/frontmatter/frontmatter-write.service.ts, src/lib/core/editor/editor.hooks.ts, src/lib/features/file-history/file-history.service.ts, src/tests/lib/features/deep-link/, src/tests/lib/app/deep-link-capture-frontmatter.test.ts, src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts, src/tests/lib/features/file-history/
**Blocked by:** 18
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Frontend: `pnpm check` + `pnpm vitest run`.

## Acceptance criteria

- [ ] The deep-link prepend/append, the daily append/prepend and the closed-note frontmatter rewrite snapshot the pre-write bytes of a note with an empty history
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Scope and verification

Reuse 18's baseline mechanism and approved history policy. Exercise the actual writers and verify that the retained snapshot contains the original bytes, not just the appended or rewritten content. Preserve existing dirty-buffer preflight and refusal behavior. Do not expand this slice into unrelated writers or change retention policy.

## Provenance

Supersedes [open-itens 099](../../open-itens/issues/099-deep-link-prepend-append-daily-capture-closed.md), preserving its approved scope and both acceptance criteria. The predecessor was split from audit-2026-11-05 Issue 08 as Issue 154; the baseline prerequisite is now [18](18-history-baseline-retention.md). This is migrated backlog scope, not a newly executed reproduction.

## Comments

- 2026-11-25: Owner requested moving the remaining history-baseline dependent into this group and marking its predecessor wontfix.
