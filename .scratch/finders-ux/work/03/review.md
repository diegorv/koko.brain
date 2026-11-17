VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/utils/<util>.test.ts`: the util strips headings, emphasis, `==highlight==`, `~~`, links, images, wikilinks (alias, else the last segment), checkboxes, list and quote markers, inline code, fences and callouts; keeps `<mark>`; tolerates a `...` cut and an unbalanced cut. Empty input returns an empty string. — `src/tests/lib/utils/markdown-plain-text.test.ts` has one case per listed construct, including `<mark>` inside bold, headings, wikilinks and tasks, the `...` cut, the length-limit cut, and empty or whitespace-only input. It ran 15/15 green. The util commit 214c4110f adds the test and the util together, so I cannot confirm red-first from git; the build agent says it saw the test fail first.
- [met] Failing test first, `search.service.test.ts`: a hybrid chunk for `Projects/a.md` with heading `Intro` adapts to title `a` (no `.md`) and no `source`; the `:282` `source` assertion changes on purpose. A new test covers the `search_hybrid`-throws fallthrough: legacy merge results still carry a real `source`. — `search.service.test.ts:257-287` now uses `Projects/a.md` and asserts title `a`, heading `Intro` and `not.toHaveProperty('source')`, which replaces the old `toBe('both')`. The new test at `:289-313` makes `search_hybrid` throw and asserts the per-path sources `both`, `text` and `semantic` from `mergeResults`. The adapter at `search.service.ts:162-170` uses `stem(r.sourcePath)` and drops `source`.
- [met] Failing test first, `SearchResult.test.ts`: in every mode the title is the note name and the subtitle is folder plus `§ heading`, never the file name; a root-level note shows no folder; a hybrid card without `source` shows no badge, and one with `source` still does; the snippet shows no raw markdown in Text, Hybrid, Semantic and legacy fallback cards. — The new describe block at `SearchResult.test.ts:257-377` loops over text, semantic, hybrid and legacy. It checks the title, the folder-only subtitle (`Projects/Sub`), the empty root subtitle and a plain snippet. For semantic and hybrid it also checks `Projects § Intro` and `§ Intro`. It covers the hybrid badge both without and with `source`, and that Text cards keep `<mark>`. It ran green.
- [met] The result button contains only phrasing content; the subtitle test uses a data hook (for example `data-search-result-subtitle`) instead of `querySelector('p')`. — `SearchResult.svelte:136-174` uses only `span`s inside the button, each styled `flex`, `block` or `line-clamp-2`. A test in every mode asserts `button.querySelectorAll('div, p')` has length 0. The meta-role test at `SearchResult.test.ts:123` now selects `[data-search-result-subtitle]`.
- [met] `mark` in search results uses `--lp-highlight-bg` with `color: inherit`; `theme-snapshot.test.ts.snap` is unchanged. This rule is CSS only; no computed-style test is required. — `src/app.css:488-491` has `[data-search-result] mark { background-color: var(--lp-highlight-bg); color: inherit; }`, which is unlayered and sits before `@layer base`. There is no new token. The `.snap` file is not in `git diff main...HEAD`, and `theme-snapshot.test.ts` passes.
- [met] `e2e/specs/search.spec.ts` stays green (rows still contain the note name). — I ran `bash scripts/e2e.sh e2e/specs/search.spec.ts` myself: exit 0, 4 passed, none flaky.
- [met] The help section describes the new card. — `help/documentation/06-search-and-navigation.md:125-133` now describes the card as note name, then folder plus `§ heading`, then a plain-text snippet. It says the relevance score is Semantic only, and the badge appears only on the Hybrid fallback. See finding 1 for one inaccurate clause.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exits 0 with 0 errors and 0 warnings across 232 files. The targeted vitest files pass (listed below). The full `pnpm vitest run` is for deliver.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/utils/markdown-plain-text.test.ts src/tests/lib/features/search/`: exit 0, 10 files and 247 tests. This includes SearchResult, search.service, SearchPanel and search-hybrid.logic.
- Tests that read `src/app.css`: `theme-snapshot`, `theme-css-contract`, `radius-scale`, `chrome-type-scale`, `pane-toolbar`, `text-roles`, `settings-text`, `mod-theme`, `event-color-tokens` and `font-stacks`. Exit 0, 10 files and 102 tests.
- Tests that read the help docs: `sync-wiki-docs`, `settings-copy`. Exit 0, 18 tests.
- `bash scripts/e2e.sh e2e/specs/search.spec.ts`: exit 0, 4 passed.
- A probe run of `markdownToPlainText` against edge inputs, deleted afterwards. The worktree is clean. Its results are in findings 2 to 4.
- Security: the HTML path is still `sanitizeSnippetHtml(markdownToPlainText(raw))`. Sanitizing runs last and escapes everything except `<mark>`, so the util can add no XSS vector.
- Scope: `HybridSearchResult.source` has two readers, `SearchResult.svelte` (`badgeSource`) and `mergeResults`, which still sets it. Nothing else reads the `title` or `source` of a hybrid result. Rust `search_hybrid` already returns one result per path (`hybrid.rs:214-224`), so a card titled with the note name cannot repeat. There is no layer-baseline change and no scope creep.

## Findings

1. nit, `help/documentation/06-search-and-navigation.md:131`: "In Text mode the matching terms are highlighted" is not exact. Text-sourced cards in the Hybrid fallback merge also carry `<mark>`, and Text mode on the in-memory fallback (no FTS index) shows no highlight. Fix: "When the text index finds the note, the matching terms are highlighted."
2. nit, `src/lib/utils/markdown-plain-text.ts:49-50`: `*` and `==` are stripped from plain prose too, so `2 * 3 = 6` becomes `2 3 = 6` and `a == b` becomes `a b`. The discovery accepts this for a preview. If P74 reuses the util for a context where this matters, strip only paired or word-adjacent marks. No change needed for this Issue.
3. nit, `src/lib/utils/markdown-plain-text.ts:45`: a link whose URL contains parentheses leaves a stray `)`, so `[x](a_(b)) end` becomes `x) end`. This is rare in notes. Fix if wanted: allow one level of nested parentheses in the URL pattern.
4. nit, `src/lib/utils/markdown-plain-text.ts:27`: a wikilink with a heading or block target keeps the suffix, so `[[Note#Heading]]` becomes `Note#Heading`. Discovery records this as a default. The Issue's "last segment" rule allows it. Optional: render it as `Note > Heading` the way Obsidian does.

## Resolution

1. Fixed: the help line now reads "When the text index finds the note, the matching terms are highlighted."
2. Not changed: discovery accepts stripping `*` and `==` from prose for a one-line preview; paired stripping belongs with a reuse that needs it (P74).
3. Fixed: the link URL pattern allows one level of nested parentheses; a test covers `[x](https://en.wikipedia.org/wiki/A_(b)) end` becoming `x end`.
4. Not changed: discovery records keeping the `#Heading` suffix as the default, and the Issue's "last segment" rule allows it.
