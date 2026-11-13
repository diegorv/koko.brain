VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | 90ff1ed5 adds to "header click opens the embedded note" (wikilink-note-embed.spec.ts:75-78) a switch back to the `test.md` tab (the name `openAndSettle` uses, e2e/fixtures/click-reveal.ts:21), then `expect(page.locator(EMBED)).toHaveCount(1)` and `isRevealed(page, RAW_EMBED) === false`. The count assertion waits for the source note's editor: the "Missing note" tab has no `.cm-lp-embed`, so it cannot pass vacuously on the wrong tab. No existing assertion was removed or weakened. The spec passed. |
| 2 | nit | resolved | widgets.ts:637-640 now says `ignoreEvent()` already keeps CodeMirror from moving the cursor and that the stop is the rule-11 safeguard. Comment only, no code change. |
| 3 | nit | rejection stands | No change was made, and none was asked for: the first review's own trace found no double open on Cmd/Ctrl+click. |

## Acceptance criteria re-checked

- [met] `wikilink-note-embed.spec.ts` "header click opens the embedded note" passes with `test.fail()` removed — `test.fail()` is still absent. `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/wikilink-note-embed.spec.ts e2e/specs/embed-widgets.spec.ts`: exit 0, 7/7 passed, including this test with its new source-tab assertions.
- [met] The header's mousedown stops propagation (CLAUDE.md Live Preview rule 11), so the click does not move the cursor into the embed or reveal it — the fix round changed only the comment above the handler, so the stop is the same code as before. editor-host.test.ts is 24/24. The E2E now also checks that the source note keeps the embed rendered and not revealed after the click.
- [met] Failing first: an existing note embed opens that note's tab — the fix round did not touch this. editor-host.test.ts "opens an existing note through the host, with its anchor" still passes (24/24). The first review's failing-first probe against main's widgets.ts stands, because the only change to widgets.ts since then is the comment.

## Findings

None open or new.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor/editor-host.test.ts`: exit 0, 24/24.
- `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/wikilink-note-embed.spec.ts e2e/specs/embed-widgets.spec.ts`: exit 0, 7/7.
- Scope of the fix diff (01952ed5..HEAD, outside `.scratch`): the E2E spec and one comment in widgets.ts. Nothing touches the layer baseline, BASELINE_SIZE, the composition roots or src-tauri/.
- Not run (deliver's job): the full `pnpm vitest run`, `pnpm build`, and the full Issue E2E gate over `e2e/specs/live-preview`.
