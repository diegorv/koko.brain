VERDICT: CHANGES_REQUESTED

## Acceptance criteria

- [met] A failing test first in `import-graph.test.ts`: a `.svelte` fixture whose `<script>` block closes with `</script >`, and one with `<SCRIPT>`, both have their imports listed with correct line numbers — `src/tests/lib/architecture/import-graph.test.ts:46-73` adds both tests (with `</script >`, `</script\n>` and `<SCRIPT>`), asserting specifiers and lines 2, 6 and 4. I put main's `scripts/import-graph.mjs` back in the worktree and ran the file: 2 failed, 24 passed, and exactly those two tests failed. With the branch version restored, they pass.
- [met] `SCRIPT_RE` matches those forms, and the existing import-graph, layer-rules and feature-cycle tests pass with the baselines unchanged — `pnpm vitest run src/tests/lib/architecture/` exits 0 with 8 files and 75/75 tests passing (import-graph, layer-rules, feature-cycle, markdown-editor-imports and the others). `git diff main...HEAD -- src/tests/lib/architecture/layer-baseline.json` is empty, and BASELINE_SIZE is not touched.
- [met] `tag-extraction.ts` and `parsing.rs` are unchanged — `git diff --quiet main...HEAD -- src/lib/utils/tag-extraction.ts src-tauri/src/vault/parsing.rs` exits 0.

## Findings

1. **blocker**, `scripts/import-graph.mjs:54`: the new `SCRIPT_RE` still trips `js/bad-tag-filter`, so a high alert stays open at this location, and closing it is the point of the Issue. CodeQL's query (`shared/regex/codeql/regex/nfa/BadTagFilterQuery.qll` on github/codeql main, lines 167-178) has a final branch that flags a regex that matches `<script src="foo"></script>` but not `<script src="foo">foo</script foo="bar">` or `<script src="foo">foo</script\t\n bar>`. I probed it with node: `/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi` returns false on both strings. The uppercase branch (the message alert 145 shows today, "does not match upper case <SCRIPT> tags") goes away, but this branch takes its place, with the message "does not match script end tags like </script foo=\"bar\">". The Issue prescribed `\s*`, but its stated outcome ("Alert 145 closes on its own once the fix reaches main") does not follow from that regex. Fix: close with `<\/script\b[^>]*>`, i.e. `/<script\b[^>]*>([\s\S]*?)<\/script\b[^>]*>/gi`. A node probe matches all three CodeQL end-tag strings with it and still rejects `</scripts>` (it does not close a block early). `codeRegions`' new offset (`m[0].indexOf('>') + 1`) depends only on the opening tag and needs no change. Add a case to the whitespace test for `</script foo="bar">` (or `</script\t\n bar>`) that asserts the imports and the line numbers of the block that follows.
2. **nit**, `scripts/import-graph.mjs:53`: the JSDoc ("its closing tag allowing whitespace before `>`") must follow the fix in finding 1, e.g. "its closing tag allowing attributes or whitespace".
3. **nit** (existing gap, not caused by this branch, no change needed here): the opening tag's `[^>]*` stops at the first `>` even inside a quoted attribute, such as Svelte 5's `generics="T extends Array<X>"`. The code region would then start inside the attribute. No `.svelte` file under `src/lib` has a `generics` attribute with a `>` today (grep), and main's offset formula had the same limit.

## Other checks

- `pnpm check`: exit 0 (212 files, 0 errors, 0 warnings).
- Test verdict rests on these files: everything in `src/tests/lib/architecture/` (8 files, 75 tests, including `import-graph.test.ts`), run on the branch, plus `import-graph.test.ts` run against main's `scripts/import-graph.mjs` to confirm the new tests fail without the fix. The worktree was clean after the swap.
- I did not run the full suite or `pnpm build`; those are deliver's.
- Scope: the diff touches only `scripts/import-graph.mjs`, its test and the Issue's work folder, which matches the Issue's **Files** list.

## Resolution

1. **blocker**, fixed in `dab5c54f`: SCRIPT_RE is now `/<script\b[^>]*>([\s\S]*?)<\/script\b[^>]*>/gi`. New test "reads a script block whose closing tag carries attributes" (`src/tests/lib/architecture/import-graph.test.ts:64-81`) uses `</script foo="bar">` and `</script\t\n bar>` and asserts lines 2 and 6; it failed before the regex change and passes after. A node probe matches `<script src="foo"></script>` and both CodeQL end-tag strings, and rejects `<script>a</scripts>x`.
2. **nit**, fixed in `dab5c54f`: JSDoc reads "its closing tag allowing attributes or whitespace".
3. **nit**, no change: pre-existing gap the review marks as needing no change.
