VERDICT: APPROVED

Re-review, round 2, of the fixes after b08275a1 (e8df57e0, 65632132, 73baab0e, 77ade2bb).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `styles.ts:210-216`: `.cm-lp-tag` now uses `color-mix(in oklab, var(--primary) 20%, var(--editor-bg))` for the background and `color-mix(in oklab, var(--primary) 70%, var(--editor-fg))` for the text. This is the reviewer's own suggested fix. `--primary`, `--editor-bg` and `--editor-fg` are defined in both `:root` and `.dark` in `app.css` (lines 78/106/107, 130/161/162) and come from the theme builder for every preset. The same `color-mix` idiom is already used at `app.css:281`. An oklab lightness estimate for the default dark theme puts the pill at about L 0.39 on an editor at L 0.31, with text at about L 0.80, which reads. A light theme gives a pill at about L 0.95 on white with text at about L 0.59. `Test-Exempt` is fine for a CSS-only value. Not viewed by eye. |
| 2 | minor | resolved | `help/documentation/07-sidebar-panels.md:126-129` states the gaps (`~~~` fences, `$$` math, HTML blocks, a tag directly after inline code or an HTML comment). The main session can decide whether a follow-up Issue to align the indexer is wanted. |
| 3 | nit | resolved | The help text now says ```` ``` ```` code blocks (line 126). |
| 4 | nit | resolved | `src/tests/lib/app/editor-host.test.ts:233` is back to one tab. |
| 5 | nit | resolved | `pipeline-dom.test.ts:389-410` mounts `[see #work](https://example.com)`, asserts that the pill is inside `.cm-lp-link`, and asserts that Cmd/Ctrl+mousedown calls `openTagSearch('work')` and not `openExternal`. This pins the order. No source change. |

## Acceptance criteria re-checked

- [met] The pill uses theme variables (accent background and text, small radius), with no per-tag color; it reads in light and dark themes — the background and text are derived only from theme variables (`--primary` tint over `--editor-bg` / `--editor-fg`), with a 4px radius and one style for every tag. The variables are defined for the light (`:root`) and dark (`.dark`) themes. Contrast estimates show the pill against the background and readable text in both. "Accent" is read as an accent tint, not the literal `--accent` token, which the previous review allowed as a fix. Not viewed in the running app.
- [met] The Tags section of `help/documentation/07-sidebar-panels.md` says body `#tags` show as pills in the editor and Cmd+click opens the tag search — still present (lines 120-129). The added sentences only narrow the parity claims.

## Findings

None open or new.

No regressions: the fixes touch one CSS rule, help text, test indentation and one added test. No test was weakened or deleted. `layer-baseline.json` and `BASELINE_SIZE` are unchanged.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on `src/tests/lib/core/markdown-editor/extensions/live-preview/inline/`, `src/tests/lib/app/editor-host.test.ts`, `src/tests/lib/core/markdown-editor/extensions/live-preview/click-handler.test.ts`, `src/tests/lib/utils/tag-extraction.test.ts`, `src/tests/lib/architecture/` and `src/tests/lib/core/markdown-editor/extensions/live-preview/arrow-reveal.test.ts`: exit 0, 27 files and 348 tests passed.
- Not run: the full suite and `pnpm build` (deliver runs them). I did not look at the pill colors in the running app.
