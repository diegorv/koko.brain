# 53 discovery: Default bold and italic off the link blue

Owner decision (Issue Comments, 2026-11-19): option 2. Default `inlineFg` = `#f5d0a9`;
Lavender Haze `inlineFg` = `#9C2F5C`. The Issue 05 test stays unchanged. No `spec.md` exists for this feature.

## Files that change

- `src/lib/utils/color.ts` (after `mixColors`, ~l.150): add exported `colorDistance(a, b)`: Euclidean OKLab
  distance x100 via the existing private `parseRgb`/`toLinear`/`toOklab`; null when either is unparseable (same
  contract as `mixColors`/`contrastRatio`).
- `src/lib/core/settings/theme.logic.ts:141`: Default `inlineFg: '#93c5fd'` -> `'#f5d0a9'`.
- `src/lib/core/settings/theme.logic.ts:255`: Lavender Haze `inlineFg: '#843C7E'` -> `'#9C2F5C'` (its `emphasis`
  override `#A850A0` stays).
- `src/app.css:292-293`: `--syntax-emphasis` and `--syntax-strong` -> `#f5d0a9`.
- Tests: `src/tests/lib/utils/color.test.ts` (new `describe('colorDistance')`),
  `src/tests/lib/core/settings/theme-builder.logic.test.ts` (new test in `describe('heading and bold colors of every
  theme')`, ~l.168), `theme.logic.test.ts:47`, `theme.service.test.ts:32`, and the snapshot
  `__snapshots__/theme-snapshot.test.ts.snap` (l.105, 118, 256), updated with `-u` and checked by diff.

## Plan (test-first)

1. Red: `colorDistance` unit tests (0 for equal colours, ~10.7 for `#93c5fd` vs `#60a5fa`, null on junk) -> add
   `colorDistance` -> green. Commit.
2. Red: theme-builder test over `BUILTIN_THEMES`: `colorDistance(strong, syntax.link)`,
   `colorDistance(emphasis, syntax.link)`, `colorDistance(strong, wikilink.target)` each >= 12 (fails on Default
   10.7 and Lavender Haze 9.6). Change both `inlineFg` values and app.css; move `theme.logic.test.ts`,
   `theme.service.test.ts` and the snapshot to the new values -> green. Commit.

## Prior art

- `mixColors` tests in `color.test.ts` for the style of the unit test; Issue 05 test at
  `theme-builder.logic.test.ts:161-168` for the loop over `BUILTIN_THEMES` with `theme.name` messages.

## Risks

- `readableCore` may lift `inlineFg` for contrast; both new values already pass 4.5:1 (9.3:1 and 6.3:1), so the
  built value equals the literal. The snapshot diff confirms it.
- "link" is read as `syntax.link` (equal to `preview.link`, both `linkFg`).
- Both tokens are read only by `highlight-styles.ts:28-29` and `canvas-markdown.css:77,81`: value change only.
