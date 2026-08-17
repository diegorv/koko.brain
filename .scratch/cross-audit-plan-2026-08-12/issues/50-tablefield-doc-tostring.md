# Issue 50: table-field allocates the full doc per rebuild (same bug as issue 07)

Status: needs-triage
Phase: unplanned
Source: issue 07 implementation (2026-08-17) — pre-existing sibling of the meta-bind `doc.toString()`, out of the surgical scope of that fix

## What

`computeTables` (`src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:16`)
runs `parseFrontmatterProperties(state.doc.toString())` on every decoration rebuild. The plugin is
`checkUpdateAction`-driven like meta-bind-input, so this is the same per-keystroke full-document
string allocation issue 07 just removed from `meta-bind-input-plugin.ts` — typing lag in large
notes whenever the table plugin rebuilds.

Not covered elsewhere: issue 43 (inline ViewPlugin fold) folds image/footnote/wikilink-embed/
meta-bind-input only; table-field is a block plugin and stays out of that fold. No other issue or
plan item mentions `table-field`. The `widgets.ts:763/815` and `meta-bind-button-widget.ts:89`
`doc.toString()` calls are click-handler one-offs, not per-rebuild — deliberately not filed.

## How

- Reuse `frontmatterSlice` from `meta-bind-input-plugin.ts` (added by issue 07's fix, commit
  84a78ad) instead of re-deriving it: export it from a shared live-preview core module (or move it
  next to the other `core/` helpers) and call it from both plugins. Parity contract and its proof
  are documented on the helper's JSDoc.
- Regression test FIRST (red): mirror issue 07's `sliceString` spy test — bound every recorded span
  to the closing frontmatter fence on a large doc while still asserting the table widget receives
  the frontmatter properties.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue, verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
