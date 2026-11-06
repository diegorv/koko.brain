VERDICT: APPROVED

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | major | `styles.ts:77-81` blanket `transparent !important` clears the blockquote and callout line tint on the cursor line | resolved | c537e80f3 adds `.cm-activeLine.cm-lp-blockquote`, `-2`, `-3` and `.cm-activeLine.cm-lp-callout` to `livePreviewActiveLineTheme` (`styles.ts:87-98`), each a `backgroundColor` longhand with `!important`. Values match the `livePreviewStyles` rules (`styles.ts:219`, `:224`, `:229`, `:473`). Two-class selectors outrank the one-class blanket rule, so the tint wins. The callout rule comes after the blockquote rules, as in `livePreviewStyles`, so a line carrying both classes resolves the same way. The rest of the line-decoration classes (`cm-lp-codeblock-line`, `cm-lp-table-line`, `cm-lp-hr-line`, `cm-lp-h1`..`h6`, `cm-lp-hidden-line`) set no background, so nothing else is cleared. Test: `editor-extensions.test.ts:379-399`, four `it.each` cases, cursor inside the box, asserting the computed `backgroundColor` equals the tint; it cannot pass with the tint rules missing, since the blanket rule would then compute `transparent`. |
| 2 | nit | `discovery.md` Risks note was wrong about tinted lines | resolved | a19f52946 updates the Risks note to name the blockquote and callout tints and the restore rules. |

## Acceptance criteria

- [met] Failing test first, on the editor theme spec or the editor extensions: in live preview no `.cm-activeLine` background is applied; it fails today (editor-theme.ts about line 52, highlightActiveLine in editor-extensions.ts). — The `active-line background` tests in `editor-extensions.test.ts:312-379` are unchanged by the fixes and still pass. The new tint cases add the one exception, lines whose own decoration is tinted, which keep that tint rather than the active-line fill (`var(--syntax-active-line)`). Targeted run: 2 files, 96 passed, exit 0.
- [met] Source mode keeps its current active-line behavior — The fixes only touch `livePreviewActiveLineTheme`, which is mounted inside `livePreviewCompartment`, so source mode does not get the new rules. `editor-theme.ts:52-54` is untouched, and the source-mode and toggle tests (`editor-extensions.test.ts:347-379`) still pass.

## Findings

None open or new.

## Checks run (by this reviewer)

- Typecheck: `taskpolicy -c background pnpm check`, exit 0, 0 errors, 0 warnings.
- Tests: `taskpolicy -c background pnpm vitest run src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts src/tests/lib/core/markdown-editor/extensions/live-preview/styles.test.ts`, exit 0, 2 files, 96 passed.
- No test was weakened or deleted. The fix diff touches only `styles.ts`, its test and the workflow's `.scratch` records, so there is no scope creep and no layer-baseline change.
- The full suite, `pnpm build` and E2E are deliver's to run. jsdom checks which rule wins, not how the tint looks.
