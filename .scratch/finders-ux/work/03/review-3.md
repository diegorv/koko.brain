VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `src/lib/utils/markdown-plain-text.ts:47-48` runs the old `/!?\[([^\]]*)\]\([^)]*\)/g` as a second pass after the nested pattern. The end-of-string fallback still runs third. The new test at `markdown-plain-text.test.ts:42-45` covers `[x](a(b) end` -> `x end` and the cut `[x](https://en.wikipedia.org/wiki/A_(b)` -> `x`, and it passes. A probe shows every round-2 regression case now matches the original util or improves on it (see below). |
| 2 | nit | resolved | `help/documentation/06-search-and-navigation.md:131` now reads "Text mode results from the text index, and Hybrid fallback cards found by text search, show the matching terms highlighted." That matches the code: `hybrid.rs:187` strips `<mark>` on the main Hybrid path, and the in-memory Text fallback has no highlight. |

## Acceptance criteria re-checked

- [met] Failing test first, `src/tests/lib/utils/<util>.test.ts`: the util strips headings, emphasis, `==highlight==`, `~~`, links, images, wikilinks (alias, else the last segment), checkboxes, list and quote markers, inline code, fences and callouts; keeps `<mark>`; tolerates a `...` cut and an unbalanced cut. Empty input returns an empty string. — `markdown-plain-text.test.ts` passes. The diff only adds the new test and changes no existing one. The round-2 unbalanced-URL gap is closed (finding 1).
- [met] The help section describes the new card. — `06-search-and-navigation.md:125-133` describes the name, folder plus `§ heading`, plain snippet, Semantic-only score and fallback-only badge, and the highlight clause is now accurate. `settings-copy.test.ts` and `sync-wiki-docs.test.ts` pass.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exits 0: 232 files, 0 errors, 0 warnings. `pnpm vitest run src/tests/lib/utils/markdown-plain-text.test.ts src/tests/lib/features/search/ src/tests/lib/core/settings/settings-copy.test.ts src/tests/scripts/sync-wiki-docs.test.ts` exits 0: 12 files, 267 tests. The full `pnpm vitest run` is for deliver.

## Probes of the two-pass interaction

These ran with `node --experimental-strip-types` against the worktree util, the util at `06de94066` (before round 2) and the util at `1d85c29e2` (round 2). The probe files are in the scratchpad, outside the worktree.

- A balanced Wikipedia link followed by prose: `[x](https://en.wikipedia.org/wiki/A_(b)) (note) end` gives `x (note) end`, where the original util gave `x) (note) end`. The first pass takes the link before the second pass sees it, so the second pass cannot reach into `(note)`.
- Plain prose parentheses: `[a](u) (b)` gives `a (b)`, `[a] (b) [c](d)` gives `(b) c` (the same as both earlier versions: `[a]` is the checkbox line marker), and `[a](b(c) (d) e` gives `a (d) e`. In each case the second pass stops at the URL's first `)`, which needs `](` right before it.
- Several links on a line: `[a](u1) and [b](u2) end` gives `a and b end`, `[a](u) (b) [c](d) e` gives `a (b) c e`, `[a](u)[b](v)` gives `ab`, and `[a](u(b) then [c](d)` gives `a then c`.
- Order with the end-of-string fallback: `[a](u) then [b](https://exa` gives `a then b`, `[a](u(b) then [c](https://exa` gives `a then c`, `read [the guide](https://exa` gives `read the guide`, and `[x](https://en.wikipedia.org/wiki/A_(b` gives `x`. The two `g` passes cannot match an open URL with no `)`, so the end-anchored pass still gets it.
- Images and highlights: `![a](img_(1).png) c` gives `a c`, where the original gave `a.png) c`. `[x](<mark>a</mark>) e` gives `x e`.
- Unchanged from the original: `[x](a))b` gives `x)b` and `[a](u((1))) end` gives `a)) end`.
- Timing: `"[a](".repeat(k)` with no `)` is quadratic again in the second pass (about 220 ms at 40k characters). The original util takes the same time (236 ms), so this is the pre-round-2 behavior, not a new cost. Snippets are an FTS5 `snippet()` or a short window cut at `search.logic.ts:90`, so real inputs stay far below that size. Inputs with balanced URLs or one stray `(` run in 0.6-2.6 ms at 100k characters.

## Findings

None open or new.
