# Issue 07: meta-bind plugin allocates the full doc per rebuild

Status: ready-for-agent
Phase: P0.7
Source: arch 1.1 sub-item — plan-2026-08-12.md §P0 — Live-bug surgical fixes
Blocked by: none

## What

The meta-bind input plugin calls `doc.toString()` on every decoration rebuild, allocating a string copy of the entire document per keystroke in large notes. The user feels it as typing and scrolling lag. Goal: typing in large notes stays smooth with no whole-document allocation.

## How

- Write the regression test FIRST (failing before the fix): pin that the rebuild path no longer materializes the full document string.
- Apply the `doc.toString()` one-liner in `meta-bind-input-plugin.ts`.
- Ship this standalone. It is explicitly INDEPENDENT of the arch 1.1 inline ViewPlugin fold, which is gated on `tasks/todo/audit-vault-and-freeze.md` 0.2/0.3 closing (P5). Do not start the fold here.
- No doc or ADR edits.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue (`git add <specific files>`), then verify with `git diff --cached --stat`.
- One commit for this fix, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges). Test collateral lands in the same commit as the source change.

## Comments

2026-08-17 (agent): Done.

- Red first: new test "never slices beyond the closing frontmatter fence during a rebuild" spies on `state.doc.sliceString` (the single materialization primitive — `Text.toString()` delegates to `sliceString(0)`) and failed against the old code with a full-doc span (13579 vs the 17-char frontmatter bound). Green after the fix.
- Fix: `buildMetaBindInputDecorations` now calls `parseFrontmatterProperties(frontmatterSlice(state.doc))`. `frontmatterSlice` returns '' unless line 1 is exactly `---`, then slices `[0, line.to]` of the first line >= 3 starting with `---`. Exact parity with the parser's `FRONTMATTER_REGEX` (start-anchored; non-greedy body ends at the first `\n---`, which is necessarily a line >= 3 start; '' and null both yield []).
- Parity pins added: frontmatter value reaches `widget.currentValue`; no-frontmatter and unclosed-fence docs yield null.
- Gate: `pnpm check` 0 errors, `pnpm vitest run` 290 files / 6703 passed, `pnpm build` green.
- Adversarial review (Fable 5): could not refute. Analytical regex-parity proof plus a 20k-case fuzz of the replica against real `@codemirror/state` (0 divergences); LRU cache keys on the identical group-1 substring so poisoning is structurally impossible; spy soundness verified against the dist `toString` implementation. Two nits, both declined as not warranting changes: `iterLines(3)` micro-opt for the pathological unclosed-fence scan; spy would not catch a hypothetical future `iter()`-join materialization.
- Discovery: `table-field.ts:16` has the same per-rebuild `parseFrontmatterProperties(state.doc.toString())` in its `checkUpdateAction`-driven ViewPlugin. Out of scope here; filed as issue 50.
