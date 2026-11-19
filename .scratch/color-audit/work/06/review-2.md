VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|---|---|---|
| 1 | blocker | resolved (one part: rejection stands) | 4c1b68b56 adds `SurfaceBase` (`preview.<token>`), and `flattenedSurface` resolves a preview base before flattening over `editorBg` (theme-builder.logic.ts:102, :297-304). `collectionNull`, `link`, `wikilink` and `editorFg` are paired on `collectionTableAlt` over `preview.collectionBg`, after the zebra pair (:255-261), so they are measured on the final row. All call sites pass the groups (`withReadableContrast` :377, `readabilityFailures` :447, `highlightReaders`, `buttonSurfaces`). I restored the pre-fix theme-builder.logic.ts and ran the tinted-surfaces describe: it fails with the reviewer's numbers (Lavender Haze 4.37 / 4.34 / 4.28, Bielefeld Light 4.33, Tolaria Light 4.35, Bordeaux and KMS Dark Lc -43.2). It passes with the fix. The every-pair test resolves preview bases the same way. The snapshot moves only Lavender Haze null/link/wikilink and their decorations. The rejection holds: `cm-lp-collection-empty` is set only on empty-state messages (collection-block-widget.ts:179, :197, :221, :314), and `--lp-collection-empty` is used only by those and the footer rule (styles.ts:670-677). Neither is drawn inside a table row. |
| 2 | minor | resolved | ea95a3350 adds a CORE round-trip test (theme-builder.logic.test.ts:149-164) that states the drift: green and yellow come back as the lifted `callout.tip` / `callout.warning` and differ from CORE, `ui.typeGreen` / `ui.typeYellow` keep the typed hues, blue and purple round-trip, and rebuilding from the read-back palette keeps the callouts. That is the first of the two fixes the finding offered. The reasons for keeping the read path (theme.logic.ts mergeThemeWithDefaults, theme-package.logic.ts packageFromColors) are recorded in review.md's Resolution. |
| 3 | nit | resolved | 905af7b8e measures each list surface at rest and under `tint(--file-explorer-accent, 0.6, list)`. That matches `hover:bg-file-explorer-accent/60` (SearchResult.svelte:140), and `tint` composites at alpha x share (color.ts:102-108). A comment explains the OKLab midpoint stand-in. |
| 4 | nit | resolved | 600c1b11e makes the gutter loop cover BUILTIN, HARD_PALETTE and HARD_DARK_PALETTE themes and asserts |Lc| 45 next to 4.5:1 (editor-theme.test.ts:50-56). The 0.005 / 0.05 tolerances match the builder describe. They do not weaken the test. |
| 5 | nit | rejection stands | No change was asked for. The new `editorFg` zebra pair is the same kind of thing, and it moves nothing on the gate set: the failing pre-fix run lists no cell-text entry. |

## Acceptance criteria re-checked

- [met] Failing test first, `theme-builder.logic.test.ts` over `BUILTIN_THEMES` and the hard palettes fixture: callout label and title on the callout tint, quote on the blockquote tint, text and link on `highlightBg`, `collectionError`, `collectionNull` and `collectionEmpty` on `collectionBg`, `meta` on `editorBg` at 4.5:1; `collectionTableAlt` differs from `collectionBg`. It fails today. — The describe still has every original case and gains the four zebra-row cases. It fails against the pre-fix builder (reproduced here) and passes after.
- [met] Snapshot updated on purpose; frontend gate passes. — The snapshot diff is limited to the Lavender Haze tokens the zebra pairs move, and 4c1b68b56 records it. `pnpm check` exit 0 (237 files, 0 errors, 0 warnings). Targeted vitest exit 0. The full suite is deliver's to run.

## Findings

None open or new.

## Checks run

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/core/settings/ src/tests/lib/editor-surface-mixes.test.ts src/tests/lib/core/markdown-editor/setup/editor-theme.test.ts src/tests/lib/utils/color.test.ts src/tests/lib/features/search src/tests/lib/features/collection`: exit 0, 94 files, 2540 tests.
- `pnpm vitest run` on live-preview styles.test.ts and rail-shell RailNoteList.test.ts: exit 0, 2 files, 189 tests.
- Red check: with theme-builder.logic.ts restored from 4c1b68b56^, `theme-builder.logic.test.ts -t tinted` exits 1 with the seven zebra-row failures. After that run the file was restored, and the worktree is clean.
- No tests weakened or deleted. The fixes are limited to theme-builder.logic.ts and its tests, and no src-tauri or layer-baseline changes.
