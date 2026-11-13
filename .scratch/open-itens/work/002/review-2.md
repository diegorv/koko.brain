VERDICT: APPROVED

Re-review round 2 of the fixes after f3ac4b428 (`git diff f3ac4b428..HEAD`: e817804aa plus the Resolution section in review.md).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | nit | resolved | e817804aa deletes the local `editorDoc` from frontmatter.spec.ts and imports it from e2e/fixtures/auto-organize.ts:42, whose body is identical (same `cmTile` back-reference, same error). The three call sites (frontmatter.spec.ts:70, 85, 94) are unchanged; `Page` is still used by `expectFrontmatterHiddenAndIntact`. The e2e spec passes (7 passed). |
| 2 | nit | rejection stands | No code change, as the review itself asked; `delete.cut` narrowing follows the Issue's step 1. The remaining action is deliver's: the squash commit's Behavior section must name that a cut over a pointer selection reaching 0 copies the hidden YAML but leaves it in the note. |

## Acceptance criteria re-checked

- [met] e2e: change frontmatter.spec.ts:53-65 so ArrowUp from the first body line keeps the cursor on that line (`activeLineText` stays the first body line, no hidden line is `.cm-activeLine`, the frontmatter stays hidden). Add `ControlOrMeta+Home` with the same expectation (`Mod-Home` is bound on every platform; `Cmd-ArrowUp` only on macOS). Add ArrowUp, then Backspace, then type `x`: the frontmatter stays hidden and intact and `x` starts the first body line. Add Alt+ArrowUp on the first body line: the frontmatter stays hidden and the first body line is unchanged. ArrowUp and PageUp need layout, so they are covered only here. Record the changed expectation in the commit message. — e817804aa only swaps the helper for the identical fixture export; no assertion changed. `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/frontmatter.spec.ts`: exit 0, 7 passed.
- [met] Gate: `pnpm check`, `pnpm vitest run` and `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/frontmatter.spec.ts` pass; the build report gives the e2e pass count. — `pnpm check` exit 0 (232 files, 0 errors, 0 warnings); e2e spec 7 passed. The fixes change no vitest file or app code; the full `pnpm vitest run` is deliver's to run.

## Findings

None open or new. The fix diff touches only the e2e spec and the review file: no app code, no test weakened (assertions untouched), no layer-baseline or BASELINE_SIZE change, no scope creep.

## Checks run

- `pnpm check`: exit 0.
- `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/frontmatter.spec.ts`: exit 0, 7 passed.
