VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `startsAtContentColumn` (parsers/fenced-code-block.ts:174-197) rejects a fence past its container's content column: top level column 0, blockquote within one space of the last `QuoteMark` before the fence on the fence line, list item at the marker's content column (marker + 1-4 spaces, else 1). New tests in fenced-code-block.test.ts:199-209 cover `>  `, `> >  `, a list fence one column past content, an ordered list, `1.  ` on the marker line and a bare marker line. My probe confirmed `-   item`, `-     item` (falls back to col 2), `10. item`, a nested list, `- [ ] task`, `>```demo` (no space), a quote in a list in a quote and a callout all still give the stripped content. The tab-inside-content sub-case is left open with a stated reason (YAML forbids tabs; JS / mermaid tolerate it); the rejection stands for that part. |
| 2 | nit | resolved | `content` is now built per line between the fences (fenced-code-block.ts:145-156) and joined by `\n`. Test fenced-code-block.test.ts:135-140: one blank line gives `''`, two give `'\n'`, also in a quote and a list item. Probe: interior blank lines are kept (`a\n\n\nb` top level, `a\n\nb` in a quote and in a list item). The per-line array can't be indexed past its end because only closed blocks reach it (`!block.closed` skip at line 140), so no CodeText lies on or after the closing fence line. |
| 3 | nit | resolved | Out of scope as the finding said; follow-up `.scratch/live-preview-audit/issues/07-plain-code-block-in-container-shows-last-line.md` opened (needs-triage). No source change for it. |

## Acceptance criteria

- [met] A meta-bind-button, mermaid, queryjs and collection block render inside a callout, a blockquote and a list item — special-fences-in-containers.test.ts (4 fences x containers matrix) passes on HEAD; the new column rule keeps the standard fence positions accepted (probe above).
- [met] Their content reaches the consumer without the container prefix: a meta-bind-button inside a callout shows its label and runs its actions; a parser-level test checks the stripped content for `> ` and for a list indent — the callout label / action tests pass; parser tests for `> `, nested `> >`, list indent, ordered list, quote-in-list and the new list-in-quote case pass.
- [met] A fence whose language only starts with a special name (```` ```mermaid-js ````) is still a normal code block; top-level special blocks render as today, and the existing parser and field tests pass — the mermaid-js and `demo-js` cases pass; the fix adds four parser tests and changes or deletes none (`git show e72e59ee` touches only additions in fenced-code-block.test.ts). The full suite is deliver's to run.

## Checks I ran

- `pnpm check`: exit 0, 212 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor/extensions/live-preview src/tests/lib/plugins/queryjs src/tests/lib/features/collection`: exit 0, 128 files, 2808 passed, 1 skipped, 1 todo (four more than round 1: the new parser tests).
- A temporary probe of `findSpecialFenceBlocks` on the edge inputs listed above, written under src/tests and deleted afterwards; the worktree is clean.
- Scope: the fix commit touches only fenced-code-block.ts, its test file, the review Resolution and the new Issue 07. No layer-baseline, BASELINE_SIZE or src-tauri change. Tabs only.

## Findings

1. nit — src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:192-194 — The list content column counts the tab after a marker as one column, so `-\titem\n\n  ```demo\n  a\n  ```` is now rejected and falls back to a plain code block (it rendered before this fix). A tab right after a list marker is rare and the fallback is visible and recoverable. Fix (optional): expand a tab in `rest` to the next multiple of 4 before computing `gap`, or accept it and mention tabs in the `startsAtContentColumn` JSDoc next to the existing tab-indented-fence note.
