VERDICT: APPROVED

Re-review, round 2, of the fixes after d96781317 (review.md first committed): 97a58f289 (test + comment) and 86036c1fd (rename to `--cm-lp-callout-accent`). Diff checked: `git diff d96781317..HEAD`, 4 source/test files plus review.md.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | rejection stands | Accepted as a known limit; styles.ts:490-492 now states it in the comment above `:where(.cm-lp-callout) span`. The limit only shows with the non-default `markdownStyle` decorator off, and rekeying the restore is a design change outside this Issue's "style edits only" scope. |
| 2 | nit | rejection stands | Owner eye check cannot be done by an agent; it remains pending for the squash body / closing comment. No code change needed. |
| 3 | nit | resolved | styles.test.ts:247-254 now compares the full declaration block of `exactRule('.cm-lp-meta-bind-input')` with a literal string. `git diff main -- styles.ts` touches no line of that shared rule, so the literal is today's rule, and any future edit to it now fails the test. |
| 4 | (deliver) | resolved | `--callout-accent` matched the `/var\(\s*(--(?:syntax\|wikilink\|callout)-...)/` scan in theme-css-contract.test.ts:38 and no theme emits it. `--cm-lp-callout-accent` matches none of the THEMED prefixes (`--lp-`, `--syntax-`, `--wikilink-`, `--callout-`), since the name starts with `--cm-`. The rename covers all 3 sites in src/lib (callout-field.ts:173,176, styles.ts:526) and both tests; `grep -- --callout-accent src` finds no stale use. theme-css-contract.test.ts passes. |

## Acceptance criteria re-checked

- [met] Failing test first (`src/tests/lib/core/markdown-editor/extensions/live-preview/styles.test.ts`, `exactRule`): `.cm-lp-callout-type-label` contains `text-transform: capitalize` and `color: var(--callout-accent, inherit)`. — styles.test.ts:202-207 asserts `capitalize` and `color: var(--cm-lp-callout-accent, inherit);`, green. The name differs from the AC's literal `--callout-accent` only by the `cm-lp-` prefix, forced by theme-css-contract.test.ts (finding 4); behaviour is the same, accepted (nit 1 below).
- [met] Failing test first (`plugins/callout-field.test.ts`, `computeCallouts`): the header line of a `[!warning]` callout carries `--callout-accent: ` plus the warning colour in its `style`; the existing decoration counts are unchanged. — callout-field.test.ts:94-108 asserts `--cm-lp-callout-accent: var(--callout-warning)` on the single header line deco; count tests untouched and green. Same rename caveat.
- [met] A `.cm-lp-meta-bind-input[type="number"]` rule has `field-sizing: content` and `min-width: 4ch`; the shared `.cm-lp-meta-bind-input` rule is unchanged. — styles.test.ts:242-254, now with a full-block check of the shared rule; `git diff main` shows no change to it.
- [not met] Owner eye check, recorded in the commit body (jsdom cannot show it): a callout with `*emphasis*` and a meta-bind error inside (both still italic, plain body), a yellow `warning` label readable in the light theme, heading spacing at the top of a note, a number control beside a select in WKWebView. — Still pending; owner-only, does not hold back the verdict (previous nit 2).
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (0 errors, 0 warnings, 236 files). Targeted tests styles.test.ts, plugins/callout-field.test.ts and settings/theme-css-contract.test.ts: 115 passed, exit 0. The full suite is deliver's to run.

## Findings

1. **nit** `src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:176`: the custom property is `--cm-lp-callout-accent`, while AC 1 and AC 2 literally name `--callout-accent`. The rename is required by theme-css-contract.test.ts and keeps the behaviour. Fix: deliver mentions the rename in the squash body so the Issue's wording and the code reconcile.

## Other checks

- No test weakened or deleted: the shared-rule test is stricter than before; the two renamed assertions keep the same shape.
- No E2E rerun in this round; the callout specs assert on text, not on the property name, and the round 1 E2E run (46 passed) predates only a rename.
- Scope: the fixes touch only the Issue's two source files, their tests and the workflow record. No layer-baseline or composition-root change.
- Worktree clean before writing this file.
