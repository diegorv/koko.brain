VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `block-band-click.test.ts:131-180` adds four jsdom cases (no-neighbour on line 1, band-to-band drag, band-to-text drag, mid-drag doc change). All 17 tests pass. Probes, each reverted (`git status` clean): making the no-neighbour branch return `null` instead of `{ pos: null }` fails the line-1 case (and the adjacent-blocks case); replacing the `posAtCoords` head with `anchor` fails the band-to-text drag case; dropping the `mapPos` call fails the mid-drag mapping case. The tests pin the branches they claim to. |
| 2 | nit | resolved | `docs/LIVE-PREVIEW.md:11` names `blockBandClick` in the `core/` line; `:35` adds a Core Utilities bullet. Checked against `core/block-band-click.ts`: target must be the `.cm-line` or a `cm-widgetBuffer`, one non-inline widget alone on the line, press above/below its box, `cm-lp-hidden-line` skipped, selection kept when the neighbour is a block or absent. The text matches the code. |
| 3 | nit | rejection stands | The review asked for no code change; the two `--retries=0` flakes are in specs and code this diff does not touch. |

## Acceptance criteria re-checked

- [met] Clicks on the widget bodies keep today's behavior (table cell, code body, code header blank area reveal; math, mermaid, image and button bodies ignore the click), as the passing tests in the folder pin — the fixes change no source code (`git diff 0e4643cd..HEAD` touches only `block-band-click.test.ts`, `docs/LIVE-PREVIEW.md` and the review file); the existing "returns null for a press on the widget itself" unit test still passes, and the round-1 E2E evidence stands.
- [not met] The owner checks a table, a code block and an image in the macOS app (WebKit; the E2E suite runs Chromium only) — owner-only manual check, still not done; it does not hold back this verdict.

## Findings

None open or new. The fixes add tests and docs only: no test was weakened or deleted (the diff to the test file is additions only), no source code, layer baseline or composition root changed, nothing out of scope.

## Checks run (this review)

- `pnpm check`: 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.test.ts`: 17 passed, exit 0.
- Mutation probes on `core/block-band-click.ts` described in the table (3 mutations, each restored, worktree clean afterwards).
- Not run: the full suite (`pnpm vitest run && pnpm build`), deliver runs it; E2E not re-run since no app code changed since round 1.
