# Issue 21: Merge the meta-bind and math widget pairs

Status: ready-for-agent
Phase: P3 Track A step 2
Source: PONY #24 + #16 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track A — Live preview)
Blocked by: 20-lp-parser-deletions

## What

Two widget pairs are near-duplicates: the meta-bind input widgets and the math widgets. Merge each
pair into one widget. Both merges carry a correctness constraint that must not be dropped, because
today's class identity is what silently keeps the two variants apart.

## How

- **#24 meta-bind widget merge:** the merged `eq()` **MUST compare input type and opts**. Class
  identity is today's ONLY barrier to a number widget being reused as a date widget — once the classes
  collapse, an `eq()` that ignores type/opts will happily reuse the wrong input.
- **#16 math widget merge:** the merged cache key **MUST include `displayMode`**. Keep the span/div
  swap (inline vs block element) and keep the **conditional empty-formula guard** — neither is
  redundant after the merge.
- Update the two clear call sites in `app-lifecycle.service.ts:75-76` and
  `app-lifecycle.service.ts:414-415` to the merged widgets' cache clears.
- Update `CLAUDE.md:231` (the widget-cache perf rule text) in the same series as the code it describes.
- Follows issue 20 so the parser deletions have already rewritten the shared LP test files.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Test collateral lands in the same commit as the source change; the widget tests must cover the
  type/opts comparison (#24) and the `displayMode` cache key (#16) explicitly.
- Stage only the files related to this step (`git add <specific files>`), verify with
  `git diff --cached --stat`.
- One commit per merge (#24, then #16), using the repo's full commit format (Context, Problem,
  Solution, Behavior, Files with line ranges).

## Comments

### 2026-08-18 - closing

Both merges landed in the issue's mandated order, one commit each: PONY #24 (meta-bind
number/date -> `MetaBindTextInputWidget`) first, then PONY #16 (block/inline math ->
`MathWidget`). Every correctness constraint the issue names survived: `eq()` compares input
type + opts (#24), and the cache key carries `displayMode` while the span/div swap and the
conditional empty-formula guard stay (#16).

| Step | Resolving SHA |
|------|---------------|
| PONY #24 - merge the meta-bind number/date widgets | `fa20cf63` |
| PONY #16 - merge the block/inline math widgets | this commit |

**Gate + review:**

- **PONY #24** (`fa20cf63`) - frontend gate green on `pnpm check` + `pnpm vitest run` +
  `pnpm build` (per-command counts were not recorded in that step's summary). Review: Fable 5
  sub-agent under the presumed-flawed stance, verdict could_not_refute, **0 fix rounds**.
- **PONY #16** (this commit) - frontend gate green, re-run at commit time: `pnpm check` 191
  files / 0 errors / 0 warnings, `pnpm vitest run` 281 files / 6304 tests passing (1 todo),
  `pnpm build` succeeded. Review: Fable 5 sub-agent under the presumed-flawed stance, verdict
  could_not_refute, **0 fix rounds**.

**Evidence in brief:**

- **#24 - the barrier that class identity used to provide is now explicit.** Before the merge,
  `eq()` in both classes compared only `bindTarget` + `currentValue`, so once the classes
  collapse an `INPUT[number():count]` and an `INPUT[date():count]` holding the same value at the
  same position compare equal and CodeMirror keeps the stale `<input type="number">` with
  `isNumericString` / "Not a number" still wired up. The merged `eq()` compares `inputType`
  first, and `META_BIND_TEXT_INPUTS` makes the type the single source of truth for the whole
  opts triple so `eq()` cannot drift out of sync with what it guards. Red-green: the three added
  regression tests (`eq()` false across input types at the same bindTarget + value; the date
  validator/message are not the number ones; `2026-04-28` renders a different element type and a
  diverging validity verdict per type) fail against a bindTarget/value-only `eq()`.
- **#16 - caller trace, verified at commit time.** `grep -rn` over `src/` for
  `block-math-widget`, `inline-math-widget`, `BlockMathWidget`, `InlineMathWidget` and
  `clearInlineMathCache` returns **zero** hits after the change. Both construction sites moved to
  the merged class with an explicit mode: `block-math-field.ts:20` -> `new MathWidget(block.formula, true)`,
  `simple-widget-handlers.ts:120` -> `new MathWidget(formula, false)`. There is no widgets barrel
  re-export of either deleted module, so nothing was orphaned.
- **#16 - the three hard constraints are in the code, not assumed.** Cache key at
  `math-widget.ts:47` is `` `${displayMode ? 'block' : 'inline'}:${formula}` ``; `eq()` at
  `math-widget.ts:70-72` compares `displayMode` alongside `formula`; the span/div swap is
  `math-widget.ts:32-33`; the empty-formula guard at `math-widget.ts:38-42` is explicitly
  block-only (`$$\n\n$$` hides its source lines, so an empty render would leave nothing visible;
  inline `$$` keeps going through KaTeX exactly as before the merge).
- **#16 - tests cover the cache key explicitly, as the Gate section demands.**
  `math-widget.test.ts:44` asserts the same formula produces distinct block vs inline markup,
  `:59` that neither mode's entry evicts the other, `:160` that `eq()` separates the two modes,
  and `:72` / `:80` that the guard fires for an empty block but not for an empty inline formula.
  `simple-widget-handlers.test.ts:132-140` now asserts the inline site constructs the widget with
  `displayMode === false`, which is what would catch a mode argument flipped at the call site.
  Suite total moves 6299 -> 6304 as 2 widget test files (141 lines each) collapse into 1 (245
  lines), which is why the file count moves 282 -> 281.
- **Cache clear call sites both updated**, as the issue's `## How` requires: the import at
  `app-lifecycle.service.ts:75` now points at `math-widget`, and `teardownVault()` at
  `app-lifecycle.service.ts:432` calls the single `clearMathCache()`; the second
  `clearInlineMathCache()` line is gone.
- **`CLAUDE.md:231` updated in the same commit as the code it describes**, per the issue.

**Discrepancy vs the issue text:** none. The issue and plan §P3 Track A step 2 agree, and the
landed shape matches both (#24 first, #16 second, one commit each, test collateral and this
comment in the same commits).

**Minor findings for follow-up (none blocking):**

- minor - carry-forward from the `fa20cf63` step, now **resolved by this commit**: the
  `app-lifecycle.service.ts` and `CLAUDE.md:231` edits listed at lines 22-24 of this issue were
  correctly deferred out of the #24 commit (they reference `clearMathCache` /
  `clearInlineMathCache` and the math widget cache rule; meta-bind has no cache), and the risk
  flagged then was that a correct deferral becomes an omission. Both landed here - verified
  above.
