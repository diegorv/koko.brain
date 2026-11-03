# 06: A click on a numbered list marker moves the cursor to the item, like a bullet

**Status:** ready-for-agent

Priority: P3 (inconsistent list marker clicks)

**What to build:** A click on a bullet glyph (`.cm-lp-ul-marker`) moves the cursor to its item and reveals the `-` marker. A click on a numbered marker (`.cm-lp-ol-marker`) does nothing: the cursor stays where it was and nothing reveals. Owner decision: the numbered marker behaves like the bullet.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview` (E2E)

**Source:** `.scratch/live-preview-click-reveal/report.md` section 3, `e2e/specs/live-preview/click-reveal/{ordered-marker,bullet-marker}.spec.ts`

- [ ] `ordered-marker.spec.ts` "clicking the number glyph moves the cursor to its item and reveals the marker" passes with `test.fail()` removed
- [ ] `bullet-marker.spec.ts` stays green
- [ ] `e2e/specs/live-preview/lists.spec.ts` stays green

## Notes

- Owner decision (triage 2026-11-03).
