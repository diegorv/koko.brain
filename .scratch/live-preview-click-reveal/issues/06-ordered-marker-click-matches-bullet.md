# 06: A click on a numbered list marker moves the cursor to the item, like a bullet

**Status:** resolved

Priority: P3 (inconsistent list marker clicks)

**What to build:** A click on a bullet glyph (`.cm-lp-ul-marker`) moves the cursor to its item and reveals the `-` marker. A click on a numbered marker (`.cm-lp-ol-marker`) does nothing: the cursor stays where it was and nothing reveals. Owner decision: the numbered marker behaves like the bullet.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview` (E2E)

**Source:** `.scratch/live-preview-click-reveal/report.md` section 3, `e2e/specs/live-preview/click-reveal/{ordered-marker,bullet-marker}.spec.ts`

- [x] `ordered-marker.spec.ts` "clicking the number glyph moves the cursor to its item and reveals the marker" passes with `test.fail()` removed
- [x] `bullet-marker.spec.ts` stays green
- [x] `e2e/specs/live-preview/lists.spec.ts` stays green

## Notes

- Owner decision (triage 2026-11-03).

## Comments

- 2026-11-03, branch `issue/06-ordered-marker-click-matches-bullet`: `OrderedListMarkerWidget.ignoreEvent()` returns `false`, so a click on the number moves the cursor to its item like a bullet; a vitest case pins the contract and the JSDoc states why. Tests: pnpm check 0 errors; simple-widget-handlers.test.ts 17 passed; full suite 457 files, 10573 passed, 1 skipped, 1 todo, build OK. Reviews: round 1 APPROVED (findings 1 and 3 fixed, 2 no change), round 2 APPROVED (no findings).
