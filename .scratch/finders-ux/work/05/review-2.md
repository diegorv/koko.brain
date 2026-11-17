VERDICT: APPROVED

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | minor | One `resultsCapped` flag for the last search, so a mode switch shows the previous mode's "+" | resolved | `search.store.svelte.ts:22` keeps `Record<SearchMode, boolean>`, the getter reads `resultsCapped[mode]` (`:48`), `clearResultsCapped()` and `reset()` clear all three. `search.service.ts` sets `hybrid` and `semantic` on the Rust hybrid path (`:196-199`), `hybrid` from `textCapped \|\| semanticCapped` on the legacy merge (`:309`), and `text` / `semantic` for the modes that wrote those lists (`:311-312`). The empty query and the outer catch call `clearResultsCapped()`. Early version-mismatch returns still skip every write, so a newer search owns the flags. No other caller of the old one-argument `setResultsCapped` remains (grep over `src`). Tests: store per-mode and clear-all tests, three service tests (legacy merge, Rust hybrid, text leaves semantic alone), and the panel test where Text at 50 then Semantic reads "1 result" and back to Text reads "50+ results". |
| 2 | minor | Text-mode input `pr-8` lets typed text run under the spinner at `right-7` | resolved | `SearchPanel.svelte:254` uses `pr-12` in Text mode and `pr-8` otherwise, matching `RailListSearch.svelte`. The spinner tests assert `pr-12` in Text and `pr-8` after the switch away. |
| 3 | nit | Help page said Hybrid returns at most 20, but the legacy merge can show up to 70 | resolved | `help/documentation/06-search-and-navigation.md:145` now names the fallback and its 70. 50 FTS + 20 semantic, so 70 is the right upper bound for `mergeResults`. Not capping the merge keeps the fallback's results unchanged. |

## Acceptance criteria re-checked

- [met] Failing test first: a text search whose `search_fts` mock returns exactly 50 rows shows "50+ results"; 49 rows show "49 results". Semantic returning 20 and the operator-only path returning 100 show "20+" and "100+"; an empty query clears the flag. The store getter has a test. — The `SearchPanel.test.ts` "result cap" block still drives the real `performSearch` for 50/49/20/100 and the empty query, and passes with the per-mode flag. The empty-query and failed-search service tests now set `'text'` and still assert the flag cleared. `search.store.test.ts` covers the getter per mode and `clearResultsCapped`.
- [met] No inline 50, 20 or 100 cap remains in `performSearch` or the logic helpers it calls. — The fix only renames `capped` to `textCapped` / `semanticCapped` and compares against the same named constants (`FTS_MAX_RESULTS`, `SEMANTIC_MAX_RESULTS`, `HYBRID_MAX_RESULTS`, `OPERATOR_ONLY_MAX_RESULTS`, `FALLBACK_MAX_RESULTS`). No literal cap was added.
- [met] `e2e/specs/search.spec.ts` stays green; help page 06 states the cap. — I re-ran `bash scripts/e2e.sh e2e/specs/search.spec.ts` in the worktree after the fix: 4 passed, exit 0. `help/documentation/06-search-and-navigation.md:145` states each mode's cap, the fallback's 70 and what "N+" means.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check`: exit 0, 0 errors, 0 warnings. Targeted tests `pnpm vitest run src/tests/lib/features/search/ src/tests/lib/app/AppShell.test.ts`: 11 files, 332 tests, exit 0. The full suite is deliver's to run.

## Findings

1. nit — `src/lib/features/search/search.service.ts:195` (Rust hybrid path, `setFtsResults([])`) with `SearchPanel.svelte:103` (Text mode shows `ftsResults || results`): the Rust hybrid path empties `ftsResults` but leaves both `searchStore.results` and the `text` flag. After a sequence of an operator-only Text query (say 30 rows in `results`), a capped FTS query (text flag true), then a Hybrid search, switching to Text shows the stale 30-row `results` list as "30+ results" until the new search lands. The stale `results` list is pre-existing behaviour, the window lasts only until the Text search returns, and the single flag before the fix was no better. Fix (optional, follow-up): have the Rust hybrid path also clear `results` and set the `text` flag to false, or leave the text list alone entirely.

## Other checks

- Typecheck: `pnpm check` exit 0.
- Tests: the 11 files above, 332 passed, exit 0. E2E search spec: 4 passed.
- No test was weakened or deleted: the changed assertions only move from `setResultsCapped(bool)` to `setResultsCapped('text', bool)`, and new tests were added.
- Scope: the fix touches only the search store, service, panel, their tests, help page 06 and the review file. No layer-baseline entry, no `BASELINE_SIZE` change, no composition root, nothing under `src-tauri/`.
- The comment at `search.logic.ts:10` ("sets `searchStore.resultsCapped`") is still accurate in spirit, since the setter now writes a per-mode entry the getter reads.
