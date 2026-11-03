VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `docs/LIVE-PREVIEW.md:35` now says the press is "above, below or level with the widget's box" and lists the widget's own `.cm-line` padding level with the box as the first of three keep-the-selection zones. Matches the code: `block-band-click.ts:94` returns `{ pos: null }` for `dir === 0` after the line/buffer target and `soleBlockWidget` checks, and the doc comments at `block-band-click.ts:72-77,104-111`. |
| 2 | nit | resolved | Recorded in the same doc entry: "During a drag that started in a band, a pointer over one of these zones puts the head back on the drag's anchor". Matches `block-band-click.ts:127` (`band.pos ?? anchor`). No code change, as the finding asked. |
| 3 | nit | resolved | `table.spec.ts:79-84` now calls `clickLeftOfWidget(page, table(page))`. The fixture (`e2e/fixtures/click-reveal.ts:175-184`) does the same probe, the same `padding >= 2` precondition, the same `-ceil(padding/2)` offset and throws unless the hit is `DIV.cm-line` in its own line, so no assertion was weakened (a failed precondition still fails the test, by throw instead of `expect`). The post-click assertions (`expectRendered`, cursor on "End line.") are unchanged. `lineBandProbe` and `clickAtOffset` are still used elsewhere in the file (lines 45-100), so no orphaned imports. |
| 4 | nit | rejection stands | Pre-existing flakes in `collection-block.spec.ts` and `mermaid.spec.ts`; the fix commit touches neither spec nor the code they exercise. |
| 5 | nit | rejection stands | Optional and outside the criteria (left side only). The right padding goes through the same `dir === 0` branch, which ignores `clientX`. |

## Acceptance criteria

- [met] Failing first: an E2E test in `table.spec.ts` that clicks left of the table at its vertical center and asserts the table stays rendered, the source stays hidden and the cursor stays where it was; record the hit element in Notes — the refactored test at `table.spec.ts:79-84` presses at the same point through `clickLeftOfWidget` (hit asserted `DIV.cm-line`, own line), then `expectRendered` and cursor "End line."; passes on HEAD in my run (`bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/table.spec.ts`: 10 passed, exit 0). The red probe from round 1 used the inline form; the fixture is step-for-step the same, so it still fails on main's source. Hit element still in the Issue Notes.
- [met] The existing click-reveal specs and `block-band-click.test.ts` stay green — the fix commit changes only `table.spec.ts` (10/10 pass) and a doc; no source or other spec changed since round 1's 141-pass run. The full vitest suite and `pnpm build` are deliver's to run.
- [not met] Not verified by the agent: the owner checks the left side in the macOS app (WebKit) — owner-only manual check, still pending; does not hold back this verdict.

## Checks I ran

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/table.spec.ts` on 3c5741f4: 10 passed, exit 0.
- Scope of `git diff de1aa2eb..HEAD`: `docs/LIVE-PREVIEW.md` (one entry), `table.spec.ts` (test uses the fixture), and the review file's Resolution section. No source change, no layer-baseline or composition-root change.

## Findings

None open or new.
