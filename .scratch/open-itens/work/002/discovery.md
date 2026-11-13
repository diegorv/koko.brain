# 002 discovery

No `spec.md` exists for open-itens; the Issue text (variant B) is the spec.

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts`
  - new export `frontmatterGuard` (changeFilter + transactionFilter), uses the private `bodyStart` (line ~62).
  - `frontmatterClick` doc comment line 86 ("Keyboard moves ... are not changed") rewritten.
- `src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:47` register `frontmatterGuard` in `BLOCK_EXTENSIONS.frontmatter`.
- `docs/LIVE-PREVIEW.md:36` same stale sentence.
- `e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:53-65` ArrowUp expectation flips; add Mod+Home, ArrowUp+Backspace+x, Alt+ArrowUp.
- new `src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field-keyboard.test.ts`.
- `invariants-harness.test.ts:312` only if it fails as the Issue predicts (owner-approved early return + `frontmatterEnd` import).

## Plan

1. Write the keyboard test file (mount helper copied from frontmatter-field-click.test.ts plus `history()` and `allowMultipleSelections`); run, see the non-guard cases fail.
2. Implement `frontmatterGuard` exactly as items 1 and 2 of the Issue:
   - changeFilter: userEvent `delete`/`move` + docChanged, else true; B null -> true; collect `fromA < B`; move -> false; single pure deletion `[B-1, toA]` with `\n` at toA -> true; insert -> false; else `[0, B]`.
   - transactionFilter: runs for `select*` except `select.pointer` and exact `select.search`, and for `delete*`/`move*`; base = startState.selection when delete/move ended with no doc change, else newSelection; pass path returns `tr`; rewrite drops `to < B`, clamps anchor/head to B, keeps main if survived else 0, fallback cursor at B; returns `[tr, { selection, sequential: true }]`.
3. Register, update comments and docs, run targeted vitest files; run the invariants harness and apply the approved edit only if it fails as described.
4. Update the e2e spec; run `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/frontmatter.spec.ts`.
5. Targeted checks: `pnpm check`, the new file, frontmatter-field*.test.ts, meta-bind-writers, meta-bind-input-redraw, undo-history-across-notes, invariants-harness, live-preview tests that list `BLOCK_EXTENSIONS`.

## Prior art

- `frontmatter-field-click.test.ts` (mount, constants, decorator-disabled case).
- `indentOnInput` in `@codemirror/language` for the `[tr, { ..., sequential: true }]` return.

## Risks

- jsdom cannot run layout-bound commands (`deleteLine`, `addCursorAbove`, `deleteLineBoundaryBackward`, `cursorCharLeft` maybe): dispatch the transaction shape the command builds, with a comment.
- `frontmatterEnd` reads `frontmatterField` from the state; in the filters it is read from `tr.startState`, which is safe.
- Invariants harness may fail at `endsAtLineStart` (predicted); any other failure is a guard bug and stops the run.

## Defaults taken

- None beyond the Issue text; it has no open questions.
