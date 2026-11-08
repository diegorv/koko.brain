VERDICT: APPROVED

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | `.cm-lp-table-wrapper` duplicated between the resolver and `TableWidget.toDOM` | resolved | `wikilink-click-target.ts:35` exports `TABLE_WIDGET_CLASS`; `widgets.ts:351` sets `wrapper.className` from it and the resolver builds `` `.${TABLE_WIDGET_CLASS}` `` (wikilink-click-target.ts:67). The new table-widget.test.ts case mounts the real widget, captures the cell link's mousedown and asserts `resolveWikilinkClickPosition` returns null. It is a real guard: the link carries `.cm-lp-wikilink`, so if the wrapper class drifted from the selector the resolver would fall through to `posAtDOM` and return a number. No import cycle: `wikilink-click-target.ts` imports only `is-inside-block-context` (type-only lezer import) and `decoration.logic`, neither of which reaches `widgets.ts`. Both files are in `core/`, so no layer rule is involved. |
| 2 | Re-parse of `match[0]` at click time | rejection stands | The click-time `findWikilinkInfoAtPosition(source, 0, 0)` keeps the `#^block` vs `#heading` split in one parser. Building `WikilinkInfo` from the capture groups would duplicate it. The cost is one regex run per click. The original finding was an optional nit. |
| 3 | Escaped `\|` alias in a cell (pre-existing) | rejection stands | Not changed, and it was pre-existing and out of scope, as review.md already said. |

## Acceptance criteria re-checked

- [met] `table-cell-controls.spec.ts` "clicking a wikilink inside a table cell follows it and the source note keeps its table" passes with `test.fail()` removed — the fix commit 830ce1a6 replaces only a string literal with a constant that has the same value (`'cm-lp-table-wrapper'`), so the DOM class and the selector are byte-identical to what review.md ran under E2E. I did not re-run E2E. The new unit case exercises the same resolver bypass against the real widget DOM and passes.
- [met] A wikilink to a missing note inside a cell behaves like one outside a table (the create-on-click path) — the fix does not touch the cell handler (`widgets.ts:305-315`, `followWikilinkInfo`). table-widget.test.ts "a link to a missing note creates it" still passes.
- [met] Wikilink clicks outside tables keep working (`wikilink.spec.ts` in the folder, `wikilink-navigation.spec.ts`, `wikilink-create-on-click.spec.ts`) — the resolver logic is unchanged apart from the selector constant. wikilink-click-capture.test.ts (non-table and table cases) passes. The E2E specs were not re-run, for the reason given above. The full suite and E2E are deliver's to run.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on table-widget.test.ts, wikilink-click-capture.test.ts, live-preview/widgets/, table-empty-cells.test.ts, core/block-band-click.test.ts and src/tests/lib/architecture/: exit 0, 18 files / 229 tests passed.
- The fix diff (`3c029475..HEAD`) touches only widgets.ts (import + 1 line), wikilink-click-target.ts (constant export), table-widget.test.ts (1 added case) and review.md (Resolution). No test was weakened or removed, there is no scope creep, and the layer baseline is untouched.

## Findings

1. nit — src/tests/lib/core/markdown-editor/wikilink-click-capture.test.ts:189: the synthetic wrapper still hard-codes `'cm-lp-table-wrapper'`. That is harmless, because table-widget.test.ts now covers the real widget, but importing `TABLE_WIDGET_CLASS` here would keep the two from drifting. Optional.
