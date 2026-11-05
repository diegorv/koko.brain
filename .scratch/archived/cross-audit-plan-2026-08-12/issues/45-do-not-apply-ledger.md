# Issue 45: Do-not-apply ledger (tombstones)

Status: wontfix
Phase: P5
Source: PONY #57, PONY #64, ARCH 1.2 barrel, ARCH 4.1 merge collapse — plan-2026-08-12.md §P5 — Deferred / not applied
Blocked by: none

## What

A tombstone ledger. Each item below was analysed during the cross-audit and deliberately **not**
applied. The rationale is recorded here so a future agent re-deriving the same finding stops at this
file instead of applying it. Nothing in this issue is actionable.

## Why not

- **PONY #57 (`getWatcherCounters()` accessor) — REFUTED, never apply as written.** ADR-0017 is
  `status: active` and names `getWatcherCounters()` verbatim at line 45. The proposed "tests assert
  effects instead" swap would simply vanish **eight counter-only assertions** with nothing replacing
  them. **Re-decision condition:** only after issue 19's ADR-0017 supersede/rewrite has landed, and
  then only as the honest larger variant — delete the entire counters block *and* its assertions —
  **never** the as-proposed swap.
- **PONY #64 (delete the six decorator toggle names) — superseded by issue 08.** Refuted by
  construction: once issue 08 ships the `inlineExtensions(disabledDecorators)` plumbing, every one of
  the six names maps onto handlers already in the registry
  (`inline-extensions.ts:25-47,57`) and all 12 names at `help/documentation/19-settings.md:245`
  become true. #64's "mandatory doc edit" inverts into "no doc edit needed". Keep only #64's two
  corrections, already folded into issue 08's commit message: stale persisted keys are harmless via
  `settings.service.ts:143-146`, so a pre-wire toggle silently becomes honored.
- **ARCH 1.2 barrel (`clearAllWidgetCaches`) — optional, take or skip.** Only worth considering
  *after* issue 16's widget merge, at which point three clears remain rather than four; it would also
  need one teardown test. Zero urgency; skipping is a fine outcome.
- **ARCH 4.1 merge collapse (110-line generic merge) — optional, last or never.** A separable
  follow-up with **zero correctness value**. If it is ever taken, it goes last in the whole program.

## Gate

None — do not action.

## Comments
