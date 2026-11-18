VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | nit | resolved | `help/documentation/06-search-and-navigation.md:131` now reads exactly the wording review.md proposed. That wording is itself not exact for the Hybrid main path; see new finding 2. |
| 2 | nit | rejection stands | `discovery.md:17` lists `==` as stripped unconditionally, and `discovery.md:29` accepts that `*` is stripped everywhere for a preview. No code changed. |
| 3 | nit | resolved | `src/lib/utils/markdown-plain-text.ts:46` is now `/!?\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g`. The new test at `markdown-plain-text.test.ts:38-40` passes, and a probe confirms `[x](https://en.wikipedia.org/wiki/A_(b)) end` becomes `x end`. The fix regresses unbalanced URLs; see new finding 1. |
| 4 | nit | rejection stands | `discovery.md:38` records that `#heading` and `^block` suffixes stay as written. The Issue's "last segment" rule allows it. No code changed. |

## Acceptance criteria re-checked

- [met] Failing test first, `src/tests/lib/utils/<util>.test.ts`: the util strips headings, emphasis, `==highlight==`, `~~`, links, images, wikilinks (alias, else the last segment), checkboxes, list and quote markers, inline code, fences and callouts; keeps `<mark>`; tolerates a `...` cut and an unbalanced cut. Empty input returns an empty string. — `pnpm vitest run src/tests/lib/utils/markdown-plain-text.test.ts src/tests/lib/features/search/SearchResult.test.ts` exits 0 (2 files, 55 tests). No test was weakened or deleted: the diff adds one case only. The existing cut tests (`:81-92`) still pass. The new pattern leaves an unbalanced `(` inside a URL raw (finding 1), which is a rare case the tests do not cover.
- [met] The help section describes the new card. — `06-search-and-navigation.md:125-133` still describes the name, folder plus `§ heading`, plain snippet, Semantic-only score and fallback-only badge. One clause is not exact (finding 2). `settings-copy.test.ts` and `sync-wiki-docs.test.ts` exit 0 (18 tests).
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exits 0: 232 files, 0 errors, 0 warnings. The targeted test files above pass. The full `pnpm vitest run` is for deliver.

## Probes of the new link pattern

These ran with `node --experimental-strip-types` against the worktree util, and against the util at `06de94066` for comparison. The probe files are in the scratchpad, outside the worktree.

- Backtracking: the two alternatives `[^()]` and `\([^()]*\)` cannot match the same first character, so the star never has a choice to backtrack over. On inputs of 100k characters (`[a](` followed by `x`, `(x`, `(x)` or `x(` repeated, and `[a](` repeated) it runs in 0.1-1.4 ms. `"[".repeat(n)` is quadratic (about 1.1 s at 30k), but the old util takes the same time, so the cause is the older `[...]` patterns and not this fix. Snippets are short.
- Multiple links on one line: `[a](u1) and [b](u2) end` becomes `a and b end`, and `[x](a) (b) [y](c(d)) e` becomes `x (b) y e`. `[^()]` cannot cross a `)`, so a match never spans two links.
- Images: `![a](b) c` becomes `a c`, and `![a](img_(1).png) c` becomes `a c`.
- Text around the link: `(see [a](u)) end` becomes `(see a) end`, and `[x](a))b` becomes `x)b` in both versions.
- Regressions compared with the old util: see finding 1.

## Findings

1. minor, `src/lib/utils/markdown-plain-text.ts:46`: when the URL holds an unbalanced `(` or two levels of parentheses, the new pattern does not match, and neither does the end-of-string fallback at `:47` (it needs a URL with no `)`). The whole raw link then stays in the snippet. The old pattern removed these links, at worst leaving a stray `)`. Measured old and new output:
   - `[x](a(b) end`: old `x end`, new `[x](a(b) end`
   - `see [x](a (b) end`: old `see x end`, new `see [x](a (b) end`
   - `[x](https://en.wikipedia.org/wiki/A_(b)`, a Wikipedia link cut by the length limit right after the inner `)` (`search.logic.ts:90` cuts at a character offset): old `x`, new `[x](https://en.wikipedia.org/wiki/A(b)`
   - `[a](u((1))) end`: old `a)) end`, new `[a](u((1))) end`

   Fix: after the nested pattern, run the old `.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')` as a second pass, so links the nested pattern cannot match fall back to the old result. Add a test for `[x](a(b) end` and for the cut Wikipedia case.
2. nit, `help/documentation/06-search-and-navigation.md:131`: "When the text index finds the note, the matching terms are highlighted" is wrong on the main Hybrid path. `search_hybrid` builds its FTS-only entries with the `<mark>` tags stripped (`src-tauri/src/search/hybrid.rs:187`), and its chunk entries carry chunk text. So a Hybrid card shows no highlight even when the text index found the note. Fix: "Text mode results from the text index, and Hybrid fallback cards found by text search, show the matching terms highlighted." This also keeps out the in-memory Text fallback, which has no highlight.

## Resolution

- Finding 1 (fixed): a second pass with the old pattern `/!?\[([^\]]*)\]\([^)]*\)/g` runs after the nested-parentheses pattern in `src/lib/utils/markdown-plain-text.ts`, so links with unbalanced or deeper parentheses and links cut by the snippet window are stripped again. New test "still removes a link whose URL has unbalanced parentheses or is cut by the snippet window" covers `[x](a(b) end` and `[x](https://en.wikipedia.org/wiki/A_(b)`; it failed before the change and passes after it.
- Finding 2 (fixed): `help/documentation/06-search-and-navigation.md` now uses the suggested wording ("Text mode results from the text index, and Hybrid fallback cards found by text search, show the matching terms highlighted.").
