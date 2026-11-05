# Issue 11 discovery: force rebuild and reconfigure pass the viewport guards

## Files that change
- `src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts` (add `isPureScroll(update)` next to `checkUpdateAction`)
- `.../live-preview/core/block-decorator.ts:76` (guard -> `if (isPureScroll(update)) return;`; `gate` JSDoc :46-52)
- `.../live-preview/inline/inline-formatting-plugin.ts:162` (same guard swap; JSDoc :139-143)
- `.../live-preview/plugins/queryjs-block-field.ts:61-64` (`gate` also passes a drag release: `mouseSelectingField` true in `startState`, false in `state`; JSDoc :42-56)
- `CLAUDE.md:237`, `docs/LIVE-PREVIEW.md:133,180,186`, `docs/adr/0008-codemirror-live-preview-architecture.md:70` (guard line quotes)

## Plan
1. `isPureScroll(update)`: `viewportChanged && !docChanged && !selectionSet` and no transaction is `reconfigured` or carries `forceDecorationRebuild`. One helper because both guards must stay identical; it lives beside `checkUpdateAction` whose `'none'` branch documents the same rule. A `rebuildOn` effect is not in the list, so it still returns early on a pure scroll.
2. Swap both guards to the helper. A forced/reconfigured viewport update then reaches `checkUpdateAction`, which already returns `'rebuild'` (Issue 01), or `'skip'` mid-drag.
3. queryjs `gate`: add the drag-release term. Not `rebuildOn: [forceDecorationRebuild]` (would bypass `checkUpdateAction` and collapse a revealed block mid-drag).
4. Docs: replace the quoted guard line with `isPureScroll(update)` and say what it lets through.

## Tests (test-first)
- `core/check-update-action.test.ts`: `isPureScroll` true for plain scroll and scroll + unrelated effect; false for doc/selection/reconfigure/force.
- `core/block-decorator.test.ts`: viewport update + `forceDecorationRebuild` rebuilds; viewport update + `reconfigured` rebuilds; existing "skips viewport-only updates, even when a rebuildOn effect rides along" unchanged. Copy the `viewportOnlyUpdate` stand-in.
- `inline/inline-formatting-plugin.test.ts`: same two cases via the `viewportUpdate` stand-in (add a transactions param).
- `plugins/queryjs-block-field.test.ts`: mount with `mouseSelectingField`; drag start, index ready, `forceDecorationRebuild` (skipped, snapshot stays false), drag release with no selection change -> snapshot true. Must fail before step 3.

## Risks
- queryjs now recomputes on every drag release, not only after a skipped force. Recompute is the cheap line scan; widgets with an unchanged `eq()` snapshot keep their DOM, so no script re-runs. Accepted, the Issue asks for exactly this gate.
- Block-decorator test "applies a narrower gate" keeps its local gate copy; only its comment ("the queryjs gate") goes stale, so reword it.

## Defaults for open questions
- Native HTML5 drag of selected text (mousedown, no mouseup): confirmed by reading `mouse-selecting.ts`: the flag stays true until the next mousedown + mouseup, and every non-doc forced rebuild meanwhile returns `'skip'`. Not fixed here (Issue says check, not necessarily fix); recorded in the implement comment as a follow-up candidate.
- A drag release that arrives in the same update as a viewport change is still dropped by the guard (Issue scopes the guard change to force + reconfigure).
