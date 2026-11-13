# 254: Two flaky tests pass reliably: the tab-strip scroll e2e and the Auto Organize count test

**Origin:** filed by the main session on 2026-11-12 from the deliveries of that day (tasks-view-ux 074, 109, 115, 116, 117, 121 and open-itens 015, 075). Owner approved merging the two into one Issue.

**What to build:** Two tests fail without a code change, and each failure costs a delivery a second full run or a false alarm.

1. **`e2e/specs/tabs.spec.ts`, "the active tab scrolls into view in an overflowing strip".** It fails on main by a sub-pixel: the active tab's right edge lands at 550.1875 against a strip edge of 550 (`expect(t.x + t.width).toBeLessThanOrEqual(s.x + s.width)`). First find out which it is, and say so in the delivery:
   - the app rounds the scroll so a tab can end up a fraction of a pixel past the strip edge (then fix the scroll code so the tab is fully inside, and keep the strict assertion); or
   - the bounding boxes differ only by layout rounding the user cannot see (then compare with a 1 px tolerance, and say why in a comment next to the assertion).
2. **`src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts`, "hides the previous count while the typed filter is not counted yet, then counts it".** Its `vi.waitFor` times out when the full suite runs under load (seven deliveries on 2026-11-12), and it passes alone (91/91). Make the wait deterministic: drive the debounce and the count's promise with fake timers or an explicitly resolved mock instead of waiting on real time, so the test passes the same way under load. Do not raise the timeout, do not skip the test, and do not weaken what it asserts.

**Blocked by:** none

**Status:** resolved

**Answered:** owner, 2026-11-12: fix both in one Issue.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/tabs.spec.ts` (relay-lite's checks do not run e2e: the build step runs this spec and reports its pass count, and the reviewer runs it again as a probe). Do not run the whole e2e suite.

- [x] The tab-strip test passes three runs in a row (`bash scripts/e2e.sh e2e/specs/tabs.spec.ts`, three times), and the delivery says whether the cause was the app's scroll or layout rounding, with the evidence.
- [x] If the cause was the app: a test that fails before the scroll fix shows the active tab fully inside the strip after it.
- [x] `AutoOrganizeRuleRow.test.ts` still asserts the same behavior (the previous count hides while the typed filter is not counted, then the new count shows) and no longer waits on real time.
- [x] `pnpm vitest run src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts` passes alone, and the full suite passes on the first run.

## Notes

- **Size:** S.
- The two parts share no file; they are grouped only to save a relay run.

## Comments

- 2026-11-12: filed by the main session.
- 2026-11-12: delivered from issue/254-two-flaky-tests-pass-reliably. Tab-strip e2e now allows sub-pixel overhang (layout rounding, not app scroll); AutoOrganizeRuleRow count test drives the debounce with fake timers. Full suite: 633 files, 16460 passed, 54 skipped, exit 0. Review round 1: APPROVED, no findings.
